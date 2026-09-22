export type Verdict = 'Supported' | 'Contradicted' | 'Not Enough Info';

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
}

export interface Summary {
  total_claims: int;
  percent_supported: number;
  percent_contradicted: number;
  percent_not_enough_info: number;
  avg_confidence: number;
}

export type int = number;

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
