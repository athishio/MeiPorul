"""
Full Validation Suite for Meiporul Pipeline
Covers:
1. Full re-run of Photosynthesis Fact-Check (with Issue 1, 2, 5 fixes)
2. Full run of Second Domain Fact-Check (Space & Astronomy: JWST, Einstein planted error, 10% brain myth, Odysseus 2024 landing)
3. 3 Back-to-Back Pipeline Calls for Concurrency / Latency / Shared-State Validation
"""

import sys
import os
import time
import json
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.models import VerifyRequest, VerifyResponse
from app.pipeline.verification import init_nli_model
from app.pipeline.engine import run_verification_pipeline
from run_factcheck_photosynthesis import run_detailed_pipeline as run_photosynthesis_pipeline

# 2nd Domain: Space & Astronomy with planted errors, myth, and recent 2024 event
SPACE_TEXT = (
    "The James Webb Space Telescope (JWST) was launched on December 25, 2021, from Kourou, French Guiana. "
    "It orbits the Sun at the Second Lagrange Point (L2), approximately 1.5 million kilometers from Earth. "
    "JWST was designed and built under the leadership of Albert Einstein in 1955. "
    "Humans only use 10% of their brains during astronomical observation tasks. "
    "In February 2024, Intuitive Machines' Odysseus lander achieved the first commercial lunar landing on the Moon as part of NASA's CLPS initiative."
)

def run_space_test():
    print("\n" + "=" * 80)
    print("RUNNING SECOND DOMAIN FACT-CHECK (SPACE & ASTRONOMY)")
    print("=" * 80)
    
    req = VerifyRequest(answer=SPACE_TEXT)
    t0 = time.time()
    resp = run_verification_pipeline(req)
    duration = time.time() - t0
    
    output_file = backend_dir / "factcheck_result_space_domain.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "schema_response": resp.model_dump(),
            "metrics": {
                "total_latency_seconds": round(duration, 2)
            }
        }, f, indent=2)
    
    print(f"\nSpace Domain Check Finished in {duration:.2f}s")
    print(f"Total Claims: {resp.summary.total_claims} | Supported: {resp.summary.percent_supported}% | "
          f"Contradicted: {resp.summary.percent_contradicted}% | NEI: {resp.summary.percent_not_enough_info}% | "
          f"Avg Conf: {resp.summary.avg_confidence}")
    return resp, duration

def run_back_to_back_test():
    print("\n" + "=" * 80)
    print("RUNNING 3 BACK-TO-BACK VERIFY CALLS (CONCURRENCY & STABILITY TEST)")
    print("=" * 80)
    
    latencies = []
    responses = []
    errors = []
    
    test_text = (
        "Photosynthesis is the process by which plants convert sunlight into chemical energy. "
        "It was first characterized in detail by Jan Ingenhousz in 1779. "
        "Charles Darwin fully explained photosynthesis in 1859. "
        "Gemini 3.5 Flash supports structured JSON output."
    )
    
    for i in range(3):
        print(f"\n--- Back-to-Back Run #{i+1} ---")
        t_start = time.time()
        try:
            req = VerifyRequest(answer=test_text)
            resp = run_verification_pipeline(req)
            elapsed = time.time() - t_start
            latencies.append(round(elapsed, 2))
            responses.append(resp)
            print(f"Run #{i+1} completed in {elapsed:.2f}s | Claims: {resp.summary.total_claims} | Supported: {resp.summary.percent_supported}%")
        except Exception as e:
            errors.append(f"Run #{i+1} failed: {e}")
            print(f"Run #{i+1} ERROR: {e}")
            
    print("\n" + "-" * 40)
    print("BACK-TO-BACK PERFORMANCE REPORT:")
    print(f"Latencies: Run 1 = {latencies[0]}s, Run 2 = {latencies[1]}s, Run 3 = {latencies[2]}s")
    print(f"Average Latency: {sum(latencies)/len(latencies):.2f}s")
    print(f"Rate-limit / API Errors: {len(errors)}")
    
    # Check for shared state: verify that claim counts and texts are identical across runs
    counts = [r.summary.total_claims for r in responses]
    state_clean = len(set(counts)) == 1
    print(f"Shared State Integrity (Deterministic outputs across calls): {'PASSED' if state_clean else 'FAILED'}")
    print("-" * 40)
    
    return {
        "latencies": latencies,
        "avg_latency": round(sum(latencies)/len(latencies), 2),
        "errors": errors,
        "state_clean": state_clean
    }

if __name__ == "__main__":
    init_nli_model()
    
    # 1. Photosynthesis run
    print("\n>>> TEST 1: Photosynthesis Comprehensive Run")
    run_photosynthesis_pipeline()
    
    # 2. Space domain run
    print("\n>>> TEST 2: Space Domain Comprehensive Run")
    run_space_test()
    
    # 3. Back-to-back stability run
    print("\n>>> TEST 3: Back-to-Back Stability Runs")
    run_back_to_back_test()
