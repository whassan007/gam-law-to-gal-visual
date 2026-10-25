/**
 * GAM — Governance Analysis Model
 * Closure engine.
 *
 * Implements Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
 * exactly as formalised in alloy/gam_core.als, with the two corrections that
 * matter:
 *
 *   (1) POLARITY — every policy relation is split into a permitted (+) and a
 *       prohibited (−) part, so "Deny" is representable and distinguishable
 *       from silence.
 *
 *   (2) CLOSURE — law and enterprise share ONE vocabulary and ONE universe.
 *       Conflict is evaluated over effective access (the closure of the
 *       declared relations under role inheritance, process composition and
 *       delegation), never over the declared relations themselves.
 *
 * The 2009 prototype and its first re-implementation both scoped propositions
 * by origin ('law:' / 'enterprise:'). Two formulas over disjoint variable sets
 * are jointly satisfiable whenever each is separately satisfiable, so no
 * cross-model conflict could ever be derived. That is the defect this module
 * exists to remove.
 */

export const SORTS = ['Process', 'Activity', 'Role', 'User'];

export const RELATION_TYPES = {
  ComposedOf: ['Process', 'Process'],  // PP : parent → child
  Contains:   ['Process', 'Activity'], // PA
  Includes:   ['Role', 'Role'],        // RR : parent → child (senior → junior)
  Next:       ['Activity', 'Activity'],// S  : immediate succession
  Separate:   ['Process', 'Process'],  // X  : separation of concerns (symmetric)
  Acts:       ['Role', 'User'],        // RU+ shorthand
  Assumes:    ['User', 'Process'],     // UP+ shorthand
  AssignedTo: ['Role', 'Activity'],    // RA+ shorthand
  Reaches:    ['Role', 'Process'],     // RP+ shorthand (role-level zone grant)
};

export const POLICY_TYPES = {
  CanAct:      { rel: 'RU', args: ['Role', 'User'] },
  CanAssignTo: { rel: 'RA', args: ['Role', 'Activity'] },
  CanAssume:   { rel: 'UP', args: ['User', 'Process'] },
  CanReach:    { rel: 'RP', args: ['Role', 'Process'] },
  CanDelegate: { rel: 'D',  args: ['Role', 'Role', 'Delegable'] },
};

export const UNRESTRICTED = '__UNRESTRICTED__';

const key = (...xs) => xs.join('\u0000');

/** Reflexive-transitive closure of a Map<string, Set<string>> from a seed set */
function closeFrom(edges, seed) {
  const out = new Set();
  const stack = [...seed];
  while (stack.length) {
    const n = stack.pop();
    if (out.has(n)) continue;
    out.add(n);
    for (const m of edges.get(n) || []) if (!out.has(m)) stack.push(m);
  }
  return out;
}

/** Strict transitive closure (excludes the seed unless genuinely reachable) */
function strictClose(edges, from) {
  const out = new Set();
  const stack = [...(edges.get(from) || [])];
  while (stack.length) {
    const n = stack.pop();
    if (out.has(n)) continue;
    out.add(n);
    for (const m of edges.get(n) || []) if (!out.has(m)) stack.push(m);
  }
  return out;
}

export class GamModel {
  /**
   * Build one combined model from a legal model and an enterprise model.
   * Both contribute to the SAME relations. Origin is retained for provenance
   * in violation reports, never for namespacing.
   */
  constructor(lawModel = {}, enterpriseModel = {}) {
    this.origin = new Map();          // "REL\0a\0b" → 'law' | 'enterprise' | 'both'

    this.sortOf = new Map();          // entity id → sort

    // ontology relations
    this.PP = new Map();  // process → Set(subprocess)
    this.PA = new Map();  // process → Set(activity)
    this.RR = new Map();  // role → Set(subrole)
    this.S  = new Map();  // activity → Set(next activity)
    this.X  = new Map();  // process → Set(separated process), symmetric

    // policy relations, split by polarity
    this.RAp = new Map(); this.RAm = new Map();  // role → Set(activity)
    this.RUp = new Map(); this.RUm = new Map();  // role → Set(user)
    this.UPp = new Map(); this.UPm = new Map();  // user → Set(process)
    this.RPp = new Map(); this.RPm = new Map();  // role → Set(process)
    this.Dp  = [];        this.Dm  = [];         // {from, to, target}

    this._ingest(lawModel, 'law');
    this._ingest(enterpriseModel, 'enterprise');
    this._symmetrise(this.X);
  }

