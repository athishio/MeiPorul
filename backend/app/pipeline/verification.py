import re
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger("meiporul.verification")

# Global NLI model holder for warm-loading
_NLI_TOKENIZER = None
_NLI_MODEL = None

def init_nli_model():
    """Warm-load NLI model at startup using HuggingFace cross-encoder/nli-deberta-v3-small."""
    global _NLI_TOKENIZER, _NLI_MODEL
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        logger.info(f"Warm-loading NLI cross-encoder: {settings.NLI_MODEL_NAME}...")
        _NLI_TOKENIZER = AutoTokenizer.from_pretrained(settings.NLI_MODEL_NAME)
        _NLI_MODEL = AutoModelForSequenceClassification.from_pretrained(settings.NLI_MODEL_NAME)
        _NLI_MODEL.eval()
        logger.info(f"NLI model loaded successfully with labels: {_NLI_MODEL.config.id2label}")
    except Exception as e:
        logger.warning(f"Could not load HuggingFace NLI model ({e}). Using heuristic NLI cross-check.")
        _NLI_TOKENIZER = None
        _NLI_MODEL = None

class LLMVerificationResult(BaseModel):
    verdict: str = Field(description="Supported, Contradicted, or Not Enough Info")
    reasoning: str = Field(description="Brief explanation of the decision")
    evidence_quote: str = Field(description="Exact snippet from the passages that supports or contradicts the claim")

VERIFICATION_SYSTEM_PROMPT = """You are a rigorous fact-verification auditor.
Your job is to check whether a specific factual claim is Supported, Contradicted, or has Not Enough Info based STRICTLY on the provided evidence passages.

Rules:
- Supported: The evidence explicitly substantiates or directly entails the claim.
- Contradicted: The evidence explicitly conflicts with, negates, or refutes the claim (e.g. wrong dates, wrong entities, false events).
- Not Enough Info: The evidence does not contain sufficient details to either verify or refute the claim with high certainty. Do not assume or extrapolate.
- Select the best short evidence_quote from the passages.
"""

def extract_numeric_entities(text: str) -> List[str]:
    """Extract numbers, years, percentages, and currencies from text."""
    # Find 4-digit years (1800-2099)
    years = re.findall(r'\b(1[89]\d\d|20\d\d)\b', text)
    # Find numbers with decimals or commas or units
    numbers = re.findall(r'\b\d+(?:[\.,]\d+)?\s*(?:billion|million|thousand|percent|%|kg|km|m|miles)?\b', text, re.IGNORECASE)
    return list(set(years + numbers))

def verify_numeric_claim(claim: str, passage: str) -> Optional[Tuple[str, float]]:
    """
    Direct numeric comparison: if a specific year/number in the claim is contradicted
    by the evidence passage for the same context, return ('Contradicted', confidence).
    """
    claim_nums = extract_numeric_entities(claim)
    passage_nums = extract_numeric_entities(passage)
    
    if not claim_nums or not passage_nums:
        return None

    # Check for direct year mismatch
    claim_years = [n for n in claim_nums if re.match(r'^(1[89]\d\d|20\d\d)$', n)]
    passage_years = [n for n in passage_nums if re.match(r'^(1[89]\d\d|20\d\d)$', n)]

    if claim_years and passage_years:
        # If the claim mentions a year not present in the passage, but passage has another year
        if not set(claim_years).intersection(set(passage_years)):
            # Potential contradiction in dates
            return ("Contradicted", 0.92)
        elif set(claim_years).issubset(set(passage_years)):
            return ("Supported", 0.90)

    return None

