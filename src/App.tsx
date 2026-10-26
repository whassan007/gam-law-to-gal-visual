import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Globe2,
  BookOpen,
  Cpu,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Scale,
  Network,
  FileCode2,
  HelpCircle,
  Keyboard,
  GitBranch,
  Layers,
  Terminal,
  Play,
  ExternalLink,
} from 'lucide-react';
import {
  COUNTRIES,
  VERIFIED_LAWS,
  ENTERPRISE_COMPARISON_CASES,
  getLawsForCountry,
  getCatalogueForCountry,
} from './data/verified-examples';
import {
  translateLawProvision,
  translateCustomPassage,
} from './engine/gam-adapter';
import { TopHeaderBar, FormalTupleLegendModal, AppScreen } from './components/navigation';
import { InteractiveGlobe } from './components/globe';
import { LawSelectorPanel } from './components/law-selector';
import { LegalDocumentPanel } from './components/legal-text';
import { ConceptExtractionWorkspace } from './components/translation/ConceptExtractionWorkspace';
import { GamEntityNodesView } from './components/graph/GamEntityNodesView';
import { GamRelationGraph } from './components/graph/GamRelationGraph';
import { GalJsonSynchronizedViewer } from './components/translation/GalJsonSynchronizedViewer';
import { FormalValidationPanel } from './components/translation/FormalValidationPanel';
import { EnterpriseComparisonModal } from './components/translation/EnterpriseComparisonModal';
import { PipelineStageBanner } from './components/translation/PipelineStageBanner';
import { SpatialTokenBridge } from './components/translation/SpatialTokenBridge';
import { EducationalWalkthroughGuide } from './components/translation/EducationalWalkthroughGuide';
import {
  PlaybackControlBar,
  useAnimationTimeline,
} from './components/playback';
import {
  ResponsiveStageLayout,
  KeyboardShortcutsModal,
  useAccessibilityPreferences,
} from './components/accessibility';
import type {
  CountryMetadata,
  LawMetadata,
  LawProvision,
  SegmentedClause,
  ExtractedConceptToken,
  GraphNode,
  GraphEdge,
  SourceSpan,
} from './types/contracts';

import { DeonticEditorScreen } from './components/editor/DeonticEditorScreen';
import { decodeShare, type EditorDoc, type SharePayload } from './components/editor/editorState';

