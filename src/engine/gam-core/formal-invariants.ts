/**
 * GAM — Formal invariants and semantic audit.
 *
 * Codifies Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩ as
 * machine-readable metadata (sorts, relation/policy families, edge directions,
 * the five conjuncts of Con) and audits a GAL-JSON model against the
 * invariants that, when broken, silently produce wrong verdicts:
 *
 *   1. one vocabulary         — no `law:` / `enterprise:` namespaced ids
 *   2. explicit polarity      — Deny is positive membership in X⁻, never the
 *                               absence of Allow
 *   3. canonical edge direction — AssignedTo Role→Activity vs CanAssignTo
 *                               Activity→Role; Acts Role→User vs CanAct User→Role
 *   4. acyclic hierarchies    — ComposedOf (Process) and Includes (Role) are
 *                               strict partial orders
 *   5. compliance non-verdict — Φ_L alone, or Con alone, never claims compliance
 *
 * Source of truth for directions is model.js `_ingest`; this module is checked
 * against it by tests/formal-semantics-c01.test.ts.
 */

import type { GalJsonModel, GamSort } from '../../types/contracts';
import { GamModel } from './model.js';

// ─── Formal tuple ──────────────────────────────────────────────────────────────

export const GAM_FORMAL_TUPLE = 'Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩';

export interface SortSpec {
  symbol: 'P' | 'A' | 'R' | 'U';
  sort: GamSort;
  meaning: string;
  alloySig: string;
}

export const GAM_SORTS: readonly SortSpec[] = [
  { symbol: 'P', sort: 'Process',  meaning: 'trust zone / business process', alloySig: 'Process' },
  { symbol: 'A', sort: 'Activity', meaning: 'capability / activity',         alloySig: 'Activity' },
  { symbol: 'R', sort: 'Role',     meaning: 'identity / role',               alloySig: 'Role' },
  { symbol: 'U', sort: 'User',     meaning: 'principal / user',              alloySig: 'User' },
];

export type FamilyKind = 'structural' | 'policy';

export interface FamilySpec {
  /** symbol as written in the tuple, e.g. `RA±` */
  symbol: string;
  kind: FamilyKind;
  /** mathematical notation of the relation's type */
  notation: string;
  /** positive relation operator in `relations[]` (null if none) */
  galRelation: string | null;
  /** policy operator in `policies[]` (null if none) */
  galPolicy: string | null;
  /** Alloy 6 field(s): [positive, negative] for ± families, [field] otherwise */
  alloyFields: readonly string[];
  /** direction of the positive relation operator, as [source sort, target sort] */
  relationDirection: readonly [GamSort, GamSort] | null;
  /** direction of the policy operator's `source` → `target` */
  policyDirection: readonly [GamSort, GamSort] | null;
  note: string;
}

