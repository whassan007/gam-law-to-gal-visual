import { describe, expect, it } from 'vitest';
import type { EnterpriseComparisonCase, GalEntity, GalJsonModel, GalPolicy, GalRelation, LawMetadata, LawProvision } from '../src/types/contracts';
import { GamModel } from '../src/engine/gam-core/model.js';
import { validateModel } from '../src/engine/gam-core/schema.js';
import { ConsistencyChecker } from '../src/engine/gam-core/consistency-checker.js';
import { OntologyChecker } from '../src/engine/gam-core/ontology-checker.js';
import { emitAlloy } from '../src/engine/gam-core/alloy-emitter.js';
import { detectPolarity, extractPatterns } from '../src/engine/gam-pipeline/phase1-extractor.js';
import { translatePatterns } from '../src/engine/gam-pipeline/phase2-translator.js';
import { readLawToGAM } from '../src/engine/gam-pipeline/read-law.js';
import { CANONICAL_DIRECTIONS, normalizeEdgeDirections, runEnterpriseComparison, segmentLegalText, translateCustomPassage, translateLawProvision, verifyEdgeDirections } from '../src/engine/gam-adapter';

const entity = (id: string, type: GalEntity['type']): GalEntity => ({ id, type });
const relation = (type: GalRelation['type'], source: string, target: string): GalRelation => ({ type, source, target });
const policy = (type: GalPolicy['type'], modality: GalPolicy['modality'], source: string, target: string): GalPolicy => ({ type, modality, source, target });
function model(overrides: Partial<GalJsonModel> = {}): GalJsonModel {
  return { model_type: 'Law_Model', context: 'Section 14 formal verification fixture',
    jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' }, effective_date: '2026-01-01',
    domains: ['Privacy'], entities: [], relations: [], policies: [], ...overrides };
}
function provision(gal: GalJsonModel, text: string): LawProvision {
  return { id: 'provision', section: 'verification', title: gal.context, originalText: text, language: 'en',
    sourceUrl: 'https://laws-lois.justice.gc.ca/eng/acts/P-8.6/', versionDate: gal.effective_date,
    readiness: 'human-reviewed', clauses: segmentLegalText(text).map(c => ({ ...c, supported: true, unmappedReason: undefined })), concepts: [], curatedGalModel: gal };
}
const law = { id: 'verification-law' } as LawMetadata; // Adapter consumes only the law identifier.

// Bounded GAL encodings of actual statutory clauses, not claims of complete legal coverage.
const statutes = [
  { name: 'PIPEDA Schedule 1, 4.3: knowledge and consent for collection', text: 'The knowledge and consent of the individual are required for the collection, use, or disclosure of personal information, except where inappropriate.',
    gal: model({ context: 'PIPEDA Schedule 1, 4.3', entities: [entity('Organization', 'Role'), entity('CollectPersonalInformation', 'Activity')],
      policies: [{ ...policy('CanAssignTo', 'Allow', 'CollectPersonalInformation', 'Organization'), parameters: { condition: 'knowledge and consent of the individual, except where inappropriate' } }] }) },
  { name: 'GDPR Article 9(1): special-category processing prohibition', text: 'Processing of personal data revealing racial or ethnic origin shall be prohibited.',
    gal: model({ context: 'GDPR Article 9(1)', jurisdiction: { country: 'EU', level: 'Supranational', name: 'European Union' },
      entities: [entity('Controller', 'Role'), entity('ProcessSpecialCategoryData', 'Activity')],
      policies: [policy('CanAssignTo', 'Deny', 'ProcessSpecialCategoryData', 'Controller')] }) },
];

