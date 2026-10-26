import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookMarked, Download, FileJson, FileText, Globe2, Link2, Lock, Network, Printer, Redo2, RotateCcw, Save, Sigma, Undo2, X, Cpu,
} from 'lucide-react';
import type { CatalogueInstrument, CountryMetadata, LawMetadata, LawProvision } from '../../types/contracts';
import { INSTRUMENT_CATALOGUE, VERIFIED_LAWS, getCatalogueForCountry } from '../../data/verified-examples';
import { InstrumentCataloguePanel } from '../law-selector/InstrumentCataloguePanel';
import {
  EditorProvider, useEditor, saveDraft, loadDraft, clearDraft, encodeShare, docFromSeed,
  type EditorDoc, type EditorSeed, type SharePayload,
} from './editorState';
import { InputStatuteCard, PipelineStages, ValidationStatus } from './PipelineStages';
import { DeonticGraphCanvas, ALL_VISIBLE, type GraphCanvasHandle, type OperatorFilter } from './DeonticGraphCanvas';
import { EntityInspector } from './EntityInspector';
import { GalJsonViewer } from './GalJsonViewer';
import { PrintReport } from './PrintReport';
import { StatusPill, btn, btnGhost, input } from './ui';

export type EditorTheme = 'light' | 'system' | 'dark';
export type EditorMode = 'curated' | 'live-pipeline' | 'custom';

export interface DeonticEditorScreenProps {
  seed: EditorSeed;
  initialDoc?: EditorDoc;
  readOnly?: boolean;
  mode: EditorMode;
  customText: string;
  onCustomText: (text: string, sourceMeta?: { title: string; subtitle: string; lawId: string }) => void;
  countries: CountryMetadata[];
  countryLaws: LawMetadata[];
  selectedCountry: CountryMetadata | null;
  law: LawMetadata;
  provision: LawProvision;
  reducedMotion: boolean;
  onSelectCountry: (c: CountryMetadata) => void;
  onSelectLaw: (l: LawMetadata) => void;
  onSelectProvision: (p: LawProvision) => void;
  onChangeMode: (m: EditorMode) => void;
  onBackToGlobe: () => void;
  onOpenClassic: () => void;
  onMakeEditable: (doc: EditorDoc) => void;
}

const THEME_KEY = 'law-gal-editor:theme';

