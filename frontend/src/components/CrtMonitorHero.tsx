import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Volume2,
  VolumeX,
  ArrowRight
} from 'lucide-react';

interface CrtMonitorHeroProps {
  onGoToVerifyDashboard: () => void;
}

interface ChatMessage {
  sender: 'user' | 'meiporul';
  text: string;
  verdict?: 'Supported' | 'Contradicted' | 'Not Enough Info';
  rewrite?: string;
  confidence?: number;
}

const PRESET_QUERIES = [
  {
    label: "DNA Discovery (Watson & Franklin)",
    query: "The double helix was discovered in 1953 by Watson and Crick, with Rosalind Franklin receiving the Nobel Prize in 1962.",
    response: "EXTRACTED CLAIMS:\n1. DNA double helix discovered in 1953 [SUPPORTED]\n2. Watson & Crick identified double helix [SUPPORTED]\n3. Rosalind Franklin awarded 1962 Nobel Prize [CONTRADICTED]\n\nEVIDENCE: Nobel Prize archives confirm Franklin died in 1958; Nobel rules preclude posthumous prizes.\n\nGROUNDED REWRITE: Rosalind Franklin's Photo 51 was critical to discovering the structure, but the 1962 Nobel Prize was awarded jointly to Watson, Crick, and Maurice Wilkins."
  },
  {
    label: "Apollo 11 Moon Landing",
    query: "Apollo 11 landed on the moon on July 20, 1969, launched aboard a Saturn I rocket.",
    response: "EXTRACTED CLAIMS:\n1. Apollo 11 landed on Moon on July 20, 1969 [SUPPORTED]\n2. Launched aboard a Saturn I rocket [CONTRADICTED]\n\nEVIDENCE: NASA records confirm Apollo 11 launched on Saturn V (SA-506), not Saturn I.\n\nGROUNDED REWRITE: Apollo 11 landed on the Moon on July 20, 1969, following its launch aboard a Saturn V rocket."
  }
];

