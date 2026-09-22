import time
import logging
from typing import Dict, Any, List

from app.models import VerifyRequest, VerifyResponse, ClaimResult, SummaryMetrics
from app.pipeline.extraction import extract_claims
from app.pipeline.retrieval import retrieve_evidence, retrieve_evidence_parallel
from app.pipeline.verification import verify_single_claim, verify_claims_batch, check_pairwise_consistency
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

    # STAGE 2: Parallel Multi-source Retrieval
    t2 = time.time()
    passages_per_claim = retrieve_evidence_parallel(extracted, max_workers=6)
    logger.info(f"Stage 2 retrieved evidence for {len(extracted)} claims in {time.time() - t2:.2f}s")

    # STAGE 3: Batched Verification (1-2 Gemini calls + local DeBERTa)
    t3 = time.time()
    verified_claims = verify_claims_batch(extracted, passages_per_claim)
    logger.info(f"Stage 3 verified {len(verified_claims)} claims in {time.time() - t3:.2f}s")

    # Self-consistency check across claims
    verified_claims = check_pairwise_consistency(verified_claims)

    # STAGES 4 & 5: Rewrite & Re-verification Loop (only fires on Contradicted claims)
    for idx, claim in enumerate(verified_claims):
        if claim["verdict"] == "Contradicted":
            claim_passages = passages_per_claim[idx] if idx < len(passages_per_claim) else []
            candidate_rewrite = generate_grounded_rewrite(
                claim=claim["claim_text"],
                evidence_snippet=claim["evidence_snippet"],
                evidence_source=claim["evidence_source"],
                all_passages=claim_passages,
                arbitration_mode=claim.get("arbitration_mode")
            )
            if candidate_rewrite:
                # Stage 5: Re-verify rewrite against evidence
                combined_evidence = claim["evidence_snippet"] + " " + " ".join([p["text"] for p in claim_passages])
                if reverify_rewrite(candidate_rewrite, combined_evidence):
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
            evidence_source_name=c.get("evidence_source_name"),
            evidence_source_url=c.get("evidence_source_url"),
            evidence_source_domain=c.get("evidence_source_domain"),
            evidence_snippet=c["evidence_snippet"],
            confidence=c["confidence"],
            rewritten_claim=c.get("rewritten_claim"),
            reason=c.get("reason")
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