describe('Section 14 Test 4 — real GAL-JSON translation and validation', () => {
  it.each(statutes)('$name runs the actual validators and Alloy emitter', ({ gal, text }) => {
    expect(validateModel(gal)).toMatchObject({ valid: true, errors: [] });
    expect(new ConsistencyChecker().check(gal, {})).toMatchObject({ consistent: true, violations: [] });
    expect(new OntologyChecker().check(gal, {})).toMatchObject({ satisfied: true, violations: [] });
    const before = structuredClone(gal);
    const translated = translateLawProvision(law, provision(gal, text));
    expect(gal).toEqual(before);
    expect(translated.galModel.model_type).toBe('Law_Model');
    expect(translated.validation).toMatchObject({ structuralValid: true, internalLawConsistent: true,
      relationDirectionsValid: true, modalityConsistent: true, unresolvedReferences: [], alloySolverExecuted: false });
    expect(translated.validation.counts.policies).toBe(gal.policies.length);
    expect(translated.validation.alloySpecification).toBe(emitAlloy(translated.galModel, {}));
    expect(translated.validation.alloySpecification).toContain('open gam_core');
    expect(translated.validation.alloySpecification).toContain('check GAM_Con { Con }');
    const p = gal.policies[0];
    expect(translated.validation.alloySpecification).toContain(`${p.target}.${p.modality === 'Deny' ? 'mustNotDo' : 'mayDo'} = ${p.source}`);
    expect(translated.graph.edges).toContainEqual(expect.objectContaining({ type: p.type, source: p.source, target: p.target, modality: p.modality }));
    expect(translated.events.at(-1)).toMatchObject({ stage: 'validate', payload: translated.validation });
  });

  it('reports malformed references and invalid policy polarity instead of declaring valid', () => {
    const invalid = structuredClone(statutes[1].gal);
    invalid.policies[0].source = 'MissingActivity';
    invalid.policies[0].modality = 'Permit' as GalPolicy['modality'];
    const result = translateLawProvision(law, provision(invalid, statutes[1].text));
    expect(result.validation.structuralValid).toBe(false);
    expect(result.validation.schemaErrors.join('\n')).toMatch(/Invalid modality/);
    expect(result.validation.unresolvedReferences).toContain('MissingActivity');
    expect(result.validation.relationDirectionsValid).toBe(false);
  });
});

const prohibitions = [
  'The organization shall not disclose personal information.',
  'The organization must not disclose personal information.',
  'The organization is prohibited from disclosing personal information.',
  'No person shall disclose personal information.',
];
describe('Section 14 Test 5 — prohibition polarity survives GAL translation', () => {
  it.each(prohibitions)('%s', text => {
    expect(detectPolarity(text)).toBe('Deny');
    expect(detectPolarity(text.toUpperCase())).toBe('Deny');
    const raw = readLawToGAM(text, { country: 'CA', level: 'Federal', name: 'Canada' }) as GalJsonModel;
    const formal = translatePatterns([{ type: 'ClassPattern', subtype: 'prohibition', source: text, deontic: 'Prohibited' }], new Map());
    expect(formal.policies.length).toBeGreaterThan(0);
    expect(formal.policies.every((p: GalPolicy) => p.modality === 'Deny')).toBe(true);
    const translated = translateCustomPassage(text);
    for (const gal of [raw, translated.galModel]) {
      // The current extractor has no class pattern for the bare universal subject.
      // Check that absence explicitly; never mistake it for a translated permission.
      if (!text.startsWith('No person')) expect(gal.policies.length).toBeGreaterThan(0);
      else if (gal.policies.length === 0) expect(translated.validation.unmappedClauses).toContainEqual(expect.objectContaining({ text }));
      expect(gal.policies.every((p: GalPolicy) => p.modality === 'Deny')).toBe(true);
      expect(gal.policies.some((p: GalPolicy) => p.modality === 'Allow' && !p.parameters?.condition)).toBe(false);
      expect(validateModel(gal).valid).toBe(true);
    }
    expect(translated.clauses.every(c => c.polarity === 'Deny')).toBe(true);
    expect(translated.validation.counts.allowPolicies).toBe(0);
    if (translated.galModel.policies.length) expect(translated.validation.counts.denyPolicies).toBeGreaterThan(0);
    else {
      expect(translated.readiness).toBe('unverified-draft');
      expect(translated.validation.sourceCoveragePercent).toBe(0);
      expect(translated.validation.unmappedClauses).toContainEqual(expect.objectContaining({ text }));
    }
    expect(translated.graph.edges.filter(e => e.kind === 'policy').every(e => e.polarity === '-')).toBe(true);
  });
  it('distinguishes affirmative permission and preserves separate clause polarity', () => {
    expect(detectPolarity('The organization may disclose personal information.')).toBe('Allow');
    expect(segmentLegalText('The organization may collect data; the organization shall not disclose data.').map(c => c.polarity)).toEqual(['Allow', 'Deny']);
  });
  it.each([
    'The organization may not disclose personal information.',
    'The organization can not disclose personal information.',
    'The organization is not permitted to disclose personal information.',
    'The organization is not allowed to disclose personal information.',
  ])('keeps extractor and clause deontic labels aligned for %s', text => {
    const extracted = extractPatterns(text).patterns;
    expect(extracted.some(p => p.deontic === 'Prohibited')).toBe(true);
    expect(extracted.some(p => p.deontic === 'Permitted')).toBe(false);
    expect(segmentLegalText(text).every(c => c.polarity === 'Deny' && c.deonticModality === 'Prohibited')).toBe(true);
  });
});

