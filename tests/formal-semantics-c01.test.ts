import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { GalJsonModel } from '../src/types/contracts';
import { ConsistencyChecker } from '../src/engine/gam-core/consistency-checker.js';
import { OntologyChecker } from '../src/engine/gam-core/ontology-checker.js';
import { emitAlloy } from '../src/engine/gam-core/alloy-emitter.js';
import { GamModel, RELATION_TYPES } from '../src/engine/gam-core/model.js';
import {
  GAM_FORMAL_TUPLE, GAM_SORTS, GAM_FAMILIES, GAM_FAMILY_SYMBOLS, CON_CONJUNCTS,
  CANONICAL_RELATION_DIRECTIONS, CANONICAL_POLICY_DIRECTIONS,
  auditGalModelSemantics, deriveComplianceStance,
} from '../src/engine/gam-core/formal-invariants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type V = Record<string, any>;
type Loose = Partial<GalJsonModel> & Record<string, unknown>;

const mk = (type: 'Law_Model' | 'Enterprise_Model', m: Loose = {}): GalJsonModel => ({
  model_type: type,
  context: 'test',
  jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' },
  effective_date: '2026-01-01',
  domains: ['All'],
  entities: [], relations: [], policies: [],
  ...m,
} as GalJsonModel);
const law = (m: Loose = {}) => mk('Law_Model', m);
const ent = (m: Loose = {}) => mk('Enterprise_Model', m);
const codes = (m: GalJsonModel, ctx = {}) => auditGalModelSemantics(m, ctx).findings.map(f => f.code);

// ─── Thesis fixtures (mirror GAM test/thesis-cases.test.js) ────────────────────

const ex2Law = law({
  entities: [{ id: 'AccessPI', type: 'Activity' }, { id: 'PrivDiv', type: 'Role' }],
  policies: [{ type: 'CanAssignTo', modality: 'Deny', source: 'AccessPI', target: 'PrivDiv' }],
});
const ex2Ent = ent({
  entities: [
    { id: 'Enterprise', type: 'Role' }, { id: 'FinDiv', type: 'Role' },
    { id: 'FinAdminAssistants', type: 'Role' }, { id: 'AdminAssistant1', type: 'User' },
  ],
  relations: [
    { type: 'Includes', source: 'Enterprise', target: 'FinDiv' },
    { type: 'Includes', source: 'Enterprise', target: 'PrivDiv' },
    { type: 'Includes', source: 'FinDiv', target: 'FinAdminAssistants' },
    { type: 'AssignedTo', source: 'FinAdminAssistants', target: 'AccessPI' },
    { type: 'Acts', source: 'PrivDiv', target: 'AdminAssistant1' },
    { type: 'Acts', source: 'FinAdminAssistants', target: 'AdminAssistant1' },
  ],
});

const ex1bLaw = law({
  entities: [{ id: 'ProvideCPOIdentity', type: 'Activity' }],
  ontologyRequirements: [{ id: '4.1.2', process: 'Privacy', activity: 'ProvideCPOIdentity', rationale: 'publish accountable individual' }],
});
const ex1bEnt = ent({
  entities: [{ id: 'Privacy', type: 'Process' }, { id: 'PO', type: 'Role' }, { id: 'Jane', type: 'User' }],
  relations: [
    { type: 'ComposedOf', source: 'Privacy', target: 'POIdentity' },
    { type: 'Acts', source: 'PO', target: 'Jane' },
  ],
});

const ex4Law = law({
  scenarioRequirements: [{ id: '4.5.3', kind: 'precedence', from: 'SaveInfo', to: 'DisposeData', rationale: 'retain only as long as needed' }],
});
const ex4Ent = (fixed: boolean) => ent({
  entities: ['WApplication', 'ReadApplication', 'ValidateInfo', 'SaveInfo', 'ThankClient', 'DisposeData']
    .map(id => ({ id, type: 'Activity' as const })),
  relations: [
    { type: 'Next', source: 'WApplication', target: 'ReadApplication' },
    { type: 'Next', source: 'ReadApplication', target: 'ValidateInfo' },
    { type: 'Next', source: 'ValidateInfo', target: 'SaveInfo' },
    { type: 'Next', source: 'ThankClient', target: 'DisposeData' },
    ...(fixed ? [{ type: 'Next' as const, source: 'SaveInfo', target: 'DisposeData' }] : []),
  ],
});

// SOX note: §404 mandates ICFR assessment, not segregation of duties; SoD is a COSO practice applied under §404.
const soxLaw = law({
  entities: [{ id: 'Receiving', type: 'Process' }, { id: 'Purchasing', type: 'Process' }],
  relations: [{ type: 'Separate', source: 'Receiving', target: 'Purchasing' }],
});
const soxEnt = (breach: boolean) => ent({
  entities: [
    { id: 'ProcureParent', type: 'Process' }, { id: 'Receiving', type: 'Process' }, { id: 'Purchasing', type: 'Process' },
    { id: 'Buyer', type: 'Role' }, { id: 'Carol', type: 'User' },
  ],
  relations: [
    { type: 'ComposedOf', source: 'ProcureParent', target: 'Purchasing' },
    { type: 'Assumes', source: 'Carol', target: 'Receiving' },
    ...(breach ? [{ type: 'Assumes' as const, source: 'Carol', target: 'ProcureParent' }] : []),
    { type: 'Acts', source: 'Buyer', target: 'Carol' },
  ],
});

