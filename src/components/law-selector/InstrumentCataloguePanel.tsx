import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked, Cpu, ExternalLink, RotateCcw, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { SourceTextViewer } from './SourceTextViewer';
import type {
  CatalogueInstrument,
  InstrumentCategory,
  InstrumentStatus,
} from '../../types/contracts';

export interface InstrumentCataloguePanelProps {
  instruments: CatalogueInstrument[];
  /** Called for entries that have a bundled translation. */
  onOpenTranslatedLaw?: (lawId: string) => void;
  /** Called when the user loads an excerpt from a bundled source text into the live GAM-to-GAL pipeline/editor. */
  onTranslateSourcePassage?: (instrument: CatalogueInstrument, passage: string) => void;
}

type AvailabilityFilter = 'all' | 'bundled' | 'translated';

const STATUS_META: Record<InstrumentStatus, { label: string; classes: string }> = {
  'in-force': { label: 'In force', classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  phased: { label: 'Phased', classes: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  proposed: { label: 'Proposed', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  lapsed: { label: 'Lapsed', classes: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
  repealed: { label: 'Repealed', classes: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
  invalidated: { label: 'Invalidated / enjoined', classes: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
};

interface SourceTextEntry {
  status: 'fetched' | 'blocked' | 'failed' | 'no-source';
  file?: string;
  chars?: number;
  contentCheck?: 'match' | 'mismatch' | 'unchecked';
  retrievedAt?: string;
  sha256?: string;
  sources?: { url: string; kind: string }[];
  note?: string;
  error?: string;
}

const SOURCE_BASE = '/source-texts/';

function formatCharCount(chars?: number): string {
  if (!chars) return '0k';
  if (chars < 1000) return `${chars.toLocaleString()}`;
  return `${Math.round(chars / 1000).toLocaleString()}k`;
}

/** Provenance manifest written by scripts/fetch-sources.mjs; absent when no texts are bundled. */
function useSourceManifest(): Record<string, SourceTextEntry> {
  const [entries, setEntries] = useState<Record<string, SourceTextEntry>>({});
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`${SOURCE_BASE}manifest.json`);
        if (!res.ok) return;
        const json = (await res.json()) as { entries?: Record<string, SourceTextEntry> };
        if (live && json.entries) setEntries(json.entries);
      } catch {
        /* no manifest available: render without source-text links */
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  return entries;
}

export const InstrumentCataloguePanel: React.FC<InstrumentCataloguePanelProps> = ({
  instruments,
  onOpenTranslatedLaw,
  onTranslateSourcePassage,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<InstrumentCategory | 'all'>('all');
  const [jurisdiction, setJurisdiction] = useState<string>('all');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const sources = useSourceManifest();
  const [reading, setReading] = useState<CatalogueInstrument | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const handleQuickTranslate = async (inst: CatalogueInstrument) => {
    if (!onTranslateSourcePassage) return;
    const src = sources[inst.id];
    if (!src?.file) return;
    setTranslatingId(inst.id);
    try {
      const res = await fetch(`${SOURCE_BASE}${src.file}`);
      if (!res.ok) return;
      const text = new TextDecoder('utf-8').decode(await res.arrayBuffer());
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const cue = /\b(shall|must|may|prohibited|forbidden|required|obligated|authorized|permitted|entitled|consent|personal|disclose|access|process|controller|organization)\b/i;
      const normative = lines.filter((l) => l.length >= 60 && l.length <= 700 && cue.test(l));
      const picked = (normative.length > 0 ? normative : lines.filter((l) => l.length >= 40)).slice(0, 3).join(' ').slice(0, 1200);
      if (picked.trim()) onTranslateSourcePassage(inst, picked.trim());
    } finally {
      setTranslatingId(null);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(instruments.map((i) => i.category))).sort(),
    [instruments],
  );
  const jurisdictions = useMemo(
    () => Array.from(new Set(instruments.map((i) => i.jurisdiction))),
    [instruments],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instruments.filter((i) => {
      if (category !== 'all' && i.category !== category) return false;
      if (jurisdiction !== 'all' && i.jurisdiction !== jurisdiction) return false;
      if (availability === 'bundled') {
        const src = sources[i.id];
        if (!src || src.status !== 'fetched' || !src.file) return false;
      } else if (availability === 'translated') {
        if (!i.translatedLawId) return false;
      }
      if (!q) return true;
      return [i.name, i.shortName, i.citation, i.jurisdiction].some((f) => f.toLowerCase().includes(q));
    });
  }, [instruments, query, category, jurisdiction, availability, sources]);

  const hasActiveFilters =
    query !== '' || category !== 'all' || jurisdiction !== 'all' || availability !== 'all';

  const handleClearFilters = () => {
    setQuery('');
    setCategory('all');
    setJurisdiction('all');
    setAvailability('all');
  };

  if (instruments.length === 0) return null;

  return (
    <div data-testid="instrument-catalogue">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <BookMarked className="h-4 w-4 text-cyan-400" />
          Catalogued Instruments ({instruments.length})
        </h3>
        <span className="text-xs text-slate-400">
          Metadata and source links only. Not translated unless marked.
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <span className="sr-only">Search catalogued instruments</span>
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or citation"
            className="w-full rounded-lg border border-slate-800 bg-navy-950/70 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
          />
        </label>
        {jurisdictions.length > 1 && (
          <select
            aria-label="Filter by jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            className="rounded-lg border border-slate-800 bg-navy-950/70 px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="all">All jurisdictions ({jurisdictions.length})</option>
            {jurisdictions.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        )}
        <div
          className="inline-flex items-center rounded-lg border border-slate-800 bg-navy-950/80 p-0.5"
          role="group"
          aria-label="Source Availability"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'bundled', label: 'Bundled Full Text' },
              { id: 'translated', label: 'Translated in GAM' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAvailability(opt.id)}
              aria-pressed={availability === opt.id}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                availability === opt.id
                  ? 'bg-cyan-500/20 text-cyan-200 shadow-sm ring-1 ring-cyan-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-200"
          >
            <RotateCcw className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
        {(['all', ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
              category === c
                ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                : 'border-slate-800 bg-navy-950/70 text-slate-400 hover:border-slate-700'
            }`}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[11px] text-slate-500" aria-live="polite">
        Showing {filtered.length} of {instruments.length}. Citations were compiled without
        machine verification; confirm against the official source before relying on them.
      </p>

      <ul className="space-y-2">
        {filtered.map((i) => {
          const status = STATUS_META[i.status];
          return (
            <li
              key={i.id}
              data-testid={`catalogue-item-${i.id}`}
              className="rounded-xl border border-slate-800 bg-navy-950/70 p-3 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100">{i.shortName}</div>
                  <div className="mt-0.5 text-slate-400">{i.name}</div>
                  <div className="mt-1 font-mono text-[11px] text-cyan-300/90">{i.citation}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 ${status.classes}`}>{status.label}</span>
                  <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-slate-300">
                    {i.instrumentType}
                  </span>
                  {i.translatedLawId && (
                    <button
                      type="button"
                      onClick={() => onOpenTranslatedLaw?.(i.translatedLawId!)}
                      className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-cyan-200 hover:bg-cyan-500/25"
                    >
                      Translated excerpts available
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                <span>{i.jurisdiction}</span>
                <span>{i.category}</span>
                {i.effectiveDate && <span>Effective {i.effectiveDate}</span>}
                {(i.officialSourceUrl ?? sources[i.id]?.sources?.[0]?.url) && (
                  <a
                    href={i.officialSourceUrl ?? sources[i.id]?.sources?.[0]?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300"
                  >
                    Official source
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {i.statusNote && <p className="mt-1.5 text-amber-300/80">{i.statusNote}</p>}
              {(() => {
                const src = sources[i.id];
                if (!src) return null;
                if (src.status === 'fetched' && src.file) {
                  return (
                    <div className="mt-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-2.5 py-1.5 text-slate-400">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {src.contentCheck === 'match' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                            <ShieldCheck className="h-3 w-3" />
                            ✓ Verified text
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setReading(i)}
                          data-testid={`source-text-${i.id}`}
                          className="font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200"
                        >
                          Read source text
                        </button>
                        <span className="text-[11px] text-slate-400">
                          ({formatCharCount(src.chars)} characters
                          {src.retrievedAt ? `, retrieved ${src.retrievedAt.slice(0, 10)}` : ''})
                        </span>
                        {src.sha256 && (
                          <span
                            title={`SHA-256: ${src.sha256}`}
                            className="rounded border border-slate-700/80 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
                          >
                            SHA-256: {src.sha256.slice(0, 12)}…
                          </span>
                        )}
                        {onTranslateSourcePassage && (
                          <>
                            <span className="text-slate-600">·</span>
                            <button
                              type="button"
                              onClick={() => void handleQuickTranslate(i)}
                              disabled={translatingId === i.id}
                              data-testid={`translate-source-${i.id}`}
                              className="inline-flex items-center gap-1 font-medium text-emerald-300 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-200 disabled:opacity-50"
                            >
                              <Cpu className="h-3 w-3" />
                              {translatingId === i.id ? 'Loading…' : 'Translate excerpt → GAL'}
                            </button>
                          </>
                        )}
                        {src.contentCheck === 'mismatch' && (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <ShieldAlert className="h-3 w-3" />
                            content check failed: verify it is the right document
                          </span>
                        )}
                      </div>
                      {src.note && <span className="mt-1 block text-[11px] text-slate-500">{src.note}</span>}
                    </div>
                  );
                }
                return (
                  <p className="mt-1.5 text-slate-500">
                    Source text not bundled{src.note ? `: ${src.note}` : src.error ? `: ${src.error}` : '.'}
                  </p>
                );
              })()}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-slate-800 p-4 text-center text-xs text-slate-500">
            No catalogued instruments match these filters.
          </li>
        )}
      </ul>
      {reading && sources[reading.id]?.file && (
        <SourceTextViewer
          title={reading.name}
          citation={reading.citation}
          file={sources[reading.id].file!}
          officialSourceUrl={reading.officialSourceUrl ?? sources[reading.id]?.sources?.[0]?.url}
          retrievedAt={sources[reading.id].retrievedAt}
          sha256={sources[reading.id].sha256}
          note={sources[reading.id].note}
          onTranslatePassage={
            onTranslateSourcePassage
              ? (passage) => {
                  const inst = reading;
                  setReading(null);
                  onTranslateSourcePassage(inst, passage);
                }
              : undefined
          }
          onClose={() => setReading(null)}
        />
      )}
    </div>
  );
};
