import React, { useState } from 'react';
import { Claim, Verdict } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ArrowRight, 
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface ClaimsListProps {
  claims: Claim[];
}

export const ClaimsList: React.FC<ClaimsListProps> = ({ claims }) => {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true, 2: true });

  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case 'Supported':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Supported
          </span>
        );
      case 'Contradicted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="h-3.5 w-3.5" />
            Contradicted
          </span>
        );
      case 'Not Enough Info':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <HelpCircle className="h-3.5 w-3.5" />
            Not Enough Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          Atomic Claims & Evidence Audit ({claims.length})
        </h3>
        <span className="text-xs text-slate-400">
          Click any card to expand or collapse evidence
        </span>
      </div>

      <div className="space-y-3">
        {claims.map((claim, index) => {
          const isExpanded = !!expandedIndices[index];
          const hasRewrite = Boolean(claim.rewritten_claim);

          return (
            <div
              key={index}
              className={`rounded-xl border transition-all duration-200 ${
                claim.verdict === 'Contradicted'
                  ? 'bg-rose-950/10 border-rose-900/40 hover:border-rose-700/60'
                  : claim.verdict === 'Supported'
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  : 'bg-amber-950/10 border-amber-900/40 hover:border-amber-700/60'
              }`}
            >
              {/* Header / Claim Summary */}
              <div 
                onClick={() => toggleExpand(index)}
                className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {getVerdictBadge(claim.verdict)}
                    <span className="text-xs font-medium text-slate-400">
                      Confidence: <strong className="text-slate-200">{(claim.confidence * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 leading-snug">
                    {claim.claim_text}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    type="button"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Prominent Self-Correction Loop Box (Do NOT bury it!) */}
              {hasRewrite && (
                <div className="mx-4 mb-4 p-3.5 bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-emerald-950/30 border border-emerald-500/30 rounded-lg shadow-inner">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>Meiporul Self-Correcting Loop (Grounded Rewrite)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-rose-950/30 border border-rose-900/50 rounded text-rose-300">
                      <span className="block font-semibold text-rose-400 mb-1">Original Flagged Claim:</span>
                      <del className="opacity-80">{claim.claim_text}</del>
                    </div>
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/60 rounded text-emerald-200 flex flex-col justify-between">
                      <div>
                        <span className="block font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          Corrected Claim (Evidence-Grounded & Re-Verified):
                        </span>
                        <span>{claim.rewritten_claim}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expandable Evidence Snippet */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 mt-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 flex-wrap">
                      <ExternalLink className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      Retrieved Evidence Source:
                      {claim.evidence_source_url ? (
                        <a 
                          href={claim.evidence_source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium inline-flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{claim.evidence_source_name || claim.evidence_source}</span>
                          {claim.evidence_source_domain && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono font-normal">
                              {claim.evidence_source_domain}
                            </span>
                          )}
                        </a>
                      ) : (
                        <span className="text-slate-300 font-medium font-mono">
                          {claim.evidence_source_name || claim.evidence_source}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {claim.evidence_snippet || "No detailed evidence snippet available."}
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