  _note(rel, a, b, origin) {
    const k = key(rel, a, b);
    const prev = this.origin.get(k);
    this.origin.set(k, prev && prev !== origin ? 'both' : origin);
  }

  _add(map, a, b, rel, origin) {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
    if (rel) this._note(rel, a, b, origin);
  }

  _symmetrise(map) {
    for (const [a, bs] of [...map]) {
      for (const b of bs) {
        if (!map.has(b)) map.set(b, new Set());
        map.get(b).add(a);
      }
    }
  }

  _ingest(model, origin) {
    for (const e of model.entities || []) {
      if (e && e.id) this.sortOf.set(e.id, e.type);
    }

    for (const r of model.relations || []) {
      if (!r || !r.type) continue;
      const { type, source, target } = r;
      switch (type) {
        case 'ComposedOf': this._add(this.PP, source, target, type, origin); break;
        case 'Contains':   this._add(this.PA, source, target, type, origin); break;
        case 'Includes':   this._add(this.RR, source, target, type, origin); break;
        case 'Next':       this._add(this.S,  source, target, type, origin); break;
        case 'Separate':   this._add(this.X,  source, target, type, origin); break;
        case 'Acts':       this._add(this.RUp, source, target, type, origin); break;
        case 'Assumes':    this._add(this.UPp, source, target, type, origin); break;
        case 'AssignedTo': this._add(this.RAp, source, target, type, origin); break;
        case 'Reaches':    this._add(this.RPp, source, target, type, origin); break;
        default: break; // unknown relation types are surfaced by validate()
      }
    }

    for (const p of model.policies || []) {
      if (!p || !p.type) continue;
      const deny = (p.modality || p.allow_deny) === 'Deny';
      const s = p.source, t = p.target;
      switch (p.type) {
        case 'CanAct':      this._add(deny ? this.RUm : this.RUp, t, s, p.type, origin); break;
        case 'CanAssignTo': this._add(deny ? this.RAm : this.RAp, t, s, p.type, origin); break;
        case 'CanAssume':   this._add(deny ? this.UPm : this.UPp, s, t, p.type, origin); break;
        case 'CanReach':    this._add(deny ? this.RPm : this.RPp, s, t, p.type, origin); break;
        case 'CanDelegate': {
          const d = { from: s, to: t, target: p.parameters?.activity_or_process || UNRESTRICTED, origin };
          (deny ? this.Dm : this.Dp).push(d);
          break;
        }
        default: break;
      }
    }
  }

  /** provenance of a fact, for violation reporting */
  originOf(rel, a, b) { return this.origin.get(key(rel, a, b)) || 'unknown'; }

  // ─── closures ────────────────────────────────────────────────────────────

  /** PA* — every activity of p at any composition depth */
  act(processes) {
    const zones = closeFrom(this.PP, processes);
    const out = new Set();
    for (const z of zones) for (const a of this.PA.get(z) || []) out.add(a);
    return out;
  }

  /** PP* — every process reachable by composition */
  proc(processes) { return closeFrom(this.PP, processes); }

  /** roles a set of roles subsumes (senior inherits junior) */
  roleClosure(roles) { return closeFrom(this.RR, roles); }

  rolePermits(roles) {
    const out = new Set();
    for (const r of this.roleClosure(roles)) for (const a of this.RAp.get(r) || []) out.add(a);
    return out;
  }

  roleForbids(roles) {
    const out = new Set();
    for (const r of this.roleClosure(roles)) for (const a of this.RAm.get(r) || []) out.add(a);
    return out;
  }

  rolePermitsProc(roles) {
    const out = new Set();
    for (const r of this.roleClosure(roles)) for (const p of this.RPp.get(r) || []) out.add(p);
    return out;
  }