def run_nli_signal(premise: str, hypothesis: str) -> Tuple[str, float]:
    """
    Signal B: Natural Language Inference cross-encoder check using DeBERTa.
    Returns (verdict, score).
    """
    global _NLI_TOKENIZER, _NLI_MODEL
    if _NLI_TOKENIZER is not None and _NLI_MODEL is not None:
        try:
            import torch
            inputs = _NLI_TOKENIZER(premise, hypothesis, return_tensors="pt", truncation=True, max_length=512)
            with torch.no_grad():
                logits = _NLI_MODEL(**inputs).logits
                probs = torch.softmax(logits, dim=-1)[0]
                pred_idx = int(torch.argmax(probs).item())
                label = _NLI_MODEL.config.id2label.get(pred_idx, "").lower()
                score = float(probs[pred_idx].item())

            if "entail" in label:
                return "Supported", score
            elif "contra" in label:
                return "Contradicted", score
            else:
                return "Not Enough Info", score
        except Exception as e:
            logger.warning(f"Error during NLI model inference: {e}")

    # Fallback heuristic NLI check
    # Check negation patterns and key entity alignment
    hypo_words = set(re.findall(r'\b\w{3,}\b', hypothesis.lower()))
    premise_words = set(re.findall(r'\b\w{3,}\b', premise.lower()))
    
    overlap = len(hypo_words & premise_words) / max(1, len(hypo_words))
    
    # Check negation mismatch
    hypo_neg = bool(re.search(r'\b(not|never|neither|no|failed|refused)\b', hypothesis.lower()))
    premise_neg = bool(re.search(r'\b(not|never|neither|no|failed|refused)\b', premise.lower()))
    
    if overlap >= 0.7:
        if hypo_neg != premise_neg:
            return "Contradicted", 0.82
        return "Supported", 0.85
    elif overlap < 0.35:
        return "Not Enough Info", 0.60
    else:
        return "Not Enough Info", 0.70

def call_gemini_with_backoff(client, model: str, contents: Any, config: Any, max_retries: int = 3):
    """Executes a Gemini API call with exponential backoff on 429 rate-limits."""
    import time
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                delay = 10 * (attempt + 1)
                retry_match = re.search(r'retryDelay[\'"]?\s*:\s*[\'"]?(\d+)s', err_str)
                if retry_match:
                    delay = int(retry_match.group(1)) + 1
                logger.warning(f"Gemini 429 rate-limit hit. Backing off for {delay}s (Attempt {attempt + 1}/{max_retries})...")
                time.sleep(delay)
            else:
                raise e
    # Final attempt after retries
    return client.models.generate_content(
        model=model,
        contents=contents,
        config=config
    )

