/**
 * Internal builders for the verified-examples data set.
 *
 * Every sourceSpan is computed with indexOf() on the provision's own
 * originalText and the build throws if a quote is missing, so offsets can
 * never drift from the text they claim to point at.
 *
 * Offset convention: ALL start/end values (clauses, keywords, concepts,
 * entities, relations, policies) are absolute character offsets into the
 * provision's `originalText` (end exclusive): originalText.slice(start, end) === text.
 */
import type {
  DeonticStatus,
  ExtractedConceptToken,
  GalEntity,
  GalJsonModel,
  GalPolicy,
  GalRelation,
  GamSort,
  HohfeldianModality,
  LawProvision,
  OntologyRequirement,
  PolarityModality,
  ScenarioRequirement,
  SegmentedClause,
  SourceSpan,
  TranslationReadiness,
} from '../../types/contracts';

/**
 * Single switch for the readiness label of every bundled provision. Quotations
 * were curated from the official instruments but NOT machine-diffed against the
 * official URLs in this session, so they are labelled as drafts until a human
 * reviewer flips this to 'human-reviewed'.
 */
export const BUNDLED_READINESS: TranslationReadiness = 'unverified-draft';

type KeywordCategory = SegmentedClause['highlightedKeywords'][number]['category'];
type ConceptCategory = ExtractedConceptToken['category'];

export interface ClauseSpec {
  key: string;
  text: string;
  polarity: PolarityModality;
  deontic: SegmentedClause['deonticModality'];
  supported?: boolean;
  unmappedReason?: string;
  keywords?: Array<[term: string, category: KeywordCategory]>;
}

export interface ConceptSpec {
  clause: string;
  quote: string;
  label: string;
  category: ConceptCategory;
  entity?: string;
  relation?: string;
  verified?: boolean;
  notes?: string;
}

export interface ModelSpec {
  context: string;
  country: string;
  level: GalJsonModel['jurisdiction']['level'];
  name: string;
  effective: string;
  domains: string[];
  entities: Array<[id: string, sort: GamSort, name: string, quote?: string, description?: string]>;
  relations?: Array<[type: GalRelation['type'], source: string, target: string, quote?: string, rationale?: string]>;
  policies?: GalPolicy[];
  ontology?: Array<Omit<OntologyRequirement, 'sourceSpan'> & { quote?: string }>;
  scenarios?: Array<Omit<ScenarioRequirement, 'sourceSpan'> & { quote?: string }>;
}

export interface ProvisionSpec {
  id: string;
  section: string;
  title: string;
  language: string;
  sourceUrl: string;
  versionDate: string;
  clauses: ClauseSpec[];
  concepts: ConceptSpec[];
  model: ModelSpec;
  ambiguous?: Array<{ id: string; clause: string; description: string; quote: string }>;
}

/** Policy factory with the canonical modality / deontic / Hohfeld defaults. */
export function policy(
  type: GalPolicy['type'],
  modality: PolarityModality,
  source: string,
  target: string,
  opts: {
    deontic?: DeonticStatus;
    hohfeld?: HohfeldianModality;
    quote?: string;
    rationale?: string;
    activityOrProcess?: string;
    jurisdiction?: string;
    consentType?: string;
    legalBasis?: string;
  } = {},
): GalPolicy & { quote?: string } {
  const deny = modality === 'Deny';
  return {
    type,
    modality,
    allow_deny: modality,
    deontic_status: opts.deontic ?? (deny ? 'Prohibited' : 'Permitted'),
    hohfeldian_modality: opts.hohfeld ?? (deny ? 'No-Right' : 'Privilege'),
    power_subtype: 'None',
    source,
    target,
    parameters: {
      activity_or_process: opts.activityOrProcess ?? null,
      jurisdiction: opts.jurisdiction ?? null,
      condition: null,
      consent_type: opts.consentType ?? null,
      legal_basis: opts.legalBasis ?? null,
    },
    rationale: opts.rationale,
    quote: opts.quote,
  } as GalPolicy & { quote?: string };
}

function spanOf(text: string, quote: string, clauseId?: string): SourceSpan {
  const start = text.indexOf(quote);
  if (start < 0) throw new Error(`verified-examples: quote not found in originalText: "${quote}"`);
  return { start, end: start + quote.length, clauseId, text: quote };
}

function clauseIdFor(provisionId: string, clauses: SegmentedClause[], quoteSpan: SourceSpan): string | undefined {
  return clauses.find((c) => quoteSpan.start >= c.sourceSpan.start && quoteSpan.end <= c.sourceSpan.end)?.id;
}