  roleForbidsProc(roles) {
    const out = new Set();
    for (const r of this.roleClosure(roles)) for (const p of this.RPm.get(r) || []) out.add(p);
    return out;
  }

  /** roles a user holds */
  rolesOf(user) {
    const out = new Set();
    for (const [role, users] of this.RUp) if (users.has(user)) out.add(role);
    return out;
  }

  rolesForbiddenTo(user) {
    const out = new Set();
    for (const [role, users] of this.RUm) if (users.has(user)) out.add(role);
    return out;
  }

  /** activities acquired by delegation from a role that legitimately holds them */
  delegatedActs(roles) {
    const held = new Set(roles);
    const out = new Set();
    for (const d of this.Dp) {
      if (!held.has(d.to)) continue;
      const fromHolds = this.rolePermits(new Set([d.from]));
      if (d.target === UNRESTRICTED) { for (const a of fromHolds) out.add(a); }
      else if (fromHolds.has(d.target)) out.add(d.target);
    }
    return out;
  }

  delegatedProcs(roles) {
    const held = new Set(roles);
    const out = new Set();
    for (const d of this.Dp) {
      if (!held.has(d.to)) continue;
      const fromZones = this.rolePermitsProc(new Set([d.from]));
      if (d.target === UNRESTRICTED) { for (const p of fromZones) out.add(p); }
      else if (fromZones.has(d.target)) out.add(d.target);
    }
    return out;
  }

  /** RA* — activities a user effectively reaches */
  effAct(user) {
    const roles = this.rolesOf(user);
    const out = new Set([
      ...this.rolePermits(roles),
      ...this.delegatedActs(roles),
      ...this.act(this.UPp.get(user) || new Set()),
    ]);
    // activities inside any zone the user reaches through a role grant
    for (const a of this.act(this.rolePermitsProc(roles))) out.add(a);
    for (const a of this.act(this.delegatedProcs(roles))) out.add(a);
    return out;
  }

  effForbiddenAct(user) { return this.roleForbids(this.rolesOf(user)); }

  /** UP* — processes a user effectively reaches */
  effProc(user) {
    const roles = this.rolesOf(user);
    return new Set([
      ...this.proc(this.UPp.get(user) || new Set()),
      ...this.proc(this.rolePermitsProc(roles)),
      ...this.proc(this.delegatedProcs(roles)),
    ]);
  }

  effForbiddenProc(user) {
    return new Set([
      ...(this.UPm.get(user) || new Set()),
      ...this.roleForbidsProc(this.rolesOf(user)),
    ]);
  }

  /** S⁺ — is there a path from a1 to a2 through the sequence relation? */
  traces(a1, a2) { return strictClose(this.S, a1).has(a2); }

  /** the actual path, for diagnostics */
  tracePath(a1, a2) {
    const prev = new Map();
    const seen = new Set([a1]);
    const q = [a1];
    while (q.length) {
      const n = q.shift();
      if (n === a2 && n !== a1) break;
      for (const m of this.S.get(n) || []) {
        if (seen.has(m)) continue;
        seen.add(m); prev.set(m, n); q.push(m);
      }
    }
    if (!seen.has(a2) || a1 === a2) return null;
    const path = [a2];
    while (prev.has(path[0])) path.unshift(prev.get(path[0]));
    return path[0] === a1 ? path : null;
  }

  get users()      { return [...new Set([...this.RUp.values()].flatMap(s => [...s]))]; }
  get processes()  { return [...new Set([...this.PP.keys(), ...[...this.PP.values()].flatMap(s => [...s]), ...this.PA.keys()])]; }
  get activities() { return [...new Set([...[...this.PA.values()].flatMap(s => [...s]), ...this.S.keys()])]; }
  get roles()      { return [...new Set([...this.RR.keys(), ...[...this.RR.values()].flatMap(s => [...s]), ...this.RAp.keys(), ...this.RAm.keys(), ...this.RUp.keys()])]; }
}

export default GamModel;