// ─── 1. Formal metadata ────────────────────────────────────────────────────────

describe('formal tuple metadata', () => {
  it('states the tuple verbatim', () => {
    expect(GAM_FORMAL_TUPLE).toBe('Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩');
  });
  it('has exactly 4 sorts and 10 families', () => {
    expect(GAM_SORTS.map(s => s.symbol)).toEqual(['P', 'A', 'R', 'U']);
    expect(GAM_FAMILY_SYMBOLS).toEqual(['PP', 'PA', 'RR', 'S', 'X', 'RA±', 'RU±', 'UP±', 'RP±', 'D±']);
    for (const s of [...GAM_SORTS.map(s => s.symbol), ...GAM_FAMILY_SYMBOLS]) expect(GAM_FORMAL_TUPLE).toContain(s);
  });
  it('relation directions agree with model.js RELATION_TYPES', () => {
    for (const [type, [a, b]] of Object.entries(RELATION_TYPES)) {
      expect(CANONICAL_RELATION_DIRECTIONS[type], type).toEqual([a, b]);
    }
    expect(Object.keys(CANONICAL_RELATION_DIRECTIONS).sort()).toEqual(Object.keys(RELATION_TYPES).sort());
  });
  it('policy directions agree with what GamModel._ingest actually does', () => {
    // CanAssignTo: Activity → Role. Stored as role → activity.
    const m = new GamModel(law({ policies: [
      { type: 'CanAssignTo', modality: 'Deny', source: 'Act1', target: 'Role1' },
      { type: 'CanAct', modality: 'Deny', source: 'User1', target: 'Role2' },
      { type: 'CanAssume', modality: 'Deny', source: 'User1', target: 'Proc1' },
      { type: 'CanReach', modality: 'Deny', source: 'Role1', target: 'Proc1' },
    ] }) as never, {});
    expect(m.RAm.get('Role1')?.has('Act1')).toBe(true);
    expect(m.RUm.get('Role2')?.has('User1')).toBe(true);
    expect(m.UPm.get('User1')?.has('Proc1')).toBe(true);
    expect(m.RPm.get('Role1')?.has('Proc1')).toBe(true);
    expect(CANONICAL_POLICY_DIRECTIONS.CanAssignTo).toEqual(['Activity', 'Role']);
    expect(CANONICAL_POLICY_DIRECTIONS.CanAct).toEqual(['User', 'Role']);
  });
  it('AssignedTo/CanAssignTo and Acts/CanAct are opposite', () => {
    expect(CANONICAL_RELATION_DIRECTIONS.AssignedTo).toEqual(['Role', 'Activity']);
    expect(CANONICAL_POLICY_DIRECTIONS.CanAssignTo).toEqual(['Activity', 'Role']);
    expect(CANONICAL_RELATION_DIRECTIONS.Acts).toEqual(['Role', 'User']);
    expect(CANONICAL_POLICY_DIRECTIONS.CanAct).toEqual(['User', 'Role']);
  });
  it('Alloy field names exist in gam_core.als and in emitted output', () => {
    const core = readFileSync('alloy/gam_core.als', 'utf8');
    const out = emitAlloy(ex2Law, ex2Ent);
    const emitted = [...GAM_FAMILIES].flatMap(f => f.alloyFields);
    for (const f of emitted) expect(core, f).toMatch(new RegExp(`\\b${f}\\b`));
    for (const f of ['subRole', 'mayDo', 'mustNotDo', 'mayAct', 'mustNotAct', 'mayDelegate', 'mustNotDelegate']) {
      expect(out, f).toMatch(new RegExp(`\\b${f}\\b`));
    }
  });
});

describe('Con conjuncts', () => {
  it('lists the 5 conjuncts in order with formulas and explanations', () => {
    expect(CON_CONJUNCTS.map(c => c.name)).toEqual([
      'NoActivityConflict', 'NoRoleOccupancyConflict', 'NoProcessAccessConflict', 'SeparationRespected', 'DelegationSound',
    ]);
    for (const c of CON_CONJUNCTS) { expect(c.formula.length).toBeGreaterThan(3); expect(c.explanation.length).toBeGreaterThan(20); }
  });
  it('every violation type the checker can emit is covered by a conjunct', () => {
    const src = readFileSync('src/engine/gam-core/consistency-checker.js', 'utf8');
    const emitted = [...src.matchAll(/type: '([A-Z_]+)'/g)].map(m => m[1]).filter(t => t !== 'ENGINE_DISAGREEMENT');
    const covered = new Set(CON_CONJUNCTS.flatMap(c => c.violationTypes));
    for (const t of emitted) expect(covered.has(t), t).toBe(true);
  });
});

// ─── 2. ConsistencyChecker / OntologyChecker on thesis cases ───────────────────

