/**
 * Shared Architecture Contracts for LAW → GAL Interactive Visualization
 * Grounded in W. A. Hassan's Governance Analysis Method (GAM, Ottawa 2009) & GAM 2.0 Corrections.
 *
 * Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
 */

export type GamSort = 'Process' | 'Activity' | 'Role' | 'User';

export type GalEntityType =
  | GamSort
  | 'DepartmentRole'
  | 'LegalEntity'
  | 'DataObject'
  | 'Vehicle'
  | 'InfrastructureZone'
  | 'LegalInstrument'
  | 'Constraint'
  | 'Value'
  | 'Factor'
  | 'Rule'
  | 'Sanction';

export type GalRelationType =
  | 'ComposedOf' // PP: parent Process → child Process
  | 'Contains'   // PA: Process → Activity
  | 'Includes'   // RR: senior Role → junior Role (senior inherits junior)
  | 'Next'       // S:  Activity → following Activity
  | 'Separate'   // X:  Process ↔ Process (symmetric)
  | 'Acts'       // RU+: Role → User
  | 'Assumes'    // UP+: User → Process
  | 'AssignedTo' // RA+: Role → Activity
  | 'Reaches'    // RP+: Role → Process
  | 'Delegate'
  | 'CountsAs'
  | 'MustReport'
  | 'Obligation'
  | 'Prohibition'
  | 'Permission'
  | 'Exception'
  | 'Provenance';

export type GalPolicyType =
  | 'CanAssignTo' // source: Activity → target: Role
  | 'CanAct'      // source: User     → target: Role
  | 'CanAssume'   // source: User     → target: Process
  | 'CanReach'    // source: Role     → target: Process
  | 'CanDelegate' // source: fromRole → target: toRole (parameters.activity_or_process)
  | 'CanAccess'
  | 'CanCollect'
  | 'CanUse'
  | 'CanDisclose'
  | 'CanRetain'
  | 'CanTransfer'
  | 'CanDelete'
  | 'CanProcess';

export type PolarityModality = 'Allow' | 'Deny';

export type DeonticStatus = 'Obligatory' | 'Permitted' | 'Prohibited';

export type HohfeldianModality =
  | 'Duty'
  | 'Claim-Right'
  | 'Privilege'
  | 'No-Right'
  | 'Power'
  | 'Liability'
  | 'Immunity'
  | 'Disability'
  | 'None';

export type PowerSubType =
  | 'Action-Power'
  | 'Enabling-Power'
  | 'Potestative-Right'
  | 'Declarative-Power'
  | 'None';

export type TranslationReadiness =
  | 'human-reviewed'      // Authoritative reviewed GAM translation
  | 'actual-generated'    // Produced live by the GAM translation pipeline
  | 'unverified-draft'    // Heuristic extraction requiring human formal review
  | 'unsupported';        // No validated translation available

export interface SourceSpan {
  start: number;
  end: number;
  clauseId?: string;
  text?: string;
}

export interface GalEntity {
  id: string;
  type: GalEntityType;
  sort?: GamSort; // Normalized GAM engine sort (Process | Activity | Role | User)
  name?: string;
  subtype?: string | null;
  jurisdiction?: string | null;
  description?: string | null;
  sourceSpan?: SourceSpan;
  verified?: boolean;
}

export interface GalRelation {
  id?: string;
  type: GalRelationType;
  source: string;
  target: string;
  parameters?: {
    additional_target?: string | null;
    conflict_resolution_principle?: string | null;
    defeat_mechanism?: string | null;
    jurisdiction?: string | null;
    condition?: string | null;
    temporal_persistence?: string | null;
    deontic_status?: DeonticStatus | null;
  };
  sourceSpan?: SourceSpan;
  rationale?: string;
  uncertain?: boolean;
}

export interface GalPolicy {
  id?: string;
  type: GalPolicyType;
  modality: PolarityModality;
  allow_deny?: PolarityModality;
  deontic_status?: DeonticStatus;
  hohfeldian_modality?: HohfeldianModality;
  power_subtype?: PowerSubType;
  source: string;
  target: string;
  parameters?: {
    activity_or_process?: string | null;
    jurisdiction?: string | null;
    condition?: string | null;
    consent_type?: string | null;
    legal_basis?: string | null;
  };
  sourceSpan?: SourceSpan;
  rationale?: string;
  uncertain?: boolean;
}

export interface OntologyRequirement {
  id: string;
  process?: string;
  activity?: string;
  parentRole?: string;
  childRole?: string;
  parentProcess?: string;
  childProcess?: string;
  rationale: string;
  sourceSpan?: SourceSpan;
}

