import React from 'react';
import {
  Globe2,
  BookOpen,
  Cpu,
  ChevronRight,
  Sigma,
  GitCompareArrows,
  Sparkles,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Network,
} from 'lucide-react';
import {
  getLawsForCountry,
  getCatalogueForCountry,
} from '../../data/verified-examples';
import type {
  CountryMetadata,
  LawMetadata,
  LawProvision,
  TranslationReadiness,
} from '../../types/contracts';

export type AppScreen = 'world' | 'law-selection' | 'translation';

export interface TopHeaderBarProps {
  activeScreen: AppScreen;
  selectedCountry: CountryMetadata | null;
  selectedLaw: LawMetadata | null;
  selectedProvision: LawProvision | null;
  onNavigateScreen: (screen: AppScreen) => void;
  onOpenFormalLegend: () => void;
  onOpenEnterpriseComparison: () => void;
  onOpenDeonticEditor?: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

function getReadinessBadge(readiness: TranslationReadiness) {
  switch (readiness) {
    case 'human-reviewed':
      return {
        label: 'Human-Reviewed',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      };
    case 'actual-generated':
      return {
        label: 'Live Generated',
        className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        icon: <FlaskConical className="w-3 h-3 text-cyan-400" />,
      };
    case 'unverified-draft':
      return {
        label: 'Heuristic Draft',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
      };
    default:
      return {
        label: 'Unsupported',
        className: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
        icon: null,
      };
  }
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  activeScreen,
  selectedCountry,
  selectedLaw,
  selectedProvision,
  onNavigateScreen,
  onOpenFormalLegend,
  onOpenEnterpriseComparison,
  onOpenDeonticEditor,
  reducedMotion,
  onToggleReducedMotion,
}) => {
  const readiness = selectedProvision?.readiness ?? selectedLaw?.readiness;
  const readinessBadge = readiness ? getReadinessBadge(readiness) : null;

  const verifiedCount = selectedCountry
    ? getLawsForCountry(selectedCountry.code).length
    : 0;
  const catalogueCount = selectedCountry
    ? getCatalogueForCountry(selectedCountry.code).length
    : 0;
  const totalSourcesCount = verifiedCount + catalogueCount;

  const step1Complete = Boolean(selectedCountry);
  const step2Complete = Boolean(selectedLaw);
  const step3Complete = Boolean(selectedProvision && activeScreen === 'translation');

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-navy-900/95 backdrop-blur-md shadow-lg"
      role="banner"
      data-testid="top-header-bar"
    >
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand Identity & Mathematical Tuple Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onNavigateScreen('world')}
            className="group flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
            title="Return to Global Jurisdiction Overview"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/25 to-emerald-500/20 border border-cyan-400/40 flex items-center justify-center shadow-inner group-hover:border-cyan-300 transition-colors">
              <Sigma className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-100 text-base">
                  LAW <span className="text-cyan-400">→</span> GAL
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  GAM 2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px] sm:max-w-none">
                Governance Analysis Method • W. A. Hassan (2009 / GAM 2.0)
              </p>
            </div>
          </button>

          {/* Formal Tuple Pill */}
          <button
            type="button"
            onClick={onOpenFormalLegend}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-950/90 border border-slate-700/80 hover:border-cyan-400/50 text-xs font-mono text-slate-300 hover:text-cyan-200 transition-colors"
            title="Inspect the 14-component GAM Formal Tuple Φ"
          >
            <span className="text-cyan-400 font-semibold">Φ</span>
            <span className="text-slate-500">=</span>
            <span className="tracking-tight">
              ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
            </span>
          </button>
        </div>

        {/* Center: Interactive 3-Step User Journey Breadcrumb */}
        <nav
          aria-label="Law to GAL User Journey"
          className="flex items-center bg-navy-950/90 p-1 rounded-lg border border-slate-800/90 overflow-x-auto max-w-full"
        >
          {/* Step 1: Global Jurisdiction */}
          <button
            type="button"
            data-testid="nav-screen-world"
            onClick={() => onNavigateScreen('world')}
            aria-current={activeScreen === 'world' ? 'step' : undefined}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeScreen === 'world'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {step1Complete && activeScreen !== 'world' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Globe2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span>1. Global Jurisdiction</span>
            {selectedCountry && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-navy-800 text-slate-200 border border-slate-700 text-[11px]">
                <span aria-hidden="true">{selectedCountry.flag}</span>
                <span className="font-semibold">{selectedCountry.name}</span>
                {totalSourcesCount > 0 && (
                  <span
                    className="ml-0.5 px-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[10px]"
                    title={`${verifiedCount} verified GAM law pack(s), ${catalogueCount} catalogued legal source(s)`}
                  >
                    {verifiedCount > 0 ? `${verifiedCount}+${catalogueCount}` : catalogueCount}
                  </span>
                )}
              </span>
            )}
          </button>

          <ChevronRight
            className={`w-3.5 h-3.5 mx-0.5 shrink-0 transition-colors ${
              step1Complete ? 'text-cyan-500/60' : 'text-slate-600'
            }`}
          />

          {/* Step 2: Statutory Source */}
          <button
            type="button"
            data-testid="nav-screen-law"
            onClick={() => onNavigateScreen('law-selection')}
            aria-current={activeScreen === 'law-selection' ? 'step' : undefined}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeScreen === 'law-selection'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {step2Complete && activeScreen !== 'law-selection' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>2. Statutory Source</span>
            {selectedLaw ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-navy-800 text-emerald-200 border border-emerald-500/30 text-[11px] font-mono">
                {selectedLaw.shortName}
                {selectedProvision ? ` • ${selectedProvision.section}` : ''}
              </span>
            ) : (
              selectedCountry &&
              catalogueCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-navy-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                  {catalogueCount} catalogued
                </span>
              )
            )}
          </button>

          <ChevronRight
            className={`w-3.5 h-3.5 mx-0.5 shrink-0 transition-colors ${
              step2Complete ? 'text-emerald-500/60' : 'text-slate-600'
            }`}
          />

          {/* Step 3: Animated Law -> GAL Pipeline */}
          <button
            type="button"
            data-testid="nav-screen-translation"
            onClick={() => onNavigateScreen('translation')}
            aria-current={activeScreen === 'translation' ? 'step' : undefined}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeScreen === 'translation'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {step3Complete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span>3. Animated Law → GAL Pipeline</span>
            {readinessBadge && (
              <span
                className={`hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${readinessBadge.className}`}
              >
                {readinessBadge.icon}
                <span>{readinessBadge.label}</span>
              </span>
            )}
          </button>
        </nav>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {/* Interactive Deontic Editor Switcher */}
          {onOpenDeonticEditor && (
            <button
              type="button"
              data-testid="header-open-deontic-editor"
              onClick={onOpenDeonticEditor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border border-cyan-300/40 shadow-sm shadow-cyan-500/20 transition-all"
              title="Switch to the Interactive Deontic Logic & GAL Editor"
            >
              <Network className="w-3.5 h-3.5 text-white" />
              <span>Deontic Editor</span>
            </button>
          )}

          {/* GAM Formalism Reference (Φ) */}
          <button
            type="button"
            data-testid="open-formal-legend-button"
            onClick={onOpenFormalLegend}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-navy-800/90 hover:bg-navy-700 text-slate-200 border border-slate-700/80 hover:border-cyan-400/50 transition-colors"
            title="Open GAM Formalism Reference & Edge Direction Guide"
          >
            <Sigma className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">GAM Formalism</span>
            <span className="font-mono text-cyan-300">(Φ)</span>
          </button>

          {/* Enterprise Closure Comparison (Φ_L ∧ Φ_E) */}
          <button
            type="button"
            data-testid="header-enterprise-compare-button"
            onClick={onOpenEnterpriseComparison}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/35 hover:border-emerald-400/60 transition-colors"
            title="Compare Law Model (Φ_L) against Enterprise Configuration (Φ_E) over Transitive Closure"
          >
            <GitCompareArrows className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Enterprise Closure</span>
            <span className="font-mono text-emerald-300">(Φ_L ∧ Φ_E)</span>
          </button>

          {/* Reduced Motion Accessibility Toggle */}
          <button
            type="button"
            data-testid="toggle-reduced-motion"
            aria-pressed={reducedMotion}
            onClick={onToggleReducedMotion}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              reducedMotion
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-navy-800/80 text-slate-300 border-slate-700/80 hover:text-white hover:border-slate-600'
            }`}
            title={
              reducedMotion
                ? 'Reduced Motion Enabled (Instant step transitions)'
                : 'Toggle Reduced Motion for Accessibility'
            }
          >
            {reducedMotion ? (
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="hidden lg:inline">
              {reducedMotion ? 'Reduced Motion: ON' : 'Motion: Full'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeaderBar;
