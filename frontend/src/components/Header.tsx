import React from 'react';
import { ShieldCheck, Code, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface HeaderProps {
  onOpenSchemaModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSchemaModal }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Meiporul
                <span className="text-xs font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                  மெய்ப்பொருள்
                </span>
              </h1>
              <span className="text-xs text-slate-400 hidden md:inline">|</span>
              <span className="text-xs text-slate-400 hidden md:inline">Autonomous Fact-Verification Tool</span>
            </div>
            <p className="text-xs text-slate-400">
              The post-hoc verification & self-correcting tool other LLMs call before answering.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Target: <code className="text-slate-400">{API_BASE_URL}</code></span>
          </div>

          <button
            onClick={onOpenSchemaModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm"
          >
            <Code className="h-3.5 w-3.5 text-cyan-400" />
            <span>View Tool Schema</span>
            <Sparkles className="h-3 w-3 text-amber-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
