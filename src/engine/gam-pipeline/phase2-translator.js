/**
 * Phase 2: GAL Translation Engine
 * Transposes extracted patterns into formal Governance Analysis Language operators
 */

import { createRelation, createPolicy, createEntity } from '../gam-core/schema.js';

// ─── GAL Operator Builders ──────────────────────────────────────────────────────

export const GALOperators = {
    // ── Construction & Hierarchy ──────────────────────────────────────────────

    /** Process decomposition: ComposedOf(CompositeProcess, [AtomicProcess-1, ...]) */
    ComposedOf(compositeId, subProcessIds) {
        return subProcessIds.map(subId =>
            createRelation('ComposedOf', compositeId, subId)
        );
    },

    /** Activity containment: Contains(Process, Activity) */
    Contains(processId, activityId) {
        return createRelation('Contains', processId, activityId);
    },

    /** Hierarchical inclusion: Includes(Department/Role, SubRole) */
    Includes(parentId, childId) {
        return createRelation('Includes', parentId, childId);
    },

    /** Strict sequential flow: Next(Activity-1, Activity-2) */
    Next(predecessorId, successorId) {
        return createRelation('Next', predecessorId, successorId);
    },

    // ── Relational & Assignment ───────────────────────────────────────────────

    /** Role-activity binding: AssignedTo(Role, Activity) */
    AssignedTo(roleId, activityId) {
        return createRelation('AssignedTo', roleId, activityId);
    },

    /** User participates in process: Assumes(User, Process) */
    Assumes(userId, processId) {
        return createRelation('Assumes', userId, processId);
    },

    /** User fills a role: Acts(Role, User) */
    Acts(roleId, userId) {
        return createRelation('Acts', roleId, userId);
    },

    /** Segregation of duties: Separate((Process-1, Process-2), [...]) */
    Separate(process1Id, process2Id, additionalPairs = []) {
        const relations = [createRelation('Separate', process1Id, process2Id)];
        for (const [a, b] of additionalPairs) {
            relations.push(createRelation('Separate', a, b));
        }
        return relations;
    },

    /** Delegation of authority: Delegate(Role|User, Role|User, [Activity|Process]) */
    Delegate(sourceId, targetId, activityIds = []) {
        const targetStr = Array.isArray(activityIds) ? activityIds.join(',') : String(activityIds || '');
        return createRelation('Delegate', sourceId, targetId, {
            additional_target: targetStr || null,
        });
    },

    /** Role reaches zone or process */
    Reaches(roleId, zoneId) {
        return createRelation('Reaches', roleId, zoneId);
    },

    // ── Constitutive Rules ────────────────────────────────────────────────────

    /** Constitutive: X counts as Y in context C */
    CountsAs(sourceId, targetId, condition = null) {
        return createRelation('CountsAs', sourceId, targetId, { condition });
    },

    // ── Equivalence ───────────────────────────────────────────────────────────

    /** Cross-jurisdictional role equivalence */
    EquRole(role1Id, role2Id) {
        return createRelation('EquRole', role1Id, role2Id);
    },

    /** Activity equivalence */
    EquActivity(activity1Id, activity2Id) {
        return createRelation('EquActivity', activity1Id, activity2Id);
    },

    /** Process equivalence */
    EquProcess(process1Id, process2Id) {
        return createRelation('EquProcess', process1Id, process2Id);
    },

    // ── Technical Rules ───────────────────────────────────────────────────────

    /** Action requires condition (anankastic conditional) */
    RequiresCondition(actionId, conditionId) {
        return createRelation('RequiresCondition', actionId, conditionId);
    },

    /** Mandatory reporting */
    MustReport(subjectId, targetId, condition = null) {
        return createRelation('MustReport', subjectId, targetId, { condition });
    },

    /** Constraint attachment */
    HasConstraint(entityId, constraintId) {
        return createRelation('HasConstraint', entityId, constraintId);
    },

    /** Threshold attachment */
    HasThreshold(instrumentId, constraintId) {
        return createRelation('HasThreshold', instrumentId, constraintId);
    },

    /** Jurisdictional applicability */
    AppliesIn(ruleId, jurisdictionId) {
        return createRelation('AppliesIn', ruleId, jurisdictionId);
    },

    // ── Defeasibility ─────────────────────────────────────────────────────────

    /** Rebutting defeat */
    Rebuts(attackerId, targetId) {
        return createRelation('Rebuts', attackerId, targetId, {
            defeat_mechanism: 'Rebutting',
        });
    },

    /** Undercutting defeat */
    Undercuts(attackerId, targetId, condition = null) {
        return createRelation('Undercuts', attackerId, targetId, {
            defeat_mechanism: 'Undercutting',
            condition,
        });
    },

    /** Preference relation */
    Prefers(preferredId, overId, principle = null) {
        return createRelation('Prefers', preferredId, overId, {
            conflict_resolution_principle: principle,
        });
    },

    // ── LKRL Compliance Operators ──────────────────────────────────────────────

    /** Formal obligation: OBLIGATION(Subject, Action, Object, Constraint) */
    Obligation(subjectId, actionId, objectId, constraint = null) {
        return createRelation('Obligation', subjectId, actionId, {
            additional_target: objectId,
            condition: constraint,
            deontic_status: 'Obligatory'
        });
    },

    /** Formal prohibition: PROHIBITION(Subject, Action, Object, Exception) */
    Prohibition(subjectId, actionId, objectId, exception = null) {
        return createRelation('Prohibition', subjectId, actionId, {
            additional_target: objectId,
            condition: exception,
            deontic_status: 'Prohibited'
        });
    },

    /** Formal permission: PERMISSION(Subject, Action, Object) */
    Permission(subjectId, actionId, objectId) {
        return createRelation('Permission', subjectId, actionId, {
            additional_target: objectId,
            deontic_status: 'Permitted'
        });
    },

    /** Rule exception specification */
    Exception(ruleId, exceptionCondition) {
        return createRelation('Exception', ruleId, exceptionCondition);
    },

    /** Rule priority override: OVERRIDES(RuleA, RuleB, Rationale) */
    Overrides(ruleAId, ruleBId, rationale = null) {
        return createRelation('Overrides', ruleAId, ruleBId, {
            condition: rationale
        });
    },

    /** Risk profiling: RISK_PROFILE(System, RiskLevel) */
    RiskProfile(systemId, riskLevel) {
        return createRelation('RiskProfile', systemId, riskLevel);
    },

    /** Control mitigation: MITIGATION_CONTROL(Control, Type, TargetSystem) */
    MitigationControl(controlId, controlType, targetSystemId) {
        return createRelation('MitigationControl', controlId, targetSystemId, {
            condition: controlType
        });
    },

    /** Audit provenance: PROVENANCE(Rule, SourceRef, EffectiveDate) */
    Provenance(ruleId, sourceRef, effectiveDate = null) {
        return createRelation('Provenance', ruleId, sourceRef, {
            condition: effectiveDate
        });
    },

    /** Sanction trigger */
    TriggersSanction(ruleId, sanctionId, condition = null) {
        return createRelation('TriggersSanction', ruleId, sanctionId, { condition });
    },

    /** Acts on relation (e.g., activity acts on data object) */
    ActsOn(activityId, dataObjectId) {
        return createRelation('ActsOn', activityId, dataObjectId);
    },
};

