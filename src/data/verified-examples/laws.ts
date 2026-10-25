/**
 * Bundled legal sources with provenance, segmented clauses, concept tokens and
 * hand-curated GAL-JSON (Φ_L) models.
 *
 * Honesty notes
 *  - `originalText` holds statutory/regulatory wording, with "[…]" marking
 *    elided words inside a quoted provision. Wording was curated but has not
 *    been machine-diffed against the official URLs, so every provision carries
 *    BUNDLED_READINESS ('unverified-draft') until a human reviewer confirms it.
 *  - A clause that opens with "[Thesis …]", "[COSO …]" or "[Summary …]" is NOT
 *    statutory text; it is a clearly labelled modelling annotation.
 *  - Every sourceSpan is computed from the text (see builders.ts).
 */
import type { LawMetadata } from '../../types/contracts';
import { buildProvision, policy as P, type ProvisionSpec } from './builders';
import { getCountryByCode } from './countries';

type LawHeader = Omit<LawMetadata, 'provisions' | 'readiness'>;

// ═══════════════════════════════════════════════════════════════════════════
// CANADA — PIPEDA
// ═══════════════════════════════════════════════════════════════════════════

const pipeda41: ProvisionSpec = {
  id: 'pipeda-4-1',
  section: 'Schedule 1, Principle 4.1 (4.1, 4.1.1, 4.1.2)',
  title: 'Accountability & Access Restriction',
  language: 'en',
  sourceUrl: 'https://laws-lois.justice.gc.ca/eng/acts/P-8.6/',
  versionDate: '2000-04-13',
  clauses: [
    {
      key: 'a',
      text: "4.1 Principle 1 — Accountability. An organization is responsible for personal information under its control and shall designate an individual or individuals who are accountable for the organization's compliance with the following principles.",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall designate', 'obligation']],
    },
    {
      key: 'b',
      text: "4.1.1 Accountability for the organization's compliance with the principles rests with the designated individual(s), even though other individuals within the organization may have responsibility for the day-to-day collection and processing of personal information. In addition, other individuals within the organization may be delegated to act on behalf of the designated individual(s).",
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['may be delegated', 'delegation']],
    },
    {
      key: 'c',
      text: "4.1.2 The identity of the individual(s) designated by the organization to oversee the organization's compliance with the principles shall be made known upon request.",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall be made known', 'obligation'], ['upon request', 'condition']],
    },
    {
      key: 'd',
      text: '[Thesis Ch.7 Ex.1–2 illustrative organizational policy — not PIPEDA statutory text] The privacy division shall not access personal information.',
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['shall not', 'prohibition']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'An organization', label: 'Organization', category: 'Actor' },
    { clause: 'a', quote: 'designate an individual or individuals', label: 'DesignatePrivacyOfficer', category: 'Activity', entity: 'DesignatePrivacyOfficer' },
    { clause: 'a', quote: 'who are accountable', label: 'PrivacyOfficer', category: 'Role', entity: 'PrivacyOfficer' },
    { clause: 'b', quote: 'may be delegated to act on behalf of the designated individual(s)', label: 'Delegation to DelegatedAgent', category: 'Delegation', entity: 'DelegatedAgent', relation: 'pipeda-4-1:pol2:CanDelegate' },
    { clause: 'c', quote: 'shall be made known', label: 'ProvideCPOIdentity', category: 'Activity', entity: 'ProvideCPOIdentity' },
    { clause: 'c', quote: 'upon request', label: 'On-request trigger', category: 'Condition', verified: false, notes: 'Trigger condition is not representable in Φ; kept as context only.' },
    { clause: 'd', quote: 'The privacy division', label: 'PrivDiv', category: 'Role', entity: 'PrivDiv', notes: 'From the thesis example, not from PIPEDA.' },
    { clause: 'd', quote: 'shall not access personal information', label: 'Deny AccessPI for PrivDiv', category: 'Prohibition', entity: 'AccessPI', relation: 'pipeda-4-1:pol1:CanAssignTo' },
  ],
  model: {
    context: 'PIPEDA Schedule 1 Principle 4.1 Accountability + thesis privacy-division access restriction',
    country: 'CA', level: 'Federal', name: 'Canada (PIPEDA)', effective: '2000-04-13', domains: ['Privacy'],
    entities: [
      ['PrivacyOfficer', 'Role', 'Designated Privacy Officer', 'designate an individual or individuals'],
      ['DelegatedAgent', 'Role', 'Delegate of the Privacy Officer', 'other individuals within the organization may be delegated to act on behalf of the designated individual(s)'],
      ['PrivDiv', 'Role', 'Privacy Division', 'The privacy division', 'Thesis Ch.7 illustrative role; not named in PIPEDA.'],
      ['AccessPI', 'Activity', 'Access personal information', 'access personal information'],
      ['Privacy', 'Process', 'Privacy', 'Principle 1 — Accountability'],
      ['DesignatePrivacyOfficer', 'Activity', 'Designate privacy officer', 'shall designate an individual or individuals'],
      ['ProvideCPOIdentity', 'Activity', 'Provide privacy officer identity', 'shall be made known upon request'],
      ['OverseePrivacyCompliance', 'Activity', 'Oversee privacy compliance', "oversee the organization's compliance with the principles"],
    ],
    relations: [
      ['AssignedTo', 'PrivacyOfficer', 'OverseePrivacyCompliance', "oversee the organization's compliance with the principles", 'The designated individual oversees compliance (4.1.2).'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'AccessPI', 'PrivDiv', { quote: 'The privacy division shall not access personal information', rationale: 'Thesis Ch.7 Ex.1–2 illustrative norm. Canonical direction: source = Activity, target = Role.' }),
      P('CanDelegate', 'Allow', 'PrivacyOfficer', 'DelegatedAgent', { hohfeld: 'Power', activityOrProcess: 'OverseePrivacyCompliance', quote: 'other individuals within the organization may be delegated to act on behalf of the designated individual(s)', rationale: '4.1.1 permits delegation to act on behalf of the designated individual(s).' }),
    ],
    ontology: [
      { id: '4.1.0', process: 'Privacy', activity: 'DesignatePrivacyOfficer', rationale: '4.1: the organization shall designate an accountable individual.', quote: 'shall designate an individual or individuals' },
      { id: '4.1.2', process: 'Privacy', activity: 'ProvideCPOIdentity', rationale: '4.1.2: the identity of the designated individual shall be made known upon request.', quote: 'shall be made known upon request' },
    ],
  },
};