export interface ScenarioRequirement {
  id: string;
  kind: 'precedence' | 'forbidden-precedence';
  from: string;
  to: string;
  rationale: string;
  sourceSpan?: SourceSpan;
}

export interface GalValidationCheck {
  check_type: string;
  label: string;
  quantifier: 'ALL' | 'SOME' | 'NONE';
  source: string;
  target: string;
  parameters?: {
    additional_target?: string | null;
    jurisdiction?: string | null;
    severity?: 'Critical' | 'Major' | 'Minor';
    expected_result?: string | null;
    description?: string | null;
  };
}

export interface GalJsonModel {
  model_type: 'Law_Model' | 'Enterprise_Model';
  context: string;
  jurisdiction: {
    country: string;
    level: 'Federal' | 'State' | 'Provincial' | 'Municipal' | 'Supranational' | 'Emirate';
    name: string;
  };
  effective_date: string;
  domains: string[];
  entities: GalEntity[];
  relations: GalRelation[];
  policies: GalPolicy[];
  ontologyRequirements?: OntologyRequirement[];
  scenarioRequirements?: ScenarioRequirement[];
  validation_checks?: GalValidationCheck[];
  theory_construction?: {
    cases: unknown[];
    factors: unknown[];
    value_preferences: unknown[];
    rule_preferences: unknown[];
  };
}

export interface CountryMetadata {
  isoA3: string;          // e.g. 'CAN', 'USA', 'DEU', 'FRA', 'GBR', 'IRL'
  isoNumeric?: string;    // ISO 3166-1 numeric code in world-atlas TopoJSON (e.g. '124', '840', '276', '250')
  code: string;           // e.g. 'CA', 'US', 'EU', 'DE', 'FR', 'UK', 'IE'
  name: string;
  region: string;
  flag: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  supported: boolean;
  lawIds: string[];
  legalTradition?: string;
  notes?: string;
}

export interface SegmentedClause {
  id: string;
  index: number;
  text: string;
  sourceSpan: SourceSpan;
  polarity: PolarityModality;
  deonticModality: DeonticStatus | 'Conditional' | 'Constitutive' | 'Unmapped';
  highlightedKeywords: Array<{
    term: string;
    category: 'obligation' | 'permission' | 'prohibition' | 'exception' | 'condition' | 'delegation';
    startOffset: number;
    endOffset: number;
  }>;
  supported: boolean;
  unmappedReason?: string;
}

export interface ExtractedConceptToken {
  id: string;
  label: string;
  category:
    | 'Actor'
    | 'Role'
    | 'Activity'
    | 'Process'
    | 'Permission'
    | 'Prohibition'
    | 'Condition'
    | 'Exception'
    | 'Delegation'
    | 'Structure'
    | 'Ordering'
    | 'Unmapped';
  sourceSpan?: SourceSpan;
  clauseId: string;
  verified: boolean;
  mappedEntityId?: string;
  mappedRelationId?: string;
  notes?: string;
}

export interface LawProvision {
  id: string;
  section: string;
  title: string;
  originalText: string;
  language: string;
  sourceUrl: string;
  versionDate: string;
  readiness: TranslationReadiness;
  clauses: SegmentedClause[];
  concepts: ExtractedConceptToken[];
  curatedGalModel: GalJsonModel;
  unmappedClauses?: Array<{
    clauseId: string;
    text: string;
    reason: string;
    sourceSpan: SourceSpan;
  }>;
  ambiguousInterpretations?: Array<{
    id: string;
    clauseId: string;
    description: string;
    sourceSpan: SourceSpan;
  }>;
}

export interface LawMetadata {
  id: string;
  countryCode: string;
  countryName: string;
  jurisdiction: string;
  jurisdictionLevel: 'Federal' | 'State' | 'Provincial' | 'Supranational';
  name: string;
  shortName: string;
  officialCitation: string;
  issuingAuthority: string;
  authorityUrl: string;
  officialSourceUrl: string;
  effectiveDate: string;
  version: string;
  sourceLanguage: string;
  readiness: TranslationReadiness;
  summary: string;
  provisions: LawProvision[];
}

export type InstrumentCategory =
  | 'Privacy & data protection'
  | 'Health privacy'
  | 'Financial privacy'
  | 'Cybersecurity'
  | 'Breach notification'
  | 'Cross-border transfer'
  | 'Access to information'
  | 'Surveillance & cybercrime'
  | 'AI & digital governance'
  | 'Children & education'
  | 'Communications & marketing'
  | 'Standards & guidance';

