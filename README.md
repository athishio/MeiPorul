# Meiporul (மெய்ப்பொருள்)

> *"A fact-verification tool other LLMs can call before answering — it checks every claim against evidence, flags what's wrong, and rewrites it before the user ever sees it."*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)

---

## 🏛️ What is Meiporul?

In Tamil philosophy, **மெய்ப்பொருள் (Meiporul)** means *"the ultimate truth / true substance"* (from the classic Tirukkural: *"Whosoever says whatever, to discern the truth therein is wisdom"*).

**Meiporul** is an autonomous post-hoc fact-checking and self-correcting tool designed to sit between LLM generation and human delivery. Instead of interrupting generation or hallucinating unchecked, downstream agents pass draft answers to Meiporul, which:
1. Decomposes statements into atomic verifiable claims (FActScore-style).
2. Retrieves authoritative evidence across Wikipedia and Tavily.
3. Performs dual-signal verification (Gemini 3.5 structured reasoning + local NLI cross-encoder model + exact numerical extraction).
4. Derives objective confidence scores (never LLM self-reported).
5. Groundedly rewrites false or contradicted claims and re-verifies the fix before final output.

---

## 📁 Repository Structure

```text
Meiporul/
├── README.md                          # Project overview, pitch, and quickstart
├── tool/                              # Function calling & tool-use schemas
│   ├── meiporul_tool_schema_openai.json     # OpenAI tool specification
│   ├── meiporul_tool_schema_anthropic.json  # Anthropic tool specification
│   └── README.md                            # Integration guide & SDK examples
├── demo/                              # Offline-ready demo fixtures
│   └── demo_response.json             # Realistic verification report with rewrites
├── backend/                           # FastAPI backend & verification engine
│   ├── requirements.txt               # Backend dependencies
│   ├── app/
│   │   ├── main.py                    # FastAPI server entrypoint
│   │   ├── config.py                  # Environment & API configurations
│   │   ├── models.py                  # Pydantic request/response schemas
│   │   └── pipeline/                  # Verification stages 1-6
│   │       ├── extraction.py          # Stage 1: Atomic claim extraction
│   │       ├── retrieval.py           # Stage 2: Dual Wikipedia/Tavily retrieval & ranking
│   │       ├── verification.py        # Stage 3: Dual-signal LLM + NLI DeBERTa verification
│   │       ├── rewrite.py             # Stage 4 & 5: Evidence-grounded rewrite & re-verify
│   │       ├── annotator.py           # Stage 6: Span annotation & summary metrics
│   │       └── engine.py              # End-to-end pipeline orchestrator
│   └── eval/                          # FActScore-style evaluation harness
│       ├── test_data.json
│       └── run_eval.py
└── frontend/                          # React + Tailwind CSS dashboard
    ├── src/
    │   ├── App.tsx                    # Main interactive dashboard
    │   ├── config.ts                  # Single configuration for API base URL
    │   └── components/                # Interactive results view, self-correction cards
```

---

## ⚡ Quickstart

### 1. Tool Integration (For LLMs / Agents)
See [`tool/README.md`](tool/README.md) for full OpenAI and Anthropic SDK integration snippets.

### 2. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env   # Add GEMINI_API_KEY and optional TAVILY_API_KEY
uvicorn app.main:app --reload --port 8000
```
Swagger API docs available at `http://localhost:8000/docs`.

### 3. Frontend Dashboard Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to explore the live dashboard or click **"Load Demo Example"** for instant cached demo presentation.