const pipeda45: ProvisionSpec = {
  id: 'pipeda-4-5',
  section: 'Schedule 1, Principle 4.5 (4.5, 4.5.3)',
  title: 'Limiting Retention & Disposal Sequencing',
  language: 'en',
  sourceUrl: 'https://laws-lois.justice.gc.ca/eng/acts/P-8.6/',
  versionDate: '2000-04-13',
  clauses: [
    {
      key: 'a',
      text: '4.5 Principle 5 — Limiting Use, Disclosure, and Retention. Personal information shall not be used or disclosed for purposes other than those for which it was collected, except with the consent of the individual or as required by law. Personal information shall be retained only as long as necessary for the fulfilment of those purposes.',
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['shall not be used or disclosed', 'prohibition'], ['except with the consent', 'exception'], ['only as long as necessary', 'condition']],
    },
    {
      key: 'b',
      text: '4.5.3 Personal information that is no longer required to fulfil the identified purposes should be destroyed, erased, or made anonymous. Organizations shall develop guidelines and implement procedures to govern the destruction of personal information.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['should be destroyed', 'obligation'], ['shall develop', 'obligation']],
    },
    {
      key: 'c',
      text: '[Thesis Ch.7 Ex.4 illustrative workflow — not PIPEDA statutory text] Before the data is disposed of, the client shall be thanked and the information shall be saved.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['Before', 'condition'], ['shall be thanked', 'obligation'], ['shall be saved', 'obligation']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'retained only as long as necessary for the fulfilment of those purposes', label: 'Deny retention beyond purpose', category: 'Prohibition', entity: 'RetainBeyondPurpose', relation: 'pipeda-4-5:pol1:CanAssignTo' },
    { clause: 'a', quote: 'except with the consent of the individual or as required by law', label: 'Consent / legal-requirement exception', category: 'Exception', verified: false, notes: 'Exception for use/disclosure is not represented in this retention-focused provision model.' },
    { clause: 'b', quote: 'destroyed, erased, or made anonymous', label: 'DisposeData', category: 'Activity', entity: 'DisposeData' },
    { clause: 'b', quote: 'Organizations', label: 'Organization', category: 'Role', entity: 'Organization' },
    { clause: 'c', quote: 'the client shall be thanked', label: 'ThankClient', category: 'Ordering', entity: 'ThankClient', notes: 'Thesis workflow step; precedence ThankClient → DisposeData.' },
    { clause: 'c', quote: 'the information shall be saved', label: 'SaveInfo', category: 'Ordering', entity: 'SaveInfo', notes: 'Thesis workflow step; precedence SaveInfo → DisposeData.' },
  ],
  model: {
    context: 'PIPEDA Schedule 1 Principle 4.5 Limiting Use, Disclosure and Retention + thesis disposal sequencing',
    country: 'CA', level: 'Federal', name: 'Canada (PIPEDA)', effective: '2000-04-13', domains: ['Privacy'],
    entities: [
      ['Organization', 'Role', 'Organization', 'Organizations'],
      ['Retention', 'Process', 'Retention', 'Limiting Use, Disclosure, and Retention'],
      ['RetainBeyondPurpose', 'Activity', 'Retain beyond purpose', 'retained only as long as necessary for the fulfilment of those purposes'],
      ['DisposeData', 'Activity', 'Dispose of data', 'destroyed, erased, or made anonymous'],
      ['SaveInfo', 'Activity', 'Save information', 'the information shall be saved', 'Thesis Ch.7 Ex.4 step.'],
      ['ThankClient', 'Activity', 'Thank client', 'the client shall be thanked', 'Thesis Ch.7 Ex.4 step.'],
    ],
    relations: [
      ['AssignedTo', 'Organization', 'DisposeData', 'destroyed, erased, or made anonymous', '4.5.3 uses "should"; modelled as an assigned duty.'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'RetainBeyondPurpose', 'Organization', { quote: 'Personal information shall be retained only as long as necessary for the fulfilment of those purposes', rationale: 'Retention beyond the fulfilment of the purposes is prohibited.' }),
    ],
    ontology: [
      { id: '4.5.3', process: 'Retention', activity: 'DisposeData', rationale: '4.5.3: information no longer required should be destroyed, erased or made anonymous.', quote: 'destroyed, erased, or made anonymous' },
    ],
    scenarios: [
      { id: '4.5.3-S1', kind: 'precedence', from: 'SaveInfo', to: 'DisposeData', rationale: 'Thesis Ch.7 Ex.4: the information is saved before the data is disposed of.', quote: 'the information shall be saved' },
      { id: '4.5.3-S2', kind: 'precedence', from: 'ThankClient', to: 'DisposeData', rationale: 'Thesis Ch.7 Ex.4: the client is thanked before the data is disposed of.', quote: 'the client shall be thanked' },
    ],
  },
  ambiguous: [
    { id: 'pipeda-4-5:amb1', clause: 'b', description: 'Principle 4.5.3 is phrased with "should" (recommendation) in its first sentence and "shall" in its second; the model treats disposal as an obligation for demonstration purposes.', quote: 'should be destroyed' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// CANADA (ONTARIO) — PHIPA
// ═══════════════════════════════════════════════════════════════════════════

const phipaCore: ProvisionSpec = {
  id: 'phipa-12-29-37',
  section: 'ss. 12(1), 29, 37(1)(a)',
  title: 'Security safeguards, consent and unauthorized use/disclosure',
  language: 'en',
  sourceUrl: 'https://www.ontario.ca/laws/statute/04p03',
  versionDate: '2004-11-01',
  clauses: [
    {
      key: 'a',
      text: "12 (1) A health information custodian shall take steps that are reasonable in the circumstances to ensure that personal health information in the custodian's custody or control is protected against theft, loss and unauthorized use or disclosure and to ensure that the records containing the information are protected against unauthorized copying, modification or disposal.",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall take steps', 'obligation'], ['unauthorized use or disclosure', 'prohibition']],
    },
    {
      key: 'b',
      text: "29 A health information custodian shall not collect, use or disclose personal health information about an individual unless, (a) it has the individual's consent under this Act and the collection, use or disclosure, as the case may be, to the best of the custodian's knowledge, is necessary for a lawful purpose; or (b) the collection, use or disclosure, as the case may be, is permitted or required by this Act.",
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['shall not', 'prohibition'], ['unless', 'exception'], ["the individual's consent", 'condition']],
    },
    {
      key: 'c',
      text: '37 (1) A health information custodian may use personal health information about an individual, (a) for the purpose for which the information was collected or created and for all the functions reasonably necessary for carrying out that purpose, but not if the information was collected with the consent of the individual or under clause 36 (1) (b) and the individual expressly instructs otherwise;',
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['may use', 'permission'], ['expressly instructs otherwise', 'exception']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'A health information custodian', label: 'HealthInformationCustodian', category: 'Role', entity: 'HealthInformationCustodian' },
    { clause: 'a', quote: 'take steps that are reasonable in the circumstances', label: 'SafeguardPHI', category: 'Activity', entity: 'SafeguardPHI', relation: 'phipa-12-29-37:rel1:AssignedTo' },
    { clause: 'a', quote: 'unauthorized use or disclosure', label: 'Unauthorized use/disclosure', category: 'Prohibition', entity: 'UnauthorizedAgent', relation: 'phipa-12-29-37:pol1:CanAssignTo' },
    { clause: 'b', quote: 'shall not collect, use or disclose personal health information', label: 'DisclosePHI (prohibited absent consent/authority)', category: 'Prohibition', entity: 'DisclosePHI' },
    { clause: 'b', quote: "it has the individual's consent under this Act", label: 'Consent condition (s. 29(a))', category: 'Condition', verified: false, notes: 'Consent state is not a Φ sort; represented via legal_basis on the Allow policy.' },
    { clause: 'c', quote: 'may use personal health information about an individual', label: 'UsePHI', category: 'Permission', entity: 'UsePHI', relation: 'phipa-12-29-37:pol2:CanAssignTo' },
  ],
  model: {
    context: 'Ontario PHIPA ss. 12(1), 29 and 37(1)(a): safeguards, consent, and unauthorized use/disclosure',
    country: 'CA', level: 'Provincial', name: 'Ontario (PHIPA)', effective: '2004-11-01', domains: ['Privacy'],
    entities: [
      ['HealthInformationCustodian', 'Role', 'Health information custodian', 'health information custodian'],
      ['UnauthorizedAgent', 'Role', 'Unauthorized agent', 'unauthorized use or disclosure', 'Any person not authorized by the custodian or the Act.'],
      ['SafeguardPHI', 'Activity', 'Safeguard personal health information', 'take steps that are reasonable in the circumstances'],
      ['DisclosePHI', 'Activity', 'Disclose personal health information', 'collect, use or disclose personal health information'],
      ['UsePHI', 'Activity', 'Use personal health information', 'may use personal health information about an individual'],
    ],
    relations: [
      ['AssignedTo', 'HealthInformationCustodian', 'SafeguardPHI', 'shall take steps that are reasonable in the circumstances', 's. 12(1) duty of the custodian.'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'DisclosePHI', 'UnauthorizedAgent', { quote: 'protected against theft, loss and unauthorized use or disclosure', rationale: 'Ss. 12(1) and 29 together prohibit unauthorized use/disclosure.' }),
      P('CanAssignTo', 'Allow', 'UsePHI', 'HealthInformationCustodian', { quote: 'A health information custodian may use personal health information about an individual', legalBasis: 'PHIPA s. 37(1)(a)', rationale: 'Use for the purpose of collection is permitted.' }),
      P('CanAssignTo', 'Allow', 'DisclosePHI', 'HealthInformationCustodian', { quote: "it has the individual's consent under this Act", legalBasis: 'PHIPA s. 29(a) consent', consentType: 'Express', rationale: 'Conditional permission (consent or permitted-by-Act).' }),
    ],
  },
  ambiguous: [
    { id: 'phipa-12-29-37:amb1', clause: 'b', description: 'Section 29 offers two alternative bases ((a) consent plus necessity for a lawful purpose, or (b) permitted or required by the Act). The model records the Allow policy once with consent as its legal basis and does not enumerate the permitted-by-Act cases.', quote: 'permitted or required by this Act' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// CANADA (QUEBEC) — Law 25
// ═══════════════════════════════════════════════════════════════════════════

const qcLaw25: ProvisionSpec = {
  id: 'qc-p39-1-law25',
  section: 'ss. 3.1, 3.3, 12, 14; ss. 90.1 et seq. (penalties)',
  title: 'Privacy officer, mandatory PIA, secondary-use consent, and penalties',
  language: 'en',
  sourceUrl: 'https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1',
  versionDate: '2023-09-22',
  clauses: [
    {
      key: 'a',
      text: '3.1 Any person carrying on an enterprise is responsible for protecting the personal information held by the person. Within the enterprise, the person exercising the highest authority shall see to ensuring that this Act is implemented and complied with. That person shall exercise the function of person in charge of the protection of personal information; the person may delegate all or part of that function in writing to any person.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall see to ensuring', 'obligation'], ['may delegate', 'delegation']],
    },
    {
      key: 'b',
      text: '3.3 Any person carrying on an enterprise must conduct an assessment of the privacy-related factors of any project to acquire, develop or overhaul an information system or electronic service delivery system involving the collection, use, communication, keeping or destruction of personal information.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['must conduct', 'obligation']],
    },
    {
      key: 'c',
      text: '12 Personal information may be used within an enterprise only for the purposes for which it was collected, unless the person concerned consents to its use for another purpose. Consent must be given expressly when it concerns sensitive personal information.',
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['only for the purposes', 'prohibition'], ['unless the person concerned consents', 'exception'], ['must be given expressly', 'obligation']],
    },
    {
      key: 'd',
      text: '14 Consent to the collection, communication or use of personal information must be manifest, free, and enlightened, and must be given for specific purposes. It must be requested for each such purpose, in clear and simple language and separately from any other information provided to the person concerned.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['must be manifest', 'obligation']],
    },
    {
      key: 'e',
      text: "[Summary of ss. 90.1 et seq. — condensed, not verbatim] The Commission d'accès à l'information may impose an administrative monetary penalty of up to $10,000,000 or, if greater, the amount corresponding to 2% of worldwide turnover for the preceding fiscal year.",
      polarity: 'Allow', deontic: 'Unmapped', supported: false,
      unmappedReason: 'Administrative monetary penalty amounts (up to $10M or 2% of worldwide turnover) are quantitative financial sanctions. They sit outside the core relational sorts of Φ (Process, Activity, Role, User), so they cannot be expressed as a GAM relation or policy and are reported as unmapped rather than approximated.',
      keywords: [['may impose', 'permission']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'the person exercising the highest authority', label: 'HighestAuthority', category: 'Role', entity: 'HighestAuthority' },
    { clause: 'a', quote: 'person in charge of the protection of personal information', label: 'PersonInCharge', category: 'Role', entity: 'PersonInCharge' },
    { clause: 'a', quote: 'may delegate all or part of that function in writing to any person', label: 'Delegation in writing', category: 'Delegation', relation: 'qc-p39-1-law25:pol1:CanDelegate' },
    { clause: 'b', quote: 'conduct an assessment of the privacy-related factors', label: 'ConductPIA', category: 'Activity', entity: 'ConductPIA' },
    { clause: 'b', quote: 'acquire, develop or overhaul an information system or electronic service delivery system', label: 'DeployInformationSystem', category: 'Activity', entity: 'DeployInformationSystem' },
    { clause: 'b', quote: 'any project to acquire, develop or overhaul', label: 'PIA before deployment (implied ordering)', category: 'Ordering', verified: false, notes: 'Ordering ConductPIA → DeployInformationSystem is an interpretation of s. 3.3, not explicit text.' },
    { clause: 'c', quote: 'unless the person concerned consents to its use for another purpose', label: 'SecondaryUseWithoutConsent', category: 'Prohibition', entity: 'SecondaryUseWithoutConsent', relation: 'qc-p39-1-law25:pol2:CanAssignTo' },
    { clause: 'e', quote: '$10,000,000 or, if greater, the amount corresponding to 2% of worldwide turnover', label: 'Administrative monetary penalty', category: 'Unmapped', verified: false, notes: 'Quantitative sanction; outside Φ.' },
  ],
  model: {
    context: 'Quebec Law 25: P-39.1 ss. 3.1, 3.3, 12, 14',
    country: 'CA', level: 'Provincial', name: 'Quebec (Law 25)', effective: '2023-09-22', domains: ['Privacy'],
    entities: [
      ['HighestAuthority', 'Role', 'Person exercising the highest authority', 'the person exercising the highest authority'],
      ['PersonInCharge', 'Role', 'Person in charge of the protection of personal information', 'person in charge of the protection of personal information'],
      ['EnterpriseStaff', 'Role', 'Enterprise personnel', 'within an enterprise'],
      ['ProtectPersonalInformation', 'Activity', 'Protect personal information', 'responsible for protecting the personal information held by the person'],
      ['ConductPIA', 'Activity', 'Conduct privacy impact assessment', 'conduct an assessment of the privacy-related factors'],
      ['DeployInformationSystem', 'Activity', 'Deploy information system', 'acquire, develop or overhaul an information system or electronic service delivery system'],
      ['SecondaryUseWithoutConsent', 'Activity', 'Use personal information for another purpose without consent', 'unless the person concerned consents to its use for another purpose', 'The activity is named to carry its own condition (absence of consent) because Φ has no consent sort.'],
      ['InformationSystemProject', 'Process', 'Information-system project', 'any project to acquire, develop or overhaul'],
    ],
    relations: [
      ['AssignedTo', 'PersonInCharge', 'ProtectPersonalInformation', 'That person shall exercise the function of person in charge of the protection of personal information', 's. 3.1 function of the designated person.'],
    ],
    policies: [
      P('CanDelegate', 'Allow', 'HighestAuthority', 'PersonInCharge', { hohfeld: 'Power', activityOrProcess: 'ProtectPersonalInformation', quote: 'the person may delegate all or part of that function in writing to any person', rationale: 's. 3.1 delegation in writing.' }),
      P('CanAssignTo', 'Deny', 'SecondaryUseWithoutConsent', 'EnterpriseStaff', { quote: 'may be used within an enterprise only for the purposes for which it was collected', rationale: 's. 12 limits use to the collection purposes absent consent.' }),
    ],
    ontology: [
      { id: '3.3', process: 'InformationSystemProject', activity: 'ConductPIA', rationale: 's. 3.3: a privacy-factor assessment is required for such projects.', quote: 'conduct an assessment of the privacy-related factors' },
    ],
    scenarios: [
      { id: '3.3-S1', kind: 'precedence', from: 'ConductPIA', to: 'DeployInformationSystem', rationale: 'Interpretation of s. 3.3: the assessment is conducted for the project before the system is deployed.', quote: 'any project to acquire, develop or overhaul' },
    ],
  },
  ambiguous: [
    { id: 'qc-p39-1-law25:amb1', clause: 'c', description: 'Section 12 continues with enumerated cases in which secondary use is allowed without consent (e.g. purposes consistent with collection). Those exceptions are not reproduced or modelled here.', quote: 'unless the person concerned consents to its use for another purpose' },
    { id: 'qc-p39-1-law25:amb2', clause: 'b', description: 'Section 3.3 does not literally say "before deployment"; the precedence requirement ConductPIA → DeployInformationSystem is an interpretation.', quote: 'any project to acquire, develop or overhaul' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// UNITED STATES — HIPAA, CCPA/CPRA, SOX
// ═══════════════════════════════════════════════════════════════════════════

const hipaa: ProvisionSpec = {
  id: 'hipaa-164-502',
  section: '45 C.F.R. § 164.502(a), (b)(1), (b)(2)(i)',
  title: 'Permitted/prohibited disclosures and minimum necessary',
  language: 'en',
  sourceUrl: 'https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.502',
  versionDate: '2013-03-26',
  clauses: [
    {
      key: 'a',
      text: '§ 164.502(a) Standard. A covered entity or business associate may not use or disclose protected health information, except as permitted or required by this subpart or by subpart C of part 160 of this subchapter.',
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['may not use or disclose', 'prohibition'], ['except as permitted or required', 'exception']],
    },
    {
      key: 'b',
      text: '§ 164.502(b)(1) Standard: Minimum necessary. When using or disclosing protected health information or when requesting protected health information from another covered entity or business associate, a covered entity or business associate must make reasonable efforts to limit protected health information to the minimum necessary to accomplish the intended purpose of the use, disclosure, or request.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['must make reasonable efforts', 'obligation']],
    },
    {
      key: 'c',
      text: '§ 164.502(b)(2)(i) Minimum necessary does not apply. This requirement does not apply to: (i) Disclosures to or requests by a health care provider for treatment;',
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['does not apply', 'exception']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'A covered entity', label: 'CoveredEntity', category: 'Role', entity: 'CoveredEntity' },
    { clause: 'a', quote: 'business associate', label: 'BusinessAssociate', category: 'Role', entity: 'BusinessAssociate' },
    { clause: 'a', quote: 'may not use or disclose protected health information', label: 'DiscloseUnpermittedPHI', category: 'Prohibition', entity: 'DiscloseUnpermittedPHI', relation: 'hipaa-164-502:pol1:CanAssignTo' },
    { clause: 'b', quote: 'limit protected health information to the minimum necessary', label: 'LimitToMinimumNecessary', category: 'Activity', entity: 'LimitToMinimumNecessary', relation: 'hipaa-164-502:rel1:AssignedTo' },
    { clause: 'c', quote: 'Disclosures to or requests by a health care provider for treatment', label: 'DiscloseForTreatment', category: 'Exception', entity: 'DiscloseForTreatment', relation: 'hipaa-164-502:pol3:CanAssignTo' },
  ],
  model: {
    context: 'HIPAA Privacy Rule 45 C.F.R. § 164.502(a)-(b): permitted/prohibited disclosures and minimum necessary',
    country: 'US', level: 'Federal', name: 'United States (HIPAA)', effective: '2003-04-14', domains: ['Privacy'],
    entities: [
      ['CoveredEntity', 'Role', 'Covered entity', 'covered entity'],
      ['BusinessAssociate', 'Role', 'Business associate', 'business associate'],
      ['DiscloseUnpermittedPHI', 'Activity', 'Use or disclose PHI without permission', 'may not use or disclose protected health information', 'Named to carry its condition (not permitted or required) because Φ has no condition sort.'],
      ['LimitToMinimumNecessary', 'Activity', 'Limit PHI to the minimum necessary', 'make reasonable efforts to limit protected health information to the minimum necessary'],
      ['DiscloseForTreatment', 'Activity', 'Disclose PHI for treatment', 'Disclosures to or requests by a health care provider for treatment'],
    ],
    relations: [
      ['AssignedTo', 'CoveredEntity', 'LimitToMinimumNecessary', 'must make reasonable efforts to limit protected health information to the minimum necessary', '§ 164.502(b)(1) duty.'],
      ['AssignedTo', 'BusinessAssociate', 'LimitToMinimumNecessary', 'must make reasonable efforts to limit protected health information to the minimum necessary', '§ 164.502(b)(1) duty.'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'DiscloseUnpermittedPHI', 'CoveredEntity', { quote: 'may not use or disclose protected health information', rationale: '§ 164.502(a) general prohibition.' }),
      P('CanAssignTo', 'Deny', 'DiscloseUnpermittedPHI', 'BusinessAssociate', { quote: 'may not use or disclose protected health information', rationale: '§ 164.502(a) applies to business associates too.' }),
      P('CanAssignTo', 'Allow', 'DiscloseForTreatment', 'CoveredEntity', { quote: 'Disclosures to or requests by a health care provider for treatment', rationale: '§ 164.502(b)(2)(i) treatment disclosures are exempt from minimum necessary.' }),
    ],
  },
};

const ccpa: ProvisionSpec = {
  id: 'ccpa-1798-100-105-120',
  section: 'Cal. Civ. Code §§ 1798.100(c)-(d), 1798.105(a), (c)(1), 1798.120(a), (d)',
  title: 'Purpose limitation, right to delete, and opt-out of sale/sharing',
  language: 'en',
  sourceUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5',
  versionDate: '2023-01-01',
  clauses: [
    {
      key: 'a',
      text: "1798.100(c) A business' collection, use, retention, and sharing of a consumer's personal information shall be reasonably necessary and proportionate to achieve the purposes for which the personal information was collected or processed, or for another disclosed purpose that is compatible with the context in which the personal information was collected, and not further processed in a manner that is incompatible with those purposes.",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall be reasonably necessary and proportionate', 'obligation']],
    },
    {
      key: 'b',
      text: "1798.100(d) A business that collects a consumer's personal information and that sells that personal information to, or shares it with, a third party or that discloses it to a service provider or contractor for a business purpose shall enter into an agreement with the third party, service provider, or contractor, that: (1) Specifies that the personal information is sold or disclosed by the business only for limited and specified purposes.",
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['shall enter into an agreement', 'obligation'], ['only for limited and specified purposes', 'prohibition']],
    },
    {
      key: 'c',
      text: '1798.105(a) A consumer shall have the right to request that a business delete any personal information about the consumer which the business has collected from the consumer.',
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['right to request', 'permission']],
    },
    {
      key: 'd',
      text: "1798.105(c)(1) A business that receives a verifiable consumer request from a consumer to delete the consumer's personal information pursuant to subdivision (a) of this section shall delete the consumer's personal information from its records, notify any service providers or contractors to delete the consumer's personal information from their records, and notify all third parties to whom the business has sold or shared the personal information to delete the consumer's personal information unless this proves impossible or involves disproportionate effort.",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall delete', 'obligation'], ['unless this proves impossible', 'exception']],
    },
    {
      key: 'e',
      text: "1798.120(a) A consumer shall have the right, at any time, to direct a business that sells or shares personal information about the consumer to third parties not to sell or share the consumer's personal information. This right may be referred to as the right to opt-out of sale or sharing.",
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['right to opt-out of sale or sharing', 'permission']],
    },
    {
      key: 'f',
      text: "1798.120(d) A business that has received direction from a consumer not to sell or share the consumer's personal information […] shall be prohibited from selling or sharing the consumer's personal information after its receipt of the consumer's direction, unless the consumer subsequently provides consent, for the sale or sharing of the consumer's personal information.",
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['shall be prohibited', 'prohibition'], ['unless the consumer subsequently provides consent', 'exception']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'A business', label: 'Business', category: 'Role', entity: 'Business' },
    { clause: 'b', quote: 'service provider or contractor', label: 'ServiceProvider', category: 'Role', entity: 'ServiceProvider' },
    { clause: 'b', quote: 'only for limited and specified purposes', label: 'Deny UseBeyondSpecifiedPurpose', category: 'Prohibition', entity: 'UseBeyondSpecifiedPurpose', relation: 'ccpa-1798-100-105-120:pol2:CanAssignTo' },
    { clause: 'd', quote: "shall delete the consumer's personal information from its records", label: 'DeleteConsumerPI', category: 'Activity', entity: 'DeleteConsumerPI', relation: 'ccpa-1798-100-105-120:pol3:CanAssignTo' },
    { clause: 'd', quote: 'notify any service providers or contractors to delete', label: 'NotifyServiceProviders', category: 'Activity', entity: 'NotifyServiceProviders' },
    { clause: 'd', quote: 'unless this proves impossible or involves disproportionate effort', label: 'Impossibility exception', category: 'Exception', verified: false, notes: 'Exception state is not representable in Φ.' },
    { clause: 'f', quote: "selling or sharing the consumer's personal information after its receipt of the consumer's direction", label: 'SellConsumerPI after opt-out', category: 'Prohibition', entity: 'SellConsumerPI', relation: 'ccpa-1798-100-105-120:pol1:CanAssignTo' },
  ],
  model: {
    context: 'California CCPA/CPRA §§ 1798.100, 1798.105, 1798.120',
    country: 'US', level: 'State', name: 'California (CCPA/CPRA)', effective: '2023-01-01', domains: ['Privacy'],
    entities: [
      ['Business', 'Role', 'Business', 'A business'],
      ['ServiceProvider', 'Role', 'Service provider or contractor', 'service provider or contractor'],
      ['OptedOutProcessor', 'Role', 'Processor bound by a consumer opt-out', 'A business that has received direction from a consumer not to sell or share', 'Role held by whoever processes personal information of a consumer who has opted out.'],
      ['SellConsumerPI', 'Activity', "Sell or share the consumer's personal information", "selling or sharing the consumer's personal information after its receipt"],
      ['DeleteConsumerPI', 'Activity', "Delete the consumer's personal information", "shall delete the consumer's personal information from its records"],
      ['NotifyServiceProviders', 'Activity', 'Notify service providers to delete', 'notify any service providers or contractors to delete'],
      ['UseBeyondSpecifiedPurpose', 'Activity', 'Use personal information beyond specified purposes', 'only for limited and specified purposes'],
    ],
    relations: [
      ['AssignedTo', 'Business', 'DeleteConsumerPI', "shall delete the consumer's personal information from its records", '§ 1798.105(c)(1) duty on receipt of a verifiable request.'],
      ['AssignedTo', 'Business', 'NotifyServiceProviders', 'notify any service providers or contractors to delete', '§ 1798.105(c)(1) downstream notification duty.'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'SellConsumerPI', 'OptedOutProcessor', { quote: 'shall be prohibited from selling or sharing', rationale: '§ 1798.120(d): no sale/sharing after the opt-out direction unless consent is later given.' }),
      P('CanAssignTo', 'Deny', 'UseBeyondSpecifiedPurpose', 'ServiceProvider', { quote: 'only for limited and specified purposes', rationale: '§ 1798.100(d)(1): the agreement limits disclosure to specified purposes.' }),
      P('CanAssignTo', 'Allow', 'DeleteConsumerPI', 'Business', { deontic: 'Obligatory', hohfeld: 'Duty', quote: "shall delete the consumer's personal information from its records", rationale: '§ 1798.105(c)(1) deletion duty (consumer holds the corresponding claim-right under § 1798.105(a)).' }),
    ],
  },
};

const sox: ProvisionSpec = {
  id: 'sox-201-202-301-404',
  section: 'Pub. L. 107-204 §§ 201, 202, 301, 404(a)',
  title: 'Auditor independence, audit-committee pre-approval, and ICFR with COSO segregation of duties',
  language: 'en',
  sourceUrl: 'https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm',
  versionDate: '2002-07-30',
  clauses: [
    {
      key: 'a',
      text: '§ 201 (15 U.S.C. § 78j-1(g)) Except as provided in subsection (h), it shall be unlawful for a registered public accounting firm (and any associated person of that firm, to the extent determined appropriate by the Commission) that performs for any issuer any audit required by this title or the rules of the Commission under this title to provide to that issuer, contemporaneously with the audit, any non-audit service, including— (1) bookkeeping or other services related to the accounting records or financial statements of the audit client;',
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['it shall be unlawful', 'prohibition'], ['Except as provided in subsection (h)', 'exception']],
    },
    {
      key: 'b',
      text: '§ 202 (15 U.S.C. § 78j-1(i)(1)(A)) All auditing services (which may entail providing comfort letters in connection with securities underwritings) and non-audit services, other than as provided in subparagraph (B), provided to an issuer by the auditor of the issuer shall be preapproved by the audit committee of the issuer.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall be preapproved', 'obligation']],
    },
    {
      key: 'c',
      text: '§ 202 (15 U.S.C. § 78j-1(i)(3)) The audit committee of an issuer may delegate to 1 or more designated members of the audit committee who are independent directors of the board of directors, the authority to grant preapprovals required by this subsection.',
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['may delegate', 'delegation']],
    },
    {
      key: 'd',
      text: '§ 301 (15 U.S.C. § 78j-1(m)(3)(A)) Each member of the audit committee of the issuer shall be a member of the board of directors of the issuer, and shall otherwise be independent.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall otherwise be independent', 'obligation']],
    },
    {
      key: 'e',
      text: '§ 404(a) The Commission shall prescribe rules requiring each annual report required by section 13(a) or 15(d) of the Securities Exchange Act of 1934 to contain an internal control report, which shall— (1) state the responsibility of management for establishing and maintaining an adequate internal control structure and procedures for financial reporting; and (2) contain an assessment, as of the end of the most recent fiscal year of the issuer, of the effectiveness of the internal control structure and procedures of the issuer for financial reporting.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall prescribe rules', 'obligation']],
    },
    {
      key: 'f',
      text: '[COSO practice applied under § 404 — not statutory text; SOX § 404 mandates an ICFR assessment, it does not itself prescribe segregation of duties] Duties such as receiving and purchasing are segregated so that no single individual controls both.',
      polarity: 'Allow', deontic: 'Constitutive',
      keywords: [['are segregated', 'obligation']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'registered public accounting firm', label: 'IndepAuditor', category: 'Role', entity: 'IndepAuditor' },
    { clause: 'a', quote: 'bookkeeping or other services related to the accounting records', label: 'Bookkeeping', category: 'Prohibition', entity: 'Bookkeeping', relation: 'sox-201-202-301-404:pol1:CanAssignTo' },
    { clause: 'b', quote: 'shall be preapproved by the audit committee', label: 'PreApproval', category: 'Activity', entity: 'PreApproval' },
    { clause: 'c', quote: 'may delegate to 1 or more designated members of the audit committee', label: 'Delegation of pre-approval', category: 'Delegation', entity: 'AuditCmiteeMember', relation: 'sox-201-202-301-404:pol2:CanDelegate' },
    { clause: 'd', quote: 'shall otherwise be independent', label: 'Audit-committee independence', category: 'Condition', verified: false, notes: 'Independence is an attribute, not a Φ relation; recorded as context only.' },
    { clause: 'e', quote: 'an assessment, as of the end of the most recent fiscal year of the issuer', label: 'AssessICFR', category: 'Activity', entity: 'AssessICFR' },
    { clause: 'f', quote: 'receiving and purchasing are segregated', label: 'Separate(Receiving, Purchasing)', category: 'Structure', relation: 'sox-201-202-301-404:rel1:Separate', notes: 'COSO practice, not SOX text.' },
  ],
  model: {
    context: 'Sarbanes-Oxley Act of 2002 §§ 201, 202, 301, 404 with COSO segregation of duties',
    country: 'US', level: 'Federal', name: 'United States (SOX)', effective: '2002-07-30', domains: ['Financial'],
    entities: [
      ['IndepAuditor', 'Role', 'Independent auditor (registered public accounting firm)', 'registered public accounting firm'],
      ['Bookkeeping', 'Activity', 'Bookkeeping services', 'bookkeeping or other services related to the accounting records'],
      ['AuditCmitee', 'Role', 'Audit committee', 'audit committee of the issuer'],
      ['AuditCmiteeMember', 'Role', 'Designated audit-committee member', '1 or more designated members of the audit committee'],
      ['PreApproval', 'Activity', 'Pre-approve audit and non-audit services', 'shall be preapproved by the audit committee'],
      ['Management', 'Role', 'Issuer management', 'responsibility of management'],
      ['AssessICFR', 'Activity', 'Assess internal control over financial reporting', 'an assessment, as of the end of the most recent fiscal year of the issuer'],
      ['Receiving', 'Process', 'Receiving', 'receiving', 'COSO illustration, not statutory text.'],
      ['Purchasing', 'Process', 'Purchasing', 'purchasing', 'COSO illustration, not statutory text.'],
    ],
    relations: [
      ['Separate', 'Receiving', 'Purchasing', 'receiving and purchasing are segregated', 'COSO segregation of duties applied under § 404 (not statutory text).'],
      ['AssignedTo', 'AuditCmitee', 'PreApproval', 'shall be preapproved by the audit committee of the issuer', '§ 202 audit-committee duty.'],
      ['AssignedTo', 'Management', 'AssessICFR', 'state the responsibility of management', '§ 404(a) management responsibility and ICFR assessment.'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'Bookkeeping', 'IndepAuditor', { quote: 'it shall be unlawful for a registered public accounting firm', rationale: '§ 201 prohibits the auditor from providing bookkeeping contemporaneously with the audit.' }),
      P('CanDelegate', 'Allow', 'AuditCmitee', 'AuditCmiteeMember', { hohfeld: 'Power', activityOrProcess: 'PreApproval', quote: 'The audit committee of an issuer may delegate to 1 or more designated members of the audit committee', rationale: '§ 202 (i)(3) delegation of pre-approval authority.' }),
    ],
  },
  ambiguous: [
    { id: 'sox-201-202-301-404:amb1', clause: 'f', description: 'Segregation of duties is a COSO control practice applied when assessing ICFR under § 404; § 404 itself mandates the ICFR report and assessment. The Separate relation is therefore a COSO-derived constraint, not a statutory prohibition.', quote: 'receiving and purchasing are segregated' },
    { id: 'sox-201-202-301-404:amb2', clause: 'a', description: 'Section 201 applies "contemporaneously with the audit" and is subject to exceptions in subsection (h); the unconditional CanAssignTo(Deny) is a deliberate simplification.', quote: 'Except as provided in subsection (h)' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// EUROPEAN UNION — GDPR
// ═══════════════════════════════════════════════════════════════════════════

const gdpr: ProvisionSpec = {
  id: 'gdpr-5-28-32-35',
  section: 'Arts. 5(1)(b)-(e), 28(2)-(3)(a), 32(1), 35(1)',
  title: 'Data-protection principles, processors, security and DPIA',
  language: 'en',
  sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679',
  versionDate: '2016-04-27',
  clauses: [
    {
      key: 'a',
      text: "Article 5(1)(b) Personal data shall be: […] (b) collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes […] ('purpose limitation');",
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['shall be', 'obligation'], ['not further processed', 'prohibition']],
    },
    {
      key: 'b',
      text: "Article 5(1)(c) […] (c) adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation');",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['limited to what is necessary', 'condition']],
    },
    {
      key: 'c',
      text: "Article 5(1)(d) […] (d) accurate and, where necessary, kept up to date; every reasonable step must be taken to ensure that personal data that are inaccurate, having regard to the purposes for which they are processed, are erased or rectified without delay ('accuracy');",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['must be taken', 'obligation']],
    },
    {
      key: 'd',
      text: "Article 5(1)(e) […] (e) kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed […] ('storage limitation');",
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['no longer than is necessary', 'condition']],
    },
    {
      key: 'e',
      text: 'Article 28(2) The processor shall not engage another processor without prior specific or general written authorisation of the controller.',
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['shall not engage', 'prohibition'], ['without prior specific or general written authorisation', 'exception']],
    },
    {
      key: 'f',
      text: 'Article 28(3)(a) […] the processor […] processes the personal data only on documented instructions from the controller, including with regard to transfers of personal data to a third country or an international organisation, unless required to do so by Union or Member State law to which the processor is subject;',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['only on documented instructions', 'condition'], ['unless required to do so', 'exception']],
    },
    {
      key: 'g',
      text: 'Article 32(1) Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk,',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall implement', 'obligation']],
    },
    {
      key: 'h',
      text: 'Article 35(1) Where a type of processing in particular using new technologies, and taking into account the nature, scope, context and purposes of the processing, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['shall, prior to the processing', 'obligation'], ['likely to result in a high risk', 'condition']],
    },
  ],
  concepts: [
    { clause: 'b', quote: 'limited to what is necessary', label: 'LimitToNecessaryData', category: 'Activity', entity: 'LimitToNecessaryData', relation: 'gdpr-5-28-32-35:rel1:AssignedTo' },
    { clause: 'c', quote: 'erased or rectified without delay', label: 'ErasePersonalData', category: 'Activity', entity: 'ErasePersonalData', relation: 'gdpr-5-28-32-35:rel2:AssignedTo' },
    { clause: 'd', quote: 'no longer than is necessary', label: 'Storage limitation', category: 'Condition', verified: false, notes: 'Temporal bound is not representable in Φ.' },
    { clause: 'e', quote: 'The processor', label: 'Processor', category: 'Role', entity: 'Processor' },
    { clause: 'e', quote: 'shall not engage another processor', label: 'SubprocessPersonalData', category: 'Prohibition', entity: 'SubprocessPersonalData', relation: 'gdpr-5-28-32-35:pol1:CanAssignTo' },
    { clause: 'e', quote: 'the controller', label: 'Controller', category: 'Role', entity: 'Controller' },
    { clause: 'f', quote: 'only on documented instructions from the controller', label: 'ProcessOnDocumentedInstructions', category: 'Activity', entity: 'ProcessOnDocumentedInstructions' },
    { clause: 'g', quote: 'implement appropriate technical and organisational measures', label: 'ImplementSecurityMeasures', category: 'Activity', entity: 'ImplementSecurityMeasures' },
    { clause: 'h', quote: 'carry out an assessment of the impact of the envisaged processing operations', label: 'ConductDPIA', category: 'Activity', entity: 'ConductDPIA' },
    { clause: 'h', quote: 'prior to the processing', label: 'ConductDPIA precedes HighRiskProcessing', category: 'Ordering', notes: 'Scenario requirement 35-S1.' },
  ],
  model: {
    context: 'GDPR Arts. 5(1)(b)-(e), 28, 32, 35',
    country: 'EU', level: 'Supranational', name: 'European Union (GDPR)', effective: '2018-05-25', domains: ['Privacy'],
    entities: [
      ['Controller', 'Role', 'Controller', 'the controller'],
      ['Processor', 'Role', 'Processor', 'The processor'],
      ['UnauthorizedSubprocessor', 'Role', 'Sub-processor engaged without authorisation', 'another processor without prior specific or general written authorisation'],
      ['SubprocessPersonalData', 'Activity', 'Sub-process personal data', 'engage another processor'],
      ['ProcessOnDocumentedInstructions', 'Activity', 'Process only on documented instructions', 'only on documented instructions from the controller'],
      ['LimitToNecessaryData', 'Activity', 'Limit data to what is necessary', 'limited to what is necessary'],
      ['ErasePersonalData', 'Activity', 'Erase or rectify inaccurate data', 'erased or rectified without delay'],
      ['ImplementSecurityMeasures', 'Activity', 'Implement security measures', 'implement appropriate technical and organisational measures'],
      ['ConductDPIA', 'Activity', 'Conduct data protection impact assessment', 'carry out an assessment of the impact of the envisaged processing operations'],
      ['HighRiskProcessing', 'Activity', 'High-risk processing', 'likely to result in a high risk to the rights and freedoms of natural persons'],
    ],
    relations: [
      ['AssignedTo', 'Controller', 'LimitToNecessaryData', 'limited to what is necessary', 'Art. 5(1)(c) data minimisation.'],
      ['AssignedTo', 'Controller', 'ErasePersonalData', 'erased or rectified without delay', 'Art. 5(1)(d) accuracy.'],
      ['AssignedTo', 'Processor', 'ProcessOnDocumentedInstructions', 'only on documented instructions from the controller', 'Art. 28(3)(a).'],
      ['AssignedTo', 'Controller', 'ImplementSecurityMeasures', 'the controller and the processor shall implement appropriate technical and organisational measures', 'Art. 32(1).'],
      ['AssignedTo', 'Processor', 'ImplementSecurityMeasures', 'the controller and the processor shall implement appropriate technical and organisational measures', 'Art. 32(1).'],
      ['AssignedTo', 'Controller', 'ConductDPIA', 'the controller shall, prior to the processing, carry out an assessment', 'Art. 35(1).'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'SubprocessPersonalData', 'UnauthorizedSubprocessor', { quote: 'The processor shall not engage another processor without prior specific or general written authorisation of the controller', rationale: 'Art. 28(2): no sub-processing without the controller\'s authorisation.' }),
    ],
    scenarios: [
      { id: '35-S1', kind: 'precedence', from: 'ConductDPIA', to: 'HighRiskProcessing', rationale: 'Art. 35(1): the impact assessment is carried out prior to the processing.', quote: 'prior to the processing' },
    ],
  },
  ambiguous: [
    { id: 'gdpr-5-28-32-35:amb1', clause: 'd', description: 'Art. 5(1)(e) permits longer storage for archiving, research or statistical purposes (elided here with […]); the model captures only the general limitation.', quote: 'no longer than is necessary' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// GERMANY — BDSG
// ═══════════════════════════════════════════════════════════════════════════

const bdsg: ProvisionSpec = {
  id: 'bdsg-22-38',
  section: '§ 22 Abs. 1-2, § 38 Abs. 1-2 (with § 6 Abs. 4)',
  title: 'Besondere Kategorien personenbezogener Daten und Datenschutzbeauftragte nichtöffentlicher Stellen',
  language: 'de',
  sourceUrl: 'https://www.gesetze-im-internet.de/bdsg_2018/',
  versionDate: '2018-05-25',
  clauses: [
    {
      key: 'a',
      text: '§ 22 Abs. 1 Abweichend von Artikel 9 Absatz 1 der Verordnung (EU) 2016/679 ist die Verarbeitung besonderer Kategorien personenbezogener Daten im Sinne des Artikels 9 Absatz 1 der Verordnung (EU) 2016/679 durch öffentliche und nichtöffentliche Stellen zulässig, wenn […]',
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['zulässig', 'permission'], ['wenn', 'condition']],
    },
    {
      key: 'b',
      text: '§ 22 Abs. 2 Satz 1 In den Fällen des Absatzes 1 sind angemessene und spezifische Maßnahmen zur Wahrung der Interessen der betroffenen Person vorzusehen.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['sind', 'obligation'], ['vorzusehen', 'obligation']],
    },
    {
      key: 'c',
      text: '§ 38 Abs. 1 Ergänzend zu Artikel 37 Absatz 1 Buchstabe b und c der Verordnung (EU) 2016/679 benennen der Verantwortliche und der Auftragsverarbeiter eine Datenschutzbeauftragte oder einen Datenschutzbeauftragten, soweit sie in der Regel mindestens 20 Personen ständig mit der automatisierten Verarbeitung personenbezogener Daten beschäftigen.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['benennen', 'obligation'], ['soweit', 'condition']],
    },
    {
      key: 'd',
      text: '§ 38 Abs. 2 § 6 Absatz 4, 5 Satz 2 und Absatz 6 finden Anwendung, § 6 Absatz 4 jedoch nur, wenn die Benennung einer oder eines Datenschutzbeauftragten verpflichtend ist.',
      polarity: 'Allow', deontic: 'Constitutive',
      keywords: [['finden Anwendung', 'condition']],
    },
    {
      key: 'e',
      text: '§ 6 Abs. 4 Satz 1 (anwendbar nach § 38 Abs. 2) Die Abberufung der oder des Datenschutzbeauftragten ist nur in entsprechender Anwendung des § 626 des Bürgerlichen Gesetzbuchs zulässig.',
      polarity: 'Deny', deontic: 'Prohibited',
      keywords: [['ist nur', 'prohibition'], ['zulässig', 'permission']],
    },
  ],
  concepts: [
    { clause: 'a', quote: 'Verarbeitung besonderer Kategorien personenbezogener Daten', label: 'SpecialCategoryProcessing', category: 'Process', entity: 'SpecialCategoryProcessing', notes: 'Special categories of personal data (GDPR Art. 9(1)).' },
    { clause: 'b', quote: 'angemessene und spezifische Maßnahmen zur Wahrung der Interessen der betroffenen Person', label: 'TechnicalOrganizationalSafeguards', category: 'Activity', entity: 'TechnicalOrganizationalSafeguards', relation: 'bdsg-22-38:rel1:Contains', notes: 'Appropriate and specific measures to safeguard the data subject.' },
    { clause: 'c', quote: 'der Verantwortliche und der Auftragsverarbeiter', label: 'ControllerManagement', category: 'Role', entity: 'ControllerManagement', notes: 'Controller and processor.' },
    { clause: 'c', quote: 'eine Datenschutzbeauftragte oder einen Datenschutzbeauftragten', label: 'DataProtectionOfficer', category: 'Role', entity: 'DataProtectionOfficer', notes: 'Data protection officer.' },
    { clause: 'c', quote: 'benennen der Verantwortliche und der Auftragsverarbeiter', label: 'DesignateDPO', category: 'Activity', entity: 'DesignateDPO', relation: 'bdsg-22-38:rel2:AssignedTo', notes: 'Designate a DPO.' },
    { clause: 'c', quote: 'mindestens 20 Personen ständig mit der automatisierten Verarbeitung', label: 'Threshold of 20 persons', category: 'Condition', verified: false, notes: 'Numeric threshold is not representable in Φ; verify the current figure against the official text.' },
    { clause: 'e', quote: 'Die Abberufung der oder des Datenschutzbeauftragten', label: 'DismissDPOForPerformingDuties', category: 'Prohibition', entity: 'DismissDPOForPerformingDuties', relation: 'bdsg-22-38:pol1:CanAssignTo', notes: 'Dismissal of the DPO is restricted to important cause (§ 626 BGB).' },
  ],
  model: {
    context: 'BDSG § 22 (special categories) and § 38 (DPOs of non-public bodies)',
    country: 'DE', level: 'Federal', name: 'Germany (BDSG)', effective: '2018-05-25', domains: ['Privacy'],
    entities: [
      ['SpecialCategoryProcessing', 'Process', 'Processing of special categories of personal data', 'Verarbeitung besonderer Kategorien personenbezogener Daten'],
      ['TechnicalOrganizationalSafeguards', 'Activity', 'Appropriate and specific safeguards', 'angemessene und spezifische Maßnahmen zur Wahrung der Interessen der betroffenen Person'],
      ['ControllerManagement', 'Role', 'Controller and processor management', 'der Verantwortliche und der Auftragsverarbeiter'],
      ['DataProtectionOfficer', 'Role', 'Data protection officer', 'eine Datenschutzbeauftragte oder einen Datenschutzbeauftragten'],
      ['DesignateDPO', 'Activity', 'Designate a data protection officer', 'benennen der Verantwortliche und der Auftragsverarbeiter'],
      ['DismissDPOForPerformingDuties', 'Activity', 'Dismiss the DPO for performing duties', 'Die Abberufung der oder des Datenschutzbeauftragten', 'Named to carry the GDPR Art. 38(3) rationale; § 6(4) BDSG restricts dismissal to important cause (§ 626 BGB).'],
    ],
    relations: [
      ['Contains', 'SpecialCategoryProcessing', 'TechnicalOrganizationalSafeguards', 'angemessene und spezifische Maßnahmen zur Wahrung der Interessen der betroffenen Person', '§ 22 Abs. 2: processing of special categories carries appropriate safeguards.'],
      ['AssignedTo', 'ControllerManagement', 'DesignateDPO', 'benennen der Verantwortliche und der Auftragsverarbeiter', '§ 38 Abs. 1 designation duty.'],
    ],
    policies: [
      P('CanAssignTo', 'Deny', 'DismissDPOForPerformingDuties', 'ControllerManagement', { quote: 'Die Abberufung der oder des Datenschutzbeauftragten ist nur in entsprechender Anwendung des § 626 des Bürgerlichen Gesetzbuchs zulässig', rationale: '§ 6 Abs. 4 BDSG (via § 38 Abs. 2) restricts dismissal; modelled as a prohibition on dismissing the DPO for performing duties.' }),
    ],
  },
  ambiguous: [
    { id: 'bdsg-22-38:amb1', clause: 'e', description: '§ 6 Abs. 4 BDSG permits dismissal only for important cause (§ 626 BGB). The unconditional Deny on "dismissal for performing duties" is a narrowing reading that also reflects GDPR Art. 38(3); it does not model the important-cause exception.', quote: 'ist nur in entsprechender Anwendung des § 626 des Bürgerlichen Gesetzbuchs zulässig' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FRANCE — Loi Informatique et Libertés
// ═══════════════════════════════════════════════════════════════════════════

const lil: ProvisionSpec = {
  id: 'lil-8-44',
  section: 'Articles 8 et 44',
  title: 'Missions de la CNIL et accès aux locaux de traitement',
  language: 'fr',
  sourceUrl: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460',
  versionDate: '2018-06-20',
  clauses: [
    {
      key: 'a',
      text: "Article 8, I La Commission nationale de l'informatique et des libertés est une autorité administrative indépendante. Elle exerce les missions suivantes :",
      polarity: 'Allow', deontic: 'Constitutive',
      keywords: [['autorité administrative indépendante', 'condition']],
    },
    {
      key: 'b',
      text: "Article 8, I, 1° Elle informe toutes les personnes concernées et tous les responsables de traitements de leurs droits et obligations ;",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['informe', 'obligation']],
    },
    {
      key: 'c',
      text: "Article 8, I, 2° Elle veille à ce que les traitements de données à caractère personnel soient mis en œuvre conformément aux dispositions de la présente loi et aux autres dispositions relatives à la protection des données personnelles prévues par les textes législatifs et réglementaires, le droit de l'Union européenne et les engagements internationaux de la France ;",
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['veille à ce que', 'obligation']],
    },
    {
      key: 'd',
      text: "Article 44, I Les membres et les agents de la Commission nationale de l'informatique et des libertés […] peuvent avoir accès, de 6 heures à 21 heures, pour l'exercice de leurs missions, aux lieux, locaux, enceintes, installations ou établissements servant à la mise en œuvre d'un traitement de données à caractère personnel […]",
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['peuvent avoir accès', 'permission'], ['de 6 heures à 21 heures', 'condition']],
    },
  ],
  concepts: [
    { clause: 'a', quote: "La Commission nationale de l'informatique et des libertés", label: 'CNIL', category: 'Role', entity: 'CNIL', notes: 'French data protection authority.' },
    { clause: 'a', quote: 'autorité administrative indépendante', label: 'CNILGovernance', category: 'Process', entity: 'CNILGovernance', notes: 'Independent administrative authority.' },
    { clause: 'b', quote: 'Elle informe toutes les personnes concernées', label: 'InformRightsObligations', category: 'Activity', entity: 'InformRightsObligations', relation: 'lil-8-44:rel3:AssignedTo' },
    { clause: 'b', quote: 'responsables de traitements', label: 'DataController', category: 'Role', entity: 'DataController' },
    { clause: 'c', quote: 'Elle veille à ce que les traitements de données à caractère personnel soient mis en œuvre conformément', label: 'MonitorCompliance', category: 'Activity', entity: 'MonitorCompliance', relation: 'lil-8-44:rel4:AssignedTo' },
    { clause: 'd', quote: 'peuvent avoir accès, de 6 heures à 21 heures', label: 'InspectPremises', category: 'Permission', entity: 'InspectPremises', relation: 'lil-8-44:pol1:CanAssignTo' },
  ],
  model: {
    context: 'Loi n° 78-17 du 6 janvier 1978 (Loi Informatique et Libertés), Articles 8 and 44',
    country: 'FR', level: 'Federal', name: 'France (Loi Informatique et Libertés)', effective: '1978-01-06', domains: ['Privacy'],
    entities: [
      ['CNIL', 'Role', 'CNIL (data protection authority)', "La Commission nationale de l'informatique et des libertés"],
      ['DataController', 'Role', 'Data controller', 'responsables de traitements'],
      ['CNILGovernance', 'Process', 'CNIL governance and supervision', 'autorité administrative indépendante'],
      ['InformRightsObligations', 'Activity', 'Inform of rights and obligations', 'Elle informe toutes les personnes concernées'],
      ['MonitorCompliance', 'Activity', 'Monitor compliance of processing', 'Elle veille à ce que les traitements de données à caractère personnel soient mis en œuvre conformément'],
      ['InspectPremises', 'Activity', 'Access premises where processing is implemented', 'peuvent avoir accès, de 6 heures à 21 heures'],
    ],
    relations: [
      ['Contains', 'CNILGovernance', 'InformRightsObligations', 'Elle informe toutes les personnes concernées', 'Art. 8 I 1°.'],
      ['Contains', 'CNILGovernance', 'MonitorCompliance', 'Elle veille à ce que les traitements de données à caractère personnel soient mis en œuvre conformément', 'Art. 8 I 2°.'],
      ['AssignedTo', 'CNIL', 'InformRightsObligations', 'Elle informe toutes les personnes concernées', 'Art. 8 I 1°.'],
      ['AssignedTo', 'CNIL', 'MonitorCompliance', 'Elle veille à ce que les traitements de données à caractère personnel soient mis en œuvre conformément', 'Art. 8 I 2°.'],
    ],
    policies: [
      P('CanAssignTo', 'Allow', 'InspectPremises', 'CNIL', { hohfeld: 'Power', quote: 'peuvent avoir accès, de 6 heures à 21 heures', rationale: 'Art. 44 I: CNIL members and agents may access premises used for processing, within the stated hours.' }),
    ],
  },
  ambiguous: [
    { id: 'lil-8-44:amb1', clause: 'd', description: "Art. 44 contains further conditions (e.g. out-of-hours access, professional secrecy, judicial authorisation) that are elided with […] and not modelled. Biometric and health-data rules are not part of Arts. 8 and 44 and are not covered by this provision.", quote: 'de 6 heures à 21 heures' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// UNITED KINGDOM — DPA 2018
// ═══════════════════════════════════════════════════════════════════════════

const ukDpa: ProvisionSpec = {
  id: 'dpa-8-64',
  section: 's. 8 (Part 2, Chapter 2); s. 64(1)-(2) (Part 3, Chapter 4)',
  title: 'Public-task processing and data protection impact assessment',
  language: 'en',
  sourceUrl: 'https://www.legislation.gov.uk/ukpga/2018/12/contents',
  versionDate: '2018-05-25',
  clauses: [
    {
      key: 'a',
      text: "s. 8 (Part 2, Chapter 2) In Article 6(1) of the UK GDPR (lawfulness of processing), the reference in point (e) to processing of personal data that is necessary for the performance of a task carried out in the public interest or in the exercise of the controller's official authority includes processing of personal data that is necessary for— (a) the administration of justice, (b) the exercise of a function of either House of Parliament, (c) the exercise of a function conferred on a person by an enactment or rule of law, (d) the exercise of a function of the Crown, a Minister of the Crown or a government department, or (e) an activity that supports or promotes democratic engagement.",
      polarity: 'Allow', deontic: 'Permitted',
      keywords: [['includes processing', 'permission']],
    },
    {
      key: 'b',
      text: 's. 64(1) (Part 3, Chapter 4 — law-enforcement processing) Where a type of processing is likely to result in a high risk to the rights and freedoms of individuals, the controller must, prior to the processing, carry out a data protection impact assessment.',
      polarity: 'Allow', deontic: 'Obligatory',
      keywords: [['must', 'obligation'], ['likely to result in a high risk', 'condition']],
    },
    {
      key: 'c',
      text: 's. 64(2) A data protection impact assessment is an assessment of the impact of the envisaged processing operations on the protection of personal data.',
      polarity: 'Allow', deontic: 'Constitutive',
      keywords: [['is an assessment', 'condition']],
    },
  ],
  concepts: [
    { clause: 'a', quote: "controller's official authority", label: 'Controller', category: 'Role', entity: 'Controller' },
    { clause: 'a', quote: 'processing of personal data that is necessary for the performance of a task carried out in the public interest', label: 'PublicTaskProcessing', category: 'Permission', entity: 'PublicTaskProcessing', relation: 'dpa-8-64:pol1:CanAssignTo' },
    { clause: 'b', quote: 'carry out a data protection impact assessment', label: 'ConductDPIA', category: 'Activity', entity: 'ConductDPIA', relation: 'dpa-8-64:pol2:CanAssignTo' },
    { clause: 'b', quote: 'likely to result in a high risk to the rights and freedoms of individuals', label: 'HighRiskProcessing', category: 'Condition', entity: 'HighRiskProcessing' },
    { clause: 'b', quote: 'prior to the processing', label: 'ConductDPIA precedes HighRiskProcessing', category: 'Ordering', notes: 'Scenario requirement 64-S1.' },
  ],
  model: {
    context: 'UK Data Protection Act 2018 s. 8 (public task) and s. 64 (DPIA)',
    country: 'UK', level: 'Federal', name: 'United Kingdom (DPA 2018)', effective: '2018-05-25', domains: ['Privacy'],
    entities: [
      ['Controller', 'Role', 'Controller', "controller's official authority"],
      ['PublicTaskProcessing', 'Activity', 'Process personal data for a public task', 'processing of personal data that is necessary for the performance of a task carried out in the public interest'],
      ['ConductDPIA', 'Activity', 'Conduct data protection impact assessment', 'carry out a data protection impact assessment'],
      ['HighRiskProcessing', 'Activity', 'High-risk processing', 'likely to result in a high risk to the rights and freedoms of individuals'],
    ],
    relations: [
      ['AssignedTo', 'Controller', 'ConductDPIA', 'the controller must, prior to the processing, carry out a data protection impact assessment', 's. 64(1) controller duty.'],
    ],
    policies: [
      P('CanAssignTo', 'Allow', 'PublicTaskProcessing', 'Controller', { quote: 'includes processing of personal data that is necessary for', legalBasis: 'UK GDPR Art. 6(1)(e) via DPA 2018 s. 8', rationale: 's. 8 clarifies that public-task processing includes the listed functions.' }),
      P('CanAssignTo', 'Allow', 'ConductDPIA', 'Controller', { deontic: 'Obligatory', hohfeld: 'Duty', quote: 'the controller must, prior to the processing, carry out a data protection impact assessment', rationale: 's. 64(1) duty.' }),
    ],
    scenarios: [
      { id: '64-S1', kind: 'precedence', from: 'ConductDPIA', to: 'HighRiskProcessing', rationale: 's. 64(1): the assessment is carried out prior to the processing.', quote: 'prior to the processing' },
    ],
  },
  ambiguous: [
    { id: 'dpa-8-64:amb1', clause: 'b', description: 'Section 64 sits in Part 3 (law-enforcement processing), not Part 2 Chapter 2. Part 2 / UK GDPR general processing has its own DPIA duty in UK GDPR Art. 35, which this provision does not reproduce.', quote: 'Part 3, Chapter 4' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// Law catalogue
// ═══════════════════════════════════════════════════════════════════════════

const flatLaw = (
  h: Omit<LawHeader, 'countryName'>,
  specs: ProvisionSpec[],
): LawMetadata => ({
  ...h,
  countryName: getCountryByCode(h.countryCode)?.name ?? h.countryCode,
  readiness: 'unverified-draft',
  provisions: specs.map(buildProvision),
});

export const VERIFIED_LAWS: LawMetadata[] = [
  flatLaw({
    id: 'ca-pipeda', countryCode: 'CA', jurisdiction: 'Canada (Federal)', jurisdictionLevel: 'Federal',
    name: 'Personal Information Protection and Electronic Documents Act', shortName: 'PIPEDA',
    officialCitation: 'S.C. 2000, c. 5, Schedule 1', issuingAuthority: 'Parliament of Canada',
    authorityUrl: 'https://www.parl.ca/', officialSourceUrl: 'https://laws-lois.justice.gc.ca/eng/acts/P-8.6/',
    effectiveDate: '2000-04-13', version: 'Schedule 1 (CAN/CSA-Q830-96) as incorporated; curated excerpts', sourceLanguage: 'en',
    summary: 'Federal private-sector privacy statute. Schedule 1 sets out ten fair-information principles. Bundled: Principle 4.1 Accountability (designated individual, delegation, identity made known) and Principle 4.5 Limiting Use, Disclosure and Retention (4.5.3 disposal). Not the Privacy Act (public sector).',
  }, [pipeda41, pipeda45]),
  flatLaw({
    id: 'ca-on-phipa', countryCode: 'CA', jurisdiction: 'Canada (Ontario)', jurisdictionLevel: 'Provincial',
    name: 'Personal Health Information Protection Act, 2004', shortName: 'PHIPA',
    officialCitation: 'S.O. 2004, c. 3, Sched. A', issuingAuthority: 'Legislative Assembly of Ontario',
    authorityUrl: 'https://www.ola.org/', officialSourceUrl: 'https://www.ontario.ca/laws/statute/04p03',
    effectiveDate: '2004-11-01', version: 'Current consolidation; curated excerpts (ss. 12(1), 29, 37(1)(a))', sourceLanguage: 'en',
    summary: "Ontario's health-privacy statute (spelled PHIPA). Bundled: custodian security safeguards (s. 12(1)), the consent-or-authority rule for collection, use and disclosure (s. 29), and permitted use (s. 37(1)(a)).",
  }, [phipaCore]),
  flatLaw({
    id: 'ca-qc-law25', countryCode: 'CA', jurisdiction: 'Canada (Quebec)', jurisdictionLevel: 'Provincial',
    name: 'Act respecting the protection of personal information in the private sector (as modernized by Law 25)', shortName: 'Quebec Law 25',
    officialCitation: 'CQLR, c. P-39.1 (R.S.Q., c. P-39.1)', issuingAuthority: 'National Assembly of Quebec',
    authorityUrl: 'https://www.assnat.qc.ca/', officialSourceUrl: 'https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1',
    effectiveDate: '2023-09-22', version: 'Curated excerpts (ss. 3.1, 3.3, 12, 14; penalties summary)', sourceLanguage: 'en',
    summary: 'Quebec private-sector privacy law after the Law 25 reform. Bundled: person in charge of personal information (s. 3.1), mandatory privacy-factor assessment (s. 3.3), use limited to collection purposes (s. 12), and consent (s. 14). The administrative monetary penalty regime (up to $10M or 2% of worldwide turnover) is deliberately left as an unmapped clause because quantitative sanctions are outside the relational sorts of Φ.',
  }, [qcLaw25]),
  flatLaw({
    id: 'us-hipaa', countryCode: 'US', jurisdiction: 'United States (Federal)', jurisdictionLevel: 'Federal',
    name: 'HIPAA Privacy and Security Rules', shortName: 'HIPAA',
    officialCitation: '45 C.F.R. Parts 160 and 164 (§ 164.502)', issuingAuthority: 'U.S. Department of Health and Human Services',
    authorityUrl: 'https://www.hhs.gov/hipaa/', officialSourceUrl: 'https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.502',
    effectiveDate: '2003-04-14', version: 'Curated excerpts of § 164.502(a), (b)(1), (b)(2)(i)', sourceLanguage: 'en',
    summary: 'Federal health-privacy regulation. Bundled: the general prohibition on unpermitted uses and disclosures of protected health information and the minimum-necessary standard with its treatment exception. Security Rule safeguards are not bundled.',
  }, [hipaa]),
  flatLaw({
    id: 'us-ca-ccpa', countryCode: 'US', jurisdiction: 'United States (California)', jurisdictionLevel: 'State',
    name: 'California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act', shortName: 'CCPA/CPRA',
    officialCitation: 'Cal. Civ. Code §§ 1798.100 et seq.', issuingAuthority: 'California State Legislature',
    authorityUrl: 'https://leginfo.legislature.ca.gov/', officialSourceUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5',
    effectiveDate: '2023-01-01', version: 'As amended by CPRA; curated excerpts', sourceLanguage: 'en',
    summary: "California's consumer privacy statute. Bundled: purpose limitation and service-provider agreements (§ 1798.100(c)-(d)), the right to delete and downstream notification (§ 1798.105), and the right to opt out of sale or sharing (§ 1798.120).",
  }, [ccpa]),
  flatLaw({
    id: 'us-sox', countryCode: 'US', jurisdiction: 'United States (Federal)', jurisdictionLevel: 'Federal',
    name: 'Sarbanes-Oxley Act of 2002', shortName: 'SOX',
    officialCitation: 'Pub. L. 107-204, §§ 201, 202, 301, 404', issuingAuthority: 'United States Congress',
    authorityUrl: 'https://www.congress.gov/', officialSourceUrl: 'https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm',
    effectiveDate: '2002-07-30', version: 'Curated excerpts (15 U.S.C. § 78j-1 and § 7262)', sourceLanguage: 'en',
    summary: 'Auditor independence (§ 201), audit-committee pre-approval and delegation (§ 202), audit-committee independence (§ 301) and the internal-control report (§ 404). Correction: SOX § 404 mandates the ICFR assessment; segregation of duties is a COSO control practice applied under § 404, and is modelled here as a COSO-derived Separate constraint rather than a statutory rule.',
  }, [sox]),
  flatLaw({
    id: 'eu-gdpr', countryCode: 'EU', jurisdiction: 'European Union', jurisdictionLevel: 'Supranational',
    name: 'General Data Protection Regulation', shortName: 'GDPR',
    officialCitation: 'Regulation (EU) 2016/679', issuingAuthority: 'European Parliament and Council of the European Union',
    authorityUrl: 'https://eur-lex.europa.eu/', officialSourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679',
    effectiveDate: '2018-05-25', version: 'OJ L 119, 4.5.2016; curated excerpts', sourceLanguage: 'en',
    summary: 'Directly applicable EU data-protection regulation. Bundled: purpose limitation, minimisation, accuracy and storage limitation (Art. 5(1)(b)-(e)), processor conditions (Art. 28), security of processing (Art. 32), and the data protection impact assessment (Art. 35). The EU AI Act is not bundled.',
  }, [gdpr]),
  flatLaw({
    id: 'de-bdsg', countryCode: 'DE', jurisdiction: 'Germany (Federal)', jurisdictionLevel: 'Federal',
    name: 'Bundesdatenschutzgesetz', shortName: 'BDSG',
    officialCitation: 'BDSG vom 30. Juni 2017 (BGBl. I S. 2097)', issuingAuthority: 'Deutscher Bundestag',
    authorityUrl: 'https://www.bundestag.de/', officialSourceUrl: 'https://www.gesetze-im-internet.de/bdsg_2018/',
    effectiveDate: '2018-05-25', version: 'Curated excerpts (§§ 22, 38, 6(4)); German source text', sourceLanguage: 'de',
    summary: 'Federal Data Protection Act complementing the GDPR. Bundled: safeguards for special categories of personal data (§ 22) and data protection officers of non-public bodies (§ 38, with the dismissal rule of § 6 Abs. 4). Source text is in German; the entity names are English glosses. Applies together with the EU GDPR.',
  }, [bdsg]),
  flatLaw({
    id: 'fr-lil', countryCode: 'FR', jurisdiction: 'France (National)', jurisdictionLevel: 'Federal',
    name: 'Loi n° 78-17 du 6 janvier 1978 relative à l\'informatique, aux fichiers et aux libertés', shortName: 'Loi Informatique et Libertés',
    officialCitation: 'Loi n° 78-17 du 6 janvier 1978', issuingAuthority: 'Parlement français',
    authorityUrl: 'https://www.cnil.fr/', officialSourceUrl: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460',
    effectiveDate: '1978-01-06', version: 'Version consolidée; curated excerpts of Articles 8 and 44; French source text', sourceLanguage: 'fr',
    summary: "French data-protection act. Bundled: the missions of the CNIL (Art. 8) and its access to premises where processing is implemented (Art. 44). Biometric and health-data rules (outside Arts. 8 and 44) are not bundled. Source text is in French; the entity names are English glosses. Applies together with the EU GDPR.",
  }, [lil]),
  flatLaw({
    id: 'uk-dpa', countryCode: 'UK', jurisdiction: 'United Kingdom', jurisdictionLevel: 'Federal',
    name: 'Data Protection Act 2018', shortName: 'DPA 2018',
    officialCitation: '2018 c. 12', issuingAuthority: 'Parliament of the United Kingdom',
    authorityUrl: 'https://www.parliament.uk/', officialSourceUrl: 'https://www.legislation.gov.uk/ukpga/2018/12/contents',
    effectiveDate: '2018-05-25', version: 'Curated excerpts (s. 8; s. 64)', sourceLanguage: 'en',
    summary: 'UK data-protection statute that sits alongside the UK GDPR. Bundled: public-task processing (s. 8, Part 2 Chapter 2) and the DPIA duty (s. 64, which is in Part 3 Chapter 4 for law-enforcement processing).',
  }, [ukDpa]),
];

const lawsById = new Map(VERIFIED_LAWS.map((l) => [l.id, l]));

export function getLawById(lawId: string): LawMetadata | undefined {
  return lawsById.get(lawId);
}

/**
 * Laws attached to a country/jurisdiction entry. Uses the country's `lawIds`
 * (so DE and FR also list the EU GDPR) and falls back to `countryCode`.
 */
export function getLawsForCountry(countryCode: string): LawMetadata[] {
  const country = getCountryByCode(countryCode);
  const ids = country?.lawIds ?? [];
  const linked = ids.map((id) => lawsById.get(id)).filter((l): l is LawMetadata => !!l);
  if (linked.length) return linked;
  const code = (country?.code ?? countryCode).toUpperCase();
  return VERIFIED_LAWS.filter((l) => l.countryCode === code);
}
