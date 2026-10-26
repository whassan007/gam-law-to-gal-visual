import React, { useMemo, useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { useEditor, highlightedIds } from './editorState';
import { projectPhi } from './deontic';
import { HighlightedJson, btnGhost } from './ui';

export const GalJsonViewer: React.FC<{ onCopy: (text: string) => void; defaultOpen?: boolean }> = ({ onCopy, defaultOpen = false }) => {
  const { result, doc, selection } = useEditor();
  const [tab, setTab] = useState<'phi' | 'gal'>('phi');
  const [open, setOpen] = useState(defaultOpen);
  const phi = useMemo(() => projectPhi(result.galModel, doc.annotations), [result.galModel, doc.annotations]);
  const marks = highlightedIds(selection, doc, result.clauses);
  const value = tab === 'phi' ? phi : result.galModel;
  const serialized = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const stats = useMemo(() => {
    const lines = serialized.split('\n').length;
    const bytes = new TextEncoder().encode(serialized).length;
    const byteLabel = bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
    return { lines, byteLabel };
  }, [serialized]);

  return (
    <section aria-label="GAL-JSON output" className="flex min-h-0 min-w-0 flex-col" data-testid="editor-gal-json-viewer">
      <div className="mb-2 flex items-center gap-1">
        <button type="button" className={btnGhost} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Output</span>
          <span className="text-[10px] font-normal text-ed-subtle">({open ? 'Collapse' : 'Expand'})</span>
        </button>
        <div role="tablist" aria-label="Output format" className="ml-1 flex rounded-md border border-ed-border p-0.5">
          {(['phi', 'gal'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => { setTab(t); setOpen(true); }}
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${tab === t ? 'bg-ed-accent-soft text-ed-accent' : 'text-ed-muted hover:text-ed-text'}`}
            >
              {t === 'phi' ? 'Φ tuple' : 'GAL-JSON'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="rounded border border-ed-border bg-ed-sunken px-1.5 py-0.5 font-mono text-[10px] text-ed-subtle"
            title={`${stats.lines} lines · ${stats.byteLabel}`}
          >
            {stats.lines} lines · {stats.byteLabel}
          </span>
          <button type="button" className={btnGhost} onClick={() => onCopy(serialized)} aria-label={`Copy ${tab === 'phi' ? 'Φ tuple' : 'GAL-JSON'}`}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      </div>
      {open && (
        <HighlightedJson
          value={value}
          markIds={new Set([...marks.nodes, ...marks.edges])}
          testId="editor-gal-json"
          className="max-h-[22rem] min-h-0 flex-1 rounded-lg border border-ed-border bg-ed-sunken p-2"
        />
      )}
      {open && tab === 'phi' && (
        <p className="mt-1 text-[11px] text-ed-subtle">Projection of the GAL model onto Φ. Operator and confidence are editor annotations; the exported GAL-JSON records modality and deontic status.</p>
      )}
    </section>
  );
};
