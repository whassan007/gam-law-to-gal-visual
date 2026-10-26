import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Copy, Download, FileText, Pencil, Plus, Trash2, XCircle, Link2, Eye,
} from 'lucide-react';
import type { ExtractedConceptToken, GamSort, SegmentedClause } from '../../types/contracts';
import { useEditor, highlightedIds, type Selection } from './editorState';
import {
  listEdges, operatorInfo, statusFor, STRUCTURAL_FAMILIES, familyOf, type EditorIssue,
} from './deontic';
import { StageCard, StatusPill, OperatorBadge, SortChip, HighlightedJson, btn, btnGhost, input } from './ui';
import { entitySort } from '../../engine/gam-adapter';

const CONCEPT_CATEGORIES: ExtractedConceptToken['category'][] = [
  'Actor', 'Role', 'Activity', 'Process', 'Permission', 'Prohibition', 'Condition', 'Exception', 'Delegation', 'Structure', 'Ordering', 'Unmapped',
];
const SORTS: GamSort[] = ['Process', 'Activity', 'Role', 'User'];

function activeStageFor(sel: Selection): number {
  return { clause: 1, concept: 2, node: 3, edge: 4, pending: 4, none: 0 }[sel.kind];
}

export interface ExportHandlers {
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onDownloadAlloy: () => void;
}

// ─── Input statute ─────────────────────────────────────────────────────────────

export const InputStatuteCard: React.FC = () => {
  const { seed, result, selection, select } = useEditor();
  const [open, setOpen] = useState(true);
  const text = seed.sourceText;
  const selectedClause = selection.kind === 'clause' ? result.clauses.find((c) => c.id === selection.id) : undefined;

  // Render the statute with each clause as a clickable span (offsets are absolute into the source text).
  const segments = useMemo(() => {
    const spans = [...result.clauses].sort((a, b) => a.sourceSpan.start - b.sourceSpan.start);
    const out: Array<{ text: string; clause?: SegmentedClause }> = [];
    let cursor = 0;
    for (const c of spans) {
      if (c.sourceSpan.start < cursor || c.sourceSpan.end > text.length) continue;
      if (c.sourceSpan.start > cursor) out.push({ text: text.slice(cursor, c.sourceSpan.start) });
      out.push({ text: text.slice(c.sourceSpan.start, c.sourceSpan.end), clause: c });
      cursor = c.sourceSpan.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }, [result.clauses, text]);

  return (
    <section className="rounded-xl border border-ed-border bg-ed-surface shadow-[0_1px_2px_var(--color-shadow)]" data-testid="editor-statute-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--color-stage-input)' }} aria-hidden="true">
          <FileText className="h-4 w-4 text-ed-text" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Input statute</span>
          <span className="block truncate text-sm font-semibold text-ed-text">{seed.title}</span>
          <span className="block truncate text-xs text-ed-subtle">{seed.subtitle}</span>
        </span>
        <span className="text-xs text-ed-accent">{open ? 'Collapse' : 'Expand'}</span>
      </button>
      {open && (
        <div className="border-t border-ed-border px-4 py-3">
          <p className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-ed-text" data-testid="editor-statute-text">
            {segments.map((s, i) =>
              s.clause ? (
                <span
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => select({ kind: 'clause', id: s.clause!.id })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select({ kind: 'clause', id: s.clause!.id }); } }}
                  className={`cursor-pointer rounded-sm transition-colors ${selectedClause?.id === s.clause.id ? 'bg-ed-accent-soft underline decoration-ed-accent decoration-2 underline-offset-2' : 'hover:bg-ed-sunken'}`}
                  title={`Clause ${s.clause.index + 1}`}
                >
                  {s.text}
                </span>
              ) : (
                <span key={i} className="text-ed-subtle">{s.text}</span>
              ),
            )}
          </p>
        </div>
      )}
    </section>
  );
};

// ─── Stage 1 ───────────────────────────────────────────────────────────────────

