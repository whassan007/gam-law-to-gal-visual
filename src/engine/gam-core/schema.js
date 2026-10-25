/**
 * GAL-JSON Schema — Full Governance Analysis Language Schema Definition
 * Implements the complete GEM (Governance Extraction Model) specification
 */

// ─── Enumerations ──────────────────────────────────────────────────────────────

export const EntityTypes = [
    'Role', 'User', 'Activity', 'Process', 'DepartmentRole', 'LegalEntity',
    'DataObject', 'Vehicle', 'InfrastructureZone', 'LegalInstrument',
    'Constraint', 'Value', 'Factor', 'Rule', 'Sanction'
];

export const RelationTypes = [
    'Includes', 'Acts', 'AssignedTo', 'Contains', 'Next', 'Assumes',
    'ComposedOf', 'Separate', 'Delegate', 'CountsAs', 'EquRole',
    'EquActivity', 'EquProcess', 'ActsOn', 'HasConstraint',
    'RequiresCondition', 'MustReport', 'AppliesIn', 'HasThreshold',
    'Undercuts', 'Rebuts', 'Prefers', 'TriggersSanction',
    'Obligation', 'Prohibition', 'Permission', 'Exception', 'Overrides',
    'RiskProfile', 'MitigationControl', 'Provenance', 'Reaches'
];

export const PolicyTypes = [
    'CanAssignTo', 'CanAssume', 'CanAct', 'CanReach', 'CanDelegate', 'CanAccess',
    'CanCollect', 'CanUse', 'CanDisclose', 'CanRetain', 'CanTransfer',
    'CanDelete', 'CanProcess'
];

export const DeonticStatuses = ['Obligatory', 'Permitted', 'Prohibited'];

export const HohfeldianModalities = [
    'Duty', 'Claim-Right', 'Privilege', 'No-Right',
    'Power', 'Liability', 'Immunity', 'Disability', 'None'
];

export const PowerSubTypes = [
    'Action-Power', 'Enabling-Power', 'Potestative-Right',
    'Declarative-Power', 'None'
];

export const ConflictResolutionPrinciples = [
    'LexSpecialis', 'LexPosterior', 'LexSuperior',
    'Value-Preference', 'JurisdictionalPrimacy'
];

export const DefeatMechanisms = ['Rebutting', 'Undercutting', 'Defeater'];

export const CheckTypes = [
    'Process-Parent', 'Process-Activity', 'Dep-Parent', 'checkInstance',
    'checkActs', 'checkDelegate', 'Activity-Predecessor', 'Activity-Trace',
    'Activity-Process-Pred', 'Activity-Process-Trace', 'checkAssignedTo',
    'checkAssumes', 'Check-Separation', 'Check-Object-Access',
    'Check-Constraint', 'Check-Reporting', 'Check-Potestative',
    'Check-Jurisdiction', 'Check-Threshold', 'Check-Defeat',
    'Check-MultiJurisdiction', 'Group-Assert',
    'Check-Obligation', 'Check-Prohibition', 'Check-Exception', 'Check-Mitigation'
];

export const Quantifiers = ['ALL', 'SOME', 'NONE'];
export const Severities = ['Critical', 'Major', 'Minor'];
export const ConsentTypes = ['Express', 'Implied', 'Opt-In', 'Opt-Out'];
export const AllowDeny = ['Allow', 'Deny'];

export const ModelTypes = ['Law_Model', 'Enterprise_Model'];

export const Countries = [
    'CA', 'US', 'UK', 'DE', 'FR', 'IE', 'EU', 'CN', 'JP', 'SG', 'KR', 'AE', 'UNECE', 'OTHER'
];

export const JurisdictionLevels = [
    'Federal', 'State', 'Provincial', 'Municipal', 'Supranational', 'Emirate'
];

export const Domains = ['Privacy', 'Traffic', 'AV', 'Financial', 'All'];

export const RuleTypes = ['Prescriptive', 'Constitutive', 'Technical', 'Teleological'];

export const InferentialStrengths = ['Strict', 'Defeasible'];

// ─── Schema Validators ─────────────────────────────────────────────────────────

function isEnum(value, allowed) {
    return allowed.includes(value);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isISODate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
}

export function validateEntity(entity) {
    const errors = [];
    if (!isNonEmptyString(entity.id)) errors.push('Entity must have a non-empty id');
    if (!isEnum(entity.type, EntityTypes)) errors.push(`Invalid entity type: ${entity.type}`);
    if (entity.name !== undefined && entity.name !== null && !isNonEmptyString(entity.name)) {
        errors.push('Entity name if provided must be a non-empty string');
    }
    return { valid: errors.length === 0, errors };
}

