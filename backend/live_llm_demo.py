"""
Meiporul Live Demonstration Script (Step 2 in Judge Pitch Script)
Simulates an LLM agent drafting a response with a planted factual hallucination,
passing it into Meiporul's verify_answer tool, and receiving the verified
audit report + auto-corrected output.
"""

import sys
import json
import time
from pathlib import Path

# Safe UTF-8 reconfiguration for Windows terminals
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.models import VerifyRequest
from app.pipeline.engine import run_verification_pipeline
from app.pipeline.verification import init_nli_model

def run_demo():
    print("=" * 70)
    print("MEIPORUL (MeiPorul) -- LIVE AGENT TOOL DEMONSTRATION")
    print("Post-Hoc Verification & Self-Correction Pipeline")
    print("=" * 70)

    # 1. Warm-load NLI model
    print("\n[Stage 0] Warm-loading local DeBERTa NLI cross-encoder...")
    init_nli_model()

    # 2. Planted LLM Draft Answer
    question = "Who invented the telephone, and when did Apollo 11 land on the moon?"
    unverified_draft = (
        "Apollo 11 landed on the Moon on July 20, 1969. "
        "Thomas Edison invented the telephone in 1910."
    )

    print("\n" + "-" * 70)
    print("[Downstream LLM Draft (Contains Planted Hallucination)]")
    print(f"Prompt: \"{question}\"")
    print(f"Draft:  \"{unverified_draft}\"")
    print("-" * 70)

    print("\n[LLM Agent Invokes Tool: verify_answer(question=..., answer=...)]")
    print("Executing 6-Stage Pipeline (Extraction -> Dual-Retrieval -> NLI + Regex -> Rewrite -> Re-verify)...")

    t0 = time.time()
    req = VerifyRequest(question=question, answer=unverified_draft)
    report = run_verification_pipeline(req)
    duration = time.time() - t0

    print(f"[Done] Verification completed in {duration:.2f}s\n")
    print("=" * 70)
    print("VERIFICATION AUDIT TRAIL:")
    print("=" * 70)

    for i, claim in enumerate(report.claims, 1):
        symbol = "[SUPPORTED]   " if claim.verdict == "Supported" else "[CONTRADICTED]" if claim.verdict == "Contradicted" else "[NOT ENOUGH]  "
        print(f"\nClaim {i}: {symbol} \"{claim.claim_text}\"")
        print(f"        Confidence: {int(claim.confidence * 100)}% (Derived from Signal A/B consensus)")
        print(f"        Evidence:   {claim.evidence_source}")
        print(f"        Snippet:    \"{claim.evidence_snippet[:120]}...\"")

        if claim.rewritten_claim:
            print(f"        -> SELF-CORRECTED REWRITE: \"{claim.rewritten_claim}\"")

    print("\n" + "=" * 70)
    print("AGGREGATE SUMMARY:")
    print(f"   Total Claims:       {report.summary.total_claims}")
    print(f"   Supported:          {report.summary.percent_supported}%")
    print(f"   Contradicted:       {report.summary.percent_contradicted}%")
    print(f"   Average Confidence: {report.summary.avg_confidence * 100:.1f}%")
    print("=" * 70)

    print("\nFINAL DELIVERABLE TO USER (Safe & Grounded):")
    print(f"   \"{report.annotated_answer}\"")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_demo()
