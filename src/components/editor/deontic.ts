/**
 * Deontic operator layer for the interactive editor.
 *
 * The five editor operators are a presentation vocabulary over GAL, not new
 * semantics. Each one writes standard GAL fields:
 *
 *   Must / Shall → Allow + deontic_status Obligatory (Hohfeld: Duty)
 *   May          → Allow + deontic_status Permitted  (Hohfeld: Privilege)
 *   Can          → Allow + deontic_status Permitted  (Hohfeld: Power)
 *   Prohibits    → Deny  + deontic_status Prohibited (Hohfeld: No-Right)
 *
 * GAL cannot distinguish Must from Shall; that choice (and reviewer confidence)
 * lives in editor annotations. Structural families (PP, PA, RR, S, X) carry no
 * deontic operator.
 */
import type {
  DeonticStatus,
  FormalValidationReport,
  GalJsonModel,
  GalPolicy,
  GalRelation,
  GamSort,
  HohfeldianModality,
  PolarityModality,
} from '../../types/contracts';
import { entitySort } from '../../engine/gam-adapter';

export type DeonticOperator = 'Must' | 'Shall' | 'May' | 'Can' | 'Prohibits';

export const DEONTIC_OPERATORS: readonly DeonticOperator[] = ['Must', 'Shall', 'May', 'Can', 'Prohibits'];

export const OPERATOR_META: Record<DeonticOperator, {
  gloss: string;
  color: string; // CSS custom property, see .law-editor tokens
  modality: PolarityModality;
  deontic: DeonticStatus;
  hohfeld: HohfeldianModality;
}> = {
  Must: { gloss: 'Duty / obligation', color: 'var(--color-deontic-must)', modality: 'Allow', deontic: 'Obligatory', hohfeld: 'Duty' },
  Shall: { gloss: 'Mandatory (drafting form)', color: 'var(--color-deontic-shall)', modality: 'Allow', deontic: 'Obligatory', hohfeld: 'Duty' },
  May: { gloss: 'Permission', color: 'var(--color-deontic-may)', modality: 'Allow', deontic: 'Permitted', hohfeld: 'Privilege' },
  Can: { gloss: 'Ability / power', color: 'var(--color-deontic-can)', modality: 'Allow', deontic: 'Permitted', hohfeld: 'Power' },
  Prohibits: { gloss: 'Denial', color: 'var(--color-deontic-prohibit)', modality: 'Deny', deontic: 'Prohibited', hohfeld: 'No-Right' },
};

export const STRUCTURAL_COLOR = 'var(--color-text-tertiary)';

export type FamilyId = 'PP' | 'PA' | 'RR' | 'S' | 'X' | 'RA' | 'RU' | 'UP' | 'RP' | 'D' | 'EXT';
export const STRUCTURAL_FAMILIES: readonly FamilyId[] = ['PP', 'PA', 'RR', 'S', 'X'];

const RELATION_FAMILY: Record<string, FamilyId> = {
  ComposedOf: 'PP', Contains: 'PA', Includes: 'RR', Next: 'S', Separate: 'X',
  Acts: 'RU', Assumes: 'UP', AssignedTo: 'RA', Reaches: 'RP',
};
const POLICY_FAMILY: Record<string, FamilyId> = {
  CanAssignTo: 'RA', CanAct: 'RU', CanAssume: 'UP', CanReach: 'RP', CanDelegate: 'D',
};

export type EdgeKind = 'relation' | 'policy';
export interface EdgeRef {
  kind: EdgeKind;
  edge: GalRelation | GalPolicy;
}

export interface EdgeAnnotation {
  operator?: DeonticOperator;
  /** Reviewer-assigned confidence in [0, 1]; undefined means not yet rated. */
  confidence?: number;
}
export type EdgeAnnotations = Record<string, EdgeAnnotation>;

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function familyOf(kind: EdgeKind, type: string): FamilyId {
  return (kind === 'relation' ? RELATION_FAMILY[type] : POLICY_FAMILY[type]) ?? 'EXT';
}