describe('Thesis Ch.7 Ex.2 — activity conflict through role closure', () => {
  const r = new ConsistencyChecker().check(ex2Law, ex2Ent);
  it('fails Con with ACTIVITY_CONFLICT for AdminAssistant1', () => {
    expect(r.consistent).toBe(false);
    expect(r.violations.map((v: V) => v.type)).not.toContain('ENGINE_DISAGREEMENT');
    expect(r.violations.some((v: V) => v.type === 'ACTIVITY_CONFLICT' && v.user === 'AdminAssistant1' && v.activity === 'AccessPI')).toBe(true);
  });
  it('no single role holds both polarity for the activity (per-relation diff is blind)', () => {
    for (const role of r.model.roles) {
      const p: Set<string> = r.model.RAp.get(role) ?? new Set();
      const q: Set<string> = r.model.RAm.get(role) ?? new Set();
      expect([...p].filter(x => q.has(x))).toEqual([]);
    }
  });
  it('removing the offending role occupancy restores Con (negative control)', () => {
    const fixed = ent({ ...ex2Ent, relations: ex2Ent.relations.filter(x => !(x.type === 'Acts' && x.source === 'PrivDiv')) });
    expect(new ConsistencyChecker().check(ex2Law, fixed).consistent).toBe(true);
  });
  it('emitted Alloy is vacuous for the per-relation check but asserts Con', () => {
    const als = emitAlloy(ex2Law, ex2Ent, { moduleName: 'ch07_ex2' });
    expect(als).toContain('module ch07_ex2');
    expect(als).toContain('open gam_core');
    expect(als).toContain('PrivDiv.mustNotDo = AccessPI');
    expect(als).toContain('FinAdminAssistants.mayDo = AccessPI');
    expect(als).toContain('check GAM_Con { Con }');
    expect(als).toContain('DeclaredOnlyCheck');
  });
});

describe('Thesis Ch.7 Ex.1b — consistency is necessary, not sufficient', () => {
  it('Con holds but ontology gap is reported', () => {
    expect(new ConsistencyChecker().check(ex1bLaw, ex1bEnt).consistent).toBe(true);
    const o = new OntologyChecker().check(ex1bLaw, ex1bEnt);
    expect(o.satisfied).toBe(false);
    expect(o.violations[0].type).toBe('ONTOLOGY_GAP');
  });
  it('positive control: adding the required activity satisfies the ontology', () => {
    const fixed = ent({ ...ex1bEnt, relations: [...ex1bEnt.relations,
      { type: 'ComposedOf', source: 'POIdentity', target: 'POIdentity2' },
      { type: 'Contains', source: 'POIdentity2', target: 'ProvideCPOIdentity' }] });
    expect(new OntologyChecker().check(ex1bLaw, fixed).satisfied).toBe(true);
  });
  it('compliance stance never says compliant from Con alone', () => {
    const con = new ConsistencyChecker().check(ex1bLaw, ex1bEnt);
    const s = deriveComplianceStance({ law: ex1bLaw, enterprise: ex1bEnt, consistency: con });
    expect(s.verdict).toBe('CONSISTENT_COMPLETENESS_UNVERIFIED');
    expect(s.claimsCompleteCompliance).toBe(false);
    const o = new OntologyChecker().check(ex1bLaw, ex1bEnt);
    expect(deriveComplianceStance({ law: ex1bLaw, enterprise: ex1bEnt, consistency: con, ontology: o }).verdict)
      .toBe('CONSISTENT_STRUCTURAL_GAPS');
  });
  it('emits containsAssertion-style requirement only as an assertion, not part of Con', () => {
    const als = emitAlloy(ex1bLaw, ex1bEnt, { assertions: [{ name: 'CPO', expr: 'requiresActivity[Privacy, ProvideCPOIdentity]' }] });
    expect(als).toContain('assert CPO');
    expect(als).toContain('check CPO');
  });
});

describe('Thesis Ch.7 Ex.4 — retention precedence over S⁺', () => {
  it('flags SCENARIO_VIOLATION when sister process has no path to disposal', () => {
    const o = new OntologyChecker().check(ex4Law, ex4Ent(false));
    expect(o.satisfied).toBe(false);
    expect(o.violations[0].type).toBe('SCENARIO_VIOLATION');
  });
  it('Con is silent on the same pair', () => {
    expect(new ConsistencyChecker().check(ex4Law, ex4Ent(false)).consistent).toBe(true);
  });
  it('positive control: SaveInfo → DisposeData satisfies the precedence', () => {
    expect(new OntologyChecker().check(ex4Law, ex4Ent(true)).satisfied).toBe(true);
  });
  it('forbidden-precedence is violated when the path exists', () => {
    const l = law({ scenarioRequirements: [{ id: 'F', kind: 'forbidden-precedence', from: 'WApplication', to: 'SaveInfo', rationale: 'x' }] });
    const o = new OntologyChecker().check(l, ex4Ent(false));
    expect(o.violations[0].type).toBe('SCENARIO_VIOLATION');
    expect(o.violations[0].path).toEqual(['WApplication', 'ReadApplication', 'ValidateInfo', 'SaveInfo']);
  });
});

