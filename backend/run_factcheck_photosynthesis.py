"""
Real End-to-End Execution of Meiporul Fact-Checking Pipeline
with Detailed Per-Claim Tracing & Instrumentation
Includes Fixes for Bug 1 (Arbitration fallback), Bug 2 (Contradicted-only rewrites),
Bug 3 (Source sync), and Bug 4 (Rate-limit backoff).
"""

import sys
import os
import time
import json
from pathlib import Path

# Set UTF-8 encoding
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.models import VerifyRequest
from app.pipeline.extraction import extract_claims
from app.pipeline.retrieval import retrieve_evidence
from app.pipeline.verification import (
    init_nli_model, 
    verify_single_claim, 
    check_pairwise_consistency,
    run_nli_signal,
    verify_numeric_claim
)
from app.pipeline.rewrite import generate_grounded_rewrite, reverify_rewrite
from app.pipeline.annotator import compute_summary_metrics, generate_annotated_answer

INPUT_TEXT = """Photosynthesis is the process by which plants convert sunlight into chemical energy. It was first characterized in detail by Jan Ingenhousz in 1779. The process occurs primarily in the chloroplasts of plant cells, using a pigment called chlorophyll to absorb light. Water and carbon dioxide are the primary inputs, and oxygen and glucose are the outputs. Photosynthesis was first fully explained by Charles Darwin in 1859. In 2023, researchers at MIT announced a breakthrough artificial photosynthesis system that achieved 15% efficiency, more than double the average efficiency of natural photosynthesis in most plants (around 1-2%). The Amazon rainforest produces roughly 20% of the world's oxygen through photosynthesis. Gemini 3.5 Flash was released by Google in May 2026 and supports structured JSON output."""

