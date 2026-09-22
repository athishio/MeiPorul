import React from 'react';
import { Claim, Verdict } from '../types';
import { getClaimSourceInfo } from '../utils/sourceHelper';
import { Terminal, Crosshair, Globe } from 'lucide-react';

interface AnnotatedAnswerProps {
  annotatedText: string;
  claims: Claim[];
  selectedClaimIndex: number | null;
  onSelectClaim: (index: number) => void;
}

export const AnnotatedAnswer: React.FC<AnnotatedAnswerProps> = ({
  annotatedText,
  claims,
  selectedClaimIndex,
  onSelectClaim,
}) => {
  /**
   * Helper to get verdict color hex and border class
   */
  const getVerdictStyle = (verdict?: Verdict) => {
    switch (verdict) {
      case 'Supported':
        return {
          borderColor: '#3ddc84',
          underlineClass: 'border-b-2 border-[#3ddc84]',
          label: 'OK // SUPPORTED',
          textColor: 'text-[#3ddc84]',
        };
      case 'Contradicted':
        return {
          borderColor: '#ff4d4d',
          underlineClass: 'border-b-2 border-[#ff4d4d]',
          label: 'FAULT // CONTRADICTED',
          textColor: 'text-[#ff4d4d]',
        };
      case 'Not Enough Info':
      default:
        return {
          borderColor: '#9f9b92',
          underlineClass: 'border-b-2 border-[#9f9b92]',
          label: 'NEI // NO SIGNAL',
          textColor: 'text-[#9f9b92]',
        };
    }
  };

  /**
   * Renders a small evidence source domain indicator pill with colored dot & tooltip
   */
  const renderSourceBadge = (claim?: Claim) => {
    if (!claim) return null;
    const source = getClaimSourceInfo(claim);
    return (
      <span
        className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded-[10px] text-[10px] font-mono bg-[#16120f] border border-[rgba(255,255,255,0.15)] text-[#cecdc9] select-none align-middle hover:border-[#ed670f] transition-colors"
        title={`Evidence Source: ${source.name}${source.domain ? ` (${source.domain})` : ''} • Click to focus claim`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#ed670f] shrink-0" />
        <span className="text-[#9f9b92] text-[10px] hidden sm:inline truncate max-w-[110px]">
          {source.domain || source.name}
        </span>
      </span>
    );
  };

  /**
   * Renders parsed content: handles <c id="N">...</c>, or [Supported] brackets, or claim text matching
   */
  const renderAnnotatedContent = () => {
    if (!annotatedText) return null;

    // 1. Check for XML tag format: <c id="0">Claim text</c>
    if (/<c id="\d+">/.test(annotatedText)) {
      const parts: React.ReactNode[] = [];
      const regex = /<c id="(\d+)">([\s\S]*?)<\/c>/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(annotatedText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}`}>
              {annotatedText.substring(lastIndex, match.index)}
            </span>
          );
        }

        const claimId = parseInt(match[1], 10);
        const claimContent = match[2];
        const claim = claims[claimId];
        const isSelected = selectedClaimIndex === claimId;
        const vStyle = getVerdictStyle(claim?.verdict);

        parts.push(
          <span
            key={`claim-${claimId}-${match.index}`}
            onClick={() => onSelectClaim(claimId)}
            className={`inline cursor-pointer transition-all duration-150 relative ${
              vStyle.underlineClass
            } ${
              isSelected
                ? 'border border-[#ed670f] bg-[#ed670f]/15 signal-lock-sweep text-white px-1'
                : 'hover:border-[#ed670f] hover:bg-[#201c19] text-[#cecdc9]'
            }`}
            title={`Claim #${claimId + 1}: ${claim?.verdict || 'Unknown'} (Click to focus)`}
          >
            {claimContent}
            <sup className="ml-1 text-[10px] font-mono text-[#ed670f] select-none font-bold">
              [{claimId + 1}]
            </sup>
            {renderSourceBadge(claim)}
          </span>
        );

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < annotatedText.length) {
        parts.push(
          <span key={`text-${lastIndex}`}>{annotatedText.substring(lastIndex)}</span>
        );
      }

      return parts;
    }

    // 2. Check for bracket format: Sentence [Supported] or Sentence [Contradicted]
    if (/\[(?:Supported|Contradicted|Not Enough Info)\]/.test(annotatedText)) {
      // Split on bracket tags while preserving them
      const rawParts = annotatedText.split(/(\[(?:Supported|Contradicted|Not Enough Info)\])/g);
      const elements: React.ReactNode[] = [];
      let claimCursor = 0;

      for (let i = 0; i < rawParts.length; i += 2) {
        const textSegment = rawParts[i];
        const tagSegment = rawParts[i + 1]; // e.g. "[Supported]"

        if (tagSegment) {
          const verdictMatch = tagSegment.replace(/[\[\]]/g, '') as Verdict;
          const claimId = claimCursor;
          const isSelected = selectedClaimIndex === claimId;
          const vStyle = getVerdictStyle(verdictMatch);
          const claim = claims[claimId];
          claimCursor++;

          elements.push(
            <span
              key={`claim-${claimId}-${i}`}
              onClick={() => onSelectClaim(claimId)}
              className={`inline cursor-pointer transition-all duration-150 relative ${
                vStyle.underlineClass
              } ${
                isSelected
                  ? 'border border-[#ed670f] bg-[#ed670f]/15 signal-lock-sweep text-white px-1'
                  : 'hover:border-[#ed670f] hover:bg-[#201c19] text-[#cecdc9]'
              }`}
              title={`Claim #${claimId + 1}: ${verdictMatch} (Click to inspect signal)`}
            >
              {textSegment}
              <sup className="ml-1 text-[10px] font-mono text-[#ed670f] select-none font-bold">
                [{claimId + 1}]
              </sup>
              {renderSourceBadge(claim)}
            </span>
          );
        } else if (textSegment) {
          elements.push(<span key={`text-${i}`}>{textSegment}</span>);
        }
      }

      return elements;
    }

    // 3. Fallback: match by claims array
    let remaining = annotatedText;
    const elements: React.ReactNode[] = [];

    claims.forEach((c, idx) => {
      const pos = remaining.indexOf(c.claim_text);
      if (pos !== -1) {
        if (pos > 0) {
          elements.push(<span key={`pre-${idx}`}>{remaining.slice(0, pos)}</span>);
        }
        const isSelected = selectedClaimIndex === idx;
        const vStyle = getVerdictStyle(c.verdict);

        elements.push(
          <span
            key={`claim-${idx}`}
            onClick={() => onSelectClaim(idx)}
            className={`inline cursor-pointer transition-all duration-150 relative ${
              vStyle.underlineClass
            } ${
              isSelected
                ? 'border border-[#ed670f] bg-[#ed670f]/15 signal-lock-sweep text-white px-1'
                : 'hover:border-[#ed670f] hover:bg-[#201c19] text-[#cecdc9]'
            }`}
          >
            {c.claim_text}
            <sup className="ml-1 text-[10px] font-mono text-[#ed670f] select-none font-bold">
              [{idx + 1}]
            </sup>
            {renderSourceBadge(c)}
          </span>
        );
        remaining = remaining.slice(pos + c.claim_text.length);
      }
    });

    if (remaining) {
      elements.push(<span key="tail">{remaining}</span>);
    }

    return elements;
  };

  const selectedClaim = selectedClaimIndex !== null ? claims[selectedClaimIndex] : null;

  return (
    <div className="bg-[#201c19] border border-[rgba(255,255,255,0.1)] p-5 space-y-3">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#ed670f]" />
          <h2 className="text-[18px] font-bold text-white font-display uppercase tracking-tight">
            ANNOTATED ANSWER // GROUNDED SIGNAL VIEW
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[#9f9b92]">
          <span className="flex items-center gap-1.5">
            <Crosshair className="h-3.5 w-3.5 text-[#ed670f]" />
            <span>INTERACTIVE SIGNAL LOCK:</span>
          </span>
          {selectedClaimIndex !== null ? (
            <span className="text-[#ed670f] font-bold">
              CLAIM_ID #{selectedClaimIndex + 1} LOCKED
            </span>
          ) : (
            <span className="text-[#cecdc9]">SELECT ANY CLAIM SPAN</span>
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1.5 text-xs font-mono border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[#9f9b92] uppercase">UNDERLINE CODES:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#3ddc84]"></span>
            <span className="text-[#3ddc84]">SUPPORTED (OK)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#ff4d4d]"></span>
            <span className="text-[#ff4d4d]">CONTRADICTED (FAULT)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#9f9b92]"></span>
            <span className="text-[#9f9b92]">NOT ENOUGH INFO (NEI)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#9f9b92]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ed670f]"></span>
          <span>DOT = EVIDENCE DOMAIN</span>
        </div>
      </div>

      {/* Centerpiece Text View */}
      <div className="p-4 bg-[#16120f] border border-[rgba(255,255,255,0.1)] text-[15px] font-body text-[#cecdc9] leading-[1.65]">
        {renderAnnotatedContent()}
      </div>

      {/* Signal Lock Status Indicator */}
      {selectedClaim && (
        <div className="p-3 bg-[#292623] border border-[#ed670f] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-2 w-2 bg-[#ed670f] animate-ping"></span>
            <span className="text-[#ed670f] font-bold">
              SIGNAL LOCK ENGAGED ON CLAIM #{selectedClaimIndex! + 1}
            </span>
            <span className="text-[#9f9b92]">::</span>
            <span
              className={`font-semibold ${
                selectedClaim.verdict === 'Supported'
                  ? 'text-[#3ddc84]'
                  : selectedClaim.verdict === 'Contradicted'
                  ? 'text-[#ff4d4d]'
                  : 'text-[#9f9b92]'
              }`}
            >
              [{selectedClaim.verdict.toUpperCase()}]
            </span>
          </div>
          <div className="flex items-center gap-3 text-[#cecdc9] flex-wrap">
            <span className="text-[11px] font-mono text-[#9f9b92] flex items-center gap-1">
              <Globe className="h-3 w-3 text-[#ed670f]" />
              <span>SOURCE:</span>
              <strong className="text-white">
                {getClaimSourceInfo(selectedClaim).name}
              </strong>
              {getClaimSourceInfo(selectedClaim).domain && (
                <span className="text-[#ed670f]">
                  ({getClaimSourceInfo(selectedClaim).domain})
                </span>
              )}
            </span>
            <div>
              Confidence: <strong className="text-white">{(selectedClaim.confidence * 100).toFixed(0)}%</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
