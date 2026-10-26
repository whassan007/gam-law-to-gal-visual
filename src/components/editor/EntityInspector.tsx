import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Link2, Plus, Trash2, X } from 'lucide-react';
import type { GamSort } from '../../types/contracts';
import { useEditor, sortOf } from './editorState';
import {
  DEONTIC_OPERATORS, OPERATOR_META, LOW_CONFIDENCE_THRESHOLD, buildEdge, canonicalPair, familyOf, familyOptionsFor, findEdge,
  listEdges, noFamilyExplanation, operatorInfo, type DeonticOperator, type FamilyId,
} from './deontic';
import { getCanonicalDirectionNote, entitySort } from '../../engine/gam-adapter';
import { OperatorBadge, SortChip, StatusPill, btn, btnPrimary, btnGhost, input, sortColors } from './ui';

const SORTS: GamSort[] = ['Process', 'Activity', 'Role', 'User'];

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[6.5rem_1fr] items-start gap-2 py-1 text-xs">
    <dt className="pt-1 text-ed-subtle">{label}</dt>
    <dd className="min-w-0 text-ed-text">{children}</dd>
  </div>
);

export const OperatorLegend: React.FC = () => (
  <div data-testid="operator-legend">
    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Deontic operators</h4>
    <table className="w-full text-xs">
      <tbody>
        {DEONTIC_OPERATORS.map((op) => (
          <tr key={op} className="border-t border-ed-border">
            <td className="py-1.5 pr-2"><OperatorBadge operator={op} /></td>
            <td className="text-ed-text">{OPERATOR_META[op].gloss}</td>
            <td className="font-mono text-[10px] text-ed-subtle">{OPERATOR_META[op].modality} · {OPERATOR_META[op].deontic}</td>
          </tr>
        ))}
        <tr className="border-t border-ed-border">
          <td className="py-1.5 pr-2"><OperatorBadge operator={null} /></td>
          <td className="text-ed-text">PP, PA, RR, S, X</td>
          <td className="font-mono text-[10px] text-ed-subtle">no polarity</td>
        </tr>
      </tbody>
    </table>
    <p className="mt-2 text-[11px] text-ed-subtle">Prohibitions are drawn dashed and structural edges dotted, so polarity never depends on colour alone.</p>
  </div>
);

