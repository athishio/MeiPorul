import re
import json
import logging
from typing import List, Dict, Any
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger("meiporul.extraction")

class ExtractedClaim(BaseModel):
    claim_text: str = Field(description="Atomic, independently checkable factual claim with pronouns resolved.")
    is_numeric: bool = Field(description="True if the claim contains numbers, dates, quantities, or statistics.")
    source_sentence: str = Field(description="The sentence in the original answer this claim was derived from.")
    is_checkable: bool = Field(default=True, description="True if the statement is an objective factual claim, False if purely subjective opinion.")

class ClaimExtractionResponse(BaseModel):
    claims: List[ExtractedClaim]

EXTRACTION_SYSTEM_PROMPT = """You are a deterministic, precision factual claim extractor for a post-hoc verification engine.
Your goal is to decompose the given text into atomic, independently checkable factual claims (FActScore style) with strict determinism.

Rules:
1. Split claims at the finest verifiable atomic fact — exactly one factual assertion per claim.
2. Do NOT merge multiple entities, inputs, outputs, dates, or measurements into a single claim:
   - Always split coordinate conjunctions ('and', 'as well as') where distinct entities, inputs, or outputs are asserted.
   - Example: "Water and carbon dioxide are the primary inputs" MUST be split into:
     a) "Water is a primary input of photosynthesis."
     b) "Carbon dioxide is a primary input of photosynthesis."
   - Example: "Oxygen and glucose are the outputs" MUST be split into:
     a) "Oxygen is an output of photosynthesis."
     b) "Glucose is an output of photosynthesis."
   - Example: "Gemini 3.5 Flash was released by Google in May 2026 and supports structured JSON output" MUST be split into:
     a) "Google released Gemini 3.5 Flash."
     b) "Gemini 3.5 Flash was released in May 2026."
     c) "Gemini 3.5 Flash supports structured JSON output."
3. Resolve all coreferences and pronouns ('it', 'he', 'she', 'they', 'this', 'the telescope', etc.) to their specific full entity names based on context.
4. Exclude purely subjective opinions, speculations, or conversational pleasantries (set is_checkable=false).
5. Tag is_numeric=true if the claim specifies dates, years, numerical quantities, percentages, or measurements.
6. Record source_sentence as the exact original sentence from which the claim was derived.
7. Be completely deterministic. Follow the exact order of facts as they appear in the source text.
"""

def extract_claims_fallback(answer: str) -> List[Dict[str, Any]]:
    """Heuristic sentence-level claim extraction when LLM is unavailable."""
    # Split text by sentence terminators
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', answer) if s.strip()]
    results = []
    
    num_pattern = re.compile(r'\b\d+(?:[\.,]\d+)?\b|\b(?:first|second|third|january|february|march|april|may|june|july|august|september|october|november|december)\b', re.IGNORECASE)
    
    for sentence in sentences:
        if len(sentence) < 10:
            continue
        is_num = bool(num_pattern.search(sentence))
        results.append({
            "claim_text": sentence,
            "is_numeric": is_num,
            "source_sentence": sentence,
            "is_checkable": True
        })
    return results

def extract_claims(answer: str, question: str = "") -> List[Dict[str, Any]]:
    """Decomposes an answer into atomic, checkable claims using Gemini or fallback."""
    if not answer or not answer.strip():
        return []
        
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        logger.warning("No GEMINI_API_KEY found; using heuristic extraction fallback.")
        return extract_claims_fallback(answer)

    prompt = f"""Decompose the following answer into atomic factual claims.

{f"Context Question: {question}" if question else ""}

Answer:
\"\"\"{answer}\"\"\"

Provide JSON output matching the ClaimExtractionResponse schema with:
- claim_text: atomic fact with pronouns resolved to specific entity
- is_numeric: true if contains dates/numbers/quantities
- source_sentence: exact sentence from answer
- is_checkable: true for objective claims, false for subjective statements
"""

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        from app.pipeline.verification import call_gemini_with_backoff
        response = call_gemini_with_backoff(
            client=client,
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=EXTRACTION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ClaimExtractionResponse,
                temperature=0.0,
            ),
            max_retries=3
        )
        
        parsed = json.loads(response.text)
        claims_data = parsed.get("claims", [])
        checkable_claims = [
            c for c in claims_data if c.get("is_checkable", True)
        ]
        if checkable_claims:
            return checkable_claims
    except Exception as e:
        logger.error(f"Gemini claim extraction failed: {e}. Falling back to heuristic.")
        
    return extract_claims_fallback(answer)