export function validateRelation(relation, entityIds) {
    const errors = [];
    if (!isEnum(relation.type, RelationTypes)) errors.push(`Invalid relation type: ${relation.type}`);
    if (!isNonEmptyString(relation.source)) errors.push('Relation must have a source');
    if (!isNonEmptyString(relation.target)) errors.push('Relation must have a target');
    if (entityIds) {
        if (!entityIds.has(relation.source)) errors.push(`Unknown source entity: ${relation.source}`);
        if (!entityIds.has(relation.target) && !['Provenance', 'Exception', 'RiskProfile'].includes(relation.type)) errors.push(`Unknown target entity: ${relation.target}`);
    }
    if (relation.parameters) {
        if (relation.parameters.conflict_resolution_principle &&
            !isEnum(relation.parameters.conflict_resolution_principle, ConflictResolutionPrinciples)) {
            errors.push(`Invalid conflict resolution principle: ${relation.parameters.conflict_resolution_principle}`);
        }
        if (relation.parameters.defeat_mechanism &&
            !isEnum(relation.parameters.defeat_mechanism, DefeatMechanisms)) {
            errors.push(`Invalid defeat mechanism: ${relation.parameters.defeat_mechanism}`);
        }
    }
    return { valid: errors.length === 0, errors };
}

export function validatePolicy(policy, entityIds) {
    const errors = [];
    if (!isEnum(policy.type, PolicyTypes)) errors.push(`Invalid policy type: ${policy.type}`);
    const polarity = policy.modality || policy.allow_deny;
    if (!isEnum(polarity, AllowDeny)) errors.push(`Invalid modality/allow_deny: ${polarity}`);
    if (policy.deontic_status && !isEnum(policy.deontic_status, DeonticStatuses)) errors.push(`Invalid deontic_status: ${policy.deontic_status}`);
    if (policy.hohfeldian_modality && !isEnum(policy.hohfeldian_modality, HohfeldianModalities)) errors.push(`Invalid hohfeldian_modality: ${policy.hohfeldian_modality}`);
    if (policy.power_subtype && !isEnum(policy.power_subtype, PowerSubTypes)) errors.push(`Invalid power_subtype: ${policy.power_subtype}`);
    if (!isNonEmptyString(policy.source)) errors.push('Policy must have a source');
    if (!isNonEmptyString(policy.target)) errors.push('Policy must have a target');
    if (entityIds) {
        if (!entityIds.has(policy.source)) errors.push(`Unknown source entity: ${policy.source}`);
        if (!entityIds.has(policy.target)) errors.push(`Unknown target entity: ${policy.target}`);
    }
    return { valid: errors.length === 0, errors };
}

export function validateCheck(check) {
    const errors = [];
    if (!isEnum(check.check_type, CheckTypes)) errors.push(`Invalid check_type: ${check.check_type}`);
    if (!isNonEmptyString(check.label)) errors.push('Check must have a label');
    if (!isEnum(check.quantifier, Quantifiers)) errors.push(`Invalid quantifier: ${check.quantifier}`);
    if (!isNonEmptyString(check.source)) errors.push('Check must have a source');
    if (!isNonEmptyString(check.target)) errors.push('Check must have a target');
    return { valid: errors.length === 0, errors };
}

export function validateModel(model) {
    const errors = [];

    // Model type
    if (!isEnum(model.model_type, ModelTypes)) errors.push(`Invalid model_type: ${model.model_type}`);

    // Context
    if (!isNonEmptyString(model.context)) errors.push('Model must have a context');

    // Jurisdiction
    if (model.jurisdiction) {
        if (!isEnum(model.jurisdiction.country, Countries)) errors.push(`Invalid country: ${model.jurisdiction.country}`);
        if (!isEnum(model.jurisdiction.level, JurisdictionLevels)) errors.push(`Invalid jurisdiction level: ${model.jurisdiction.level}`);
    }

    // Effective date
    if (model.effective_date && !isISODate(model.effective_date)) {
        errors.push('Invalid effective_date format');
    }

    // Domains
    if (model.domains) {
        for (const d of model.domains) {
            if (!isEnum(d, Domains)) errors.push(`Invalid domain: ${d}`);
        }
    }

    // Collect entity IDs for cross-reference
    const entityIds = new Set((model.entities || []).map(e => e.id));

    // Entities
    for (const entity of (model.entities || [])) {
        const r = validateEntity(entity);
        if (!r.valid) errors.push(...r.errors.map(e => `Entity[${entity.id}]: ${e}`));
    }

    // Relations
    for (const rel of (model.relations || [])) {
        const r = validateRelation(rel, entityIds);
        if (!r.valid) errors.push(...r.errors.map(e => `Relation[${rel.type}]: ${e}`));
    }

    // Policies
    for (const pol of (model.policies || [])) {
        const r = validatePolicy(pol, entityIds);
        if (!r.valid) errors.push(...r.errors.map(e => `Policy[${pol.type}]: ${e}`));
    }

    // Validation checks (only for Law_Model)
    if (model.model_type === 'Law_Model') {
        for (const check of (model.validation_checks || [])) {
            const r = validateCheck(check);
            if (!r.valid) errors.push(...r.errors.map(e => `Check[${check.label}]: ${e}`));
        }
    }

    return { valid: errors.length === 0, errors, entityIds };
}

