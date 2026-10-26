import type { LawMetadata, LawProvision, GalJsonModel, TranslationResult, EnterpriseComparisonCase } from '../../types/contracts';
import { readLawToGAM } from '../gam-pipeline/read-law.js';
import { generateValidationChecks } from '../gam-pipeline/phase3-validator.js';
import { ConsistencyChecker } from '../gam-core/consistency-checker.js';
import { OntologyChecker } from '../gam-core/ontology-checker.js';
import { emitAlloy } from '../gam-core/alloy-emitter.js';
import { entitySort, normalizeEdgeDirections } from './direction-guard';
import { buildTranslationTrace, extractLiveConcepts, segmentLegalText, type TraceInput } from './trace-builder';

/** Use declared sorts and the known DepartmentRole alias; never coerce data/constraints into capabilities. */
export function normalizeGamModel(input: GalJsonModel): GalJsonModel {
  const model = structuredClone(input);
  model.entities = model.entities.map(e => {
    const sort = entitySort(e);
    return sort ? { ...e, type: sort, sort } : e;
  });
  return normalizeEdgeDirections(model);
}

function prepareModel(input: GalJsonModel): GalJsonModel {
  const model = structuredClone(input);
  model.ontologyRequirements ??= [];
  model.scenarioRequirements ??= [];
  const generated = generateValidationChecks(model) as GalJsonModel['validation_checks'];
  model.validation_checks = [...(model.validation_checks ?? [])];
  for (const check of generated ?? []) if (!model.validation_checks.some(c => JSON.stringify(c) === JSON.stringify(check))) model.validation_checks.push(check);
  return model;
}

function liveTranslation(text: string, jurisdiction: { country: string; level: string; name: string }, effectiveDate: string, lawId: string, provisionId: string): TranslationResult {
  const raw = readLawToGAM(text, jurisdiction, { effective_date: effectiveDate }) as GalJsonModel;
  const model = normalizeGamModel(raw);
  const clauses = segmentLegalText(text);
  // Entity descriptions are actual extractor provenance; do not invent edge-level precision.
  model.entities = model.entities.map(e => {
    const clause = clauses.find(c => e.description?.includes(c.text) || (e.description && c.text.includes(e.description)));
    return { ...e, sourceSpan: clause?.sourceSpan, verified: false };
  });
  const entityIndex = new Map(model.entities.map(e => [e.id, e]));
  for (const edge of [...model.relations, ...model.policies]) {
    const sourceSpan = entityIndex.get(edge.source)?.sourceSpan;
    const targetSpan = entityIndex.get(edge.target)?.sourceSpan;
    if (sourceSpan && targetSpan && sourceSpan.start === targetSpan.start && sourceSpan.end === targetSpan.end) {
      edge.sourceSpan = sourceSpan;
      edge.rationale ??= 'Heuristic pipeline edge; both endpoints originate in this clause. Requires semantic review.';
      edge.uncertain = /\b(if|unless|except|provided|subject to)\b/i.test(sourceSpan.text ?? '');
    }
  }
  const concepts = extractLiveConcepts(text, clauses, model);
  for (const c of clauses) if (!concepts.some(t => t.clauseId === c.id)) concepts.push({ id: `unmapped-${c.id}`, label: c.text, category: 'Unmapped', sourceSpan: c.sourceSpan, clauseId: c.id, verified: false, notes: 'No phase-one pattern extracted.' });
  return { lawId, provisionId, readiness: 'unverified-draft', sourceText: text,
    ...buildTranslationTrace({ sourceText: text, clauses, concepts, galModel: prepareModel(model) }) };
}