const Stage1: React.FC<{ active: boolean }> = ({ active }) => {
  const { result, selection, select } = useEditor();
  const { clauses, validation } = result;
  const mapped = validation.mappedClauseCount;
  const modalityTone = (m: SegmentedClause['deonticModality']) => (m === 'Prohibited' ? 'var(--color-deontic-prohibit)' : m === 'Obligatory' ? 'var(--color-deontic-must)' : m === 'Permitted' ? 'var(--color-deontic-may)' : 'var(--color-text-tertiary)');
  return (
    <StageCard
      index={1}
      testId="stage-card-segment"
      title="Text segmentation"
      description="Input statute split into normative clauses"
      stageColor="var(--color-stage-input)"
      active={active}
      status={<StatusPill tone={mapped === clauses.length ? 'ok' : 'warning'}>{mapped === clauses.length ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{mapped}/{clauses.length} clauses mapped</StatusPill>}
      detailsLabel="View segmentation details"
      details={
        <ol className="space-y-3">
          {clauses.map((c) => (
            <li key={c.id} className="text-xs">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ed-text">Clause {c.index + 1}</span>
                <span className="op-badge" style={{ ['--op-color' as string]: modalityTone(c.deonticModality) }}>{c.deonticModality}</span>
                <span className="text-ed-subtle">Polarity: {c.polarity === 'Deny' ? 'Deontic denial (Deny)' : 'Permissive (Allow)'}</span>
                <StatusPill tone={c.supported ? 'ok' : 'warning'}>{c.supported ? 'Mapped' : 'Needs review'}</StatusPill>
              </div>
              <p className="font-serif text-ed-text">{c.text}</p>
              {!c.supported && c.unmappedReason && <p className="mt-1 text-ed-warning">{c.unmappedReason}</p>}
              {c.highlightedKeywords.length > 0 && (
                <p className="mt-1 text-ed-subtle">Cue words: {c.highlightedKeywords.map((k) => `“${k.term}” (${k.category})`).join(', ')}</p>
              )}
            </li>
          ))}
          <li className="text-[11px] text-ed-subtle">The segmenter does not produce per-clause confidence scores; review status is shown instead.</li>
        </ol>
      }
    >
      <ul className="space-y-1">
        {clauses.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => select({ kind: 'clause', id: c.id })}
              aria-pressed={selection.kind === 'clause' && selection.id === c.id}
              className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors ${selection.kind === 'clause' && selection.id === c.id ? 'bg-ed-accent-soft' : 'hover:bg-ed-sunken'}`}
            >
              <span className="w-16 shrink-0 font-medium text-ed-muted">Clause {c.index + 1}</span>
              <span className="truncate font-serif text-ed-text">“{c.text}”</span>
            </button>
          </li>
        ))}
      </ul>
    </StageCard>
  );
};

// ─── Stage 2 ───────────────────────────────────────────────────────────────────

const ConceptEditorRow: React.FC<{ concept: ExtractedConceptToken; clauses: SegmentedClause[] }> = ({ concept, clauses }) => {
  const { dispatch, doc, select } = useEditor();
  const [label, setLabel] = useState(concept.label);
  React.useEffect(() => setLabel(concept.label), [concept.label]);
  const bound = concept.mappedEntityId ? doc.model.entities.find((e) => e.id === concept.mappedEntityId) : undefined;
  const clause = clauses.find((c) => c.id === concept.clauseId);
  const commit = () => dispatch({ type: 'concept-rename', id: concept.id, label });
  return (
    <li className="rounded-lg border border-ed-border bg-ed-surface p-2" data-testid={`concept-edit-row-${concept.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label={`Concept name for ${concept.label}`}
          className={`${input} min-w-[8rem] flex-1`}
          value={label}
          onChange={(e) => { setLabel(e.target.value); if (e.target.value.trim()) dispatch({ type: 'concept-rename', id: concept.id, label: e.target.value }); }}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setLabel(concept.label); }}
        />
        <select
          aria-label={`Category for ${concept.label}`}
          className={`${input} w-auto`}
          value={concept.category}
          onChange={(e) => dispatch({ type: 'concept-set-category', id: concept.id, category: e.target.value as ExtractedConceptToken['category'] })}
        >
          {CONCEPT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button type="button" className={btnGhost} onClick={() => dispatch({ type: 'concept-delete', id: concept.id })} aria-label={`Delete concept ${concept.label}`}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 pl-1 text-[11px] text-ed-subtle">
        <span>
          ├─ Entity:{' '}
          {bound ? (
            <button type="button" className="text-ed-accent hover:underline" onClick={() => select({ kind: 'node', id: bound.id })}>
              {entitySort(bound) ?? bound.type}: {bound.name ?? bound.id}
            </button>
          ) : 'unbound'}
        </span>
        <span>
          └─ Source:{' '}
          {clause ? (
            <button type="button" className="inline-flex items-center gap-0.5 text-ed-accent hover:underline" onClick={() => select({ kind: 'clause', id: clause.id })}>
              <Link2 className="h-3 w-3" /> Clause {clause.index + 1}
            </button>
          ) : 'none'}
        </span>
      </div>
    </li>
  );
};

const AddConceptForm: React.FC<{ clauses: SegmentedClause[] }> = ({ clauses }) => {
  const { dispatch } = useEditor();
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<ExtractedConceptToken['category']>('Activity');
  const [clauseId, setClauseId] = useState(clauses[0]?.id ?? '');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    dispatch({ type: 'concept-add', label, category, clause: clauses.find((c) => c.id === clauseId) });
    setLabel('');
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-ed-strong p-2" data-testid="concept-add-form">
      <input aria-label="New concept name" className={`${input} min-w-[8rem] flex-1`} placeholder="New concept, e.g. Breach Notification" value={label} onChange={(e) => setLabel(e.target.value)} />
      <select aria-label="New concept category" className={`${input} w-auto`} value={category} onChange={(e) => setCategory(e.target.value as ExtractedConceptToken['category'])}>
        {CONCEPT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select aria-label="New concept source clause" className={`${input} w-auto`} value={clauseId} onChange={(e) => setClauseId(e.target.value)}>
        <option value="">No clause</option>
        {clauses.map((c) => <option key={c.id} value={c.id}>Clause {c.index + 1}</option>)}
      </select>
      <button type="submit" className={btn} disabled={!label.trim()}><Plus className="h-3.5 w-3.5" /> Add concept</button>
    </form>
  );
};

const Stage2: React.FC<{ active: boolean }> = ({ active }) => {
  const { doc, result, readOnly, selection, select } = useEditor();
  const [editing, setEditing] = useState(false);
  const bound = doc.concepts.filter((c) => c.mappedEntityId).length;
  return (
    <StageCard
      index={2}
      testId="stage-card-extract"
      title="Legal concept extraction"
      description="Decompose clauses into atomic legal concepts"
      stageColor="var(--color-stage-extract)"
      active={active || editing}
      status={<StatusPill tone="ok"><CheckCircle2 className="h-3 w-3" />{doc.concepts.length} concepts · {bound} bound</StatusPill>}
      actions={!readOnly && (
        <button type="button" className={btn} onClick={() => setEditing((v) => !v)} aria-pressed={editing} data-testid="edit-extraction-button">
          <Pencil className="h-3.5 w-3.5" /> {editing ? 'Done editing' : 'Edit extraction'}
        </button>
      )}
    >
      {editing ? (
        <div className="space-y-2" data-testid="concept-editor">
          <p className="text-[11px] text-ed-subtle">Changes apply immediately: the graph, entities and GAL-JSON update as you type. Undo reverts up to 10 steps.</p>
          <AddConceptForm clauses={result.clauses} />
          <ul className="space-y-2">
            {doc.concepts.map((c) => <ConceptEditorRow key={c.id} concept={c} clauses={result.clauses} />)}
          </ul>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {doc.concepts.map((c) => {
            const isSel = selection.kind === 'concept' && selection.id === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select({ kind: 'concept', id: c.id })}
                  aria-pressed={isSel}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${isSel ? 'border-ed-accent bg-ed-accent-soft' : 'border-ed-border hover:bg-ed-sunken'} ${c.mappedEntityId ? 'text-ed-text' : 'text-ed-subtle'}`}
                  title={c.mappedEntityId ? `Bound to ${c.mappedEntityId}` : 'Not bound to a GAM entity'}
                >
                  {c.label} <span className="text-ed-subtle">({c.category.toLowerCase()})</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </StageCard>
  );
};

// ─── Stage 3 ───────────────────────────────────────────────────────────────────

const AddEntityForm: React.FC = () => {
  const { dispatch } = useEditor();
  const [name, setName] = useState('');
  const [sort, setSort] = useState<GamSort>('Activity');
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) { dispatch({ type: 'add-entity', sort, name: name.trim() }); setName(''); } }}
      data-testid="entity-add-form"
    >
      <select aria-label="New entity sort" className={`${input} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as GamSort)}>
        {SORTS.map((s) => <option key={s}>{s}</option>)}
      </select>
      <input aria-label="New entity name" className={`${input} min-w-[8rem] flex-1`} placeholder="Entity name" value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" className={btn} disabled={!name.trim()}><Plus className="h-3.5 w-3.5" /> Add entity</button>
    </form>
  );
};

const Stage3: React.FC<{ active: boolean }> = ({ active }) => {
  const { doc, result, readOnly, selection, select, dispatch } = useEditor();
  const nodes = result.graph.nodes;
  const typed = nodes.filter((n) => n.sort !== 'Unmapped').length;
  const unbound = doc.concepts.filter((c) => !c.mappedEntityId && c.category !== 'Unmapped');
  const highlighted = highlightedIds(selection, doc, result.clauses).nodes;
  return (
    <StageCard
      index={3}
      testId="stage-card-entity"
      title="GAM entities (P, A, R, U)"
      description="Map concepts to formal ontology entities"
      stageColor="var(--color-stage-entity)"
      active={active}
      status={<StatusPill tone={typed === nodes.length ? 'ok' : 'warning'}>{typed === nodes.length ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{typed} entities bound</StatusPill>}
      detailsLabel="Inspect entity binding"
      details={
        <div className="space-y-3 text-xs">
          <table className="w-full text-left">
            <thead className="text-[11px] text-ed-subtle"><tr><th className="py-1 font-medium">Concept</th><th className="font-medium">Entity id</th><th className="font-medium">Sort</th></tr></thead>
            <tbody>
              {doc.concepts.filter((c) => c.mappedEntityId).map((c) => (
                <tr key={c.id} className="border-t border-ed-border">
                  <td className="py-1 text-ed-text">{c.label}</td>
                  <td className="font-mono text-ed-muted">{c.mappedEntityId}</td>
                  <td>{entitySort(doc.model.entities.find((e) => e.id === c.mappedEntityId)) ?? 'missing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {unbound.length > 0 && (
            <div>
              <div className="mb-1 font-medium text-ed-muted">Unbound concepts</div>
              <ul className="space-y-1">
                {unbound.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-ed-text">{c.label}</span>
                    <span className="text-ed-subtle">({c.category})</span>
                    {!readOnly && (
                      <select
                        aria-label={`Bind ${c.label} as`}
                        className={`${input} ml-auto w-auto`}
                        value=""
                        onChange={(e) => e.target.value && dispatch({ type: 'concept-bind', id: c.id, sort: e.target.value as GamSort })}
                      >
                        <option value="">Bind as…</option>
                        {SORTS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!readOnly && <AddEntityForm />}
        </div>
      }
    >
      <dl className="space-y-1.5 text-xs">
        {(['Process', 'Activity', 'Role', 'User', 'Unmapped'] as const).map((sort) => {
          const items = nodes.filter((n) => n.sort === sort);
          if (sort === 'Unmapped' && !items.length) return null;
          return (
            <div key={sort} className="flex items-start gap-2">
              <dt className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5 text-ed-muted"><SortChip sort={sort} /> {sort === 'Unmapped' ? 'Untyped' : sort}</dt>
              <dd className="flex flex-wrap gap-1">
                {items.length === 0 && <span className="text-ed-subtle">—</span>}
                {items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => select({ kind: 'node', id: n.id })}
                    aria-pressed={selection.kind === 'node' && selection.id === n.id}
                    className={`rounded border px-1.5 py-0.5 ${highlighted.has(n.id) ? 'border-ed-accent bg-ed-accent-soft' : 'border-ed-border hover:bg-ed-sunken'} text-ed-text`}
                  >
                    {n.label}
                  </button>
                ))}
              </dd>
            </div>
          );
        })}
      </dl>
    </StageCard>
  );
};

// ─── Stage 4 ───────────────────────────────────────────────────────────────────

const Stage4: React.FC<{ active: boolean }> = ({ active }) => {
  const { doc, result, selection, select } = useEditor();
  const [split, setSplit] = useState(false);
  const model = result.galModel;
  const name = (id: string) => model.entities.find((e) => e.id === id)?.name ?? id;
  const refs = listEdges(model);
  const deontic = refs.filter((r) => !STRUCTURAL_FAMILIES.includes(familyOf(r.kind, r.edge.type)));
  const structural = refs.filter((r) => STRUCTURAL_FAMILIES.includes(familyOf(r.kind, r.edge.type)));
  const highlighted = highlightedIds(selection, doc, result.clauses).edges;
  const row = (r: (typeof refs)[number]) => {
    const info = operatorInfo(r, doc.annotations[r.edge.id!]);
    return (
      <li key={r.edge.id}>
        <button
          type="button"
          onClick={() => select({ kind: 'edge', id: r.edge.id! })}
          aria-pressed={selection.kind === 'edge' && selection.id === r.edge.id}
          className={`flex w-full flex-wrap items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs ${highlighted.has(r.edge.id!) ? 'bg-ed-accent-soft' : 'hover:bg-ed-sunken'}`}
          data-testid={`stage4-edge-${r.edge.id}`}
        >
          <OperatorBadge operator={info.operator} inferred={info.inferred} />
          <span className="text-ed-text">{name(r.edge.source)}</span>
          <span className="text-ed-subtle">→</span>
          <span className="text-ed-text">{name(r.edge.target)}</span>
          <span className="ml-auto font-mono text-[10px] text-ed-subtle">{r.edge.type}</span>
        </button>
      </li>
    );
  };
  const pos = deontic.filter((r) => operatorInfo(r, doc.annotations[r.edge.id!]).operator !== 'Prohibits');
  const neg = deontic.filter((r) => operatorInfo(r, doc.annotations[r.edge.id!]).operator === 'Prohibits');
  return (
    <StageCard
      index={4}
      testId="stage-card-deontic"
      title="Deontic translation"
      description="Convert legal obligations into formal deontic relations"
      stageColor="var(--color-stage-translate)"
      active={active}
      status={<StatusPill tone="ok"><CheckCircle2 className="h-3 w-3" />{deontic.length} deontic · {structural.length} structural</StatusPill>}
      actions={
        <button type="button" className={btn} aria-pressed={split} onClick={() => setSplit((v) => !v)} data-testid="polarity-split-toggle">
          {split ? 'Show combined list' : 'View polarity split (± )'}
        </button>
      }
    >
      {split ? (
        <div className="grid gap-3 sm:grid-cols-2" data-testid="polarity-split">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-ed-muted">Positive (RA⁺, RU⁺, UP⁺, RP⁺, D⁺): {pos.length}</div>
            <ul className="space-y-0.5">{pos.map(row)}</ul>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-ed-muted">Negative (RA⁻, RU⁻, UP⁻, RP⁻, D⁻): {neg.length}</div>
            <ul className="space-y-0.5">{neg.map(row)}</ul>
          </div>
        </div>
      ) : (
        <ul className="space-y-0.5">{deontic.map(row)}</ul>
      )}
      {structural.length > 0 && (
        <div className="mt-2 border-t border-ed-border pt-2">
          <div className="mb-1 text-[11px] font-semibold text-ed-muted">Structural (PP, PA, RR, S, X)</div>
          <ul className="space-y-0.5">{structural.map(row)}</ul>
        </div>
      )}
      {deontic.some((r) => operatorInfo(r, doc.annotations[r.edge.id!]).inferred) && (
        <p className="mt-2 text-[11px] text-ed-subtle">* Operator read from the source wording; the GAL edge records no deontic status until you set one.</p>
      )}
    </StageCard>
  );
};

// ─── Stage 5 ───────────────────────────────────────────────────────────────────

const Stage5: React.FC<ExportHandlers> = ({ onCopyJson, onDownloadJson }) => {
  const { result, issues, selection, doc } = useEditor();
  const errors = issues.filter((i) => i.severity === 'error').length;
  const marks = highlightedIds(selection, doc, result.clauses);
  return (
    <StageCard
      index={5}
      testId="stage-card-gal"
      title="GAL-JSON generation"
      description="Compile the formal deontic model (Φ_L)"
      stageColor="var(--color-stage-output)"
      status={errors ? <StatusPill tone="error"><XCircle className="h-3 w-3" />{errors} error{errors === 1 ? '' : 's'}</StatusPill> : <StatusPill tone="ok"><CheckCircle2 className="h-3 w-3" />Model valid, no conflicts</StatusPill>}
      detailsLabel="View GAL-JSON"
      details={<HighlightedJson value={result.galModel} markIds={new Set([...marks.nodes, ...marks.edges])} className="max-h-80" />}
      actions={<>
        <button type="button" className={btn} onClick={onCopyJson}><Copy className="h-3.5 w-3.5" /> Copy JSON</button>
        <button type="button" className={btn} onClick={onDownloadJson}><Download className="h-3.5 w-3.5" /> Download JSON</button>
      </>}
    >
      <p className="text-xs text-ed-muted">
        {result.validation.counts.entities} entities · {result.validation.counts.relations} relations · {result.validation.counts.policies} policies
        ({result.validation.counts.allowPolicies} Allow / {result.validation.counts.denyPolicies} Deny) · schema {result.validation.structuralValid ? 'valid' : 'invalid'}
      </p>
    </StageCard>
  );
};

// ─── Stage 6 ───────────────────────────────────────────────────────────────────

const Stage6: React.FC<ExportHandlers> = ({ onDownloadAlloy }) => {
  const { result } = useEditor();
  const v = result.validation;
  const [showCounter, setShowCounter] = useState(false);
  return (
    <StageCard
      index={6}
      testId="stage-card-alloy"
      title="Alloy specification & validation"
      description="Generate the formal verification model"
      stageColor="var(--color-stage-relation)"
      status={<StatusPill tone={v.internalLawConsistent && v.relationDirectionsValid ? 'ok' : 'error'}>{v.internalLawConsistent && v.relationDirectionsValid ? 'Checks passed' : 'Checks failed'}</StatusPill>}
      detailsLabel="View Alloy specification"
      details={<pre className="ed-json max-h-80 overflow-auto whitespace-pre text-[11px] text-ed-text" data-testid="editor-alloy-spec">{v.alloySpecification}</pre>}
      actions={<>
        <button type="button" className={btn} onClick={() => setShowCounter((s) => !s)} aria-expanded={showCounter} data-testid="view-counterexamples">
          <Eye className="h-3.5 w-3.5" /> {showCounter ? 'Hide' : 'View'} counterexamples ({v.internalViolations.length})
        </button>
        <button type="button" className={btn} onClick={onDownloadAlloy}><Download className="h-3.5 w-3.5" /> Download .als</button>
      </>}
    >
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-ed-success" /> Alloy specification emitted ({v.alloySpecification.split('\n').length} lines)</li>
        <li className="flex items-center gap-1.5">
          {v.internalLawConsistent ? <CheckCircle2 className="h-3.5 w-3.5 text-ed-success" /> : <XCircle className="h-3.5 w-3.5 text-ed-error" />}
          {v.internalLawConsistent ? 'No contradictions detected (closure / SAT check)' : `${v.internalViolations.length} closure contradiction(s)`}
        </li>
        <li className="flex items-center gap-1.5">
          {v.relationDirectionsValid ? <CheckCircle2 className="h-3.5 w-3.5 text-ed-success" /> : <XCircle className="h-3.5 w-3.5 text-ed-error" />}
          {v.relationDirectionsValid ? 'Canonical edge directions valid' : `${v.directionWarnings.length} direction error(s)`}
        </li>
        <li className="flex items-start gap-1.5 text-ed-subtle">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ed-warning" />
          The closure check runs in the browser on every edit. The Alloy solver itself is not executed here: download the .als and run it with alloy/gam_core.als in the Alloy Analyzer.
        </li>
      </ul>
      {showCounter && (
        <div className="mt-2 rounded-md border border-ed-border bg-ed-sunken p-2 text-xs" data-testid="counterexamples">
          {v.internalViolations.length === 0 ? (
            <p className="text-ed-subtle">No counterexamples: the law model is internally consistent under closure. Users without Acts/CanAct grants are outside the checker’s enumeration.</p>
          ) : (
            <ul className="space-y-2">
              {v.internalViolations.map((x, i) => (
                <li key={i}>
                  <div className="font-semibold text-ed-error">{x.type} ({x.severity})</div>
                  <div className="text-ed-text">{x.message}</div>
                  {x.grantedVia && <div className="text-ed-subtle">Granted via: {x.grantedVia.join(' → ')}</div>}
                  {x.prohibitedVia && <div className="text-ed-subtle">Prohibited via: {x.prohibitedVia.join(' → ')}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </StageCard>
  );
};

// ─── Validation status ─────────────────────────────────────────────────────────

export const ValidationStatus: React.FC = () => {
  const { issues, select, dispatch, readOnly } = useEditor();
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const inspect = (i: EditorIssue) => {
    if (i.edgeIds[0]) select({ kind: 'edge', id: i.edgeIds[0] });
    else if (i.entityIds[0]) select({ kind: 'node', id: i.entityIds[0] });
  };
  const item = (i: EditorIssue) => (
    <li key={i.id} className="flex flex-wrap items-start gap-2 py-1.5 text-xs" data-testid={`issue-${i.rule}`}>
      <span className="min-w-0 flex-1 text-ed-text">{i.message}</span>
      <span className="flex flex-wrap gap-1">
        {(i.edgeIds[0] || i.entityIds[0]) && <button type="button" className={btnGhost} onClick={() => inspect(i)}>Inspect</button>}
        {!readOnly && i.resolutions?.map((r) => (
          <button key={r.removeEdgeId} type="button" className={btn} onClick={() => dispatch({ type: 'delete-edge', edgeId: r.removeEdgeId })}>{r.label}</button>
        ))}
      </span>
    </li>
  );
  return (
    <section className="rounded-xl border border-ed-border bg-ed-surface" aria-live="polite" data-testid="editor-validation-status">
      <header className="flex items-center gap-2 border-b border-ed-border px-4 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Live validation</h3>
        <span className="ml-auto flex gap-1.5">
          <StatusPill tone={errors.length ? 'error' : 'ok'}>{errors.length} error{errors.length === 1 ? '' : 's'}</StatusPill>
          <StatusPill tone={warnings.length ? 'warning' : 'ok'}>{warnings.length} warning{warnings.length === 1 ? '' : 's'}</StatusPill>
        </span>
      </header>
      <div className="px-4 py-2">
        {issues.length === 0 && <p className="py-1 text-xs text-ed-success">No errors or warnings.</p>}
        {errors.length > 0 && (
          <div>
            <div className="flex items-center gap-1 pt-1 text-[11px] font-semibold text-ed-error"><XCircle className="h-3.5 w-3.5" /> Errors</div>
            <ul className="divide-y divide-[var(--color-border)]">{errors.map(item)}</ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div>
            <div className="flex items-center gap-1 pt-1 text-[11px] font-semibold text-ed-warning"><AlertTriangle className="h-3.5 w-3.5" /> Warnings</div>
            <ul className="divide-y divide-[var(--color-border)]">{warnings.map(item)}</ul>
          </div>
        )}
      </div>
    </section>
  );
};

export const PipelineStages: React.FC<ExportHandlers> = (handlers) => {
  const { selection } = useEditor();
  const active = activeStageFor(selection);
  return (
    <div className="space-y-3">
      <Stage1 active={active === 1} />
      <Stage2 active={active === 2} />
      <Stage3 active={active === 3} />
      <Stage4 active={active === 4} />
      <Stage5 {...handlers} />
      <Stage6 {...handlers} />
    </div>
  );
};

export { statusFor };
