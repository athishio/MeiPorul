import React, { useState, useEffect } from 'react';
import { Claim, Verdict } from '../types';
import { getClaimSourceInfo } from '../utils/sourceHelper';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  FileCode,
  Link2,
  Quote,
  Globe
} from 'lucide-react';

interface ClaimsListProps {
  claims: Claim[];
  selectedClaimIndex: number | null;
  onSelectClaim: (index: number) => void;
}

export const ClaimsList: React.FC<ClaimsListProps> = ({
  claims,
  selectedClaimIndex,
  onSelectClaim,
}) => {
  // Track expanded indices: expand first and contradicted claims by default
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  // Auto-expand and scroll selected claim into view
  useEffect(() => {
    if (selectedClaimIndex !== null) {
      setExpandedIndices((prev) => ({ ...prev, [selectedClaimIndex]: true }));
      const cardElement = document.getElementById(`claim-card-${selectedClaimIndex}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedClaimIndex]);

  const toggleExpand = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  /**
   * Verdict badge is the strictly defined 10px-radius pill element
   */
  const getVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case 'Supported':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-xs font-mono font-medium bg-[#16120f] text-[#3ddc84] border border-[#3ddc84]/40">
            <CheckCircle2 className="h-3 w-3 text-[#3ddc84]" />
            <span>SUPPORTED</span>
          </span>
        );
      case 'Contradicted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-xs font-mono font-medium bg-[#16120f] text-[#ff4d4d] border border-[#ff4d4d]/40">
            <XCircle className="h-3 w-3 text-[#ff4d4d]" />
            <span>CONTRADICTED</span>
          </span>
        );
      case 'Not Enough Info':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-xs font-mono font-medium bg-[#16120f] text-[#9f9b92] border border-[#9f9b92]/40">
            <HelpCircle className="h-3 w-3 text-[#9f9b92]" />
            <span>NO SIGNAL (NEI)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#201c19] border border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#ed670f]" />
          <h2 className="text-[18px] font-bold text-white font-display uppercase tracking-tight">
            ATOMIC CLAIMS & SIGNAL AUDIT ({claims.length})
          </h2>
        </div>
        <span className="text-xs font-mono text-[#9f9b92]">
          CLICK CARD TO FOCUS SIGNAL LOCK & EXPAND EVIDENCE
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {claims.map((claim, index) => {
          const isSelected = selectedClaimIndex === index;
          const isExpanded = !!expandedIndices[index] || isSelected;
          const hasRewrite = Boolean(claim.rewritten_claim);
          const sourceInfo = getClaimSourceInfo(claim);

          return (
            <div
              key={index}
              id={`claim-card-${index}`}
              onClick={() => onSelectClaim(index)}
              className={`bg-[#292623] transition-all duration-150 border cursor-pointer ${
                isSelected
                  ? 'border-[#ed670f] bg-[#292623] shadow-none'
                  : 'border-[rgba(255,255,255,0.1)] hover:border-[#ed670f]/70'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  {/* Metadata Row: Badge, Index, Confidence, Signal chips */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono text-[#ed670f] font-bold">
                      #{index + 1}
                    </span>

                    {getVerdictBadge(claim.verdict)}

                    <span className="text-xs font-mono text-[#cecdc9]">
                      CONFIDENCE: <strong className="text-white">{(claim.confidence * 100).toFixed(0)}%</strong>
                    </span>

                    {/* Optional Signal A / Signal B / Arbitration mode pills */}
                    {claim.signal_a && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[10px] text-xs font-mono bg-[#16120f] border border-[rgba(255,255,255,0.15)] text-[#cecdc9]">
                        <Cpu className="h-3 w-3 text-[#ed670f]" />
                        <span>SIG_A: {typeof claim.signal_a === 'object' ? (claim.signal_a.label || claim.signal_a.status) : claim.signal_a}</span>
                      </span>
                    )}

                    {claim.signal_b && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[10px] text-xs font-mono bg-[#16120f] border border-[rgba(255,255,255,0.15)] text-[#cecdc9]">
                        <Cpu className="h-3 w-3 text-[#3ddc84]" />
                        <span>SIG_B: {typeof claim.signal_b === 'object' ? (claim.signal_b.label || claim.signal_b.status) : claim.signal_b}</span>
                      </span>
                    )}

                    {claim.arbitration_mode && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[10px] text-xs font-mono bg-[#16120f] border border-[#ed670f]/40 text-[#ed670f]">
                        <FileCode className="h-3 w-3" />
                        <span>ARB: {claim.arbitration_mode}</span>
                      </span>
                    )}
                  </div>

                  {/* Claim Text: strictly >= 13px (15px font-body) */}
                  <p className="text-[15px] font-body text-white leading-relaxed pt-0.5">
                    {claim.claim_text}
                  </p>
                </div>

                {/* Expand / Collapse Button */}
                <button
                  type="button"
                  onClick={(e) => toggleExpand(index, e)}
                  className="p-1 text-[#9f9b92] hover:text-white bg-[#16120f] border border-[rgba(255,255,255,0.1)] hover:border-[#ed670f] transition-colors self-end sm:self-auto shrink-0"
                  title={isExpanded ? 'Collapse' : 'Expand evidence'}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Self-Correction Loop Panel (for Contradicted Claims) */}
              {hasRewrite && (
                <div className="mx-4 mb-4 p-3.5 bg-[#16120f] border border-[#ff4d4d]/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#ff4d4d] font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-[#ff4d4d]" />
                    <span>MEIPORUL SELF-CORRECTION PROTOCOL // RE-GROUNDED REWRITE</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-[#201c19] border border-[#ff4d4d]/30 text-[#ff4d4d]">
                      <span className="block font-bold text-[#ff4d4d] mb-1 uppercase">
                        [ORIGINAL FLAGGED CLAIM]
                      </span>
                      <del className="text-[#cecdc9] leading-relaxed block text-[13px]">
                        {claim.claim_text}
                      </del>
                    </div>

                    <div className="p-3 bg-[#201c19] border border-[#3ddc84]/40 text-[#3ddc84]">
                      <span className="block font-bold text-[#3ddc84] mb-1 uppercase flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        [GROUNDED SELF-CORRECTION]
                      </span>
                      <p className="text-white leading-relaxed text-[13px] font-body">
                        {claim.rewritten_claim}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expandable Evidence Snippet & Verifiable Citation */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-3 border-t border-[rgba(255,255,255,0.08)] bg-[#201c19] space-y-2.5">
                  {/* Evidence Citation Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.06)] pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-[#9f9b92] uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-[#ed670f]" />
                        <span>EVIDENCE SOURCE:</span>
                      </span>

                      {sourceInfo.url ? (
                        <a
                          href={sourceInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-[#16120f] border border-[#ed670f]/60 hover:border-[#ed670f] text-[#ed670f] hover:text-white font-mono text-xs font-semibold hover-chromatic transition-all group"
                          title={`Open verifiable source in new tab: ${sourceInfo.url}`}
                        >
                          <Link2 className="h-3 w-3 text-[#ed670f] group-hover:text-white transition-colors" />
                          <span>{sourceInfo.name}</span>
                          <ExternalLink className="h-3 w-3 text-[#ed670f] group-hover:text-white transition-colors" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-[#16120f] border border-[rgba(255,255,255,0.15)] text-[#cecdc9] font-mono text-xs font-semibold">
                          <span>{sourceInfo.name}</span>
                        </span>
                      )}

                      {sourceInfo.domain && (
                        <span className="text-[11px] font-mono text-[#9f9b92] bg-[#16120f] px-2 py-0.5 rounded-[10px] border border-[rgba(255,255,255,0.08)]">
                          {sourceInfo.domain}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-[#9f9b92]">
                      [CITED PASSAGE EXCERPT]
                    </div>
                  </div>

                  {/* Quoted Excerpt Block */}
                  <div className="p-3 bg-[#16120f] border-l-2 border-[#ed670f] border-t border-r border-b border-[rgba(255,255,255,0.1)] font-mono text-[13px] text-[#cecdc9] leading-relaxed relative selection:bg-[#ed670f]/30">
                    <div className="flex items-start gap-2.5">
                      <Quote className="h-4 w-4 text-[#ed670f] shrink-0 mt-0.5 opacity-70" />
                      <blockquote className="italic text-[#cecdc9]">
                        "{claim.evidence_snippet || 'No corroborating evidence passage recorded.'}"
                      </blockquote>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