export const GAM_FAMILIES: readonly FamilySpec[] = [
  { symbol: 'PP', kind: 'structural', notation: 'PP ⊆ P × P', galRelation: 'ComposedOf', galPolicy: null,
    alloyFields: ['subProcess'], relationDirection: ['Process', 'Process'], policyDirection: null,
    note: 'parent Process → child Process; strict partial order' },
  { symbol: 'PA', kind: 'structural', notation: 'PA ⊆ P × A', galRelation: 'Contains', galPolicy: null,
    alloyFields: ['activity'], relationDirection: ['Process', 'Activity'], policyDirection: null,
    note: 'Process contains Activity' },
  { symbol: 'RR', kind: 'structural', notation: 'RR ⊆ R × R', galRelation: 'Includes', galPolicy: null,
    alloyFields: ['subRole'], relationDirection: ['Role', 'Role'], policyDirection: null,
    note: 'senior Role → junior Role (senior inherits junior); strict partial order' },
  { symbol: 'S', kind: 'structural', notation: 'S ⊆ A × A', galRelation: 'Next', galPolicy: null,
    alloyFields: ['next'], relationDirection: ['Activity', 'Activity'], policyDirection: null,
    note: 'immediate succession; S⁺ is used by scenario checks' },
  { symbol: 'X', kind: 'structural', notation: 'X ⊆ P × P (unordered pairs)', galRelation: 'Separate', galPolicy: null,
    alloyFields: ['sep'], relationDirection: ['Process', 'Process'], policyDirection: null,
    note: 'separation of concerns; symmetric and irreflexive' },
  { symbol: 'RA±', kind: 'policy', notation: 'RA⁺, RA⁻ ⊆ R × A', galRelation: 'AssignedTo', galPolicy: 'CanAssignTo',
    alloyFields: ['mayDo', 'mustNotDo'], relationDirection: ['Role', 'Activity'], policyDirection: ['Activity', 'Role'],
    note: 'AssignedTo is Role→Activity; CanAssignTo is Activity→Role (reversed)' },
  { symbol: 'RU±', kind: 'policy', notation: 'RU⁺, RU⁻ ⊆ R × U', galRelation: 'Acts', galPolicy: 'CanAct',
    alloyFields: ['mayAct', 'mustNotAct'], relationDirection: ['Role', 'User'], policyDirection: ['User', 'Role'],
    note: 'Acts is Role→User; CanAct is User→Role (reversed). Alloy stores mayAct as User→Role.' },
  { symbol: 'UP±', kind: 'policy', notation: 'UP⁺, UP⁻ ⊆ U × P', galRelation: 'Assumes', galPolicy: 'CanAssume',
    alloyFields: ['mayAssume', 'mustNotAssume'], relationDirection: ['User', 'Process'], policyDirection: ['User', 'Process'],
    note: 'User → Process in both forms' },
  { symbol: 'RP±', kind: 'policy', notation: 'RP⁺, RP⁻ ⊆ R × P', galRelation: 'Reaches', galPolicy: 'CanReach',
    alloyFields: ['mayReach', 'mustNotReach'], relationDirection: ['Role', 'Process'], policyDirection: ['Role', 'Process'],
    note: 'Role → Process in both forms (role-level zone grant)' },
  { symbol: 'D±', kind: 'policy', notation: 'D⁺, D⁻ ⊆ R × R × (A ∪ P ∪ {⊤})', galRelation: null, galPolicy: 'CanDelegate',
    alloyFields: ['mayDelegate', 'mustNotDelegate'], relationDirection: null, policyDirection: ['Role', 'Role'],
    note: 'from Role → to Role; parameters.activity_or_process, omitted = unrestricted ⊤' },
];

export const GAM_FAMILY_SYMBOLS = GAM_FAMILIES.map(f => f.symbol);

/** Positive relation operators → canonical [source sort, target sort]. */
export const CANONICAL_RELATION_DIRECTIONS: Readonly<Record<string, readonly [GamSort, GamSort]>> =
  Object.fromEntries(GAM_FAMILIES.filter(f => f.galRelation && f.relationDirection)
    .map(f => [f.galRelation as string, f.relationDirection as readonly [GamSort, GamSort]]));

/** Policy operators → canonical `source` → `target` sorts (NOT the stored order). */
export const CANONICAL_POLICY_DIRECTIONS: Readonly<Record<string, readonly [GamSort, GamSort]>> =
  Object.fromEntries(GAM_FAMILIES.filter(f => f.galPolicy && f.policyDirection)
    .map(f => [f.galPolicy as string, f.policyDirection as readonly [GamSort, GamSort]]));

/** policy types that GamModel actually reads; any other `Can*` is pipeline vocabulary */
export const CHECKED_POLICY_TYPES = Object.keys(CANONICAL_POLICY_DIRECTIONS);

// ─── Con conjuncts ─────────────────────────────────────────────────────────────

export interface ConjunctSpec {
  index: number;
  name: 'NoActivityConflict' | 'NoRoleOccupancyConflict' | 'NoProcessAccessConflict'
      | 'SeparationRespected' | 'DelegationSound';
  formula: string;
  explanation: string;
  violationTypes: readonly string[];
}