export function App({ initialView = 'editor' }: { initialView?: 'editor' | 'classic' } = {}) {
  const [showEditor, setShowEditor] = useState(initialView === 'editor');
  const [shared, setShared] = useState<SharePayload | null>(null);
  const [editableDoc, setEditableDoc] = useState<EditorDoc | undefined>();
  // Primary User Journey Screen State ('world' | 'law-selection' | 'translation')
  const [activeScreen, setActiveScreen] = useState<AppScreen>('world');

  // Selected Country, Law, and Provision
  const defaultCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === 'CA') ?? COUNTRIES[0],
    []
  );
  const [selectedCountry, setSelectedCountry] = useState<CountryMetadata | null>(defaultCountry);

  const countryLaws = useMemo(
    () => (selectedCountry ? getLawsForCountry(selectedCountry.code) : []),
    [selectedCountry]
  );

  const [selectedLaw, setSelectedLaw] = useState<LawMetadata | null>(() => {
    const initialLaws = getLawsForCountry('CA');
    return initialLaws[0] ?? VERIFIED_LAWS[0] ?? null;
  });

  const [selectedProvision, setSelectedProvision] = useState<LawProvision | null>(() => {
    const initialLaws = getLawsForCountry('CA');
    const firstLaw = initialLaws[0] ?? VERIFIED_LAWS[0] ?? null;
    return firstLaw?.provisions[0] ?? null;
  });

  // Translation Mode ('curated' | 'live-pipeline' | 'custom')
  const [translationMode, setTranslationMode] = useState<'curated' | 'live-pipeline' | 'custom'>('curated');
  const [customLegalText, setCustomLegalText] = useState<string>(
    'The Chief Privacy Officer must review personal data disclosures. No contractor shall disclose health records unless authorized by the Data Protection Officer.'
  );
  const [customSourceMeta, setCustomSourceMeta] = useState<{ title: string; subtitle: string; lawId: string } | null>(null);
  const [showCustomSandbox, setShowCustomSandbox] = useState(false);

  // Interactive Selection State across Synchronized Views
  const [activeSpan, setActiveSpan] = useState<{ start: number; end: number } | null>(null);
  const [selectedClause, setSelectedClause] = useState<SegmentedClause | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<ExtractedConceptToken | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  // Center & Right Column View Sub-tabs (allows direct switching or auto-following stage)
  const [centerViewOverride, setCenterViewOverride] = useState<'auto' | 'concepts' | 'entities' | 'graph'>('auto');
  const [rightViewOverride, setRightViewOverride] = useState<'auto' | 'gal' | 'validation'>('auto');

  // Modals & Drawers
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Active Translation Result computed deterministically from GAM Engine & Adapter
  const activeLaw = selectedLaw ?? VERIFIED_LAWS[0];
  const activeProvision = selectedProvision ?? activeLaw.provisions[0];

  const translationResult = useMemo(() => {
    if (translationMode === 'custom' && customLegalText.trim().length > 0) {
      return translateCustomPassage(customLegalText, {
        country: selectedCountry?.code ?? 'OTHER',
        level: 'Federal',
        name: selectedCountry?.name ?? 'Custom Statutory Sandbox',
      });
    }
    return translateLawProvision(
      activeLaw,
      activeProvision,
      translationMode === 'live-pipeline' ? 'live-pipeline' : 'curated'
    );
  }, [activeLaw, activeProvision, translationMode, customLegalText, selectedCountry]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const token = window.location.hash.match(/^#share=(.+)$/)?.[1];
      if (!token) return;
      const payload = await decodeShare(token);
      if (cancelled || !payload) return;
      const law = VERIFIED_LAWS.find((l) => l.id === payload.lawId);
      const provision = law?.provisions.find((p) => p.id === payload.provisionId);
      if (!law || !provision) return;
      setSelectedCountry(COUNTRIES.find((c) => c.code === law.countryCode) ?? null);
      setSelectedLaw(law);
      setSelectedProvision(provision);
      setTranslationMode(payload.mode);
      if (payload.customText) setCustomLegalText(payload.customText);
      setShared(payload);
      setEditableDoc(undefined);
      setShowEditor(true);
    };
    void restore();
    window.addEventListener('hashchange', restore);
    return () => { cancelled = true; window.removeEventListener('hashchange', restore); };
  }, []);

  // Accessibility & Reduced Motion Preferences
  const a11y = useAccessibilityPreferences({
    shortcuts: {
      enabled: activeScreen === 'translation',
      onCloseModals: () => {
        setIsLegendOpen(false);
        setIsEnterpriseModalOpen(false);
        setIsGuideOpen(false);
        a11y.setIsShortcutsModalOpen(false);
      },
    },
  });

  // Deterministic 6-Stage Animation Timeline State Machine
  const timeline = useAnimationTimeline({
    events: translationResult.events,
    reducedMotion: a11y.reducedMotion,
    baseStepIntervalMs: 650,
  });

  // Clear element-level selection when switching laws or provisions
  const clearElementSelections = useCallback(() => {
    setActiveSpan(null);
    setSelectedClause(null);
    setSelectedConcept(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    setCenterViewOverride('auto');
    setRightViewOverride('auto');
  }, []);

  // Country Selection Handler
  const handleSelectCountry = useCallback(
    (country: CountryMetadata) => {
      setSelectedCountry(country);
      const lawsForCountry = getLawsForCountry(country.code);
      if (lawsForCountry.length > 0) {
        const firstLaw = lawsForCountry[0];
        setSelectedLaw(firstLaw);
        setSelectedProvision(firstLaw.provisions[0] ?? null);
      } else {
        setSelectedLaw(null);
        setSelectedProvision(null);
      }
      clearElementSelections();
    },
    [clearElementSelections]
  );

  // Law Selection Handler
  const handleSelectLaw = useCallback(
    (law: LawMetadata) => {
      setSelectedLaw(law);
      setSelectedProvision(law.provisions[0] ?? null);
      setTranslationMode('curated');
      clearElementSelections();
    },
    [clearElementSelections]
  );

  // Provision Selection Handler
  const handleSelectProvision = useCallback(
    (provision: LawProvision) => {
      setSelectedProvision(provision);
      clearElementSelections();
    },
    [clearElementSelections]
  );

  // Process Law Action -> Transitions to Screen 3 and starts deterministic translation playback
  const handleProcessLaw = useCallback(
    (mode: 'curated' | 'live-pipeline' = 'curated') => {
      setTranslationMode(mode);
      clearElementSelections();
      setActiveScreen('translation');
      setTimeout(() => {
        timeline.process();
      }, 10);
    },
    [clearElementSelections, timeline]
  );

  // Synchronized Selection Handlers across Clauses, Concepts, Nodes, Edges, and GAL-JSON
  const handleHighlightSpan = useCallback((span: { start: number; end: number } | SourceSpan | null) => {
    if (!span) {
      setActiveSpan(null);
      return;
    }
    setActiveSpan({ start: span.start, end: span.end });
  }, []);

  const handleSelectClause = useCallback(
    (clause: SegmentedClause | null) => {
      setSelectedClause(clause);
      if (clause) {
        setActiveSpan({ start: clause.sourceSpan.start, end: clause.sourceSpan.end });
      } else {
        setActiveSpan(null);
      }
    },
    []
  );

  const handleSelectConcept = useCallback(
    (concept: ExtractedConceptToken | null) => {
      setSelectedConcept(concept);
      if (concept?.sourceSpan) {
        setActiveSpan({ start: concept.sourceSpan.start, end: concept.sourceSpan.end });
      } else {
        setActiveSpan(null);
      }
    },
    []
  );

  const handleSelectNode = useCallback(
    (node: GraphNode | null) => {
      setSelectedNode(node);
      setSelectedEdge(null);
      if (node?.sourceSpan) {
        setActiveSpan({ start: node.sourceSpan.start, end: node.sourceSpan.end });
      }
    },
    []
  );

  const handleSelectEdge = useCallback(
    (edge: GraphEdge | null) => {
      setSelectedEdge(edge);
      setSelectedNode(null);
      if (edge?.sourceSpan) {
        setActiveSpan({ start: edge.sourceSpan.start, end: edge.sourceSpan.end });
      }
    },
    []
  );

  const handleSelectEntityById = useCallback(
    (entityId: string | null) => {
      if (!entityId) {
        setSelectedNode(null);
        return;
      }
      const found = translationResult.graph.nodes.find((n) => n.id === entityId) ?? null;
      setSelectedNode(found);
      if (found?.sourceSpan) {
        setActiveSpan({ start: found.sourceSpan.start, end: found.sourceSpan.end });
      }
    },
    [translationResult.graph.nodes]
  );

  const handleSelectRelationById = useCallback(
    (relationId: string | null) => {
      if (!relationId) {
        setSelectedEdge(null);
        return;
      }
      const found = translationResult.graph.edges.find((e) => e.id === relationId) ?? null;
      setSelectedEdge(found);
      if (found?.sourceSpan) {
        setActiveSpan({ start: found.sourceSpan.start, end: found.sourceSpan.end });
      }
    },
    [translationResult.graph.edges]
  );

  // Copy & Download GAL-JSON Helpers
  const handleCopyGal = useCallback(() => {
    const jsonString = JSON.stringify(translationResult.galModel, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(jsonString).catch(() => {});
    }
  }, [translationResult.galModel]);

  const handleDownloadGal = useCallback(() => {
    const jsonString = JSON.stringify(translationResult.galModel, null, 2);
    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeLaw.id}-${activeProvision.id}-gal.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [translationResult.galModel, activeLaw.id, activeProvision.id]);

  // Determine which center workspace panel to show based on active stage or manual tab override
  const effectiveCenterTab: 'concepts' | 'entities' | 'graph' = useMemo(() => {
    if (centerViewOverride !== 'auto') return centerViewOverride;
    if (timeline.currentStage === 'extract') return 'concepts';
    if (timeline.currentStage === 'entity') return 'entities';
    return 'graph';
  }, [centerViewOverride, timeline.currentStage]);

  // Determine which right workspace panel to show based on active stage or manual tab override
  const effectiveRightTab: 'gal' | 'validation' = useMemo(() => {
    if (rightViewOverride !== 'auto') return rightViewOverride;
    if (timeline.currentStage === 'validate') return 'validation';
    return 'gal';
  }, [rightViewOverride, timeline.currentStage]);

  // Effective span from either user click or active playback event
  const effectiveActiveSpan = useMemo(() => {
    if (activeSpan) return activeSpan;
    if (timeline.activeEvent?.sourceSpan) {
      return {
        start: timeline.activeEvent.sourceSpan.start,
        end: timeline.activeEvent.sourceSpan.end,
      };
    }
    return null;
  }, [activeSpan, timeline.activeEvent]);

  if (showEditor) {
    const isCustomSource = translationMode === 'custom' && customSourceMeta;
    const seed = {
      key: `${isCustomSource ? customSourceMeta.lawId : activeLaw.id}:${activeProvision.id}:${translationMode}:${translationResult.sourceText}`,
      lawId: isCustomSource ? customSourceMeta.lawId : activeLaw.id,
      provisionId: isCustomSource ? 'source-excerpt' : activeProvision.id,
      title: isCustomSource ? customSourceMeta.title : `${activeLaw.shortName} · ${activeProvision.section}`,
      subtitle: isCustomSource ? customSourceMeta.subtitle : activeProvision.title,
      readiness: translationResult.readiness,
      sourceText: translationResult.sourceText, clauses: translationResult.clauses,
      concepts: translationResult.concepts, galModel: translationResult.galModel,
      unmappedClauses: translationResult.validation.unmappedClauses.map((c) => ({ ...c, sourceSpan: translationResult.clauses.find((x) => x.id === c.clauseId)?.sourceSpan ?? { start: 0, end: 0 } })),
      ambiguousInterpretations: translationResult.validation.ambiguousInterpretations.map((c) => ({ ...c, sourceSpan: translationResult.clauses.find((x) => x.id === c.clauseId)?.sourceSpan ?? { start: 0, end: 0 } })),
    };
    const leaveShared = () => { setShared(null); setEditableDoc(undefined); window.history.replaceState(null, '', window.location.pathname + window.location.search); };
    return <DeonticEditorScreen
      seed={seed} initialDoc={editableDoc ?? shared?.doc} readOnly={!!shared?.readOnly}
      onCustomText={(text, meta) => { leaveShared(); setCustomLegalText(text); setCustomSourceMeta(meta ?? null); setTranslationMode('custom'); }}
      mode={translationMode} customText={customLegalText} countries={COUNTRIES}
      countryLaws={countryLaws} selectedCountry={selectedCountry} law={activeLaw} provision={activeProvision}
      reducedMotion={a11y.reducedMotion}
      onSelectCountry={(c) => { leaveShared(); setCustomSourceMeta(null); handleSelectCountry(c); }}
      onSelectLaw={(l) => { leaveShared(); setCustomSourceMeta(null); handleSelectLaw(l); }}
      onSelectProvision={(p) => { leaveShared(); setCustomSourceMeta(null); handleSelectProvision(p); }}
      onChangeMode={(m) => { leaveShared(); if (m !== 'custom') setCustomSourceMeta(null); setTranslationMode(m); }}
      onBackToGlobe={() => { setShowEditor(false); setActiveScreen('world'); }}
      onOpenClassic={() => { setShowEditor(false); setActiveScreen('translation'); }}
      onMakeEditable={(doc) => { leaveShared(); setEditableDoc(structuredClone(doc)); }}
    />;
  }

  return (
    <div
      className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-100"
      data-testid="gam-law-to-gal-app"
    >
      {/* Top Global Navigation & Journey Header */}
      <TopHeaderBar
        activeScreen={activeScreen}
        selectedCountry={selectedCountry}
        selectedLaw={selectedLaw}
        selectedProvision={selectedProvision}
        onNavigateScreen={(screen) => setActiveScreen(screen)}
        onOpenFormalLegend={() => setIsLegendOpen(true)}
        onOpenEnterpriseComparison={() => setIsEnterpriseModalOpen(true)}
        reducedMotion={a11y.reducedMotion}
        onToggleReducedMotion={a11y.toggleReducedMotion}
      />

      {/* Secondary Action Bar: Quick Access to Deontic Editor, Pedagogical Guide, Custom Sandbox, and Keyboard Shortcuts */}
      <div className="border-b border-slate-800/80 bg-[#0B1220]/90 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Formal Foundation: <strong className="text-slate-200">W. A. Hassan (2009)</strong> · Governance Analysis Method (GAM 2.0)
            </span>
          </span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span className="hidden md:inline-flex items-center gap-1 text-emerald-300/90 font-mono text-[11px]">
            Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            data-testid="open-deontic-editor"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-sm transition-all"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Open interactive deontic editor →</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGuideOpen((prev) => !prev)}
            data-testid="toggle-walkthrough-guide-button"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
              isGuideOpen
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>How GAM Works &amp; Formal Pitfalls</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCustomSandbox((prev) => !prev);
              if (activeScreen !== 'translation') {
                setActiveScreen('translation');
              }
            }}
            data-testid="toggle-custom-sandbox-button"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
              showCustomSandbox
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Statutory Sandbox</span>
          </button>

          <button
            type="button"
            onClick={() => a11y.setIsShortcutsModalOpen(true)}
            data-testid="open-shortcuts-modal-button"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/70 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            title="Keyboard Shortcuts & Accessibility (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
        </div>
      </div>

      {/* Collapsible Educational Walkthrough Guide Drawer (Agent C03) */}
      {isGuideOpen && (
        <div className="border-b border-cyan-500/30 bg-[#0B1324] px-4 py-3">
          <EducationalWalkthroughGuide
            stage={timeline.currentStage}
            provision={activeProvision}
            defaultOpen={true}
            onOpenChange={setIsGuideOpen}
          />
        </div>
      )}

      {/* Collapsible Live Statutory Sandbox (Tests `readLawToGAM` live on arbitrary statutory clauses) */}
      {showCustomSandbox && (
        <div
          className="border-b border-amber-500/30 bg-amber-950/15 px-4 py-3"
          data-testid="custom-statutory-sandbox"
        >
          <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Live GAM NLP Pipeline Sandbox (readLawToGAM)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40">
                  Unverified Heuristic Draft
                </span>
              </div>
              <textarea
                value={customLegalText}
                onChange={(e) => setCustomLegalText(e.target.value)}
                rows={2}
                aria-label="Custom statutory clause input"
                data-testid="custom-statutory-input"
                className="w-full rounded-lg bg-slate-900/90 border border-slate-700 px-3 py-2 text-xs font-serif text-slate-100 focus:outline-none focus:border-amber-400"
                placeholder="Enter a statutory clause (e.g., 'No person shall disclose personal information unless authorized by the Privacy Officer.')"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="run-custom-sandbox-button"
                onClick={() => {
                  setTranslationMode('custom');
                  setActiveScreen('translation');
                  timeline.process();
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Translate Custom Clause</span>
              </button>
              {translationMode === 'custom' && (
                <button
                  type="button"
                  onClick={() => setTranslationMode('curated')}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
                >
                  Return to Curated Law
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 1: WORLD VIEW — 3D Interactive Globe + Slide-Over Country & Law Drawer
         ===================================================================== */}
      {activeScreen === 'world' && (
        <main
          className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 p-4 max-w-[1920px] w-full mx-auto"
          data-testid="screen-world-view"
        >
          {/* Left / Center 8 Columns: 3D Interactive Globe & Accessible Country Selector */}
          <div className="xl:col-span-8 flex flex-col min-h-[620px]">
            <InteractiveGlobe
              countries={COUNTRIES}
              selectedCountryCode={selectedCountry?.code ?? null}
              onSelectCountry={handleSelectCountry}
              reducedMotion={a11y.reducedMotion}
            />
          </div>

          {/* Right 4 Columns: Slide-Over Jurisdiction & Law Preview Drawer */}
          <aside
            className="xl:col-span-4 rounded-2xl border border-slate-800 bg-[#0D1526]/95 p-5 flex flex-col justify-between shadow-2xl"
            aria-label="Selected Jurisdiction Law Drawer"
            data-testid="world-jurisdiction-drawer"
          >
            {selectedCountry ? (
              <div className="space-y-4">
                {/* Country Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" role="img" aria-label={selectedCountry.name}>
                        {selectedCountry.flag}
                      </span>
                      <h2 className="text-lg font-bold text-white">{selectedCountry.name}</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {selectedCountry.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedCountry.region}</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                      selectedCountry.supported
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {selectedCountry.supported
                      ? `${countryLaws.length} Verified ${countryLaws.length === 1 ? 'Statute' : 'Statutes'}${
                          getCatalogueForCountry(selectedCountry.code).length > 0
                            ? ` + ${getCatalogueForCountry(selectedCountry.code).length} catalogued`
                            : ''
                        }`
                      : getCatalogueForCountry(selectedCountry.code).length > 0
                        ? `${getCatalogueForCountry(selectedCountry.code).length} Sources Catalogued · No GAM Pack`
                        : 'No Curated Pack Yet'}
                  </span>
                </div>

                {/* Supported Country: List Available Laws & Provisions */}
                {selectedCountry.supported && countryLaws.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Select Legislation to Translate into GAL (Φ_L)
                    </div>
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {countryLaws.map((law) => {
                        const isLawSelected = selectedLaw?.id === law.id;
                        return (
                          <div
                            key={law.id}
                            data-testid={`drawer-law-card-${law.id}`}
                            onClick={() => handleSelectLaw(law)}
                            className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
                              isLawSelected
                                ? 'bg-cyan-950/35 border-cyan-400/60 shadow-md'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm text-white">
                                {law.shortName}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                {law.jurisdictionLevel}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5">{law.name}</div>
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">
                              {law.officialCitation} · Effective {law.effectiveDate}
                            </div>

                            {/* Provision pills when law is active */}
                            {isLawSelected && law.provisions.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                                <div className="text-[11px] text-cyan-300 font-medium">
                                  Available Statutory Provisions ({law.provisions.length}):
                                </div>
                                {law.provisions.map((prov) => {
                                  const isProvSelected = selectedProvision?.id === prov.id;
                                  return (
                                    <button
                                      key={prov.id}
                                      type="button"
                                      data-testid={`drawer-provision-${prov.id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectProvision(prov);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 border transition-colors ${
                                        isProvSelected
                                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                      }`}
                                    >
                                      <span className="truncate">
                                        <strong>{prov.section}</strong> — {prov.title}
                                      </span>
                                      <CheckCircle2
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isProvSelected ? 'text-cyan-400' : 'text-slate-600'
                                        }`}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Preview of Selected Statutory Passage */}
                    {selectedProvision && (
                      <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-cyan-300">
                            {selectedProvision.section}: {selectedProvision.title}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            v.{selectedProvision.versionDate}
                          </span>
                        </div>
                        <blockquote className="text-xs font-serif text-slate-200 leading-relaxed border-l-2 border-cyan-500/60 pl-3 italic line-clamp-4">
                          “{selectedProvision.originalText}”
                        </blockquote>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Unsupported Country Honest State (Test 3) */
                  <div
                    className="rounded-xl bg-amber-950/20 border border-amber-500/40 p-4 space-y-3"
                    data-testid="unsupported-country-notice"
                  >
                    <div className="text-sm font-semibold text-amber-200">
                      No Validated GAM Law Pack Available for {selectedCountry.name}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedCountry.notes ??
                        'This demonstration never fabricates statutory text or GAL relations. Select one of the verified jurisdictions below or inspect full provenance.'}
                    </p>
                    {getCatalogueForCountry(selectedCountry.code).length > 0 && (
                      <button
                        type="button"
                        data-testid={`browse-catalogue-${selectedCountry.code}`}
                        onClick={() => setActiveScreen('law-selection')}
                        className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-left text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/70 hover:bg-cyan-500/15"
                      >
                        Browse {getCatalogueForCountry(selectedCountry.code).length} catalogued legal sources
                      </button>
                    )}
                    <div className="pt-2 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase">
                        Try a Verified Jurisdiction:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COUNTRIES.filter((c) => c.supported).map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleSelectCountry(c)}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-xs text-cyan-200 transition-colors"
                          >
                            {c.flag} {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Primary CTA Buttons at Bottom of Drawer */}
            <div className="pt-4 mt-4 border-t border-slate-800 flex flex-col gap-2.5">
              {selectedCountry?.supported && selectedLaw && selectedProvision ? (
                <>
                  <button
                    type="button"
                    data-testid="world-process-law-button"
                    onClick={() => handleProcessLaw('curated')}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Process Legislation → GAL (Φ_L)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="world-inspect-law-details-button"
                    onClick={() => setActiveScreen('law-selection')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Inspect Full Statutory Provenance &amp; Modes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const ca = COUNTRIES.find((c) => c.code === 'CA') ?? COUNTRIES[0];
                    handleSelectCountry(ca);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/30 transition-colors"
                >
                  Select Canada (PIPEDA / PHIPA / Law 25)
                </button>
              )}
            </div>
          </aside>
        </main>
      )}

      {/* =====================================================================
          SCREEN 2: LAW SELECTION & PROVENANCE INSPECTOR
         ===================================================================== */}
      {activeScreen === 'law-selection' && (
        <main
          className="flex-1 p-4 max-w-[1920px] w-full mx-auto"
          data-testid="screen-law-selection"
        >
          <LawSelectorPanel
            country={selectedCountry}
            laws={countryLaws}
            catalogue={selectedCountry ? getCatalogueForCountry(selectedCountry.code) : []}
            selectedLaw={selectedLaw}
            selectedProvision={selectedProvision}
            onSelectLaw={handleSelectLaw}
            onSelectProvision={handleSelectProvision}
            onProcessLaw={handleProcessLaw}
            onTranslateSourcePassage={(inst, passage) => {
              setCustomLegalText(passage);
              setCustomSourceMeta({
                title: `${inst.shortName} · ${inst.citation}`,
                subtitle: `${inst.name} (${inst.jurisdiction})`,
                lawId: inst.id,
              });
              setTranslationMode('custom');
              setShowEditor(true);
            }}
            onBackToGlobe={() => setActiveScreen('world')}
          />
        </main>
      )}

      {/* =====================================================================
          SCREEN 3: SYNCHRONIZED 6-STAGE LAW → GAL TRANSLATION WORKSPACE
         ===================================================================== */}
      {activeScreen === 'translation' && (
        <div
          className="flex-1 flex flex-col max-w-[1920px] w-full mx-auto px-3 sm:px-4 py-3 gap-3"
          data-testid="screen-translation-workspace"
        >
          {/* Stage 1–6 Mathematical Transformation Banner & Live Trace Ticker (Agent G12) */}
          <PipelineStageBanner
            activeStage={timeline.currentStage}
            onSelectStage={(stage) => timeline.goToStage(stage)}
            readiness={translationResult.readiness}
            latestEvent={timeline.activeEvent}
            events={translationResult.events}
            translationResult={translationResult}
            onHighlightSpan={handleHighlightSpan}
            reducedMotion={a11y.reducedMotion}
          />

          {/* Deterministic Playback Control Bar & 6-Stage Stepper (Agent G10) */}
          <PlaybackControlBar
            currentStage={timeline.currentStage}
            currentStageIndex={timeline.currentStageIndex}
            isPlaying={timeline.isPlaying}
            speed={timeline.speed}
            progressPercent={timeline.progressPercent}
            onProcess={timeline.process}
            onPause={timeline.pause}
            onResume={timeline.resume}
            onReplay={timeline.replay}
            onPrevStep={timeline.prevStep}
            onNextStep={timeline.nextStep}
            onSelectStage={timeline.goToStage}
            onChangeSpeed={timeline.setSpeed}
            onReset={timeline.reset}
            onCopyGal={handleCopyGal}
            onDownloadGal={handleDownloadGal}
          />

          {/* Spatial Token Bridge: Shows Clause Span → Concept Token → GAM Sort → Directed Relation → GAL-JSON (Agent G12) */}
          <SpatialTokenBridge
            activeSpan={
              effectiveActiveSpan
                ? { start: effectiveActiveSpan.start, end: effectiveActiveSpan.end }
                : null
            }
            selectedClause={selectedClause}
            selectedConcept={selectedConcept}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            translationResult={translationResult}
            activeStage={timeline.currentStage}
            onHighlightSpan={handleHighlightSpan}
            reducedMotion={a11y.reducedMotion}
          />

          {/* 3-Column Synchronized Responsive Split Workspace (Agent G11) */}
          <ResponsiveStageLayout
            activeStage={timeline.currentStage}
            statusAnnouncement={
              timeline.activeEvent?.explanation ??
              `Active Stage: ${timeline.currentStage} for ${activeLaw.shortName} ${activeProvision.section}`
            }
            viewportMode={a11y.viewportMode}
            highContrastBorders={a11y.highContrastBorders}
            onOpenShortcuts={() => a11y.setIsShortcutsModalOpen(true)}
            /* COLUMN 1: Legal Document & Animated Clause Segmentation (Agent G04) */
            legalPassagePane={
              <div className="h-full flex flex-col">
                {/* Quick Jurisdiction / Provision Selector Bar inside Translation View */}
                <div className="mb-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <select
                      aria-label="Switch Jurisdiction"
                      data-testid="workspace-country-select"
                      value={selectedCountry?.code ?? 'CA'}
                      onChange={(e) => {
                        const c = COUNTRIES.find((item) => item.code === e.target.value);
                        if (c) handleSelectCountry(c);
                      }}
                      className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-200"
                    >
                      {COUNTRIES.filter((c) => c.supported).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Switch Law"
                      data-testid="workspace-law-select"
                      value={activeLaw.id}
                      onChange={(e) => {
                        const law = VERIFIED_LAWS.find((l) => l.id === e.target.value);
                        if (law) handleSelectLaw(law);
                      }}
                      className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-200 max-w-[180px] truncate"
                    >
                      {countryLaws.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.shortName}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Switch Provision"
                      data-testid="workspace-provision-select"
                      value={activeProvision.id}
                      onChange={(e) => {
                        const prov = activeLaw.provisions.find((p) => p.id === e.target.value);
                        if (prov) handleSelectProvision(prov);
                      }}
                      className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-200 max-w-[180px] truncate"
                    >
                      {activeLaw.provisions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.section} — {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Curated vs Live Pipeline Mode Toggle */}
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      data-testid="mode-curated-button"
                      onClick={() => setTranslationMode('curated')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        translationMode === 'curated'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Curated (Φ_L)
                    </button>
                    <button
                      type="button"
                      data-testid="mode-live-pipeline-button"
                      onClick={() => setTranslationMode('live-pipeline')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        translationMode === 'live-pipeline'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Live Engine
                    </button>
                  </div>
                </div>

                <LegalDocumentPanel
                  law={activeLaw}
                  provision={
                    translationMode === 'custom'
                      ? {
                          ...activeProvision,
                          title: 'Custom Statutory Clause (Live Sandbox)',
                          originalText: customLegalText,
                          readiness: 'unverified-draft',
                        }
                      : activeProvision
                  }
                  clauses={translationResult.clauses}
                  activeStage={timeline.currentStage}
                  activeSpan={effectiveActiveSpan}
                  selectedClauseId={selectedClause?.id ?? null}
                  onSelectClause={handleSelectClause}
                  onSelectSpan={handleHighlightSpan}
                  reducedMotion={a11y.reducedMotion}
                />
              </div>
            }
            /* COLUMN 2: Active GAM Pipeline Workspace (Stage 2 Concepts / Stage 3 Entities / Stage 4+ Directed Graph) */
            pipelineGraphPane={
              <div className="h-full flex flex-col">
                {/* Sub-navigation bar allowing direct inspection of Concepts, Entities, or Directed Graph at any time */}
                <div className="mb-2.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="center-tab-graph"
                      onClick={() => setCenterViewOverride('graph')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                        effectiveCenterTab === 'graph'
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Directed Graph (Φ) ({translationResult.graph.edges.length})</span>
                    </button>
                    <button
                      type="button"
                      data-testid="center-tab-entities"
                      onClick={() => setCenterViewOverride('entities')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                        effectiveCenterTab === 'entities'
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>4-Sort Entities ⟨P,A,R,U⟩ ({translationResult.graph.nodes.length})</span>
                    </button>
                    <button
                      type="button"
                      data-testid="center-tab-concepts"
                      onClick={() => setCenterViewOverride('concepts')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                        effectiveCenterTab === 'concepts'
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extracted Concepts ({translationResult.concepts.length})</span>
                    </button>
                  </div>

                  {centerViewOverride !== 'auto' && (
                    <button
                      type="button"
                      onClick={() => setCenterViewOverride('auto')}
                      className="text-[11px] text-cyan-400 hover:underline px-2"
                    >
                      Follow Stage Auto
                    </button>
                  )}
                </div>

                {effectiveCenterTab === 'concepts' && (
                  <ConceptExtractionWorkspace
                    concepts={translationResult.concepts}
                    unmappedConcepts={translationResult.unmappedConcepts}
                    clauses={translationResult.clauses}
                    selectedConceptId={selectedConcept?.id ?? null}
                    onSelectConcept={handleSelectConcept}
                    onHighlightSpan={handleHighlightSpan}
                    reducedMotion={a11y.reducedMotion}
                  />
                )}

                {effectiveCenterTab === 'entities' && (
                  <GamEntityNodesView
                    nodes={translationResult.graph.nodes}
                    unmappedConcepts={translationResult.unmappedConcepts}
                    selectedNodeId={selectedNode?.id ?? null}
                    onSelectNode={handleSelectNode}
                    onHighlightSpan={handleHighlightSpan}
                    reducedMotion={a11y.reducedMotion}
                  />
                )}

                {effectiveCenterTab === 'graph' && (
                  <GamRelationGraph
                    nodes={translationResult.graph.nodes}
                    edges={translationResult.graph.edges}
                    selectedNodeId={selectedNode?.id ?? null}
                    selectedEdgeId={selectedEdge?.id ?? null}
                    onSelectNode={handleSelectNode}
                    onSelectEdge={handleSelectEdge}
                    onHighlightSpan={handleHighlightSpan}
                    activeStage={timeline.currentStage}
                    reducedMotion={a11y.reducedMotion}
                  />
                )}
              </div>
            }
            /* COLUMN 3: Synchronized GAL-JSON Viewer (Stage 5) & Formal Validation / Alloy Emitter (Stage 6) */
            galValidationPane={
              <div className="h-full flex flex-col">
                <div className="mb-2.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="right-tab-gal-json"
                      onClick={() => setRightViewOverride('gal')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                        effectiveRightTab === 'gal'
                          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>GAL-JSON &amp; Algebra</span>
                    </button>
                    <button
                      type="button"
                      data-testid="right-tab-formal-validation"
                      onClick={() => setRightViewOverride('validation')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                        effectiveRightTab === 'validation'
                          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Formal Validation &amp; Alloy</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="quick-enterprise-closure-button"
                    onClick={() => setIsEnterpriseModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-medium transition-colors"
                  >
                    Compare Φ_L ∧ Φ_E Closure
                  </button>
                </div>

                {effectiveRightTab === 'gal' ? (
                  <GalJsonSynchronizedViewer
                    galModel={translationResult.galModel}
                    activeStage={timeline.currentStage}
                    selectedEntityId={selectedNode?.id ?? null}
                    selectedRelationId={selectedEdge?.id ?? null}
                    onSelectEntityId={handleSelectEntityById}
                    onSelectRelationId={handleSelectRelationById}
                    onHighlightSpan={handleHighlightSpan}
                    onCopyGal={handleCopyGal}
                    onDownloadGal={handleDownloadGal}
                    reducedMotion={a11y.reducedMotion}
                  />
                ) : (
                  <FormalValidationPanel
                    validation={translationResult.validation}
                    readiness={translationResult.readiness}
                    onHighlightSpan={handleHighlightSpan}
                    onOpenEnterpriseComparison={() => setIsEnterpriseModalOpen(true)}
                  />
                )}
              </div>
            }
          />
        </div>
      )}

      {/* Global Formal Tuple Legend Modal (Agent G01) */}
      <FormalTupleLegendModal
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />

      {/* Enterprise Closure & Consistency Comparison Modal (Agent G09 — Section 8) */}
      <EnterpriseComparisonModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
        cases={ENTERPRISE_COMPARISON_CASES}
      />

      {/* Keyboard Shortcuts & Accessibility Preferences Modal (Agent G11) */}
      <KeyboardShortcutsModal
        isOpen={a11y.isShortcutsModalOpen}
        onClose={() => a11y.setIsShortcutsModalOpen(false)}
        reducedMotion={a11y.reducedMotion}
        onToggleReducedMotion={a11y.toggleReducedMotion}
        highContrastBorders={a11y.highContrastBorders}
        onToggleHighContrastBorders={a11y.toggleHighContrastBorders}
        viewportOverride={a11y.viewportOverride}
        onChangeViewportOverride={a11y.setViewportOverride}
      />
    </div>
  );
}

export default App;
