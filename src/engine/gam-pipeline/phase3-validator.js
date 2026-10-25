/**
 * Phase 3: Validation Logic Generator
 * Generates check artifacts for the SAT-based logic analyzer
 */

import { createCheck } from '../gam-core/schema.js';

// ─── Check Generators ────────────────────────────────────────────────────────────

/**
 * Generate all validation checks for a GAL-JSON model
 * @param {Object} model - Complete GAL-JSON model
 * @returns {Array} Array of validation check objects
 */
export function generateValidationChecks(model) {
    const checks = [];

    checks.push(...generateProcessChecks(model));
    checks.push(...generateActivityChecks(model));
    checks.push(...generateRoleChecks(model));
    checks.push(...generateAssignmentChecks(model));
    checks.push(...generateSeparationChecks(model));
    checks.push(...generateAccessChecks(model));
    checks.push(...generateConstraintChecks(model));
    checks.push(...generateReportingChecks(model));
    checks.push(...generatePotestativeChecks(model));
    checks.push(...generateJurisdictionChecks(model));
    checks.push(...generateThresholdChecks(model));
    checks.push(...generateDefeatChecks(model));
    checks.push(...generateMultiJurisdictionChecks(model));

    return checks;
}

// ─── Process & Activity Checks ──────────────────────────────────────────────────

function generateProcessChecks(model) {
    const checks = [];
    const composed = (model.relations || []).filter(r => r.type === 'ComposedOf');
    const contains = (model.relations || []).filter(r => r.type === 'Contains');

    // Process-Parent: Validate child process has parent
    for (const rel of composed) {
        checks.push(createCheck(
            'Process-Parent',
            `Check_ProcessParent_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Validate that ${rel.target} is a child of ${rel.source}`,
            }
        ));
    }

    // Process-Activity: Confirm activity inclusion in process
    for (const rel of contains) {
        checks.push(createCheck(
            'Process-Activity',
            `Check_ProcessActivity_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Validate that activity ${rel.target} is contained in process ${rel.source}`,
            }
        ));
    }

    return checks;
}

