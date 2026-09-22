import React, { useState } from 'react';
import { X, Copy, Check, Code2, Terminal, ShieldAlert } from 'lucide-react';

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

const USAGE_CODE = `# Post-Hoc LLM Tool Call Integration:
from openai import OpenAI
import httpx

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
    report = httpx.post("http://localhost:8000/verify", json=args).json()
    
    # Pass corrected rewrite if any claims were contradicted
    for claim in report["claims"]:
        if claim["verdict"] == "Contradicted":
            print("Self-Correction:", claim["rewritten_claim"])`;

export const ToolSchemaModal: React.FC<ToolSchemaModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'openai' | 'anthropic' | 'code'>('openai');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentContent = 
    activeTab === 'openai' 
      ? JSON.stringify(OPENAI_SCHEMA, null, 2)
      : activeTab === 'anthropic'
      ? JSON.stringify(ANTHROPIC_SCHEMA, null, 2)
      : USAGE_CODE;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Meiporul Tool Interface Schema (verify_answer)
              </h3>
              <p className="text-xs text-slate-400">
                Function-calling schema ready for OpenAI, Anthropic Claude, and LangChain agents.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('openai')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'openai'
                  ? 'border-emerald-400 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              OpenAI Function Calling
            </button>
            <button
              onClick={() => setActiveTab('anthropic')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'anthropic'
                  ? 'border-emerald-400 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Anthropic Tool Use
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'code'
                  ? 'border-emerald-400 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <Terminal className="h-3 w-3" />
                Python SDK Integration
              </span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Content Box */}
        <div className="p-5 overflow-y-auto bg-slate-950 flex-1 font-mono text-xs text-slate-300">
          <pre className="whitespace-pre-wrap leading-relaxed">
            {currentContent}
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-400/90">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Positioning: Post-hoc verification tool called before final user display.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