// Explicit expected external endpoint order; independent of the implementation table.
const directions = [
  ['relation', 'AssignedTo', 'R', 'A', 'Role', 'Activity', 'RAp', 'R', 'A'],
  ['relation', 'Acts', 'R', 'U', 'Role', 'User', 'RUp', 'R', 'U'],
  ['policy', 'CanAssignTo', 'A', 'R', 'Activity', 'Role', 'RAp', 'R', 'A'],
  ['policy', 'CanAct', 'U', 'R', 'User', 'Role', 'RUp', 'R', 'U'],
  ['relation', 'Assumes', 'U', 'P', 'User', 'Process', 'UPp', 'U', 'P'],
  ['policy', 'CanAssume', 'U', 'P', 'User', 'Process', 'UPp', 'U', 'P'],
  ['relation', 'Reaches', 'R', 'P', 'Role', 'Process', 'RPp', 'R', 'P'],
  ['policy', 'CanReach', 'R', 'P', 'Role', 'Process', 'RPp', 'R', 'P'],
  ['relation', 'ComposedOf', 'P', 'Q', 'Process', 'Process', 'PP', 'P', 'Q'],
  ['relation', 'Contains', 'P', 'A', 'Process', 'Activity', 'PA', 'P', 'A'],
  ['relation', 'Includes', 'R', 'T', 'Role', 'Role', 'RR', 'R', 'T'],
  ['relation', 'Next', 'A', 'B', 'Activity', 'Activity', 'S', 'A', 'B'],
  ['relation', 'Separate', 'P', 'Q', 'Process', 'Process', 'X', 'P', 'Q'],
] as const;
const directionEntities = [entity('P', 'Process'), entity('Q', 'Process'), entity('A', 'Activity'), entity('B', 'Activity'), entity('R', 'Role'), entity('T', 'Role'), entity('U', 'User')];
describe('Section 14 Test 6 — canonical external directions and internal ingestion', () => {
  it.each(directions)('%s %s', (kind, type, source, target, sourceSort, targetSort, field, internalSource, internalTarget) => {
    const gal = model({ entities: directionEntities,
      relations: kind === 'relation' ? [relation(type as GalRelation['type'], source, target)] : [],
      policies: kind === 'policy' ? [policy(type as GalPolicy['type'], 'Allow', source, target)] : [] });
    expect(CANONICAL_DIRECTIONS[kind][type].slice(0, 2)).toEqual([sourceSort, targetSort]);
    expect(verifyEdgeDirections(gal)).toEqual({ valid: true, warnings: [] });
    const M = new GamModel(gal);
    expect(M[field].get(internalSource)?.has(internalTarget)).toBe(true);
    expect(M[field].get(internalTarget)?.has(internalSource) ?? false).toBe(type === 'Separate');
    const translated = translateLawProvision(law, provision(gal, 'Direction fixture.'));
    expect(translated.graph.edges[0]).toMatchObject({ type, source, target });
    if (sourceSort !== targetSort) {
      const reversed = structuredClone(gal);
      const edge = kind === 'relation' ? reversed.relations[0] : reversed.policies[0];
      [edge.source, edge.target] = [edge.target, edge.source];
      const before = structuredClone(reversed);
      expect(verifyEdgeDirections(reversed).warnings.join(' ')).toContain('reversed edge');
      expect(translateLawProvision(law, provision(reversed, 'Reversed fixture.')).validation.relationDirectionsValid).toBe(false);
      const normalized = normalizeEdgeDirections(reversed);
      expect(verifyEdgeDirections(normalized).valid).toBe(true);
      expect((kind === 'relation' ? normalized.relations : normalized.policies)[0]).toMatchObject({ source, target });
      expect(reversed).toEqual(before);
    } else {
      // Equal sorts cannot prove semantic reversal; normalization must preserve declaration order.
      expect(normalizeEdgeDirections(gal)).toEqual(gal);
    }
  });
  it.each(['CanAssignTo', 'CanAct', 'CanAssume', 'CanReach'] as const)('%s Deny populates only the negative relation', type => {
    const row = directions.find(d => d[1] === type)!;
    const M = new GamModel(model({ entities: directionEntities, policies: [policy(type, 'Deny', row[2], row[3])] }));
    const negative = { CanAssignTo: M.RAm, CanAct: M.RUm, CanAssume: M.UPm, CanReach: M.RPm }[type];
    expect(negative.get(row[7])?.has(row[8])).toBe(true);
    expect(M[row[6]].size).toBe(0);
  });
});

