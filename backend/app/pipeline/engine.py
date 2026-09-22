import time
import logging
from typing import Dict, Any, List

from app.models import VerifyRequest, VerifyResponse, ClaimResult, SummaryMetrics
from app.pipeline.extraction import extract_claims
from app.pipeline.retrieval import retrieve_evidence
from app.pipeline.verification import verify_single_claim, check_pairwise_consistency
from app.pipeline.rewrite import generate_grounded_rewrite, reverify_rewrite
from app.pipeline.annotator import compute_summary_metrics, generate_annotated_answer

logger = logging.getLogger("meiporul.engine")

def run_verification_pipeline(request: VerifyRequest) -> VerifyResponse:
    """
    Executes the full 6-stage verification pipeline:
    1. Claim Extraction
    2. Evidence Retrieval & Ranking
    3. Dual-Signal Verification & Numeric Checks
    4. Grounded Rewrite Generation
    5. Rewrite Re-verification Loop
    6. Span Annotation & Summary Aggregation
    """
    start_time = time.time()
    answer = request.answer.strip()
    question = (request.question or "").strip()

    logger.info(f"Starting verification for answer ({len(answer)} chars)")

    # STAGE 1: Claim Extraction
    t1 = time.time()
    extracted = extract_claims(answer, question=question)
    logger.info(f"Stage 1 extracted {len(extracted)} claims in {time.time() - t1:.2f}s")

    verified_claims: List[Dict[str, Any]] = []

    # STAGES 2 & 3: Retrieval & Dual-Signal Verification
    for item in extracted:
        claim_text = item["claim_text"]
        is_numeric = item.get("is_numeric", False)

        # Stage 2: Multi-source retrieval
        passages = retrieve_evidence(claim_text, is_numeric=is_numeric)

        # Stage 3: Dual-signal verification + numeric check
        v_res = verify_single_claim(item, passages)
        verified_claims.append(v_res)

    # Self-consistency check across claims
    verified_claims = check_pairwise_consistency(verified_claims)

    # STAGES 4 & 5: Rewrite & Re-verification Loop
    for claim in verified_claims:
        if claim["verdict"] in ("Contradicted", "Not Enough Info"):
            candidate_rewrite = generate_grounded_rewrite(
                claim=claim["claim_text"],
                evidence_snippet=claim["evidence_snippet"],
                evidence_source=claim["evidence_source"]
            )
            if candidate_rewrite:
                # Stage 5: Re-verify rewrite against evidence
                if reverify_rewrite(candidate_rewrite, claim["evidence_snippet"]):
                    claim["rewritten_claim"] = candidate_rewrite
                else:
                    logger.warning(f"Rewrite failed re-verification: {candidate_rewrite}")
                    claim["rewritten_claim"] = None

    # STAGE 6: Annotation & Summary
    summary = compute_summary_metrics(verified_claims)
    annotated_text = generate_annotated_answer(answer, verified_claims)

    claim_results = [
        ClaimResult(
            claim_text=c["claim_text"],
            verdict=c["verdict"],
            evidence_source=c["evidence_source"],
            evidence_snippet=c["evidence_snippet"],
            confidence=c["confidence"],
            rewritten_claim=c.get("rewritten_claim")
        )
        for c in verified_claims
    ]

    total_duration = time.time() - start_time
    logger.info(
        f"Verification finished in {total_duration:.2f}s | "
        f"Claims: {summary.total_claims} | "
        f"Supported: {summary.percent_supported}% | "
        f"Contradicted: {summary.percent_contradicted}% | "
        f"Avg Conf: {summary.avg_confidence}"
    )

    return VerifyResponse(
        claims=claim_results,
        annotated_answer=annotated_text,
        summary=summary
    )