// ─── Policy Operator Builders ───────────────────────────────────────────────────

export const PolicyOperators = {
    /** Activity access control: CanAssignTo(Allow|Deny, Activity, Role) — canonical source=Activity, target=Role */
    CanAssignTo(allowDeny, activityId, roleId, opts = {}) {
        return createPolicy('CanAssignTo', allowDeny, activityId, roleId, opts);
    },

    /** Process access control: CanAssume(Allow|Deny, Process, User) */
    CanAssume(allowDeny, processId, userId, opts = {}) {
        return createPolicy('CanAssume', allowDeny, userId, processId, opts);
    },

    /** Role assumption control: CanAct(Allow|Deny, User, Role) */
    CanAct(allowDeny, userId, roleId, opts = {}) {
        return createPolicy('CanAct', allowDeny, userId, roleId, opts);
    },

    /** Delegation authorization: CanDelegate(Allow|Deny, Role, Role, [Activity|Process]) */
    CanDelegate(allowDeny, sourceRole, targetRole, opts = {}) {
        return createPolicy('CanDelegate', allowDeny, sourceRole, targetRole, opts);
    },

    /** Data access control: CanAccess(Allow|Deny, DataObject, Role) */
    CanAccess(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanAccess', allowDeny, roleId, dataObjectId, opts);
    },

    /** Data collection control: CanCollect(Allow|Deny, DataObject, Role) */
    CanCollect(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanCollect', allowDeny, roleId, dataObjectId, opts);
    },

    /** Data use control */
    CanUse(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanUse', allowDeny, roleId, dataObjectId, opts);
    },

    /** Data disclosure control */
    CanDisclose(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanDisclose', allowDeny, roleId, dataObjectId, opts);
    },

    /** Data retention control */
    CanRetain(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanRetain', allowDeny, roleId, dataObjectId, opts);
    },

    /** Data transfer control */
    CanTransfer(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanTransfer', allowDeny, roleId, dataObjectId, opts);
    },

    /** Data deletion control */
    CanDelete(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanDelete', allowDeny, roleId, dataObjectId, opts);
    },

    /** General data processing control */
    CanProcess(allowDeny, dataObjectId, roleId, opts = {}) {
        return createPolicy('CanProcess', allowDeny, roleId, dataObjectId, opts);
    },
};

