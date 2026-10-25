/**
 * DPLL-Based SAT Solver
 * Propositional satisfiability checker for GAM compliance validation
 * Supports unit propagation, pure literal elimination, and conflict detection
 */

// ─── Clause Representation ──────────────────────────────────────────────────────
// A clause is an array of integers. Positive = variable true, negative = variable false.
// A formula is an array of clauses (CNF).

export class SATSolver {
    constructor() {
        this.variableNames = new Map(); // name → variable number
        this.variableIndex = new Map(); // variable number → name
        this.nextVar = 1;
        this.stats = { decisions: 0, propagations: 0, conflicts: 0 };
    }

    /** Get or create a variable index for a named proposition */
    variable(name) {
        if (this.variableNames.has(name)) return this.variableNames.get(name);
        const v = this.nextVar++;
        this.variableNames.set(name, v);
        this.variableIndex.set(v, name);
        return v;
    }

    /** Create a positive literal */
    pos(name) { return this.variable(name); }

    /** Create a negative literal */
    neg(name) { return -this.variable(name); }

    /** Reset solver state */
    reset() {
        this.variableNames.clear();
        this.variableIndex.clear();
        this.nextVar = 1;
        this.stats = { decisions: 0, propagations: 0, conflicts: 0 };
    }

    // ─── CNF Construction Helpers ───────────────────────────────────────────────

    /** A implies B: ¬A ∨ B */
    implies(a, b) { return [-a, b]; }

    /** A if and only if B: (¬A ∨ B) ∧ (A ∨ ¬B) */
    iff(a, b) { return [[-a, b], [a, -b]]; }

    /** At least one of the literals is true */
    atLeastOne(literals) { return [literals]; }

    /** At most one of the literals is true (pairwise exclusion) */
    atMostOne(literals) {
        const clauses = [];
        for (let i = 0; i < literals.length; i++) {
            for (let j = i + 1; j < literals.length; j++) {
                clauses.push([-literals[i], -literals[j]]);
            }
        }
        return clauses;
    }

    /** Exactly one of the literals is true */
    exactlyOne(literals) {
        return [...this.atLeastOne(literals), ...this.atMostOne(literals)];
    }

    /** Mutual exclusion: A and B cannot both be true */
    mutualExclusion(a, b) { return [[-a, -b]]; }

    // ─── DPLL Solver ────────────────────────────────────────────────────────────

    /**
     * Solve a CNF formula. Returns { satisfiable, model, stats }
     * model maps variable names to boolean values
     */
    solve(clauses) {
        this.stats = { decisions: 0, propagations: 0, conflicts: 0 };
        if (this.nextVar > 100000) this.reset();   // bound variable-table growth
        const assignment = new Map();
        const result = this._dpll([...clauses.map(c => [...c])], assignment);

        if (result) {
            const model = {};
            for (const [varNum, val] of assignment) {
                const name = this.variableIndex.get(varNum);
                if (name) model[name] = val;
            }
            return { satisfiable: true, model, stats: { ...this.stats } };
        }
        return { satisfiable: false, model: null, stats: { ...this.stats } };
    }

