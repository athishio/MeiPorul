import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CrtMonitorHero } from './components/CrtMonitorHero';
import { PipelineWalkthrough } from './components/PipelineWalkthrough';
import { DocsSection } from './components/DocsSection';
import { AboutSection } from './components/AboutSection';
import { InputForm } from './components/InputForm';
import { SummaryBar } from './components/SummaryBar';
import { AnnotatedAnswer } from './components/AnnotatedAnswer';
import { ClaimsList } from './components/ClaimsList';
import { ToolSchemaModal } from './components/ToolSchemaModal';
import { ErrorFallback } from './components/ErrorFallback';
import { VerifyResponse } from './types';
import { VERIFY_ENDPOINT } from './config';
import { Terminal, Shield, Sparkles, Activity, Radio, ArrowUpRight } from 'lucide-react';

// Import cached static demo response directly for guaranteed instant offline presentation
import DEMO_FIXTURE from '../../demo/demo_response.json';

export function App() {
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedClaimIndex, setSelectedClaimIndex] = useState<number | null>(null);

  // Load demo example handler
  const loadDemoExample = useCallback(() => {
    setIsLoading(false);
    setErrorMessage(null);
    setIsDemoMode(true);
    setSelectedClaimIndex(0); // Focus first claim by default
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
    setSelectedClaimIndex(null);

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
      if (data.claims && data.claims.length > 0) {
        setSelectedClaimIndex(0);
      }
    } catch (err: unknown) {
      console.error('Verification failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown network error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectClaim = (index: number) => {
    setSelectedClaimIndex(index);
  };

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      // Account for the fixed header height
      const yOffset = -70;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#16120f] text-[#cecdc9] flex flex-col font-body selection:bg-[#ed670f]/30 selection:text-white relative w-full max-w-full overflow-x-hidden">
      {/* Fixed Navigation Header placed outside any transformed/animated container for true viewport lock */}
      <Header
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        onNavigateToSection={scrollToSection}
      />

      {/* CRT Scanline Overlay: subtle 4% opacity horizontal lines drifting slowly downward across whole page */}
      <div className="crt-scanlines" aria-hidden="true" />

      {/* Main Page Content with top padding offset for fixed header */}
      <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden pt-14 sm:pt-16">
        {/* 1. HERO SECTION: CRT-Frame Monitor with Live OS Telemetry & Chatbot */}
        <div id="hero">
          <CrtMonitorHero
            onGoToVerifyDashboard={() => scrollToSection('verify-tool')}
          />
        </div>

        {/* 2. ARCHITECTURE / PIPELINE WALKTHROUGH SECTION */}
        <PipelineWalkthrough />

        {/* 3. INTERACTIVE DEMO / VERIFICATION SUITE SECTION */}
        <section id="verify-tool" className="py-12 border-t border-[rgba(255,255,255,0.08)] bg-[#16120f]">
          <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 space-y-6">
            {/* Section Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.1)] pb-4">
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#ed670f] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#ed670f]" />
                  <span>INTERACTIVE VERIFICATION SUITE // LIVE PIPELINE PROBE</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                  Verify Any AI-Generated Statement
                </h2>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                {isDemoMode && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-[#201c19] text-[#3ddc84] border border-[#3ddc84]/40">
                    <Activity className="h-3 w-3 text-[#3ddc84] animate-pulse" />
                    <span>CACHED_DEMO_ONLINE</span>
                  </span>
                )}
              </div>
            </div>

            {/* Terminal Input Buffer */}
            <InputForm
              onSubmit={handleVerify}
              onLoadDemo={loadDemoExample}
              isLoading={isLoading}
            />

            {/* Error Fallback State */}
            {errorMessage && (
              <ErrorFallback
                errorMessage={errorMessage}
                onRetry={() => setErrorMessage(null)}
                onLoadDemo={loadDemoExample}
              />
            )}

            {/* Verification Results View */}
            {result && !errorMessage && (
              <div className="space-y-6 pt-2">
                {/* Telemetry Metrics Bar + Donut Chart & Sources Summary */}
                <SummaryBar summary={result.summary} claims={result.claims} />

                {/* Centerpiece Annotated Answer View */}
                <AnnotatedAnswer
                  annotatedText={result.annotated_answer}
                  claims={result.claims}
                  selectedClaimIndex={selectedClaimIndex}
                  onSelectClaim={handleSelectClaim}
                />

                {/* Atomic Claims List & Evidence Audit */}
                <ClaimsList
                  claims={result.claims}
                  selectedClaimIndex={selectedClaimIndex}
                  onSelectClaim={handleSelectClaim}
                />
              </div>
            )}

            {/* Empty State: NO SIGNAL Treatment */}
            {!result && !isLoading && !errorMessage && (
              <div className="py-16 text-center border border-[rgba(255,255,255,0.12)] bg-[#201c19] space-y-4">
                <div className="h-14 w-14 bg-[#16120f] border border-[rgba(255,255,255,0.15)] flex items-center justify-center mx-auto text-[#9f9b92]">
                  <Radio className="h-7 w-7 text-[#ed670f] animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[17px] font-bold font-display text-white uppercase tracking-tight">
                    [NO SIGNAL // SYSTEM IDLE]
                  </h3>
                  <p className="text-xs font-mono text-[#9f9b92] max-w-md mx-auto">
                    Submit text in the input buffer above or click below to inspect pre-computed verification telemetry.
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={loadDemoExample}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-mono font-medium text-[#16120f] bg-[#ed670f] hover:bg-[#f4b084] transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>&gt; LOAD_DNA_DEMO_SIGNAL</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. RESEARCH / ABOUT SECTION */}
        <AboutSection />

        {/* 5. VISIBLE DEVELOPER DOCUMENTATION SECTION */}
        <DocsSection />

        {/* 6. OVERSIZED MEIKURAL WATERMARK (Strictly at the end after docs, zero subtext) */}
        <div className="py-14 sm:py-20 flex justify-center items-center select-none pointer-events-none overflow-hidden w-full">
          <div
            className="font-display font-bold text-white text-center tracking-[-0.75px] uppercase leading-none opacity-10 select-none"
            style={{ fontSize: 'clamp(72px, 14vw, 220px)' }}
          >
            MEIKURAL
          </div>
        </div>

        {/* Clean CRT Footer */}
        <footer className="border-t border-[rgba(255,255,255,0.1)] bg-[#201c19] py-4 text-xs font-mono text-[#9f9b92]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-[#ed670f]" />
              <span>MEIPORUL (மெய்பொருள்) // SIGNAL VERIFICATION ENGINE v1.0.0</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => scrollToSection('docs')}
                className="hover:text-white hover-chromatic transition-colors"
              >
                [DOCS_API]
              </button>
              <a
                href="https://github.com/athishio/MeiPorul.git"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white hover-chromatic flex items-center gap-1 transition-colors"
              >
                <span>GITHUB_REPO</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </footer>

        {/* Tool Schema Modal (Top-Aligned) */}
        <ToolSchemaModal
          isOpen={isSchemaModalOpen}
          onClose={() => setIsSchemaModalOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
