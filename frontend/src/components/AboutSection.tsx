import { Sparkles, Shield, Award } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-16 border-t border-[rgba(255,255,255,0.08)] bg-[#16120f] relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[rgba(255,255,255,0.1)] pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#ed670f] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#ed670f]" />
              <span>PROJECT GENESIS // ANCIENT ETHICS & MODERN AI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-brand font-medium text-white tracking-[-0.02em]">
              About Meiporul
            </h2>
          </div>
          <div className="text-xs font-mono text-[#9f9b92]">
            KURAL 423 // UNIVERSAL TRUTH
          </div>
        </div>

        {/* Story Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: The Name */}
          <div className="p-6 bg-[#201c19] border border-[rgba(255,255,255,0.1)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#ed670f] font-bold uppercase">
              <Sparkles className="h-4 w-4" />
              <span>THE PHILOSOPHICAL SEED</span>
            </div>
            <h3 className="text-base text-white flex items-center gap-2 flex-wrap font-medium">
              <span className="font-tamil font-semibold text-[17px] text-[#ed670f]">மெய்பொருள்</span>
              <span className="font-brand font-semibold tracking-[-0.025em] text-[#f7f6f3]">(MEIPORUL)</span>
            </h3>
            <p className="text-[17px] leading-[27px] font-body text-[#E8E4DD] tracking-[-0.1px]">
              In Tamil, <em>Meiporul</em> signifies the core truth or genuine essence.
              Over 2,000 years ago, Thiruvalluvar wrote in Kural 423: regardless of who utters
              words, discerning the verifiable truth therein is the true mark of wisdom.
            </p>
          </div>

          {/* Card 2: The Problem */}
          <div className="p-6 bg-[#201c19] border border-[rgba(255,255,255,0.1)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#ff4d4d] font-bold uppercase">
              <Shield className="h-4 w-4" />
              <span>THE AI HALLUCINATION CRISIS</span>
            </div>
            <h3 className="font-display font-medium text-base text-white">
              Fluency Without Evidence
            </h3>
            <p className="text-[17px] leading-[27px] font-body text-[#E8E4DD] tracking-[-0.1px]">
              Modern LLMs generate fluent, persuasive answers that routinely fabricate citations,
              dates, and facts. Meiporul was built as an autonomous verification safeguard that
              other AI models call before human delivery.
            </p>
          </div>

          {/* Card 3: The Architecture */}
          <div className="p-6 bg-[#201c19] border border-[rgba(255,255,255,0.1)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#3ddc84] font-bold uppercase">
              <Award className="h-4 w-4" />
              <span>AUTONOMOUS SAFEGUARD</span>
            </div>
            <h3 className="font-display font-medium text-base text-white">
              Decompose, Verify, Rewrite
            </h3>
            <p className="text-[17px] leading-[27px] font-body text-[#E8E4DD] tracking-[-0.1px]">
              By combining FActScore-style atomic decomposition, dual-signal entailment, and
              evidence-grounded rewrites, Meiporul turns unvetted AI generation into audited,
              truth-calibrated knowledge.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
