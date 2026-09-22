import re
from typing import List, Dict, Any, Tuple
from app.models import SummaryMetrics

def compute_summary_metrics(claims: List[Dict[str, Any]]) -> SummaryMetrics:
    """Aggregates verification counts and percentage metrics directly from verified claims."""
    total = len(claims)
    if total == 0:
        return SummaryMetrics(
            total_claims=0,
            percent_supported=0.0,
            percent_contradicted=0.0,
            percent_not_enough_info=0.0,
            avg_confidence=0.0
        )

    supported_count = sum(1 for c in claims if c["verdict"] == "Supported")
    contradicted_count = sum(1 for c in claims if c["verdict"] == "Contradicted")
    nei_count = sum(1 for c in claims if c["verdict"] == "Not Enough Info")
    total_conf = sum(c.get("confidence", 0.0) for c in claims)

    return SummaryMetrics(
        total_claims=total,
        percent_supported=round((supported_count / total) * 100.0, 1),
        percent_contradicted=round((contradicted_count / total) * 100.0, 1),
        percent_not_enough_info=round((nei_count / total) * 100.0, 1),
        avg_confidence=round(total_conf / total, 3)
    )

def generate_annotated_answer(original_answer: str, claims: List[Dict[str, Any]]) -> str:
    """
    Generates inline annotations for the original text.
    Marks claims with tags: [claim text] [Verdict: Supported|Contradicted|Not Enough Info]
    """
    if not original_answer or not claims:
        return original_answer

    # Map source sentences or claim texts to verdicts
    annotated = original_answer
    
    # Sort claims by length descending to avoid partial word replacements
    sorted_claims = sorted(claims, key=lambda c: len(c["claim_text"]), reverse=True)

    for item in sorted_claims:
        claim_text = item["claim_text"]
        verdict = item["verdict"]
        
        # Try finding the exact claim or matching key sentence
        pattern = re.escape(claim_text.strip())
        tag = f" [{verdict}]"
        
        if re.search(pattern, annotated, flags=re.IGNORECASE):
            # Replace only the first occurrence to avoid duplicates
            annotated = re.sub(
                f"({pattern})",
                rf"\1{tag}",
                annotated,
                count=1,
                flags=re.IGNORECASE
            )

    # If no replacements were made because claims were decomposed/paraphrased,
    # append structured annotations at sentence boundaries
    if "[" not in annotated:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', original_answer) if s.strip()]
        annotated_sentences = []
        for s in sentences:
            # Find best matching claim
            matched_claim = None
            for c in claims:
                if any(w in s.lower() for w in c["claim_text"].lower().split() if len(w) > 4):
                    matched_claim = c
                    break
            verdict = matched_claim["verdict"] if matched_claim else "Not Enough Info"
            annotated_sentences.append(f"{s} [{verdict}]")
        annotated = " ".join(annotated_sentences)

    return annotated
