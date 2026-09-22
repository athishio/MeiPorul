# Meiporul (மெய்பொருள்) — Tool Interface

> **"A fact-verification tool other LLMs can call before answering — it checks every claim against evidence, flags what's wrong, and rewrites it before the user ever sees it."**

Meiporul is designed as a **post-hoc verification tool** that downstream agent frameworks or LLMs invoke immediately after draft generation and prior to user delivery.

---

## 1. Tool Definition

### Tool Name
`verify_answer`

### Description
> Verifies factual claims in an AI-generated answer against evidence sources, flags unsupported claims, and returns corrected versions. Call this after generating an answer and before showing it to the user.

### Parameters
| Field | Type | Required | Description |
|---|---|---|---|
| `question` | `string` | Optional | The original user prompt or question that prompted the answer. |
| `answer` | `string` | **Required** | The AI-generated draft answer containing claims to be verified. |

---

## 2. Integration Snippets

### Python — OpenAI Function Calling
```python
import json
import httpx
from openai import OpenAI

client = OpenAI()

# 1. Define or load tool schema
with open("tool/meiporul_tool_schema_openai.json") as f:
    verify_tool_schema = json.load(f)

tools = [{"type": "function", "function": verify_tool_schema}]

# 2. Agent generates draft response with tool access
messages = [
    {"role": "system", "content": "You are a factual research assistant. Always verify your draft claims using verify_answer before presenting the final response."},
    {"role": "user", "content": "When was the James Webb Space Telescope launched and what rocket carried it?"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto",
)

# 3. Handle tool invocation
tool_calls = response.choices[0].message.tool_calls
if tool_calls:
    for tool_call in tool_calls:
        if tool_call.function.name == "verify_answer":
            args = json.loads(tool_call.function.arguments)
            
            # Call Meiporul /verify endpoint
            res = httpx.post("http://localhost:8000/verify", json=args, timeout=30.0)
            verification_result = res.json()
            
            print(f"Verified {verification_result['summary']['total_claims']} claims:")
            print(f"Supported: {verification_result['summary']['percent_supported']}%")
            
            # If any claims were contradicted, present rewritten claims
            for claim in verification_result["claims"]:
                if claim["verdict"] == "Contradicted":
                    print(f"[REWRITE] {claim['claim_text']} -> {claim['rewritten_claim']}")
```

### Python — Anthropic Claude Tool Use
```python
import json
import httpx
import anthropic

client = anthropic.Anthropic()

with open("tool/meiporul_tool_schema_anthropic.json") as f:
    tool_def = json.load(f)

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[tool_def],
    messages=[
        {"role": "user", "content": "Draft an answer about Alan Turing's birthplace and verify it using verify_answer."}
    ]
)

for block in response.content:
    if block.type == "tool_use" and block.name == "verify_answer":
        res = httpx.post("http://localhost:8000/verify", json=block.input, timeout=30.0)
        report = res.json()
        print("Verification Report:", json.dumps(report, indent=2))
```

---

## 3. Output Schema Contract

```json
{
  "claims": [
    {
      "claim_text": "The James Webb Space Telescope was launched on December 25, 2021.",
      "verdict": "Supported",
      "evidence_source": "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope",
      "evidence_snippet": "JWST was launched on 25 December 2021 on an Ariane 5 rocket from Kourou, French Guiana.",
      "confidence": 0.96,
      "rewritten_claim": null
    },
    {
      "claim_text": "It was launched aboard a Falcon Heavy rocket.",
      "verdict": "Contradicted",
      "evidence_source": "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope",
      "evidence_snippet": "JWST was launched on 25 December 2021 on an Ariane 5 rocket from Kourou, French Guiana.",
      "confidence": 0.94,
      "rewritten_claim": "It was launched aboard an Ariane 5 rocket from Kourou, French Guiana."
    }
  ],
  "annotated_answer": "The James Webb Space Telescope was launched on December 25, 2021 [Supported]. It was launched aboard a Falcon Heavy rocket [Contradicted].",
  "summary": {
    "total_claims": 2,
    "percent_supported": 50.0,
    "percent_contradicted": 50.0,
    "percent_not_enough_info": 0.0,
    "avg_confidence": 0.95
  }
}
```