/** The five conjuncts of Con(⋀Φ_E ∧ ⋀Φ_L), mirroring `pred Con` in gam_core.als. */
export const CON_CONJUNCTS: readonly ConjunctSpec[] = [
  { index: 1, name: 'NoActivityConflict', formula: 'RA* ∩ RA⁻ = ∅',
    explanation: 'No user effectively reaches an activity (through role inheritance, process composition or delegation) that is prohibited for a role they hold.',
    violationTypes: ['ACTIVITY_CONFLICT'] },
  { index: 2, name: 'NoRoleOccupancyConflict', formula: 'RU⁺ ∩ RU⁻ = ∅',
    explanation: 'No user occupies a role that they are prohibited from occupying.',
    violationTypes: ['ROLE_OCCUPANCY_CONFLICT'] },
  { index: 3, name: 'NoProcessAccessConflict', formula: 'UP* ∩ UP⁻ = ∅',
    explanation: 'No user effectively reaches a process or zone (directly, through a role grant, composition or delegation) that is prohibited to them.',
    violationTypes: ['PROCESS_ACCESS_CONFLICT'] },
  { index: 4, name: 'SeparationRespected', formula: '∀u, ∀{p,q} ∈ X : ¬(p ∈ UP*(u) ∧ q ∈ UP*(u))',
    explanation: 'No user effectively reaches both processes of a separation-of-concerns pair, including through composition of a parent process.',
    violationTypes: ['SEPARATION_VIOLATION'] },
  { index: 5, name: 'DelegationSound', formula: 'D⁺ ∩ D⁻ = ∅ ∧ ∀(r,s,t) ∈ D⁺ : t ∉ RA⁻*(s)',
    explanation: 'No delegation is both permitted and prohibited, and delegation never confers an activity the delegate is prohibited from holding.',
    violationTypes: ['DELEGATION_CONFLICT', 'DELEGATION_LAUNDERS_PROHIBITION'] },
];

export const CON_FORMULA = 'Con(⋀Φ_E ∧ ⋀Φ_L)';

// ─── Audit ─────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'error' | 'warning';

export type AuditCode =
  | 'SPLIT_VOCABULARY'
  | 'MISSING_POLARITY'
  | 'INVALID_POLARITY'
  | 'POLARITY_MISMATCH'
  | 'DENY_AS_POSITIVE_RELATION'
  | 'POLARITY_NOT_MATERIALISED'
  | 'REVERSED_EDGE'
  | 'EDGE_SORT_MISMATCH'
  | 'UNRESOLVED_ENDPOINT'
  | 'WRONG_COLLECTION'
  | 'HIERARCHY_CYCLE'
  | 'SELF_LOOP'
  | 'UNANALYSED_PRINCIPAL'
  | 'REQUIREMENTS_ON_ENTERPRISE_MODEL'
  | 'COMPLIANCE_OVERCLAIM';

export interface AuditFinding {
  code: AuditCode;
  invariant: 'vocabulary' | 'polarity' | 'direction' | 'acyclicity' | 'compliance' | 'coverage';
  severity: AuditSeverity;
  message: string;
  /** offending ids / path, where applicable */
  subjects?: string[];
}

export type ComplianceVerdict =
  | 'NOT_ASSESSABLE_NO_ENTERPRISE_MODEL'
  | 'NOT_CHECKED'
  | 'INCONSISTENT'
  | 'CONSISTENT_COMPLETENESS_UNVERIFIED'
  | 'CONSISTENT_STRUCTURAL_GAPS'
  | 'NO_VIOLATIONS_FOUND_COMPLETENESS_NOT_VALIDATED';

export interface ComplianceStance {
  verdict: ComplianceVerdict;
  /** always false: GAM never emits an organisational-compliance verdict from these inputs */
  claimsOrganizationalCompliance: false;
  /** always false: consistency validated, completeness defined but not validated */
  claimsCompleteCompliance: false;
  notice: string;
}

export interface AuditContext {
  /** Φ_E, if one is being compared against `model` as Φ_L */
  enterprise?: GalJsonModel | null;
  /** result of ConsistencyChecker.check, if it was run */
  consistency?: { consistent: boolean } | null;
  /** result of OntologyChecker.check, if it was run */
  ontology?: { satisfied: boolean } | null;
}

