import React from 'react';
import { AlertOctagon, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface ErrorFallbackProps {
  errorMessage: string;
  onRetry: () => void;
  onLoadDemo: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  errorMessage,
  onRetry,
  onLoadDemo,
}) => {
  return (
    <div className="p-6 bg-[#201c19] border border-[#ff4d4d]/60 text-center max-w-2xl mx-auto my-6 space-y-4">
      {/* Icon & Diagnostic Header */}
      <div className="h-12 w-12 bg-[#16120f] border border-[#ff4d4d]/50 flex items-center justify-center mx-auto text-[#ff4d4d]">
        <AlertOctagon className="h-6 w-6 text-[#ff4d4d]" />
      </div>

      <div className="space-y-1">
        <h3 className="text-[18px] font-bold font-display text-[#ff4d4d] uppercase tracking-tight">
          SYSTEM FAULT // SIGNAL VERIFICATION FAILED
        </h3>
        <p className="text-xs font-mono text-[#9f9b92]">
          TELEMETRY EXCEPTION AT ENDPOINT: {API_BASE_URL}
        </p>
      </div>

      {/* Raw Error Stream */}
      <div className="p-3 bg-[#16120f] border border-[#ff4d4d]/30 text-xs font-mono text-[#ff4d4d] text-left max-w-lg mx-auto overflow-x-auto whitespace-pre-wrap">
        &gt; EXCEPTION_LOG: {errorMessage || 'Connection refused to backend verification service.'}
      </div>

      <p className="text-[13px] font-body text-[#cecdc9] max-w-md mx-auto leading-relaxed">
        If the verification daemon is offline or cold-starting, you can switch immediately to the cached verification telemetry demo.
      </p>

      {/* Terminal Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium text-white bg-[#292623] hover:bg-[#16120f] border border-[rgba(255,255,255,0.15)] hover:border-[#ed670f] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>RETRY_PROBE</span>
        </button>

        <button
          type="button"
          onClick={onLoadDemo}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium text-[#16120f] bg-[#ed670f] hover:bg-[#f4b084] transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>LOAD_CACHED_DEMO</span>
        </button>

        <a
          href={`${API_BASE_URL}/docs`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[#9f9b92] hover:text-white transition-colors"
        >
          <span>API_DOCS</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