/** Give every relation and policy a stable id that is unique across both lists. */
export function ensureEdgeIds(input: GalJsonModel): GalJsonModel {
  const model = structuredClone(input);
  const seen = new Set<string>();
  for (const kind of ['relation', 'policy'] as const) {
    const list = kind === 'relation' ? model.relations : model.policies;
    list.forEach((e, i) => {
      let id = e.id ?? `${kind}-${i + 1}`;
      while (seen.has(id)) id = `${id}′`;
      e.id = id;
      seen.add(id);
    });
  }
  return model;
}

export function listEdges(model: GalJsonModel): EdgeRef[] {
  return [
    ...model.relations.map((edge) => ({ kind: 'relation' as const, edge })),
    ...model.policies.map((edge) => ({ kind: 'policy' as const, edge })),
  ];
}

export function findEdge(model: GalJsonModel, id: string): EdgeRef | undefined {
  return listEdges(model).find((r) => r.edge.id === id);
}

export interface OperatorInfo {
  operator: DeonticOperator | null;
  /** True when no GAL field records the operator and it was read from source wording. */
  inferred: boolean;
  editable: boolean;
}

function wordingOperator(text: string | undefined): DeonticOperator | null {
  if (!text) return null;
  if (/\b(shall|must|may)\s+not\b|\bno\s+\w+\s+(shall|may)\b|\bprohibit/i.test(text)) return 'Prohibits';
  if (/\bmust\b/i.test(text)) return 'Must';
  if (/\bshall\b/i.test(text)) return 'Shall';
  if (/\bmay\b/i.test(text)) return 'May';
  return null;
}

function obligationWording(text: string | undefined): DeonticOperator {
  return /\bshall\b/i.test(text ?? '') && !/\bmust\b/i.test(text ?? '') ? 'Shall' : 'Must';
}

export function operatorInfo(ref: EdgeRef, annotation?: EdgeAnnotation): OperatorInfo {
  const { kind, edge } = ref;
  const family = familyOf(kind, edge.type);
  if (STRUCTURAL_FAMILIES.includes(family)) return { operator: null, inferred: false, editable: false };
  const text = edge.sourceSpan?.text;

  if (kind === 'policy') {
    const p = edge as GalPolicy;
    let recorded: DeonticOperator;
    if ((p.modality || p.allow_deny) === 'Deny') recorded = 'Prohibits';
    else if (p.deontic_status === 'Obligatory') recorded = obligationWording(text);
    else if (p.hohfeldian_modality === 'Power') recorded = 'Can';
    else recorded = 'May';
    // Annotation may only refine within the same GAL meaning (e.g. Must ↔ Shall).
    const a = annotation?.operator;
    const operator = a && sameGalMeaning(a, recorded) ? a : recorded;
    // Every policy carries modality and deontic status, so every policy's operator is editable.
    return { operator, inferred: false, editable: true };
  }

  const r = edge as GalRelation;
  if (family === 'EXT') {
    const ext: Record<string, DeonticOperator> = { Obligation: 'Must', MustReport: 'Must', Permission: 'May', Prohibition: 'Prohibits' };
    return { operator: ext[r.type] ?? null, inferred: false, editable: false };
  }
  const status = r.parameters?.deontic_status;
  if (status === 'Obligatory') {
    const a = annotation?.operator;
    return { operator: a === 'Must' || a === 'Shall' ? a : obligationWording(text), inferred: false, editable: true };
  }
  if (status === 'Permitted') {
    const a = annotation?.operator;
    return { operator: a === 'May' || a === 'Can' ? a : 'May', inferred: false, editable: true };
  }
  if (annotation?.operator && annotation.operator !== 'Prohibits') return { operator: annotation.operator, inferred: false, editable: true };
  // A positive relation is an RA+/RU+/UP+/RP+ fact; without a recorded status read the source wording.
  const worded = wordingOperator(text);
  return { operator: worded && worded !== 'Prohibits' ? worded : 'Can', inferred: true, editable: true };
}

function sameGalMeaning(a: DeonticOperator, b: DeonticOperator): boolean {
  const ma = OPERATOR_META[a], mb = OPERATOR_META[b];
  return ma.modality === mb.modality && ma.deontic === mb.deontic && (ma.hohfeld === mb.hohfeld || ma.deontic === 'Obligatory');
}

