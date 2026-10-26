import type { LawProvision, GalJsonModel, TranslationEvent, GraphNode, GraphEdge, FormalValidationReport, SegmentedClause, ExtractedConceptToken, SourceSpan } from '../../types/contracts';
import { validateModel } from '../gam-core/schema.js';
import { ConsistencyChecker } from '../gam-core/consistency-checker.js';
import { OntologyChecker } from '../gam-core/ontology-checker.js';
import { emitAlloy } from '../gam-core/alloy-emitter.js';
import { detectPolarity, splitClauses, extractPatterns } from '../gam-pipeline/phase1-extractor.js';
import { entitySort, getCanonicalDirectionNote, verifyEdgeDirections } from './direction-guard';

export function highlightKeywords(text: string): SegmentedClause['highlightedKeywords'] {
  return [...text.matchAll(/\b(shall\s+not|must\s+not|may\s+not|must|shall|may|unless|except|authorized|prohibited|responsible|delegated)\b/gi)].map(m => ({
    term: m[0], startOffset: m.index!, endOffset: m.index! + m[0].length,
    category: /not|prohibited/i.test(m[0]) ? 'prohibition' : /unless|except/i.test(m[0]) ? 'exception' : /delegated/i.test(m[0]) ? 'delegation' : /may|authorized/i.test(m[0]) ? 'permission' : 'obligation',
  }));
}

export function segmentLegalText(text: string): SegmentedClause[] {
  let cursor = 0;
  return splitClauses(text).map((part: string, index: number) => {
    const start = text.indexOf(part, cursor);
    cursor = start + part.length;
    const polarity = detectPolarity(part);
    return { id: `clause-${index + 1}`, index, text: part, sourceSpan: { start, end: cursor, clauseId: `clause-${index + 1}`, text: part }, polarity,
      deonticModality: polarity === 'Deny' ? 'Prohibited' : /\b(must|shall|responsible)\b/i.test(part) ? 'Obligatory' : /\b(may|authorized)\b/i.test(part) ? 'Permitted' : 'Unmapped',
      highlightedKeywords: highlightKeywords(part), supported: false, unmappedReason: 'Heuristic extraction requires human review.' };
  });
}

/** Expose actual phase-one patterns, including patterns the translator cannot map. */
export function extractLiveConcepts(text: string, clauses: SegmentedClause[], model: GalJsonModel): ExtractedConceptToken[] {
  const patterns = extractPatterns(text).patterns;
  const categories: Record<string, ExtractedConceptToken['category']> = { activity: 'Activity', process: 'Process', role: 'Role', legalEntity: 'Actor', assignment: 'Role', delegation: 'Delegation', separation: 'Structure', sequence: 'Ordering', containment: 'Structure', obligation: 'Activity', prohibition: 'Prohibition', permission: 'Permission', conditional: 'Condition', exemption: 'Exception' };
  return patterns.map((p: { subtype: string; source: string; entity?: string }, index: number) => {
    const start = typeof p.source === 'string' && p.source.length ? text.indexOf(p.source) : -1;
    const end = start < 0 ? -1 : start + p.source.length;
    const clause = start < 0 ? undefined : clauses.find(c => start < c.sourceSpan.end && end > c.sourceSpan.start);
    const hasEvidence = !!clause && text.slice(start, end) === p.source;
    const span = hasEvidence ? { start, end, clauseId: clause.id, text: p.source } : undefined;
    const entity = model.entities.find(e => e.id === p.entity);
    return { id: `concept-${index + 1}`, label: entity?.name ?? p.subtype, category: hasEvidence ? categories[p.subtype] ?? 'Unmapped' : 'Unmapped', sourceSpan: span, clauseId: hasEvidence ? clause.id : '', verified: false, mappedEntityId: hasEvidence && entitySort(entity) ? entity?.id : undefined, notes: hasEvidence ? 'Actual phase-one heuristic pattern; semantic review pending.' : 'No exact source passage could be linked to a parsed clause; mapping withheld.' };
  });
}

export interface TraceInput {
  sourceText: string;
  clauses: SegmentedClause[];
  concepts: ExtractedConceptToken[];
  galModel: GalJsonModel;
  unmappedClauses?: LawProvision['unmappedClauses'];
  ambiguousInterpretations?: LawProvision['ambiguousInterpretations'];
}