export function buildProvision(spec: ProvisionSpec): LawProvision {
  const originalText = spec.clauses.map((c) => c.text).join('\n\n');

  let cursor = 0;
  const clauses: SegmentedClause[] = spec.clauses.map((c, index) => {
    const start = originalText.indexOf(c.text, cursor);
    const end = start + c.text.length;
    cursor = end;
    const id = `${spec.id}#c${index + 1}`;
    return {
      id,
      index,
      text: c.text,
      sourceSpan: { start, end, clauseId: id, text: c.text },
      polarity: c.polarity,
      deonticModality: c.deontic,
      highlightedKeywords: (c.keywords ?? []).map(([term, category]) => {
        const rel = c.text.toLowerCase().indexOf(term.toLowerCase());
        if (rel < 0) throw new Error(`verified-examples: keyword "${term}" not in clause ${id}`);
        return { term, category, startOffset: start + rel, endOffset: start + rel + term.length };
      }),
      supported: c.supported ?? true,
      ...(c.unmappedReason ? { unmappedReason: c.unmappedReason } : {}),
    };
  });
  const clauseByKey = new Map(spec.clauses.map((c, i) => [c.key, clauses[i]]));

  const concepts: ExtractedConceptToken[] = spec.concepts.map((k, i) => {
    const clause = clauseByKey.get(k.clause);
    if (!clause) throw new Error(`verified-examples: unknown clause key ${k.clause}`);
    const rel = clause.text.indexOf(k.quote);
    if (rel < 0) throw new Error(`verified-examples: concept quote "${k.quote}" not in clause ${k.clause}`);
    const start = clause.sourceSpan.start + rel;
    return {
      id: `${spec.id}#k${i + 1}`,
      label: k.label,
      category: k.category,
      sourceSpan: { start, end: start + k.quote.length, clauseId: clause.id, text: k.quote },
      clauseId: clause.id,
      verified: k.verified ?? true,
      ...(k.entity ? { mappedEntityId: k.entity } : {}),
      ...(k.relation ? { mappedRelationId: k.relation } : {}),
      ...(k.notes ? { notes: k.notes } : {}),
    };
  });

  const m = spec.model;
  const resolve = (quote?: string): SourceSpan | undefined => {
    if (!quote) return undefined;
    const s = spanOf(originalText, quote);
    return { ...s, clauseId: clauseIdFor(spec.id, clauses, s) };
  };

  const entities: GalEntity[] = m.entities.map(([id, sort, name, quote, description]) => ({
    id,
    type: sort,
    sort,
    name,
    jurisdiction: m.country,
    description: description ?? null,
    sourceSpan: resolve(quote),
    verified: true,
  }));

  const relations: GalRelation[] = (m.relations ?? []).map(([type, source, target, quote, rationale], i) => ({
    id: `${spec.id}:rel${i + 1}:${type}`,
    type,
    source,
    target,
    parameters: { jurisdiction: m.country, deontic_status: null },
    sourceSpan: resolve(quote),
    rationale,
  }));

  const policies: GalPolicy[] = (m.policies ?? []).map((p, i) => {
    const { quote, ...rest } = p as GalPolicy & { quote?: string };
    return {
      ...rest,
      id: `${spec.id}:pol${i + 1}:${rest.type}`,
      parameters: { ...rest.parameters, jurisdiction: m.country },
      sourceSpan: resolve(quote),
    };
  });

  const ontologyRequirements = m.ontology?.map(({ quote, ...r }) => ({ ...r, sourceSpan: resolve(quote) }));
  const scenarioRequirements = m.scenarios?.map(({ quote, ...r }) => ({ ...r, sourceSpan: resolve(quote) }));

  const curatedGalModel: GalJsonModel = {
    model_type: 'Law_Model',
    context: m.context,
    jurisdiction: { country: m.country, level: m.level, name: m.name },
    effective_date: m.effective,
    domains: m.domains,
    entities,
    relations,
    policies,
    ...(ontologyRequirements ? { ontologyRequirements } : {}),
    ...(scenarioRequirements ? { scenarioRequirements } : {}),
    validation_checks: [],
    theory_construction: { cases: [], factors: [], value_preferences: [], rule_preferences: [] },
  };

  const unmapped = clauses
    .filter((c) => !c.supported)
    .map((c) => ({
      clauseId: c.id,
      text: c.text,
      reason: c.unmappedReason ?? 'Outside the core Φ relational sorts.',
      sourceSpan: c.sourceSpan,
    }));

  const ambiguous = spec.ambiguous?.map((a) => {
    const s = resolve(a.quote)!;
    return { id: a.id, clauseId: clauseByKey.get(a.clause)!.id, description: a.description, sourceSpan: s };
  });

  return {
    id: spec.id,
    section: spec.section,
    title: spec.title,
    originalText,
    language: spec.language,
    sourceUrl: spec.sourceUrl,
    versionDate: spec.versionDate,
    readiness: BUNDLED_READINESS,
    clauses,
    concepts,
    curatedGalModel,
    ...(unmapped.length ? { unmappedClauses: unmapped } : {}),
    ...(ambiguous?.length ? { ambiguousInterpretations: ambiguous } : {}),
  };
}

/** Enterprise-model helpers (no source text involved). */
export function enterpriseModel(
  context: string,
  parts: {
    entities: Array<[id: string, sort: GamSort, name?: string]>;
    relations?: Array<[GalRelation['type'], string, string]>;
    policies?: GalPolicy[];
  },
  jurisdiction: GalJsonModel['jurisdiction'] = { country: 'CA', level: 'Federal', name: 'Example Organization' },
): GalJsonModel {
  return {
    model_type: 'Enterprise_Model',
    context,
    jurisdiction,
    effective_date: '2025-01-01',
    domains: ['All'],
    entities: parts.entities.map(([id, sort, name]) => ({ id, type: sort, sort, name: name ?? id, verified: true })),
    relations: (parts.relations ?? []).map(([type, source, target], i) => ({
      id: `ent:rel${i + 1}:${type}`,
      type,
      source,
      target,
    })),
    policies: parts.policies ?? [],
    validation_checks: [],
    theory_construction: { cases: [], factors: [], value_preferences: [], rule_preferences: [] },
  };
}
