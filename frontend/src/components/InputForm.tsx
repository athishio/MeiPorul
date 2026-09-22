import React, { useState, useEffect } from 'react';
import { Terminal, Send, Sparkles, RefreshCw, Cpu } from 'lucide-react';

interface InputFormProps {
  onSubmit: (answer: string, question?: string) => void;
  onLoadDemo: () => void;
  isLoading: boolean;
}

const PRESET_EXAMPLES = [
  {
    tag: "PRESET_DNA_1953",
    label: "DNA Discovery (Watson, Crick & Franklin)",
    question: "Tell me about the discovery and structure of DNA, including key contributors and dates.",
    answer: "The double helix structure of DNA was discovered in 1953 by James Watson and Francis Crick. Rosalind Franklin's Photo 51 was critical in determining the helical structure, though she was awarded the Nobel Prize in 1962 alongside them. The human genome contains approximately 3.2 billion base pairs."
  },
  {
    tag: "PRESET_APOLLO_11",
    label: "Apollo 11 Lunar Mission",
    question: "When did Apollo 11 land on the moon?",
    answer: "Apollo 11 landed on the Moon on July 20, 1969. Neil Armstrong and Buzz Aldrin explored the lunar surface. Apollo 11 was launched aboard a Saturn I rocket."
  },
  {
    tag: "PRESET_TELEPHONE_1876",
    label: "Invention of the Telephone",
    question: "Who invented the telephone?",
    answer: "Alexander Graham Bell was awarded the first US patent for the telephone in 1876. Thomas Edison invented the telephone in 1910."
  }
];

const BOOT_SEQUENCE_STEPS = [
  "> [SYS.INIT] Establishing signal integrity pipeline probe...",
  "> [PARSE] Extracting atomic factual claims from input stream...",
  "> [FETCH] Retrieving cross-source evidence signals (Wikipedia / NCBI / Govt Docs)...",
  "> [NLI.ARBITRATE] Verifying signal entailment vs contradiction...",
  "> [REWRITE] Synthesizing grounded self-correction for contradicted claims...",
  "> [VERIFY.DONE] Signal audit finalized. Compiling diagnostic readout... ▋"
];

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, onLoadDemo, isLoading }) => {
  const [answer, setAnswer] = useState(PRESET_EXAMPLES[0].answer);
  const [question, setQuestion] = useState(PRESET_EXAMPLES[0].question);
  const [bootStepIndex, setBootStepIndex] = useState(0);

  // Orchestrate terminal boot sequence when isLoading is true
  useEffect(() => {
    if (!isLoading) {
      setBootStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setBootStepIndex((prev) => {
        if (prev < BOOT_SEQUENCE_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isLoading) return;
    onSubmit(answer.trim(), question.trim() || undefined);
  };

  const handleSelectPreset = (preset: typeof PRESET_EXAMPLES[0]) => {
    setQuestion(preset.question);
    setAnswer(preset.answer);
  };

  return (
    <div className="bg-[#201c19] border border-[rgba(255,255,255,0.1)] p-6 space-y-4">
      {/* Terminal Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#ed670f]" />
          <h2 className="text-[18px] font-bold text-white font-display uppercase tracking-tight">
            SIGNAL INPUT BUFFER // VERIFY_ANSWER()
          </h2>
        </div>

        <button
          type="button"
          onClick={onLoadDemo}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium text-[#ed670f] bg-[#16120f] border border-[rgba(255,255,255,0.15)] hover:border-[#ed670f] hover-chromatic transition-colors self-start sm:self-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#ed670f]" />
          <span>LOAD_CACHED_DEMO_SIGNAL</span>
        </button>
      </div>

      {/* Preset Command Switches */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-[#9f9b92] uppercase tracking-wider">
          INPUT_PRESETS:
        </span>
        {PRESET_EXAMPLES.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className="text-xs font-mono px-2.5 py-1 bg-[#292623] hover:bg-[#16120f] text-[#cecdc9] hover:text-white border border-[rgba(255,255,255,0.1)] hover:border-[#ed670f] hover-chromatic transition-colors"
          >
            [{preset.tag}]
          </button>
        ))}
      </div>

      {/* Main Terminal Form */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Optional Prompt Field */}
        <div>
          <label className="block text-xs font-mono text-[#9f9b92] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="text-[#ed670f]">&gt;</span> PROMPT / QUERY STREAM (OPTIONAL)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 font-mono text-sm text-[#ed670f] select-none">&gt;</span>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              placeholder="e.g. Tell me about the discovery and structure of DNA..."
              className="w-full pl-8 pr-3 py-2 bg-[#16120f] border border-[rgba(255,255,255,0.1)] focus:border-[#ed670f] text-sm font-mono text-[#fff] placeholder-[#9f9b92]/60 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* AI Draft Answer Buffer */}
        <div>
          <label className="block text-xs font-mono text-[#9f9b92] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="text-[#ed670f]">&gt;</span> AI DRAFT ANSWER PAYLOAD
              <span className="text-[#ff4d4d]">*</span>
            </span>
            <span className="text-xs text-[#9f9b92] font-mono lowercase">
              chars: {answer.length}
            </span>
          </label>
          <div className="relative">
            <textarea
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isLoading}
              required
              placeholder="Paste draft AI text to decompose into atomic factual claims and verify against live evidence..."
              className="w-full px-3.5 py-2.5 bg-[#16120f] border border-[rgba(255,255,255,0.1)] focus:border-[#ed670f] text-[15px] font-body text-[#fff] placeholder-[#9f9b92]/60 focus:outline-none leading-relaxed transition-colors"
            />
          </div>
        </div>

        {/* Terminal Boot Sequence (Loading State) */}
        {isLoading && (
          <div className="p-4 bg-[#16120f] border border-[#ed670f]/40 font-mono text-xs space-y-1.5 transition-all">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-1.5 mb-2 text-[#9f9b92]">
              <span className="flex items-center gap-1.5 text-[#ed670f]">
                <Cpu className="h-3.5 w-3.5 animate-pulse" />
                <span>TERMINAL_BOOT_SEQUENCE // PIPELINE ACTIVE</span>
              </span>
              <span>PHOSPHOR DIAGNOSTIC RUNNING</span>
            </div>
            {BOOT_SEQUENCE_STEPS.slice(0, bootStepIndex + 1).map((step, idx) => (
              <div
                key={idx}
                className={`leading-relaxed ${
                  idx === bootStepIndex ? "text-[#fff]" : "text-[#cecdc9]"
                }`}
              >
                {step}
              </div>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => { setAnswer(""); setQuestion(""); }}
            disabled={isLoading}
            className="text-xs font-mono text-[#9f9b92] hover:text-white flex items-center gap-1 px-2 py-1 hover:bg-[#16120f] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>CLEAR_BUFFER</span>
          </button>

          <button
            type="submit"
            disabled={isLoading || !answer.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[14px] font-medium font-body bg-[#ed670f] hover:bg-[#f4b084] text-[#16120f] active:bg-[#622d08] active:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <span className="font-mono text-xs tracking-wider uppercase">VERIFYING_SIGNAL</span>
                <span className="cursor-block">▋</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="font-mono text-xs tracking-wider uppercase">&gt; RUN_VERIFICATION</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
