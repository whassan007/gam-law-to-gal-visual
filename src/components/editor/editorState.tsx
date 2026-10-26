import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type {
  ExtractedConceptToken,
  GalEntity,
  GalJsonModel,
  GamSort,
  SegmentedClause,
  SourceSpan,
  TranslationReadiness,
  TranslationResult,
} from '../../types/contracts';
import { retranslateEditedModel, stripGeneratedChecks, entitySort, type EditedTranslationInput } from '../../engine/gam-adapter';
import {
  applyOperator,
  ensureEdgeIds,
  findEdge,
  lintModel,
  type DeonticOperator,
  type EdgeAnnotations,
  type EdgeRef,
  type EditorIssue,
} from './deontic';

/** Everything the editor needs to start from a translation, independent of how it was produced. */
export interface EditorSeed {
  key: string;
  lawId: string;
  provisionId: string;
  title: string;
  subtitle: string;
  readiness: TranslationReadiness;
  sourceText: string;
  clauses: SegmentedClause[];
  concepts: ExtractedConceptToken[];
  galModel: GalJsonModel;
  unmappedClauses?: EditedTranslationInput['unmappedClauses'];
  ambiguousInterpretations?: EditedTranslationInput['ambiguousInterpretations'];
}

/** The editable part of the state; one undo step is one EditorDoc. */
export interface EditorDoc {
  model: GalJsonModel;
  concepts: ExtractedConceptToken[];
  annotations: EdgeAnnotations;
}

export type Selection =
  | { kind: 'none' }
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | { kind: 'clause'; id: string }
  | { kind: 'concept'; id: string }
  | { kind: 'pending'; source: string; target: string };

export const UNDO_LIMIT = 10;

interface State {
  doc: EditorDoc;
  past: EditorDoc[];
  future: EditorDoc[];
  edited: boolean;
  selection: Selection;
}

const BINDABLE: Partial<Record<ExtractedConceptToken['category'], GamSort>> = {
  Process: 'Process', Activity: 'Activity', Role: 'Role', Actor: 'User',
};

export type EditorAction =
  | { type: 'select'; selection: Selection }
  | { type: 'rename-entity'; id: string; name: string }
  | { type: 'set-entity-sort'; id: string; sort: GamSort }
  | { type: 'delete-entity'; id: string }
  | { type: 'add-entity'; sort: GamSort; name: string; sourceSpan?: SourceSpan }
  | { type: 'set-operator'; edgeId: string; operator: DeonticOperator }
  | { type: 'set-confidence'; edgeId: string; confidence: number | undefined }
  | { type: 'set-edge-clause'; edgeId: string; clause: SegmentedClause | null }
  | { type: 'rewire'; edgeId: string; end: 'source' | 'target'; nodeId: string }
  | { type: 'delete-edge'; edgeId: string }
  | { type: 'add-edge'; ref: EdgeRef; operator: DeonticOperator | null }
  | { type: 'concept-add'; label: string; category: ExtractedConceptToken['category']; clause?: SegmentedClause }
  | { type: 'concept-rename'; id: string; label: string }
  | { type: 'concept-set-category'; id: string; category: ExtractedConceptToken['category'] }
  | { type: 'concept-delete'; id: string }
  | { type: 'concept-bind'; id: string; sort: GamSort }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; doc: EditorDoc; edited: boolean };

export function docFromSeed(seed: EditorSeed): EditorDoc {
  return { model: ensureEdgeIds(stripGeneratedChecks(seed.galModel)), concepts: structuredClone(seed.concepts), annotations: {} };
}

