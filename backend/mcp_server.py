"""
Meiporul MCP Server
Exposes the Meiporul Fact-Verification pipeline as an MCP Tool for
Claude Desktop, Cursor, Antigravity, and any MCP-compatible agent.
"""

import sys
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from mcp.server.fastmcp import FastMCP
from app.models import VerifyRequest
from app.pipeline.engine import run_verification_pipeline
from app.pipeline.verification import init_nli_model

# Initialize FastMCP Server
mcp = FastMCP("Meiporul Fact-Verification Server")

# Warm-load NLI model on initialization
init_nli_model()

@mcp.tool()
def verify_answer(answer: str, question: str = "") -> str:
    """
    Verifies factual claims in an AI-generated answer against trusted evidence sources (Wikipedia, Tavily),
    flags unsupported or contradicted claims, and returns evidence-grounded corrected versions.
    Call this after generating an answer and before showing it to the user.

    Args:
        answer: The AI-generated answer text to fact-check.
        question: Optional context prompt or question.
    """
    request = VerifyRequest(question=question, answer=answer)
    response = run_verification_pipeline(request)
    return response.model_dump_json(indent=2)

if __name__ == "__main__":
    mcp.run()
