import { useState } from 'react';
import { X, Copy, Check, Shield, ExternalLink, BookOpen } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface ToolSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPENAI_SCHEMA = {
  "name": "verify_answer",
  "description": "Verifies factual claims in an AI-generated answer against evidence sources, flags unsupported claims, and returns corrected versions. Call this after generating an answer and before showing it to the user.",
  "parameters": {
    "type": "object",
    "properties": {
      "question": {
        "type": "string",
        "description": "The user prompt or question that prompted the answer (optional)."
      },
      "answer": {
        "type": "string",
        "description": "The AI-generated answer containing claims to be verified against external evidence (required)."
      }
    },
    "required": [
      "answer"
    ]
  }
};

const ANTHROPIC_SCHEMA = {
  "name": "verify_answer",
  "description": "Verifies factual claims in an AI-generated answer against evidence sources, flags unsupported claims, and returns corrected versions. Call this after generating an answer and before showing it to the user.",
  "input_schema": {
    "type": "object",
    "properties": {
      "question": {
        "type": "string",
        "description": "The user prompt or question that prompted the answer (optional)."
      },
      "answer": {
        "type": "string",
        "description": "The AI-generated answer containing claims to be verified against external evidence (required)."
      }
    },
    "required": [
      "answer"
    ]
  }
};

const REST_API_SPEC = `### REST API Specification: POST /verify

Endpoint: ${API_BASE_URL}/verify
Method: POST
Content-Type: application/json

#### Request Payload:
{
  "question": "Tell me about the discovery and structure of DNA.",
  "answer": "The double helix was discovered in 1953 by Watson and Crick. Rosalind Franklin was awarded the Nobel Prize in 1962."
}

#### Response Structure (200 OK):
{
  "claims": [
    {
      "claim_text": "The double helix was discovered in 1953 by Watson and Crick.",
      "verdict": "Supported",
      "evidence_source": "Wikipedia: DNA",
      "evidence_snippet": "In 1953, James Watson and Francis Crick suggested what is now accepted as the first correct double-helix model of DNA structure...",
      "confidence": 0.98,
      "rewritten_claim": null
    },
    {
      "claim_text": "Rosalind Franklin was awarded the Nobel Prize in 1962.",
      "verdict": "Contradicted",
      "evidence_source": "The Nobel Prize Official Archives",
      "evidence_snippet": "The Nobel Prize in Physiology or Medicine 1962 was awarded jointly to Crick, Watson and Wilkins. Rosalind Franklin died in 1958 and the Nobel Committee does not award posthumous prizes.",
      "confidence": 0.96,
      "rewritten_claim": "Rosalind Franklin was not awarded the 1962 Nobel Prize because she died in 1958, and the Nobel Prize is not awarded posthumously."
    }
  ],
  "annotated_answer": "The double helix was discovered in 1953 by Watson and Crick [Supported]. Rosalind Franklin was awarded the Nobel Prize in 1962 [Contradicted].",
  "summary": {
    "total_claims": 2,
    "percent_supported": 50.0,
    "percent_contradicted": 50.0,
    "percent_not_enough_info": 0.0,
    "avg_confidence": 0.97
  }
}

#### cURL Example:
curl -X POST "${API_BASE_URL}/verify" \\
  -H "Content-Type: application/json" \\
  -d '{"answer": "Apollo 11 landed on the moon on July 20, 1969."}'`;

const USAGE_CODE = `# Autonomous AI Fact-Verification Tool Integration:
from openai import OpenAI
import httpx
import json

client = OpenAI()

# 1. Register verify_answer tool with LLM
tools = [{"type": "function", "function": meiporul_tool_schema}]

# 2. Agent drafts response & calls verify_answer
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "When was JWST launched?"}],
    tools=tools
)

# 3. Intercept tool call & verify through Meiporul
if response.choices[0].message.tool_calls:
    args = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
    report = httpx.post("${API_BASE_URL}/verify", json=args).json()
    
    # Pass corrected rewrite if any claims were contradicted
    for claim in report["claims"]:
        if claim["verdict"] == "Contradicted":
            print("Self-Correction:", claim["rewritten_claim"])`;

export const ToolSchemaModal: React.FC<ToolSchemaModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'openai' | 'anthropic' | 'api' | 'code'>('openai');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentContent =
    activeTab === 'openai'
      ? JSON.stringify(OPENAI_SCHEMA, null, 2)
      : activeTab === 'anthropic'
      ? JSON.stringify(ANTHROPIC_SCHEMA, null, 2)
      : activeTab === 'api'
      ? REST_API_SPEC
      : USAGE_CODE;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 bg-[#16120f]/85 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-[#201c19] border border-[rgba(255,255,255,0.2)] w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] mt-2">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between bg-[#16120f]">
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-[#201c19] border border-[rgba(255,255,255,0.15)] text-[#ed670f]">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                MEIPORUL DOCUMENTATION // TOOL SCHEMAS & REST API
              </h3>
              <p className="text-xs font-mono text-[#9f9b92]">
                Integration guides for OpenAI, Anthropic, LangChain & Python SDK.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#3ddc84] bg-[#16120f] border border-[#3ddc84]/40 hover:bg-[#3ddc84]/20 transition-colors"
            >
              <span>OPEN SWAGGER UI</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#9f9b92] hover:text-white bg-[#292623] border border-[rgba(255,255,255,0.1)] hover:border-[#ed670f] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 border-b border-[rgba(255,255,255,0.1)] flex flex-wrap items-center justify-between gap-2 bg-[#201c19]">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('openai')}
              className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-all ${
                activeTab === 'openai'
                  ? 'border-[#ed670f] text-white bg-[#16120f]'
                  : 'border-transparent text-[#9f9b92] hover:text-[#cecdc9]'
              }`}
            >
              OPENAI SCHEMA
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('anthropic')}
              className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-all ${
                activeTab === 'anthropic'
                  ? 'border-[#ed670f] text-white bg-[#16120f]'
                  : 'border-transparent text-[#9f9b92] hover:text-[#cecdc9]'
              }`}
            >
              ANTHROPIC SCHEMA
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-all ${
                activeTab === 'api'
                  ? 'border-[#ed670f] text-white bg-[#16120f]'
                  : 'border-transparent text-[#9f9b92] hover:text-[#cecdc9]'
              }`}
            >
              REST API (POST /verify)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-all ${
                activeTab === 'code'
                  ? 'border-[#ed670f] text-white bg-[#16120f]'
                  : 'border-transparent text-[#9f9b92] hover:text-[#cecdc9]'
              }`}
            >
              PYTHON SDK EXAMPLE
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="mb-1 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#16120f] hover:bg-[#292623] text-[#cecdc9] hover:text-white border border-[rgba(255,255,255,0.15)] hover:border-[#ed670f] transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#3ddc84]" />
                <span className="text-[#3ddc84]">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>COPY_CODE</span>
              </>
            )}
          </button>
        </div>

        {/* Content Box */}
        <div className="p-4 overflow-y-auto bg-[#16120f] flex-1 font-mono text-xs text-[#cecdc9]">
          <pre className="whitespace-pre-wrap leading-relaxed select-text font-mono">
            {currentContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.1)] bg-[#201c19] flex items-center justify-between text-xs font-mono text-[#9f9b92]">
          <div className="flex items-center gap-2 text-[#cecdc9]">
            <Shield className="h-3.5 w-3.5 text-[#ed670f]" />
            <span>Target Endpoint: <code className="text-[#ed670f]">{API_BASE_URL}</code></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#292623] hover:bg-[#16120f] text-white border border-[rgba(255,255,255,0.1)] hover:border-[#ed670f] transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