// ─── Pattern-to-GAL Translation ─────────────────────────────────────────────────

/**
 * Translate Phase 1 extracted patterns into GAL-JSON structures
 * @param {Array} patterns - Extracted patterns from Phase 1
 * @param {Map} entityIndex - Entity name → id mapping
 * @returns {{ relations: Array, policies: Array, newEntities: Array }}
 */
export function translatePatterns(patterns, entityIndex) {
    const relations = [];
    const policies = [];
    const newEntities = [];
    let entityCounter = entityIndex.size;

    const genId = (prefix) => `gen_${prefix}_${++entityCounter}`;

    for (const pattern of patterns) {
        if (pattern.type === 'RelationalPattern') {
            switch (pattern.subtype) {
                case 'assignment': {
                    const source = findOrCreateEntity(pattern.match, 'role', entityIndex, newEntities, genId);
                    const target = findOrCreateEntity(pattern.match, 'activity', entityIndex, newEntities, genId);
                    if (source && target) {
                        relations.push(GALOperators.AssignedTo(source, target));
                    }
                    break;
                }
                case 'delegation': {
                    const source = findOrCreateEntity(pattern.match, 'role', entityIndex, newEntities, genId);
                    const target = findOrCreateEntity(pattern.match, 'role', entityIndex, newEntities, genId);
                    if (source && target) {
                        relations.push(GALOperators.Delegate(source, target));
                    }
                    break;
                }
                case 'separation': {
                    const id1 = genId('process');
                    const id2 = genId('process');
                    newEntities.push(createEntity(id1, 'Process', 'SoD Process 1', {
                        description: pattern.source,
                    }));
                    newEntities.push(createEntity(id2, 'Process', 'SoD Process 2', {
                        description: pattern.source,
                    }));
                    relations.push(...GALOperators.Separate(id1, id2));
                    break;
                }
                case 'sequence': {
                    const pred = findOrCreateEntity(pattern.match, 'activity', entityIndex, newEntities, genId);
                    const succ = findOrCreateEntity(pattern.match, 'activity', entityIndex, newEntities, genId);
                    if (pred && succ) {
                        relations.push(GALOperators.Next(pred, succ));
                    }
                    break;
                }
                case 'containment': {
                    const container = findOrCreateEntity(pattern.match, 'process', entityIndex, newEntities, genId);
                    const contained = findOrCreateEntity(pattern.match, 'activity', entityIndex, newEntities, genId);
                    if (container && contained) {
                        relations.push(GALOperators.Contains(container, contained));
                    }
                    break;
                }
                case 'countsAs': {
                    const x = findOrCreateEntity(pattern.match, 'entity', entityIndex, newEntities, genId);
                    const y = findOrCreateEntity(pattern.match, 'entity', entityIndex, newEntities, genId);
                    if (x && y) {
                        relations.push(GALOperators.CountsAs(x, y));
                    }
                    break;
                }
                case 'reporting': {
                    const reporter = findOrCreateEntity(pattern.match, 'role', entityIndex, newEntities, genId);
                    const reportee = findOrCreateEntity(pattern.match, 'entity', entityIndex, newEntities, genId);
                    if (reporter && reportee) {
                        relations.push(GALOperators.MustReport(reporter, reportee));
                    }
                    break;
                }
            }
        }

        // Generate policies from deontic modality
        if (pattern.deontic) {
            const deonticOpts = { deontic_status: pattern.deontic };
            if (pattern.deontic === 'Prohibited') {
                // Generate a Deny policy
                const source = genId('role');
                const target = genId('activity');
                newEntities.push(createEntity(source, 'DepartmentRole', 'Subject', {
                    description: pattern.source,
                }));
                newEntities.push(createEntity(target, 'Activity', 'Prohibited Activity', {
                    description: pattern.source,
                }));
                policies.push(PolicyOperators.CanAssignTo('Deny', target, source, deonticOpts));
            }
        }
    }

    return { relations, policies, newEntities };
}

function findOrCreateEntity(text, type, entityIndex, newEntities, genId) {
    // Try to find existing entity reference
    for (const [name, id] of entityIndex) {
        if (text.toLowerCase().includes(name)) return id;
    }
    // Create new placeholder entity
    const id = genId(type);
    const entityType = {
        role: 'DepartmentRole',
        activity: 'Activity',
        process: 'Process',
        entity: 'LegalEntity',
    }[type] || 'Activity';
    newEntities.push(createEntity(id, entityType, `Extracted ${type}`, {
        description: text.substring(0, 200),
    }));
    entityIndex.set(id.toLowerCase(), id);
    return id;
}

export default { GALOperators, PolicyOperators, translatePatterns };
