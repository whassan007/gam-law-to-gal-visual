import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { GamSort } from '../../types/contracts';
import { OPERATOR_META, type DeonticOperator } from './deontic';

export const btn = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-ed-border bg-ed-surface px-2.5 py-1.5 text-xs font-medium text-ed-text hover:border-ed-strong hover:bg-ed-sunken disabled:opacity-40 disabled:pointer-events-none transition-colors';
export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-ed-accent bg-ed-accent px-2.5 py-1.5 text-xs font-semibold text-ed-on-accent hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-opacity';
export const btnGhost = 'inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-ed-muted hover:text-ed-text hover:bg-ed-sunken disabled:opacity-40 disabled:pointer-events-none';
export const input = 'w-full rounded-md border border-ed-border bg-ed-surface px-2 py-1 text-xs text-ed-text placeholder:text-ed-subtle focus:border-ed-accent focus:outline-none';

export const OperatorBadge: React.FC<{ operator: DeonticOperator | null; inferred?: boolean; className?: string }> = ({ operator, inferred, className = '' }) => {
  if (!operator) {
    return <span className={`op-badge ${className}`} style={{ ['--op-color' as string]: 'var(--color-text-tertiary)' }}>Structural</span>;
  }
  return (
    <span
      className={`op-badge ${className}`}
      style={{ ['--op-color' as string]: OPERATOR_META[operator].color }}
      title={`${operator}: ${OPERATOR_META[operator].gloss}${inferred ? ' (inferred from source wording; not recorded in GAL)' : ''}`}
      data-operator={operator}
    >
      {operator}
      {inferred && <span aria-label="inferred" className="font-normal opacity-70">*</span>}
    </span>
  );
};

const SORT_TOKEN: Record<GamSort | 'Unmapped', string> = { Process: 'p', Activity: 'a', Role: 'r', User: 'u', Unmapped: 'x' };
export const sortColors = (sort: GamSort | 'Unmapped' | undefined) => {
  const t = SORT_TOKEN[sort ?? 'Unmapped'];
  return { fill: `var(--color-sort-${t}-fill)`, stroke: `var(--color-sort-${t})` };
};
export const sortLetter = (sort: GamSort | 'Unmapped' | undefined) => (sort && sort !== 'Unmapped' ? sort[0] : '?');

export const SortChip: React.FC<{ sort: GamSort | 'Unmapped' | undefined }> = ({ sort }) => {
  const c = sortColors(sort);
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
      style={{ background: c.fill, borderColor: c.stroke, color: c.stroke }}
      title={sort ?? 'Unmapped'}
      aria-label={sort ?? 'Unmapped'}
    >
      {sortLetter(sort)}
    </span>
  );
};

export const StatusPill: React.FC<{ tone: 'ok' | 'warning' | 'error' | 'info'; children: React.ReactNode }> = ({ tone, children }) => {
  const cls = {
    ok: 'bg-ed-success-soft text-ed-success border-ed-success',
    warning: 'bg-ed-warning-soft text-ed-warning border-ed-warning',
    error: 'bg-ed-error-soft text-ed-error border-ed-error',
    info: 'bg-ed-accent-soft text-ed-accent border-ed-accent',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
};

/** One pipeline stage card. Collapsible detail keeps dense technical output out of the default view. */
export const StageCard: React.FC<{
  index: number;
  title: string;
  description: string;
  stageColor: string;
  status: React.ReactNode;
  active?: boolean;
  actions?: React.ReactNode;
  details?: React.ReactNode;
  detailsLabel?: string;
  defaultOpen?: boolean;
  testId?: string;
  children?: React.ReactNode;
}> = ({ index, title, description, stageColor, status, active, actions, details, detailsLabel = 'Details', defaultOpen = false, testId, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section
      data-testid={testId}
      aria-labelledby={`${testId}-title`}
      className={`rounded-xl border bg-ed-surface shadow-[0_1px_2px_var(--color-shadow)] transition-colors ${active ? 'border-ed-accent' : 'border-ed-border'}`}
    >
      <header className="flex items-start gap-3 border-b border-ed-border px-4 py-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-ed-text"
          style={{ background: stageColor }}
          aria-hidden="true"
        >
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`${testId}-title`} className="text-[11px] font-semibold uppercase tracking-wider text-ed-muted">
            Stage {index} · {title}
          </h3>
          <p className="text-xs text-ed-subtle">{description}</p>
        </div>
        <div className="shrink-0">{status}</div>
      </header>
      {children && <div className="px-4 py-3">{children}</div>}
      {(details || actions) && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-ed-border px-4 py-2">
          {details && (
            <button type="button" className={btnGhost} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? `Hide ${detailsLabel.toLowerCase()}` : detailsLabel}
            </button>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
        </footer>
      )}
      {details && open && <div className="border-t border-ed-border bg-ed-sunken px-4 py-3">{details}</div>}
    </section>
  );
};

/** Lightweight JSON syntax highlighter; marks lines that mention a selected id. */
export const HighlightedJson: React.FC<{ value: unknown; markIds?: Set<string>; className?: string; testId?: string }> = ({ value, markIds, className = '', testId }) => {
  const text = React.useMemo(() => JSON.stringify(value, null, 2), [value]);
  const lines = React.useMemo(() => text.split('\n'), [text]);
  const token = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b/g;
  const renderLine = (line: string) => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    for (const m of line.matchAll(token)) {
      if (m.index! > last) parts.push(line.slice(last, m.index));
      if (m[1]) parts.push(<span key={m.index} className={m[2] ? 'k' : 's'}>{m[1]}</span>, m[2] ?? '');
      else if (m[3]) parts.push(<span key={m.index} className="n">{m[3]}</span>);
      else parts.push(<span key={m.index} className="l">{m[4]}</span>);
      last = m.index! + m[0].length;
    }
    parts.push(line.slice(last));
    return parts;
  };
  return (
    <pre data-testid={testId} className={`ed-json overflow-auto text-[11px] leading-[1.15rem] text-ed-text ${className}`}>
      {lines.map((line, i) => {
        const marked = markIds && markIds.size > 0 && [...markIds].some((id) => line.includes(`"${id}"`));
        return <div key={i}>{marked ? <mark>{renderLine(line)}</mark> : renderLine(line)}</div>;
      })}
    </pre>
  );
};