describe('Thesis Ch.8 — SOX segregation through composition', () => {
  it('detects SEPARATION_VIOLATION reached via the parent process', () => {
    const r = new ConsistencyChecker().check(soxLaw, soxEnt(true));
    const v = r.violations.find((x: V) => x.type === 'SEPARATION_VIOLATION');
    expect(v).toBeDefined();
    expect(v.user).toBe('Carol');
    expect([v.process1, v.process2].sort()).toEqual(['Purchasing', 'Receiving']);
    expect(r.model.originOf('Separate', 'Receiving', 'Purchasing')).toBe('law');
  });
  // DEFECT (C01-F1): _symmetrise() adds the mirrored X edge without provenance, so a
  // violation whose (p,q) order is the reverse of the declared pair reports 'unknown'.
  it.fails('reports the origin of the separation pair in either order', () => {
    const r = new ConsistencyChecker().check(soxLaw, soxEnt(true));
    expect(r.model.originOf('Separate', 'Purchasing', 'Receiving')).toBe('law');
  });
  it('is symmetric: reversing the Separate pair gives the same verdict', () => {
    const rev = law({ ...soxLaw, relations: [{ type: 'Separate', source: 'Purchasing', target: 'Receiving' }] });
    expect(new ConsistencyChecker().check(rev, soxEnt(true)).violations.some((v: V) => v.type === 'SEPARATION_VIOLATION')).toBe(true);
  });
  it('negative control: Carol only in Receiving is consistent', () => {
    expect(new ConsistencyChecker().check(soxLaw, soxEnt(false)).consistent).toBe(true);
  });
  it('emitted Alloy makes sep symmetric', () => {
    const als = emitAlloy(soxLaw, soxEnt(true));
    expect(als).toContain('Receiving.sep = Purchasing');
    expect(als).toContain('Purchasing.sep = Receiving');
  });
});

describe('other Con conjuncts', () => {
  it('RU conflict: user occupies a role they may not', () => {
    const l = law({ policies: [{ type: 'CanAct', modality: 'Deny', source: 'Alice', target: 'Auditor' }] });
    const e = ent({ relations: [{ type: 'Acts', source: 'Auditor', target: 'Alice' }] });
    expect(new ConsistencyChecker().check(l, e).violations.map((v: V) => v.type)).toContain('ROLE_OCCUPANCY_CONFLICT');
  });
  it('reversed CanAct (Role → User) silently never matches', () => {
    const l = law({ policies: [{ type: 'CanAct', modality: 'Deny', source: 'Auditor', target: 'Alice' }] });
    const e = ent({ relations: [{ type: 'Acts', source: 'Auditor', target: 'Alice' }] });
    expect(new ConsistencyChecker().check(l, e).consistent).toBe(true); // engine is silent…
    expect(codes(l, {})).not.toContain('REVERSED_EDGE');                // …no entities typed, so audit can only warn
    const typed = law({ ...l, entities: [{ id: 'Alice', type: 'User' }, { id: 'Auditor', type: 'Role' }] });
    expect(codes(typed)).toContain('REVERSED_EDGE');                    // …but with sorts it is caught
  });
  it('UP conflict: user reaches a prohibited zone via a role grant', () => {
    const l = law({ policies: [{ type: 'CanAssume', modality: 'Deny', source: 'Bob', target: 'Vault' }] });
    const e = ent({ relations: [{ type: 'Reaches', source: 'Clerk', target: 'Vault' }, { type: 'Acts', source: 'Clerk', target: 'Bob' }] });
    expect(new ConsistencyChecker().check(l, e).violations.map((v: V) => v.type)).toContain('PROCESS_ACCESS_CONFLICT');
  });
  it('D conflict: delegation both permitted and prohibited', () => {
    const l = law({ policies: [{ type: 'CanDelegate', modality: 'Deny', source: 'Boss', target: 'Temp', parameters: { activity_or_process: 'Sign' } }] });
    const e = ent({ policies: [{ type: 'CanDelegate', modality: 'Allow', source: 'Boss', target: 'Temp', parameters: { activity_or_process: 'Sign' } }] });
    expect(new ConsistencyChecker().check(l, e).violations.map((v: V) => v.type)).toContain('DELEGATION_CONFLICT');
  });
  // DEFECT (C01-F2): _delegationViolations matches D⁺/D⁻ by exact target, so a blanket (⊤)
  // prohibition does not clash with a specific permitted delegation.
  it.fails('D conflict: unrestricted prohibition vs specific permitted delegation', () => {
    const l = law({ policies: [{ type: 'CanDelegate', modality: 'Deny', source: 'Boss', target: 'Temp' }] });
    const e = ent({ policies: [{ type: 'CanDelegate', modality: 'Allow', source: 'Boss', target: 'Temp', parameters: { activity_or_process: 'Sign' } }] });
    expect(new ConsistencyChecker().check(l, e).violations.map((v: V) => v.type)).toContain('DELEGATION_CONFLICT');
  });
  it('D laundering: delegation confers a prohibited activity', () => {
    const l = law({ policies: [{ type: 'CanAssignTo', modality: 'Deny', source: 'Sign', target: 'Temp' }] });
    const e = ent({ policies: [{ type: 'CanDelegate', modality: 'Allow', source: 'Boss', target: 'Temp', parameters: { activity_or_process: 'Sign' } }] });
    expect(new ConsistencyChecker().check(l, e).violations.map((v: V) => v.type)).toContain('DELEGATION_LAUNDERS_PROHIBITION');
  });
  it('Deny without Allow is not a conflict — silence ≠ Deny both ways', () => {
    const l = law({ policies: [{ type: 'CanAssignTo', modality: 'Deny', source: 'X1', target: 'R1' }] });
    const e = ent({ relations: [{ type: 'Acts', source: 'R1', target: 'U1' }] });
    expect(new ConsistencyChecker().check(l, e).consistent).toBe(true);
  });
});

