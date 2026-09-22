import re
import math
import logging
from typing import List, Dict, Any, Optional
from collections import Counter
import httpx

from app.config import settings

logger = logging.getLogger("meiporul.retrieval")

# In-memory retrieval cache: normalized_claim -> List[PassageDict]
_RETRIEVAL_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def normalize_text(text: str) -> str:
    """Normalize text for consistent query hashing and comparison."""
    return re.sub(r'\s+', ' ', text.strip().lower())

def compute_lexical_similarity(query: str, doc: str) -> float:
    """Fast lexical and sub-word cosine similarity for robust ranking without external model downloads."""
    def get_tokens(s: str) -> List[str]:
        words = re.findall(r'\b[a-zA-Z0-9]{2,}\b', s.lower())
        # Add bigrams for context sensitivity
        bigrams = [f"{words[i]}_{words[i+1]}" for i in range(len(words)-1)]
        return words + bigrams

    q_tokens = get_tokens(query)
    d_tokens = get_tokens(doc)
    
    if not q_tokens or not d_tokens:
        return 0.0

    q_counts = Counter(q_tokens)
    d_counts = Counter(d_tokens)

    # Dot product
    intersection = set(q_counts.keys()) & set(d_counts.keys())
    dot = sum(q_counts[k] * d_counts[k] for k in intersection)

    norm_q = math.sqrt(sum(v**2 for v in q_counts.values()))
    norm_d = math.sqrt(sum(v**2 for v in d_counts.values()))

    if norm_q == 0 or norm_d == 0:
        return 0.0

    return min(1.0, dot / (norm_q * norm_d))

def extract_keywords_for_search(text: str) -> str:
    """Extract significant keywords for search engines to prevent long-sentence timeouts."""
    stopwords = {"the", "and", "that", "this", "with", "from", "was", "were", "been", "for", "which", "are", "process", "first"}
    words = [w for w in re.sub(r'[^a-zA-Z0-9\s]', ' ', text).split() if w.lower() not in stopwords and len(w) > 2]
    return " ".join(words[:6]) if words else text[:50]

def fetch_wikipedia_passages(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    """Retrieve top Wikipedia article snippets using Wikipedia API."""
    passages = []
    search_terms = extract_keywords_for_search(query)
    if not search_terms:
        return passages

    try:
        # 1. Search Wikipedia for top matching articles
        search_url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": search_terms,
            "format": "json",
            "srlimit": max_results
        }
        headers = {"User-Agent": "MeiporulFactChecker/1.0 (contact@meiporul.ai)"}
        
        with httpx.Client(timeout=3.5) as client:
            resp = client.get(search_url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                search_hits = data.get("query", {}).get("search", [])
                
                for hit in search_hits:
                    title = hit.get("title", "")
                    # Strip html tags from snippet
                    snippet = re.sub(r'<[^>]+>', '', hit.get("snippet", ""))
                    page_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
                    
                    if snippet and len(snippet) > 20:
                        passages.append({
                            "text": f"{title}: {snippet}",
                            "source": f"Wikipedia: {title} ({page_url})",
                            "source_type": "wikipedia"
                        })
    except Exception as e:
        logger.warning(f"Wikipedia API retrieval error for query '{query}': {e}")

    return passages

def fetch_tavily_passages(query: str, max_results: int = 2) -> List[Dict[str, Any]]:
    """Retrieve external web passages using Tavily API if API key is provided."""
    passages = []
    api_key = settings.TAVILY_API_KEY
    if not api_key:
        return passages

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": max_results,
                    "include_answer": False
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                for result in data.get("results", []):
                    content = result.get("content", "")
                    url = result.get("url", "")
                    title = result.get("title", "Web Source")
                    if content:
                        passages.append({
                            "text": content[:400],
                            "source": f"{title} ({url})",
                            "source_type": "tavily"
                        })
    except Exception as e:
        logger.warning(f"Tavily API search error for '{query}': {e}")

    return passages

def retrieve_evidence(claim_text: str, is_numeric: bool = False) -> List[Dict[str, Any]]:
    """
    Multi-source retrieval for a claim.
    Returns ranked passages with cosine similarity scores, capping at 1-2 passages per source.
    """
    norm_key = normalize_text(claim_text)
    if norm_key in _RETRIEVAL_CACHE:
        return _RETRIEVAL_CACHE[norm_key]

    raw_passages: List[Dict[str, Any]] = []

    # If numeric or time-sensitive, prioritize Tavily first if key is present
    if is_numeric and settings.TAVILY_API_KEY:
        raw_passages.extend(fetch_tavily_passages(claim_text, max_results=2))
        raw_passages.extend(fetch_wikipedia_passages(claim_text, max_results=2))
    else:
        # General encyclopedic: Wikipedia first + Tavily supplemental
        raw_passages.extend(fetch_wikipedia_passages(claim_text, max_results=3))
        if settings.TAVILY_API_KEY:
            raw_passages.extend(fetch_tavily_passages(claim_text, max_results=2))

    if not raw_passages:
        # Fallback query with keywords only
        keywords = " ".join([w for w in claim_text.split() if len(w) > 3][:6])
        raw_passages.extend(fetch_wikipedia_passages(keywords, max_results=2))

    # Score and rank passages by similarity to claim
    scored_passages = []
    source_counts: Dict[str, int] = {}

    for p in raw_passages:
        src_type = p.get("source_type", "unknown")
        # Cap at MAX_PASSAGES_PER_SOURCE to avoid correlated duplicates
        if source_counts.get(src_type, 0) >= settings.MAX_PASSAGES_PER_SOURCE:
            continue
            
        score = compute_lexical_similarity(claim_text, p["text"])
        scored_passages.append({
            "text": p["text"],
            "source": p["source"],
            "source_type": src_type,
            "similarity_score": round(score, 3)
        })
        source_counts[src_type] = source_counts.get(src_type, 0) + 1

    # Sort descending by similarity
    scored_passages.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_passages = scored_passages[:settings.TOP_K_PASSAGES]

    _RETRIEVAL_CACHE[norm_key] = top_passages
    return top_passages
