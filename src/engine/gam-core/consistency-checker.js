/**
 * GAM — Consistency Checker
 *
 * Decides Con(⋀Φ_E ∧ ⋀Φ_L) over the combined model.
 *
 * Every violation reported here is DERIVED from the closure of the declared
 * relations. Nothing is asserted into the solver to force a verdict, and no
 * conflict is detected by string comparison of policy keys. If a conflict is
 * reported, there is a witness: a principal, a capability or zone, and the
 * inheritance / composition / delegation path that produced it.
 *
 * Conjuncts (mirroring pred Con in alloy/gam_core.als):
 *   1  RA* ∩ RA⁻ = ∅            NoActivityConflict
 *   2  RU⁺ ∩ RU⁻ = ∅            NoRoleOccupancyConflict
 *   3  UP* ∩ UP⁻ = ∅            NoProcessAccessConflict
 *   4  separation of concerns   SeparationRespected
 *   5  delegation soundness     DelegationSound
 */

import { GamModel } from './model.js';
import { SATSolver } from './sat-solver.js';

export class ConsistencyChecker {
  constructor() {
    this.violations = [];
    this.model = null;
  }

  /**
   * @param {Object} lawModel         GAL-JSON law model         (Φ_L)
   * @param {Object} enterpriseModel  GAL-JSON enterprise model  (Φ_E)
   * @returns {{consistent, violations, witness, stats, model}}
   */
  check(lawModel = {}, enterpriseModel = {}) {
    this.violations = [];
    const M = this.model = new GamModel(lawModel, enterpriseModel);

    const users = M.users;
    for (const u of users) {
      this._activityConflicts(M, u);
      this._roleOccupancyConflicts(M, u);
      this._processAccessConflicts(M, u);
      this._separationViolations(M, u);
    }
    this._delegationViolations(M);

    // The SAT layer is a cross-check, not the detector. It encodes the SAME
    // shared vocabulary and must agree with the closure analysis; a divergence
    // is a bug in one of them and is reported as such.
    const sat = this._satCrossCheck(M);

    const consistent = this.violations.length === 0;
    if (consistent !== sat.satisfiable) {
      this.violations.push({
        type: 'ENGINE_DISAGREEMENT',
        severity: 'Critical',
        message: `Closure analysis and SAT encoding disagree (closure: ${consistent ? 'consistent' : 'inconsistent'}, SAT: ${sat.satisfiable ? 'SAT' : 'UNSAT'}). This is an engine defect, not a compliance finding.`,
      });
    }

    return {
      consistent: this.violations.length === 0,
      violations: this.violations,
      minimalConflict: sat.mus,
      stats: sat.stats,
      model: M,
    };
  }

  // ─── 1. RA* ∩ RA⁻ ────────────────────────────────────────────────────────

  _activityConflicts(M, user) {
    const reach = M.effAct(user);
    const barred = M.effForbiddenAct(user);
    for (const a of reach) {
      if (!barred.has(a)) continue;
      this.violations.push({
        type: 'ACTIVITY_CONFLICT',
        severity: 'Critical',
        message: `Principal "${user}" effectively reaches activity "${a}", which is prohibited for a role it holds.`,
        user, activity: a,
        grantedVia: this._explainActivity(M, user, a),
        prohibitedVia: this._explainProhibition(M, user, a),
      });
    }
  }

  _explainActivity(M, user, activity) {
    const roles = M.rolesOf(user);
    const paths = [];
    for (const r of roles) {
      for (const rr of M.roleClosure(new Set([r]))) {
        if ((M.RAp.get(rr) || new Set()).has(activity)) {
          paths.push(rr === r ? `acts as ${r}, which permits ${activity}`
                              : `acts as ${r} ⊇ ${rr}, which permits ${activity}`);
        }
      }
    }
    for (const p of M.UPp.get(user) || []) {
      for (const z of M.proc(new Set([p]))) {
        if ((M.PA.get(z) || new Set()).has(activity)) {
          paths.push(z === p ? `assumes process ${p}, which contains ${activity}`
                             : `assumes process ${p} ⊇ ${z}, which contains ${activity}`);
        }
      }
    }
    for (const z of M.rolePermitsProc(roles)) {
      for (const zz of M.proc(new Set([z]))) {
        if ((M.PA.get(zz) || new Set()).has(activity)) {
          paths.push(`holds a role granting zone ${z} ⊇ ${zz}, which contains ${activity}`);
        }
      }
    }
    if (M.delegatedActs(roles).has(activity)) paths.push(`receives ${activity} by delegation`);
    return paths;
  }

  _explainProhibition(M, user, activity) {
    const out = [];
    for (const r of M.rolesOf(user)) {
      for (const rr of M.roleClosure(new Set([r]))) {
        if ((M.RAm.get(rr) || new Set()).has(activity)) {
          out.push(`${rr} is prohibited ${activity} (${M.originOf('CanAssignTo', rr, activity)})`);
        }
      }
    }
    return out;
  }

  // ─── 2. RU⁺ ∩ RU⁻ ────────────────────────────────────────────────────────

  _roleOccupancyConflicts(M, user) {
    const held = M.rolesOf(user);
    const barred = M.rolesForbiddenTo(user);
    for (const r of held) {
      if (!barred.has(r)) continue;
      this.violations.push({
        type: 'ROLE_OCCUPANCY_CONFLICT',
        severity: 'Critical',
        message: `Principal "${user}" occupies role "${r}", which it is prohibited from occupying.`,
        user, role: r,
      });
    }
  }