describe('Section 14 Test 11 — a law alone yields no organizational compliance verdict', () => {
  it.each(statutes)('$name reports law validation with an explicit limitation', ({ gal, text }) => {
    for (const result of [translateLawProvision(law, provision(gal, text)), translateCustomPassage(text)]) {
      expect(result.galModel.model_type).toBe('Law_Model');
      expect(result.validation.alloySolverExecuted).toBe(false);
      expect(result.validation.complianceNotice).toContain('Law-only consistency does not establish organizational compliance');
      for (const object of [result, result.validation]) {
        for (const key of ['compliant', 'isCompliant', 'complianceVerdict', 'organizationalCompliance', 'enterpriseVerdict']) expect(object).not.toHaveProperty(key);
      }
      expect(result.events.filter(e => e.stage === 'validate').map(e => e.payload)).toEqual([result.validation]);
    }
  });
});

function comparison(lawModel: GalJsonModel, asBuilt: GalJsonModel, repaired: GalJsonModel): EnterpriseComparisonCase {
  return { id: 'thesis-fixture', title: 'Formal closure example', thesisReference: 'Thesis chapters 7–8', description: 'Bounded reconstruction of the stated formal requirement',
    lawModel, asBuiltEnterpriseModel: asBuilt, remediatedEnterpriseModel: repaired, explanation: 'Check closure witnesses and repair.', sufficiencyNote: 'Consistency alone is insufficient.' };
}

