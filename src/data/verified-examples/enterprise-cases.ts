/**
 * Enterprise comparison cases (Φ_L vs Φ_E), reproducing thesis Ch.7 / Ch.8
 * examples. Law models are taken from the bundled provisions in laws.ts so the
 * vocabulary is shared (one universe, as required by GAM closure semantics).
 *
 * Expected engine verdicts (asserted by the C02 verification script, see report):
 *  - thesis-ch7-ex2  as-built: Con fails, ACTIVITY_CONFLICT on AdminAssistant1; remediated: Con holds.
 *  - thesis-ch7-ex1b as-built: Con holds (0 violations), OntologyChecker reports ONTOLOGY_GAP for
 *                      ProvideCPOIdentity in Privacy; remediated: both hold.
 *  - thesis-ch8-sox  as-built: SEPARATION_VIOLATION (Carol) + ACTIVITY_CONFLICT (Dave); remediated: Con holds.
 */
import type { EnterpriseComparisonCase, GalJsonModel } from '../../types/contracts';
import { enterpriseModel } from './builders';
import { getLawById } from './laws';

function lawModelOf(lawId: string, provisionId: string): GalJsonModel {
  const model = getLawById(lawId)?.provisions.find((p) => p.id === provisionId)?.curatedGalModel;
  if (!model) throw new Error(`verified-examples: missing law model ${lawId}/${provisionId}`);
  return model;
}

// Ex.2 is a pure consistency (Con) case: drop the structural requirements so an
// ontology run on this case does not report gaps that belong to Ex.1(b).
const { ontologyRequirements: _omitted, ...pipedaAccessLawModel } = lawModelOf('ca-pipeda', 'pipeda-4-1');

// ── Case 1 — Thesis Ch.7 Ex.2 ───────────────────────────────────────────────

const ex2Entities: Array<[string, 'Process' | 'Activity' | 'Role' | 'User', string?]> = [
  ['PrivDiv', 'Role', 'Privacy Division'],
  ['FinAdminAssistants', 'Role', 'Financial Administration Assistants'],
  ['AccessPI', 'Activity', 'Access personal information'],
  ['AdminAssistant1', 'User', 'Administrative Assistant 1'],
  ['PrivAnalyst1', 'User', 'Privacy Analyst 1'],
];

const ex2AsBuilt = enterpriseModel('Thesis Ch.7 Ex.2 — as-built enterprise', {
  entities: ex2Entities,
  relations: [
    ['AssignedTo', 'FinAdminAssistants', 'AccessPI'],
    ['Acts', 'PrivDiv', 'AdminAssistant1'],
    ['Acts', 'FinAdminAssistants', 'AdminAssistant1'],
    ['Acts', 'PrivDiv', 'PrivAnalyst1'],
  ],
});

const ex2Remediated = enterpriseModel('Thesis Ch.7 Ex.2 — remediated enterprise (AdminAssistant1 removed from PrivDiv)', {
  entities: ex2Entities,
  relations: [
    ['AssignedTo', 'FinAdminAssistants', 'AccessPI'],
    ['Acts', 'FinAdminAssistants', 'AdminAssistant1'],
    ['Acts', 'PrivDiv', 'PrivAnalyst1'],
  ],
});

// ── Case 2 — Thesis Ch.7 Ex.1(b) ────────────────────────────────────────────

const ex1bEntities: Array<[string, 'Process' | 'Activity' | 'Role' | 'User', string?]> = [
  ['Privacy', 'Process', 'Privacy'],
  ['DesignatePrivacyOfficer', 'Activity', 'Designate privacy officer'],
  ['ArchiveCPOContactNotice', 'Activity', 'Archive stale CPO contact notice'],
  ['ProvideCPOIdentity', 'Activity', 'Provide privacy officer identity'],
  ['OverseePrivacyCompliance', 'Activity', 'Oversee privacy compliance'],
  ['PrivacyOfficer', 'Role', 'Designated Privacy Officer'],
  ['Alice', 'User', 'Alice (CPO)'],
];

