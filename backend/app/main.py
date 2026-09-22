import os
import time
import logging
from typing import List, Dict
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from app.models import VerifyRequest, VerifyResponse
from app.config import settings
from app.pipeline.engine import run_verification_pipeline
from app.pipeline.verification import init_nli_model

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("meiporul.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Warm-load models so the first request isn't slow during live demos
    logger.info("Initializing Meiporul Verification Backend...")
    init_nli_model()
    logger.info("Meiporul ready to verify claims.")
    yield
    logger.info("Shutting down Meiporul Verification Backend.")

app = FastAPI(
    title="Meiporul (மெய்பொருள்) Verification API",
    description="A fact-verification tool other LLMs can call before answering — it checks every claim against evidence, flags what's wrong, and rewrites it before the user ever sees it.",
    version="0.1.0",
    lifespan=lifespan
)

# -------------------------------------------------------------------------
# CORS Configuration
# -------------------------------------------------------------------------
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if raw_origins and raw_origins.strip() != "*":
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    allow_credentials = True
    allow_origin_regex = None
elif raw_origins.strip() == "*":
    # Wildcard origin cannot be used with allow_credentials=True in standard CORS
    allowed_origins = ["*"]
    allow_credentials = False
    allow_origin_regex = None
else:
    # Default development / local demo origins
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    allow_credentials = True
    # Allow any local port dynamically for testing/demo
    allow_origin_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# In-Memory Sliding-Window Rate Limiter
# -------------------------------------------------------------------------
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "15"))
_REQUEST_HISTORY: Dict[str, List[float]] = defaultdict(list)

def check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    window_start = now - 60.0
    _REQUEST_HISTORY[client_ip] = [t for t in _REQUEST_HISTORY[client_ip] if t > window_start]
    if len(_REQUEST_HISTORY[client_ip]) >= RATE_LIMIT_PER_MINUTE:
        return False
    _REQUEST_HISTORY[client_ip].append(now)
    return True

@app.get("/health", tags=["Health"])
def health_check():
    """Liveness & readiness probe."""
    return {
        "status": "healthy",
        "service": "Meiporul Verification Engine",
        "version": "0.1.0"
    }

@app.post(
    "/verify",
    response_model=VerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Answer Claims",
    description="Accepts an AI-generated answer, extracts atomic claims, searches multi-source evidence, cross-checks via dual signals, rewrites contradicted claims, and outputs an annotated report.",
    tags=["Verification"]
)
async def verify_endpoint(request: VerifyRequest, raw_req: Request) -> VerifyResponse:
    # 1. IP Rate Limiting Check
    client_ip = raw_req.client.host if raw_req.client else "127.0.0.1"
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_PER_MINUTE} verification requests per minute allowed."
        )

    # 2. Input Validation
    if not request.answer or not request.answer.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer text cannot be empty."
        )

    # 3. Execution with Sanitized Error Handling
    try:
        response = run_verification_pipeline(request)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal error processing /verify request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during verification. Please try again."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