// ─── Factory Functions ──────────────────────────────────────────────────────────

export function createEntity(id, type, name, opts = {}) {
    return {
        id, type, name,
        subtype: opts.subtype || null,
        jurisdiction: opts.jurisdiction || null,
        description: opts.description || null,
    };
}

export function createRelation(type, source, target, params = {}) {
    return {
        type, source, target,
        parameters: {
            additional_target: params.additional_target || null,
            conflict_resolution_principle: params.conflict_resolution_principle || null,
            defeat_mechanism: params.defeat_mechanism || null,
            jurisdiction: params.jurisdiction || null,
            condition: params.condition || null,
            temporal_persistence: params.temporal_persistence || null,
            deontic_status: params.deontic_status || null,
        }
    };
}

export function createPolicy(type, allowDeny, source, target, opts = {}) {
    return {
        type,
        modality: allowDeny,
        allow_deny: allowDeny,
        deontic_status: opts.deontic_status || (allowDeny === 'Deny' ? 'Prohibited' : 'Permitted'),
        hohfeldian_modality: opts.hohfeldian_modality || (allowDeny === 'Deny' ? 'No-Right' : 'Privilege'),
        power_subtype: opts.power_subtype || 'None',
        source, target,
        parameters: {
            activity_or_process: opts.activity_or_process || null,
            jurisdiction: opts.jurisdiction || null,
            condition: opts.condition || null,
            consent_type: opts.consent_type || null,
            legal_basis: opts.legal_basis || null,
        }
    };
}

export function createCheck(checkType, label, quantifier, source, target, params = {}) {
    return {
        check_type: checkType,
        label, quantifier, source, target,
        parameters: {
            additional_target: params.additional_target || null,
            jurisdiction: params.jurisdiction || null,
            severity: params.severity || 'Major',
            expected_result: params.expected_result || null,
            description: params.description || null,
        }
    };
}

export function createModel(modelType, context, jurisdiction, opts = {}) {
    return {
        model_type: modelType,
        context,
        jurisdiction: {
            country: jurisdiction.country || 'OTHER',
            level: jurisdiction.level || 'Federal',
            name: jurisdiction.name || '',
        },
        effective_date: opts.effective_date || new Date().toISOString().split('T')[0],
        domains: opts.domains || ['All'],
        entities: opts.entities || [],
        relations: opts.relations || [],
        policies: opts.policies || [],
        theory_construction: opts.theory_construction || {
            cases: [],
            factors: [],
            value_preferences: [],
            rule_preferences: [],
        },
        validation_checks: opts.validation_checks || [],
    };
}

// ─── Model Merging ──────────────────────────────────────────────────────────────

export function mergeModels(modelA, modelB) {
    const entityIds = new Set();
    const entities = [];
    for (const e of [...(modelA.entities || []), ...(modelB.entities || [])]) {
        if (!entityIds.has(e.id)) {
            entityIds.add(e.id);
            entities.push(e);
        }
    }
    return {
        model_type: modelA.model_type,
        context: `${modelA.context} + ${modelB.context}`,
        jurisdiction: modelA.jurisdiction,
        effective_date: modelA.effective_date,
        domains: [...new Set([...(modelA.domains || []), ...(modelB.domains || [])])],
        entities,
        relations: [...(modelA.relations || []), ...(modelB.relations || [])],
        policies: [...(modelA.policies || []), ...(modelB.policies || [])],
        theory_construction: {
            cases: [...(modelA.theory_construction?.cases || []), ...(modelB.theory_construction?.cases || [])],
            factors: [...(modelA.theory_construction?.factors || []), ...(modelB.theory_construction?.factors || [])],
            value_preferences: [...(modelA.theory_construction?.value_preferences || []), ...(modelB.theory_construction?.value_preferences || [])],
            rule_preferences: [...(modelA.theory_construction?.rule_preferences || []), ...(modelB.theory_construction?.rule_preferences || [])],
        },
        validation_checks: [...(modelA.validation_checks || []), ...(modelB.validation_checks || [])],
    };
}
