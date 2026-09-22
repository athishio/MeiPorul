import { Layers, Search, Cpu, ShieldCheck, FileCheck } from 'lucide-react';

export const PipelineWalkthrough: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'ATOMIC CLAIM EXTRACTION',
      subtitle: 'FActScore Decomposition',
      description: 'Deconstructs complex LLM responses into discrete, testable factual propositions. Every single assertion is isolated to prevent truth bleed.',
      chips: ['EXTRACT: PROPOSITIONS', 'FActScore PROTOCOL'],
      icon: Layers,
    },
    {
      step: '02',
      title: 'CROSS-SOURCE RETRIEVAL',
      subtitle: 'Authoritative Evidence Matching',
      description: 'Queries Wikipedia and authoritative external sources to retrieve exact evidence snippets and source citations for each atomic claim.',
      chips: ['CORPUS: WIKIPEDIA', 'LIVE WEB CRAWL'],
      icon: Search,
    },
    {
      step: '03',
      title: 'DUAL-SIGNAL VERIFICATION',
      subtitle: 'NLI Entailment & LLM Reasoning',
      description: 'Combines LLM structured reasoning (Signal A) with an NLI cross-encoder entailment model (Signal B) to detect contradictions and compute objective confidence.',
      chips: ['SIG_A: GEMINI_REASON', 'SIG_B: DeBERTa_NLI', 'ARB: CALIBRATED'],
      icon: Cpu,
    },
    {
      step: '04',
      title: 'GROUNDED SELF-CORRECTION',
      subtitle: 'Evidence-Grounded Rewrite',
      description: 'Contradicted claims are automatically rewritten using solely grounded facts from the retrieved evidence. The corrected claim is re-verified before output.',
      chips: ['REWRITE: GROUNDED', 'RE-VERIFY: PASS'],
      icon: FileCheck,
    },
  ];

  return (
    <section id="pipeline" className="py-12 border-t border-[rgba(255,255,255,0.08)] bg-[#201c19]/50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[rgba(255,255,255,0.1)] pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#ed670f] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#ed670f]" />
              <span>PIPELINE SPECIFICATION // 4-STAGE DUAL-SIGNAL PIPELINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              How Meiporul Verifies Truth
            </h2>
          </div>
        </div>

        {/* 4 Sequential Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="bg-[#201c19] border border-[rgba(255,255,255,0.1)] hover:border-[#ed670f]/70 transition-colors p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Step Number + Icon */}
                  <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2.5">
                    <span className="font-display text-xl font-bold text-[#ed670f]">
                      {s.step}
                    </span>
                    <div className="p-1.5 bg-[#16120f] border border-[rgba(255,255,255,0.1)] text-[#ed670f]">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-white uppercase tracking-tight">
                      {s.title}
                    </h3>
                    <div className="text-xs font-mono text-[#f4b084] mt-0.5">
                      {s.subtitle}
                    </div>
                  </div>

                  {/* Description: strictly >= 13px */}
                  <p className="text-[14px] font-body text-[#cecdc9] leading-relaxed">
                    {s.description}
                  </p>
                </div>

                {/* Monospace Chips with 10px Pill Radius */}
                <div className="pt-2 flex flex-wrap gap-1.5 border-t border-[rgba(255,255,255,0.06)]">
                  {s.chips.map((chip, cIdx) => (
                    <span
                      key={cIdx}
                      className="px-2 py-0.5 rounded-[10px] bg-[#16120f] border border-[rgba(255,255,255,0.12)] text-[10px] font-mono text-[#9f9b92]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
