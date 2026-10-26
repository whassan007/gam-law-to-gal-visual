/**
 * Catalogue of privacy, data-protection, cybersecurity and cross-border data
 * instruments for Canada, the United States and the European Union.
 *
 * Honesty notes
 *  - This is a CATALOGUE, not a translation. Entries carry metadata and a link
 *    to the authoritative source only: no statutory text, clauses or GAL model
 *    is bundled for them. Only entries with `translatedLawId` have a bundled,
 *    curated translation in laws.ts.
 *  - Citations, dates and statuses were compiled from general knowledge and have
 *    NOT been machine-checked against the official registers. Treat every
 *    entry as "to be verified" before reliance. A missing `officialSourceUrl`
 *    means no link was recorded rather than that none exists.
 *  - The list is a working inventory of principal instruments, not an
 *    exhaustive register: amendments, implementing rules, regulator guidance
 *    and case law are largely out of scope.
 */
import type {
  CatalogueInstrument,
  InstrumentCategory,
  InstrumentStatus,
  InstrumentType,
  LawMetadata,
} from '../../types/contracts';

type Level = LawMetadata['jurisdictionLevel'];

interface Opts {
  type?: InstrumentType;
  status?: InstrumentStatus;
  note?: string;
  eff?: string;
  url?: string;
  law?: string;
}

type Row = [id: string, short: string, name: string, citation: string, category: InstrumentCategory, opts?: Opts];

const usc = (title: number, section: string) =>
  `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${title}-section${section}&num=0&edition=prelim`;
const cfr = (title: number, part: number) => `https://www.ecfr.gov/current/title-${title}/part-${part}`;
const eli = (kind: string, year: number, num: number) => `https://eur-lex.europa.eu/eli/${kind}/${year}/${num}/oj`;
const caAct = (code: string) => `https://laws-lois.justice.gc.ca/eng/acts/${code}/`;
const qcAct = (code: string) => `https://www.legisquebec.gouv.qc.ca/en/document/cs/${code}`;
const onAct = (code: string) => `https://www.ontario.ca/laws/statute/${code}`;

function inferType(citation: string): InstrumentType {
  if (/^(Implementing |Delegated )?Regulation/.test(citation)) return 'Regulation';
  if (/^Directive/.test(citation)) return 'Directive';
  if (/^(Implementing )?Decisions?\b/.test(citation)) return 'Decision';
  return 'Statute';
}

function build(
  countryCode: CatalogueInstrument['countryCode'],
  jurisdiction: string,
  level: Level,
  rows: Row[],
): CatalogueInstrument[] {
  return rows.map(([id, shortName, name, citation, category, o = {}]) => ({
    id,
    countryCode,
    jurisdiction,
    jurisdictionLevel: level,
    name,
    shortName,
    citation,
    category,
    instrumentType: o.type ?? inferType(citation),
    status: o.status ?? 'in-force',
    ...(o.note ? { statusNote: o.note } : {}),
    ...(o.eff ? { effectiveDate: o.eff } : {}),
    ...(o.url ? { officialSourceUrl: o.url } : {}),
    ...(o.law ? { translatedLawId: o.law } : {}),
  }));
}

const PRIV: InstrumentCategory = 'Privacy & data protection';
const HEALTH: InstrumentCategory = 'Health privacy';
const FIN: InstrumentCategory = 'Financial privacy';
const CYBER: InstrumentCategory = 'Cybersecurity';
const BREACH: InstrumentCategory = 'Breach notification';
const XBORDER: InstrumentCategory = 'Cross-border transfer';
const ATI: InstrumentCategory = 'Access to information';
const SURV: InstrumentCategory = 'Surveillance & cybercrime';
const AI: InstrumentCategory = 'AI & digital governance';
const KIDS: InstrumentCategory = 'Children & education';
const COMMS: InstrumentCategory = 'Communications & marketing';
const STD: InstrumentCategory = 'Standards & guidance';

// ═══════════════════════════════════════════════════════════════════════════
// CANADA
// ═══════════════════════════════════════════════════════════════════════════

const CANADA_FEDERAL = build('CA', 'Canada (Federal)', 'Federal', [
  ['ca-fed-pipeda', 'PIPEDA', 'Personal Information Protection and Electronic Documents Act', 'S.C. 2000, c. 5', PRIV, { url: caAct('P-8.6'), law: 'ca-pipeda', eff: '2001-01-01' }],
  ['ca-fed-privacy-act', 'Privacy Act', 'Privacy Act (public sector)', 'R.S.C. 1985, c. P-21', PRIV, { url: caAct('P-21'), eff: '1983-07-01' }],
  ['ca-fed-pipeda-breach-regs', 'Breach of Security Safeguards Regs', 'Breach of Security Safeguards Regulations', 'SOR/2018-64', BREACH, { type: 'Regulation', url: 'https://laws-lois.justice.gc.ca/eng/regulations/SOR-2018-64/', eff: '2018-11-01' }],
  ['ca-fed-digital-privacy-act', 'Digital Privacy Act', 'Digital Privacy Act (amended PIPEDA: breach notification, valid consent)', 'S.C. 2015, c. 32', PRIV],
  ['ca-fed-casl', 'CASL', "An Act to promote the efficiency and adaptability of the Canadian economy by regulating certain activities that discourage reliance on electronic means of carrying out commercial activities (Canada's Anti-Spam Legislation)", 'S.C. 2010, c. 23', COMMS, { url: caAct('E-1.6'), eff: '2014-07-01' }],
  ['ca-fed-atia', 'Access to Information Act', 'Access to Information Act', 'R.S.C. 1985, c. A-1', ATI, { url: caAct('A-1') }],
  ['ca-fed-criminal-code', 'Criminal Code (computer and interception offences)', 'Criminal Code: interception of private communications (Part VI), unauthorized use of computer (s. 342.1), mischief in relation to computer data (s. 430(1.1))', 'R.S.C. 1985, c. C-46', SURV, { url: caAct('C-46') }],
  ['ca-fed-telecom-act', 'Telecommunications Act', 'Telecommunications Act (privacy of subscribers; s. 7(i), s. 39)', 'S.C. 1993, c. 38', COMMS, { url: caAct('T-3.4') }],
  ['ca-fed-sicda', 'SCIDA', 'Security of Canada Information Disclosure Act', 'S.C. 2015, c. 20, s. 2', SURV],
  ['ca-fed-cse-act', 'CSE Act', 'Communications Security Establishment Act (cybersecurity and information assurance mandate)', 'S.C. 2019, c. 13, s. 76', CYBER],
  ['ca-fed-genetic-nondiscrimination', 'Genetic Non-Discrimination Act', 'Genetic Non-Discrimination Act', 'S.C. 2017, c. 3', PRIV],
  ['ca-fed-rpaa', 'Retail Payment Activities Act', 'Retail Payment Activities Act (operational risk, incl. cyber, for payment service providers)', 'S.C. 2021, c. 23, s. 2', CYBER],
  ['ca-fed-bank-act-privacy-regs', 'Bank Act Privacy Regulations', 'Privacy Regulations under the Bank Act', 'SOR/2001-6', FIN, { type: 'Regulation' }],
  ['ca-fed-c27-cppa-aida', 'Bill C-27 (CPPA / AIDA)', 'Digital Charter Implementation Act, 2022 (Consumer Privacy Protection Act, Personal Information and Data Protection Tribunal Act, Artificial Intelligence and Data Act)', 'Bill C-27 (44th Parl., 1st Sess.)', PRIV, { type: 'Bill / proposal', status: 'lapsed', note: 'Died on the Order Paper when Parliament was prorogued on 6 January 2025.' }],
  ['ca-fed-c8-cyber', 'Bill C-8 (Critical Cyber Systems Protection Act)', 'An Act respecting cyber security, amending the Telecommunications Act (enacting the Critical Cyber Systems Protection Act)', 'Bill C-8 (45th Parl., 1st Sess.)', CYBER, { type: 'Bill / proposal', status: 'proposed', note: 'Reintroduced after Bill C-26 lapsed; current stage not verified.' }],
  ['ca-fed-osfi-b13', 'OSFI Guideline B-13', 'Technology and Cyber Risk Management (OSFI Guideline B-13)', 'OSFI Guideline B-13', CYBER, { type: 'Standard / guidance', eff: '2024-01-01' }],
  ['ca-fed-osfi-e23', 'OSFI Guideline E-23', 'Enterprise-Wide Model Risk Management (OSFI Guideline E-23)', 'OSFI Guideline E-23', AI, { type: 'Standard / guidance' }],
  ['ca-fed-tbs-privacy-policy', 'TBS Policy on Privacy Protection', 'Treasury Board Policy on Privacy Protection and Directive on Privacy Practices', 'Treasury Board of Canada Secretariat', PRIV, { type: 'Standard / guidance' }],
  ['ca-fed-tbs-security-policy', 'TBS Policy on Government Security', 'Treasury Board Policy on Government Security and Directive on Security Management', 'Treasury Board of Canada Secretariat', CYBER, { type: 'Standard / guidance' }],
  ['ca-fed-csa-q830', 'CSA Model Code (CAN/CSA-Q830-96)', 'Model Code for the Protection of Personal Information (incorporated as Schedule 1 of PIPEDA)', 'CAN/CSA-Q830-96', STD, { type: 'Standard / guidance' }],
  ['ca-fed-eu-adequacy', 'EU adequacy decision for Canada (PIPEDA)', 'Commission Decision 2002/2/EC on the adequate protection of personal data provided by the Canadian PIPEDA', 'Decision 2002/2/EC', XBORDER, { type: 'Decision', url: eli('dec', 2002, 2), note: 'Covers commercial organisations subject to PIPEDA.' }],
]);