export function buildTranslationTrace(input: TraceInput) {
  const { galModel: model, concepts } = input;
  const clauses = input.clauses.map(c => ({ ...c, polarity: detectPolarity(c.text), highlightedKeywords: highlightKeywords(c.text) }));
  const events: TranslationEvent[] = [];
  const push = (stage: TranslationEvent['stage'], payload: unknown, explanation: string, sourceSpan?: SourceSpan, entityIds?: string[], relationIds?: string[]) => {
    const stepIndex = events.length;
    events.push({ id: `event-${stepIndex + 1}`, stage, stepIndex, timestampMs: stepIndex * 600, payload, explanation, sourceSpan, entityIds, relationIds });
  };
  clauses.forEach(c => push('segment', c, `Segment ${c.id}; detected polarity ${c.polarity}.`, c.sourceSpan));
  const unmappedConcepts = concepts.filter(c => c.category === 'Unmapped' || (!c.mappedEntityId && !c.mappedRelationId));
  concepts.forEach(c => push('extract', c, `${c.category}: ${c.label}${unmappedConcepts.includes(c) ? ' — unmapped concept; review required.' : ''}`, c.sourceSpan));
  const unmappedClauses = [...(input.unmappedClauses ?? [])];
  for (const c of clauses) if (!c.supported && !unmappedClauses.some(u => u.clauseId === c.id)) unmappedClauses.push({ clauseId: c.id, text: c.text, reason: c.unmappedReason ?? 'No verified mapping.', sourceSpan: c.sourceSpan });
  unmappedClauses.forEach(c => push('extract', c, `Unmapped clause: ${c.reason}`, c.sourceSpan));
  const lanes = ['Process', 'Activity', 'Role', 'User', 'Unmapped'];
  const laneCounts = new Map<string, number>();
  const nodes: GraphNode[] = model.entities.map(e => {
    const sort = entitySort(e) ?? 'Unmapped';
    const row = laneCounts.get(sort) ?? 0; laneCounts.set(sort, row + 1);
    const node: GraphNode = { id: e.id, label: e.name ?? e.id, sort, rawType: e.type, origin: 'law', verified: e.verified ?? false, sourceSpan: e.sourceSpan, description: e.description ?? undefined, x: 100 + lanes.indexOf(sort) * 260, y: 100 + row * 110 };
    push('entity', node, sort === 'Unmapped' ? `Unmapped entity ${e.id}: ${e.type}.` : `Create ${sort} ${e.id}.`, e.sourceSpan, [e.id]);
    return node;
  });
  unmappedConcepts.forEach(c => push('entity', c, `Concept ${c.id} has no verified typed GAM mapping.`, c.sourceSpan));
  const edges: GraphEdge[] = [];
  for (const kind of ['relation', 'policy'] as const) {
    const sourceEdges = kind === 'relation' ? model.relations : model.policies;
    sourceEdges.forEach((e, i) => {
      const modality = 'modality' in e ? e.modality || e.allow_deny : undefined;
      const edge: GraphEdge = { id: e.id ?? `${kind}-${i + 1}`, kind, type: e.type, source: e.source, target: e.target, modality, origin: 'law',
        polarity: e.uncertain || e.parameters?.condition ? 'uncertain' : modality === 'Deny' || e.type === 'Prohibition' ? '-' : ['ComposedOf', 'Contains', 'Includes', 'Next', 'Separate'].includes(e.type) ? 'structural' : '+',
        sourceSpan: e.sourceSpan, rationale: e.rationale ?? 'Declared GAL edge; see canonical direction and source provenance.', canonicalDirectionNote: getCanonicalDirectionNote(kind, e.type) };
      edges.push(edge); push('relation', edge, edge.canonicalDirectionNote, edge.sourceSpan, [edge.source, edge.target], [edge.id]);
    });
  }
  push('gal', model, 'Assemble entities, relations, policies, ontology/scenario requirements and generated validation checks.');
  const schema = validateModel(model);
  const consistency = new ConsistencyChecker().check(model, {});
  const ontology = new OntologyChecker().check(model, {});
  const directions = verifyEdgeDirections(model);
  const ids = new Set(model.entities.map(e => e.id));
  const references = [...model.relations, ...model.policies].flatMap(e => [e.source, e.target, ...('activity_or_process' in (e.parameters ?? {}) ? [(e.parameters as { activity_or_process?: string }).activity_or_process].filter((s): s is string => !!s) : [])]);
  for (const r of model.ontologyRequirements ?? []) references.push(...[r.process, r.activity, r.parentRole, r.childRole, r.parentProcess, r.childProcess].filter((s): s is string => !!s));
  for (const r of model.scenarioRequirements ?? []) references.push(r.from, r.to);
  const unresolvedReferences = [...new Set(references.filter(id => !ids.has(id)))];
  const untypedEntities = nodes.filter(n => n.sort === 'Unmapped').map(n => n.id);
  const mappedClauseCount = clauses.filter(c => c.supported && !unmappedClauses.some(u => u.clauseId === c.id)).length;
  const validation: FormalValidationReport = {
    structuralValid: schema.valid, schemaErrors: schema.errors, entityTypingValid: !untypedEntities.length, untypedEntities,
    relationDirectionsValid: directions.valid, directionWarnings: directions.warnings,
    modalityConsistent: model.policies.every(p => (!p.allow_deny || p.allow_deny === p.modality) && (p.modality === 'Deny' ? !p.deontic_status || p.deontic_status === 'Prohibited' : p.deontic_status !== 'Prohibited')),
    internalLawConsistent: consistency.consistent, internalViolations: [...consistency.violations, ...ontology.violations], unresolvedReferences,
    sourceCoveragePercent: clauses.length ? mappedClauseCount / clauses.length * 100 : 0, mappedClauseCount, totalClauseCount: clauses.length,
    unmappedClauses, ambiguousInterpretations: input.ambiguousInterpretations ?? [], ontologyRequirements: model.ontologyRequirements ?? [], scenarioRequirements: model.scenarioRequirements ?? [],
    counts: { entities: nodes.length, processes: nodes.filter(n => n.sort === 'Process').length, activities: nodes.filter(n => n.sort === 'Activity').length, roles: nodes.filter(n => n.sort === 'Role').length, users: nodes.filter(n => n.sort === 'User').length, relations: model.relations.length, policies: model.policies.length, allowPolicies: model.policies.filter(p => p.modality === 'Allow').length, denyPolicies: model.policies.filter(p => p.modality === 'Deny').length, unresolved: unresolvedReferences.length },
    alloySpecification: emitAlloy(model, {}), alloySolverExecuted: false,
    complianceNotice: 'Law-only consistency does not establish organizational compliance. Compare an enterprise configuration and review ontology, scenarios and source coverage. Alloy specification emitted; Alloy solver not executed. Principals without Acts/CanAct grants are outside the checker’s user enumeration. Extended operators may be ignored by the GAM core.',
  };
  push('validate', validation, 'Run real schema, closure/SAT consistency, ontology/scenario, direction checks and Alloy emission.');
  return { clauses, concepts, unmappedConcepts, galModel: model, graph: { nodes, edges }, validation, events };
}
