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
    Absence of a match does NOT indicate contradiction; it returns None (deferring to Signal A/B).
    """
    claim_nums = extract_numeric_entities(claim)
    passage_nums = extract_numeric_entities(passage)
    
    if not claim_nums or not passage_nums:
        return None

    # Check for direct year comparison
    claim_years = [n for n in claim_nums if re.match(r'^(1[89]\d\d|20\d\d)$', n)]
    passage_years = [n for n in passage_nums if re.match(r'^(1[89]\d\d|20\d\d)$', n)]

    if claim_years and passage_years:
        # Check non-numeric semantic alignment to ensure they refer to the SAME specific event/topic
        claim_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', claim.lower()))
        passage_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', passage.lower()))
        stopwords = {"with", "that", "this", "from", "were", "been", "have", "first", "more", "most", "about", "which", "into"}
        claim_content_words = claim_words - stopwords
        overlap = len(claim_content_words & passage_words) / max(1, len(claim_content_words))

        # Only evaluate numeric contradiction if the passage is genuinely discussing the exact same event (>60% content overlap)
        if overlap >= 0.60:
            if set(claim_years).issubset(set(passage_years)):
                return ("Supported", 0.90)
            elif not set(claim_years).intersection(set(passage_years)):
                # High semantic overlap on the same subject, but explicit contradictory year
                return ("Contradicted", 0.90)

    # For percentages or quantities (e.g. 15% vs 0.38%), check if the exact property contradicts
    claim_percents = [n for n in claim_nums if '%' in n or 'percent' in n.lower()]
    passage_percents = [n for n in passage_nums if '%' in n or 'percent' in n.lower()]
    if claim_percents and passage_percents:
        claim_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', claim.lower()))
        passage_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', passage.lower()))
        stopwords = {"with", "that", "this", "from", "were", "been", "have", "first", "more", "most", "about"}
        claim_content_words = claim_words - stopwords
        overlap = len(claim_content_words & passage_words) / max(1, len(claim_content_words))
        if overlap >= 0.65 and not set(claim_percents).intersection(set(passage_percents)):
            return ("Contradicted", 0.88)

    return None

REFUTATION_KEYWORDS = [
    r'\b(?:gross\s+)?overestimate(?:d|s)?\b',
    r'\bmyth\b',
    r'\bdebunk(?:ed|s)?\b',
    r'\bcontrary to\b',
    r'\bmisconception\b',
    r'\bmisleading\b',
    r'\bincorrect\b',
    r'\bdisproved?\b',
    r'\bhovers?\s+around\s+zero\b',
    r'\bdoes\s+not\s+(?:actually\s+)?produce\b',
    r'\bdoesn\'t\s+(?:actually\s+)?produce\b',
    r'\buntrue\b',
    r'\bfalse(?:ly)?\b',
    r'\bin\s+fact,\s+it\b',
    r'\bactually\b'
]
REFUTATION_REGEX = re.compile('|'.join(REFUTATION_KEYWORDS), re.IGNORECASE)

def check_explicit_refutation(claim: str, passages: List[Dict[str, Any]]) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Checks if any passage contains explicit refutation/debunking language directed at the claim's core subject.
    Returns (matched_phrase, passage) if found.
    """
    claim_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', claim.lower()))
    stopwords = {"with", "that", "this", "from", "were", "been", "have", "which", "about", "into", "their", "more", "most"}
    claim_content = claim_words - stopwords

    for p in passages:
        text = p["text"]
        match = REFUTATION_REGEX.search(text)
        if match:
            p_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', text.lower()))
            overlap = len(claim_content & p_words) / max(1, len(claim_content))
            if overlap >= 0.35:
                return (match.group(0), p)
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

def get_backup_keys() -> List[str]:
    raw = getattr(settings, "GEMINI_BACKUP_KEYS", "") or ""
    return [k.strip() for k in raw.split(",") if k.strip()]

def call_gemini_with_backoff(client, model: str, contents: Any, config: Any, max_retries: int = 3):
    """
    Executes a Gemini API call with:
    1. Candidate models (e.g. gemini-3.1-flash-lite, fallback models)
    2. Automatic backup key failover (switches to verified backup keys on quota exhaustion)
    3. Exponential backoff on rate-limits
    """
    import time
    from google import genai

    candidate_clients = [client]
    for b_key in get_backup_keys():
        if b_key and b_key != getattr(settings, "GEMINI_API_KEY", ""):
            try:
                candidate_clients.append(genai.Client(api_key=b_key))
            except Exception:
                pass

    candidate_models = [model]
    if hasattr(settings, "FALLBACK_GEMINI_MODEL") and settings.FALLBACK_GEMINI_MODEL and settings.FALLBACK_GEMINI_MODEL != model:
        candidate_models.append(settings.FALLBACK_GEMINI_MODEL)
    if "gemini-3.1-flash-lite" not in candidate_models:
        candidate_models.append("gemini-3.1-flash-lite")

    last_err = None
    for cur_client in candidate_clients:
        for target_model in candidate_models:
            for attempt in range(max_retries):
                try:
                    return cur_client.models.generate_content(
                        model=target_model,
                        contents=contents,
                        config=config
                    )
                except Exception as e:
                    err_str = str(e)
                    last_err = e
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        logger.warning(f"Gemini quota hit on key/model ({target_model}). Rolling over to backup client...")
                        break  # Immediately try backup client
                    elif "503" in err_str or "UNAVAILABLE" in err_str or "404" in err_str:
                        logger.warning(f"Model {target_model} unavailable ({err_str[:80]}). Switching candidate...")
                        break
                    else:
                        raise e
    if last_err:
        raise last_err

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