def run_llm_signal(claim: str, passages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Signal A: Gemini structured reasoning on claim + evidence passages with rate-limit backoff.
    """
    if not passages:
        return {
            "verdict": "Not Enough Info",
            "is_available": True,
            "reasoning": "No relevant evidence passages found.",
            "evidence_quote": ""
        }

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        best_passage = passages[0]["text"]
        return {
            "verdict": "Supported" if len(passages) > 0 and passages[0]["similarity_score"] > 0.4 else "Not Enough Info",
            "is_available": True,
            "reasoning": "Determined via baseline evidence alignment.",
            "evidence_quote": best_passage[:200]
        }

    passages_formatted = "\n\n".join([
        f"[Passage {i+1}] (Source: {p['source']})\n{p['text']}"
        for i, p in enumerate(passages)
    ])

    user_prompt = f"""Factual Claim to verify:
\"{claim}\"

Evidence Passages:
{passages_formatted}

Determine if the claim is Supported, Contradicted, or Not Enough Info based strictly on the passages.
Provide JSON output with:
- verdict: "Supported" | "Contradicted" | "Not Enough Info"
- reasoning: brief 1-2 sentence justification
- evidence_quote: direct excerpt from the passages
"""

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = call_gemini_with_backoff(
            client=client,
            model=settings.GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=VERIFICATION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=LLMVerificationResult,
                temperature=0.0,
            ),
            max_retries=3
        )
        parsed = json.loads(response.text)
        parsed["is_available"] = True
        return parsed
    except Exception as e:
        logger.error(f"Gemini verification call failed after backoff: {e}")
        return {
            "verdict": None,
            "is_available": False,
            "reasoning": f"Verification API error: {str(e)}",
            "evidence_quote": passages[0]["text"][:200] if passages else ""
        }

def verify_single_claim(claim_item: Dict[str, Any], passages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Combines Signal A (LLM) and Signal B (NLI) with numeric rules.
    Fixes Bug 1 (Arbitration fallback to Signal B) and Bug 3 (Source sync).
    """
    claim_text = claim_item["claim_text"]
    is_numeric = claim_item.get("is_numeric", False)

    if not passages:
        return {
            "claim_text": claim_text,
            "verdict": "Not Enough Info",
            "evidence_source": "None",
            "evidence_snippet": "No corroborating evidence retrieved.",
            "confidence": 0.50,
            "rewritten_claim": None,
            "arbitration_mode": "No Evidence"
        }

    best_passage = passages[0]
    avg_similarity = sum(p.get("similarity_score", 0.0) for p in passages) / len(passages)

    # 1. Numeric Check (if applicable)
    numeric_override = None
    if is_numeric:
        for p in passages:
            check = verify_numeric_claim(claim_text, p["text"])
            if check:
                numeric_override = (check[0], check[1], p)
                break

    # 2. Signal A: LLM verification
    signal_a = run_llm_signal(claim_text, passages)
    signal_a_available = signal_a.get("is_available", False)
    verdict_a = signal_a.get("verdict")
    evidence_quote = signal_a.get("evidence_quote") or best_passage["text"][:250]

    # Bug 3 Fix: Synchronize evidence_source with the exact passage containing evidence_quote
    evidence_source = best_passage["source"]
    if evidence_quote:
        quote_words = set(re.findall(r'\b\w{4,}\b', evidence_quote.lower()))
        for p in passages:
            p_words = set(re.findall(r'\b\w{4,}\b', p["text"].lower()))
            if quote_words and (len(quote_words & p_words) / len(quote_words)) >= 0.45:
                evidence_source = p["source"]
                break

    # 3. Signal B: NLI cross-check on top passage
    verdict_b, nli_score = run_nli_signal(best_passage["text"], claim_text)

    # 4. Consensus arbitration
    if numeric_override and numeric_override[0] == "Contradicted":
        final_verdict = "Contradicted"
        confidence = numeric_override[1]
        evidence_source = numeric_override[2]["source"]
        arbitration_mode = "Numeric Exact Override"

    elif not signal_a_available:
        # BUG 1 FIX: Fall back to Signal B directly instead of collapsing to NEI
        if verdict_b in ("Supported", "Contradicted") and nli_score >= 0.60:
            final_verdict = verdict_b
            confidence = round(min(0.95, (nli_score * 0.88) + (0.12 * avg_similarity)), 2)
            arbitration_mode = f"Single-Signal Fallback (Signal B DeBERTa: {verdict_b}, score: {nli_score:.2f})"
        else:
            final_verdict = "Not Enough Info"
            confidence = round(0.55 + (0.10 * avg_similarity), 2)
            arbitration_mode = f"Single-Signal Fallback (Signal B score {nli_score:.2f} < 0.60 -> NEI)"

    elif verdict_a == verdict_b:
        final_verdict = verdict_a
        base_conf = 0.88 if final_verdict != "Not Enough Info" else 0.70
        confidence = round(min(0.99, base_conf + (0.10 * avg_similarity)), 2)
        arbitration_mode = "Dual-Signal Consensus (Signal A and B Agree)"

    else:
        # Disagreement between Signal A and Signal B -> Mark "Not Enough Info"
        final_verdict = "Not Enough Info"
        confidence = round(0.58 + (0.10 * avg_similarity), 2)
        arbitration_mode = f"Dual-Signal Conflict (A: {verdict_a} vs B: {verdict_b} -> NEI)"

    return {
        "claim_text": claim_text,
        "verdict": final_verdict,
        "evidence_source": evidence_source,
        "evidence_snippet": evidence_quote.strip(),
        "confidence": confidence,
        "rewritten_claim": None,
        "arbitration_mode": arbitration_mode
    }

def check_pairwise_consistency(verified_claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Self-consistency pass: flag any claims within the same answer that directly contradict each other."""
    # Search for pairwise entity year or negation contradictions
    for i in range(len(verified_claims)):
        for j in range(i + 1, len(verified_claims)):
            c1 = verified_claims[i]
            c2 = verified_claims[j]
            y1 = extract_numeric_entities(c1["claim_text"])
            y2 = extract_numeric_entities(c2["claim_text"])
            # If two claims refer to similar keywords but differing dates, lower confidence
            common_words = set(c1["claim_text"].lower().split()) & set(c2["claim_text"].lower().split())
            if len(common_words) >= 4 and y1 and y2 and y1 != y2:
                if c1["verdict"] == "Supported" and c2["verdict"] == "Supported":
                    logger.info(f"Self-consistency conflict detected between claims: '{c1['claim_text']}' and '{c2['claim_text']}'")
                    c1["confidence"] = round(max(0.50, c1["confidence"] - 0.15), 2)
                    c2["confidence"] = round(max(0.50, c2["confidence"] - 0.15), 2)
    return verified_claims
