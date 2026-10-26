/**
 * International, regional and non-CA/US/EU instruments, plus municipal rules and
 * further Canadian, US and EU entries, from a user-supplied reference directory.
 *
 * Every entry here is flagged `userSupplied`: the name, citation and link come
 * from that directory and were not independently verified. Links that the
 * directory wrapped in a search-engine redirect were unwrapped to the original
 * address. Two links on a non-official mirror domain (PIPL, DSL) were omitted.
 * See instrument-catalogue.ts for the full honesty notes.
 */
import type { CatalogueInstrument, CatalogueLevel } from '../../types/contracts';
import { build, type Row, PRIV, HEALTH, FIN, CYBER, XBORDER, ATI, SURV, AI, COMMS, STD } from './catalogue-core';

const W = (code: string, jurisdiction: string, level: CatalogueLevel, rows: Row[]): CatalogueInstrument[] =>
  build(code, jurisdiction, level, rows.map(([id, short, name, cite, cat, o]) => [id, short, name, cite, cat, { ...o, user: true }] as Row));

const PAID = 'Paywalled or proprietary standard; text not bundled.';

// ═══════════════════════════════════════════════════════════════════════════
// INTERNATIONAL AND REGIONAL
// ═══════════════════════════════════════════════════════════════════════════

const UN = W('INT', 'United Nations', 'International', [
  ['int-udhr-art12', 'UDHR Art. 12', 'Universal Declaration of Human Rights, Article 12 (privacy)', 'UNGA Res. 217 A (III) (1948)', PRIV, { type: 'Declaration / resolution', url: 'https://www.un.org/en/about-us/universal-declaration-of-human-rights' }],
  ['int-iccpr-art17', 'ICCPR Art. 17', 'International Covenant on Civil and Political Rights, Article 17 (privacy and correspondence)', '999 U.N.T.S. 171 (1966)', PRIV, { type: 'Treaty', url: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-civil-and-political-rights' }],
  ['int-unga-68-167', 'UNGA Res. 68/167', 'The right to privacy in the digital age', 'A/RES/68/167 (2013)', PRIV, { type: 'Declaration / resolution', url: 'https://undocs.org/A/RES/68/167' }],
  ['int-un-privacy-principles', 'UN Personal Data Protection Principles', 'UN Principles on Personal Data Protection and Privacy', 'UN System Chief Executives Board for Coordination (2018)', STD, { type: 'Standard / guidance', url: 'https://unsceb.org/principles-personal-data-protection-and-privacy' }],
  ['int-un-cybercrime-convention', 'UN Convention against Cybercrime', 'United Nations Convention against Cybercrime; Strengthening International Cooperation for Combating Certain Crimes Committed by Means of ICT Systems and for the Sharing of Evidence in Electronic Form of Serious Crimes', 'Adopted by the UN General Assembly, December 2024', SURV, { type: 'Treaty', status: 'phased', note: 'Applicability depends on ratification and entry into force; current status not verified.', url: 'https://www.unodc.org/unodc/en/cybercrime/ad_hoc_committee/home.html' }],
  ['int-un-gdc', 'Global Digital Compact', 'Global Digital Compact (annex to the Pact for the Future)', 'Adopted September 2024', AI, { type: 'Declaration / resolution', url: 'https://www.un.org/techenvoy/global-digital-compact' }],
]);

const MULTILATERAL = W('INT', 'International organisations and standards bodies', 'International', [
  ['int-oecd-privacy', 'OECD Privacy Guidelines', 'OECD Guidelines on the Protection of Privacy and Transborder Flows of Personal Data (1980, revised 2013)', 'OECD/LEGAL/0188', PRIV, { type: 'Standard / guidance', url: 'https://www.oecd.org/sti/ieconomy/oecd_privacy_framework.pdf' }],
  ['int-coe-108plus', 'Convention 108+', 'Convention for the Protection of Individuals with regard to Automatic Processing of Personal Data (Convention 108), as modernised by the amending Protocol', 'ETS No. 108; CETS No. 223', PRIV, { type: 'Treaty', url: 'https://www.coe.int/en/web/data-protection/convention108-and-protocol' }],
  ['int-budapest', 'Budapest Convention', 'Convention on Cybercrime', 'ETS No. 185 (2001)', SURV, { type: 'Treaty', url: 'https://www.coe.int/en/web/cybercrime/the-budapest-convention' }],
  ['int-iso-27001', 'ISO/IEC 27001', 'ISO/IEC 27001: Information security management systems (ISMS) requirements', 'ISO/IEC 27001', STD, { type: 'Standard / guidance', note: PAID, url: 'https://www.iso.org/standard/27001' }],
  ['int-iso-27002', 'ISO/IEC 27002', 'ISO/IEC 27002: Information security controls', 'ISO/IEC 27002', STD, { type: 'Standard / guidance', note: PAID, url: 'https://www.iso.org/standard/75652.html' }],
  ['int-iso-27701', 'ISO/IEC 27701', 'ISO/IEC 27701: Privacy information management system (PIMS)', 'ISO/IEC 27701', STD, { type: 'Standard / guidance', note: PAID, url: 'https://www.iso.org/standard/71670.html' }],
  ['int-iso-27017', 'ISO/IEC 27017', 'ISO/IEC 27017: Information security controls for cloud services', 'ISO/IEC 27017', STD, { type: 'Standard / guidance', note: PAID, url: 'https://www.iso.org/standard/43757.html' }],
  ['int-iso-27018', 'ISO/IEC 27018', 'ISO/IEC 27018: Protection of PII in public clouds acting as PII processors', 'ISO/IEC 27018', STD, { type: 'Standard / guidance', note: PAID, url: 'https://www.iso.org/standard/76559.html' }],
  ['int-iso-42001', 'ISO/IEC 42001', 'ISO/IEC 42001: Artificial intelligence management system (AIMS)', 'ISO/IEC 42001', STD, { type: 'Standard / guidance', note: PAID, url: 'https://www.iso.org/standard/81230.html' }],
  ['int-cis-controls', 'CIS Critical Security Controls', 'CIS Critical Security Controls', 'Center for Internet Security', STD, { type: 'Standard / guidance', note: 'Published by CIS under its own terms; text not bundled.', url: 'https://www.cisecurity.org/controls' }],
  ['int-pci-dss', 'PCI DSS', 'Payment Card Industry Data Security Standard', 'PCI Security Standards Council', STD, { type: 'Standard / guidance', note: 'Distributed under licence terms; text not bundled.', url: 'https://www.pcisecuritystandards.org/' }],
  ['int-cobit', 'COBIT', 'COBIT: framework for governance and management of enterprise information and technology', 'ISACA', STD, { type: 'Standard / guidance', note: PAID, url: 'https://www.isaca.org/resources/cobit' }],
]);

const AFRICA_REGIONAL = W('INT', 'Africa (regional)', 'Regional', [
  ['int-au-malabo', 'Malabo Convention', 'African Union Convention on Cyber Security and Personal Data Protection', 'AU Doc. EX.CL/846(XXV) (2014)', PRIV, { type: 'Treaty', eff: '2023-06-08', note: 'Entry into force of 8 June 2023 taken from the supplied directory; not verified.', url: 'https://au.int/en/treaties/african-union-convention-cyber-security-and-personal-data-protection' }],
  ['int-ecowas-dp', 'ECOWAS Supplementary Act on Personal Data', 'ECOWAS Supplementary Act A/SA.1/01/10 on Personal Data Protection within ECOWAS', 'A/SA.1/01/10 (2010)', PRIV, { type: 'Treaty', url: 'https://www.ecowas.int/' }],
  ['int-sadc-model-law', 'SADC Model Law on Data Protection', 'SADC Model Law on Data Protection', 'SADC (2013)', PRIV, { type: 'Standard / guidance', url: 'https://www.sadc.int/' }],
  ['int-eac-cyberlaws', 'EAC Legal Framework for Cyberlaws', 'East African Community Legal Framework for Cyberlaws', 'EAC', CYBER, { type: 'Standard / guidance', url: 'https://www.eac.int/' }],
]);

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONS TO EUROPEAN UNION, CANADA AND UNITED STATES
// ═══════════════════════════════════════════════════════════════════════════

const EU_MORE = W('EU', 'European Union', 'Supranational', [
  ['eu-charter', 'EU Charter (Arts. 7 and 8)', 'Charter of Fundamental Rights of the European Union: respect for private life (Art. 7) and protection of personal data (Art. 8)', 'OJ C 326, 26.10.2012, p. 391', PRIV, { type: 'Treaty', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:12012P/TXT' }],
  ['eu-edpb-guidelines', 'EDPB Guidelines', 'European Data Protection Board guidelines, recommendations and best practices on the GDPR', 'EDPB', STD, { type: 'Standard / guidance', note: 'Aggregate entry covering many separate documents.', url: 'https://www.edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en' }],
]);

const CANADA_MORE = [
  ...W('CA', 'Canada (Federal)', 'Federal', [
    ['ca-fed-bank-act', 'Bank Act', 'Bank Act (federally regulated financial institutions)', 'S.C. 1991, c. 46', FIN, { url: 'https://laws-lois.justice.gc.ca/eng/acts/b-1.01/' }],
    ['ca-fed-itsg-33', 'CSE ITSG-33', 'IT Security Risk Management: A Lifecycle Approach (ITSG-33)', 'Communications Security Establishment', CYBER, { type: 'Standard / guidance', url: 'https://www.cyber.gc.ca/en/guidance/it-security-risk-management-activities-framework-itsg-33' }],
    ['ca-fed-cccs-baseline', 'CCCS Baseline Cyber Security Controls', 'Baseline Cyber Security Controls for Small and Medium Organizations', 'Canadian Centre for Cyber Security', CYBER, { type: 'Standard / guidance', url: 'https://www.cyber.gc.ca/en/guidance/baseline-cyber-security-controls-small-and-medium-organizations' }],
  ]),
  ...W('CA', 'Canada (Alberta)', 'Provincial', [
    ['ca-ab-foip-act', 'Alberta FOIP Act', 'Freedom of Information and Protection of Privacy Act', 'R.S.A. 2000, c. F-25', ATI, { status: 'repealed', note: 'Replaced for public bodies in 2025 by the Protection of Privacy Act and the Access to Information Act; repeal details not verified.', url: 'https://www.oipc.ab.ca/legislation/foip/' }],
  ]),
  ...W('CA', 'Canada (Municipal)', 'Municipal', [
    ['ca-mun-toronto-digital', 'Toronto Digital Infrastructure Framework', 'City of Toronto Digital Infrastructure Strategic Framework', 'City of Toronto', AI, { type: 'Standard / guidance', url: 'https://www.toronto.ca/city-government/accountability-operations-customer-service/long-term-vision-plans-and-strategies/smart-city-to/' }],
    ['ca-mun-montreal-charter', 'Montreal Digital Data Charter', 'City of Montreal Digital Data Charter', 'Ville de Montréal', AI, { type: 'Standard / guidance', url: 'https://montreal.ca/en/articles/montreals-digital-data-charter-8648' }],
  ]),
];

const US_MORE = [
  ...W('US', 'United States (Standards)', 'Federal', [
    ['us-std-soc2', 'AICPA SOC 2', 'System and Organization Controls (SOC 2) Trust Services Criteria', 'AICPA', STD, { type: 'Standard / guidance', note: 'Attestation framework published by the AICPA; text not bundled.', url: 'https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2' }],
  ]),
  ...W('US', 'United States (California)', 'State', [
    ['us-ca-iot-sb327', 'California IoT Security Law (SB 327)', 'Information privacy: connected devices (SB 327)', 'Cal. Civ. Code § 1798.91.04 et seq.', CYBER, { url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201720180SB327' }],
  ]),
  ...W('US', 'United States (Municipal)', 'Municipal', [
    ['us-mun-nyc-ll144', 'NYC Local Law 144', 'Automated Employment Decision Tools (Local Law 144 of 2021)', 'N.Y.C. Admin. Code § 20-870 et seq.', AI, { type: 'Ordinance', url: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page' }],
    ['us-mun-nyc-biometric', 'NYC Biometric Identifier Information Law', 'Biometric identifier information in places of commerce', 'N.Y.C. Admin. Code § 22-1201 et seq.', PRIV, { type: 'Ordinance', url: 'https://www.nyc.gov/site/dca/businesses/biometric-identifier-information.page' }],
    ['us-mun-nyc-tenant-privacy', 'NYC Tenant Data Privacy Act', 'Tenant Data Privacy Act (Local Law 63 of 2021)', 'N.Y.C. Local Law 63 of 2021', PRIV, { type: 'Ordinance', url: 'https://legistar.council.nyc.gov/LegislationDetail.aspx?ID=4069322&GUID=06DC9EB9-ADC3-4DC4-80C2-C6DCEEB2AE0B' }],
    ['us-mun-sf-19b', 'San Francisco Surveillance Technology Ordinance', 'Stop Secret Surveillance Ordinance', 'S.F. Admin. Code ch. 19B', SURV, { type: 'Ordinance', url: 'https://sfgov.org/eca/sites/default/files/General%20Info/19B%20Surveillance%20Technology%20Ordinance.pdf' }],
    ['us-mun-portland-facial', 'Portland facial recognition ban', 'Prohibition of face recognition technologies in places of public accommodation by private entities', 'Portland City Code ch. 34.10', SURV, { type: 'Ordinance', url: 'https://www.portland.gov/smart-city-pdx/facial-recognition-technologies' }],
    ['us-mun-seattle-surveillance', 'Seattle Surveillance Ordinance', 'Surveillance Ordinance', 'Seattle Municipal Code ch. 14.18', SURV, { type: 'Ordinance', url: 'https://www.seattle.gov/tech/initiatives/privacy/surveillance-ordinance' }],
    ['us-mun-oakland-surveillance', 'Oakland Surveillance and Community Safety Ordinance', 'Surveillance and Community Safety Ordinance', 'Oakland Municipal Code', SURV, { type: 'Ordinance', url: 'https://www.oaklandca.gov/boards-commissions/privacy-advisory-commission' }],
    ['us-mun-cambridge-boston', 'Cambridge and Boston surveillance ordinances', 'Municipal surveillance and facial-recognition ordinances of Cambridge and Boston, Massachusetts', 'Municipal ordinances', SURV, { type: 'Ordinance', note: 'Aggregate entry covering two cities.', url: 'https://www.boston.gov/departments/new-urban-mechanics/surveillance-oversight-and-information-sharing' }],
  ]),
];

// ═══════════════════════════════════════════════════════════════════════════
// GULF COOPERATION COUNCIL
// ═══════════════════════════════════════════════════════════════════════════

const GCC = [
  ...W('SA', 'Saudi Arabia', 'Federal', [
    ['sa-pdpl', 'Saudi PDPL', 'Personal Data Protection Law (as amended 2023)', 'Royal Decree M/19 of 2021', PRIV, { url: 'https://dgp.sdaia.gov.sa/wps/wcm/connect/ce84f976-2fdf-4a76-a8c4-638b7ca9e3ba/Personal%2BData%2BEnglish.pdf?CACHEID=ROOTWORKSPACE-ce84f976-2fdf-4a76-a8c4-638b7ca9e3ba-oMcvYOB&CONVERT_TO=url&MOD=AJPERES' }],
    ['sa-nca-ecc', 'NCA Essential Cybersecurity Controls', 'Essential Cybersecurity Controls (ECC), with the Cloud Cybersecurity Controls (CCC) and Operational Technology Cybersecurity Controls (OTCC)', 'National Cybersecurity Authority', CYBER, { type: 'Standard / guidance', url: 'https://nca.gov.sa/en/regulatory-documents/controls-and-guidelines/' }],
    ['sa-sama-csf', 'SAMA Cyber Security Framework', 'SAMA Cyber Security Framework', 'Saudi Central Bank', CYBER, { type: 'Standard / guidance', url: 'https://www.sama.gov.sa/en-US/RulesInstructions/CyberSecurity/Pages/Home.aspx' }],
  ]),
  ...W('AE', 'United Arab Emirates (Federal)', 'Federal', [
    ['ae-pdpl', 'UAE PDPL', 'Federal Decree-Law No. 45 of 2021 regarding the Protection of Personal Data', 'Federal Decree-Law 45/2021', PRIV, { url: 'https://www.uaelegislation.gov.ae/ar/legislations/1972/download' }],
    ['ae-ict-health', 'UAE ICT in Health Fields Law', 'Federal Law No. 2 of 2019 on the Use of Information and Communication Technology in Health Fields', 'Federal Law 2/2019', HEALTH, { url: 'https://mohap.gov.ae/en/about-us/legal-references' }],
    ['ae-ia-regulation', 'UAE Information Assurance Regulation', 'UAE Information Assurance (IA) Regulation', 'NESA / UAE Cybersecurity Council', CYBER, { type: 'Standard / guidance', url: 'https://csc.gov.ae/' }],
  ]),
  ...W('AE', 'United Arab Emirates (DIFC)', 'Free zone', [
    ['ae-difc-dpl', 'DIFC Data Protection Law', 'DIFC Data Protection Law No. 5 of 2020 (consolidated July 2025)', 'DIFC Law No. 5 of 2020; consolidated July 2025, including DIFC Laws Amendment Law No. 1 of 2025', PRIV, { url: 'https://assets.difc.com/v1/media/edge/images/dubaiintern0078-difcexperie96c5-production-3253/media/project/difcexperiences/difc/difcwebsite/documents/laws--regulations/data-protection-law.pdf', note: 'Publisher consolidation dated July 2025; it states that DIFC Laws Amendment Law No. 1 of 2025 is included. The catalogue records the publication metadata without independently determining legal validity.' }],
  ]),
  ...W('AE', 'United Arab Emirates (ADGM)', 'Free zone', [
    ['ae-adgm-dpr', 'ADGM Data Protection Regulations', 'ADGM Data Protection Regulations 2021', 'ADGM Regulations 2021', PRIV, { type: 'Regulation', url: 'https://en.adgm.thomsonreuters.com/sites/default/files/net_file_store/ADGM1547_23167_VER992025.pdf', note: 'ADGM legal database text, August 2025; verify amendment and current-status details before modeling.' }],
  ]),
  ...W('QA', 'Qatar', 'Federal', [
    ['qa-law-13-2016', 'Qatar Personal Data Privacy Law', 'Law No. 13 of 2016 Concerning Personal Data Privacy Protection', 'Law 13/2016', PRIV, { url: 'https://compliance.qcert.org/en/library/privacy-law' }],
  ]),
  ...W('QA', 'Qatar (QFC)', 'Free zone', [
    ['qa-qfc-dpr', 'QFC Data Protection Regulations', 'Qatar Financial Centre Data Protection Regulations 2021', 'QFC Regulations 2021', PRIV, { type: 'Regulation', url: 'https://www.qfc.qa/en/operating-with-qfc/data-protection' }],
  ]),
  ...W('BH', 'Bahrain', 'Federal', [
    ['bh-pdpl', 'Bahrain PDPL', 'Law No. 30 of 2018 Issuing the Personal Data Protection Law', 'Law 30/2018', PRIV, { url: 'https://www.pdp.gov.bh/en/assets/pdf/regulations.pdf' }],
  ]),
  ...W('OM', 'Oman', 'Federal', [
    ['om-pdpl', 'Oman PDPL', 'Royal Decree No. 6/2022 Promulgating the Personal Data Protection Law', 'Royal Decree 6/2022', PRIV, { note: 'The directory also cites 2024 Executive Regulations; not separately catalogued or verified.', url: 'https://mtcit.gov.om/ITAPortal/Data/English/DocLibrary/202222894543554/Royal%20Decree%206-2022.pdf' }],
  ]),
  ...W('KW', 'Kuwait', 'Federal', [
    ['kw-citra-dpr', 'Kuwait CITRA Data Privacy Regulation', 'CITRA Data Privacy Protection Regulation (Decision No. 26 of 2024)', 'CITRA Decision 26/2024', PRIV, { type: 'Regulation', note: 'Decision number and year taken from the supplied directory; not verified.', url: 'https://citra.gov.kw/sites/en/Pages/Regulations.aspx' }],
  ]),
];

// ═══════════════════════════════════════════════════════════════════════════
// INDIA
// ═══════════════════════════════════════════════════════════════════════════

const INDIA = W('IN', 'India', 'Federal', [
  ['in-dpdp-act', 'DPDP Act 2023', 'Digital Personal Data Protection Act, 2023', 'Act No. 22 of 2023', PRIV, { status: 'phased', url: 'https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf', note: 'Assented 11 August 2023. Commencement is phased by Gazette notification; the Act must not be treated as wholly in force based on assent date alone.' }],
]);

// ═══════════════════════════════════════════════════════════════════════════
// JAPAN
// ═══════════════════════════════════════════════════════════════════════════

const JAPAN = W('JP', 'Japan', 'Federal', [
  ['jp-appi', 'APPI', 'Act on the Protection of Personal Information (Act No. 57 of 2003)', 'Act No. 57 of 2003', PRIV, { url: 'https://laws.e-gov.go.jp/api/1/lawdata/415AC0000000057', note: 'Canonical source is current Japanese text from the e-Gov Law API. The PPC English translation is tentative and dated; translation status must be reviewed separately.' }],
  ['jp-basic-cyber-act', 'Basic Act on Cybersecurity', 'Basic Act on Cybersecurity', 'Act No. 104 of 2014', CYBER, { url: 'https://www.japaneselawtranslation.go.jp/en/laws/view/3789' }],
  ['jp-my-number-act', 'My Number Act', 'Act on the Use of Numbers to Identify a Specific Individual in Administrative Procedures', 'Act No. 27 of 2013', PRIV, { url: 'https://www.ppc.go.jp/en/legal/' }],
  ['jp-tba', 'Telecommunications Business Act', 'Telecommunications Business Act (secrecy of communications; external transmission rules)', 'Act No. 86 of 1984', COMMS, { url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/eng/Resources/legislation/TBA/index.html' }],
  ['jp-meti-cyber-guidelines', 'METI Cybersecurity Management Guidelines', 'Cybersecurity Management Guidelines', 'Ministry of Economy, Trade and Industry', CYBER, { type: 'Standard / guidance', url: 'https://www.meti.go.jp/english/policy/mono_info_service/information_economy/cybersecurity/index.html' }],
  ['jp-fisc-guidelines', 'FISC Security Guidelines', 'FISC Security Guidelines on Computer Systems for Financial Institutions', 'Center for Financial Industry Information Systems', CYBER, { type: 'Standard / guidance', url: 'https://www.fisc.or.jp/english/' }],
  ['jp-ismap', 'ISMAP', 'Information System Security Management and Assessment Program', 'Government of Japan', CYBER, { type: 'Standard / guidance', url: 'https://www.ismap.go.jp/csm?id=ismap_index' }],
]);

// ═══════════════════════════════════════════════════════════════════════════
// AUSTRALIA
// ═══════════════════════════════════════════════════════════════════════════

const AUSTRALIA = [
  ...W('AU', 'Australia (Federal)', 'Federal', [
    ['au-privacy-act', 'Privacy Act 1988', 'Privacy Act 1988 (Cth), including the Australian Privacy Principles and the Notifiable Data Breaches scheme', 'Act No. 119 of 1988', PRIV, { url: 'https://www.legislation.gov.au/C2004A03712/2026-06-04/2026-06-04/text/original/epub/OEBPS/document_1/document_1.html', note: 'Pinned Federal Register of Legislation compilation 104 (C2026C00227), compiled 4 June 2026. Uncommenced amendments are not reflected in compiled text.' }],
    ['au-cyber-security-act', 'Cyber Security Act 2024', 'Cyber Security Act 2024 (Cth)', 'Act No. 98 of 2024', CYBER, { url: 'https://www.homeaffairs.gov.au/about-us/our-portfolios/cyber-security/cyber-security-act' }],
    ['au-soci-act', 'SOCI Act 2018', 'Security of Critical Infrastructure Act 2018', 'Act No. 29 of 2018', CYBER, { url: 'https://www.cisc.gov.au/legislation-regulation-and-compliance/soci-act-2018' }],
    ['au-my-health-records', 'My Health Records Act 2012', 'My Health Records Act 2012', 'Act No. 63 of 2012', HEALTH, { url: 'https://www.legislation.gov.au/Series/C2012A00063' }],
    ['au-spam-act', 'Spam Act 2003', 'Spam Act 2003', 'Act No. 129 of 2003', COMMS, { url: 'https://www.acma.gov.au/spam-and-telemarketing-laws' }],
    ['au-tia-act', 'TIA Act 1979', 'Telecommunications (Interception and Access) Act 1979', 'Act No. 114 of 1979', SURV, { url: 'https://www.legislation.gov.au/Series/C2004A02124' }],
    ['au-asd-ism', 'ASD Information Security Manual', 'Australian Government Information Security Manual (ISM)', 'Australian Signals Directorate', CYBER, { type: 'Standard / guidance', url: 'https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/ism' }],
    ['au-essential-eight', 'Essential Eight', 'Essential Eight Maturity Model', 'Australian Signals Directorate', CYBER, { type: 'Standard / guidance', url: 'https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight' }],
    ['au-apra-cps-234', 'APRA CPS 234', 'Prudential Standard CPS 234 Information Security', 'APRA CPS 234', CYBER, { type: 'Standard / guidance', url: 'https://www.apra.gov.au/information-security' }],
  ]),
  ...W('AU', 'Australia (New South Wales)', 'State', [
    ['au-nsw-ppip', 'NSW PPIP Act', 'Privacy and Personal Information Protection Act 1998', 'NSW Act No. 133 of 1998', PRIV, { url: 'https://www.ipc.nsw.gov.au/privacy/nsw-privacy-laws/ppip' }],
    ['au-nsw-hrip', 'NSW HRIP Act', 'Health Records and Information Privacy Act 2002', 'NSW Act No. 71 of 2002', HEALTH, { url: 'https://www.ipc.nsw.gov.au/privacy/nsw-privacy-laws/hrip' }],
  ]),
  ...W('AU', 'Australia (Victoria)', 'State', [
    ['au-vic-pdp', 'Victoria PDP Act', 'Privacy and Data Protection Act 2014', 'Vic Act No. 60 of 2014', PRIV, { url: 'https://ovic.vic.gov.au/privacy/about-privacy-in-victoria/' }],
    ['au-vic-health-records', 'Victoria Health Records Act', 'Health Records Act 2001', 'Vic Act No. 2 of 2001', HEALTH, { url: 'https://www.health.vic.gov.au/legislation/health-records-act' }],
  ]),
  ...W('AU', 'Australia (Queensland)', 'State', [
    ['au-qld-ip', 'Queensland IP Act', 'Information Privacy Act 2009', 'Qld Act No. 14 of 2009', PRIV, { url: 'https://www.oic.qld.gov.au/about/privacy' }],
  ]),
  ...W('AU', 'Australia (Australian Capital Territory)', 'State', [
    ['au-act-ip', 'ACT Information Privacy Act', 'Information Privacy Act 2014', 'ACT Act A2014-24', PRIV, { url: 'https://www.legislation.act.gov.au/a/2014-24/' }],
    ['au-act-health-records', 'ACT Health Records Act', 'Health Records (Privacy and Access) Act 1997', 'ACT Act A1997-125', HEALTH, { url: 'https://www.legislation.act.gov.au/a/1997-125/' }],
  ]),
  ...W('AU', 'Australia (Tasmania)', 'State', [
    ['au-tas-pip', 'Tasmania PIP Act', 'Personal Information Protection Act 2004', 'Tas Act No. 46 of 2004', PRIV, { url: 'https://www.legislation.tas.gov.au/view/html/inforce/current/act-2004-046' }],
  ]),
  ...W('AU', 'Australia (Northern Territory)', 'State', [
    ['au-nt-information-act', 'NT Information Act', 'Information Act 2002', 'NT Act', PRIV, { url: 'https://oic.nt.gov.au/' }],
  ]),
  ...W('AU', 'Australia (Western Australia)', 'State', [
    ['au-wa-pris', 'WA PRIS Act', 'Privacy and Responsible Information Sharing Act 2024', 'WA Act 2024', PRIV, { url: 'https://www.wa.gov.au/organisation/department-of-the-premier-and-cabinet/office-of-digital-government/privacy-and-responsible-information-sharing' }],
  ]),
];

// ═══════════════════════════════════════════════════════════════════════════
// CHINA
// ═══════════════════════════════════════════════════════════════════════════

const CHINA = W('CN', 'China', 'Federal', [
  ['cn-pipl', 'PIPL', 'Personal Information Protection Law of the People\'s Republic of China', 'Adopted 20 August 2021; effective 1 November 2021', PRIV, { eff: '2021-11-01', note: 'The supplied link pointed to a non-official mirror domain and was not used.' }],
  ['cn-dsl', 'Data Security Law', 'Data Security Law of the People\'s Republic of China', 'Adopted 10 June 2021; effective 1 September 2021', CYBER, { eff: '2021-09-01', note: 'The supplied link pointed to a non-official mirror domain and was not used.' }],
  ['cn-csl', 'Cybersecurity Law', 'Cybersecurity Law of the People\'s Republic of China', 'Adopted 7 November 2016; effective 1 June 2017', CYBER, { eff: '2017-06-01', url: 'https://www.cac.gov.cn/2016-11/07/c_1119867116.htm' }],
  ['cn-cac-cross-border-2024', 'CAC Cross-Border Data Flow Provisions', 'Provisions on Facilitating and Regulating Cross-Border Data Flows', 'CAC (2024)', XBORDER, { type: 'Regulation', url: 'https://www.cac.gov.cn/2024-03/22/c_1712776611775634.htm' }],
  ['cn-network-data-regs', 'Network Data Security Management Regulations', 'Network Data Security Management Regulations', 'State Council (2024), effective 2025', CYBER, { type: 'Regulation', url: 'https://www.gov.cn/zhengce/content/202409/content_6977766.htm' }],
  ['cn-genai-measures', 'Generative AI Interim Measures', 'Interim Measures for the Management of Generative Artificial Intelligence Services', 'CAC and others (2023)', AI, { type: 'Regulation', url: 'https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm' }],
  ['cn-gbt-35273', 'GB/T 35273-2020', 'Information security technology: Personal information security specification', 'GB/T 35273-2020', STD, { type: 'Standard / guidance', note: 'National standard; text not bundled.', url: 'https://std.samr.gov.cn/' }],
]);

// ═══════════════════════════════════════════════════════════════════════════
// RUSSIA
// ═══════════════════════════════════════════════════════════════════════════

const RUSSIA = W('RU', 'Russia', 'Federal', [
  ['ru-152-fz', 'Federal Law 152-FZ', 'Federal Law No. 152-FZ on Personal Data (as amended)', '152-FZ of 27 July 2006', PRIV, { url: 'https://pravo.gov.ru/proxy/ips/?docbody=&nd=102108261' }],
  ['ru-149-fz', 'Federal Law 149-FZ', 'Federal Law No. 149-FZ on Information, Information Technologies and Protection of Information', '149-FZ of 27 July 2006', CYBER, { url: 'https://pravo.gov.ru/proxy/ips/?docbody=&nd=102108264' }],
  ['ru-187-fz', 'Federal Law 187-FZ', 'Federal Law No. 187-FZ on the Security of the Critical Information Infrastructure', '187-FZ of 26 July 2017', CYBER, { url: 'https://pravo.gov.ru/proxy/ips/?docbody=&nd=102439448' }],
  ['ru-572-fz', 'Federal Law 572-FZ', 'Federal Law No. 572-FZ on Biometric Personal Data', '572-FZ of 29 December 2022', PRIV, { url: 'https://publication.pravo.gov.ru/Document/View/0001202212290090' }],
  ['ru-fstec-21', 'FSTEC Order No. 21', 'FSTEC Order No. 21: composition and content of organisational and technical measures for personal data security', 'FSTEC Order 21 (2013)', CYBER, { type: 'Regulation', url: 'https://fstec.ru/' }],
  ['ru-gov-res-1119', 'Government Resolution 1119', 'Government Resolution No. 1119: personal data security requirements and protection levels', 'Resolution 1119 (2012)', CYBER, { type: 'Regulation', url: 'https://pravo.gov.ru/proxy/ips/?docbody=&nd=102160563' }],
]);

// ═══════════════════════════════════════════════════════════════════════════
// AFRICA (NATIONAL)
// ═══════════════════════════════════════════════════════════════════════════

const AFRICA = [
  ...W('ZA', 'South Africa', 'Federal', [
    ['za-popia', 'POPIA', 'Protection of Personal Information Act', 'Act No. 4 of 2013', PRIV, { url: 'https://inforegulator.org.za/popia/' }],
    ['za-cybercrimes-act', 'Cybercrimes Act', 'Cybercrimes Act', 'Act No. 19 of 2020', SURV, { url: 'https://www.gov.za/documents/cybercrimes-act-19-2020-1-jun-2021-0000' }],
  ]),
  ...W('NG', 'Nigeria', 'Federal', [
    ['ng-ndpa', 'NDPA 2023', 'Nigeria Data Protection Act 2023', 'Act 2023', PRIV, { url: 'https://ndpc.gov.ng/' }],
    ['ng-cybercrimes-act', 'Cybercrimes Act', 'Cybercrimes (Prohibition, Prevention, etc.) Act 2015 (amended 2024)', 'Act 2015', SURV, { url: 'https://cert.gov.ng/' }],
  ]),
  ...W('KE', 'Kenya', 'Federal', [
    ['ke-dpa', 'Kenya DPA', 'Data Protection Act, 2019', 'Act No. 24 of 2019', PRIV, { url: 'https://www.odpc.go.ke/dpa-act/' }],
    ['ke-computer-misuse', 'Kenya Computer Misuse and Cybercrimes Act', 'Computer Misuse and Cybercrimes Act, 2018', 'Act No. 5 of 2018', SURV, { url: 'https://kenyalaw.org:8181/exist/kenyalex/actview.xql?actid=No.%205%20of%202018' }],
  ]),
  ...W('EG', 'Egypt', 'Federal', [
    ['eg-pdpl', 'Egypt PDPL', 'Personal Data Protection Law', 'Law No. 151 of 2020', PRIV, { url: 'https://mcit.gov.eg/en/Publication/Publication_Summary/9283' }],
    ['eg-cybercrime-law', 'Egypt Anti-Cyber and IT Crimes Law', 'Anti-Cyber and Information Technology Crimes Law', 'Law No. 175 of 2018', SURV, { url: 'https://www.egcert.eg/' }],
  ]),
  ...W('MA', 'Morocco', 'Federal', [
    ['ma-law-09-08', 'Morocco Law 09-08', 'Law No. 09-08 on the Protection of Individuals with Regard to the Processing of Personal Data', 'Law 09-08', PRIV, { url: 'https://www.cndp.ma/' }],
    ['ma-law-05-20', 'Morocco Law 05-20', 'Law No. 05-20 on Cybersecurity', 'Law 05-20', CYBER, { url: 'https://www.dgssi.gov.ma/' }],
  ]),
  ...W('GH', 'Ghana', 'Federal', [
    ['gh-dpa', 'Ghana DPA', 'Data Protection Act, 2012', 'Act 843', PRIV, { url: 'https://dataprotection.org.gh/' }],
    ['gh-cybersecurity-act', 'Ghana Cybersecurity Act', 'Cybersecurity Act, 2020', 'Act 1038', CYBER, { url: 'https://csa.gov.gh/' }],
  ]),
  ...W('MU', 'Mauritius', 'Federal', [
    ['mu-dpa', 'Mauritius DPA', 'Data Protection Act 2017', 'Act No. 20 of 2017', PRIV, { url: 'https://dataprotection.govmu.org/' }],
  ]),
  ...W('RW', 'Rwanda', 'Federal', [
    ['rw-law-058-2021', 'Rwanda Data Protection Law', 'Law Relating to the Protection of Personal Data and Privacy', 'Law No. 058/2021', PRIV, { url: 'https://dpo.gov.rw/' }],
  ]),
  ...W('UG', 'Uganda', 'Federal', [
    ['ug-dppa', 'Uganda DPPA', 'Data Protection and Privacy Act, 2019', 'Act 2019', PRIV, { url: 'https://www.pdpo.go.ug/' }],
  ]),
  ...W('SN', 'Senegal', 'Federal', [
    ['sn-law-2008-12', 'Senegal Law 2008-12', 'Law No. 2008-12 on Personal Data Protection', 'Law 2008-12', PRIV, { url: 'https://www.cdp.sn/' }],
  ]),
  ...W('CI', "Côte d'Ivoire", 'Federal', [
    ['ci-law-2013-450', "Côte d'Ivoire Law 2013-450", 'Law No. 2013-450 on the Protection of Personal Data', 'Law 2013-450', PRIV, { url: 'https://www.artci.ci/' }],
  ]),
];

export const WORLD_CATALOGUE: CatalogueInstrument[] = [
  ...UN, ...MULTILATERAL, ...AFRICA_REGIONAL,
  ...EU_MORE, ...CANADA_MORE, ...US_MORE,
  ...GCC, ...INDIA, ...JAPAN, ...AUSTRALIA, ...CHINA, ...RUSSIA, ...AFRICA,
];