    _dpll(clauses, assignment, depth = 0) {
        if (depth > 5000) throw new Error('GAM SAT: search depth bound exceeded; model too large for the propositional cross-check');
        // Unit propagation
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < clauses.length; i++) {
                const clause = clauses[i];
                if (clause === null) continue;

                // Filter satisfied/resolved literals
                const remaining = [];
                let satisfied = false;
                for (const lit of clause) {
                    const v = Math.abs(lit);
                    if (assignment.has(v)) {
                        const val = assignment.get(v);
                        if ((lit > 0 && val) || (lit < 0 && !val)) {
                            satisfied = true;
                            break;
                        }
                        // literal is false, skip it
                    } else {
                        remaining.push(lit);
                    }
                }

                if (satisfied) {
                    clauses[i] = null;
                    continue;
                }

                if (remaining.length === 0) {
                    this.stats.conflicts++;
                    return false; // UNSAT — empty clause
                }

                if (remaining.length === 1) {
                    // Unit clause → propagate
                    const lit = remaining[0];
                    const v = Math.abs(lit);
                    assignment.set(v, lit > 0);
                    clauses[i] = null;
                    this.stats.propagations++;
                    changed = true;
                }
            }
        }

        // Pure literal elimination
        const literalPolarity = new Map();
        for (const clause of clauses) {
            if (clause === null) continue;
            for (const lit of clause) {
                const v = Math.abs(lit);
                if (assignment.has(v)) continue;
                const pol = lit > 0 ? 1 : -1;
                if (!literalPolarity.has(v)) {
                    literalPolarity.set(v, pol);
                } else if (literalPolarity.get(v) !== pol) {
                    literalPolarity.set(v, 0); // mixed polarity
                }
            }
        }
        for (const [v, pol] of literalPolarity) {
            if (pol !== 0 && !assignment.has(v)) {
                assignment.set(v, pol > 0);
                this.stats.propagations++;
            }
        }

        // Clean up satisfied clauses
        const active = [];
        for (const clause of clauses) {
            if (clause === null) continue;
            let satisfied = false;
            const remaining = [];
            for (const lit of clause) {
                const v = Math.abs(lit);
                if (assignment.has(v)) {
                    const val = assignment.get(v);
                    if ((lit > 0 && val) || (lit < 0 && !val)) {
                        satisfied = true;
                        break;
                    }
                } else {
                    remaining.push(lit);
                }
            }
            if (!satisfied) {
                if (remaining.length === 0) {
                    this.stats.conflicts++;
                    return false;
                }
                active.push(remaining);
            }
        }

        // All clauses satisfied
        if (active.length === 0) return true;

        // Choose an unassigned variable (pick from the first active clause)
        let chosenVar = null;
        for (const clause of active) {
            for (const lit of clause) {
                const v = Math.abs(lit);
                if (!assignment.has(v)) {
                    chosenVar = v;
                    break;
                }
            }
            if (chosenVar !== null) break;
        }

        if (chosenVar === null) return true;

        this.stats.decisions++;

        // Try true
        const savedAssignment = new Map(assignment);
        assignment.set(chosenVar, true);
        if (this._dpll(active.map(c => [...c]), assignment, depth + 1)) return true;

        // Backtrack and try false
        assignment.clear();
        for (const [k, v] of savedAssignment) assignment.set(k, v);
        assignment.set(chosenVar, false);
        this.stats.decisions++;
        return this._dpll(active.map(c => [...c]), assignment, depth + 1);
    }

    // ─── Conflict Extraction ──────────────────────────────────────────────

    /**
     * Deletion-based minimal unsatisfiable subset (MUS).
     *
     * Replaces the earlier `findConflicts`, which tested each clause for
     * individual criticality: if removing clause i restored satisfiability,
     * i was reported. That is only correct when exactly one conflict exists.
     * With two or more independent conflicts, removing any single clause
     * leaves the formula UNSAT, so the old routine returned [] — an
     * "inconsistent, no explanation" verdict on precisely the models that
     * occur in practice.
     *
     * Deletion-based MUS instead removes a clause and KEEPS it removed if the
     * remainder is still UNSAT, converging on a genuinely minimal core.
     *
     * @returns {number[]} indices into `clauses` forming a minimal core, or []
     *                     if the formula is satisfiable.
     */
    minimalUnsatCore(clauses) {
        if (this.solve(clauses).satisfiable) return [];

        let core = clauses.map((_, i) => i);
        for (let k = 0; k < clauses.length; k++) {
            if (!core.includes(k)) continue;
            const trial = core.filter(i => i !== k);
            const sub = trial.map(i => clauses[i]);
            if (!this.solve(sub).satisfiable) core = trial;   // k was not needed
        }
        return core;
    }

    /**
     * All clauses that are individually critical (removing one restores SAT).
     * Retained for compatibility; prefer minimalUnsatCore. Returns [] when the
     * formula has two or more independent conflicts — a documented limitation
     * of this notion, not a bug.
     */
    findCriticalClauses(clauses) {
        if (this.solve(clauses).satisfiable) return [];
        const critical = [];
        for (let i = 0; i < clauses.length; i++) {
            if (this.solve(clauses.filter((_, j) => j !== i)).satisfiable) critical.push(i);
        }
        return critical;
    }
}

export default SATSolver;