const ex1bAsBuilt = enterpriseModel('Thesis Ch.7 Ex.1(b) — as-built enterprise (stale CPO identity notice, no ProvideCPOIdentity)', {
  entities: ex1bEntities,
  relations: [
    ['Contains', 'Privacy', 'DesignatePrivacyOfficer'],
    ['Contains', 'Privacy', 'ArchiveCPOContactNotice'],
    ['AssignedTo', 'PrivacyOfficer', 'OverseePrivacyCompliance'],
    ['Acts', 'PrivacyOfficer', 'Alice'],
  ],
});

const ex1bRemediated = enterpriseModel('Thesis Ch.7 Ex.1(b) — remediated enterprise (ProvideCPOIdentity added to Privacy)', {
  entities: ex1bEntities,
  relations: [
    ['Contains', 'Privacy', 'DesignatePrivacyOfficer'],
    ['Contains', 'Privacy', 'ProvideCPOIdentity'],
    ['Contains', 'Privacy', 'ArchiveCPOContactNotice'],
    ['AssignedTo', 'PrivacyOfficer', 'OverseePrivacyCompliance'],
    ['Acts', 'PrivacyOfficer', 'Alice'],
  ],
});

// ── Case 3 — Thesis Ch.8 SOX ────────────────────────────────────────────────

const soxEntities: Array<[string, 'Process' | 'Activity' | 'Role' | 'User', string?]> = [
  ['ProcureParent', 'Process', 'Procurement (parent process)'],
  ['Receiving', 'Process', 'Receiving'],
  ['Purchasing', 'Process', 'Purchasing'],
  ['NonAuditP', 'Process', 'Non-audit services'],
  ['ReceiveGoods', 'Activity', 'Receive goods'],
  ['IssuePurchaseOrder', 'Activity', 'Issue purchase order'],
  ['Bookkeeping', 'Activity', 'Bookkeeping services'],
  ['ProcurementClerk', 'Role', 'Procurement clerk'],
  ['ReceivingClerk', 'Role', 'Receiving clerk'],
  ['PurchasingClerk', 'Role', 'Purchasing clerk'],
  ['IndepAuditor', 'Role', 'Independent auditor'],
  ['ConsultingStaff', 'Role', 'Consulting staff'],
  ['Carol', 'User', 'Carol'],
  ['Dave', 'User', 'Dave'],
  ['Erin', 'User', 'Erin'],
  ['Frank', 'User', 'Frank'],
];

const soxStructure: Array<['ComposedOf' | 'Contains', string, string]> = [
  ['ComposedOf', 'ProcureParent', 'Receiving'],
  ['ComposedOf', 'ProcureParent', 'Purchasing'],
  ['Contains', 'Receiving', 'ReceiveGoods'],
  ['Contains', 'Purchasing', 'IssuePurchaseOrder'],
  ['Contains', 'NonAuditP', 'Bookkeeping'],
];

const soxAsBuilt = enterpriseModel('Thesis Ch.8 SOX — as-built enterprise (composite procurement process; auditor assumes non-audit process)', {
  entities: soxEntities,
  relations: [
    ...soxStructure,
    ['Acts', 'ProcurementClerk', 'Carol'],
    ['Assumes', 'Carol', 'ProcureParent'],
    ['Acts', 'IndepAuditor', 'Dave'],
    ['Assumes', 'Dave', 'NonAuditP'],
  ],
}, { country: 'US', level: 'Federal', name: 'Example issuer' });

const soxRemediated = enterpriseModel('Thesis Ch.8 SOX — remediated enterprise (duties split; auditor kept out of non-audit work)', {
  entities: soxEntities,
  relations: [
    ...soxStructure,
    ['Acts', 'ReceivingClerk', 'Carol'],
    ['Assumes', 'Carol', 'Receiving'],
    ['Acts', 'PurchasingClerk', 'Frank'],
    ['Assumes', 'Frank', 'Purchasing'],
    ['Acts', 'IndepAuditor', 'Dave'],
    ['Acts', 'ConsultingStaff', 'Erin'],
    ['Assumes', 'Erin', 'NonAuditP'],
  ],
}, { country: 'US', level: 'Federal', name: 'Example issuer' });

