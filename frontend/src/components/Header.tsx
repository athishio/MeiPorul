import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

interface HeaderProps {
  onOpenSchemaModal: () => void;
  onNavigateToSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateToSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    onNavigateToSection(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(255,255,255,0.12)] bg-[#201c19]/95 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand Logo: [Meiporul symbol] MEIPORUL மெய்பொருள் */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('hero')}
            className="flex items-center gap-3 text-left group transition-opacity hover:opacity-90"
          >
            <div className="h-8 w-8 rounded-full bg-[#16120f] border border-[#ed670f]/50 flex items-center justify-center text-[#ed670f] group-hover:border-[#ed670f] transition-colors shrink-0">
              <span className="text-sm select-none">👁</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="brand-name font-brand text-[20px] font-semibold tracking-[-0.025em] text-[#f7f6f3] uppercase leading-none select-none">
                MEIPORUL
              </span>
              <span className="brand-tamil font-tamil text-[13px] font-semibold text-[#ed670f] bg-[#622d08]/40 border border-[#ed670f]/40 px-2 py-0.5 rounded-[10px] hidden sm:inline-flex items-center leading-none tracking-normal select-none">
                மெய்பொருள்
              </span>
            </div>
          </button>
        </div>

        {/* Center: Navigation Links in requested order:
            1. Product, 2. Architecture, 3. Demo, 4. Research, 5. Docs */}
        <nav className="hidden md:flex items-center gap-7 text-[13px] font-sans font-medium">
          <button
            type="button"
            onClick={() => handleNavClick('hero')}
            className="text-[#cecdc9] hover:text-white transition-colors tracking-normal"
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('pipeline')}
            className="text-[#cecdc9] hover:text-white transition-colors tracking-normal"
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('verify-tool')}
            className="text-[#cecdc9] hover:text-white transition-colors tracking-normal"
          >
            Demo
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('about')}
            className="text-[#cecdc9] hover:text-white transition-colors tracking-normal"
          >
            Research
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('docs')}
            className="text-white font-semibold hover:text-[#ed670f] transition-colors tracking-normal"
          >
            Docs
          </button>
        </nav>

        {/* Right: Try Meiporul Button */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('verify-tool')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-xs font-sans font-semibold bg-[#16120f] hover:bg-[#292623] text-[#ed670f] border border-[#ed670f]/60 hover:border-[#ed670f] transition-all"
          >
            <span>Try Meiporul</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#cecdc9] hover:text-white bg-[#16120f] border border-[rgba(255,255,255,0.15)] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-[#ed670f]" /> : <Menu className="h-5 w-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#201c19] border-t border-[rgba(255,255,255,0.1)] px-4 py-3 space-y-2 text-[13px] font-sans">
          <button
            type="button"
            onClick={() => handleNavClick('hero')}
            className="block w-full text-left py-2 px-3 text-[#cecdc9] hover:text-white hover:bg-[#16120f] border-b border-[rgba(255,255,255,0.05)] transition-colors"
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('pipeline')}
            className="block w-full text-left py-2 px-3 text-[#cecdc9] hover:text-white hover:bg-[#16120f] border-b border-[rgba(255,255,255,0.05)] transition-colors"
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('verify-tool')}
            className="block w-full text-left py-2 px-3 text-[#cecdc9] hover:text-white hover:bg-[#16120f] border-b border-[rgba(255,255,255,0.05)] transition-colors"
          >
            Demo
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('about')}
            className="block w-full text-left py-2 px-3 text-[#cecdc9] hover:text-white hover:bg-[#16120f] border-b border-[rgba(255,255,255,0.05)] transition-colors"
          >
            Research
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('docs')}
            className="block w-full text-left py-2 px-3 text-white font-semibold hover:bg-[#16120f] transition-colors"
          >
            Docs (API & Schemas)
          </button>
        </div>
      )}
    </header>
  );
};