const EdgeList: React.FC<{ title: string; ids: string[] }> = ({ title, ids }) => {
  const { result, doc, select } = useEditor();
  const name = (id: string) => result.galModel.entities.find((e) => e.id === id)?.name ?? id;
  return (
    <div className="py-1">
      <div className="text-[11px] font-medium text-ed-subtle">{title}: {ids.length}</div>
      <ul className="mt-0.5 space-y-0.5">
        {ids.map((id) => {
          const ref = findEdge(result.galModel, id);
          if (!ref) return null;
          const info = operatorInfo(ref, doc.annotations[id]);
          return (
            <li key={id}>
              <button type="button" onClick={() => select({ kind: 'edge', id })} className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-ed-sunken">
                <OperatorBadge operator={info.operator} inferred={info.inferred} />
                <span className="truncate text-ed-text">{name(ref.edge.source)} → {name(ref.edge.target)}</span>
                <span className="ml-auto font-mono text-[10px] text-ed-subtle">{ref.edge.type}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const ClauseLink: React.FC<{ clauseId?: string }> = ({ clauseId }) => {
  const { result, select } = useEditor();
  const clause = result.clauses.find((c) => c.id === clauseId);
  if (!clause) return <span className="text-ed-subtle">None recorded</span>;
  return (
    <button type="button" className="inline-flex items-center gap-1 text-ed-accent hover:underline" onClick={() => select({ kind: 'clause', id: clause.id })}>
      <Link2 className="h-3 w-3" /> Clause {clause.index + 1}
    </button>
  );
};

const NodeInspector: React.FC<{ id: string; focusSignal: number }> = ({ id, focusSignal }) => {
  const { result, doc, issues, dispatch, select, readOnly } = useEditor();
  const entity = result.galModel.entities.find((e) => e.id === id);
  const [name, setName] = useState(entity?.name ?? id);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => setName(entity?.name ?? id), [entity?.name, id]);
  useEffect(() => { if (focusSignal) { nameRef.current?.focus(); nameRef.current?.select(); } }, [focusSignal]);
  if (!entity) return <p className="text-xs text-ed-subtle">Entity no longer exists.</p>;
  const sort = entitySort(entity);
  const edges = listEdges(result.galModel);
  const incoming = edges.filter((r) => r.edge.target === id).map((r) => r.edge.id!);
  const outgoing = edges.filter((r) => r.edge.source === id).map((r) => r.edge.id!);
  const concepts = doc.concepts.filter((c) => c.mappedEntityId === id);
  const mine = issues.filter((i) => i.entityIds.includes(id));
  const otherEntities = result.galModel.entities.filter((e) => e.id !== id);
  const commit = () => dispatch({ type: 'rename-entity', id, name });
  return (
    <div data-testid="entity-inspector-node">
      <div className="mb-2 flex items-center gap-2">
        <SortChip sort={sort ?? 'Unmapped'} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Selected: {sort ?? entity.type}</span>
      </div>
      <dl>
        <Field label="Formal name"><code className="font-mono">{entity.id}</code></Field>
        <Field label="Display name">
          <input ref={nameRef} aria-label="Entity display name" className={input} value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} data-testid="inspector-entity-name" />
        </Field>
        <Field label="Sort">
          <select aria-label="Entity sort" className={input} value={sort ?? ''} disabled={readOnly} onChange={(e) => dispatch({ type: 'set-entity-sort', id, sort: e.target.value as GamSort })}>
            {!sort && <option value="">{entity.type} (untyped)</option>}
            {SORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Origin clause"><ClauseLink clauseId={entity.sourceSpan?.clauseId} /></Field>
        <Field label="Concepts">{concepts.length ? concepts.map((c) => c.label).join(', ') : <span className="text-ed-subtle">None bound</span>}</Field>
        <Field label="Review">{entity.verified ? <StatusPill tone="ok">Verified source span</StatusPill> : <StatusPill tone="warning">Unverified</StatusPill>}</Field>
        {entity.description && <Field label="Note">{entity.description}</Field>}
      </dl>
      {mine.length > 0 && (
        <ul className="my-2 space-y-1">
          {mine.map((i) => <li key={i.id} className={`text-xs ${i.severity === 'error' ? 'text-ed-error' : 'text-ed-warning'}`}>{i.message}</li>)}
        </ul>
      )}
      <div className="mt-2 border-t border-ed-border pt-1">
        <EdgeList title="Incoming relations" ids={incoming} />
        <EdgeList title="Outgoing relations" ids={outgoing} />
        {!readOnly && otherEntities.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 shrink-0 text-ed-accent" />
            <select
              aria-label="Connect to entity"
              className={input}
              value=""
              onChange={(e) => {
                if (e.target.value) select({ kind: 'pending', source: id, target: e.target.value });
              }}
            >
              <option value="">+ Connect to…</option>
              {otherEntities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name ?? e.id} ({entitySort(e) ?? e.type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="mt-3 flex gap-2 border-t border-ed-border pt-3">
          <button type="button" className={btn} onClick={() => { nameRef.current?.focus(); nameRef.current?.select(); }}>Edit</button>
          <button type="button" className={btn} onClick={() => dispatch({ type: 'delete-entity', id })} data-testid="inspector-delete-entity">
            <Trash2 className="h-3.5 w-3.5" /> Delete entity
          </button>
        </div>
      )}
    </div>
  );
};

const EdgeInspector: React.FC<{ id: string }> = ({ id }) => {
  const { result, doc, issues, dispatch, readOnly } = useEditor();
  const model = result.galModel;
  const ref = findEdge(model, id);
  if (!ref) return <p className="text-xs text-ed-subtle">Relation no longer exists.</p>;
  const { edge, kind } = ref;
  const info = operatorInfo(ref, doc.annotations[id]);
  const confidence = doc.annotations[id]?.confidence;
  const family = familyOf(kind, edge.type);
  const mine = issues.filter((i) => i.edgeIds.includes(id));
  const entityOptions = model.entities.map((e) => <option key={e.id} value={e.id}>{e.name ?? e.id} ({entitySort(e) ?? e.type})</option>);
  return (
    <div data-testid="entity-inspector-edge">
      <div className="mb-2 flex items-center gap-2">
        <OperatorBadge operator={info.operator} inferred={info.inferred} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ed-muted">{kind === 'policy' ? 'Policy' : 'Relation'} · {family === 'EXT' ? 'extension' : `${family}${STRUCT(family) ? '' : '±'}`}</span>
      </div>
      <dl>
        <Field label="Source">
          <select aria-label="Edge source" className={input} value={edge.source} disabled={readOnly} onChange={(e) => dispatch({ type: 'rewire', edgeId: id, end: 'source', nodeId: e.target.value })}>{entityOptions}</select>
        </Field>
        <Field label="Target">
          <select aria-label="Edge target" className={input} value={edge.target} disabled={readOnly} onChange={(e) => dispatch({ type: 'rewire', edgeId: id, end: 'target', nodeId: e.target.value })}>{entityOptions}</select>
        </Field>
        <Field label="Relation"><code className="font-mono">{edge.type}</code><div className="text-[11px] text-ed-subtle">{getCanonicalDirectionNote(kind, edge.type)}</div></Field>
        <Field label="Operator">
          {info.editable ? (
            <select aria-label="Deontic operator" data-testid="inspector-operator-select" className={input} value={info.operator ?? ''} disabled={readOnly} onChange={(e) => dispatch({ type: 'set-operator', edgeId: id, operator: e.target.value as DeonticOperator })}>
              {DEONTIC_OPERATORS.map((op) => <option key={op} value={op}>{op} — {OPERATOR_META[op].gloss}</option>)}
            </select>
          ) : (
            <span className="text-ed-subtle">{info.operator ?? 'Structural relation (no polarity)'}</span>
          )}
          {info.inferred && <div className="mt-1 text-[11px] text-ed-subtle">Read from the source wording. Choose an operator to record it in GAL.</div>}
          {kind === 'relation' && info.editable && <div className="mt-1 text-[11px] text-ed-subtle">Choosing Prohibits converts this positive fact into the matching Deny policy.</div>}
        </Field>
        <Field label="Confidence">
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={1} step={0.01}
              aria-label="Reviewer confidence"
              data-testid="inspector-confidence"
              className="flex-1 accent-[var(--color-accent)]"
              value={confidence ?? 1}
              disabled={readOnly}
              onChange={(e) => dispatch({ type: 'set-confidence', edgeId: id, confidence: Number(e.target.value) })}
            />
            <span className={`w-10 text-right font-mono ${confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD ? 'text-ed-warning' : ''}`}>{confidence !== undefined ? confidence.toFixed(2) : '—'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-ed-subtle">
            <span>{confidence === undefined ? 'Not yet rated by a reviewer' : 'Reviewer rating'}{edge.uncertain ? ' · extractor flagged uncertain' : ''}</span>
            {confidence !== undefined && !readOnly && <button type="button" className="text-ed-accent hover:underline" onClick={() => dispatch({ type: 'set-confidence', edgeId: id, confidence: undefined })}>Clear</button>}
          </div>
        </Field>
        <Field label="Source clause">
          <div className="flex items-center gap-2">
            <select
              aria-label="Source clause"
              className={input}
              value={edge.sourceSpan?.clauseId ?? ''}
              disabled={readOnly}
              onChange={(e) => dispatch({ type: 'set-edge-clause', edgeId: id, clause: result.clauses.find((c) => c.id === e.target.value) ?? null })}
            >
              <option value="">None</option>
              {result.clauses.map((c) => <option key={c.id} value={c.id}>Clause {c.index + 1}</option>)}
            </select>
            <ClauseLink clauseId={edge.sourceSpan?.clauseId} />
          </div>
          {edge.sourceSpan?.text && <blockquote className="mt-1 border-l-2 border-ed-border pl-2 font-serif text-[11px] italic text-ed-muted">“{edge.sourceSpan.text}”</blockquote>}
        </Field>
        {edge.rationale && <Field label="Rationale"><span className="text-ed-muted">{edge.rationale}</span></Field>}
      </dl>
      <div className="my-2">
        {mine.length === 0 ? <StatusPill tone="ok"><Check className="h-3 w-3" /> Valid relation</StatusPill> : (
          <ul className="space-y-1">{mine.map((i) => <li key={i.id} className={`text-xs ${i.severity === 'error' ? 'text-ed-error' : 'text-ed-warning'}`}>{i.message}</li>)}</ul>
        )}
      </div>
      {!readOnly && (
        <div className="mt-3 border-t border-ed-border pt-3">
          <button type="button" className={btn} onClick={() => dispatch({ type: 'delete-edge', edgeId: id })} data-testid="inspector-delete-edge">
            <Trash2 className="h-3.5 w-3.5" /> Delete relation
          </button>
        </div>
      )}
    </div>
  );
};

const STRUCT = (f: FamilyId) => ['PP', 'PA', 'RR', 'S', 'X'].includes(f);

const NewRelationForm: React.FC<{ source: string; target: string }> = ({ source, target }) => {
  const { result, dispatch, select, seed } = useEditor();
  const model = result.galModel;
  const s = { id: source, sort: sortOf(model, source) }, t = { id: target, sort: sortOf(model, target) };
  const options = useMemo(() => familyOptionsFor(s, t), [source, target, s.sort, t.sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const [familyIdx, setFamilyIdx] = useState(0);
  const [operator, setOperator] = useState<DeonticOperator>('Must');
  const [scope, setScope] = useState('');
  const [clauseId, setClauseId] = useState('');
  useEffect(() => { setFamilyIdx(0); }, [source, target]);
  const name = (id: string) => model.entities.find((e) => e.id === id)?.name ?? id;
  const option = options[familyIdx];
  const activities = model.entities.filter((e) => entitySort(e) === 'Activity');

  const confirm = () => {
    if (!option) return;
    const clause = result.clauses.find((c) => c.id === clauseId);
    const ref = buildEdge(option, option.structural ? null : operator, `editor:${option.family}:${source}:${target}`, {
      jurisdiction: model.jurisdiction.country,
      delegationScope: scope || null,
      sourceSpan: clause ? { ...clause.sourceSpan, clauseId: clause.id, text: clause.text } : undefined,
    });
    dispatch({ type: 'add-edge', ref, operator: option.structural ? null : operator });
  };

  // Show what will be written, in canonical direction.
  const preview = option ? buildEdge(option, option.structural ? null : operator, 'preview', { delegationScope: scope || null }) : null;
  const pair = preview ? canonicalPair(preview) : null;

  return (
    <div data-testid="new-relation-form">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ed-muted">New relation</h4>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-ed-text">
        <SortChip sort={s.sort ?? 'Unmapped'} /> {name(source)} <span className="text-ed-subtle">→</span> <SortChip sort={t.sort ?? 'Unmapped'} /> {name(target)}
        <button type="button" className={`${btnGhost} ml-auto`} onClick={() => select({ kind: 'pending', source: target, target: source })} aria-label="Swap endpoints"><ArrowLeftRight className="h-3.5 w-3.5" /></button>
      </p>
      {options.length === 0 ? (
        <p className="rounded-md border border-ed-warning bg-ed-warning-soft p-2 text-xs text-ed-warning">{noFamilyExplanation(s.sort, t.sort)}</p>
      ) : (
        <dl>
          <Field label="Family">
            <select aria-label="Relation family" className={input} value={familyIdx} onChange={(e) => setFamilyIdx(Number(e.target.value))} data-testid="new-relation-family">
              {options.map((o, i) => <option key={o.family} value={i}>{o.label}</option>)}
            </select>
          </Field>
          {option && !option.structural && (
            <Field label="Operator">
              <select aria-label="New relation operator" className={input} value={operator} onChange={(e) => setOperator(e.target.value as DeonticOperator)} data-testid="new-relation-operator">
                {DEONTIC_OPERATORS.map((op) => <option key={op} value={op}>{op} — {OPERATOR_META[op].gloss}</option>)}
              </select>
            </Field>
          )}
          {option?.family === 'D' && (
            <Field label="Scope">
              <select aria-label="Delegated activity" className={input} value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="">Unrestricted</option>
                {activities.map((a) => <option key={a.id} value={a.id}>{a.name ?? a.id}</option>)}
              </select>
            </Field>
          )}
          <Field label="Source clause">
            <select aria-label="New relation source clause" className={input} value={clauseId} onChange={(e) => setClauseId(e.target.value)}>
              <option value="">None</option>
              {result.clauses.map((c) => <option key={c.id} value={c.id}>Clause {c.index + 1}</option>)}
            </select>
          </Field>
          {preview && pair && (
            <Field label="Writes">
              <code className="font-mono text-[11px]">{preview.kind === 'policy' ? `${preview.edge.type} ${(preview.edge as { modality: string }).modality}` : preview.edge.type}: {name(preview.edge.source)} → {name(preview.edge.target)}</code>
              <div className="text-[11px] text-ed-subtle">{getCanonicalDirectionNote(preview.kind, preview.edge.type)} · jurisdiction {seed.galModel.jurisdiction.country}</div>
            </Field>
          )}
        </dl>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" className={btnPrimary} onClick={confirm} disabled={!option} data-testid="new-relation-confirm"><Check className="h-3.5 w-3.5" /> Add relation</button>
        <button type="button" className={btn} onClick={() => select({ kind: 'none' })}><X className="h-3.5 w-3.5" /> Cancel</button>
      </div>
    </div>
  );
};

const ClauseInspector: React.FC<{ id: string }> = ({ id }) => {
  const { result } = useEditor();
  const clause = result.clauses.find((c) => c.id === id);
  if (!clause) return null;
  return (
    <div data-testid="entity-inspector-clause">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Clause {clause.index + 1}</h4>
      <blockquote className="border-l-2 border-ed-accent pl-2 font-serif text-xs text-ed-text">{clause.text}</blockquote>
      <dl className="mt-2">
        <Field label="Modality">{clause.deonticModality}</Field>
        <Field label="Polarity">{clause.polarity}</Field>
        <Field label="Status">{clause.supported ? 'Mapped' : clause.unmappedReason ?? 'Needs review'}</Field>
      </dl>
      <p className="mt-2 text-[11px] text-ed-subtle">Entities and relations from this clause are highlighted in the graph.</p>
    </div>
  );
};

const ConceptInspector: React.FC<{ id: string }> = ({ id }) => {
  const { doc, select } = useEditor();
  const c = doc.concepts.find((x) => x.id === id);
  if (!c) return null;
  return (
    <div data-testid="entity-inspector-concept">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Concept</h4>
      <dl>
        <Field label="Label">{c.label}</Field>
        <Field label="Category">{c.category}</Field>
        <Field label="Origin clause"><ClauseLink clauseId={c.clauseId} /></Field>
        <Field label="Bound entity">
          {c.mappedEntityId ? <button type="button" className="text-ed-accent hover:underline" onClick={() => select({ kind: 'node', id: c.mappedEntityId! })}>{c.mappedEntityId}</button> : <span className="text-ed-subtle">Unbound — bind it in Stage 3</span>}
        </Field>
        {c.notes && <Field label="Notes">{c.notes}</Field>}
      </dl>
    </div>
  );
};

const ModelQuickSummary: React.FC = () => {
  const { result, select } = useEditor();
  const entities = result.galModel.entities;
  const counts = useMemo(() => {
    const map: Record<GamSort, number> = { Process: 0, Activity: 0, Role: 0, User: 0 };
    for (const e of entities) {
      const s = entitySort(e);
      if (s && s in map) map[s] += 1;
    }
    return map;
  }, [entities]);

  return (
    <div className="rounded-lg border border-ed-border bg-ed-sunken/50 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Model Quick Summary</h4>
        <span className="font-mono text-[10px] text-ed-subtle">{entities.length} entities</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {SORTS.map((s) => {
          const c = sortColors(s);
          return (
            <div
              key={s}
              className="flex items-center gap-1.5 rounded-md border border-ed-border bg-ed-surface px-2 py-1"
              title={`${s} count`}
            >
              <SortChip sort={s} />
              <div className="min-w-0">
                <div className="font-mono text-xs font-semibold leading-tight" style={{ color: c.stroke }}>{counts[s]}</div>
                <div className="truncate text-[9px] text-ed-subtle">{s}</div>
              </div>
            </div>
          );
        })}
      </div>
      {entities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-ed-border pt-2">
          {entities.map((e) => {
            const s = entitySort(e);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => select({ kind: 'node', id: e.id })}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-ed-border bg-ed-surface px-2 py-0.5 text-[11px] text-ed-text transition-colors hover:border-ed-accent hover:bg-ed-accent-soft"
                title={`Inspect ${e.name ?? e.id} (${s ?? e.type})`}
              >
                <SortChip sort={s ?? 'Unmapped'} />
                <span className="truncate">{e.name ?? e.id}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const EntityInspector: React.FC<{ focusSignal?: number }> = ({ focusSignal = 0 }) => {
  const { selection, select } = useEditor();
  return (
    <section aria-label="Entity inspector" className="min-w-0" data-testid="entity-inspector">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ed-muted">Inspector</h3>
        {selection.kind !== 'none' && (
          <button
            type="button"
            className={`${btnGhost} -my-1 text-[11px]`}
            onClick={() => select({ kind: 'none' })}
            aria-label="Clear selection and return to legend"
            title="Clear / Back to legend"
          >
            <X className="h-3.5 w-3.5" />
            <span>Back to legend</span>
          </button>
        )}
      </div>
      {selection.kind === 'node' && <NodeInspector id={selection.id} focusSignal={focusSignal} />}
      {selection.kind === 'edge' && <EdgeInspector id={selection.id} />}
      {selection.kind === 'pending' && <NewRelationForm source={selection.source} target={selection.target} />}
      {selection.kind === 'clause' && <ClauseInspector id={selection.id} />}
      {selection.kind === 'concept' && <ConceptInspector id={selection.id} />}
      {selection.kind === 'none' && (
        <div className="space-y-3">
          <p className="text-xs text-ed-subtle">Select a node or relation in the graph, or a clause, concept or entity in the pipeline.</p>
          <ModelQuickSummary />
          <OperatorLegend />
        </div>
      )}
    </section>
  );
};