export function translateLawProvision(law: LawMetadata, provision: LawProvision, mode: 'curated' | 'live-pipeline' = 'curated'): TranslationResult {
  if (mode === 'live-pipeline') return liveTranslation(provision.originalText, provision.curatedGalModel.jurisdiction, provision.versionDate, law.id, provision.id);
  // Curated facts are validated as supplied: silently repairing reviewed edges would conceal defects.
  const model = structuredClone(provision.curatedGalModel);
  model.entities = model.entities.map(e => {
    const sort = entitySort(e);
    return sort ? { ...e, type: sort, sort, verified: e.verified ?? provision.readiness === 'human-reviewed' } : e;
  });
  return { lawId: law.id, provisionId: provision.id, readiness: provision.readiness, sourceText: provision.originalText,
    ...buildTranslationTrace({ sourceText: provision.originalText, clauses: provision.clauses, concepts: provision.concepts, galModel: prepareModel(model), unmappedClauses: provision.unmappedClauses, ambiguousInterpretations: provision.ambiguousInterpretations }) };
}

export function translateCustomPassage(text: string, jurisdiction = { country: 'OTHER', level: 'Federal', name: 'Custom passage' }): TranslationResult {
  // Fixed unknown date keeps output deterministic; custom text supplies no effective date.
  return liveTranslation(text, jurisdiction, '1970-01-01', 'custom', 'custom-passage');
}

/** Drop checks that prepareModel generated, so a re-prepared edited model does not keep checks for deleted entities. */
export function stripGeneratedChecks(model: GalJsonModel): GalJsonModel {
  const out = structuredClone(model);
  const generated = new Set(((generateValidationChecks(model) as GalJsonModel['validation_checks']) ?? []).map(c => JSON.stringify(c)));
  out.validation_checks = (out.validation_checks ?? []).filter(c => !generated.has(JSON.stringify(c)));
  return out;
}

export interface EditedTranslationInput {
  lawId: string;
  provisionId: string;
  readiness: TranslationResult['readiness'];
  sourceText: string;
  clauses: TraceInput['clauses'];
  concepts: TraceInput['concepts'];
  /** Authored model without generated checks (see stripGeneratedChecks). */
  galModel: GalJsonModel;
  unmappedClauses?: TraceInput['unmappedClauses'];
  ambiguousInterpretations?: TraceInput['ambiguousInterpretations'];
}

/** Re-run the full trace (schema, closure/SAT consistency, ontology, directions, Alloy emission) over an edited model. */
export function retranslateEditedModel(input: EditedTranslationInput): TranslationResult {
  const { lawId, provisionId, readiness, galModel, ...trace } = input;
  return { lawId, provisionId, readiness, sourceText: trace.sourceText, ...buildTranslationTrace({ ...trace, galModel: prepareModel(galModel) }) };
}

export function runEnterpriseComparison(comparisonCase: EnterpriseComparisonCase, useRemediated = false) {
  const lawModel = structuredClone(comparisonCase.lawModel);
  const enterpriseModel = structuredClone(useRemediated ? comparisonCase.remediatedEnterpriseModel : comparisonCase.asBuiltEnterpriseModel);
  const consistency = new ConsistencyChecker().check(lawModel, enterpriseModel);
  const ontology = new OntologyChecker().check(lawModel, enterpriseModel);
  const alloySpecification = emitAlloy(lawModel, enterpriseModel);
  return { caseId: comparisonCase.id, useRemediated, lawModel, enterpriseModel, consistency, ontology,
    consistent: consistency.consistent, violations: consistency.violations, minimalConflict: (consistency as typeof consistency & { minimalConflict: string[] }).minimalConflict, stats: consistency.stats,
    ontologyViolations: ontology.violations.filter(v => v.type === 'ONTOLOGY_GAP'), scenarioViolations: ontology.violations.filter(v => v.type === 'SCENARIO_VIOLATION'),
    alloySpecification, alloySolverExecuted: false as const,
    complianceNotice: 'Consistency is necessary but not sufficient for compliance. Review ontology/scenario findings and model completeness. Alloy specification emitted; solver not executed.' };
}

export type EnterpriseComparisonResult = ReturnType<typeof runEnterpriseComparison>;