function pascal(label: string): string {
  const words = label.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join('') || 'Entity';
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

function removeEntity(doc: EditorDoc, id: string): EditorDoc {
  const touches = (e: { source: string; target: string; parameters?: { activity_or_process?: string | null } | object }) =>
    e.source === id || e.target === id || (e.parameters as { activity_or_process?: string | null } | undefined)?.activity_or_process === id;
  const removedEdges = new Set([...doc.model.relations, ...doc.model.policies].filter(touches).map((e) => e.id!));
  const annotations = Object.fromEntries(Object.entries(doc.annotations).filter(([k]) => !removedEdges.has(k)));
  return {
    model: {
      ...doc.model,
      entities: doc.model.entities.filter((e) => e.id !== id),
      relations: doc.model.relations.filter((e) => !touches(e)),
      policies: doc.model.policies.filter((e) => !touches(e)),
    },
    concepts: doc.concepts.map((c) => (c.mappedEntityId === id ? { ...c, mappedEntityId: undefined } : c)),
    annotations,
  };
}

function createEntity(doc: EditorDoc, sort: GamSort, name: string, sourceSpan?: SourceSpan): { doc: EditorDoc; id: string } {
  const id = uniqueId(pascal(name), doc.model.entities.map((e) => e.id));
  const entity: GalEntity = { id, type: sort, sort, name, jurisdiction: doc.model.jurisdiction.country, description: 'Added in the deontic editor.', sourceSpan, verified: false };
  return { doc: { ...doc, model: { ...doc.model, entities: [...doc.model.entities, entity] } }, id };
}

/** Apply one action to a document. Returns null when the action does not change the document. */
function edit(doc: EditorDoc, action: EditorAction): { doc: EditorDoc; selection?: Selection } | null {
  const model = doc.model;
  switch (action.type) {
    case 'rename-entity': {
      const name = action.name.trim();
      if (!name || model.entities.find((e) => e.id === action.id)?.name === name) return null;
      return { doc: { ...doc, model: { ...model, entities: model.entities.map((e) => (e.id === action.id ? { ...e, name } : e)) } } };
    }
    case 'set-entity-sort':
      return { doc: { ...doc, model: { ...model, entities: model.entities.map((e) => (e.id === action.id ? { ...e, type: action.sort, sort: action.sort } : e)) } } };
    case 'delete-entity':
      return { doc: removeEntity(doc, action.id), selection: { kind: 'none' } };
    case 'add-entity': {
      const created = createEntity(doc, action.sort, action.name, action.sourceSpan);
      return { doc: created.doc, selection: { kind: 'node', id: created.id } };
    }
    case 'set-operator': {
      if (!findEdge(model, action.edgeId)) return null;
      return {
        doc: { ...doc, model: applyOperator(model, action.edgeId, action.operator), annotations: { ...doc.annotations, [action.edgeId]: { ...doc.annotations[action.edgeId], operator: action.operator } } },
      };
    }
    case 'set-confidence':
      return { doc: { ...doc, annotations: { ...doc.annotations, [action.edgeId]: { ...doc.annotations[action.edgeId], confidence: action.confidence } } } };
    case 'set-edge-clause': {
      const span = action.clause ? { ...action.clause.sourceSpan, clauseId: action.clause.id, text: action.clause.text } : undefined;
      const patch = <T extends { id?: string; sourceSpan?: SourceSpan }>(e: T): T => (e.id === action.edgeId ? { ...e, sourceSpan: span } : e);
      return { doc: { ...doc, model: { ...model, relations: model.relations.map(patch), policies: model.policies.map(patch) } } };
    }
    case 'rewire': {
      const patch = <T extends { id?: string; source: string; target: string }>(e: T): T => (e.id === action.edgeId ? { ...e, [action.end]: action.nodeId } : e);
      const ref = findEdge(model, action.edgeId);
      if (!ref || ref.edge[action.end] === action.nodeId) return null;
      return { doc: { ...doc, model: { ...model, relations: model.relations.map(patch), policies: model.policies.map(patch) } } };
    }
    case 'delete-edge': {
      const { [action.edgeId]: _removed, ...annotations } = doc.annotations;
      return {
        doc: { ...doc, annotations, model: { ...model, relations: model.relations.filter((e) => e.id !== action.edgeId), policies: model.policies.filter((e) => e.id !== action.edgeId) } },
        selection: { kind: 'none' },
      };
    }
    case 'add-edge': {
      const id = uniqueId(action.ref.edge.id ?? 'edge', [...model.relations, ...model.policies].map((e) => e.id!));
      const ref = { ...action.ref, edge: { ...action.ref.edge, id } } as EdgeRef;
      const next = ref.kind === 'relation'
        ? { ...model, relations: [...model.relations, ref.edge as GalJsonModel['relations'][number]] }
        : { ...model, policies: [...model.policies, ref.edge as GalJsonModel['policies'][number]] };
      const annotations = action.operator ? { ...doc.annotations, [id]: { operator: action.operator } } : doc.annotations;
      return { doc: { ...doc, model: next, annotations }, selection: { kind: 'edge', id } };
    }
    case 'concept-add': {
      const label = action.label.trim();
      if (!label) return null;
      const id = uniqueId(`editor#k${doc.concepts.length + 1}`, doc.concepts.map((c) => c.id));
      const span: SourceSpan = action.clause ? { ...action.clause.sourceSpan, clauseId: action.clause.id } : { start: 0, end: 0 };
      let next = doc;
      let mappedEntityId: string | undefined;
      const sort = BINDABLE[action.category];
      if (sort) {
        const created = createEntity(doc, sort, label, action.clause ? span : undefined);
        next = created.doc; mappedEntityId = created.id;
      }
      const concept: ExtractedConceptToken = { id, label, category: action.category, sourceSpan: span, clauseId: action.clause?.id ?? '', verified: false, mappedEntityId, notes: 'Added in the deontic editor.' };
      return { doc: { ...next, concepts: [...next.concepts, concept] }, selection: { kind: 'concept', id } };
    }
    case 'concept-rename': {
      const label = action.label.trim();
      const concept = doc.concepts.find((c) => c.id === action.id);
      if (!label || !concept || concept.label === label) return null;
      const concepts = doc.concepts.map((c) => (c.id === action.id ? { ...c, label } : c));
      const entities = concept.mappedEntityId ? model.entities.map((e) => (e.id === concept.mappedEntityId ? { ...e, name: label } : e)) : model.entities;
      return { doc: { ...doc, concepts, model: { ...model, entities } } };
    }
    case 'concept-set-category': {
      const concept = doc.concepts.find((c) => c.id === action.id);
      if (!concept || concept.category === action.category) return null;
      const sort = BINDABLE[action.category];
      let next: EditorDoc = { ...doc, concepts: doc.concepts.map((c) => (c.id === action.id ? { ...c, category: action.category } : c)) };
      if (concept.mappedEntityId && sort) {
        next = { ...next, model: { ...next.model, entities: next.model.entities.map((e) => (e.id === concept.mappedEntityId ? { ...e, type: sort, sort } : e)) } };
      } else if (concept.mappedEntityId && !sort) {
        next = { ...next, concepts: next.concepts.map((c) => (c.id === action.id ? { ...c, mappedEntityId: undefined } : c)) };
      }
      return { doc: next };
    }
    case 'concept-delete': {
      const concept = doc.concepts.find((c) => c.id === action.id);
      if (!concept) return null;
      let next: EditorDoc = { ...doc, concepts: doc.concepts.filter((c) => c.id !== action.id) };
      const id = concept.mappedEntityId;
      if (id && !next.concepts.some((c) => c.mappedEntityId === id)) next = removeEntity(next, id);
      return { doc: next, selection: { kind: 'none' } };
    }
    case 'concept-bind': {
      const concept = doc.concepts.find((c) => c.id === action.id);
      if (!concept) return null;
      const created = createEntity(doc, action.sort, concept.label, concept.clauseId ? concept.sourceSpan : undefined);
      return { doc: { ...created.doc, concepts: created.doc.concepts.map((c) => (c.id === action.id ? { ...c, mappedEntityId: created.id } : c)) }, selection: { kind: 'node', id: created.id } };
    }
    default:
      return null;
  }
}

function reducer(state: State, action: EditorAction): State {
  switch (action.type) {
    case 'select':
      return { ...state, selection: action.selection };
    case 'undo': {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return { ...state, doc: prev, past: state.past.slice(0, -1), future: [state.doc, ...state.future], edited: true };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { ...state, doc: next, past: [...state.past, state.doc].slice(-UNDO_LIMIT), future: rest, edited: true };
    }
    case 'load':
      return { doc: action.doc, past: [], future: [], edited: action.edited, selection: { kind: 'none' } };
    default: {
      const result = edit(state.doc, action);
      if (!result) return state;
      return {
        doc: result.doc,
        past: [...state.past, state.doc].slice(-UNDO_LIMIT),
        future: [],
        edited: true,
        selection: result.selection ?? state.selection,
      };
    }
  }
}

export interface EditorContextValue {
  seed: EditorSeed;
  doc: EditorDoc;
  edited: boolean;
  readOnly: boolean;
  selection: Selection;
  canUndo: boolean;
  canRedo: boolean;
  /** Full engine re-run over the edited model. */
  result: TranslationResult;
  issues: EditorIssue[];
  dispatch: (action: EditorAction) => void;
  select: (selection: Selection) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>');
  return ctx;
}

/** Recompile an edited document through the GAM engine. Edited drafts are never labelled human-reviewed. */
export function compileDoc(seed: EditorSeed, doc: EditorDoc, edited: boolean): { result: TranslationResult; issues: EditorIssue[] } {
  const result = retranslateEditedModel({
    lawId: seed.lawId, provisionId: seed.provisionId,
    readiness: edited ? 'unverified-draft' : seed.readiness,
    sourceText: seed.sourceText, clauses: seed.clauses, concepts: doc.concepts, galModel: doc.model,
    unmappedClauses: seed.unmappedClauses, ambiguousInterpretations: seed.ambiguousInterpretations,
  });
  return { result, issues: lintModel(result.galModel, doc.annotations, result.validation) };
}

export const EditorProvider: React.FC<{
  seed: EditorSeed;
  initialDoc?: EditorDoc;
  readOnly?: boolean;
  children: React.ReactNode;
}> = ({ seed, initialDoc, readOnly = false, children }) => {
  const [state, rawDispatch] = useReducer(reducer, undefined, () => ({
    doc: initialDoc ?? docFromSeed(seed), past: [], future: [], edited: !!initialDoc, selection: { kind: 'none' } as Selection,
  }));
  const dispatch = useCallback((action: EditorAction) => {
    if (readOnly && action.type !== 'select') return;
    rawDispatch(action);
  }, [readOnly]);
  const select = useCallback((selection: Selection) => rawDispatch({ type: 'select', selection }), []);
  const { result, issues } = useMemo(() => compileDoc(seed, state.doc, state.edited), [seed, state.doc, state.edited]);
  const value = useMemo<EditorContextValue>(() => ({
    seed, doc: state.doc, edited: state.edited, readOnly, selection: state.selection,
    canUndo: state.past.length > 0, canRedo: state.future.length > 0, result, issues, dispatch, select,
  }), [seed, state, readOnly, result, issues, dispatch, select]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

// ─── Selection helpers ─────────────────────────────────────────────────────────

/** Entities and edges that the current selection points at, for cross-highlighting. */
export function highlightedIds(sel: Selection, doc: EditorDoc, clauses: SegmentedClause[]): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>(), edges = new Set<string>();
  const all = [...doc.model.relations, ...doc.model.policies];
  if (sel.kind === 'node') {
    nodes.add(sel.id);
    for (const e of all) if (e.source === sel.id || e.target === sel.id) edges.add(e.id!);
  } else if (sel.kind === 'edge') {
    const e = all.find((x) => x.id === sel.id);
    if (e) { edges.add(e.id!); nodes.add(e.source); nodes.add(e.target); }
  } else if (sel.kind === 'concept') {
    const c = doc.concepts.find((x) => x.id === sel.id);
    if (c?.mappedEntityId) nodes.add(c.mappedEntityId);
    if (c?.mappedRelationId) edges.add(c.mappedRelationId);
  } else if (sel.kind === 'clause') {
    const clause = clauses.find((c) => c.id === sel.id);
    const inClause = (s?: SourceSpan) => !!s && (s.clauseId === sel.id || (!!clause && s.start >= clause.sourceSpan.start && s.end <= clause.sourceSpan.end && s.end > s.start));
    for (const ent of doc.model.entities) if (inClause(ent.sourceSpan)) nodes.add(ent.id);
    for (const e of all) if (inClause(e.sourceSpan)) edges.add(e.id!);
  } else if (sel.kind === 'pending') {
    nodes.add(sel.source); nodes.add(sel.target);
  }
  return { nodes, edges };
}

export function sortOf(model: GalJsonModel, id: string): GamSort | undefined {
  return entitySort(model.entities.find((e) => e.id === id));
}

// ─── Drafts (per-viewer browser storage) and share links ──────────────────────

const draftKey = (seed: EditorSeed) => `law-gal-editor:draft:${seed.key}`;

export function saveDraft(seed: EditorSeed, doc: EditorDoc): boolean {
  try {
    window.localStorage.setItem(draftKey(seed), JSON.stringify({ savedAt: new Date().toISOString(), doc }));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(seed: EditorSeed): { savedAt: string; doc: EditorDoc } | null {
  try {
    const raw = window.localStorage.getItem(draftKey(seed));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(seed: EditorSeed): void {
  try { window.localStorage.removeItem(draftKey(seed)); } catch { /* storage unavailable */ }
}

export interface SharePayload {
  v: 1;
  lawId: string;
  provisionId: string;
  mode: 'curated' | 'live-pipeline' | 'custom';
  customText?: string;
  readOnly: boolean;
  doc: EditorDoc;
}

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipeBytes(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([new Uint8Array(bytes).buffer]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Encode editor state into a URL fragment. Fragments are never sent to a server. */
export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream !== 'undefined') {
    try { return `z${toBase64Url(await pipeBytes(json, new CompressionStream('deflate-raw')))}`; } catch { /* fall through */ }
  }
  return `j${toBase64Url(json)}`;
}

export async function decodeShare(token: string): Promise<SharePayload | null> {
  try {
    const bytes = fromBase64Url(token.slice(1));
    const json = token[0] === 'z' ? await pipeBytes(bytes, new DecompressionStream('deflate-raw')) : bytes;
    const payload = JSON.parse(new TextDecoder().decode(json));
    return payload?.v === 1 && payload.doc?.model ? payload : null;
  } catch {
    return null;
  }
}
