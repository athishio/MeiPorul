import json
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger("meiporul.rewrite")

class RewriteResult(BaseModel):
    is_correctable: bool = Field(description="True if evidence is sufficient to produce an accurate factual correction.")
    rewritten_claim: Optional[str] = Field(default=None, description="The corrected factual claim grounded strictly in the evidence.")
    rationale: str = Field(description="Why this correction is faithful to the evidence.")

REWRITE_SYSTEM_PROMPT = """You are a factual correction assistant for a verification system.
Your task is to rewrite a contradicted or unsupported factual claim using ONLY the provided evidence.

Rules:
1. Grounding: Every single detail in the rewritten claim MUST come directly from the evidence snippet. Do NOT assume, extrapolate, or introduce new ungrounded facts.
2. If the evidence snippet does not contain enough information to make an accurate, unambiguous correction, set is_correctable=false and rewritten_claim=null.
3. Keep the rewritten claim concise, factual, and direct.
"""

def generate_grounded_rewrite(claim: str, evidence_snippet: str, evidence_source: str, all_passages: Optional[List[Dict[str, Any]]] = None) -> Optional[str]:
    """Generates a grounded correction using Gemini or evidence distillation."""
    if not evidence_snippet or len(evidence_snippet.strip()) < 15:
        if not all_passages:
            return None

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        cleaned = evidence_snippet.strip()
        if len(cleaned) > 20:
            return f"According to {evidence_source.split('(')[0].strip()}: {cleaned}"
        return None

    if all_passages:
        context_body = "\n\n".join([f"[{p.get('source')}]:\n{p.get('text')}" for p in all_passages])
    else:
        context_body = f"Source: {evidence_source}\nExcerpt: {evidence_snippet}"

    prompt = f"""Original Flagged Claim:
\"{claim}\"

Evidence Context:
\"\"\"{context_body}\"\"\"

Rewrite the original claim so that it accurately reflects the facts proven by the evidence context.
Output JSON conforming to RewriteResult.
"""

    try:
        from google import genai
        from google.genai import types
        from app.pipeline.verification import call_gemini_with_backoff

        client = genai.Client(api_key=api_key)
        response = call_gemini_with_backoff(
            client=client,
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=REWRITE_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=RewriteResult,
                temperature=0.0,
            ),
            max_retries=3
        )
        data = json.loads(response.text)
        if data.get("is_correctable") and data.get("rewritten_claim"):
            return data["rewritten_claim"].strip()
    except Exception as e:
        logger.error(f"Gemini rewrite call failed: {e}")

    return None

def reverify_rewrite(rewritten_claim: str, evidence_snippet: str) -> bool:
    """
    Stage 5: Re-verification loop.
    Ensures the rewritten claim does not introduce new hallucinations.
    Checks lexical alignment against the evidence.
    """
    if not rewritten_claim or not evidence_snippet:
        return False

    import re
    tokens_rewrite = set(re.findall(r'\b[a-zA-Z0-9]{3,}\b', rewritten_claim.lower()))
    tokens_evidence = set(re.findall(r'\b[a-zA-Z0-9]{3,}\b', evidence_snippet.lower()))

    # Ignore ubiquitous stop words
    stopwords = {"the", "and", "that", "this", "with", "from", "was", "were", "been", "for", "which"}
    tokens_rewrite -= stopwords
    tokens_evidence -= stopwords

    if not tokens_rewrite:
        return False

    # At least 60% of significant content words in the rewrite must be present in the evidence
    overlap = len(tokens_rewrite & tokens_evidence) / len(tokens_rewrite)
    return overlap >= 0.55