// ─── 3. auditGalModelSemantics ─────────────────────────────────────────────────

describe('audit: single vocabulary', () => {
  it('passes the thesis models', () => {
    for (const m of [ex2Law, ex2Ent, ex1bLaw, ex1bEnt, ex4Law, ex4Ent(false), soxLaw, soxEnt(true)]) {
      expect(codes(m).filter(c => c === 'SPLIT_VOCABULARY')).toEqual([]);
    }
  });
  it('rejects law: / enterprise: namespaced ids anywhere', () => {
    const l = law({ entities: [{ id: 'law:CPO', type: 'Role' }] });
    expect(codes(l)).toContain('SPLIT_VOCABULARY');
    const e = ent({ relations: [{ type: 'Acts', source: 'enterprise:CPO', target: 'Alice' }] });
    expect(codes(e)).toContain('SPLIT_VOCABULARY');
    const r = law({ ontologyRequirements: [{ id: '1', process: 'P', activity: 'Law:X', rationale: 'r' }] });
    expect(codes(r)).toContain('SPLIT_VOCABULARY');
  });
  it('shows why: namespaced vocabulary hides the Ex.2 conflict', () => {
    const l = law({ ...ex2Law, policies: [{ type: 'CanAssignTo', modality: 'Deny', source: 'law:AccessPI', target: 'law:PrivDiv' }] });
    expect(new ConsistencyChecker().check(l, ex2Ent).consistent).toBe(true); // false negative
    expect(auditGalModelSemantics(l).ok).toBe(false);                        // audit catches the cause
  });
});

describe('audit: polarity explicitness', () => {
  const base = { entities: [{ id: 'A1', type: 'Activity' }, { id: 'R1', type: 'Role' }] } as Loose;
  it('accepts explicit Allow and Deny', () => {
    for (const modality of ['Allow', 'Deny'] as const) {
      const m = law({ ...base, policies: [{ type: 'CanAssignTo', modality, source: 'A1', target: 'R1' }] });
      expect(auditGalModelSemantics(m).errors).toEqual([]);
    }
  });
  it('rejects a policy with no polarity (engine would read it as Allow)', () => {
    const m = law({ ...base, policies: [{ type: 'CanAssignTo', source: 'A1', target: 'R1' } as never] });
    expect(codes(m)).toContain('MISSING_POLARITY');
    expect(new GamModel(m as never, {}).RAp.get('R1')?.has('A1')).toBe(true);
  });
  it('rejects unknown polarity such as "Prohibit"/"Denied"', () => {
    const m = law({ ...base, policies: [{ type: 'CanAssignTo', modality: 'Denied', source: 'A1', target: 'R1' } as never] });
    expect(codes(m)).toContain('INVALID_POLARITY');
  });
  it('rejects modality/allow_deny disagreement', () => {
    const m = law({ ...base, policies: [{ type: 'CanAssignTo', modality: 'Allow', allow_deny: 'Deny', source: 'A1', target: 'R1' }] });
    expect(codes(m)).toContain('POLARITY_MISMATCH');
  });
  it('rejects Allow marked Prohibited and Deny marked Permitted', () => {
    expect(codes(law({ ...base, policies: [{ type: 'CanAssignTo', modality: 'Allow', deontic_status: 'Prohibited', source: 'A1', target: 'R1' }] })))
      .toContain('POLARITY_MISMATCH');
    expect(codes(law({ ...base, policies: [{ type: 'CanAssignTo', modality: 'Deny', deontic_status: 'Permitted', source: 'A1', target: 'R1' }] })))
      .toContain('POLARITY_MISMATCH');
  });
  it('rejects a prohibition encoded as a flagged positive relation', () => {
    const m = law({ ...base, relations: [{ type: 'AssignedTo', source: 'R1', target: 'A1', parameters: { deontic_status: 'Prohibited' } }] });
    expect(codes(m)).toContain('DENY_AS_POSITIVE_RELATION');
    // and the engine indeed records it as RA⁺ — a permit:
    expect(new GamModel(m as never, {}).RAp.get('R1')?.has('A1')).toBe(true);
  });
  it('Deny is positive membership in X⁻ for every checked family', () => {
    const m = law({
      entities: [
        { id: 'A1', type: 'Activity' }, { id: 'R1', type: 'Role' }, { id: 'U1', type: 'User' }, { id: 'P1', type: 'Process' },
      ],
      policies: [
        { type: 'CanAssignTo', modality: 'Deny', source: 'A1', target: 'R1' },
        { type: 'CanAct', modality: 'Deny', source: 'U1', target: 'R1' },
        { type: 'CanAssume', modality: 'Deny', source: 'U1', target: 'P1' },
        { type: 'CanReach', modality: 'Deny', source: 'R1', target: 'P1' },
        { type: 'CanDelegate', modality: 'Deny', source: 'R1', target: 'R1x' },
      ],
    });
    const M = new GamModel(m as never, {});
    expect(M.RAm.get('R1')?.has('A1') && M.RUm.get('R1')?.has('U1') && M.UPm.get('U1')?.has('P1') && M.RPm.get('R1')?.has('P1')).toBe(true);
    expect(M.Dm).toHaveLength(1);
    expect(M.RAp.size + M.RUp.size + M.UPp.size + M.RPp.size + M.Dp.length).toBe(0);
    expect(codes(m)).not.toContain('POLARITY_NOT_MATERIALISED');
  });
});