function generateActivityChecks(model) {
    const checks = [];
    const sequences = (model.relations || []).filter(r => r.type === 'Next');

    // Activity-Predecessor: Ensure immediate sequencing
    for (const rel of sequences) {
        checks.push(createCheck(
            'Activity-Predecessor',
            `Check_ActivityPred_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Critical',
                expected_result: 'True',
                description: `Validate that ${rel.source} immediately precedes ${rel.target}`,
            }
        ));
    }

    // Activity-Trace: Verify ancestral lineage (transitive closure)
    const activityGraph = buildActivityGraph(sequences);
    for (const [ancestor, descendants] of activityGraph) {
        for (const descendant of descendants) {
            checks.push(createCheck(
                'Activity-Trace',
                `Check_ActivityTrace_${ancestor}_${descendant}`,
                'ALL',
                ancestor,
                descendant,
                {
                    severity: 'Major',
                    expected_result: 'True',
                    description: `Verify transitive path from ${ancestor} to ${descendant}`,
                }
            ));
        }
    }

    return checks;
}

function buildActivityGraph(sequences) {
    const graph = new Map();
    const adj = new Map();

    for (const seq of sequences) {
        if (!adj.has(seq.source)) adj.set(seq.source, []);
        adj.get(seq.source).push(seq.target);
    }

    // Compute transitive closure
    for (const [start] of adj) {
        const reachable = new Set();
        const stack = [start];
        const visited = new Set();
        while (stack.length > 0) {
            const node = stack.pop();
            if (visited.has(node)) continue;
            visited.add(node);
            const neighbors = adj.get(node) || [];
            for (const n of neighbors) {
                if (n !== start) reachable.add(n);
                stack.push(n);
            }
        }
        if (reachable.size > 0) graph.set(start, [...reachable]);
    }

    return graph;
}

// ─── Role, User & Assignment Checks ─────────────────────────────────────────────

function generateRoleChecks(model) {
    const checks = [];
    const includes = (model.relations || []).filter(r => r.type === 'Includes');

    // Dep-Parent: Verify departmental hierarchy
    for (const rel of includes) {
        checks.push(createCheck(
            'Dep-Parent',
            `Check_DepParent_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Validate that ${rel.target} is included in ${rel.source}`,
            }
        ));
    }

    // checkInstance: Ensure required entities exist
    const requiredTypes = ['DepartmentRole', 'Process', 'Activity'];
    for (const type of requiredTypes) {
        const entities = (model.entities || []).filter(e => e.type === type);
        for (const entity of entities) {
            checks.push(createCheck(
                'checkInstance',
                `Check_Instance_${entity.id}`,
                'ALL',
                entity.id,
                entity.type,
                {
                    severity: 'Major',
                    expected_result: 'True',
                    description: `Ensure entity ${entity.name} (${entity.type}) exists in ontology`,
                }
            ));
        }
    }

    return checks;
}

function generateAssignmentChecks(model) {
    const checks = [];
    const assignments = (model.relations || []).filter(r => r.type === 'AssignedTo');
    const acts = (model.relations || []).filter(r => r.type === 'Acts');
    const assumes = (model.relations || []).filter(r => r.type === 'Assumes');
    const delegates = (model.relations || []).filter(r => r.type === 'Delegate');

    // checkAssignedTo: Verify activity delegation to role
    for (const rel of assignments) {
        checks.push(createCheck(
            'checkAssignedTo',
            `Check_AssignedTo_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Verify ${rel.target} is assigned to ${rel.source}`,
            }
        ));
    }

    // checkActs: Test that user fills designated role
    for (const rel of acts) {
        checks.push(createCheck(
            'checkActs',
            `Check_Acts_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Verify user ${rel.target} fills role ${rel.source}`,
            }
        ));
    }

    // checkAssumes: Validate user authorized for process
    for (const rel of assumes) {
        checks.push(createCheck(
            'checkAssumes',
            `Check_Assumes_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Validate user ${rel.source} is authorized for process ${rel.target}`,
            }
        ));
    }

    // checkDelegate: Authorize delegation rights
    for (const rel of delegates) {
        checks.push(createCheck(
            'checkDelegate',
            `Check_Delegate_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Critical',
                expected_result: 'True',
                description: `Authorize delegation from ${rel.source} to ${rel.target}`,
            }
        ));
    }

    return checks;
}

// ─── Multi-Variable Constraint Checks ───────────────────────────────────────────

function generateSeparationChecks(model) {
    const checks = [];
    const separations = (model.relations || []).filter(r => r.type === 'Separate');

    for (const rel of separations) {
        checks.push(createCheck(
            'Check-Separation',
            `Check_SoD_${rel.source}_${rel.target}`,
            'NONE',
            rel.source,
            rel.target,
            {
                severity: 'Critical',
                expected_result: 'True',
                description: `Verify separation of duties between ${rel.source} and ${rel.target}`,
            }
        ));
    }

    return checks;
}

function generateAccessChecks(model) {
    const checks = [];
    const accessPolicies = (model.policies || []).filter(
        p => p.type === 'CanAccess' || p.type === 'CanCollect' || p.type === 'CanProcess'
    );

    for (const pol of accessPolicies) {
        checks.push(createCheck(
            'Check-Object-Access',
            `Check_ObjAccess_${pol.source}_${pol.target}`,
            pol.allow_deny === 'Allow' ? 'ALL' : 'NONE',
            pol.target,  // DataObject
            pol.source,  // Role
            {
                severity: pol.allow_deny === 'Deny' ? 'Critical' : 'Major',
                expected_result: pol.allow_deny,
                description: `Verify ${pol.type} ${pol.allow_deny}: ${pol.source} → ${pol.target}`,
            }
        ));
    }

    return checks;
}

function generateConstraintChecks(model) {
    const checks = [];
    const constraints = (model.relations || []).filter(r => r.type === 'HasConstraint');

    for (const rel of constraints) {
        checks.push(createCheck(
            'Check-Constraint',
            `Check_Constraint_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Validate constraint ${rel.target} on entity ${rel.source}`,
            }
        ));
    }

    return checks;
}