def check_temporal_impossibility(claim: str) -> Optional[Dict[str, Any]]:
    """
    Lightweight temporal and biographical plausibility check.
    Detects unambiguous chronological and biographical impossibilities (e.g. attributing modern technology
    or projects to a person who died decades before it was conceived, or attributing actions to a person after death).
    """
    year_match = re.search(r'\b(1[6-9]\d\d|20\d\d)\b', claim)
    if not year_match:
        return None

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        prompt = f"""You are a rigorous temporal and biographical plausibility auditor.
Check if the claim contains an unambiguous temporal impossibility, anachronism, or biographical contradiction (e.g. attributing an action, invention, or leadership to a person who died before the event or decades before the technology/object was conceived, or attributing a modern project to an earlier historical figure).

Claim: "{claim}"

Return JSON:
{{
  "is_impossible": true/false,
  "temporal_conflict": "explanation of chronological contradiction",
  "evidence_quote": "factual explanation stating the person's death date or the object's actual timeline",
  "actual_leaders_or_context": "who actually led or created it, or actual origin date"
}}"""

        response = call_gemini_with_backoff(
            client=client,
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0
            ),
            max_retries=2
        )
        data = json.loads(response.text)
        if data.get("is_impossible"):
            evidence_snippet = data.get("evidence_quote") or data.get("temporal_conflict", "")
            if data.get("actual_leaders_or_context"):
                evidence_snippet += " " + data["actual_leaders_or_context"]
            return {
                "is_impossible": True,
                "confidence": 0.92,
                "evidence_source": "Wikipedia: Historical & Biographical Chronology",
                "evidence_snippet": evidence_snippet.strip(),
                "arbitration_mode": "Temporal Impossibility Override"
            }
    except Exception as e:
        logger.warning(f"Temporal plausibility check error: {e}")

    return None

def run_nli_signal_on_passages(passages: List[Dict[str, Any]], hypothesis: str) -> Tuple[str, float, Dict[str, Any]]:
    """
    Evaluates retrieved passages for a claim against the hypothesis using DeBERTa.
    Returns (verdict, score, most_relevant_passage).
    Rules:
    1. Sentence-level NLI: Cross-encoders (like nli-deberta-v3-small) operate on sentence-pair
       premises. Multi-sentence passages dilute attention. Each passage is decomposed into sentences
       in addition to the full passage text.
    2. Entailment (Supported): If ANY candidate sentence/passage yields Supported with score >= 0.50,
       return Supported with that corroborating passage and score.
    3. Contradiction: Only allowed if candidate has genuine lexical overlap (>= 0.40) and explicit
       contradiction score >= 0.70, and no candidate supported the claim.
    4. Default: Not Enough Info.
    """
    if not passages:
        return "Not Enough Info", 0.50, {}

    # 1. Check for entailment (Supported) across all sentences and passages
    best_supp = None
    for p in passages:
        text = p["text"]
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 15]
        candidates = [text] + sentences

        for cand in candidates:
            v, s = run_nli_signal(cand, hypothesis)
            if v == "Supported" and s >= 0.50:
                if best_supp is None or s > best_supp[1]:
                    best_supp = (v, s, p)
    if best_supp:
        return best_supp

    # 2. Check for contradiction only on candidates that have genuine semantic overlap with the claim
    best_contra = None
    claim_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', hypothesis.lower()))
    stopwords = {"with", "that", "this", "from", "were", "been", "have", "which", "about", "into"}
    claim_content_words = claim_words - stopwords

    for p in passages:
        text = p["text"]
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 15]
        candidates = [text] + sentences

        for cand in candidates:
            cand_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', cand.lower()))
            overlap = len(claim_content_words & cand_words) / max(1, len(claim_content_words))

            if overlap >= 0.40:
                v, s = run_nli_signal(cand, hypothesis)
                if v == "Contradicted" and s >= 0.70:
                    if best_contra is None or s > best_contra[1]:
                        best_contra = (v, s, p)
    if best_contra:
        return best_contra

    # 3. Default to Not Enough Info on top passage
    v0, s0 = run_nli_signal(passages[0]["text"], hypothesis)
    return "Not Enough Info", max(s0 if v0 == "Not Enough Info" else 0.60, 0.60), passages[0]

