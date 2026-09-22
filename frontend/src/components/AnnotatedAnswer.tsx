import React from 'react';
import { FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface AnnotatedAnswerProps {
  annotatedText: string;
}

export const AnnotatedAnswer: React.FC<AnnotatedAnswerProps> = ({ annotatedText }) => {
  /**
   * Parse the text with inline tags like [Supported], [Contradicted], [Not Enough Info]
   * and render inline styled chips.
   */
  const renderFormattedSpans = (text: string) => {
    // Match bracketed verdicts
    const parts = text.split(/(\[(?:Supported|Contradicted|Not Enough Info)\])/g);

    return parts.map((part, index) => {
      if (part === '[Supported]') {
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          >
            <CheckCircle className="h-3 w-3" />
            Supported
          </span>
        );
      } else if (part === '[Contradicted]') {
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30"
          >
            <XCircle className="h-3 w-3" />
            Contradicted
          </span>
        );
      } else if (part === '[Not Enough Info]') {
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30"
          >
            <AlertTriangle className="h-3 w-3" />
            Not Enough Info
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-200">
          Annotated Answer View (Inline Color-Coded Grounding)
        </h3>
      </div>
      <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800/80 text-sm leading-relaxed text-slate-300 font-sans">
        {renderFormattedSpans(annotatedText)}
      </div>
    </div>
  );
};