describe('audit: canonical edge direction', () => {
  const sorts = [
    { id: 'Act', type: 'Activity' }, { id: 'Rl', type: 'Role' }, { id: 'Usr', type: 'User' }, { id: 'Pr', type: 'Process' },
  ] as const;
  const withE = (m: Loose) => law({ entities: [...sorts], ...m } as Loose);
  it('accepts canonical relations', () => {
    const m = withE({ relations: [
      { type: 'AssignedTo', source: 'Rl', target: 'Act' },
      { type: 'Acts', source: 'Rl', target: 'Usr' },
      { type: 'Assumes', source: 'Usr', target: 'Pr' },
      { type: 'Reaches', source: 'Rl', target: 'Pr' },
      { type: 'Contains', source: 'Pr', target: 'Act' },
    ] });
    expect(auditGalModelSemantics(m).errors).toEqual([]);
  });
  it('accepts canonical policies', () => {
    const m = withE({ policies: [
      { type: 'CanAssignTo', modality: 'Allow', source: 'Act', target: 'Rl' },
      { type: 'CanAct', modality: 'Allow', source: 'Usr', target: 'Rl' },
      { type: 'CanAssume', modality: 'Allow', source: 'Usr', target: 'Pr' },
      { type: 'CanReach', modality: 'Allow', source: 'Rl', target: 'Pr' },
    ] });
    expect(auditGalModelSemantics(m).errors).toEqual([]);
  });
  it('flags AssignedTo written Activity → Role', () => {
    const f = auditGalModelSemantics(withE({ relations: [{ type: 'AssignedTo', source: 'Act', target: 'Rl' }] })).errors;
    expect(f.map(x => x.code)).toEqual(['REVERSED_EDGE']);
  });
  it('flags CanAssignTo written Role → Activity (the policy trap)', () => {
    expect(codes(withE({ policies: [{ type: 'CanAssignTo', modality: 'Deny', source: 'Rl', target: 'Act' }] }))).toContain('REVERSED_EDGE');
  });
  it('flags Acts written User → Role and CanAct written Role → User', () => {
    expect(codes(withE({ relations: [{ type: 'Acts', source: 'Usr', target: 'Rl' }] }))).toContain('REVERSED_EDGE');
    expect(codes(withE({ policies: [{ type: 'CanAct', modality: 'Deny', source: 'Rl', target: 'Usr' }] }))).toContain('REVERSED_EDGE');
  });
  it('flags a reversed Acts as a real false negative in the engine', () => {
    const l = law({ policies: [{ type: 'CanAct', modality: 'Deny', source: 'Alice', target: 'Auditor' }] });
    const reversed = ent({ relations: [{ type: 'Acts', source: 'Alice', target: 'Auditor' }] });
    expect(new ConsistencyChecker().check(l, reversed).consistent).toBe(true); // Alice-as-role: user set empty
  });
  it('flags non-reversal sort mismatches', () => {
    expect(codes(withE({ relations: [{ type: 'Contains', source: 'Rl', target: 'Usr' }] }))).toContain('EDGE_SORT_MISMATCH');
  });
  it('flags operators placed in the wrong collection', () => {
    expect(codes(withE({ relations: [{ type: 'CanAct', source: 'Usr', target: 'Rl' } as never] }))).toContain('WRONG_COLLECTION');
    expect(codes(withE({ policies: [{ type: 'AssignedTo', modality: 'Allow', source: 'Rl', target: 'Act' } as never] }))).toContain('WRONG_COLLECTION');
  });
  it('treats DepartmentRole as Role and warns on undeclared endpoints', () => {
    const m = law({ entities: [{ id: 'D', type: 'DepartmentRole' }, { id: 'Act', type: 'Activity' }],
      relations: [{ type: 'AssignedTo', source: 'D', target: 'Act' }, { type: 'AssignedTo', source: 'Ghost', target: 'Act' }] });
    const r = auditGalModelSemantics(m);
    expect(r.errors).toEqual([]);
    expect(r.warnings.map(w => w.code)).toEqual(['UNRESOLVED_ENDPOINT']);
  });
  it('warns on a principal with Assumes but no Acts (never analysed by Con)', () => {
    const m = ent({ relations: [{ type: 'Assumes', source: 'Dave', target: 'Vault' }] });
    expect(auditGalModelSemantics(m).warnings.map(w => w.code)).toContain('UNANALYSED_PRINCIPAL');
    const e = ent({ relations: [{ type: 'Assumes', source: 'Dave', target: 'Vault' }, { type: 'Acts', source: 'R', target: 'Dave' }] });
    expect(auditGalModelSemantics(e).warnings.map(w => w.code)).not.toContain('UNANALYSED_PRINCIPAL');
  });
});