const CANADA_PROVINCIAL: CatalogueInstrument[] = [
  ...build('CA', 'Canada (Quebec)', 'Provincial', [
    ['ca-qc-law25', 'Law 25', 'Act to modernize legislative provisions as regards the protection of personal information', 'S.Q. 2021, c. 25', PRIV, { law: 'ca-qc-law25', eff: '2022-09-22', note: 'Phased commencement 2022–2024.' }],
    ['ca-qc-private-sector-act', 'Quebec Private Sector Act', 'Act respecting the protection of personal information in the private sector', 'CQLR c. P-39.1', PRIV, { url: qcAct('P-39.1') }],
    ['ca-qc-access-act', 'Quebec Access Act', 'Act respecting access to documents held by public bodies and the protection of personal information', 'CQLR c. A-2.1', ATI, { url: qcAct('A-2.1') }],
    ['ca-qc-it-framework', 'Quebec IT Framework Act', 'Act to establish a legal framework for information technology', 'CQLR c. C-1.1', CYBER, { url: qcAct('C-1.1') }],
    ['ca-qc-health-info-act', 'Quebec Health Information Act', 'Act respecting health and social services information and amending various legislative provisions', 'CQLR c. R-22.1', HEALTH, { url: qcAct('R-22.1') }],
    ['ca-qc-info-resources-act', 'Quebec Information Resources Governance Act', 'Act respecting the governance and management of the information resources of public bodies and government enterprises', 'CQLR c. G-1.03', CYBER, { url: qcAct('G-1.03') }],
    ['ca-qc-charter', 'Quebec Charter (s. 5)', 'Charter of human rights and freedoms (right to respect for private life, s. 5)', 'CQLR c. C-12', PRIV, { url: qcAct('C-12') }],
    ['ca-qc-confidentiality-incidents-regs', 'Quebec Confidentiality Incidents Reg', 'Regulation respecting confidentiality incidents', 'CQLR c. P-39.1, r. 3.1', BREACH, { type: 'Regulation' }],
  ]),
  ...build('CA', 'Canada (Ontario)', 'Provincial', [
    ['ca-on-phipa', 'PHIPA', 'Personal Health Information Protection Act, 2004', 'S.O. 2004, c. 3, Sch. A', HEALTH, { url: onAct('04p03'), law: 'ca-on-phipa', eff: '2004-11-01' }],
    ['ca-on-fippa', 'FIPPA (Ontario)', 'Freedom of Information and Protection of Privacy Act', 'R.S.O. 1990, c. F.31', ATI, { url: onAct('90f31') }],
    ['ca-on-mfippa', 'MFIPPA', 'Municipal Freedom of Information and Protection of Privacy Act', 'R.S.O. 1990, c. M.56', ATI, { url: onAct('90m56') }],
    ['ca-on-cyber-act', 'Strengthening Cyber Security and Building Trust in the Public Sector Act', 'Strengthening Cyber Security and Building Trust in the Public Sector Act, 2024 (Bill 194)', 'S.O. 2024, c. 24', CYBER, { note: 'Includes the Enhancing Digital Security and Trust Act, 2024 (AI and cyber in the public sector).' }],
  ]),
  ...build('CA', 'Canada (Alberta)', 'Provincial', [
    ['ca-ab-pipa', 'Alberta PIPA', 'Personal Information Protection Act', 'S.A. 2003, c. P-6.5', PRIV],
    ['ca-ab-hia', 'Alberta HIA', 'Health Information Act', 'R.S.A. 2000, c. H-5', HEALTH],
    ['ca-ab-pop-act', 'Alberta Protection of Privacy Act', 'Protection of Privacy Act (replaced the privacy part of the FOIP Act for public bodies)', 'S.A. 2024', PRIV, { note: 'Replaced FOIP Act privacy provisions; in force 2025.' }],
    ['ca-ab-ati-act', 'Alberta Access to Information Act', 'Access to Information Act', 'S.A. 2024', ATI],
  ]),
  ...build('CA', 'Canada (British Columbia)', 'Provincial', [
    ['ca-bc-pipa', 'BC PIPA', 'Personal Information Protection Act', 'S.B.C. 2003, c. 63', PRIV, { url: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/03063_01' }],
    ['ca-bc-fippa', 'BC FOIPPA', 'Freedom of Information and Protection of Privacy Act', 'R.S.B.C. 1996, c. 165', ATI, { url: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96165_00' }],
    ['ca-bc-privacy-act', 'BC Privacy Act', 'Privacy Act (statutory tort of violation of privacy)', 'R.S.B.C. 1996, c. 373', PRIV, { url: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96373_01' }],
    ['ca-bc-ehealth-act', 'BC E-Health Act', 'E-Health (Personal Health Information Access and Protection of Privacy) Act', 'S.B.C. 2008, c. 38', HEALTH],
  ]),
  ...build('CA', 'Canada (Manitoba)', 'Provincial', [
    ['ca-mb-phia', 'Manitoba PHIA', 'Personal Health Information Act', 'C.C.S.M. c. P33.5', HEALTH, { url: 'https://web2.gov.mb.ca/laws/statutes/ccsm/p033-5e.php' }],
    ['ca-mb-fippa', 'Manitoba FIPPA', 'Freedom of Information and Protection of Privacy Act', 'C.C.S.M. c. F175', ATI, { url: 'https://web2.gov.mb.ca/laws/statutes/ccsm/f175e.php' }],
  ]),
  ...build('CA', 'Canada (Saskatchewan)', 'Provincial', [
    ['ca-sas-hipa', 'Saskatchewan HIPA', 'Health Information Protection Act', 'S.S. 1999, c. H-0.021', HEALTH],
    ['ca-sas-foip', 'Saskatchewan FOIP', 'Freedom of Information and Protection of Privacy Act', 'S.S. 1990-91, c. F-22.01', ATI],
    ['ca-sas-lafoip', 'Saskatchewan LA FOIP', 'Local Authority Freedom of Information and Protection of Privacy Act', 'S.S. 1990-91, c. L-27.1', ATI],
  ]),
  ...build('CA', 'Canada (Nova Scotia)', 'Provincial', [
    ['ca-ns-pha', 'Nova Scotia PHIA', 'Personal Health Information Act', 'S.N.S. 2010, c. 41', HEALTH],
    ['ca-ns-foipop', 'Nova Scotia FOIPOP', 'Freedom of Information and Protection of Privacy Act', 'S.N.S. 1993, c. 5', ATI],
  ]),
  ...build('CA', 'Canada (New Brunswick)', 'Provincial', [
    ['ca-nb-phipaa', 'New Brunswick PHIPAA', 'Personal Health Information Privacy and Access Act', 'S.N.B. 2009, c. P-7.05', HEALTH],
    ['ca-nb-rtipp', 'New Brunswick RTIPPA', 'Right to Information and Protection of Privacy Act', 'S.N.B. 2009, c. R-10.6', ATI],
  ]),
  ...build('CA', 'Canada (Newfoundland and Labrador)', 'Provincial', [
    ['ca-nl-phia', 'NL PHIA', 'Personal Health Information Act', 'S.N.L. 2008, c. P-7.01', HEALTH],
    ['ca-nl-atippa', 'NL ATIPPA, 2015', 'Access to Information and Protection of Privacy Act, 2015', 'S.N.L. 2015, c. A-1.2', ATI],
  ]),
  ...build('CA', 'Canada (Prince Edward Island)', 'Provincial', [
    ['ca-pe-hia', 'PEI Health Information Act', 'Health Information Act', 'S.P.E.I. 2014, c. 31', HEALTH],
    ['ca-pe-foipp', 'PEI FOIPP', 'Freedom of Information and Protection of Privacy Act', 'R.S.P.E.I. 1988, c. F-15.01', ATI],
  ]),
  ...build('CA', 'Canada (Yukon)', 'Provincial', [
    ['ca-yt-atipp', 'Yukon ATIPP Act', 'Access to Information and Protection of Privacy Act', 'S.Y. 2018, c. 9', ATI],
    ['ca-yt-hipma', 'Yukon HIPMA', 'Health Information Privacy and Management Act', 'S.Y. 2013, c. 16', HEALTH],
  ]),
  ...build('CA', 'Canada (Northwest Territories)', 'Provincial', [
    ['ca-nt-atipp', 'NWT ATIPP Act', 'Access to Information and Protection of Privacy Act', 'S.N.W.T. 1994, c. 20', ATI],
    ['ca-nt-hia', 'NWT Health Information Act', 'Health Information Act', 'S.N.W.T. 2014, c. 2', HEALTH],
  ]),
  ...build('CA', 'Canada (Nunavut)', 'Provincial', [
    ['ca-nu-atipp', 'Nunavut ATIPP Act', 'Access to Information and Protection of Privacy Act', 'Nunavut', ATI, { note: 'Citation not recorded; verify against the Nunavut statute register.' }],
  ]),
];

// ═══════════════════════════════════════════════════════════════════════════
// UNITED STATES — FEDERAL
// ═══════════════════════════════════════════════════════════════════════════

const US_FEDERAL = build('US', 'United States (Federal)', 'Federal', [
  // Government privacy and access
  ['us-fed-privacy-act', 'Privacy Act of 1974', 'Privacy Act of 1974', '5 U.S.C. § 552a', PRIV, { url: usc(5, '552a'), eff: '1975-09-27' }],
  ['us-fed-foia', 'FOIA', 'Freedom of Information Act', '5 U.S.C. § 552', ATI, { url: usc(5, '552') }],
  ['us-fed-egov-208', 'E-Government Act § 208', 'E-Government Act of 2002, § 208 (privacy impact assessments)', 'Pub. L. 107-347', PRIV],
  ['us-fed-privacy-protection-act', 'Privacy Protection Act of 1980', 'Privacy Protection Act of 1980', '42 U.S.C. § 2000aa', PRIV, { url: usc(42, '2000aa') }],
  ['us-fed-omb-a130', 'OMB Circular A-130', 'Managing Information as a Strategic Resource (OMB Circular A-130)', 'OMB Circular A-130', STD, { type: 'Standard / guidance' }],
  // Sectoral privacy
  ['us-fed-hipaa', 'HIPAA', 'Health Insurance Portability and Accountability Act of 1996', 'Pub. L. 104-191', HEALTH, { law: 'us-hipaa', eff: '1996-08-21' }],
  ['us-fed-hipaa-privacy', 'HIPAA Privacy Rule', 'Standards for Privacy of Individually Identifiable Health Information', '45 C.F.R. Parts 160 and 164, Subparts A and E', HEALTH, { type: 'Regulation', url: cfr(45, 164), law: 'us-hipaa' }],
  ['us-fed-hipaa-security', 'HIPAA Security Rule', 'Security Standards for the Protection of Electronic Protected Health Information', '45 C.F.R. Part 164, Subpart C', HEALTH, { type: 'Regulation', url: cfr(45, 164), note: 'A proposed rule to strengthen the Security Rule was published in January 2025; final status not verified.' }],
  ['us-fed-hipaa-breach', 'HIPAA Breach Notification Rule', 'Notification in the Case of Breach of Unsecured Protected Health Information', '45 C.F.R. Part 164, Subpart D', BREACH, { type: 'Regulation', url: cfr(45, 164) }],
  ['us-fed-hitech', 'HITECH Act', 'Health Information Technology for Economic and Clinical Health Act', 'Pub. L. 111-5, Title XIII', HEALTH],
  ['us-fed-42cfr2', '42 CFR Part 2', 'Confidentiality of Substance Use Disorder Patient Records', '42 C.F.R. Part 2', HEALTH, { type: 'Regulation', url: cfr(42, 2) }],
  ['us-fed-info-blocking', 'Information Blocking Rule', '21st Century Cures Act information-blocking regulations', '45 C.F.R. Part 171', HEALTH, { type: 'Regulation', url: cfr(45, 171) }],
  ['us-fed-gina', 'GINA', 'Genetic Information Nondiscrimination Act of 2008', 'Pub. L. 110-233', PRIV],
  ['us-fed-hbnr', 'FTC Health Breach Notification Rule', 'Health Breach Notification Rule', '16 C.F.R. Part 318', BREACH, { type: 'Regulation', url: cfr(16, 318) }],
  ['us-fed-fda-524b', 'FD&C Act § 524B', 'Ensuring Cybersecurity of Medical Devices (FD&C Act § 524B)', '21 U.S.C. § 360n-2', CYBER, { url: usc(21, '360n-2') }],
  ['us-fed-fcra', 'FCRA', 'Fair Credit Reporting Act', '15 U.S.C. § 1681 et seq.', FIN, { url: usc(15, '1681') }],
  ['us-fed-facta', 'FACTA', 'Fair and Accurate Credit Transactions Act of 2003', 'Pub. L. 108-159', FIN],
  ['us-fed-glba', 'GLBA', 'Gramm-Leach-Bliley Act (Financial Privacy and Safeguards)', '15 U.S.C. §§ 6801–6809', FIN, { url: usc(15, '6801') }],
  ['us-fed-ftc-safeguards', 'FTC Safeguards Rule', 'Standards for Safeguarding Customer Information', '16 C.F.R. Part 314', CYBER, { type: 'Regulation', url: cfr(16, 314) }],
  ['us-fed-reg-p', 'Regulation P', 'Privacy of Consumer Financial Information (Regulation P)', '12 C.F.R. Part 1016', FIN, { type: 'Regulation', url: cfr(12, 1016) }],
  ['us-fed-rfpa', 'Right to Financial Privacy Act', 'Right to Financial Privacy Act of 1978', '12 U.S.C. §§ 3401–3423', FIN, { url: usc(12, '3401') }],
  ['us-fed-cfpb-1033', 'CFPB § 1033 rule', 'Personal Financial Data Rights (Dodd-Frank § 1033)', '12 C.F.R. Part 1033', FIN, { type: 'Regulation', url: cfr(12, 1033), note: 'Rule is subject to litigation and reconsideration; current status not verified.' }],
  ['us-fed-reg-sp', 'SEC Regulation S-P', 'Privacy of Consumer Financial Information and Safeguarding Personal Information (as amended 2024)', '17 C.F.R. Part 248, Subpart A', FIN, { type: 'Regulation', url: cfr(17, 248) }],
  ['us-fed-reg-sid', 'SEC Regulation S-ID', 'Identity Theft Red Flags', '17 C.F.R. Part 248, Subpart C', FIN, { type: 'Regulation', url: cfr(17, 248) }],
  ['us-fed-bank-incident-rule', 'Bank Computer-Security Incident Notification Rule', 'Computer-Security Incident Notification Requirements for Banking Organizations and Their Bank Service Providers', '12 C.F.R. Parts 53, 225 (Subpart N), 304 (Subpart C)', BREACH, { type: 'Regulation' }],
  ['us-fed-ffiec-guidelines', 'Interagency Security Guidelines', 'Interagency Guidelines Establishing Information Security Standards', '12 C.F.R. Part 30, App. B (and parallel agency appendices)', CYBER, { type: 'Standard / guidance' }],
  ['us-fed-coppa', 'COPPA', "Children's Online Privacy Protection Act", '15 U.S.C. §§ 6501–6506', KIDS, { url: usc(15, '6501') }],
  ['us-fed-coppa-rule', 'COPPA Rule', "Children's Online Privacy Protection Rule", '16 C.F.R. Part 312', KIDS, { type: 'Regulation', url: cfr(16, 312), note: 'Amended rule published 2025; compliance dates not verified.' }],
  ['us-fed-ferpa', 'FERPA', 'Family Educational Rights and Privacy Act', '20 U.S.C. § 1232g; 34 C.F.R. Part 99', KIDS, { url: usc(20, '1232g') }],
  ['us-fed-ppra', 'PPRA', 'Protection of Pupil Rights Amendment', '20 U.S.C. § 1232h', KIDS, { url: usc(20, '1232h') }],
  ['us-fed-vppa', 'VPPA', 'Video Privacy Protection Act', '18 U.S.C. § 2710', PRIV, { url: usc(18, '2710') }],
  ['us-fed-dppa', 'DPPA', "Driver's Privacy Protection Act of 1994", '18 U.S.C. §§ 2721–2725', PRIV, { url: usc(18, '2721') }],
  ['us-fed-cable-act', 'Cable Communications Policy Act', 'Cable Communications Policy Act of 1984 (subscriber privacy)', '47 U.S.C. § 551', COMMS, { url: usc(47, '551') }],
  ['us-fed-cpni', 'CPNI rules', 'Telecommunications Act § 222 and CPNI rules (customer proprietary network information)', '47 U.S.C. § 222; 47 C.F.R. § 64.2001 et seq.', COMMS, { url: usc(47, '222') }],
  ['us-fed-tcpa', 'TCPA', 'Telephone Consumer Protection Act', '47 U.S.C. § 227', COMMS, { url: usc(47, '227') }],
  ['us-fed-can-spam', 'CAN-SPAM Act', 'Controlling the Assault of Non-Solicited Pornography And Marketing Act', '15 U.S.C. §§ 7701–7713; 16 C.F.R. Part 316', COMMS, { url: usc(15, '7701') }],
  ['us-fed-ftc-act-5', 'FTC Act § 5', 'Federal Trade Commission Act § 5 (unfair or deceptive acts or practices)', '15 U.S.C. § 45', PRIV, { url: usc(15, '45') }],
  ['us-fed-take-it-down', 'TAKE IT DOWN Act', 'Tools to Address Known Exploitation by Immobilizing Technological Deepfakes on Websites and Networks Act', 'Pub. L. 119-12', AI, { note: 'Platform notice-and-removal duties phase in after enactment (2025); dates not verified.' }],
  // Surveillance and cybercrime
  ['us-fed-ecpa', 'ECPA / Wiretap Act', 'Electronic Communications Privacy Act: Wiretap Act', '18 U.S.C. §§ 2510–2523', SURV, { url: usc(18, '2510') }],
  ['us-fed-sca', 'Stored Communications Act', 'Stored Communications Act', '18 U.S.C. §§ 2701–2713', SURV, { url: usc(18, '2701') }],
  ['us-fed-pen-register', 'Pen Register Act', 'Pen Register and Trap and Trace Devices', '18 U.S.C. §§ 3121–3127', SURV, { url: usc(18, '3121') }],
  ['us-fed-fisa', 'FISA', 'Foreign Intelligence Surveillance Act (including § 702)', '50 U.S.C. § 1801 et seq.', SURV, { url: usc(50, '1801'), note: '§ 702 was reauthorized in April 2024 for two years; current status not verified.' }],
  ['us-fed-calea', 'CALEA', 'Communications Assistance for Law Enforcement Act', '47 U.S.C. §§ 1001–1010', SURV, { url: usc(47, '1001') }],
  ['us-fed-cfaa', 'CFAA', 'Computer Fraud and Abuse Act', '18 U.S.C. § 1030', SURV, { url: usc(18, '1030') }],
  ['us-fed-cloud-act', 'CLOUD Act', 'Clarifying Lawful Overseas Use of Data Act', 'Pub. L. 115-141, Div. V', SURV],
  // Cybersecurity
  ['us-fed-fisma', 'FISMA 2014', 'Federal Information Security Modernization Act of 2014', '44 U.S.C. §§ 3551–3558', CYBER, { url: usc(44, '3551') }],
  ['us-fed-cisa-2015', 'Cybersecurity Information Sharing Act', 'Cybersecurity Information Sharing Act of 2015', '6 U.S.C. §§ 1501–1510', CYBER, { url: usc(6, '1501'), note: 'Statutory authorities expired 30 September 2025 and were subject to extension; current status not verified.' }],
  ['us-fed-circia', 'CIRCIA', 'Cyber Incident Reporting for Critical Infrastructure Act of 2022', '6 U.S.C. § 681 et seq.', BREACH, { status: 'phased', note: 'Reporting obligations take effect only once CISA finalizes implementing regulations; status not verified.' }],
  ['us-fed-cisa-act-2018', 'CISA Act of 2018', 'Cybersecurity and Infrastructure Security Agency Act of 2018', 'Pub. L. 115-278', CYBER],
  ['us-fed-iot-act', 'IoT Cybersecurity Improvement Act', 'Internet of Things Cybersecurity Improvement Act of 2020', 'Pub. L. 116-207', CYBER],
  ['us-fed-fedramp-act', 'FedRAMP Authorization Act', 'FedRAMP Authorization Act (FY2023 NDAA)', '44 U.S.C. §§ 3607–3616', CYBER, { url: usc(44, '3607') }],
  ['us-fed-eo-14028', 'EO 14028', 'Executive Order 14028, Improving the Nation\'s Cybersecurity', 'E.O. 14028 (2021)', CYBER, { type: 'Standard / guidance', note: 'Parts amended by later executive orders; current text not verified.' }],
  ['us-fed-sec-cyber-disclosure', 'SEC Cybersecurity Disclosure Rules', 'Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure (Form 8-K Item 1.05; Reg S-K Item 106)', 'Release No. 33-11216; 17 C.F.R. § 229.106', CYBER, { type: 'Regulation', url: cfr(17, 229) }],
  ['us-fed-reg-sci', 'SEC Regulation SCI', 'Regulation Systems Compliance and Integrity', '17 C.F.R. Part 242, Subpart A (§§ 242.1000–1007)', CYBER, { type: 'Regulation', url: cfr(17, 242) }],
  ['us-fed-sox', 'Sarbanes-Oxley Act', 'Sarbanes-Oxley Act of 2002 (internal controls over financial reporting)', 'Pub. L. 107-204', FIN, { law: 'us-sox', eff: '2002-07-30' }],
  ['us-fed-nerc-cip', 'NERC CIP', 'NERC Critical Infrastructure Protection Reliability Standards under Federal Power Act § 215', '16 U.S.C. § 824o; 18 C.F.R. Part 40', CYBER, { type: 'Standard / guidance', url: usc(16, '824o') }],
  ['us-fed-dfars-7012', 'DFARS 252.204-7012', 'Safeguarding Covered Defense Information and Cyber Incident Reporting', '48 C.F.R. § 252.204-7012', CYBER, { type: 'Regulation' }],
  ['us-fed-far-52-204-21', 'FAR 52.204-21', 'Basic Safeguarding of Covered Contractor Information Systems', '48 C.F.R. § 52.204-21', CYBER, { type: 'Regulation' }],
  ['us-fed-cmmc', 'CMMC Program', 'Cybersecurity Maturity Model Certification Program', '32 C.F.R. Part 170', CYBER, { type: 'Regulation', url: cfr(32, 170), status: 'phased', note: 'Phased contract-clause rollout; dates not verified.' }],
  // Cross-border
  ['us-fed-doj-dsp', 'DOJ Data Security Program', 'Preventing Access to U.S. Sensitive Personal Data and Government-Related Data by Countries of Concern (E.O. 14117)', '28 C.F.R. Part 202', XBORDER, { type: 'Regulation', url: cfr(28, 202), eff: '2025-04-08' }],
  ['us-fed-padfa', 'PADFA', 'Protecting Americans\' Data from Foreign Adversaries Act of 2024', 'Pub. L. 118-50, Div. I', XBORDER],
  ['us-fed-eu-us-dpf', 'EU–US Data Privacy Framework (US side)', 'EU-U.S. Data Privacy Framework, administered by the U.S. Department of Commerce (with E.O. 14086)', 'E.O. 14086 (2022); DPF Principles', XBORDER, { type: 'Standard / guidance', eff: '2023-07-10' }],
  // Frameworks
  ['us-fed-nist-csf', 'NIST CSF 2.0', 'NIST Cybersecurity Framework 2.0', 'NIST CSWP 29', STD, { type: 'Standard / guidance' }],
  ['us-fed-nist-privacy', 'NIST Privacy Framework', 'NIST Privacy Framework', 'Version 1.0', STD, { type: 'Standard / guidance' }],
  ['us-fed-nist-800-53', 'NIST SP 800-53', 'Security and Privacy Controls for Information Systems and Organizations', 'NIST SP 800-53 Rev. 5', STD, { type: 'Standard / guidance' }],
  ['us-fed-nist-800-171', 'NIST SP 800-171', 'Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations', 'NIST SP 800-171', STD, { type: 'Standard / guidance' }],
  ['us-fed-nist-800-122', 'NIST SP 800-122', 'Guide to Protecting the Confidentiality of Personally Identifiable Information', 'NIST SP 800-122', STD, { type: 'Standard / guidance' }],
  ['us-fed-nist-ai-rmf', 'NIST AI RMF', 'NIST Artificial Intelligence Risk Management Framework', 'NIST AI 100-1', AI, { type: 'Standard / guidance' }],
]);

// ═══════════════════════════════════════════════════════════════════════════
// UNITED STATES — STATES
// ═══════════════════════════════════════════════════════════════════════════

const compPrivacy = (id: string, short: string, name: string, cite: string, eff: string, note?: string): Row =>
  [id, short, name, cite, PRIV, { eff, ...(note ? { note } : {}) }];

const US_STATES: CatalogueInstrument[] = [
  ...build('US', 'United States (California)', 'State', [
    ['us-ca-ccpa', 'CCPA / CPRA', 'California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act of 2020', 'Cal. Civ. Code § 1798.100 et seq.', PRIV, { law: 'us-ca-ccpa', eff: '2020-01-01' }],
    ['us-ca-ccpa-regs', 'CCPA Regulations', 'California Consumer Privacy Act Regulations (including ADMT, risk assessment and cybersecurity-audit rules)', 'Cal. Code Regs. tit. 11, § 7000 et seq.', PRIV, { type: 'Regulation', note: 'Amendments on automated decision-making, risk assessments and cybersecurity audits adopted 2025; phased dates not verified.' }],
    ['us-ca-cmia', 'CMIA', 'Confidentiality of Medical Information Act', 'Cal. Civ. Code § 56 et seq.', HEALTH],
    ['us-ca-delete-act', 'Delete Act', 'Delete Act (data broker registration and the Delete Request and Opt-out Platform)', 'Cal. Civ. Code § 1798.99.80 et seq.', PRIV],
    ['us-ca-breach', 'California breach statute', 'Customer Records Act: data breach notification and security duty', 'Cal. Civ. Code §§ 1798.81.5, 1798.82', BREACH],
    ['us-ca-caloppa', 'CalOPPA', 'California Online Privacy Protection Act', 'Cal. Bus. & Prof. Code § 22575 et seq.', PRIV],
    ['us-ca-shine-the-light', 'Shine the Light', 'Shine the Light Law', 'Cal. Civ. Code § 1798.83', PRIV],
    ['us-ca-cipa', 'CIPA', 'California Invasion of Privacy Act (all-party-consent recording and wiretap)', 'Cal. Penal Code § 630 et seq.', SURV],
    ['us-ca-calecpa', 'CalECPA', 'California Electronic Communications Privacy Act', 'Cal. Penal Code § 1546 et seq.', SURV],
    ['us-ca-aadc', 'California Age-Appropriate Design Code', 'California Age-Appropriate Design Code Act (AB 2273)', 'Cal. Civ. Code § 1798.99.28 et seq.', KIDS, { status: 'invalidated', note: 'Enforcement enjoined in NetChoice v. Bonta; litigation status not verified.' }],
    ['us-ca-sb53', 'SB 53', 'Transparency in Frontier Artificial Intelligence Act (SB 53)', 'S.B. 53 (2025)', AI],
    ['us-ca-constitution', 'California Constitution art. I, § 1', 'Right of privacy in the California Constitution', 'Cal. Const. art. I, § 1', PRIV],
  ]),
  ...build('US', 'United States (State comprehensive privacy laws)', 'State', [
    compPrivacy('us-va-vcdpa', 'Virginia CDPA', 'Virginia Consumer Data Protection Act', 'Va. Code § 59.1-575 et seq.', '2023-01-01'),
    compPrivacy('us-co-cpa', 'Colorado Privacy Act', 'Colorado Privacy Act', 'C.R.S. § 6-1-1301 et seq.', '2023-07-01'),
    compPrivacy('us-ct-ctdpa', 'Connecticut CTDPA', 'Connecticut Data Privacy Act', 'Conn. Gen. Stat. § 42-515 et seq.', '2023-07-01'),
    compPrivacy('us-ut-ucpa', 'Utah UCPA', 'Utah Consumer Privacy Act', 'Utah Code § 13-61-101 et seq.', '2023-12-31'),
    compPrivacy('us-tx-tdpsa', 'Texas TDPSA', 'Texas Data Privacy and Security Act', 'Tex. Bus. & Com. Code ch. 541', '2024-07-01'),
    compPrivacy('us-or-ocpa', 'Oregon OCPA', 'Oregon Consumer Privacy Act', 'ORS 646A.570 et seq.', '2024-07-01'),
    compPrivacy('us-mt-mcdpa', 'Montana MCDPA', 'Montana Consumer Data Privacy Act', 'Mont. Code Ann. tit. 30, ch. 14', '2024-10-01'),
    compPrivacy('us-fl-fdbr', 'Florida Digital Bill of Rights', 'Florida Digital Bill of Rights (applies to very large controllers)', 'Fla. Stat. § 501.701 et seq.', '2024-07-01'),
    compPrivacy('us-de-dpdpa', 'Delaware DPDPA', 'Delaware Personal Data Privacy Act', '6 Del. C. ch. 12D', '2025-01-01'),
    compPrivacy('us-ia-icdpa', 'Iowa ICDPA', 'Iowa Consumer Data Protection Act', 'Iowa Code ch. 715D', '2025-01-01'),
    compPrivacy('us-ne-ndpa', 'Nebraska NDPA', 'Nebraska Data Privacy Act', 'L.B. 1074 (2024)', '2025-01-01'),
    compPrivacy('us-nh-nhpa', 'New Hampshire Privacy Act', 'New Hampshire Privacy Act', 'RSA ch. 507-H', '2025-01-01'),
    compPrivacy('us-nj-njdpa', 'New Jersey NJDPA', 'New Jersey Data Privacy Act', 'N.J.S.A. 56:8-166.4 et seq.', '2025-01-15'),
    compPrivacy('us-tn-tipa', 'Tennessee TIPA', 'Tennessee Information Protection Act', 'Tenn. Code Ann. § 47-18-3201 et seq.', '2025-07-01'),
    compPrivacy('us-mn-mcdpa', 'Minnesota MCDPA', 'Minnesota Consumer Data Privacy Act', 'Minn. Stat. ch. 325M', '2025-07-31'),
    compPrivacy('us-md-modpa', 'Maryland MODPA', 'Maryland Online Data Privacy Act of 2024', 'Md. Code, Com. Law § 14-4601 et seq.', '2025-10-01'),
    compPrivacy('us-in-icdpa', 'Indiana ICDPA', 'Indiana Consumer Data Protection Act', 'Ind. Code art. 24-15', '2026-01-01'),
    compPrivacy('us-ky-kcdpa', 'Kentucky KCDPA', 'Kentucky Consumer Data Protection Act', 'H.B. 15 (2024)', '2026-01-01'),
    compPrivacy('us-ri-ridtppa', 'Rhode Island DTPPA', 'Rhode Island Data Transparency and Privacy Protection Act', 'R.I. Gen. Laws § 6-48.1-1 et seq.', '2026-01-01'),
  ]),
  ...build('US', 'United States (Other state laws)', 'State', [
    ['us-il-bipa', 'Illinois BIPA', 'Biometric Information Privacy Act', '740 ILCS 14', PRIV],
    ['us-il-pipa', 'Illinois PIPA', 'Personal Information Protection Act (breach notification)', '815 ILCS 530', BREACH],
    ['us-il-gipa', 'Illinois GIPA', 'Genetic Information Privacy Act', '410 ILCS 513', HEALTH],
    ['us-tx-cubi', 'Texas CUBI', 'Capture or Use of Biometric Identifier Act', 'Tex. Bus. & Com. Code § 503.001', PRIV],
    ['us-tx-hb300', 'Texas Medical Records Privacy Act', 'Texas Medical Records Privacy Act (HB 300)', 'Tex. Health & Safety Code ch. 181', HEALTH],
    ['us-tx-traiga', 'Texas TRAIGA', 'Texas Responsible Artificial Intelligence Governance Act (HB 149)', 'H.B. 149 (2025)', AI, { eff: '2026-01-01' }],
    ['us-wa-mhmda', 'Washington My Health My Data Act', 'My Health My Data Act', 'RCW ch. 19.373', HEALTH],
    ['us-wa-biometric', 'Washington biometric law', 'Biometric identifiers law', 'RCW ch. 19.375', PRIV],
    ['us-nv-sb370', 'Nevada consumer health data law', 'Nevada consumer health data privacy law (SB 370)', 'S.B. 370 (2023)', HEALTH],
    ['us-ny-shield', 'NY SHIELD Act', 'Stop Hacks and Improve Electronic Data Security Act', 'N.Y. Gen. Bus. Law §§ 899-aa, 899-bb', CYBER],
    ['us-ny-dfs-500', 'NYDFS Part 500', 'NYDFS Cybersecurity Requirements for Financial Services Companies', '23 NYCRR Part 500', CYBER, { type: 'Regulation' }],
    ['us-ny-child-data', 'NY Child Data Protection Act', 'New York Child Data Protection Act', 'N.Y. Gen. Bus. Law art. 45', KIDS],
    ['us-ma-201cmr17', 'Massachusetts 201 CMR 17.00', 'Standards for the Protection of Personal Information of Residents of the Commonwealth', '201 CMR 17.00; M.G.L. c. 93H', CYBER, { type: 'Regulation' }],
    ['us-co-ai-act', 'Colorado AI Act', 'Colorado Artificial Intelligence Act (SB 24-205)', 'C.R.S. § 6-1-1701 et seq.', AI, { status: 'phased', note: 'Commencement was delayed to 30 June 2026; current status not verified.' }],
    ['us-ut-ai-policy', 'Utah AI Policy Act', 'Utah Artificial Intelligence Policy Act', 'S.B. 149 (2024)', AI],
    ['us-fl-fipa', 'Florida Information Protection Act', 'Florida Information Protection Act of 2014', 'Fla. Stat. § 501.171', BREACH],
    ['us-tx-itepa', 'Texas Identity Theft Enforcement and Protection Act', 'Identity Theft Enforcement and Protection Act', 'Tex. Bus. & Com. Code ch. 521', BREACH],
    ['us-oh-dpa', 'Ohio Data Protection Act', 'Ohio Data Protection Act (cybersecurity safe harbor)', 'Ohio Rev. Code ch. 1354', CYBER],
    ['us-vt-data-broker', 'Vermont data broker law', 'Vermont data broker registration and security requirements', '9 V.S.A. § 2430 et seq.', PRIV],
    ['us-breach-all-states', 'State breach notification statutes', 'Data breach notification statutes of all 50 states, the District of Columbia, Guam, Puerto Rico and the U.S. Virgin Islands', 'Various', BREACH, { note: 'Aggregate entry. Each jurisdiction has its own definitions, deadlines and regulator-notice rules.' }],
    ['us-insurance-data-security', 'NAIC Insurance Data Security Model Law', 'NAIC Insurance Data Security Model Law (#668) as adopted by many states', 'NAIC Model #668; state enactments vary', CYBER, { note: 'Aggregate entry for state adoptions.' }],
    ['us-state-wiretap-all-party', 'State wiretap and recording-consent laws', 'State wiretap and call-recording consent statutes (one-party and all-party consent)', 'Various', SURV, { note: 'Aggregate entry.' }],
    ['us-state-kids-codes', 'State kids online safety and design codes', 'State age-appropriate design and minors\' online-safety laws (for example Maryland, Vermont, Nebraska)', 'Various', KIDS, { note: 'Aggregate entry. Several are subject to litigation.' }],
    ['us-state-health-data', 'State consumer health data laws', 'State consumer health data privacy laws (for example Washington, Nevada, Connecticut)', 'Various', HEALTH, { note: 'Aggregate entry.' }],
  ]),
];

// ═══════════════════════════════════════════════════════════════════════════
// EUROPEAN UNION
// ═══════════════════════════════════════════════════════════════════════════

const EU = build('EU', 'European Union', 'Supranational', [
  // Data protection core
  ['eu-gdpr', 'GDPR', 'General Data Protection Regulation', 'Regulation (EU) 2016/679', PRIV, { type: 'Regulation' as InstrumentType, url: eli('reg', 2016, 679), law: 'eu-gdpr', eff: '2018-05-25' }],
  ['eu-eprivacy', 'ePrivacy Directive', 'Directive on privacy and electronic communications', 'Directive 2002/58/EC', COMMS, { type: 'Directive', url: eli('dir', 2002, 58) }],
  ['eu-eprivacy-reg', 'ePrivacy Regulation proposal', 'Proposal for a Regulation on Privacy and Electronic Communications', 'COM(2017) 10', COMMS, { type: 'Bill / proposal', status: 'lapsed', note: 'The Commission announced its withdrawal in 2025.' }],
  ['eu-led', 'Law Enforcement Directive', 'Directive on the protection of personal data in criminal law enforcement', 'Directive (EU) 2016/680', SURV, { type: 'Directive', url: eli('dir', 2016, 680) }],
  ['eu-eudpr', 'EUDPR', 'Regulation on the protection of natural persons with regard to the processing of personal data by the Union institutions', 'Regulation (EU) 2018/1725', PRIV, { type: 'Regulation' as InstrumentType, url: eli('reg', 2018, 1725) }],
  ['eu-drd', 'Data Retention Directive', 'Data Retention Directive', 'Directive 2006/24/EC', SURV, { type: 'Directive', status: 'invalidated', note: 'Declared invalid by the CJEU in Digital Rights Ireland (C-293/12 and C-594/12, 2014).', url: eli('dir', 2006, 24) }],
  ['eu-pnr', 'PNR Directive', 'Directive on the use of passenger name record (PNR) data', 'Directive (EU) 2016/681', SURV, { type: 'Directive', url: eli('dir', 2016, 681) }],
  ['eu-europol', 'Europol Regulation', 'Regulation on the European Union Agency for Law Enforcement Cooperation (Europol)', 'Regulation (EU) 2016/794', SURV, { url: eli('reg', 2016, 794) }],
  ['eu-eevidence-reg', 'e-Evidence Regulation', 'Regulation on European Production and Preservation Orders for electronic evidence in criminal proceedings', 'Regulation (EU) 2023/1543', SURV, { url: eli('reg', 2023, 1543) }],
  ['eu-eevidence-dir', 'e-Evidence Directive', 'Directive laying down harmonised rules on the appointment of legal representatives for gathering evidence', 'Directive (EU) 2023/1544', SURV, { type: 'Directive', url: eli('dir', 2023, 1544) }],
  ['eu-attacks-info-systems', 'Attacks against Information Systems Directive', 'Directive on attacks against information systems', 'Directive 2013/40/EU', SURV, { type: 'Directive', url: eli('dir', 2013, 40) }],
  // Data governance and digital
  ['eu-data-act', 'Data Act', 'Regulation on harmonised rules on fair access to and use of data', 'Regulation (EU) 2023/2854', AI, { url: eli('reg', 2023, 2854), eff: '2025-09-12' }],
  ['eu-dga', 'Data Governance Act', 'Regulation on European data governance', 'Regulation (EU) 2022/868', AI, { url: eli('reg', 2022, 868), eff: '2023-09-24' }],
  ['eu-free-flow', 'Free Flow of Non-Personal Data Regulation', 'Regulation on a framework for the free flow of non-personal data', 'Regulation (EU) 2018/1807', XBORDER, { url: eli('reg', 2018, 1807) }],
  ['eu-ehds', 'European Health Data Space', 'Regulation on the European Health Data Space', 'Regulation (EU) 2025/327', HEALTH, { status: 'phased', url: eli('reg', 2025, 327), note: 'Applies in stages from 2027 onward; dates not verified.' }],
  ['eu-ai-act', 'AI Act', 'Regulation laying down harmonised rules on artificial intelligence', 'Regulation (EU) 2024/1689', AI, { status: 'phased', url: eli('reg', 2024, 1689), note: 'Obligations apply in stages from 2025 to 2027; amendments proposed in the Digital Omnibus have not been verified.' }],
  ['eu-dsa', 'Digital Services Act', 'Regulation on a Single Market for Digital Services', 'Regulation (EU) 2022/2065', AI, { url: eli('reg', 2022, 2065), eff: '2024-02-17' }],
  ['eu-dma', 'Digital Markets Act', 'Regulation on contestable and fair markets in the digital sector', 'Regulation (EU) 2022/1925', AI, { url: eli('reg', 2022, 1925) }],
  ['eu-political-ads', 'Political Advertising Regulation', 'Regulation on the transparency and targeting of political advertising', 'Regulation (EU) 2024/900', AI, { url: eli('reg', 2024, 900) }],
  ['eu-csam-interim', 'Interim CSAM derogation', 'Regulation on a temporary derogation from the ePrivacy Directive for combating online child sexual abuse', 'Regulation (EU) 2021/1232', KIDS, { url: eli('reg', 2021, 1232), note: 'Temporary measure that has been extended; current expiry not verified.' }],
  ['eu-digital-omnibus', 'Digital Omnibus', 'Digital Omnibus proposals to amend the GDPR, ePrivacy, Data Act and AI Act', 'COM(2025) 837 and related', PRIV, { type: 'Bill / proposal', status: 'proposed', note: 'Legislative stage not verified.' }],
  // Cybersecurity
  ['eu-nis2', 'NIS2 Directive', 'Directive on measures for a high common level of cybersecurity across the Union', 'Directive (EU) 2022/2555', CYBER, { type: 'Directive', url: eli('dir', 2022, 2555), eff: '2024-10-17', note: 'Requires national transposition; member-state status varies.' }],
  ['eu-nis1', 'NIS Directive', 'Directive concerning measures for a high common level of security of network and information systems', 'Directive (EU) 2016/1148', CYBER, { type: 'Directive', status: 'repealed', url: eli('dir', 2016, 1148), note: 'Repealed by NIS2.' }],
  ['eu-cer', 'CER Directive', 'Directive on the resilience of critical entities', 'Directive (EU) 2022/2557', CYBER, { type: 'Directive', url: eli('dir', 2022, 2557) }],
  ['eu-dora', 'DORA', 'Regulation on digital operational resilience for the financial sector', 'Regulation (EU) 2022/2554', CYBER, { url: eli('reg', 2022, 2554), eff: '2025-01-17' }],
  ['eu-cra', 'Cyber Resilience Act', 'Regulation on horizontal cybersecurity requirements for products with digital elements', 'Regulation (EU) 2024/2847', CYBER, { status: 'phased', url: eli('reg', 2024, 2847), note: 'Reporting obligations apply from 11 September 2026; main obligations from 11 December 2027.' }],
  ['eu-cybersecurity-act', 'Cybersecurity Act', 'Regulation on ENISA and on information and communications technology cybersecurity certification', 'Regulation (EU) 2019/881', CYBER, { url: eli('reg', 2019, 881) }],
  ['eu-eucc', 'EUCC', 'Implementing Regulation on the European Common Criteria-based cybersecurity certification scheme', 'Implementing Regulation (EU) 2024/482', CYBER, { url: eli('reg_impl', 2024, 482) }],
  ['eu-cyber-solidarity', 'Cyber Solidarity Act', 'Regulation laying down measures to strengthen solidarity and capacities in the Union to detect, prepare for and respond to cyber threats and incidents', 'Regulation (EU) 2025/38', CYBER, { url: eli('reg', 2025, 38) }],
  ['eu-institutions-cyber', 'Union institutions cybersecurity regulation', 'Regulation laying down measures for a high common level of cybersecurity at the institutions, bodies, offices and agencies of the Union', 'Regulation (EU) 2023/2841', CYBER, { url: eli('reg', 2023, 2841) }],
  ['eu-eecc', 'European Electronic Communications Code', 'Directive establishing the European Electronic Communications Code (security obligations)', 'Directive (EU) 2018/1972', COMMS, { type: 'Directive', url: eli('dir', 2018, 1972) }],
  ['eu-red-delegated', 'RED cybersecurity delegated act', 'Delegated Regulation supplementing the Radio Equipment Directive 2014/53/EU (cybersecurity and data protection safeguards)', 'Delegated Regulation (EU) 2022/30', CYBER, { url: eli('reg_del', 2022, 30) }],
  ['eu-mdr', 'Medical Devices Regulation', 'Regulation on medical devices (cybersecurity requirements in Annex I)', 'Regulation (EU) 2017/745', CYBER, { url: eli('reg', 2017, 745) }],
  ['eu-eidas', 'eIDAS', 'Regulation on electronic identification and trust services', 'Regulation (EU) No 910/2014', CYBER, { url: eli('reg', 2014, 910) }],
  ['eu-eidas2', 'eIDAS 2.0', 'Regulation establishing the European Digital Identity Framework', 'Regulation (EU) 2024/1183', CYBER, { url: eli('reg', 2024, 1183) }],
  // Financial
  ['eu-psd2', 'PSD2', 'Directive on payment services in the internal market', 'Directive (EU) 2015/2366', FIN, { type: 'Directive', url: eli('dir', 2015, 2366), note: 'Successor PSD3 / Payment Services Regulation proposals not verified.' }],
  ['eu-funds-transfer', 'Transfer of Funds Regulation', 'Regulation on information accompanying transfers of funds and certain crypto-assets', 'Regulation (EU) 2023/1113', FIN, { url: eli('reg', 2023, 1113) }],
  // Transfers
  ['eu-scc-2021-914', 'SCCs (transfers)', 'Commission Implementing Decision on standard contractual clauses for the transfer of personal data to third countries', 'Implementing Decision (EU) 2021/914', XBORDER, { type: 'Decision', url: eli('dec_impl', 2021, 914) }],
  ['eu-scc-2021-915', 'SCCs (controller–processor)', 'Commission Implementing Decision on standard contractual clauses between controllers and processors', 'Implementing Decision (EU) 2021/915', XBORDER, { type: 'Decision', url: eli('dec_impl', 2021, 915) }],
  ['eu-bcr', 'Binding Corporate Rules', 'GDPR Article 47 binding corporate rules', 'Regulation (EU) 2016/679, Art. 47', XBORDER, { type: 'Standard / guidance' }],
  ['eu-edpb-supp-measures', 'EDPB Recommendations 01/2020', 'Recommendations on measures that supplement transfer tools to ensure compliance with the EU level of protection', 'EDPB Recommendations 01/2020 (v2.0, 2021)', XBORDER, { type: 'Standard / guidance' }],
  ['eu-adequacy-us', 'EU–US Data Privacy Framework adequacy decision', 'Commission Implementing Decision on the adequate level of protection of personal data under the EU-US Data Privacy Framework', 'Implementing Decision (EU) 2023/1795', XBORDER, { type: 'Decision', url: eli('dec_impl', 2023, 1795), eff: '2023-07-10', note: 'Upheld by the General Court in Latombe v Commission (T-553/23, 2025); appeal status not verified.' }],
  ['eu-adequacy-ca', 'Adequacy decision: Canada (PIPEDA)', 'Commission Decision on the adequate protection of personal data provided by the Canadian PIPEDA', 'Decision 2002/2/EC', XBORDER, { type: 'Decision', url: eli('dec', 2002, 2) }],
  ['eu-adequacy-uk', 'Adequacy decisions: United Kingdom', 'Commission Implementing Decisions on the adequate protection of personal data by the United Kingdom (GDPR and LED)', 'Implementing Decisions (EU) 2021/1772 and 2021/1773', XBORDER, { type: 'Decision', url: eli('dec_impl', 2021, 1772), note: 'Originally expiring 27 June 2025; extension and renewal status not verified.' }],
  ['eu-adequacy-jp', 'Adequacy decision: Japan', 'Commission Implementing Decision on the adequate protection of personal data by Japan', 'Implementing Decision (EU) 2019/419', XBORDER, { type: 'Decision', url: eli('dec_impl', 2019, 419) }],
  ['eu-adequacy-kr', 'Adequacy decision: Republic of Korea', 'Commission Implementing Decision on the adequate protection of personal data by the Republic of Korea', 'Implementing Decision (EU) 2022/254', XBORDER, { type: 'Decision', url: eli('dec_impl', 2022, 254) }],
  ['eu-adequacy-other', 'Other adequacy decisions', 'Adequacy decisions for Andorra, Argentina, Faroe Islands, Guernsey, Isle of Man, Israel, Jersey, New Zealand, Switzerland and Uruguay', 'Various Commission decisions', XBORDER, { type: 'Decision', note: 'Aggregate entry. Several predate the GDPR and were retained after review.' }],
]);

export const INSTRUMENT_CATALOGUE: CatalogueInstrument[] = [
  ...CANADA_FEDERAL,
  ...CANADA_PROVINCIAL,
  ...US_FEDERAL,
  ...US_STATES,
  ...EU,
];

export const CATALOGUE_CATEGORIES: InstrumentCategory[] = [
  PRIV, HEALTH, FIN, CYBER, BREACH, XBORDER, ATI, SURV, AI, KIDS, COMMS, STD,
];

/** All catalogued instruments for a country/jurisdiction code ('CA' | 'US' | 'EU'). */
export function getCatalogueForCountry(countryCode: string): CatalogueInstrument[] {
  const code = countryCode.toUpperCase();
  return INSTRUMENT_CATALOGUE.filter((i) => i.countryCode === code);
}