/** Positive relation → the policy that can carry a Deny, with canonical endpoint order. */
const RELATION_TO_POLICY: Record<string, { type: GalPolicy['type']; swap: boolean }> = {
  AssignedTo: { type: 'CanAssignTo', swap: true }, // Role → Activity  ⇒  Activity → Role
  Acts: { type: 'CanAct', swap: true },            // Role → User      ⇒  User → Role
  Assumes: { type: 'CanAssume', swap: false },     // User → Process
  Reaches: { type: 'CanReach', swap: false },      // Role → Process
};

/** Write an operator into GAL fields. A Prohibits on a positive relation becomes the matching Deny policy. */
export function applyOperator(input: GalJsonModel, edgeId: string, op: DeonticOperator): GalJsonModel {
  const model = structuredClone(input);
  const meta = OPERATOR_META[op];
  const pIdx = model.policies.findIndex((p) => p.id === edgeId);
  if (pIdx >= 0) {
    const p = model.policies[pIdx];
    model.policies[pIdx] = { ...p, modality: meta.modality, allow_deny: meta.modality, deontic_status: meta.deontic, hohfeldian_modality: meta.hohfeld };
    return model;
  }
  const rIdx = model.relations.findIndex((r) => r.id === edgeId);
  if (rIdx < 0) return model;
  const r = model.relations[rIdx];
  const conversion = RELATION_TO_POLICY[r.type];
  if (!conversion) return model;
  if (op === 'Prohibits') {
    const [source, target] = conversion.swap ? [r.target, r.source] : [r.source, r.target];
    model.relations.splice(rIdx, 1);
    model.policies.push({
      id: r.id, type: conversion.type, modality: 'Deny', allow_deny: 'Deny', deontic_status: 'Prohibited',
      hohfeldian_modality: 'No-Right', power_subtype: 'None', source, target,
      parameters: { jurisdiction: r.parameters?.jurisdiction ?? null, condition: r.parameters?.condition ?? null },
      sourceSpan: r.sourceSpan,
      rationale: `${r.rationale ? `${r.rationale} ` : ''}Converted from ${r.type} to a ${conversion.type} Deny policy in the editor.`,
    });
    return model;
  }
  model.relations[rIdx] = { ...r, parameters: { ...r.parameters, deontic_status: meta.deontic } };
  return model;
}

// ─── Creating relations ────────────────────────────────────────────────────────

export interface FamilyOption {
  family: FamilyId;
  label: string;
  structural: boolean;
  /** Ids in the family's canonical order (e.g. RA: role, activity). */
  first: string;
  second: string;
}

const FAMILY_LABEL: Record<FamilyId, string> = {
  PP: 'PP — process composition (ComposedOf)',
  PA: 'PA — process contains activity (Contains)',
  RR: 'RR — senior role includes junior (Includes)',
  S: 'S — activity succession (Next)',
  X: 'X — separation of concerns (Separate)',
  RA: 'RA± — role ↔ activity assignment',
  RU: 'RU± — role occupancy by user',
  UP: 'UP± — user access to process',
  RP: 'RP± — role reaches process',
  D: 'D± — delegation between roles',
  EXT: 'Extension',
};

/** GAM families that can connect two entities of the given sorts, in canonical order. */
export function familyOptionsFor(source: { id: string; sort?: GamSort }, target: { id: string; sort?: GamSort }): FamilyOption[] {
  const s = source.sort, t = target.sort;
  const out: FamilyOption[] = [];
  const add = (family: FamilyId, first: string, second: string) =>
    out.push({ family, label: FAMILY_LABEL[family], structural: STRUCTURAL_FAMILIES.includes(family), first, second });
  const pair = (a: GamSort, b: GamSort) => s === a && t === b;
  const either = (a: GamSort, b: GamSort) => (pair(a, b) ? [source.id, target.id] : pair(b, a) ? [target.id, source.id] : null);
  if (pair('Process', 'Process')) { add('PP', source.id, target.id); add('X', source.id, target.id); }
  if (pair('Role', 'Role')) { add('RR', source.id, target.id); add('D', source.id, target.id); }
  if (pair('Activity', 'Activity')) add('S', source.id, target.id);
  const pa = either('Process', 'Activity'); if (pa) add('PA', pa[0], pa[1]);
  const ra = either('Role', 'Activity'); if (ra) add('RA', ra[0], ra[1]);
  const ru = either('Role', 'User'); if (ru) add('RU', ru[0], ru[1]);
  const up = either('User', 'Process'); if (up) add('UP', up[0], up[1]);
  const rp = either('Role', 'Process'); if (rp) add('RP', rp[0], rp[1]);
  return out;
}