export const CrtMonitorHero: React.FC<CrtMonitorHeroProps> = ({ onGoToVerifyDashboard }) => {
  // Screen mode: 'telemetry' (the rich OS panel) or 'chatbot' (interactive terminal chat)
  const [screenMode, setScreenMode] = useState<'telemetry' | 'chatbot'>('telemetry');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Live Chatbot State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'meiporul',
      text: 'MEIPORUL TERMINAL — READY. Submit any AI-generated claim below for atomic extraction, evidence cross-checking, and grounded self-correction.'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Live Clock for Header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase() +
        '  ' +
        now.toTimeString().split(' ')[0]
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    if (screenMode === 'chatbot') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, screenMode]);

  // Terminal Typing simulator (~28ms per char as specified in §3)
  const streamBotReply = (fullText: string) => {
    setIsTyping(true);
    setStreamingText('');
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setStreamingText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
        setMessages((prev) => [...prev, { sender: 'meiporul', text: fullText }]);
        setStreamingText('');
      }
    }, 28);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);

    // Find matching preset or generate diagnostic response
    const matched = PRESET_QUERIES.find(p => userText.toLowerCase().includes(p.label.toLowerCase().slice(0, 5)));
    const botReply = matched 
      ? matched.response 
      : `> ANALYZING INPUT STREAM: "${userText}"\n> ATOMIC EXTRACTION: 1 claim identified.\n> RETRIEVING SIGNALS: Cross-referencing Wikipedia & authoritative databases...\n> ARBITRATION RESULT: Signal audit executed.\n> Launch full verification in dashboard below for detailed multi-signal traces.`;

    setTimeout(() => {
      streamBotReply(botReply);
    }, 200);
  };

  const handleSelectPresetQuery = (preset: typeof PRESET_QUERIES[0]) => {
    if (isTyping) return;
    setMessages((prev) => [...prev, { sender: 'user', text: preset.query }]);
    setTimeout(() => {
      streamBotReply(preset.response);
    }, 200);
  };

  return (
    <section className="relative pt-6 pb-16 px-4 sm:px-6 max-w-[1440px] mx-auto overflow-hidden">
      {/* Background Starfield & Texture (§5.2) */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-40">
        {/* Pixel stars */}
        <div className="absolute top-12 left-16 text-white text-[8px] animate-pulse">✦</div>
        <div className="absolute top-28 left-1/4 text-white text-[6px]">■</div>
        <div className="absolute top-8 right-1/4 text-white text-[10px] animate-ping" style={{ animationDuration: '4s' }}>✦</div>
        <div className="absolute top-36 right-20 text-white text-[7px]">■</div>
        <div className="absolute bottom-20 left-1/3 text-white text-[8px]">✦</div>
        <div className="absolute bottom-40 right-1/6 text-white text-[6px]">■</div>
      </div>

      {/* Eyebrow + Central Headline Block */}
      <div className="text-center max-w-4xl mx-auto space-y-4 mb-10 relative z-10">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-[#9f9b92] uppercase">
          <span>EVIDENCE</span>
          <span>•</span>
          <span>REASONING</span>
          <span>•</span>
          <span className="text-[#ed670f]">A MORE TRUTHFUL TOMORROW</span>
        </div>

        {/* Silkscreen Display Headline (§5.2) */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight leading-[1.1] max-w-3xl mx-auto">
          The truth layer for AI answers
        </h1>

        {/* Pixelify Sans Subhead (§5.2) */}
        <p className="text-base sm:text-lg font-body text-[#cecdc9] max-w-2xl mx-auto leading-relaxed">
          Meiporul checks every claim in AI-generated responses using evidence,
          verification, and rewriting before the answer reaches the user.
        </p>

        {/* Primary CTA Button: Single light-filled pill with dark text (§5.2) */}
        <div className="pt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onGoToVerifyDashboard}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-[10px] bg-white hover:bg-[#cecdc9] text-[#16120f] font-body text-[14px] font-bold shadow-lg transition-transform active:scale-95"
          >
            <span>Try Meiporul</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Marginalia + Center CRT Monitor */}
      <div className="relative grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        {/* Left Marginalia (Ancient Wisdom / Thiruvalluvar) */}
        <div className="hidden xl:flex xl:col-span-2 flex-col justify-between h-[520px] text-xs font-mono text-[#9f9b92] border-l border-[rgba(255,255,255,0.08)] pl-4 min-w-0">
          <div className="space-y-1">
            <div className="text-[#9f9b92] text-sm">—</div>
            <div className="text-white font-bold tracking-wider">MEIPORUL</div>
            <div className="text-[11px] text-[#9f9b92] leading-tight">
              FOR A MORE<br />TRUTHFUL<br />INTERNET
            </div>
          </div>

          {/* Authentic Pixel-Art Thiruvalluvar Statue (Larger & Softly Blended) */}
          <div className="my-auto py-2 flex flex-col items-center">
            <img
              src="/assets/thiruvalluvar_statue.png"
              alt="Thiruvalluvar Statue"
              className="w-full max-w-[170px] h-auto object-contain filter contrast-125 select-none pointer-events-none opacity-90 drop-shadow-[0_0_15px_rgba(237,103,15,0.08)]"
              style={{
                maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)'
              }}
            />
          </div>

          <div className="space-y-0.5 text-[11px] leading-tight">
            <div className="text-[#9f9b92]">ANCIENT</div>
            <div className="text-[#9f9b92]">WISDOM</div>
            <div className="text-white font-bold">MODERN</div>
            <div className="text-white font-bold">VERIFICATION</div>
          </div>
        </div>

        {/* Center: The CRT Monitor Housing (§5.3 Nested Bezel Construction) */}
        <div className="xl:col-span-8 w-full max-w-4xl mx-auto">
          {/* Frame 1: Outer Dither Texture Frame (0px radius) */}
          <div className="dither-frame p-2 sm:p-3 border border-[rgba(255,255,255,0.15)] shadow-2xl relative">
            {/* Frame 2: Darker Charcoal with Bevel Highlight */}
            <div className="bg-[#201c19] border-t-2 border-l-2 border-[rgba(255,255,255,0.2)] border-r border-b border-black p-2 sm:p-3">
              {/* Frame 3: Inner Dither Border */}
              <div className="dither-frame p-1 sm:p-1.5 border border-[rgba(255,255,255,0.08)]">
                {/* Frame 4: The Innermost CRT Glass (10px rounded corners on inner glass cutout) */}
                <div className="crt-screen-glass rounded-[10px] border border-[rgba(255,255,255,0.1)] relative overflow-hidden crt-power-on min-h-[460px] flex flex-col justify-between">
                  {/* Scoped Screen Scanlines Overlay (§5) */}
                  <div className="screen-scanlines" aria-hidden="true" />

                  {/* Top Screen Bar: Meiporul OS Telemetry Header (§5.4) */}
                  <div className="relative z-20 px-4 py-2.5 bg-[#16120f]/90 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👁</span>
                      <span className="text-[#ed670f] font-bold">Meiporul</span>
                      <span className="text-[#9f9b92] text-[11px]">v1.0.0</span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[10px] border border-[#3ddc84]/40 bg-[#16120f] text-[#3ddc84] text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc84] animate-pulse"></span>
                        <span>TRUTH LAYER ACTIVE</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[10px] border border-[#ed670f]/40 bg-[#16120f] text-[#ed670f] text-[11px]">
                        <span>PWR 96%</span>
                      </div>
                      <div className="text-[11px] text-[#9f9b92] hidden md:inline">
                        {currentTime || 'UPTIME 04:13:49'}
                      </div>
                    </div>
                  </div>

                  {/* Mode 1: Rich OS Panel Telemetry (§5.4 - §5.6) */}
                  {screenMode === 'telemetry' && (
                    <div className="relative z-20 p-4 space-y-4 flex-1 flex flex-col justify-between">
                      {/* Top Horizontal Pipeline Stage Map */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                        {/* 1. EXTRACT CLAIMS */}
                        <div className="bracket-box p-2 bg-[#201c19]/70 flex flex-col justify-between min-h-[70px] min-w-0">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-white uppercase truncate">
                              1. EXTRACT CLAIMS
                            </div>
                            <div className="text-[10px] font-mono text-[#9f9b92] leading-tight mt-0.5 truncate">
                              Every statement pulled out
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setScreenMode('chatbot')}
                            className="mt-1 text-[10px] font-mono text-[#ed670f] self-end border border-[#ed670f]/40 px-1.5 py-0.5 hover:bg-[#ed670f]/20 transition-colors"
                          >
                            EXPLORE &gt;
                          </button>
                        </div>

                        {/* 2. RETRIEVE EVIDENCE */}
                        <div className="bracket-box p-2 bg-[#201c19]/70 flex flex-col justify-between min-h-[70px] min-w-0">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-white uppercase truncate">
                              2. RETRIEVE EVIDENCE
                            </div>
                            <div className="text-[10px] font-mono text-[#9f9b92] leading-tight mt-0.5 truncate">
                              Real sources matched
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setScreenMode('chatbot')}
                            className="mt-1 text-[10px] font-mono text-[#ed670f] self-end border border-[#ed670f]/40 px-1.5 py-0.5 hover:bg-[#ed670f]/20 transition-colors"
                          >
                            EXPLORE &gt;
                          </button>
                        </div>

                        {/* 3. VERIFY & SCORE */}
                        <div className="bracket-box p-2 bg-[#201c19]/70 border-[#3ddc84]/40 flex flex-col justify-between min-h-[70px] min-w-0">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-[#3ddc84] uppercase truncate">
                              3. VERIFY & SCORE
                            </div>
                            <div className="text-[10px] font-mono text-[#9f9b92] leading-tight mt-0.5 truncate">
                              Dual-signal cross-check
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setScreenMode('chatbot')}
                            className="mt-1 text-[10px] font-mono text-[#3ddc84] self-end border border-[#3ddc84]/40 px-1.5 py-0.5 hover:bg-[#3ddc84]/20 transition-colors font-bold"
                          >
                            RUN TEST &gt;
                          </button>
                        </div>

                        {/* 4. REWRITE & SERVE */}
                        <div className="bracket-box p-2 bg-[#201c19]/70 flex flex-col justify-between min-h-[70px] min-w-0">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-white uppercase truncate">
                              4. REWRITE & SERVE
                            </div>
                            <div className="text-[10px] font-mono text-[#9f9b92] leading-tight mt-0.5 truncate">
                              Corrected claims ready
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setScreenMode('chatbot')}
                            className="mt-1 text-[10px] font-mono text-[#ed670f] self-end border border-[#ed670f]/40 px-1.5 py-0.5 hover:bg-[#ed670f]/20 transition-colors"
                          >
                            EXPLORE &gt;
                          </button>
                        </div>
                      </div>

                      {/* Middle Telemetry Grid + Center Figure (§5.6) */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center w-full">
                        {/* Left: Verification Metrics */}
                        <div className="md:col-span-4 p-3 bg-[#16120f]/80 border border-[rgba(255,255,255,0.08)] space-y-2 text-xs font-mono min-w-0">
                          <div className="text-[11px] font-bold text-white uppercase tracking-wider border-b border-[rgba(255,255,255,0.08)] pb-1">
                            VERIFICATION METRICS
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-[#9f9b92]">Total claims</span>
                              <span className="text-white font-bold">12</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#3ddc84]">Supported</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#3ddc84]">10 (83%)</span>
                                <div className="w-12 h-1.5 bg-[#201c19] overflow-hidden">
                                  <div className="w-[83%] h-full bg-[#3ddc84]"></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#ff4d4d]">Contradicted</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#ff4d4d]">1 (8%)</span>
                                <div className="w-12 h-1.5 bg-[#201c19] overflow-hidden">
                                  <div className="w-[8%] h-full bg-[#ff4d4d]"></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#9f9b92]">No signal (NEI)</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#9f9b92]">1 (8%)</span>
                                <div className="w-12 h-1.5 bg-[#201c19] overflow-hidden">
                                  <div className="w-[8%] h-full bg-[#9f9b92]"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="pt-1 border-t border-[rgba(255,255,255,0.08)] flex justify-between text-[11px]">
                            <span className="text-[#ed670f]">Overall confidence</span>
                            <span className="text-white font-bold">0.89</span>
                          </div>
                        </div>

                        {/* Center: Magnifying Glass & Evidence Codices (§5.6) */}
                        <div className="md:col-span-4 flex flex-col items-center justify-center p-2 text-center select-none min-w-0">
                          <div className="relative w-28 h-24 flex items-center justify-center">
                            {/* Pixel Art Magnifying Glass & Codex */}
                            <svg className="w-24 h-24 text-[#ed670f]" viewBox="0 0 100 100" fill="none">
                              <circle cx="45" cy="40" r="24" stroke="#ed670f" strokeWidth="4" />
                              <circle cx="45" cy="40" r="18" stroke="#f4b084" strokeWidth="2" strokeDasharray="4 2" />
                              <line x1="62" y1="57" x2="84" y2="79" stroke="#ed670f" strokeWidth="6" strokeLinecap="round" />
                              {/* Stack of evidence pages */}
                              <rect x="25" y="70" width="50" height="4" fill="#622d08" />
                              <rect x="28" y="76" width="44" height="4" fill="#f4b084" opacity="0.6" />
                              <rect x="30" y="82" width="40" height="4" fill="#ed670f" opacity="0.4" />
                            </svg>
                          </div>
                          <div className="text-[11px] font-mono font-bold tracking-widest text-[#ed670f] uppercase mt-1">
                            TRUTH THROUGH EVIDENCE
                          </div>
                        </div>

                        {/* Right: Evidence Sources & Live Stream */}
                        <div className="md:col-span-4 p-3 bg-[#16120f]/80 border border-[rgba(255,255,255,0.08)] space-y-2 text-xs font-mono min-w-0">
                          <div className="text-[11px] font-bold text-white uppercase tracking-wider border-b border-[rgba(255,255,255,0.08)] pb-1">
                            EVIDENCE RETRIEVAL
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between text-[#cecdc9]">
                              <span>Academic Papers</span>
                              <span className="text-white">42</span>
                            </div>
                            <div className="flex justify-between text-[#cecdc9]">
                              <span>Government / Archive</span>
                              <span className="text-white">17</span>
                            </div>
                            <div className="flex justify-between text-[#cecdc9]">
                              <span>Wikipedia Corpus</span>
                              <span className="text-white">31</span>
                            </div>
                          </div>
                          <div className="pt-1 border-t border-[rgba(255,255,255,0.08)] text-[10px] space-y-0.5">
                            <div className="text-[#3ddc84] flex items-center gap-1">
                              <span>✓</span> <span>Checking claim 3... Supported</span>
                            </div>
                            <div className="text-[#ff4d4d] flex items-center gap-1">
                              <span>✗</span> <span>Rewriting claim 2... Solved</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Inset Switch to Chatbot (§5.8) */}
                      <div className="p-2.5 bg-[#16120f] border border-[#ed670f]/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2 text-[#cecdc9]">
                          <span className="text-[#ed670f] font-bold">&gt;</span>
                          <span>INTERACTIVE TERMINAL PROBE AVAILABLE</span>
                          <span className="cursor-block">▋</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScreenMode('chatbot')}
                          className="px-3 py-1 bg-[#201c19] hover:bg-[#ed670f] hover:text-[#16120f] text-white border border-[rgba(255,255,255,0.15)] transition-colors text-[11px]"
                        >
                          LAUNCH CHATBOT &gt;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Interactive CRT Terminal Chatbot (§2, §3, §5.8) */}
                  {screenMode === 'chatbot' && (
                    <div className="relative z-20 p-4 space-y-3 flex-1 flex flex-col justify-between">
                      {/* Chat Header & Switch Back */}
                      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-3.5 w-3.5 text-[#ed670f]" />
                          <span className="text-white font-bold">TERMINAL CHATBOT MODE</span>
                          <span className="text-[#9f9b92] text-[11px]">(28ms/char stream)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScreenMode('telemetry')}
                          className="text-[11px] text-[#9f9b92] hover:text-white border border-[rgba(255,255,255,0.1)] px-2 py-0.5 hover:border-[#ed670f] transition-colors"
                        >
                          &lt; RETURN TO OS TELEMETRY
                        </button>
                      </div>

                      {/* Preset Quick Injections */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="text-[#9f9b92]">TEST_PROMPT:</span>
                        {PRESET_QUERIES.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPresetQuery(p)}
                            disabled={isTyping}
                            className="px-2 py-0.5 bg-[#201c19] hover:bg-[#16120f] text-[#cecdc9] hover:text-white border border-[rgba(255,255,255,0.1)] hover:border-[#ed670f] transition-colors"
                          >
                            [{p.label}]
                          </button>
                        ))}
                      </div>

                      {/* Messages Scroll Area */}
                      <div className="flex-1 max-h-[220px] overflow-y-auto space-y-3 p-3 bg-[#16120f]/90 border border-[rgba(255,255,255,0.08)] font-mono text-[13px] leading-relaxed">
                        {messages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col ${
                              m.sender === 'user' ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`p-2.5 max-w-[90%] whitespace-pre-wrap ${
                                m.sender === 'user'
                                  ? 'bg-[#201c19] border border-[rgba(255,255,255,0.15)] text-white'
                                  : 'text-[#cecdc9] border-l-2 border-[#ed670f] pl-3'
                              }`}
                            >
                              {m.sender === 'meiporul' && (
                                <span className="text-[#ed670f] font-bold mr-1">&gt;</span>
                              )}
                              {m.text}
                            </div>
                          </div>
                        ))}

                        {/* Streaming message typing in */}
                        {isTyping && (
                          <div className="text-left text-[#cecdc9] border-l-2 border-[#ed670f] pl-3 p-2.5 whitespace-pre-wrap">
                            <span className="text-[#ed670f] font-bold mr-1">&gt;</span>
                            {streamingText}
                            <span className="cursor-block">▋</span>
                          </div>
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      {/* Chat Input Line Flush with Screen */}
                      <form onSubmit={handleSendMessage} className="relative flex items-center">
                        <span className="absolute left-3 text-[#ed670f] font-mono text-sm select-none">&gt;</span>
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          disabled={isTyping}
                          placeholder="Type an AI statement to verify claims..."
                          className="w-full pl-8 pr-24 py-2 bg-[#16120f] border border-[rgba(255,255,255,0.15)] focus:border-[#ed670f] text-[13px] font-mono text-white placeholder-[#9f9b92]/60 focus:outline-none transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={isTyping || !inputMessage.trim()}
                          className="absolute right-1 px-3 py-1 bg-[#ed670f] hover:bg-[#f4b084] text-[#16120f] font-mono text-xs font-bold transition-colors disabled:opacity-40"
                        >
                          SEND
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Screen Glass Sub-footer */}
                  <div className="relative z-20 px-4 py-1.5 bg-[#16120f] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[10px] font-mono text-[#9f9b92]">
                    <span>A SAFER INFORMATION FUTURE</span>
                    <span>BUILT BY MEIPORUL</span>
                  </div>
                </div>
              </div>

              {/* Lower Bezel Chin / Hardware Details (§5.7) */}
              <div className="mt-3 px-3 py-2 bg-[#16120f] border border-[rgba(255,255,255,0.1)] flex items-center justify-between text-xs font-mono">
                {/* Brand emblem */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.3)] flex items-center justify-center text-[10px] font-bold text-white">
                    C
                  </div>
                  <span className="text-[#cecdc9] tracking-widest font-bold">commodore</span>
                </div>

                {/* Floppy slot badge */}
                <div className="flex items-center gap-3">
                  <div className="px-3 py-0.5 bg-[#201c19] border border-[rgba(255,255,255,0.15)] text-[11px] text-[#cecdc9] tracking-wider">
                    MEIPORUL.TXT
                  </div>
                  {/* Floppy Drive Slot Graphic */}
                  <div className="w-10 h-2 bg-black border border-[rgba(255,255,255,0.1)]"></div>
                  {/* Power LED */}
                  <div className="h-2 w-2 rounded-full bg-[#3ddc84] animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Atmospheric Sound Toggle (§5.7) */}
          <div className="flex items-center justify-between mt-3 px-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="inline-flex items-center gap-1.5 text-[#9f9b92] hover:text-[#ed670f] transition-colors"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-[#3ddc84]" />
                  <span>▷ SOUND ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>▷ SOUND MUTED</span>
                </>
              )}
            </button>

            <span className="text-[#9f9b92] text-[11px]">
              TRUTH SCALES EVERYTHING // HUMANS × AI × EVIDENCE
            </span>
          </div>
        </div>

        {/* Right Marginalia (Philosophy & Truth) */}
        <div className="hidden xl:flex xl:col-span-2 flex-col justify-between h-[520px] text-xs font-mono text-[#9f9b92] border-r border-[rgba(255,255,255,0.08)] pr-4 text-right min-w-0">
          {/* Authentic Pixel Moon Image (Larger & Softly Blended) */}
          <div className="flex flex-col items-end">
            <img
              src="/assets/moon.png"
              alt="Moon"
              className="w-[145px] h-auto object-contain filter contrast-125 select-none pointer-events-none opacity-90 drop-shadow-[0_0_16px_rgba(255,255,255,0.12)]"
              style={{
                maskImage: 'radial-gradient(circle at 55% 50%, black 75%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(circle at 55% 50%, black 75%, transparent 100%)'
              }}
            />
          </div>

          <div className="space-y-1 my-auto py-2">
            <div className="text-[#9f9b92] text-sm">—</div>
            <div className="text-white font-serif text-sm tracking-wide">
              "மெய்ப்பொருள்<br />காண்பதறிவு"
            </div>
            <div className="text-[11px] text-[#9f9b92]">— THIRUKKURAL</div>
            <div className="text-[11px] text-white font-bold tracking-wide">
              TRUTH ALONE<br />IS KNOWLEDGE
            </div>
          </div>

          <div className="space-y-0.5 text-[11px] leading-tight">
            <div className="text-[#9f9b92]">SAME</div>
            <div className="text-[#9f9b92]">QUESTIONS</div>
            <div className="text-white font-bold">A BRIGHTER</div>
            <div className="text-white font-bold">TOMORROW</div>
          </div>
        </div>
      </div>
    </section>
  );
};