function generateReportingChecks(model) {
    const checks = [];
    const reports = (model.relations || []).filter(r => r.type === 'MustReport');

    for (const rel of reports) {
        checks.push(createCheck(
            'Check-Reporting',
            `Check_Report_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Critical',
                expected_result: 'True',
                description: `Verify mandatory reporting from ${rel.source} to ${rel.target}`,
            }
        ));
    }

    return checks;
}

function generatePotestativeChecks(model) {
    const checks = [];
    const hohfeldianPolicies = (model.policies || []).filter(
        p => p.hohfeldian_modality && p.hohfeldian_modality !== 'None'
    );

    for (const pol of hohfeldianPolicies) {
        checks.push(createCheck(
            'Check-Potestative',
            `Check_Potestative_${pol.source}_${pol.hohfeldian_modality}`,
            'ALL',
            pol.source,
            pol.target,
            {
                severity: 'Major',
                expected_result: pol.hohfeldian_modality,
                description: `Verify Hohfeldian modality: ${pol.source} has ${pol.hohfeldian_modality} toward ${pol.target}`,
            }
        ));
    }

    return checks;
}

function generateJurisdictionChecks(model) {
    const checks = [];
    const jurisdictional = (model.relations || []).filter(r => r.type === 'AppliesIn');

    for (const rel of jurisdictional) {
        checks.push(createCheck(
            'Check-Jurisdiction',
            `Check_Jurisdiction_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                jurisdiction: rel.parameters?.jurisdiction,
                description: `Verify jurisdictional scope: ${rel.source} applies in ${rel.target}`,
            }
        ));
    }

    return checks;
}

