import { useState } from 'react';
import { BookOpen, Copy, Check, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config';

const OPENAI_SCHEMA = {
  name: "verify_answer",
  description: "Verifies factual claims in an AI draft answer against live evidence sources, flags unsupported statements, and returns grounded corrections before display.",
  parameters: {
    type: "object",
    properties: {
      question: { type: "string", description: "The original prompt or question (optional)." },
      answer: { type: "string", description: "The AI-generated draft text to verify (required)." }
    },
    required: ["answer"]
  }
};

const PYTHON_SNIPPET = `# Call Meiporul from Python / LangChain / OpenAI:
import httpx

def verify_response(answer: str, question: str = ""):
    resp = httpx.post("${API_BASE_URL}/verify", json={"question": question, "answer": answer})
    data = resp.json()
    
    # If any claims are contradicted, retrieve grounded rewrite
    for claim in data.get("claims", []):
        if claim["verdict"] == "Contradicted":
            print("Flagged:", claim["claim_text"])
            print("Grounded Fix:", claim["rewritten_claim"])
    return data`;

export const DocsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api' | 'schema' | 'python'>('api');
  const [copied, setCopied] = useState(false);

  const getCopyContent = () => {
    if (activeTab === 'api') {
      return `curl -X POST "${API_BASE_URL}/verify" \\\n  -H "Content-Type: application/json" \\\n  -d '{"answer": "Apollo 11 landed on the moon on July 20, 1969."}'`;
    }
    if (activeTab === 'schema') {
      return JSON.stringify(OPENAI_SCHEMA, null, 2);
    }
    return PYTHON_SNIPPET;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCopyContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="docs" className="py-12 border-t border-[rgba(255,255,255,0.08)] bg-[#201c19]/60">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.1)] pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[#ed670f] uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-[#ed670f]" />
              <span>DEVELOPER DOCUMENTATION // API & TOOL SPECIFICATION</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Integration Docs
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-[#3ddc84] bg-[#16120f] border border-[#3ddc84]/40 hover:bg-[#3ddc84]/20 transition-colors"
            >
              <span>FASTAPI SWAGGER UI</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Tab Buttons + Copy Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.08)] pb-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-all ${
                activeTab === 'api'
                  ? 'border-[#ed670f] text-white bg-[#16120f]'
                  : 'border-transparent text-[#9f9b92] hover:text-white'
              }`}
            >
              REST API (POST /verify)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schema')}
              className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-all ${
                activeTab === 'schema'
                  ? 'border-[#ed670f] text-white bg-[#16120f]'
                  : 'border-transparent text-[#9f9b92] hover:text-white'
              }`}
            >
              TOOL SCHEMA (FUNCTION CALLING)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-all ${
                activeTab === 'python'
                  ? 'border-[#ed670f] text-white bg-[#16120f]'
                  : 'border-transparent text-[#9f9b92] hover:text-white'
              }`}
            >
              PYTHON SDK SNIPPET
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#16120f] hover:bg-[#292623] text-[#cecdc9] hover:text-white border border-[rgba(255,255,255,0.15)] hover:border-[#ed670f] transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#3ddc84]" />
                <span className="text-[#3ddc84]">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>COPY CODE</span>
              </>
            )}
          </button>
        </div>

        {/* Tab 1: REST API */}
        {activeTab === 'api' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 p-4 bg-[#16120f] border border-[rgba(255,255,255,0.1)] space-y-3 font-mono text-xs">
              <div className="text-white font-bold uppercase border-b border-[rgba(255,255,255,0.08)] pb-1.5 flex items-center justify-between">
                <span>POST /verify</span>
                <span className="text-[#3ddc84]">HTTP 200</span>
              </div>
              <div className="space-y-1 text-[#cecdc9]">
                <div><span className="text-[#9f9b92]">Endpoint:</span> <code className="text-[#ed670f]">{API_BASE_URL}/verify</code></div>
                <div><span className="text-[#9f9b92]">Content-Type:</span> application/json</div>
                <div><span className="text-[#9f9b92]">Auth:</span> Optional API key / public daemon</div>
              </div>
              <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] space-y-1">
                <span className="text-[#9f9b92] block font-bold">Request Payload:</span>
                <pre className="text-[#cecdc9] bg-[#201c19] p-2 overflow-x-auto text-[11px] leading-relaxed">
{`{
  "question": "When did Apollo 11 land on the moon?",
  "answer": "Apollo 11 landed on the Moon on July 20, 1969."
}`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-7 p-4 bg-[#16120f] border border-[rgba(255,255,255,0.1)] space-y-2 font-mono text-xs">
              <span className="text-[#9f9b92] block font-bold">cURL Command:</span>
              <pre className="text-[#cecdc9] bg-[#201c19] p-3 overflow-x-auto text-[11px] leading-relaxed select-all">
{`curl -X POST "${API_BASE_URL}/verify" \\
  -H "Content-Type: application/json" \\
  -d '{"answer": "Apollo 11 landed on the moon on July 20, 1969."}'`}
              </pre>
              <div className="pt-2 text-[11px] text-[#9f9b92]">
                Returns extracted claims, dual-signal entailment verdict (<span className="text-[#3ddc84]">Supported</span> / <span className="text-[#ff4d4d]">Contradicted</span> / <span className="text-[#9f9b92]">Not Enough Info</span>), evidence snippets, and grounded rewrites.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Function Calling Schema */}
        {activeTab === 'schema' && (
          <div className="p-4 bg-[#16120f] border border-[rgba(255,255,255,0.1)] font-mono text-xs">
            <div className="flex items-center justify-between text-[#9f9b92] mb-2 text-[11px]">
              <span>OPENAI & ANTHROPIC TOOL SPECIFICATION</span>
              <span>FUNCTION: verify_answer</span>
            </div>
            <pre className="text-[#cecdc9] bg-[#201c19] p-3 overflow-x-auto text-[11px] leading-relaxed select-all">
              {JSON.stringify(OPENAI_SCHEMA, null, 2)}
            </pre>
          </div>
        )}

        {/* Tab 3: Python Snippet */}
        {activeTab === 'python' && (
          <div className="p-4 bg-[#16120f] border border-[rgba(255,255,255,0.1)] font-mono text-xs">
            <div className="flex items-center justify-between text-[#9f9b92] mb-2 text-[11px]">
              <span>PYTHON AGENT INTERCEPTION HOOK</span>
              <span>LIBRARY: httpx</span>
            </div>
            <pre className="text-[#cecdc9] bg-[#201c19] p-3 overflow-x-auto text-[11px] leading-relaxed select-all">
              {PYTHON_SNIPPET}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
};
