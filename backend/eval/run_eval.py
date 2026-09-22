import sys
import os
import json
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.models import VerifyRequest
from app.pipeline.engine import run_verification_pipeline

def run_evaluation():
    data_path = Path(__file__).parent / "test_data.json"
    with open(data_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    print(f"================================================================")
    print(f"Meiporul FActScore-Style Evaluation Benchmark")
    print(f"Loaded {len(test_cases)} test cases with labeled ground-truth claims.")
    print(f"================================================================\n")

    total_pred_supported = 0
    true_pred_supported = 0
    total_claims = 0
    correct_verdicts = 0
    latencies = []

    for case in test_cases:
        item_id = case.get("id")
        question = case.get("question", "")
        answer = case.get("answer", "")
        labeled = case.get("labeled_claims", [])

        req = VerifyRequest(question=question, answer=answer)
        
        t0 = time.time()
        res = run_verification_pipeline(req)
        dur = time.time() - t0
        latencies.append(dur)

        print(f"Test Case: {item_id}")
        print(f"Input: \"{answer[:60]}...\"")
        print(f"Verified Claims ({len(res.claims)}):")

        for claim in res.claims:
            total_claims += 1
            # Find closest ground truth claim by token overlap
            c_text = claim.claim_text.lower()
            matched_gt = None
            for gt in labeled:
                gt_text = gt["claim_text"].lower()
                common = set(c_text.split()) & set(gt_text.split())
                if len(common) >= 3:
                    matched_gt = gt
                    break

            gt_verdict = matched_gt["ground_truth_verdict"] if matched_gt else "Unknown"
            pred_verdict = claim.verdict
            is_match = (gt_verdict != "Unknown" and pred_verdict == gt_verdict)
            
            if is_match:
                correct_verdicts += 1

            if pred_verdict == "Supported":
                total_pred_supported += 1
                if gt_verdict == "Supported":
                    true_pred_supported += 1

            status_sym = "[MATCH]" if is_match else "[DIFF]"
            print(f"  {status_sym} Claim: {claim.claim_text}")
            print(f"         Predicted: {pred_verdict} (Conf: {claim.confidence}) | GT: {gt_verdict}")
            if claim.rewritten_claim:
                print(f"         -> Rewritten: {claim.rewritten_claim}")
        print("-" * 64)

    supported_precision = (true_pred_supported / total_pred_supported * 100.0) if total_pred_supported > 0 else 0.0
    overall_accuracy = (correct_verdicts / total_claims * 100.0) if total_claims > 0 else 0.0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

    print("\n================ EVALUATION SUMMARY ================")
    print(f"Total Evaluated Claims:              {total_claims}")
    print(f"Supported Verdict Precision:         {supported_precision:.1f}%  <-- DEMO ANCHOR NUMBER")
    print(f"Overall Ground-Truth Agreement:     {overall_accuracy:.1f}%")
    print(f"Average Pipeline Latency per Answer: {avg_latency:.2f}s")
    print("====================================================\n")

if __name__ == "__main__":
    run_evaluation()
