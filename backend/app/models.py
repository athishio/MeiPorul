from typing import Literal, Optional, List
from pydantic import BaseModel, Field

VerdictType = Literal["Supported", "Contradicted", "Not Enough Info"]

class VerifyRequest(BaseModel):
    question: Optional[str] = Field(
        default=None, 
        description="The optional prompt or question that generated the answer."
    )
    answer: str = Field(
        ..., 
        min_length=1, 
        description="The AI-generated answer to fact-check."
    )

class ClaimResult(BaseModel):
    claim_text: str = Field(..., description="The atomic factual claim.")
    verdict: VerdictType = Field(..., description="Classification: Supported, Contradicted, or Not Enough Info.")
    evidence_source: str = Field(..., description="Identifier or URL of the evidence source.")
    evidence_snippet: str = Field(..., description="Extracted snippet or quote from evidence.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Derived confidence score (0.0 to 1.0).")
    rewritten_claim: Optional[str] = Field(
        default=None, 
        description="Corrected version of the claim grounded strictly in evidence."
    )

class SummaryMetrics(BaseModel):
    total_claims: int = Field(..., description="Total number of claims checked.")
    percent_supported: float = Field(..., description="Percentage of claims marked Supported.")
    percent_contradicted: float = Field(..., description="Percentage of claims marked Contradicted.")
    percent_not_enough_info: float = Field(..., description="Percentage of claims with Not Enough Info.")
    avg_confidence: float = Field(..., description="Average derived confidence score across all claims.")

class VerifyResponse(BaseModel):
    claims: List[ClaimResult] = Field(..., description="List of verified claims with evidence and rewrites.")
    annotated_answer: str = Field(..., description="Annotated answer with inline verdict markers.")
    summary: SummaryMetrics = Field(..., description="Aggregate verification statistics.")