export function noFamilyExplanation(s?: GamSort, t?: GamSort): string {
  if (!s || !t) return 'Both endpoints need a GAM sort (P, A, R or U) before they can be related.';
  if ((s === 'User' && t === 'Activity') || (s === 'Activity' && t === 'User'))
    return 'GAM has no direct User ↔ Activity relation: users reach activities through roles (RU then RA*).';
  return `GAM defines no relation family between ${s} and ${t}.`;
}

const STRUCTURAL_TYPE: Partial<Record<FamilyId, GalRelation['type']>> = {
  PP: 'ComposedOf', PA: 'Contains', RR: 'Includes', S: 'Next', X: 'Separate',
};

/** Build a canonical GAL edge for a family. Deontic families are written as policies so they can carry Allow/Deny. */
export function buildEdge(
  option: FamilyOption,
  operator: DeonticOperator | null,
  id: string,
  extras: { jurisdiction?: string | null; delegationScope?: string | null; sourceSpan?: GalRelation['sourceSpan'] } = {},
): EdgeRef {
  const { first, second, family } = option;
  const structural = STRUCTURAL_TYPE[family];
  if (structural) {
    return { kind: 'relation', edge: { id, type: structural, source: first, target: second, parameters: { jurisdiction: extras.jurisdiction ?? null }, sourceSpan: extras.sourceSpan, rationale: 'Added in the deontic editor.' } };
  }
  const meta = OPERATOR_META[operator ?? 'May'];
  const policy = (type: GalPolicy['type'], source: string, target: string): EdgeRef => ({
    kind: 'policy',
    edge: {
      id, type, source, target, modality: meta.modality, allow_deny: meta.modality, deontic_status: meta.deontic,
      hohfeldian_modality: meta.hohfeld, power_subtype: 'None',
      parameters: { jurisdiction: extras.jurisdiction ?? null, activity_or_process: family === 'D' ? extras.delegationScope ?? null : null },
      sourceSpan: extras.sourceSpan, rationale: 'Added in the deontic editor.',
    },
  });
  switch (family) {
    case 'RA': return policy('CanAssignTo', second, first); // Activity → Role
    case 'RU': return policy('CanAct', second, first);      // User → Role
    case 'UP': return policy('CanAssume', first, second);   // User → Process
    case 'RP': return policy('CanReach', first, second);    // Role → Process
    default: return policy('CanDelegate', first, second);   // from Role → to Role
  }
}

// ─── Φ tuple projection ────────────────────────────────────────────────────────

/** Canonical (family, a, b[, scope]) key so AssignedTo(r, a) and CanAssignTo(a, r) compare equal. */
export function canonicalPair(ref: EdgeRef): { family: FamilyId; a: string; b: string; scope?: string } {
  const { kind, edge } = ref;
  const family = familyOf(kind, edge.type);
  const swapped = kind === 'policy' && (edge.type === 'CanAssignTo' || edge.type === 'CanAct');
  const scope = edge.type === 'CanDelegate' ? (edge as GalPolicy).parameters?.activity_or_process ?? undefined : undefined;
  return swapped ? { family, a: edge.target, b: edge.source, scope } : { family, a: edge.source, b: edge.target, scope };
}

const PAIR_FIELDS: Partial<Record<FamilyId, [string, string]>> = {
  PP: ['parent', 'child'], PA: ['process', 'activity'], RR: ['senior', 'junior'], S: ['from', 'to'], X: ['process', 'process2'],
  RA: ['role', 'activity'], RU: ['role', 'user'], UP: ['user', 'process'], RP: ['role', 'process'], D: ['from', 'to'],
};

