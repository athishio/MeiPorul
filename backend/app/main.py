import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
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
    title="Meiporul (மெய்ப்பொருள்) Verification API",
    description="A fact-verification tool other LLMs can call before answering — it checks every claim against evidence, flags what's wrong, and rewrites it before the user ever sees it.",
    version="0.1.0",
    lifespan=lifespan
)

# Enable CORS for frontend dashboard (runs on another port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def verify_endpoint(request: VerifyRequest) -> VerifyResponse:
    try:
        if not request.answer or not request.answer.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answer text cannot be empty."
            )
        response = run_verification_pipeline(request)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing /verify request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification pipeline error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
