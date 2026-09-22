import React from 'react';
import { Summary } from '../types';
import { CheckCircle2, XCircle, HelpCircle, Layers, Gauge } from 'lucide-react';

interface SummaryBarProps {
  summary: Summary;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl">
      {/* Total Claims */}
      <div className="col-span-2 md:col-span-1 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400">Total Claims</div>
          <div className="text-xl font-bold text-white tracking-tight">{summary.total_claims}</div>
        </div>
      </div>

      {/* % Supported */}
      <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-900/40 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-medium text-emerald-400/90">Supported</div>
          <div className="text-xl font-bold text-emerald-300 tracking-tight">{summary.percent_supported}%</div>
        </div>
      </div>

      {/* % Contradicted */}
      <div className="p-3 bg-rose-950/20 rounded-lg border border-rose-900/40 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-medium text-rose-400/90">Contradicted</div>
          <div className="text-xl font-bold text-rose-300 tracking-tight">{summary.percent_contradicted}%</div>
        </div>
      </div>

      {/* % Not Enough Info */}
      <div className="p-3 bg-amber-950/20 rounded-lg border border-amber-900/40 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-medium text-amber-400/90">Not Enough Info</div>
          <div className="text-xl font-bold text-amber-300 tracking-tight">{summary.percent_not_enough_info}%</div>
        </div>
      </div>

      {/* Avg Confidence */}
      <div className="col-span-2 md:col-span-1 p-3 bg-indigo-950/20 rounded-lg border border-indigo-900/40 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-medium text-indigo-300">Avg Confidence</div>
          <div className="text-xl font-bold text-indigo-200 tracking-tight">
            {(summary.avg_confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