  // ─── 3. UP* ∩ UP⁻ ────────────────────────────────────────────────────────

  _processAccessConflicts(M, user) {
    const reach = M.effProc(user);
    const barred = M.effForbiddenProc(user);
    for (const p of reach) {
      if (!barred.has(p)) continue;
      this.violations.push({
        type: 'PROCESS_ACCESS_CONFLICT',
        severity: 'Critical',
        message: `Principal "${user}" effectively reaches zone "${p}", which is prohibited.`,
        user, process: p,
        grantedVia: this._explainZone(M, user, p),
      });
    }
  }

  _explainZone(M, user, zone) {
    const out = [];
    for (const p of M.UPp.get(user) || []) {
      if (M.proc(new Set([p])).has(zone)) {
        out.push(p === zone ? `assumes ${p}` : `assumes ${p}, which composes ${zone}`);
      }
    }
    const roles = M.rolesOf(user);
    for (const z of M.rolePermitsProc(roles)) {
      if (M.proc(new Set([z])).has(zone)) {
        out.push(z === zone ? `holds a role granting ${z}` : `holds a role granting ${z}, which composes ${zone}`);
      }
    }
    for (const z of M.delegatedProcs(roles)) {
      if (M.proc(new Set([z])).has(zone)) out.push(`receives ${z} by delegation`);
    }
    return out;
  }

  // ─── 4. separation of concerns ───────────────────────────────────────────

  _separationViolations(M, user) {
    const reach = [...M.effProc(user)];
    const seen = new Set();
    for (const p of reach) {
      for (const q of M.X.get(p) || []) {
        if (!reach.includes(q)) continue;
        const k = [p, q].sort().join('|');
        if (seen.has(k)) continue;
        seen.add(k);
        this.violations.push({
          type: 'SEPARATION_VIOLATION',
          severity: 'Critical',
          message: `Principal "${user}" effectively reaches both "${p}" and "${q}", which are held in separation of concerns.`,
          user, process1: p, process2: q,
          reachedVia: { [p]: this._explainZone(M, user, p), [q]: this._explainZone(M, user, q) },
          separationOrigin: M.originOf('Separate', p, q),
        });
      }
    }
  }

  // ─── 5. delegation soundness ─────────────────────────────────────────────

  _delegationViolations(M) {
    for (const d of M.Dp) {
      const clash = M.Dm.find(x => x.from === d.from && x.to === d.to && x.target === d.target);
      if (clash) {
        this.violations.push({
          type: 'DELEGATION_CONFLICT',
          severity: 'Critical',
          message: `Delegation of "${d.target}" from "${d.from}" to "${d.to}" is both permitted and prohibited.`,
          from: d.from, to: d.to, target: d.target,
        });
      }
      const barred = M.roleForbids(new Set([d.to]));
      if (d.target !== '__UNRESTRICTED__' && barred.has(d.target)) {
        this.violations.push({
          type: 'DELEGATION_LAUNDERS_PROHIBITION',
          severity: 'Critical',
          message: `Delegation confers "${d.target}" on "${d.to}", which is prohibited from holding it.`,
          from: d.from, to: d.to, target: d.target,
        });
      }
    }
  }

  // ─── SAT cross-check ─────────────────────────────────────────────────────

  /**
   * Encode the closure over ONE shared vocabulary and confirm the verdict.
   * Variables are domain propositions — reach(user,activity), barred(...) —
   * with no origin prefix, so law and enterprise facts genuinely interact.
   */
  _satCrossCheck(M) {
    const s = new SATSolver();
    const clauses = [];
    const labels = [];

    const unit = (lit, label) => { clauses.push([lit]); labels.push(label); };

    for (const u of M.users) {
      for (const a of M.effAct(u))          unit(s.pos(`reach(${u},${a})`),  `${u} reaches ${a}`);
      for (const a of M.effForbiddenAct(u)) unit(s.neg(`reach(${u},${a})`),  `${u} is barred from ${a}`);
      for (const p of M.effProc(u))         unit(s.pos(`inzone(${u},${p})`), `${u} reaches zone ${p}`);
      for (const p of M.effForbiddenProc(u))unit(s.neg(`inzone(${u},${p})`), `${u} is barred from zone ${p}`);
      for (const r of M.rolesOf(u))         unit(s.pos(`acts(${u},${r})`),   `${u} acts as ${r}`);
      for (const r of M.rolesForbiddenTo(u))unit(s.neg(`acts(${u},${r})`),   `${u} may not act as ${r}`);
      // separation: ¬(inzone(u,p) ∧ inzone(u,q))
      for (const [p, qs] of M.X) {
        for (const q of qs) {
          if (p >= q) continue;
          clauses.push([s.neg(`inzone(${u},${p})`), s.neg(`inzone(${u},${q})`)]);
          labels.push(`${p} and ${q} are separated for ${u}`);
        }
      }
    }

    const res = s.solve(clauses);
    let mus = [];
    if (!res.satisfiable) {
      mus = s.minimalUnsatCore(clauses).map(i => labels[i]).filter(Boolean);
    }
    return { satisfiable: res.satisfiable, stats: res.stats, mus };
  }

  /** internal consistency of a single model, with no counterparty */
  checkSingleModel(model) {
    return this.check(model, {});
  }
}

export default ConsistencyChecker;