def run_detailed_pipeline():
    start_time = time.time()
    gemini_api_call_count = 0

    print("=" * 80)
    print("MEIPORUL FACT-CHECKING PIPELINE — RE-RUN WITH BUG FIXES APPLIED")
    print(f"Model: {settings.GEMINI_MODEL} | NLI: {settings.NLI_MODEL_NAME}")
    print("=" * 80)

    # 1. Warm-load NLI model
    print("\n[Warm-loading NLI Model]")
    t_nli_start = time.time()
    init_nli_model()
    print(f"NLI model ready in {time.time() - t_nli_start:.2f}s")

    # 2. Stage 1 — Extraction
    print("\n[Stage 1: Claim Extraction via Gemini 2.5 Flash]")
    t_ext_start = time.time()
    extracted_claims = extract_claims(INPUT_TEXT)
    gemini_api_call_count += 1
    t_ext_dur = time.time() - t_ext_start
    print(f"Extracted {len(extracted_claims)} atomic claims in {t_ext_dur:.2f}s (Gemini Call #{gemini_api_call_count})")

    detailed_results = []
    verified_claims_for_response = []

    # 3. Stages 2 & 3: Retrieval & Dual-Signal Verification per claim
    for idx, claim_item in enumerate(extracted_claims, 1):
        claim_text = claim_item["claim_text"]
        is_numeric = claim_item.get("is_numeric", False)
        source_sent = claim_item.get("source_sentence", "")

        print(f"\n--- Processing Claim {idx}/{len(extracted_claims)} ---")
        print(f"Claim: \"{claim_text}\"")
        print(f"Type: {'NUMERIC / Time-Sensitive' if is_numeric else 'GENERAL / Encyclopedic'}")

        # Routing explanation
        if is_numeric and settings.TAVILY_API_KEY:
            route_reason = "Routed to Tavily first (real-time/numeric stats/dates), supplemented by Wikipedia"
        else:
            route_reason = "Routed to Wikipedia first (encyclopedic definition/historical fact), supplemented by Tavily"

        # Stage 2: Retrieval
        passages = retrieve_evidence(claim_text, is_numeric=is_numeric)

        # Stage 3: Unified Verification (Single call per claim to conserve quota)
        # Add gentle 1.5s pacing to respect 5 req/min burst limits
        time.sleep(1.5)
        
        v_res = verify_single_claim(claim_item, passages)
        gemini_api_call_count += 1
        final_verdict = v_res["verdict"]

        # Signal B trace for audit report
        best_passage = passages[0]["text"] if passages else ""
        verdict_b, nli_score = run_nli_signal(best_passage, claim_text) if best_passage else ("Not Enough Info", 0.0)

        # Stage 4 & 5: BUG 2 FIX — Rewrite only triggers when verdict is Contradicted!
        candidate_rewrite = None
        reverify_status = None

        if final_verdict == "Contradicted":
            print(f"  [TRIGGER] Verdict is Contradicted -> Initiating Stage 4/5 Grounded Rewrite...")
            time.sleep(1.0)
            candidate_rewrite = generate_grounded_rewrite(
                claim=claim_text,
                evidence_snippet=v_res["evidence_snippet"],
                evidence_source=v_res["evidence_source"]
            )
            gemini_api_call_count += 1
            if candidate_rewrite:
                is_valid = reverify_rewrite(candidate_rewrite, v_res["evidence_snippet"])
                reverify_status = "Passed (Grounded in Evidence)" if is_valid else "Failed (Introduced unverified terms)"
                if is_valid:
                    v_res["rewritten_claim"] = candidate_rewrite
                else:
                    v_res["rewritten_claim"] = None
            else:
                reverify_status = "No correction possible from snippet"
        else:
            reverify_status = "Skipped (Verdict is not Contradicted)"

        verified_claims_for_response.append(v_res)

        detailed_results.append({
            "index": idx,
            "claim_text": claim_text,
            "is_numeric": is_numeric,
            "source_sentence": source_sent,
            "routing": route_reason,
            "passages": passages,
            "signal_b": {
                "verdict": verdict_b,
                "score": round(nli_score, 4)
            },
            "final_verdict": final_verdict,
            "confidence": v_res["confidence"],
            "arbitration_mode": v_res.get("arbitration_mode", "Unknown"),
            "evidence_source": v_res["evidence_source"],
            "evidence_snippet": v_res["evidence_snippet"],
            "rewritten_claim": v_res.get("rewritten_claim"),
            "reverify_status": reverify_status
        })

    # Self-consistency pass
    verified_claims_for_response = check_pairwise_consistency(verified_claims_for_response)

    # Summary and annotation
    summary = compute_summary_metrics(verified_claims_for_response)
    annotated_answer = generate_annotated_answer(INPUT_TEXT, verified_claims_for_response)
    total_latency = time.time() - start_time

    # Construct standard schema response
    final_output_schema = {
        "claims": [
            {
                "claim_text": c["claim_text"],
                "verdict": c["verdict"],
                "evidence_source": c["evidence_source"],
                "evidence_snippet": c["evidence_snippet"],
                "confidence": c["confidence"],
                "rewritten_claim": c.get("rewritten_claim")
            }
            for c in verified_claims_for_response
        ],
        "annotated_answer": annotated_answer,
        "summary": {
            "total_claims": summary.total_claims,
            "percent_supported": summary.percent_supported,
            "percent_contradicted": summary.percent_contradicted,
            "percent_not_enough_info": summary.percent_not_enough_info,
            "avg_confidence": summary.avg_confidence
        }
    }

    # Save outputs to JSON file for full inspection
    output_file = Path(__file__).parent / "factcheck_result_photosynthesis_fixed.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "schema_response": final_output_schema,
            "detailed_traces": detailed_results,
            "metrics": {
                "total_latency_seconds": round(total_latency, 2),
                "total_gemini_api_calls": gemini_api_call_count
            }
        }, f, indent=2)

    print("\n" + "=" * 80)
    print("RUN COMPLETE WITH BUG FIXES")
    print(f"Total Latency: {total_latency:.2f}s | Total Gemini API Calls: {gemini_api_call_count}")
    print(f"Results saved to: {output_file}")
    print("=" * 80)

if __name__ == "__main__":
    run_detailed_pipeline()