describe('audit: hierarchy acyclicity', () => {
  it('accepts a DAG (diamond) for ComposedOf and Includes', () => {
    const m = ent({ relations: [
      { type: 'ComposedOf', source: 'A', target: 'B' }, { type: 'ComposedOf', source: 'A', target: 'C' },
      { type: 'ComposedOf', source: 'B', target: 'D' }, { type: 'ComposedOf', source: 'C', target: 'D' },
      { type: 'Includes', source: 'R1', target: 'R2' }, { type: 'Includes', source: 'R1', target: 'R3' }, { type: 'Includes', source: 'R2', target: 'R3' },
    ] });
    expect(codes(m)).not.toContain('HIERARCHY_CYCLE');
  });
  it('rejects a ComposedOf cycle and names the path', () => {
    const m = ent({ relations: [
      { type: 'ComposedOf', source: 'A', target: 'B' }, { type: 'ComposedOf', source: 'B', target: 'C' }, { type: 'ComposedOf', source: 'C', target: 'A' },
    ] });
    const f = auditGalModelSemantics(m).errors.find(e => e.code === 'HIERARCHY_CYCLE')!;
    expect(f.subjects![0]).toBe(f.subjects![f.subjects!.length - 1]);
    expect(new Set(f.subjects)).toEqual(new Set(['A', 'B', 'C']));
  });
  it('rejects an Includes cycle and self-loops', () => {
    expect(codes(ent({ relations: [
      { type: 'Includes', source: 'R1', target: 'R2' }, { type: 'Includes', source: 'R2', target: 'R1' }] }))).toContain('HIERARCHY_CYCLE');
    expect(codes(ent({ relations: [{ type: 'Includes', source: 'R1', target: 'R1' }] }))).toContain('SELF_LOOP');
    expect(codes(ent({ relations: [{ type: 'ComposedOf', source: 'P', target: 'P' }] }))).toContain('SELF_LOOP');
  });
  it('does not confuse the two hierarchies (a Process/Role mix is not a cycle)', () => {
    const m = ent({ relations: [{ type: 'ComposedOf', source: 'A', target: 'B' }, { type: 'Includes', source: 'B', target: 'A' }] });
    expect(codes(m)).not.toContain('HIERARCHY_CYCLE');
  });
  it('a cyclic model still terminates in the closure engine', () => {
    const m = ent({ relations: [{ type: 'ComposedOf', source: 'A', target: 'B' }, { type: 'ComposedOf', source: 'B', target: 'A' }, { type: 'Contains', source: 'B', target: 'X' }] });
    expect(new GamModel({}, m as never).act(new Set(['A'])).has('X')).toBe(true);
  });
  it('rejects reflexive Separate and self-delegation (Alloy WellFormed)', () => {
    expect(codes(ent({ relations: [{ type: 'Separate', source: 'P', target: 'P' }] }))).toContain('SELF_LOOP');
    expect(codes(law({ policies: [{ type: 'CanDelegate', modality: 'Allow', source: 'R', target: 'R' }] }))).toContain('SELF_LOOP');
  });
});