export interface SemanticAuditReport {
  ok: boolean;
  errors: AuditFinding[];
  warnings: AuditFinding[];
  findings: AuditFinding[];
  compliance: ComplianceStance;
}

const NAMESPACE_RE = /^(law|enterprise)\s*[:.]/i;
const SORT_SET = new Set<string>(['Process', 'Activity', 'Role', 'User']);

/**
 * Derive the strongest statement GAM may make. There is deliberately no
 * "COMPLIANT" outcome: Con is necessary, not sufficient; completeness is
 * defined but not validated (CORRECTIONS.md, Scope).
 */
export function deriveComplianceStance(ctx: {
  law?: GalJsonModel | null;
  enterprise?: GalJsonModel | null;
  consistency?: { consistent: boolean } | null;
  ontology?: { satisfied: boolean } | null;
}): ComplianceStance {
  const base = { claimsOrganizationalCompliance: false, claimsCompleteCompliance: false } as const;
  const hasEnterprise = !!ctx.enterprise;
  let verdict: ComplianceVerdict;
  let notice: string;
  if (!hasEnterprise) {
    verdict = 'NOT_ASSESSABLE_NO_ENTERPRISE_MODEL';
    notice = 'Φ_L alone states what the law requires; without an Enterprise_Model Φ_E, organisational compliance cannot be assessed.';
  } else if (!ctx.consistency) {
    verdict = 'NOT_CHECKED';
    notice = 'Con(⋀Φ_E ∧ ⋀Φ_L) has not been evaluated; no compliance statement is made.';
  } else if (!ctx.consistency.consistent) {
    verdict = 'INCONSISTENT';
    notice = 'Con fails: the enterprise configuration contradicts the law. This is a finding, not a complete compliance assessment.';
  } else if (!ctx.ontology) {
    verdict = 'CONSISTENT_COMPLETENESS_UNVERIFIED';
    notice = 'Con holds, but consistency is necessary, not sufficient: absent required structure contradicts nothing and is only reported by OntologyChecker, which was not run.';
  } else if (!ctx.ontology.satisfied) {
    verdict = 'CONSISTENT_STRUCTURAL_GAPS';
    notice = 'Con holds but the ontology/scenario check reports required structure missing; the enterprise is not complete with respect to the law.';
  } else {
    verdict = 'NO_VIOLATIONS_FOUND_COMPLETENESS_NOT_VALIDATED';
    notice = 'No consistency, ontology or scenario violation was found. GAM validates consistency only; completeness is defined but not validated, so this is not a certification of compliance.';
  }
  return { verdict, ...base, notice };
}

function sortOfEntity(e: { type?: string; sort?: string }): GamSort | null {
  if (e.sort && SORT_SET.has(e.sort)) return e.sort as GamSort;
  if (e.type && SORT_SET.has(e.type)) return e.type as GamSort;
  if (e.type === 'DepartmentRole') return 'Role'; // extraction-pipeline alias for Role
  return null;
}