export const ENTERPRISE_COMPARISON_CASES: EnterpriseComparisonCase[] = [
  {
    id: 'thesis-ch7-ex2',
    title: 'Thesis Ch.7 Ex.2: Access Right Interaction via Role Closure',
    thesisReference: 'Hassan (2009), Chapter 7, Example 2',
    description:
      'The law (Φ_L) prohibits the privacy division PrivDiv from AccessPI: CanAssignTo(Deny, AccessPI, PrivDiv). The enterprise (Φ_E) separately grants FinAdminAssistants the AccessPI activity. AdminAssistant1 acts in both roles.',
    lawModel: pipedaAccessLawModel,
    asBuiltEnterpriseModel: ex2AsBuilt,
    remediatedEnterpriseModel: ex2Remediated,
    explanation:
      'No single role holds both the permit and the deny, so a per-relation diff finds nothing. Over the closure of the combined model, AdminAssistant1 effectively reaches AccessPI through FinAdminAssistants while PrivDiv is barred from it, so Con fails with ACTIVITY_CONFLICT. Removing AdminAssistant1 from PrivDiv (the remediation) restores Con.',
    sufficiencyNote:
      'Con holding after remediation shows the configuration is free of contradictions with this law excerpt. It does not establish organizational compliance with PIPEDA.',
  },
  {
    id: 'thesis-ch7-ex1b',
    title: 'Thesis Ch.7 Ex.1(b): Consistent Yet Non-Compliant (Stale Identity / Ontology Gap)',
    thesisReference: 'Hassan (2009), Chapter 7, Example 1(b); Appendix B finding B2',
    description:
      'PIPEDA 4.1.2 requires the identity of the designated individual to be made known upon request. The enterprise designates a privacy officer but only archives a stale contact notice; it has no ProvideCPOIdentity activity in Privacy.',
    lawModel: lawModelOf('ca-pipeda', 'pipeda-4-1'),
    asBuiltEnterpriseModel: ex1bAsBuilt,
    remediatedEnterpriseModel: ex1bRemediated,
    explanation:
      'Con passes with 0 violations: an absent activity contradicts nothing. The ontology check, however, reports ONTOLOGY_GAP because Privacy does not contain ProvideCPOIdentity at any composition depth. Adding that activity to Privacy satisfies the requirement.',
    sufficiencyNote:
      'Consistency is necessary but not sufficient for compliance: a passing Con can coexist with a missing required structure. Never report "compliant" from Con alone.',
  },
  {
    id: 'thesis-ch8-sox',
    title: 'Thesis Ch.8: SOX §201/§404 Auditor Independence & Segregation of Duties via Process Composition',
    thesisReference: 'Hassan (2009), Chapter 8 (SOX case study)',
    description:
      'The law side carries Separate(Receiving, Purchasing) (a COSO segregation-of-duties practice applied under SOX §404) and CanAssignTo(Deny, Bookkeeping, IndepAuditor) (SOX §201). Carol assumes the composite ProcureParent; Dave, an independent auditor, assumes NonAuditP, which contains Bookkeeping.',
    lawModel: lawModelOf('us-sox', 'sox-201-202-301-404'),
    asBuiltEnterpriseModel: soxAsBuilt,
    remediatedEnterpriseModel: soxRemediated,
    explanation:
      'Carol reaches Receiving and Purchasing through ProcureParent (ComposedOf), which are held in separation: SEPARATION_VIOLATION. Dave reaches Bookkeeping through NonAuditP while IndepAuditor is barred from it: ACTIVITY_CONFLICT. The remediation splits the duties across users and moves non-audit work to ConsultingStaff.',
    sufficiencyNote:
      'SOX §404 mandates an assessment of internal control over financial reporting; segregation of duties is a COSO practice applied under §404, not a statutory rule. A passing Con does not establish SOX compliance.',
  },
];