describe('audit: compliance non-verdict guard', () => {
  it('Φ_L alone: never claims organisational compliance', () => {
    const r = auditGalModelSemantics(ex2Law);
    expect(r.compliance.verdict).toBe('NOT_ASSESSABLE_NO_ENTERPRISE_MODEL');
    expect(r.compliance.claimsOrganizationalCompliance).toBe(false);
    expect(r.compliance.claimsCompleteCompliance).toBe(false);
    expect(r.compliance.notice).toMatch(/Enterprise_Model/);
  });
  it('an internally consistent Φ_L still makes no claim', () => {
    const solo = new ConsistencyChecker().checkSingleModel(ex2Law);
    expect(solo.consistent).toBe(true);
    const r = auditGalModelSemantics(ex2Law, { consistency: solo, ontology: { satisfied: true } });
    expect(r.compliance.verdict).toBe('NOT_ASSESSABLE_NO_ENTERPRISE_MODEL');
  });
  it('Con passing without OntologyChecker: completeness unverified', () => {
    const con = new ConsistencyChecker().check(soxLaw, soxEnt(false));
    const r = auditGalModelSemantics(soxLaw, { enterprise: soxEnt(false), consistency: con });
    expect(r.compliance.verdict).toBe('CONSISTENT_COMPLETENESS_UNVERIFIED');
    expect(r.compliance.claimsCompleteCompliance).toBe(false);
  });
  it('Con failing is reported as INCONSISTENT, not as a complete assessment', () => {
    const con = new ConsistencyChecker().check(ex2Law, ex2Ent);
    expect(auditGalModelSemantics(ex2Law, { enterprise: ex2Ent, consistency: con }).compliance.verdict).toBe('INCONSISTENT');
  });
  it('even Con + Ontology both passing is not a certification', () => {
    const con = new ConsistencyChecker().check(ex4Law, ex4Ent(true));
    const onto = new OntologyChecker().check(ex4Law, ex4Ent(true));
    const s = auditGalModelSemantics(ex4Law, { enterprise: ex4Ent(true), consistency: con, ontology: onto }).compliance;
    expect(s.verdict).toBe('NO_VIOLATIONS_FOUND_COMPLETENESS_NOT_VALIDATED');
    expect(s.claimsOrganizationalCompliance).toBe(false);
    expect(s.notice).toMatch(/not validated/);
  });
  it('enterprise present but Con not run → NOT_CHECKED', () => {
    expect(deriveComplianceStance({ law: ex2Law, enterprise: ex2Ent }).verdict).toBe('NOT_CHECKED');
  });
  it('no verdict string anywhere equals COMPLIANT', () => {
    const verdicts = [
      deriveComplianceStance({}), deriveComplianceStance({ enterprise: ex2Ent }),
      deriveComplianceStance({ enterprise: ex2Ent, consistency: { consistent: false } }),
      deriveComplianceStance({ enterprise: ex2Ent, consistency: { consistent: true } }),
      deriveComplianceStance({ enterprise: ex2Ent, consistency: { consistent: true }, ontology: { satisfied: false } }),
      deriveComplianceStance({ enterprise: ex2Ent, consistency: { consistent: true }, ontology: { satisfied: true } }),
    ].map(s => s.verdict);
    expect(new Set(verdicts).size).toBe(6);
    for (const v of verdicts) expect(v).not.toMatch(/^(FULLY_)?COMPLIANT$/);
  });
  it('flags models that carry their own compliance claim', () => {
    const m = law({ ...ex2Law, compliant: true });
    expect(codes(m)).toContain('COMPLIANCE_OVERCLAIM');
  });
  it('warns when requirements are placed on an Enterprise_Model (ignored by OntologyChecker)', () => {
    const e = ent({ ontologyRequirements: ex1bLaw.ontologyRequirements });
    expect(auditGalModelSemantics(e).warnings.map(w => w.code)).toContain('REQUIREMENTS_ON_ENTERPRISE_MODEL');
    expect(new OntologyChecker().check(law(), e).satisfied).toBe(true); // proof they are ignored
  });
});

// ─── 4. Alloy emitter ──────────────────────────────────────────────────────────

describe('emitAlloy structure', () => {
  const als = emitAlloy(ex2Law, ex2Ent, { moduleName: 'my-case', scope: 7 });
  it('opens gam_core and sanitises the module name', () => {
    expect(als).toMatch(/^module my_case\nopen gam_core/);
  });
  it('declares one sig per sort and a closed world', () => {
    expect(als).toMatch(/one sig .*AccessPI.* extends Activity/);
    expect(als).toMatch(/one sig .*PrivDiv.* extends Role/);
    expect(als).toMatch(/one sig AdminAssistant1 extends User/);
    expect(als).toContain('fact ClosedWorld');
    expect(als).toContain('for 7');
  });
  it('emits RR as parent.subRole (senior → junior) and RU as user.mayAct (user → roles)', () => {
    expect(als).toMatch(/Enterprise\.subRole = (FinDiv \+ PrivDiv|PrivDiv \+ FinDiv)/);
    expect(als).toMatch(/AdminAssistant1\.mayAct = (PrivDiv \+ FinAdminAssistants|FinAdminAssistants \+ PrivDiv)/);
  });
  it('law Deny lands in mustNotDo, not omitted and not mayDo', () => {
    expect(als).toContain('PrivDiv.mustNotDo = AccessPI');
    expect(als).not.toMatch(/PrivDiv\.mayDo = /);
  });
  it('emits delegation with ⊤ as Unrestricted', () => {
    const l = law({ policies: [{ type: 'CanDelegate', modality: 'Allow', source: 'Boss', target: 'Temp' }] });
    expect(emitAlloy(l, ent())).toContain('Boss.mayDelegate = (Temp -> Unrestricted)');
  });
  it('sanitises identifiers for Alloy', () => {
    const l = law({ entities: [{ id: '4.1.2 Notice', type: 'Activity' }] });
    expect(emitAlloy(l, ent())).toContain('_4_1_2_Notice');
  });
  it('emitted output has no origin-namespaced signatures', () => {
    expect(als).not.toMatch(/\b(law|enterprise)_/i);
  });
  it('declared sort wins over inferred sort', () => {
    const e = ent({ entities: [{ id: 'Odd', type: 'Role' }], relations: [{ type: 'Contains', source: 'Odd', target: 'A1' }] });
    const out = emitAlloy(law(), e);
    expect(out).toMatch(/extends Role/);
    expect(out).not.toMatch(/Odd[^\n]* extends Process/);
  });
});