/** Project the GAL model into the formal tuple Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩. */
export function projectPhi(model: GalJsonModel, annotations: EdgeAnnotations): Record<string, unknown> {
  const bySort = (sort: GamSort) => model.entities.filter((e) => entitySort(e) === sort).map((e) => e.id);
  const phi: Record<string, unknown[]> = {
    P: bySort('Process'), A: bySort('Activity'), R: bySort('Role'), U: bySort('User'),
    PP: [], PA: [], RR: [], S: [], X: [],
    'RA+': [], 'RA-': [], 'RU+': [], 'RU-': [], 'UP+': [], 'UP-': [], 'RP+': [], 'RP-': [], 'D+': [], 'D-': [],
  };
  for (const ref of listEdges(model)) {
    const { family, a, b, scope } = canonicalPair(ref);
    const fields = PAIR_FIELDS[family];
    if (!fields) continue;
    const entry: Record<string, unknown> = { [fields[0]]: a, [fields[1]]: b };
    if (scope) entry.scope = scope;
    if (STRUCTURAL_FAMILIES.includes(family)) { phi[family].push(entry); continue; }
    const info = operatorInfo(ref, annotations[ref.edge.id!]);
    entry.operator = info.operator;
    const confidence = annotations[ref.edge.id!]?.confidence;
    if (confidence !== undefined) entry.confidence = confidence;
    phi[`${family}${info.operator === 'Prohibits' ? '-' : '+'}`].push(entry);
  }
  return { 'Φ': phi };
}

// ─── Validation ────────────────────────────────────────────────────────────────

export type IssueSeverity = 'error' | 'warning';
export interface EditorIssue {
  id: string;
  severity: IssueSeverity;
  rule: 'orphan' | 'contradiction' | 'circular' | 'low-confidence' | 'uncertain' | 'schema' | 'direction' | 'closure' | 'unresolved' | 'untyped' | 'modality';
  message: string;
  entityIds: string[];
  edgeIds: string[];
  /** Explicit, reviewer-chosen resolutions; the editor never picks a side of a contradiction itself. */
  resolutions?: Array<{ label: string; removeEdgeId: string }>;
}