describe('Section 14 Test 12 — thesis formal consistency and closure examples', () => {
  it('Ch.7 Ex.2: AdminAssistant1 conflicts across PrivDiv and FinAdminAssistants', () => {
    const legal = model({ entities: [entity('PrivDiv', 'Role'), entity('FinAdminAssistants', 'Role'), entity('AdminAssistant1', 'User'), entity('ReadFinancialData', 'Activity')],
      policies: [policy('CanAssignTo', 'Deny', 'ReadFinancialData', 'PrivDiv')] });
    const enterprise = model({ model_type: 'Enterprise_Model', relations: [relation('Acts', 'PrivDiv', 'AdminAssistant1'), relation('Acts', 'FinAdminAssistants', 'AdminAssistant1'), relation('AssignedTo', 'FinAdminAssistants', 'ReadFinancialData')] });
    const repaired = structuredClone(enterprise);
    repaired.relations = repaired.relations.filter(r => r.type !== 'AssignedTo');
    const fixture = comparison(legal, enterprise, repaired);
    const result = runEnterpriseComparison(fixture);
    expect(result.consistent).toBe(false);
    const witness = result.violations.find((v: { type: string; grantedVia?: string[]; prohibitedVia?: string[] }) => v.type === 'ACTIVITY_CONFLICT');
    expect(witness).toMatchObject({ user: 'AdminAssistant1', activity: 'ReadFinancialData' });
    expect(witness?.grantedVia?.join(' ')).toContain('FinAdminAssistants');
    expect(witness?.prohibitedVia?.join(' ')).toContain('PrivDiv');
    expect(result.minimalConflict.length).toBeGreaterThan(0);
    expect(result.violations.some((v: { type: string }) => v.type === 'ENGINE_DISAGREEMENT')).toBe(false);
    expect(new ConsistencyChecker().check(legal, {}).consistent).toBe(true);
    expect(new ConsistencyChecker().check({}, enterprise).consistent).toBe(true);
    expect(runEnterpriseComparison(fixture, true)).toMatchObject({ consistent: true, violations: [] });
  });

  it('Ch.7 Ex.1b: Con holds while required containment is missing', () => {
    const legal = model({ entities: [entity('InformationHandling', 'Process'), entity('ReviewConsent', 'Activity')],
      ontologyRequirements: [{ id: 'required-consent-review', process: 'InformationHandling', activity: 'ReviewConsent', rationale: 'Required review must exist in the process ontology.' }] });
    const enterprise = model({ model_type: 'Enterprise_Model' });
    const repaired = model({ model_type: 'Enterprise_Model', entities: [entity('ConsentSubprocess', 'Process')],
      relations: [relation('ComposedOf', 'InformationHandling', 'ConsentSubprocess'), relation('Contains', 'ConsentSubprocess', 'ReviewConsent')] });
    const fixture = comparison(legal, enterprise, repaired);
    const result = runEnterpriseComparison(fixture);
    expect(result).toMatchObject({ consistent: true, violations: [] });
    expect(result.ontologyViolations).toContainEqual(expect.objectContaining({ type: 'ONTOLOGY_GAP', process: 'InformationHandling', activity: 'ReviewConsent' }));
    expect(runEnterpriseComparison(fixture, true).ontology.violations).toEqual([]);
    expect(result.complianceNotice).toContain('necessary but not sufficient');
  });

  it('Ch.7 Ex.4: SaveInfo → DisposeData requires a transitive scenario path', () => {
    const legal = model({ entities: [entity('SaveInfo', 'Activity'), entity('ArchiveInfo', 'Activity'), entity('DisposeData', 'Activity')],
      scenarioRequirements: [{ id: 'save-before-disposal', kind: 'precedence', from: 'SaveInfo', to: 'DisposeData', rationale: 'Disposal follows saving.' }] });
    const enterprise = model({ model_type: 'Enterprise_Model', relations: [relation('Next', 'DisposeData', 'SaveInfo')] });
    const repaired = model({ model_type: 'Enterprise_Model', relations: [relation('Next', 'SaveInfo', 'ArchiveInfo'), relation('Next', 'ArchiveInfo', 'DisposeData')] });
    const fixture = comparison(legal, enterprise, repaired);
    expect(runEnterpriseComparison(fixture).scenarioViolations).toContainEqual(expect.objectContaining({ type: 'SCENARIO_VIOLATION', from: 'SaveInfo', to: 'DisposeData' }));
    expect(runEnterpriseComparison(fixture, true).scenarioViolations).toEqual([]);
    const forbidden = structuredClone(legal);
    forbidden.scenarioRequirements![0].kind = 'forbidden-precedence';
    expect(new OntologyChecker().check(forbidden, repaired).violations).toContainEqual(expect.objectContaining({ type: 'SCENARIO_VIOLATION', path: ['SaveInfo', 'ArchiveInfo', 'DisposeData'] }));
  });

  it('Ch.8 SOX: composition exposes separated processes to one principal', () => {
    const legal = model({ domains: ['Financial'], entities: [entity('FinancialOperations', 'Process'), entity('PrepareAccounts', 'Process'), entity('AuditAccounts', 'Process'), entity('FinanceOfficer', 'Role'), entity('Officer1', 'User')],
      relations: [relation('Separate', 'PrepareAccounts', 'AuditAccounts')] });
    const enterprise = model({ model_type: 'Enterprise_Model', relations: [relation('Acts', 'FinanceOfficer', 'Officer1'), relation('Assumes', 'Officer1', 'FinancialOperations'), relation('ComposedOf', 'FinancialOperations', 'PrepareAccounts'), relation('ComposedOf', 'FinancialOperations', 'AuditAccounts')] });
    const repaired = structuredClone(enterprise);
    repaired.relations = repaired.relations.filter(r => !(r.type === 'ComposedOf' && r.target === 'AuditAccounts'));
    const fixture = comparison(legal, enterprise, repaired);
    const result = runEnterpriseComparison(fixture);
    const witnesses = result.violations.filter((v: { type: string }) => v.type === 'SEPARATION_VIOLATION');
    expect(witnesses).toHaveLength(1);
    expect(witnesses[0]).toMatchObject({ user: 'Officer1' });
    expect(new Set([witnesses[0].process1, witnesses[0].process2])).toEqual(new Set(['PrepareAccounts', 'AuditAccounts']));
    expect(result.consistent).toBe(false);
    expect(result.violations.some((v: { type: string }) => v.type === 'ENGINE_DISAGREEMENT')).toBe(false);
    expect(result.alloySpecification).toContain('FinancialOperations.subProcess = PrepareAccounts + AuditAccounts');
    expect(runEnterpriseComparison(fixture, true)).toMatchObject({ consistent: true, violations: [] });
  });
});