function generateThresholdChecks(model) {
    const checks = [];
    const thresholds = (model.relations || []).filter(r => r.type === 'HasThreshold');

    for (const rel of thresholds) {
        checks.push(createCheck(
            'Check-Threshold',
            `Check_Threshold_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Major',
                expected_result: 'True',
                description: `Verify applicability threshold: ${rel.source} → ${rel.target}`,
            }
        ));
    }

    return checks;
}

function generateDefeatChecks(model) {
    const checks = [];
    const rebuts = (model.relations || []).filter(r => r.type === 'Rebuts');
    const undercuts = (model.relations || []).filter(r => r.type === 'Undercuts');

    for (const rel of [...rebuts, ...undercuts]) {
        checks.push(createCheck(
            'Check-Defeat',
            `Check_Defeat_${rel.source}_${rel.target}`,
            'ALL',
            rel.source,
            rel.target,
            {
                severity: 'Critical',
                expected_result: 'True',
                description: `Verify defeasibility resolution: ${rel.source} ${rel.type} ${rel.target}`,
            }
        ));
    }

    return checks;
}

function generateMultiJurisdictionChecks(model) {
    const checks = [];
    const jurisdictions = new Set();

    for (const entity of (model.entities || [])) {
        if (entity.jurisdiction) jurisdictions.add(entity.jurisdiction);
    }

    if (jurisdictions.size > 1) {
        const jurisdictionList = [...jurisdictions];
        for (let i = 0; i < jurisdictionList.length; i++) {
            for (let j = i + 1; j < jurisdictionList.length; j++) {
                checks.push(createCheck(
                    'Check-MultiJurisdiction',
                    `Check_MultiJuris_${jurisdictionList[i]}_${jurisdictionList[j]}`,
                    'ALL',
                    jurisdictionList[i],
                    jurisdictionList[j],
                    {
                        severity: 'Critical',
                        expected_result: 'True',
                        description: `Cross-jurisdictional consistency between ${jurisdictionList[i]} and ${jurisdictionList[j]}`,
                    }
                ));
            }
        }
    }

    return checks;
}

// ─── Check Execution Engine ─────────────────────────────────────────────────────

/**
 * Execute validation checks against a model
 * @param {Array} checks - Validation checks to execute
 * @param {Object} model - Combined model (Law + Enterprise)
 * @returns {Array} Check results with PASS/FAIL/INDETERMINATE
 */
export function executeChecks(checks, model) {
    const entityIds = new Set((model.entities || []).map(e => e.id));
    const entityMap = new Map((model.entities || []).map(e => [e.id, e]));
    const relationIndex = buildRelationIndex(model.relations || []);
    const policyIndex = buildPolicyIndex(model.policies || []);
    const results = [];

    for (const check of checks) {
        const result = executeCheck(check, entityIds, entityMap, relationIndex, policyIndex);
        results.push(result);
    }

    return results;
}

function buildRelationIndex(relations) {
    const index = new Map();
    for (const rel of relations) {
        const key = `${rel.type}:${rel.source}:${rel.target}`;
        index.set(key, rel);
        // Also index by type
        if (!index.has(rel.type)) index.set(rel.type, []);
        index.get(rel.type).push(rel);
    }
    return index;
}

function buildPolicyIndex(policies) {
    const index = new Map();
    for (const pol of policies) {
        const key = `${pol.type}:${pol.source}:${pol.target}`;
        index.set(key, pol);
        if (!index.has(pol.type)) index.set(pol.type, []);
        index.get(pol.type).push(pol);
    }
    return index;
}

function executeCheck(check, entityIds, entityMap, relationIndex, policyIndex) {
    const base = {
        label: check.label,
        check_type: check.check_type,
        severity: check.parameters?.severity || 'Major',
    };

    switch (check.check_type) {
        case 'checkInstance':
            return {
                ...base,
                result: entityIds.has(check.source) ? 'PASS' : 'FAIL',
                detail: entityIds.has(check.source)
                    ? `Entity ${check.source} found in ontology`
                    : `Entity ${check.source} MISSING from ontology`,
            };

        case 'Process-Parent':
        case 'Process-Activity':
        case 'Activity-Predecessor':
        case 'Dep-Parent':
        case 'checkAssignedTo':
        case 'checkActs':
        case 'checkAssumes':
        case 'checkDelegate': {
            const relType = {
                'Process-Parent': 'ComposedOf',
                'Process-Activity': 'Contains',
                'Activity-Predecessor': 'Next',
                'Dep-Parent': 'Includes',
                'checkAssignedTo': 'AssignedTo',
                'checkActs': 'Acts',
                'checkAssumes': 'Assumes',
                'checkDelegate': 'Delegate',
            }[check.check_type];
            const key = `${relType}:${check.source}:${check.target}`;
            const found = relationIndex.has(key);
            return {
                ...base,
                result: found ? 'PASS' : 'FAIL',
                detail: found
                    ? `${relType} relation ${check.source} → ${check.target} verified`
                    : `${relType} relation ${check.source} → ${check.target} NOT FOUND`,
            };
        }

        case 'Activity-Trace': {
            // Transitive closure check
            const nextRels = relationIndex.get('Next') || [];
            const reachable = computeReachable(check.source, nextRels);
            const found = reachable.has(check.target);
            return {
                ...base,
                result: found ? 'PASS' : 'FAIL',
                detail: found
                    ? `Transitive path from ${check.source} to ${check.target} verified`
                    : `No transitive path from ${check.source} to ${check.target}`,
            };
        }

        case 'Check-Separation': {
            const assumesRels = relationIndex.get('Assumes') || [];
            const users1 = assumesRels.filter(r => r.target === check.source).map(r => r.source);
            const users2 = assumesRels.filter(r => r.target === check.target).map(r => r.source);
            const overlap = users1.filter(u => users2.includes(u));
            return {
                ...base,
                result: overlap.length === 0 ? 'PASS' : 'FAIL',
                detail: overlap.length === 0
                    ? `SoD enforced: no user overlap between ${check.source} and ${check.target}`
                    : `SoD VIOLATION: users [${overlap.join(', ')}] access both ${check.source} and ${check.target}`,
            };
        }

        case 'Check-Object-Access': {
            const key = `CanAccess:${check.target}:${check.source}`;
            const policy = policyIndex.get(key);
            if (!policy) {
                return { ...base, result: 'INDETERMINATE', detail: `No access policy found for ${check.target} → ${check.source}` };
            }
            return {
                ...base,
                result: policy.allow_deny === check.parameters?.expected_result ? 'PASS' : 'FAIL',
                detail: `Access policy ${policy.allow_deny} for ${check.target} → ${check.source}`,
            };
        }

        case 'Check-Potestative':
        case 'Check-Jurisdiction':
        case 'Check-Threshold':
        case 'Check-Constraint':
        case 'Check-Reporting':
        case 'Check-Defeat':
        case 'Check-MultiJurisdiction':
        case 'Group-Assert':
            return {
                ...base,
                result: 'INDETERMINATE',
                detail: `Check ${check.check_type} requires additional context for evaluation`,
            };

        default:
            return { ...base, result: 'INDETERMINATE', detail: `Unknown check type: ${check.check_type}` };
    }
}

function computeReachable(start, nextRelations) {
    const reachable = new Set();
    const stack = [start];
    const visited = new Set();

    while (stack.length > 0) {
        const node = stack.pop();
        if (visited.has(node)) continue;
        visited.add(node);
        for (const rel of nextRelations) {
            if (rel.source === node) {
                reachable.add(rel.target);
                stack.push(rel.target);
            }
        }
    }

    return reachable;
}

// ─── MELCM Compliance State Evaluator ──────────────────────────────────────────

/**
 * Evaluates explicit MELCM compliance states for a model:
 * State(R_i, S) in { Unknown, Applicable, Satisfied, Violated, Waived }
 */
export function evaluateMELCMComplianceStates(model) {
    const relations = model.relations || [];
    const results = [];

    // Phase 1: Constitutive Applicability Mapping
    const countsAs = relations.filter(r => r.type === 'CountsAs');
    const applicableConcepts = new Set(countsAs.map(r => r.target));

    // Phase 2: Regulative State Verification
    const obligations = relations.filter(r => r.type === 'Obligation');
    const prohibitions = relations.filter(r => r.type === 'Prohibition');
    const exceptions = relations.filter(r => r.type === 'Exception');
    const overrides = relations.filter(r => r.type === 'Overrides');
    const mitigations = relations.filter(r => r.type === 'MitigationControl');

    // Evaluate Obligations
    for (const obl of obligations) {
        const isWaived = exceptions.some(e => e.source === obl.source || e.target === obl.target) ||
                         overrides.some(o => o.target === obl.source);
        if (isWaived) {
            results.push({ rule: obl, state: 'Waived', detail: 'Obligation waived by exception or override rule' });
            continue;
        }

        // Check if mandatory activity exists in process lifecycle
        const containsTarget = relations.some(r => r.type === 'Contains' && r.target === obl.target);
        if (containsTarget) {
            results.push({ rule: obl, state: 'Satisfied', detail: `Obligation ${obl.target} is present in process lifecycle` });
        } else {
            results.push({ rule: obl, state: 'Violated', detail: `Obligation ${obl.target} is missing from process lifecycle` });
        }
    }

    // Evaluate Prohibitions
    for (const pro of prohibitions) {
        const isWaived = exceptions.some(e => e.source === pro.source) ||
                         overrides.some(o => o.target === pro.source);
        if (isWaived) {
            results.push({ rule: pro, state: 'Waived', detail: 'Prohibition waived by statutory exception' });
            continue;
        }

        // Check for transitive reachability or mitigation controls
        const hasMitigation = mitigations.some(m => m.target === pro.source || m.source === pro.source);
        const reachesLeak = relations.some(r => r.type === 'Reaches' && r.source === pro.source && r.target === pro.parameters?.condition);

        if (reachesLeak && !hasMitigation) {
            results.push({ rule: pro, state: 'Violated', detail: `Prohibition breached: unmitigated reachability to ${pro.parameters?.condition}` });
        } else {
            results.push({ rule: pro, state: 'Satisfied', detail: 'Prohibition satisfied and contained' });
        }
    }

    return {
        phase1_applicability: Array.from(applicableConcepts),
        phase2_states: results
    };
}

export default { generateValidationChecks, executeChecks, evaluateMELCMComplianceStates };
