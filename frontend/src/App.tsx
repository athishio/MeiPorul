import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { SummaryBar } from './components/SummaryBar';
import { AnnotatedAnswer } from './components/AnnotatedAnswer';
import { ClaimsList } from './components/ClaimsList';
import { ToolSchemaModal } from './components/ToolSchemaModal';
import { ErrorFallback } from './components/ErrorFallback';
import { VerifyResponse } from './types';
import { VERIFY_ENDPOINT } from './config';
import { ShieldCheck, Sparkles } from 'lucide-react';

// Import cached static demo response directly for guaranteed instant offline presentation
import DEMO_FIXTURE from '../../demo/demo_response.json';

export function App() {
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Load demo example handler
  const loadDemoExample = useCallback(() => {
    setIsLoading(false);
    setErrorMessage(null);
    setIsDemoMode(true);
    setResult(DEMO_FIXTURE as unknown as VerifyResponse);
  }, []);

  // Check URL parameters for ?demo=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1' || params.get('demo') === 'true') {
      loadDemoExample();
    }
  }, [loadDemoExample]);

  const handleVerify = async (answer: string, question?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsDemoMode(false);

    try {
      const response = await fetch(VERIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, answer }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status} ${response.statusText}`);
      }

      const data: VerifyResponse = await response.json();
      setResult(data);
    } catch (err: unknown) {
      console.error('Verification failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown network error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Navigation Header */}
      <Header onOpenSchemaModal={() => setIsSchemaModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Pitch Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Core Architecture & Flow
            </div>
            <p className="text-sm font-medium text-slate-200">
              "A fact-verification tool other LLMs can call before answering — it checks every claim against evidence, flags what's wrong, and rewrites it before the user ever sees it."
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {isDemoMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                <Sparkles className="h-3 w-3" />
                Cached Demo Mode Active
              </span>
            )}
          </div>
        </div>

        {/* Input Card */}
        <InputForm
          onSubmit={handleVerify}
          onLoadDemo={loadDemoExample}
          isLoading={isLoading}
        />

        {/* Error Fallback State */}
        {errorMessage && (
          <ErrorFallback
            errorMessage={errorMessage}
            onRetry={() => {
              setErrorMessage(null);
            }}
            onLoadDemo={loadDemoExample}
          />
        )}

        {/* Results Section */}
        {result && !errorMessage && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Metrics Bar */}
            <SummaryBar summary={result.summary} />

            {/* Inline Color-Coded Annotated Answer */}
            <AnnotatedAnswer annotatedText={result.annotated_answer} />

            {/* Claims Cards & Evidence Snippets + Self-Correction Loop */}
            <ClaimsList claims={result.claims} />
          </div>
        )}

        {/* Empty State */}
        {!result && !isLoading && !errorMessage && (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <ShieldCheck className="h-8 w-8 text-emerald-400/60" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">
              No Claims Verified Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Enter an answer above and click <strong>"Verify Claims"</strong>, or click <strong>"Load Demo Example"</strong> to see a live demonstration of Meiporul's self-correcting verification loop.
            </p>
            <button
              onClick={loadDemoExample}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Load DNA Demo Example</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Meiporul (மெய்பொருள்) — Fact-Verification Engine for LLMs</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSchemaModalOpen(true)} className="hover:text-slate-300">
              Tool Schema
            </button>
            <a href="https://github.com/athishio/MeiPorul.git" target="_blank" rel="noreferrer" className="hover:text-slate-300">
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>

      {/* Tool Schema Modal */}
      <ToolSchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />
    </div>
  );
}

export default App;