function readTheme(): EditorTheme {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

function useIsDesktop(): boolean {
  const query = '(min-width: 1024px)';
  const get = () => (typeof window === 'undefined' || typeof window.matchMedia !== 'function' ? true : window.matchMedia(query).matches);
  const [desktop, setDesktop] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return desktop;
}

function downloadText(filename: string, text: string, type: string) {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ReadinessPill: React.FC = () => {
  const { result, edited, readOnly } = useEditor();
  const label = { 'human-reviewed': 'Human-reviewed', 'actual-generated': 'Live generated', 'unverified-draft': 'Unverified draft', unsupported: 'Unsupported' }[result.readiness];
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusPill tone={result.readiness === 'human-reviewed' ? 'ok' : 'warning'}>{label}</StatusPill>
      {edited && <StatusPill tone="info">Edited · needs formal review</StatusPill>}
      {readOnly && <StatusPill tone="info"><Lock className="h-3 w-3" /> Read-only link</StatusPill>}
    </span>
  );
};

const DraftBanner: React.FC<{ suppressed: boolean }> = ({ suppressed }) => {
  const { seed, dispatch } = useEditor();
  const [draft, setDraft] = useState(() => (suppressed ? null : loadDraft(seed)));
  if (!draft) return null;
  return (
    <div className="ed-print-hide mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-ed-accent bg-ed-accent-soft px-3 py-2 text-xs text-ed-text" role="status" data-testid="draft-banner">
      <Save className="h-3.5 w-3.5 text-ed-accent" />
      A local draft of this provision was saved {new Date(draft.savedAt).toLocaleString()}.
      <span className="ml-auto flex gap-2">
        <button type="button" className={btn} onClick={() => { dispatch({ type: 'load', doc: draft.doc, edited: true }); setDraft(null); }}>Restore draft</button>
        <button type="button" className={btnGhost} onClick={() => { clearDraft(seed); setDraft(null); }}>Discard</button>
      </span>
    </div>
  );
};

const EditorBody: React.FC<Omit<DeonticEditorScreenProps, 'seed' | 'initialDoc' | 'readOnly'> & { theme: EditorTheme; onThemeChange: (t: EditorTheme) => void; booted: boolean }> = (props) => {
  const { seed, doc, result, issues, edited, readOnly, canUndo, canRedo, dispatch, selection } = useEditor();
  const { theme, onThemeChange, mode } = props;
  const graphRef = useRef<GraphCanvasHandle>(null);
  const validationRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<OperatorFilter>(ALL_VISIBLE);
  const [focusSignal, setFocusSignal] = useState(0);
  const [toast, setToast] = useState('');
  const [statuteDraft, setStatuteDraft] = useState(props.customText);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [printSvg, setPrintSvg] = useState<string | null>(null);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueScope, setCatalogueScope] = useState<'country' | 'all'>('country');
  const desktop = useIsDesktop();
  const countryCatalogue = useMemo(
    () => (props.selectedCountry ? getCatalogueForCountry(props.selectedCountry.code) : []),
    [props.selectedCountry],
  );
  const activeCatalogue = catalogueScope === 'all' || countryCatalogue.length === 0 ? INSTRUMENT_CATALOGUE : countryCatalogue;
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.length - errors;
  const fileBase = `${seed.lawId}-${seed.provisionId}`;

  const notify = useCallback((msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 2500); }, []);
  const copy = useCallback((text: string, what = 'Copied') => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => notify(what), () => notify('Copy failed; select and copy manually.'));
    else notify('Clipboard unavailable in this browser.');
  }, [notify]);

  const handlers = {
    onCopyJson: () => copy(JSON.stringify(result.galModel, null, 2), 'GAL-JSON copied'),
    onDownloadJson: () => downloadText(`${fileBase}-gal.json`, JSON.stringify(result.galModel, null, 2), 'application/json'),
    onDownloadAlloy: () => downloadText(`${fileBase}.als`, result.validation.alloySpecification, 'text/plain'),
  };

  const printReport = () => {
    graphRef.current?.fit();
    // Let the fit transform render before serialising the SVG.
    window.setTimeout(() => {
      setPrintSvg(graphRef.current?.getSvgMarkup() ?? null);
      window.setTimeout(() => { window.print(); setPrintSvg(null); }, 50);
    }, 50);
  };

  const share = async (shareReadOnly: boolean) => {
    const payload: SharePayload = { v: 1, lawId: seed.lawId, provisionId: seed.provisionId, mode, customText: mode === 'custom' ? props.customText : undefined, readOnly: shareReadOnly, doc };
    const token = await encodeShare(payload);
    const url = `${window.location.origin}${window.location.pathname}#share=${token}`;
    setShareUrl(url);
    copy(url, shareReadOnly ? 'Read-only link copied' : 'Editable link copied');
  };

  // Keyboard: undo/redo outside text fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  // On small screens, selecting something in the graph context opens the editor modal.
  useEffect(() => { if (!desktop && selection.kind === 'pending') setGraphModalOpen(true); }, [desktop, selection.kind]);

  const graph = (
    <DeonticGraphCanvas
      ref={graphRef}
      filter={filter}
      onFilterChange={setFilter}
      onEditEntity={() => setFocusSignal((n) => n + 1)}
      reducedMotion={props.reducedMotion}
      className="h-full"
    />
  );

  const rightPane = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-h-[340px] flex-[3] flex-col overflow-hidden rounded-xl border border-ed-border bg-ed-surface shadow-[0_1px_2px_var(--color-shadow)]" data-testid="deontic-graph-editor">
        <div className="flex items-center gap-2 border-b border-ed-border px-3 py-2">
          <Network className="h-4 w-4 text-ed-accent" />
          <h2 className="text-sm font-semibold text-ed-text">Deontic logic graph</h2>
          <span className="text-[11px] text-ed-subtle">{result.graph.nodes.length} entities · {result.graph.edges.length} relations</span>
        </div>
        {graph}
      </div>
      <div className="grid min-h-0 flex-[2] grid-cols-1 gap-3 overflow-hidden xl:grid-cols-2">
        <div className="min-h-0 overflow-auto rounded-xl border border-ed-border bg-ed-surface p-3"><EntityInspector focusSignal={focusSignal} /></div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-ed-border bg-ed-surface p-3"><GalJsonViewer onCopy={(t) => copy(t)} /></div>
      </div>
    </div>
  );

  return (
    <>
      <header className="ed-print-hide sticky top-0 z-30 border-b border-ed-border bg-ed-surface">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ed-accent-soft"><Sigma className="h-4 w-4 text-ed-accent" /></span>
            <div>
              <div className="text-sm font-bold text-ed-text">LAW → GAL <span className="font-medium text-ed-subtle">Deontic Editor</span></div>
              <div className="font-mono text-[10px] text-ed-subtle">Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Jurisdiction" data-testid="editor-country-select" className={`${input} w-auto`} value={props.selectedCountry?.code ?? ''} onChange={(e) => { const c = props.countries.find((x) => x.code === e.target.value); if (c) props.onSelectCountry(c); }}>
              {props.countries.filter((c) => c.supported || getCatalogueForCountry(c.code).length > 0).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}{!c.supported ? ` (${getCatalogueForCountry(c.code).length} sources)` : ''}
                </option>
              ))}
            </select>
            {props.countryLaws.length > 0 && (
              <>
                <select aria-label="Law" data-testid="editor-law-select" className={`${input} w-auto max-w-[11rem]`} value={props.law.id} onChange={(e) => { const l = props.countryLaws.find((x) => x.id === e.target.value); if (l) props.onSelectLaw(l); }}>
                  {props.countryLaws.map((l) => <option key={l.id} value={l.id}>{l.shortName}</option>)}
                </select>
                <select aria-label="Provision" data-testid="editor-provision-select" className={`${input} w-auto max-w-[14rem]`} value={props.provision.id} onChange={(e) => { const p = props.law.provisions.find((x) => x.id === e.target.value); if (p) props.onSelectProvision(p); }}>
                  {props.law.provisions.map((p) => <option key={p.id} value={p.id}>{p.section} — {p.title}</option>)}
                </select>
              </>
            )}
            <button
              type="button"
              className={btn}
              onClick={() => setCatalogueOpen(true)}
              data-testid="editor-open-catalogue"
              title="Browse all 338 catalogued legal instruments and 247 bundled source texts"
            >
              <BookMarked className="h-3.5 w-3.5 text-ed-accent" />
              <span>Catalogue ({countryCatalogue.length > 0 ? `${countryCatalogue.length}/${INSTRUMENT_CATALOGUE.length}` : INSTRUMENT_CATALOGUE.length})</span>
            </button>
            <div role="radiogroup" aria-label="Translation source" className="flex rounded-md border border-ed-border p-0.5">
              {(['curated', 'live-pipeline'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => props.onChangeMode(m)} data-testid={`editor-mode-${m}`}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${mode === m ? 'bg-ed-accent-soft text-ed-accent' : 'text-ed-muted hover:text-ed-text'}`}>
                  {m === 'curated' ? 'Curated Φ_L' : 'Live engine'}
                </button>
              ))}
              {mode === 'custom' && <span className="rounded bg-ed-accent-soft px-2 py-0.5 text-[11px] font-medium text-ed-accent">Custom clause</span>}
            </div>
          </div>
          <ReadinessPill />
          <nav className="ml-auto flex items-center gap-1" aria-label="Other views">
            <button type="button" className={btnGhost} onClick={props.onBackToGlobe} data-testid="editor-back-to-globe"><Globe2 className="h-3.5 w-3.5" /> Globe</button>
            <button type="button" className={btnGhost} onClick={props.onOpenClassic} data-testid="editor-open-classic"><Cpu className="h-3.5 w-3.5" /> Animated pipeline</button>
          </nav>
        </div>
      </header>

      <DraftBanner suppressed={props.booted || readOnly} />
      {readOnly && (
        <div className="ed-print-hide mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-ed-border bg-ed-sunken px-3 py-2 text-xs text-ed-text">
          <Lock className="h-3.5 w-3.5" /> You are viewing a read-only shared model.
          <button type="button" className={`${btn} ml-auto`} onClick={() => props.onMakeEditable(doc)}>Make an editable copy</button>
        </div>
      )}

      <main className="ed-print-hide mx-auto grid w-full max-w-[1920px] flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-3" data-testid="editor-left-pane">
          <div className="flex items-end justify-between gap-3 px-1 pb-1">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ed-accent">Policy ontology workspace</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-ed-text">From statute to structure</h1><p className="mt-1 text-xs text-ed-muted">Six stages. One synchronized legal model.</p></div>
            <span className="rounded-full border border-ed-border bg-ed-surface px-2 py-1 text-[11px] text-ed-success">● Live sync</span>
          </div>
          <InputStatuteCard />
          {!readOnly && <details className="rounded-xl border border-ed-border bg-ed-surface px-4 py-3">
            <summary className="cursor-pointer text-xs font-medium text-ed-accent">Translate your own statute</summary>
            <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (statuteDraft.trim()) props.onCustomText(statuteDraft.trim()); }}>
              <label htmlFor="custom-statute" className="block text-xs text-ed-muted">Statute text</label>
              <textarea id="custom-statute" className={`${input} min-h-28 leading-relaxed`} value={statuteDraft} onChange={(e) => setStatuteDraft(e.target.value)} />
              <button type="submit" className={btn} disabled={!statuteDraft.trim()}>Translate statute →</button>
            </form>
          </details>}
          <PipelineStages {...handlers} />
          <div ref={validationRef}><ValidationStatus /></div>
        </div>
        {desktop ? (
          <aside className="min-w-0 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-9rem)]" data-testid="editor-right-pane">{rightPane}</aside>
        ) : (
          <button type="button" className={`${btn} fixed bottom-16 right-4 z-30 shadow-lg`} onClick={() => setGraphModalOpen(true)} data-testid="open-graph-modal">
            <Network className="h-4 w-4" /> Open graph editor
          </button>
        )}
      </main>

      {!desktop && graphModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Deontic graph editor" className="ed-print-hide fixed inset-0 z-50 flex flex-col bg-ed-bg" data-testid="graph-modal">
          <div className="flex items-center gap-2 border-b border-ed-border bg-ed-surface px-4 py-2">
            <Network className="h-4 w-4 text-ed-accent" />
            <h2 className="text-sm font-semibold text-ed-text">Deontic logic graph</h2>
            <button type="button" className={`${btnGhost} ml-auto`} onClick={() => setGraphModalOpen(false)} aria-label="Close graph editor"><X className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">{rightPane}</div>
        </div>
      )}

      {catalogueOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Catalogued Legal Instruments & Source Texts"
          data-testid="editor-catalogue-modal"
          className="ed-print-hide fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setCatalogueOpen(false)}
        >
          <div
            className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-navy-900 text-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3.5">
              <div>
                <h2 className="text-base font-bold text-white">
                  Legislative Source Catalogue &amp; Bundled Texts ({INSTRUMENT_CATALOGUE.length} instruments · 247 full texts)
                </h2>
                <p className="text-xs text-slate-400">
                  Read bundled full texts or load any statutory excerpt directly into the Deontic Editor via <span className="font-mono text-cyan-300">readLawToGAM</span>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {countryCatalogue.length > 0 && (
                  <div role="group" aria-label="Catalogue scope" className="inline-flex rounded-lg border border-slate-700 bg-navy-950 p-0.5 text-xs">
                    <button
                      type="button"
                      data-testid="catalogue-scope-country"
                      onClick={() => setCatalogueScope('country')}
                      className={`rounded-md px-2.5 py-1 font-medium ${catalogueScope === 'country' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {props.selectedCountry?.flag} {props.selectedCountry?.name} ({countryCatalogue.length})
                    </button>
                    <button
                      type="button"
                      data-testid="catalogue-scope-all"
                      onClick={() => setCatalogueScope('all')}
                      className={`rounded-md px-2.5 py-1 font-medium ${catalogueScope === 'all' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      All Jurisdictions ({INSTRUMENT_CATALOGUE.length})
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setCatalogueOpen(false)}
                  aria-label="Close catalogue"
                  className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <InstrumentCataloguePanel
                instruments={activeCatalogue}
                onOpenTranslatedLaw={(lawId) => {
                  const foundLaw = VERIFIED_LAWS.find((l) => l.id === lawId);
                  if (foundLaw) {
                    const c = props.countries.find((x) => x.code === foundLaw.countryCode);
                    if (c) props.onSelectCountry(c);
                    props.onSelectLaw(foundLaw);
                    setCatalogueOpen(false);
                  }
                }}
                onTranslateSourcePassage={(inst: CatalogueInstrument, passage: string) => {
                  const c = props.countries.find((x) => x.code === inst.countryCode);
                  if (c) props.onSelectCountry(c);
                  setStatuteDraft(passage);
                  props.onCustomText(passage, {
                    title: `${inst.shortName} · ${inst.citation}`,
                    subtitle: `${inst.name} (${inst.jurisdiction})`,
                    lawId: inst.id,
                  });
                  setCatalogueOpen(false);
                  notify(`Loaded excerpt from ${inst.shortName} into live pipeline`);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <footer className="ed-print-hide sticky bottom-0 z-30 border-t border-ed-border bg-ed-surface" data-testid="editor-bottom-bar">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-2 px-4 py-2">
          <div className="flex items-center gap-1" role="group" aria-label="History">
            <button type="button" className={btn} onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo || readOnly} aria-label="Undo" title="Undo (⌘/Ctrl+Z)" data-testid="editor-undo"><Undo2 className="h-3.5 w-3.5" /></button>
            <button type="button" className={btn} onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo || readOnly} aria-label="Redo" title="Redo (⇧⌘/Ctrl+Z)" data-testid="editor-redo"><Redo2 className="h-3.5 w-3.5" /></button>
            <button type="button" className={btn} disabled={readOnly} onClick={() => notify(saveDraft(seed, doc) ? 'Draft saved in this browser' : 'Browser storage unavailable')} data-testid="editor-save-draft"><Save className="h-3.5 w-3.5" /> Save draft</button>
            {edited && !readOnly && (
              <button type="button" className={btn} onClick={() => dispatch({ type: 'load', doc: docFromSeed(seed), edited: false })} data-testid="editor-reset"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
            )}
          </div>
          <button type="button" onClick={() => validationRef.current?.scrollIntoView({ behavior: props.reducedMotion ? 'auto' : 'smooth', block: 'start' })} className="flex items-center gap-1.5" data-testid="editor-validation-summary">
            <StatusPill tone={errors ? 'error' : 'ok'}>{errors} error{errors === 1 ? '' : 's'}</StatusPill>
            <StatusPill tone={warnings ? 'warning' : 'ok'}>{warnings} warning{warnings === 1 ? '' : 's'}</StatusPill>
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-1" role="group" aria-label="Export and share">
            <button type="button" className={btn} onClick={handlers.onDownloadJson} data-testid="editor-export-json"><FileJson className="h-3.5 w-3.5" /> GAL-JSON</button>
            <button type="button" className={btn} onClick={handlers.onDownloadAlloy} data-testid="editor-export-alloy"><Download className="h-3.5 w-3.5" /> Alloy .als</button>
            <button type="button" className={btn} onClick={printReport} data-testid="editor-export-pdf"><Printer className="h-3.5 w-3.5" /> PDF report</button>
            <button type="button" className={btn} onClick={() => share(true)} data-testid="editor-share-readonly"><Link2 className="h-3.5 w-3.5" /> Share read-only</button>
            <button type="button" className={btn} onClick={() => share(false)} disabled={readOnly} data-testid="editor-share-editable"><Link2 className="h-3.5 w-3.5" /> Share editable</button>
            <select aria-label="Theme" className={`${input} w-auto`} value={theme} onChange={(e) => onThemeChange(e.target.value as EditorTheme)} data-testid="editor-theme-select">
              <option value="light">Light</option>
              <option value="system">System</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        {shareUrl && (
          <div className="mx-auto flex max-w-[1920px] items-center gap-2 px-4 pb-2 text-xs">
            <FileText className="h-3.5 w-3.5 text-ed-subtle" />
            <input readOnly aria-label="Share link" className={`${input} flex-1 font-mono`} value={shareUrl} onFocus={(e) => e.target.select()} data-testid="editor-share-url" />
            <span className="text-ed-subtle">The model travels in the link fragment; no server stores it.</span>
            <button type="button" className={btnGhost} onClick={() => setShareUrl(null)} aria-label="Hide share link"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </footer>

      <div aria-live="polite" className="ed-print-hide pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
        {toast && <div className="rounded-md bg-ed-text px-3 py-1.5 text-xs text-ed-bg shadow-lg">{toast}</div>}
      </div>

      <PrintReport graphSvg={printSvg} />
    </>
  );
};

export const DeonticEditorScreen: React.FC<DeonticEditorScreenProps> = ({ seed, initialDoc, readOnly = false, ...rest }) => {
  const [theme, setTheme] = useState<EditorTheme>(readTheme);
  const changeTheme = (t: EditorTheme) => {
    setTheme(t);
    try { window.localStorage.setItem(THEME_KEY, t); } catch { /* storage unavailable */ }
  };
  return (
    <div className="law-editor flex min-h-screen flex-col" data-theme={theme} data-testid="screen-deontic-editor">
      <EditorProvider key={`${seed.key}:${readOnly}`} seed={seed} initialDoc={initialDoc} readOnly={readOnly}>
        <EditorBody {...rest} theme={theme} onThemeChange={changeTheme} booted={!!initialDoc} />
      </EditorProvider>
    </div>
  );
};

export { ArrowLeft };
