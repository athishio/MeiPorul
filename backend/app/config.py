import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings(BaseSettings):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    
    # Model preferences
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    FALLBACK_GEMINI_MODEL: str = os.getenv("FALLBACK_GEMINI_MODEL", "gemini-3.5-flash-lite")
    NLI_MODEL_NAME: str = "cross-encoder/nli-deberta-v3-small"
    
    # Retrieval configuration
    MAX_PASSAGES_PER_SOURCE: int = 2
    TOP_K_PASSAGES: int = 3
    SIMILARITY_THRESHOLD: float = 0.35
    
    # Server configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1")

settings = Settings()
