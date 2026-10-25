/**
 * GAM — Ontology and scenario checks.
 *
 * These are distinct from consistency checking and cannot be reduced to it.
 * An ontology GAP contradicts nothing: if the law requires a safety-review
 * step and the enterprise simply has none, Con still holds. Consistency is a
 * necessary condition for compliance, not a sufficient one (thesis §2.2 as
 * revised), and this module is where the rest of the condition lives.
 */

import { GamModel } from './model.js';

export class OntologyChecker {
  /**
   * @param {Object} lawModel        must carry `ontologyRequirements` and/or `scenarioRequirements`
   * @param {Object} enterpriseModel
   */
  check(lawModel = {}, enterpriseModel = {}) {
    const M = new GamModel(lawModel, enterpriseModel);
    const violations = [];

    for (const req of lawModel.ontologyRequirements || []) {
      if (req.activity && req.process) {
        if (!M.act(new Set([req.process])).has(req.activity)) {
          violations.push({
            type: 'ONTOLOGY_GAP', severity: 'Major', requirement: req.id,
            message: `Process "${req.process}" does not contain required activity "${req.activity}" at any composition depth.`,
            process: req.process, activity: req.activity, rationale: req.rationale,
          });
        }
      }
      if (req.parentRole && req.childRole) {
        if (!M.roleClosure(new Set([req.parentRole])).has(req.childRole)) {
          violations.push({
            type: 'ONTOLOGY_GAP', severity: 'Major', requirement: req.id,
            message: `Role "${req.parentRole}" does not subsume required sub-role "${req.childRole}".`,
            rationale: req.rationale,
          });
        }
      }
      if (req.parentProcess && req.childProcess) {
        if (!M.proc(new Set([req.parentProcess])).has(req.childProcess)) {
          violations.push({
            type: 'ONTOLOGY_GAP', severity: 'Major', requirement: req.id,
            message: `Process "${req.parentProcess}" does not compose required sub-process "${req.childProcess}".`,
            rationale: req.rationale,
          });
        }
      }
    }

    for (const req of lawModel.scenarioRequirements || []) {
      if (req.kind === 'precedence') {
        if (!M.traces(req.from, req.to)) {
          violations.push({
            type: 'SCENARIO_VIOLATION', severity: 'Major', requirement: req.id,
            message: `No path from "${req.from}" to "${req.to}": the required precedence does not hold.`,
            from: req.from, to: req.to, rationale: req.rationale,
          });
        }
      }
      if (req.kind === 'forbidden-precedence' && M.traces(req.from, req.to)) {
        violations.push({
          type: 'SCENARIO_VIOLATION', severity: 'Critical', requirement: req.id,
          message: `A path exists from "${req.from}" to "${req.to}", which the law forbids.`,
          path: M.tracePath(req.from, req.to), rationale: req.rationale,
        });
      }
    }

    return { satisfied: violations.length === 0, violations, model: M };
  }
}

export default OntologyChecker;