export type InstrumentType =
  | 'Statute'
  | 'Regulation'
  | 'Directive'
  | 'Decision'
  | 'Treaty'
  | 'Declaration / resolution'
  | 'Ordinance'
  | 'Standard / guidance'
  | 'Bill / proposal';

export type CatalogueLevel =
  | LawMetadata['jurisdictionLevel']
  | 'Municipal'
  | 'Free zone'
  | 'Regional'
  | 'International';

export type InstrumentStatus =
  | 'in-force'
  | 'phased'
  | 'proposed'
  | 'lapsed'
  | 'repealed'
  | 'invalidated';

/**
 * A catalogued (NOT translated) legal instrument: metadata and a pointer to the
 * authoritative source only. No statutory text, clauses or GAL model is bundled.
 * `translatedLawId` links an entry to a bundled LawMetadata when one exists.
 */
export interface CatalogueInstrument {
  id: string;
  /** App country code ('CA', 'JP', ...) or 'INT' for international and regional instruments. */
  countryCode: string;
  jurisdiction: string;
  jurisdictionLevel: CatalogueLevel;
  name: string;
  shortName: string;
  citation: string;
  category: InstrumentCategory;
  instrumentType: InstrumentType;
  status: InstrumentStatus;
  statusNote?: string;
  effectiveDate?: string;
  officialSourceUrl?: string;
  translatedLawId?: string;
  /** True when the entry (and any link) came from a user-supplied reference list and was not independently checked. */
  userSupplied?: boolean;
}

export type PipelineStageId =
  | 'source'
  | 'segment'
  | 'extract'
  | 'entity'
  | 'relation'
  | 'gal'
  | 'validate';

export interface TranslationEvent {
  id: string;
  stage: PipelineStageId;
  stepIndex: number;
  timestampMs: number;
  sourceSpan?: {
    start: number;
    end: number;
  };
  entityIds?: string[];
  relationIds?: string[];
  explanation?: string;
  payload: unknown;
}

export interface GraphNode {
  id: string;
  label: string;
  sort: GamSort | 'Unmapped';
  rawType: string;
  origin: 'law' | 'enterprise' | 'both';
  verified: boolean;
  sourceSpan?: SourceSpan;
  description?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  kind: 'relation' | 'policy';
  type: string;
  source: string;
  target: string;
  polarity: '+' | '-' | 'structural' | 'uncertain';
  modality?: PolarityModality;
  origin: 'law' | 'enterprise' | 'both';
  sourceSpan?: SourceSpan;
  rationale?: string;
  canonicalDirectionNote: string;
}

export interface FormalValidationReport {
  structuralValid: boolean;
  schemaErrors: string[];
  entityTypingValid: boolean;
  untypedEntities: string[];
  relationDirectionsValid: boolean;
  directionWarnings: string[];
  modalityConsistent: boolean;
  internalLawConsistent: boolean;
  internalViolations: Array<{
    type: string;
    severity: string;
    message: string;
    user?: string;
    activity?: string;
    process?: string;
    grantedVia?: string[];
    prohibitedVia?: string[];
  }>;
  unresolvedReferences: string[];
  sourceCoveragePercent: number;
  mappedClauseCount: number;
  totalClauseCount: number;
  unmappedClauses: Array<{
    clauseId: string;
    text: string;
    reason: string;
  }>;
  ambiguousInterpretations: Array<{
    id: string;
    clauseId: string;
    description: string;
  }>;
  ontologyRequirements: OntologyRequirement[];
  scenarioRequirements: ScenarioRequirement[];
  counts: {
    entities: number;
    processes: number;
    activities: number;
    roles: number;
    users: number;
    relations: number;
    policies: number;
    allowPolicies: number;
    denyPolicies: number;
    unresolved: number;
  };
  alloySpecification: string;
  alloySolverExecuted: false; // Honest reporting: Alloy spec is emitted, not executed unless JVM solver runs
  complianceNotice: string;   // Explicit notice: Φ_L alone does not establish organizational compliance
}

export interface TranslationResult {
  lawId: string;
  provisionId: string;
  readiness: TranslationReadiness;
  sourceText: string;
  clauses: SegmentedClause[];
  concepts: ExtractedConceptToken[];
  unmappedConcepts: ExtractedConceptToken[];
  galModel: GalJsonModel;
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  validation: FormalValidationReport;
  events: TranslationEvent[];
}

export interface EnterpriseComparisonCase {
  id: string;
  title: string;
  thesisReference: string;
  description: string;
  lawModel: GalJsonModel;
  asBuiltEnterpriseModel: GalJsonModel;
  remediatedEnterpriseModel: GalJsonModel;
  explanation: string;
  sufficiencyNote: string;
}