export function lintModel(model: GalJsonModel, annotations: EdgeAnnotations, validation: FormalValidationReport): EditorIssue[] {
  const issues: EditorIssue[] = [];
  const edges = listEdges(model);
  const name = (id: string) => model.entities.find((e) => e.id === id)?.name ?? id;

  // 1. Orphans: every entity should take part in at least one relation or policy.
  const touched = new Set<string>();
  for (const { edge } of edges) {
    touched.add(edge.source); touched.add(edge.target);
    const scope = (edge as GalPolicy).parameters?.activity_or_process;
    if (scope) touched.add(scope);
  }
  for (const e of model.entities) {
    if (!touched.has(e.id)) issues.push({ id: `orphan:${e.id}`, severity: 'warning', rule: 'orphan', message: `${name(e.id)} has no relations.`, entityIds: [e.id], edgeIds: [] });
  }

  const ops = new Map(edges.map((ref) => [ref.edge.id!, operatorInfo(ref, annotations[ref.edge.id!]).operator]));

  // 2. Polarity: RA+ and RA− (and RU, UP, RP, D) must be disjoint on the same canonical pair.
  const groups = new Map<string, EdgeRef[]>();
  for (const ref of edges) {
    const { family, a, b, scope } = canonicalPair(ref);
    if (STRUCTURAL_FAMILIES.includes(family) || family === 'EXT') continue;
    const k = [family, a, b, scope ?? ''].join('\u0000');
    groups.set(k, [...(groups.get(k) ?? []), ref]);
  }
  const contradictionPairs = new Set<string>();
  for (const group of groups.values()) {
    const neg = group.filter((r) => ops.get(r.edge.id!) === 'Prohibits');
    const pos = group.filter((r) => ops.get(r.edge.id!) && ops.get(r.edge.id!) !== 'Prohibits');
    for (const n of neg) for (const p of pos) {
      const { family, a, b } = canonicalPair(p);
      contradictionPairs.add([n.edge.id, p.edge.id].sort().join('|'));
      issues.push({
        id: `contradiction:${p.edge.id}:${n.edge.id}`, severity: 'error', rule: 'contradiction',
        message: `Contradiction in ${family}±: ${name(a)} → ${name(b)} is both [${ops.get(p.edge.id!)}] and [Prohibits].`,
        entityIds: [a, b], edgeIds: [p.edge.id!, n.edge.id!],
        resolutions: [
          { label: `Keep [${ops.get(p.edge.id!)}], remove [Prohibits]`, removeEdgeId: n.edge.id! },
          { label: `Keep [Prohibits], remove [${ops.get(p.edge.id!)}]`, removeEdgeId: p.edge.id! },
        ],
      });
    }
  }

  // 3. Circular prohibition: if A prohibits B, B must not mandate A.
  for (const n of edges.filter((r) => ops.get(r.edge.id!) === 'Prohibits')) {
    for (const m of edges.filter((r) => ['Must', 'Shall'].includes(ops.get(r.edge.id!) ?? ''))) {
      if (m.edge.source !== n.edge.target || m.edge.target !== n.edge.source) continue;
      if (contradictionPairs.has([n.edge.id, m.edge.id].sort().join('|'))) continue;
      issues.push({
        id: `circular:${n.edge.id}:${m.edge.id}`, severity: 'error', rule: 'circular',
        message: `Circular prohibition: ${name(n.edge.source)} prohibits ${name(n.edge.target)}, which mandates ${name(n.edge.source)}.`,
        entityIds: [n.edge.source, n.edge.target], edgeIds: [n.edge.id!, m.edge.id!],
        resolutions: [
          { label: 'Remove the prohibition', removeEdgeId: n.edge.id! },
          { label: `Remove the [${ops.get(m.edge.id!)}]`, removeEdgeId: m.edge.id! },
        ],
      });
    }
  }

  // 4. Confidence: reviewer ratings below threshold, and edges the extractor marked uncertain.
  for (const { edge } of edges) {
    const c = annotations[edge.id!]?.confidence;
    if (c !== undefined && c < LOW_CONFIDENCE_THRESHOLD) {
      issues.push({ id: `low:${edge.id}`, severity: 'warning', rule: 'low-confidence', message: `Low confidence (${c.toFixed(2)}): ${edge.type} ${name(edge.source)} → ${name(edge.target)}.`, entityIds: [], edgeIds: [edge.id!] });
    } else if (edge.uncertain && c === undefined) {
      issues.push({ id: `uncertain:${edge.id}`, severity: 'warning', rule: 'uncertain', message: `Conditional or uncertain extraction: ${edge.type} ${name(edge.source)} → ${name(edge.target)}. Rate it after review.`, entityIds: [], edgeIds: [edge.id!] });
    }
  }

  // 5. Engine findings from the real schema, direction, closure and reference checks.
  validation.schemaErrors.forEach((m, i) => issues.push({ id: `schema:${i}`, severity: 'error', rule: 'schema', message: m, entityIds: [], edgeIds: edges.filter((r) => m.includes(r.edge.id!)).map((r) => r.edge.id!) }));
  validation.directionWarnings.forEach((m, i) => issues.push({ id: `direction:${i}`, severity: 'error', rule: 'direction', message: m, entityIds: [], edgeIds: edges.filter((r) => m.includes(`${r.edge.id} (`)).map((r) => r.edge.id!) }));
  validation.internalViolations.forEach((v, i) => {
    const ids = [v.user, v.activity, v.process].filter((s): s is string => !!s);
    issues.push({ id: `closure:${i}`, severity: 'error', rule: 'closure', message: `${v.type}: ${v.message}`, entityIds: ids, edgeIds: [] });
  });
  validation.unresolvedReferences.forEach((ref) => issues.push({ id: `unresolved:${ref}`, severity: 'error', rule: 'unresolved', message: `Reference to unknown entity "${ref}".`, entityIds: [], edgeIds: edges.filter((r) => r.edge.source === ref || r.edge.target === ref).map((r) => r.edge.id!) }));
  validation.untypedEntities.forEach((id) => issues.push({ id: `untyped:${id}`, severity: 'warning', rule: 'untyped', message: `${name(id)} has no GAM sort (P, A, R, U).`, entityIds: [id], edgeIds: [] }));
  if (!validation.modalityConsistent) issues.push({ id: 'modality', severity: 'error', rule: 'modality', message: 'A policy’s modality and deontic status disagree (e.g. Allow + Prohibited).', entityIds: [], edgeIds: [] });

  return issues;
}

export function statusFor(issues: EditorIssue[], match: (i: EditorIssue) => boolean): 'error' | 'warning' | 'ok' {
  const hits = issues.filter(match);
  if (hits.some((i) => i.severity === 'error')) return 'error';
  return hits.length ? 'warning' : 'ok';
}
