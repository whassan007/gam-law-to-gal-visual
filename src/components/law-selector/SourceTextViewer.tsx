import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Play, Search, X } from 'lucide-react';

export interface SourceTextViewerProps {
  title: string;
  citation: string;
  file: string;
  officialSourceUrl?: string;
  retrievedAt?: string;
  sha256?: string;
  note?: string;
  onTranslatePassage?: (passage: string) => void;
  onClose: () => void;
}

const PAGE = 300;
const NORMATIVE_CUE = /\b(shall|must|may|prohibited|forbidden|required|obligated|authorized|permitted|entitled|consent|personal|disclose|access|process|controller|organization)\b/i;

function pickRepresentativeExcerpt(lines: string[]): string {
  const candidates = lines.filter((l) => l.length >= 60 && l.length <= 700 && NORMATIVE_CUE.test(l));
  const chosen = (candidates.length > 0 ? candidates : lines.filter((l) => l.length >= 40)).slice(0, 3);
  return (chosen.join(' ').slice(0, 1200) || lines.slice(0, 3).join(' ').slice(0, 1200)).trim();
}

/** In-app reader for a bundled source text (plain text, UTF-8) with find-in-text. */
export const SourceTextViewer: React.FC<SourceTextViewerProps> = ({
  title,
  citation,
  file,
  officialSourceUrl,
  retrievedAt,
  sha256,
  note,
  onTranslatePassage,
  onClose,
}) => {
  const [lines, setLines] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/source-texts/${file}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Decode explicitly as UTF-8: the server may omit the charset.
        const text = new TextDecoder('utf-8').decode(await res.arrayBuffer());
        if (live) setLines(text.split('\n').filter((l) => l.trim().length > 0));
      } catch (e) {
        if (live) setError(String((e as Error).message ?? e));
      }
    })();
    return () => {
      live = false;
    };
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Keep typing responsive on large instruments; render matches for the latest
  // deferred query while the input itself remains immediate.
  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim().toLowerCase();
  const normalizedLines = useMemo(() => lines?.map((line) => line.toLowerCase()) ?? null, [lines]);
  const matches = useMemo(
    () => {
      if (!lines || !normalizedLines || !q) return [];
      const found: Array<readonly [number, string]> = [];
      for (let i = 0; i < normalizedLines.length; i++) {
        if (normalizedLines[i].includes(q)) found.push([i, lines[i]]);
      }
      return found;
    },
    [lines, normalizedLines, q],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Source text: ${title}`}
      data-testid="source-text-viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-navy-900 text-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="font-mono text-xs text-cyan-300/90">{citation}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Retrieved {retrievedAt?.slice(0, 10) ?? 'unknown'} from the original publisher.
              {sha256 && <> SHA-256 {sha256.slice(0, 12)}…</>} Plain-text extraction: formatting, tables and
              figures may be simplified. Use the official source for authoritative wording.
            </p>
            {note && <p className="mt-1 text-[11px] text-amber-300/80">{note}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onTranslatePassage && lines && lines.length > 0 && (
              <button
                type="button"
                data-testid="translate-source-excerpt-button"
                onClick={() => onTranslatePassage(pickRepresentativeExcerpt(lines))}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
              >
                <Play className="h-3 w-3 fill-current" /> Translate excerpt → GAL
              </button>
            )}
            {officialSourceUrl && (
              <a
                href={officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400 underline underline-offset-2"
              >
                Official source <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button type="button" onClick={onClose} aria-label="Close source text" className="rounded-lg border border-slate-700 p-1.5 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <label className="relative m-3 block">
          <span className="sr-only">Find in text</span>
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find in text"
            className="w-full rounded-lg border border-slate-800 bg-navy-950/70 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
          />
        </label>

        <div className="flex-1 overflow-y-auto px-4 pb-4 font-serif text-sm leading-relaxed">
          {error && <p className="text-rose-300">Could not load the text ({error}).</p>}
          {!lines && !error && <p className="text-slate-500">Loading…</p>}
          {lines && q && (
            <>
              <p className="mb-2 text-xs text-slate-500" aria-live="polite">
                {matches.length} matching paragraph{matches.length === 1 ? '' : 's'}
                {matches.length > 200 ? ' (first 200 shown)' : ''}
              </p>
              {matches.slice(0, 200).map(([i, l]) => (
                <div key={i} className="group mb-2 flex items-start justify-between gap-2 rounded-lg p-1.5 hover:bg-slate-800/40">
                  <p className="whitespace-pre-wrap">{l}</p>
                  {onTranslatePassage && l.length >= 25 && (
                    <button
                      type="button"
                      data-testid={`translate-paragraph-${i}`}
                      onClick={() => onTranslatePassage(l)}
                      className="shrink-0 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-sans text-[11px] text-cyan-200 opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:bg-cyan-500/20"
                    >
                      Translate → GAL
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          {lines && !q && (
            <>
              {lines.slice(0, shown).map((l, i) => (
                <div key={i} className="group mb-1.5 flex items-start justify-between gap-2 rounded-lg p-1 hover:bg-slate-800/40">
                  <p className="whitespace-pre-wrap">{l}</p>
                  {onTranslatePassage && l.length >= 25 && (
                    <button
                      type="button"
                      data-testid={`translate-paragraph-${i}`}
                      onClick={() => onTranslatePassage(l)}
                      className="shrink-0 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-sans text-[11px] text-cyan-200 opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:bg-cyan-500/20"
                    >
                      Translate → GAL
                    </button>
                  )}
                </div>
              ))}
              {shown < lines.length && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="mt-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
                >
                  Show more ({lines.length - shown} paragraphs remaining)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