function findCycle(edges: Map<string, Set<string>>): string[] | null {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map<string, number>();
  const stack: string[] = [];
  const visit = (n: string): string[] | null => {
    colour.set(n, GREY);
    stack.push(n);
    for (const m of edges.get(n) ?? []) {
      const c = colour.get(m) ?? WHITE;
      if (c === GREY) return [...stack.slice(stack.indexOf(m)), m];
      if (c === WHITE) {
        const found = visit(m);
        if (found) return found;
      }
    }
    stack.pop();
    colour.set(n, BLACK);
    return null;
  };
  for (const n of [...edges.keys()]) {
    if ((colour.get(n) ?? WHITE) === WHITE) {
      const found = visit(n);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Audit one GAL-JSON model (Φ_L or Φ_E) against the GAM semantic invariants.
 * Pure structural audit — never runs Con. `ctx` supplies the (optional) other
 * model and checker results so the compliance guard can be evaluated.
 */
export function auditGalModelSemantics(model: GalJsonModel, ctx: AuditContext = {}): SemanticAuditReport {
  const findings: AuditFinding[] = [];
  const add = (f: AuditFinding) => findings.push(f);

  const entities = model.entities ?? [];
  const relations = model.relations ?? [];
  const policies = model.policies ?? [];

  const sorts = new Map<string, GamSort | null>();
  for (const e of entities) if (e?.id) sorts.set(e.id, sortOfEntity(e));
  const sortOf = (id: string) => sorts.get(id) ?? null;

  // 1 ── single vocabulary ────────────────────────────────────────────────────
  const ids = new Set<string>();
  const note = (id: unknown) => { if (typeof id === 'string') ids.add(id); };
  entities.forEach(e => note(e?.id));
  relations.forEach(r => { note(r?.source); note(r?.target); });
  policies.forEach(p => { note(p?.source); note(p?.target); note(p?.parameters?.activity_or_process); });
  (model.ontologyRequirements ?? []).forEach(r =>
    [r.process, r.activity, r.parentRole, r.childRole, r.parentProcess, r.childProcess].forEach(note));
  (model.scenarioRequirements ?? []).forEach(r => { note(r.from); note(r.to); });
  const namespaced = [...ids].filter(id => NAMESPACE_RE.test(id));
  if (namespaced.length) {
    add({
      code: 'SPLIT_VOCABULARY', invariant: 'vocabulary', severity: 'error', subjects: namespaced,
      message: `Origin-namespaced identifiers split the vocabulary (${namespaced.join(', ')}). Law and enterprise facts must share one id space; two formulas over disjoint variables are always jointly satisfiable, so no cross-model conflict can be found.`,
    });
  }

  // 2 ── polarity explicitness ────────────────────────────────────────────────
  for (const p of policies) {
    if (!p || !CHECKED_POLICY_TYPES.includes(p.type)) continue;
    const label = `${p.type}(${p.source} → ${p.target})`;
    const m = p.modality, a = p.allow_deny;
    if (m === undefined && a === undefined) {
      add({ code: 'MISSING_POLARITY', invariant: 'polarity', severity: 'error', subjects: [label],
        message: `${label} has no modality/allow_deny. The engine reads anything but "Deny" as Allow, so silence would be treated as a permit.` });
      continue;
    }
    const polarity = m ?? a;
    if (polarity !== 'Allow' && polarity !== 'Deny') {
      add({ code: 'INVALID_POLARITY', invariant: 'polarity', severity: 'error', subjects: [label],
        message: `${label} has polarity "${String(polarity)}"; only "Allow" or "Deny" is a member of ±. Anything else is silently read as Allow.` });
      continue;
    }
    if (m !== undefined && a !== undefined && m !== a) {
      add({ code: 'POLARITY_MISMATCH', invariant: 'polarity', severity: 'error', subjects: [label],
        message: `${label} has modality "${m}" but allow_deny "${a}"; the engine uses modality, so "${a}" is ignored.` });
    }
    const deontic = p.deontic_status;
    if ((polarity === 'Allow' && deontic === 'Prohibited') || (polarity === 'Deny' && deontic === 'Permitted')) {
      add({ code: 'POLARITY_MISMATCH', invariant: 'polarity', severity: 'error', subjects: [label],
        message: `${label} has polarity "${polarity}" contradicting deontic_status "${deontic}".` });
    }
  }
  // A prohibition must not be encoded as a positive relation.
  for (const r of relations) {
    const d = r?.parameters?.deontic_status;
    if (r && r.type in CANONICAL_RELATION_DIRECTIONS && d === 'Prohibited') {
      add({ code: 'DENY_AS_POSITIVE_RELATION', invariant: 'polarity', severity: 'error',
        subjects: [`${r.type}(${r.source} → ${r.target})`],
        message: `${r.type}(${r.source} → ${r.target}) is a positive (+) relation but is marked Prohibited. Deny must be a policy with polarity "Deny" (positive membership in the − relation), not a flagged + fact.` });
    }
  }
  // Cross-check against the engine: every Deny policy must land in X⁻ and not X⁺.
  {
    const M = new GamModel(model as never, {});
    const plusMinus: Record<string, { plus: Map<string, Set<string>>; minus: Map<string, Set<string>>; swap: boolean }> = {
      CanAssignTo: { plus: M.RAp, minus: M.RAm, swap: true },
      CanAct:      { plus: M.RUp, minus: M.RUm, swap: true },
      CanAssume:   { plus: M.UPp, minus: M.UPm, swap: false },
      CanReach:    { plus: M.RPp, minus: M.RPm, swap: false },
    };
    for (const p of policies) {
      const spec = p && plusMinus[p.type];
      if (!spec) continue;
      const polarity = p.modality ?? p.allow_deny;
      if (polarity !== 'Allow' && polarity !== 'Deny') continue;
      const [k, v] = spec.swap ? [p.target, p.source] : [p.source, p.target];
      const inMinus = spec.minus.get(k)?.has(v) ?? false;
      if (polarity === 'Deny' && !inMinus) {
        add({ code: 'POLARITY_NOT_MATERIALISED', invariant: 'polarity', severity: 'error',
          subjects: [`${p.type}(${p.source} → ${p.target})`],
          message: `Deny ${p.type}(${p.source} → ${p.target}) is not a member of the − relation in the engine.` });
      }
    }
  }

  // 3 ── canonical edge direction ─────────────────────────────────────────────
  const checkEdge = (kind: 'relation' | 'policy', type: string, source: string, target: string,
                     canon: readonly [GamSort, GamSort]) => {
    const label = `${type}(${source} → ${target})`;
    const s = sortOf(source), t = sortOf(target);
    if (!s || !t) {
      add({ code: 'UNRESOLVED_ENDPOINT', invariant: 'direction', severity: 'warning', subjects: [label],
        message: `${label}: endpoint sort(s) not declared as Process/Activity/Role/User; direction cannot be verified.` });
      return;
    }
    if (s === canon[0] && t === canon[1]) return;
    const reversed = s === canon[1] && t === canon[0] && canon[0] !== canon[1];
    if (reversed) {
      add({ code: 'REVERSED_EDGE', invariant: 'direction', severity: 'error', subjects: [label],
        message: `${label} is reversed: ${kind === 'relation' ? 'relation' : 'policy'} ${type} is ${canon[0]} → ${canon[1]}, but source is a ${s} and target is a ${t}. A reversed edge does not error in the engine; it silently never matches.` });
    } else {
      add({ code: 'EDGE_SORT_MISMATCH', invariant: 'direction', severity: 'error', subjects: [label],
        message: `${label}: ${type} requires ${canon[0]} → ${canon[1]}, found ${s} → ${t}.` });
    }
  };
  for (const r of relations) {
    if (!r) continue;
    if (CHECKED_POLICY_TYPES.includes(r.type)) {
      add({ code: 'WRONG_COLLECTION', invariant: 'direction', severity: 'error', subjects: [r.type],
        message: `${r.type} is a policy operator but appears in relations[]; the engine ignores it there.` });
      continue;
    }
    const canon = CANONICAL_RELATION_DIRECTIONS[r.type];
    if (canon) checkEdge('relation', r.type, r.source, r.target, canon);
  }
  for (const p of policies) {
    if (!p) continue;
    if (p.type in CANONICAL_RELATION_DIRECTIONS) {
      add({ code: 'WRONG_COLLECTION', invariant: 'direction', severity: 'error', subjects: [p.type],
        message: `${p.type} is a positive relation operator but appears in policies[]; the engine ignores it there.` });
      continue;
    }
    const canon = CANONICAL_POLICY_DIRECTIONS[p.type];
    if (canon) checkEdge('policy', p.type, p.source, p.target, canon);
  }

  // 4 ── hierarchy acyclicity (strict partial orders) ─────────────────────────
  const hierarchy = (type: 'ComposedOf' | 'Includes', label: string) => {
    const edges = new Map<string, Set<string>>();
    for (const r of relations) {
      if (r?.type !== type) continue;
      if (r.source === r.target) {
        add({ code: 'SELF_LOOP', invariant: 'acyclicity', severity: 'error', subjects: [r.source],
          message: `${type}(${r.source} → ${r.source}) is reflexive; ${label} must be a strict partial order.` });
        continue;
      }
      if (!edges.has(r.source)) edges.set(r.source, new Set());
      edges.get(r.source)!.add(r.target);
    }
    const cycle = findCycle(edges);
    if (cycle) {
      add({ code: 'HIERARCHY_CYCLE', invariant: 'acyclicity', severity: 'error', subjects: cycle,
        message: `${type} has a cycle (${cycle.join(' → ')}); ${label} must be a strict partial order. Alloy's WellFormed fact makes a cyclic model vacuous.` });
    }
  };
  hierarchy('ComposedOf', 'process composition');
  hierarchy('Includes', 'role inclusion');
  for (const r of relations) {
    if (r?.type === 'Separate' && r.source === r.target) {
      add({ code: 'SELF_LOOP', invariant: 'acyclicity', severity: 'error', subjects: [r.source],
        message: `Separate(${r.source} ↔ ${r.source}) is reflexive; X must be irreflexive.` });
    }
  }
  for (const p of policies) {
    if (p?.type === 'CanDelegate' && p.source === p.target) {
      add({ code: 'SELF_LOOP', invariant: 'acyclicity', severity: 'error', subjects: [p.source],
        message: `CanDelegate(${p.source} → ${p.source}): a role does not delegate to itself (Alloy WellFormed).` });
    }
  }

  // coverage: a principal is only analysed if it Acts in some role (RU⁺)
  {
    const acting = new Set<string>();
    for (const r of relations) if (r?.type === 'Acts') acting.add(r.target);
    for (const p of policies) {
      if (p?.type === 'CanAct' && (p.modality ?? p.allow_deny) !== 'Deny') acting.add(p.source);
    }
    const unanalysed = new Set<string>();
    for (const r of relations) if (r?.type === 'Assumes' && !acting.has(r.source)) unanalysed.add(r.source);
    for (const p of policies) {
      if (p?.type === 'CanAssume' && !acting.has(p.source)) unanalysed.add(p.source);
    }
    if (unanalysed.size) {
      add({ code: 'UNANALYSED_PRINCIPAL', invariant: 'coverage', severity: 'warning', subjects: [...unanalysed],
        message: `Principal(s) ${[...unanalysed].join(', ')} have Assumes/CanAssume edges but never act in a role; Con only analyses users in RU⁺, so they are never checked.` });
    }
  }

  // 5 ── compliance non-verdict guard ─────────────────────────────────────────
  if (model.model_type === 'Enterprise_Model' &&
      ((model.ontologyRequirements?.length ?? 0) > 0 || (model.scenarioRequirements?.length ?? 0) > 0)) {
    add({ code: 'REQUIREMENTS_ON_ENTERPRISE_MODEL', invariant: 'compliance', severity: 'warning',
      message: 'ontologyRequirements/scenarioRequirements are law-side only (read from Φ_L); on an Enterprise_Model they are never enforced.' });
  }
  const loose = model as unknown as Record<string, unknown>;
  const claimed = ['compliant', 'isCompliant', 'complianceStatus', 'complianceVerdict']
    .filter(k => k in loose && loose[k] !== undefined && loose[k] !== null);
  if (claimed.length) {
    add({ code: 'COMPLIANCE_OVERCLAIM', invariant: 'compliance', severity: 'error', subjects: claimed,
      message: `Model carries a compliance claim (${claimed.join(', ')}). A GAL-JSON model states requirements or configuration; it never asserts organisational compliance.` });
  }
  const compliance = deriveComplianceStance({
    law: model,
    enterprise: ctx.enterprise,
    consistency: ctx.consistency,
    ontology: ctx.ontology,
  });

  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  return { ok: errors.length === 0, errors, warnings, findings, compliance };
}
