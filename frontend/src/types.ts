export type Verdict = 'Supported' | 'Contradicted' | 'Not Enough Info';

export interface SignalInfo {
  status?: string;
  source?: string;
  score?: number;
  label?: string;
}

export interface Claim {
  claim_text: string;
  verdict: Verdict;
  evidence_source: string;
  evidence_source_name?: string | null;
  evidence_source_url?: string | null;
  evidence_source_domain?: string | null;
  evidence_snippet: string;
  confidence: number;
  rewritten_claim: string | null;
  reason?: string | null;
  // Optional per-claim extension fields
  signal_a?: string | SignalInfo;
  signal_b?: string | SignalInfo;
  arbitration_mode?: string;
}

export interface Summary {
  total_claims: number;
  percent_supported: number;
  percent_contradicted: number;
  percent_not_enough_info: number;
  avg_confidence: number;
}

export interface VerifyResponse {
  question?: string;
  answer?: string;
  claims: Claim[];
  annotated_answer: string;
  summary: Summary;
}

export interface VerifyRequest {
  question?: string;
  answer: string;
}
