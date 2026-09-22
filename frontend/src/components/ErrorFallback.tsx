import React from 'react';
import { AlertCircle, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface ErrorFallbackProps {
  errorMessage: string;
  onRetry: () => void;
  onLoadDemo: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ errorMessage, onRetry, onLoadDemo }) => {
  return (
    <div className="p-6 bg-rose-950/20 border border-rose-900/60 rounded-xl shadow-xl text-center max-w-2xl mx-auto my-6">
      <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400">
        <AlertCircle className="h-6 w-6" />
      </div>
      
      <h3 className="text-base font-bold text-white mb-1">
        Backend Verification Request Failed
      </h3>
      
      <p className="text-xs text-rose-300 mb-4 font-mono bg-rose-950/40 p-2.5 rounded border border-rose-900/40 max-w-lg mx-auto overflow-x-auto text-left">
        {errorMessage || "Unable to reach verification backend at " + API_BASE_URL}
      </p>

      <p className="text-xs text-slate-400 mb-5 max-w-md mx-auto">
        If the backend server is offline or experiencing network latency, you can instantly load the pre-cached demo fixture to continue your demonstration.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </button>

        <button
          onClick={onLoadDemo}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-500/20"
        >
          <Sparkles className="h-3.5 w-3.5 text-slate-950" />
          Load Demo Example (Cached Fallback)
        </button>

        <a
          href={`${API_BASE_URL}/docs`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
        >
          <span>Open API Docs</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