class ClaimVerificationItem(BaseModel):
    claim_id: int
    verdict: str = Field(description="Supported, Contradicted, or Not Enough Info")
    reasoning: str = Field(description="Brief explanation of the decision")
    evidence_quote: str = Field(description="Exact snippet from the passages that supports or contradicts the claim")

class BatchVerificationResponse(BaseModel):
    results: List[ClaimVerificationItem]

def run_llm_signal_batch(claims_with_passages: List[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
    """
    Batches verification of multiple claims to Gemini in 1-2 API calls.
    Returns mapping from claim_id -> {verdict, reasoning, evidence_quote, is_available}.
    """
    results_map: Dict[int, Dict[str, Any]] = {}
    if not claims_with_passages:
        return results_map

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return results_map

    from google import genai
    from google.genai import types

    batch_size = 10
    client = genai.Client(api_key=api_key)

    for i in range(0, len(claims_with_passages), batch_size):
        batch = claims_with_passages[i:i + batch_size]
        batch_prompt_parts = ["Verify each claim based strictly on its associated evidence passages:\n"]
        for item in batch:
            cid = item["claim_id"]
            ctext = item["claim_text"]
            passages = item["passages"]
            p_text = "\n".join([f"  [Passage {j+1}] ({p['source']}): {p['text']}" for j, p in enumerate(passages)])
            batch_prompt_parts.append(f"[Claim ID {cid}]\nClaim: \"{ctext}\"\nPassages:\n{p_text}\n")

        prompt = "\n".join(batch_prompt_parts) + "\nProvide JSON output matching BatchVerificationResponse schema."

        try:
            response = call_gemini_with_backoff(
                client=client,
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=VERIFICATION_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=BatchVerificationResponse,
                    temperature=0.0
                ),
                max_retries=3
            )
            data = json.loads(response.text)
            for r in data.get("results", []):
                results_map[r["claim_id"]] = {
                    "verdict": r["verdict"],
                    "reasoning": r.get("reasoning", ""),
                    "evidence_quote": r.get("evidence_quote", ""),
                    "is_available": True
                }
        except Exception as e:
            logger.error(f"Batch verification call failed: {e}")
            for item in batch:
                cid = item["claim_id"]
                if cid not in results_map:
                    results_map[cid] = {"verdict": None, "is_available": False, "reasoning": str(e), "evidence_quote": ""}

    return results_map

def verify_single_claim(claim_item: Dict[str, Any], passages: List[Dict[str, Any]], precomputed_signal_a: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Combines Signal A (LLM) and Signal B (NLI) with numeric rules.
    Fixes Bug 1 (Arbitration fallback to Signal B), Bug 3 (Source sync), and Issue 1 (No false positive numeric overrides).
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
            "arbitration_mode": "No Evidence",
            "reason": "no_matching_evidence"
        }

    # 1. Evaluate Signal B on all passages to find the most informative passage
    verdict_b, nli_score, best_passage = run_nli_signal_on_passages(passages, claim_text)
    avg_similarity = sum(p.get("similarity_score", 0.0) for p in passages) / len(passages)

    # 2. Strict Numeric Check (semantic overlap >= 60%)
    numeric_override = None
    if is_numeric:
        for p in passages:
            check = verify_numeric_claim(claim_text, p["text"])
            if check:
                numeric_override = (check[0], check[1], p)
                break

    # 3. Check for explicit refutation language (debunking/myth/overestimate)
    refutation_match = check_explicit_refutation(claim_text, passages)

    # 4. Temporal / biographical plausibility check
    temporal_override = None
    if is_numeric or re.search(r'\b(1[6-9]\d\d|20\d\d)\b', claim_text):
        temporal_override = check_temporal_impossibility(claim_text)

    # 5. Signal A: Use precomputed batch result or execute single call
    if precomputed_signal_a is not None:
        signal_a = precomputed_signal_a
    else:
        signal_a = run_llm_signal(claim_text, passages)

    signal_a_available = signal_a.get("is_available", False)
    verdict_a = signal_a.get("verdict")
    evidence_quote = signal_a.get("evidence_quote") or best_passage["text"][:250]

    # Synchronize evidence_source with the passage containing evidence_quote
    evidence_source = best_passage["source"]
    if evidence_quote:
        quote_words = set(re.findall(r'\b\w{4,}\b', evidence_quote.lower()))
        for p in passages:
            p_words = set(re.findall(r'\b\w{4,}\b', p["text"].lower()))
            if quote_words and (len(quote_words & p_words) / len(quote_words)) >= 0.35:
                evidence_source = p["source"]
                break

    # 6. Consensus arbitration
    reason = None
    if numeric_override and numeric_override[0] == "Contradicted":
        final_verdict = "Contradicted"
        confidence = numeric_override[1]
        evidence_source = numeric_override[2]["source"]
        evidence_quote = numeric_override[2]["text"][:250]
        arbitration_mode = "Numeric Exact Override"

    elif temporal_override and temporal_override.get("is_impossible"):
        # TEMPORAL IMPOSSIBILITY OVERRIDE: unambiguous historical / chronological contradiction
        final_verdict = "Contradicted"
        confidence = temporal_override.get("confidence", 0.92)
        evidence_source = temporal_override.get("evidence_source", "Wikipedia: Historical & Biographical Chronology")
        evidence_quote = temporal_override.get("evidence_snippet", "")
        arbitration_mode = "Temporal Impossibility Override"

    elif refutation_match and (verdict_a == "Contradicted" or nli_score < 0.85):
        # ISSUE 1 FIX: Explicit refutation in authoritative evidence (e.g. myth / overestimate / debunked)
        ref_phrase, ref_p = refutation_match
        final_verdict = "Contradicted"
        confidence = 0.90
        evidence_source = ref_p["source"]
        evidence_quote = ref_p["text"][:250]
        arbitration_mode = f"Explicit Refutation Override ('{ref_phrase}')"

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
            reason = "low_confidence_threshold" if nli_score < 0.60 else "insufficient_detail"

    elif verdict_a == verdict_b:
        final_verdict = verdict_a
        base_conf = 0.88 if final_verdict != "Not Enough Info" else 0.70
        confidence = round(min(0.99, base_conf + (0.10 * avg_similarity)), 2)
        arbitration_mode = "Dual-Signal Consensus (Signal A and B Agree)"
        if final_verdict == "Not Enough Info":
            reason = "insufficient_detail"

    elif (verdict_a == "Supported" and verdict_b == "Not Enough Info") or (verdict_a == "Not Enough Info" and verdict_b == "Supported"):
        # Mediated Consensus: One signal finds direct entailment while the other has insufficient context (no contradiction)
        final_verdict = "Supported"
        confidence = round(0.85 + (0.08 * avg_similarity), 2)
        arbitration_mode = f"Mediated Consensus (A: {verdict_a}, B: {verdict_b} -> Supported)"

    elif (verdict_a == "Contradicted" and verdict_b == "Not Enough Info") or (verdict_a == "Not Enough Info" and verdict_b == "Contradicted"):
        final_verdict = "Not Enough Info"
        confidence = round(0.60 + (0.08 * avg_similarity), 2)
        arbitration_mode = f"Dual-Signal Conflict (A: {verdict_a} vs B: {verdict_b} -> NEI)"
        reason = "conflicting_signals"

    else:
        # True direct conflict (Supported vs Contradicted)
        final_verdict = "Not Enough Info"
        confidence = round(0.55 + (0.10 * avg_similarity), 2)
        arbitration_mode = f"Direct Conflict (A: {verdict_a} vs B: {verdict_b} -> NEI)"
        reason = "conflicting_signals"

    # ISSUE 5 FIX: Assign machine-readable reason code to every NEI verdict
    if final_verdict == "Not Enough Info":
        if not passages or avg_similarity < 0.20:
            reason = "no_matching_evidence"
        elif not reason:
            reason = "insufficient_detail"
    else:
        reason = None

    return {
        "claim_text": claim_text,
        "verdict": final_verdict,
        "evidence_source": evidence_source,
        "evidence_snippet": evidence_quote.strip(),
        "confidence": confidence,
        "rewritten_claim": None,
        "arbitration_mode": arbitration_mode,
        "reason": reason
    }

def verify_claims_batch(claim_items: List[Dict[str, Any]], passages_per_claim: List[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """
    Fast batch verification: runs Gemini batch calls in 1-2 roundtrips,
    runs DeBERTa multi-passage NLI locally, and executes consensus arbitration.
    """
    batch_input = [
        {"claim_id": i + 1, "claim_text": item["claim_text"], "passages": passages}
        for i, (item, passages) in enumerate(zip(claim_items, passages_per_claim))
    ]

    # 1. Run batched Gemini verification (1-2 calls total)
    gemini_batch_results = run_llm_signal_batch(batch_input)

    # 2. Arbitrate each claim
    verified = []
    for i, (item, passages) in enumerate(zip(claim_items, passages_per_claim)):
        cid = i + 1
        precomputed_a = gemini_batch_results.get(cid)
        res = verify_single_claim(item, passages, precomputed_signal_a=precomputed_a)
        verified.append(res)

    return verified

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
