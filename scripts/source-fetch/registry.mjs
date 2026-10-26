/**
 * Source registry: catalogue id -> where the authoritative text comes from.
 *
 * `expect` phrases must all appear in the fetched text, otherwise the entry is
 * stored but flagged `mismatch` (wrong page, redirect, boilerplate...).
 * Entries without `parts` are recorded with their `status` and `note` so the
 * UI can explain honestly why no text is available.
 */

const justice = (id, code, expect, note) => ({ id, parts: [{ kind: 'justice', code }], expect, note });
const a2aj = (id, citation, expect, note) => ({ id, parts: [{ kind: 'a2aj', citation }], expect, note });
const ontario = (id, code, expect, note) => ({ id, parts: [{ kind: 'ontario', code }], expect, note });
const celex = (id, codes, expect, note) => ({
  id,
  parts: [].concat(codes).map((c) => ({ kind: 'cellar', celex: c })),
  expect,
  note,
});
const ecfr = (id, specs, expect, note) => ({
  id,
  parts: specs.map(([title, part, section]) => ({ kind: 'ecfr', title, part, section })),
  expect,
  note,
});
const usc = (id, title, sections, expect, note) => ({
  id,
  parts: sections.map((s) => ({ kind: 'usc', title, section: s })),
  expect,
  note,
});
const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);
const plaw = (id, congress, number, expect, note) => ({ id, parts: [{ kind: 'plaw', congress, number }], expect, note });
const caLeg = (id, code, pattern, expect, opts = {}) => ({ id, parts: [{ kind: 'caLeg', code, pattern, ...opts }], expect, note: opts.note });
const pravoRu = (id, redid, expect, opts = {}) => ({ id, parts: [{ kind: 'pravoRu', redid, ...opts }], expect, note: opts.note });
const xml = (id, url, expect, opts = {}) => ({ id, parts: [{ kind: 'xml', url, ...opts }], expect, note: opts.note });
const html = (id, url, expect, opts = {}) => ({ id, parts: [{ kind: 'html', url, ...opts }], expect, note: opts.note });
const pdf = (id, url, expect, opts = {}) => {
  const o = typeof opts === 'string' ? { note: opts } : opts;
  return { id, parts: [{ kind: 'pdf', url, ...o }], expect, note: o.note };
};
const none = (id, status, note) => ({ id, status, note });

export const REGISTRY = [
  // ── Canada: federal (Justice Laws) ──────────────────────────────────────
  justice('ca-fed-pipeda', 'P-8.6', ['Personal Information Protection and Electronic Documents Act', 'Accountability']),
  justice('ca-fed-privacy-act', 'P-21', ['Privacy Act', 'government institution']),
  justice('ca-fed-pipeda-breach-regs', 'SOR-2018-64', ['Breach of Security Safeguards Regulations']),
  justice('ca-fed-casl', 'E-1.6', ['commercial electronic message']),
  justice('ca-fed-atia', 'A-1', ['Access to Information Act']),
  justice('ca-fed-criminal-code', 'C-46', ['Criminal Code', 'unauthorized use of computer']),
  justice('ca-fed-telecom-act', 'T-3.4', ['Telecommunications Act', 'privacy']),
  justice('ca-fed-sicda', 'S-6.9', ['Security of Canada Information Disclosure Act']),
  justice('ca-fed-rpaa', 'R-7.36', ['Retail Payment Activities Act']),

  // ── Canada: Quebec (Publications du Québec & Données Québec / A2AJ) ─────
  pdf('ca-qc-law25', 'https://www.publicationsduquebec.gouv.qc.ca/fileadmin/Fichiers_client/lois_et_reglements/LoisAnnuelles/en/2021/2021C25A.PDF', ['modernize legislative provisions', 'personal information'], 'Annual statute S.Q. 2021, c. 25 (Bill 64 / Law 25) as assented.'),
  a2aj('ca-qc-private-sector-act', 'CQLR c P-39.1', ['protection of personal information in the private sector']),
  a2aj('ca-qc-access-act', 'CQLR c A-2.1', ['Access to documents held by public bodies']),
  a2aj('ca-qc-it-framework', 'CQLR c C-1.1', ['legal framework for information technology']),
  pdf('ca-qc-health-info-act', 'https://www.publicationsduquebec.gouv.qc.ca/fileadmin/Fichiers_client/lois_et_reglements/LoisAnnuelles/en/2023/2023C5A.PDF', ['health and social services information'], 'Annual statute S.Q. 2023, c. 5 (enacting CQLR c. R-22.1) as assented.'),
  a2aj('ca-qc-info-resources-act', 'CQLR c G-1.03', ['information resources']),
  a2aj('ca-qc-charter', 'CQLR c C-12', ['Charter of human rights and freedoms', 'private life']),

  // ── Canada: British Columbia ────────────────────────────────────────────
  html('ca-bc-pipa', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/03063_01', ['Personal Information Protection Act']),
  html('ca-bc-fippa', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96165_00', ['Freedom of Information and Protection of Privacy Act']),
  html('ca-bc-privacy-act', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96373_01', ['Privacy Act', 'violation of privacy']),
  html('ca-bc-ehealth-act', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/08038_01', ['E-Health']),

  // ── Canada: Ontario (e-Laws API) ────────────────────────────────────────
  ontario('ca-on-phipa', '04p03', ['Personal Health Information Protection Act']),
  ontario('ca-on-fippa', '90f31', ['Freedom of Information and Protection of Privacy Act']),
  ontario('ca-on-mfippa', '90m56', ['Municipal Freedom of Information and Protection of Privacy Act']),

  // ── EU (Publications Office / Cellar) ───────────────────────────────────
  celex('eu-gdpr', '32016R0679', ['General Data Protection Regulation|protection of natural persons', 'Article 5', 'Article 32']),
  celex('eu-eprivacy', '32002L0058', ['privacy and electronic communications']),
  celex('eu-led', '32016L0680', ['criminal offences']),
  celex('eu-eudpr', '32018R1725', ['Union institutions']),
  celex('eu-drd', '32006L0024', ['retention of data']),
  celex('eu-pnr', '32016L0681', ['passenger name record']),
  celex('eu-europol', '32016R0794', ['Europol']),
  celex('eu-eevidence-reg', '32023R1543', ['Production Orders']),
  celex('eu-eevidence-dir', '32023L1544', ['legal representatives']),
  celex('eu-attacks-info-systems', '32013L0040', ['information systems']),
  celex('eu-data-act', '32023R2854', ['Data Act|fair access to and use of data']),
  celex('eu-dga', '32022R0868', ['European data governance']),
  celex('eu-free-flow', '32018R1807', ['non-personal data']),
  celex('eu-ehds', '32025R0327', ['European Health Data Space']),
  celex('eu-ai-act', '32024R1689', ['artificial intelligence', 'high-risk']),
  celex('eu-dsa', '32022R2065', ['Digital Services']),
  celex('eu-dma', '32022R1925', ['gatekeeper']),
  celex('eu-political-ads', '32024R0900', ['political advertising']),
  celex('eu-csam-interim', '32021R1232', ['child sexual abuse']),
  celex('eu-nis2', '32022L2555', ['cybersecurity', 'essential entities']),
  celex('eu-nis1', '32016L1148', ['security of network and information systems']),
  celex('eu-cer', '32022L2557', ['critical entities']),
  celex('eu-dora', '32022R2554', ['digital operational resilience']),
  celex('eu-cra', '32024R2847', ['products with digital elements']),
  celex('eu-cybersecurity-act', '32019R0881', ['ENISA']),
  celex('eu-eucc', '32024R0482', ['Common Criteria']),
  celex('eu-cyber-solidarity', '32025R0038', ['cyber']),
  celex('eu-institutions-cyber', '32023R2841', ['cybersecurity']),
  celex('eu-eecc', '32018L1972', ['Electronic Communications Code']),
  celex('eu-red-delegated', '32022R0030', ['Radio Equipment']),
  celex('eu-mdr', '32017R0745', ['medical devices']),
  celex('eu-eidas', '32014R0910', ['electronic identification']),
  celex('eu-eidas2', '32024R1183', ['European Digital Identity']),
  celex('eu-psd2', '32015L2366', ['payment services']),
  celex('eu-funds-transfer', '32023R1113', ['transfers of funds']),
  celex('eu-scc-2021-914', '32021D0914', ['standard contractual clauses']),
  celex('eu-scc-2021-915', '32021D0915', ['standard contractual clauses']),
  celex('eu-adequacy-us', '32023D1795', ['Data Privacy Framework']),
  celex('eu-adequacy-ca', '32002D0002', ['Canadian']),
  celex('eu-adequacy-uk', ['32021D1772', '32021D1773'], ['United Kingdom']),
  celex('eu-adequacy-jp', '32019D0419', ['Japan']),
  celex('eu-adequacy-kr', '32022D0254', ['Korea']),
  celex('eu-adequacy-other', ['32000D0518', '32011D0061', '32003D0490', '32012D0484', '32013D0065', '32010D0625', '32010D0146', '32003D0821', '32008D0393', '32004D0411'], ['adequate protection'], 'Ten separate Commission decisions concatenated: Switzerland, Israel, Argentina, Uruguay, New Zealand, Andorra, Faroe Islands, Guernsey, Jersey, Isle of Man.'),
  celex('eu-eprivacy-reg', '52017PC0010', ['privacy and electronic communications'], 'Commission proposal COM(2017) 10 (withdrawn).'),

  // ── US federal: U.S. Code (GPO govinfo) ─────────────────────────────────
  usc('us-fed-privacy-act', 5, ['552a'], ['Records maintained on individuals']),
  usc('us-fed-foia', 5, ['552'], ['Public information']),
  usc('us-fed-privacy-protection-act', 42, ['2000aa', '2000aa-5', '2000aa-6', '2000aa-7', '2000aa-11', '2000aa-12'], ['work product materials|documentary materials']),
  usc('us-fed-fda-524b', 21, ['360n-2'], ['cybersecurity']),
  usc('us-fed-fcra', 15, ['1681', '1681a', '1681b', '1681c', '1681c-1', '1681c-2', '1681d', '1681e', '1681f', '1681g', '1681h', '1681i', '1681j', '1681k', '1681l', '1681m', '1681n', '1681o', '1681p', '1681q', '1681r', '1681s', '1681s-1', '1681s-2', '1681s-3', '1681t', '1681u', '1681v', '1681w', '1681x'], ['consumer report']),
  usc('us-fed-glba', 15, range('', 6801, 6809), ['nonpublic personal information']),
  usc('us-fed-rfpa', 12, range('', 3401, 3423), ['financial records']),
  usc('us-fed-coppa', 15, range('', 6501, 6506), ['verifiable parental consent']),
  usc('us-fed-ferpa', 20, ['1232g'], ['education records']),
  usc('us-fed-ppra', 20, ['1232h'], ['Protection of pupil rights']),
  usc('us-fed-vppa', 18, ['2710'], ['video tape']),
  usc('us-fed-dppa', 18, range('', 2721, 2725), ['motor vehicle record']),
  usc('us-fed-cable-act', 47, ['551'], ['subscriber']),
  usc('us-fed-cpni', 47, ['222'], ['proprietary network information']),
  usc('us-fed-tcpa', 47, ['227'], ['telephone']),
  usc('us-fed-can-spam', 15, range('', 7701, 7713), ['commercial electronic mail']),
  usc('us-fed-ftc-act-5', 15, ['45'], ['unfair or deceptive']),
  usc('us-fed-ecpa', 18, ['2510', '2511', '2512', '2513', '2515', '2516', '2517', '2518', '2519', '2520', '2521', '2522'], ['wire, oral, or electronic communication']),
  usc('us-fed-sca', 18, range('', 2701, 2713), ['electronic communication service']),
  usc('us-fed-pen-register', 18, range('', 3121, 3127), ['pen register']),
  usc('us-fed-calea', 47, range('', 1001, 1010), ['telecommunications carrier']),
  usc('us-fed-cfaa', 18, ['1030'], ['protected computer']),
  usc('us-fed-fisma', 44, range('', 3551, 3558), ['information security']),
  usc('us-fed-cisa-2015', 6, range('', 1501, 1510), ['cyber threat indicator']),
  usc('us-fed-circia', 6, ['681', '681a', '681b', '681c', '681d', '681e', '681f', '681g'], ['covered cyber incident']),
  usc('us-fed-fedramp-act', 44, range('', 3607, 3616), ['FedRAMP']),

  // ── US federal: Public Laws (GPO) ───────────────────────────────────────
  plaw('us-fed-egov-208', 107, 347, ['E-Government Act of 2002', 'privacy impact assessment']),
  plaw('us-fed-hipaa', 104, 191, ['Health Insurance Portability and Accountability Act']),
  plaw('us-fed-gina', 110, 233, ['Genetic Information Nondiscrimination Act']),
  plaw('us-fed-facta', 108, 159, ['Fair and Accurate Credit Transactions Act']),
  plaw('us-fed-cisa-act-2018', 115, 278, ['Cybersecurity and Infrastructure Security Agency Act']),
  plaw('us-fed-iot-act', 116, 207, ['IoT Cybersecurity Improvement Act|Internet of Things']),
  plaw('us-fed-take-it-down', 119, 12, ['TAKE IT DOWN']),
  plaw('us-fed-sox', 107, 204, ['Sarbanes-Oxley Act of 2002', 'internal control']),

  // ── US federal: eCFR ────────────────────────────────────────────────────
  ecfr('us-fed-hipaa-privacy', [[45, 160], [45, 164]], ['Privacy of Individually Identifiable Health Information|protected health information'], 'Parts 160 and 164 in full (all subparts).'),
  ecfr('us-fed-hipaa-security', [[45, 164]], ['Security Standards for the Protection of Electronic Protected Health Information'], 'Part 164 in full; the Security Rule is Subpart C.'),
  ecfr('us-fed-hipaa-breach', [[45, 164]], ['Notification in the Case of Breach of Unsecured Protected Health Information'], 'Part 164 in full; the Breach Notification Rule is Subpart D.'),
  ecfr('us-fed-42cfr2', [[42, 2]], ['Confidentiality of Substance Use Disorder Patient Records']),
  ecfr('us-fed-info-blocking', [[45, 171]], ['information blocking']),
  ecfr('us-fed-hbnr', [[16, 318]], ['Health Breach Notification']),
  ecfr('us-fed-ftc-safeguards', [[16, 314]], ['Standards for Safeguarding Customer Information']),
  ecfr('us-fed-reg-p', [[12, 1016]], ['Privacy of Consumer Financial Information']),
  ecfr('us-fed-cfpb-1033', [[12, 1033]], ['Personal Financial Data Rights']),
  ecfr('us-fed-reg-sp', [[17, 248]], ['Regulation S-P|Privacy of Consumer Financial Information'], 'Part 248 in full (Regulations S-P, S-AM, S-ID).'),
  ecfr('us-fed-reg-sid', [[17, 248]], ['Identity Theft Red Flags'], 'Part 248 in full; Regulation S-ID is Subpart C.'),
  ecfr('us-fed-bank-incident-rule', [[12, 53]], ['Computer-Security Incident Notification'], 'Only 12 C.F.R. Part 53 (OCC) fetched; the parallel Federal Reserve (Part 225, Subpart N) and FDIC (Part 304, Subpart C) rules are not included.'),
  ecfr('us-fed-ffiec-guidelines', [[12, 30]], ['Information Security Standards'], '12 C.F.R. Part 30 (OCC) with Appendix B; parallel agency appendices are not included.'),
  ecfr('us-fed-coppa-rule', [[16, 312]], ["Children's Online Privacy Protection Rule"]),
  ecfr('us-fed-cmmc', [[32, 170]], ['Cybersecurity Maturity Model Certification']),
  ecfr('us-fed-doj-dsp', [[28, 202]], ['sensitive personal data']),
  // ═══ Second pass: provincial, state and guidance sources ═══════════════

  // Canada federal (remaining)
  html('ca-fed-digital-privacy-act', 'https://laws-lois.justice.gc.ca/eng/AnnualStatutes/2015_32/FullText.html', ['Digital Privacy Act'], { selector: 'main' }),
  html('ca-fed-genetic-nondiscrimination', 'https://laws-lois.justice.gc.ca/eng/AnnualStatutes/2017_3/FullText.html', ['Genetic'], { selector: 'main' }),
  justice('ca-fed-cse-act', 'C-35.3', ['Communications Security Establishment Act']),
  xml('ca-fed-c27-cppa-aida', 'https://web.archive.org/web/20260908103058id_/https://www.parl.ca/Content/Bills/441/Government/C-27/C-27_1/C-27_E.xml', ['Consumer Privacy Protection Act', 'Artificial Intelligence and Data Act'], { officialUrl: 'https://www.parl.ca/DocumentViewer/en/44-1/bill/C-27/first-reading', note: 'Bill C-27 (44th Parl., 1st Sess.) first-reading XML via Internet Archive.' }),
  html('ca-fed-c8-cyber', 'https://laws-lois.justice.gc.ca/eng/AnnualStatutes/2026_9/FullText.html', ['Critical Cyber Systems Protection Act'], { selector: 'main', note: 'Enacted as S.C. 2026, c. 9 (An Act respecting cyber security).' }),
  html('ca-fed-osfi-b13', 'https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/technology-cyber-risk-management', ['Technology and Cyber Risk']),
  html('ca-fed-osfi-e23', 'https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/guideline-e-23-model-risk-management-2027', ['model risk']),
  html('ca-fed-tbs-privacy-policy', 'https://web.archive.org/web/20260922202835id_/https://www.tbs-sct.canada.ca/pol/doc-eng.aspx?id=12510', ['Policy on Privacy Protection'], { officialUrl: 'https://www.tbs-sct.canada.ca/pol/doc-eng.aspx?id=12510', note: 'Treasury Board Policy on Privacy Protection via Internet Archive.' }),
  html('ca-fed-tbs-security-policy', 'https://web.archive.org/web/20220307200255id_/https://www.tbs-sct.gc.ca/pol/doc-eng.aspx?id=16578', ['Policy on Government Security'], { officialUrl: 'https://www.tbs-sct.canada.ca/pol/doc-eng.aspx?id=16578', note: 'Treasury Board Policy on Government Security via Internet Archive.' }),
  justice('ca-fed-csa-q830', 'P-8.6', ['Schedule 1', 'National Standard of Canada', 'Q830'], 'Reproduced in full as Schedule 1 of PIPEDA (S.C. 2000, c. 5).'),
  celex('ca-fed-eu-adequacy', '32002D0002', ['Canadian']),
  a2aj('ca-qc-confidentiality-incidents-regs', 'CQLR c A-2.1, r 3.1', ['confidentiality incidents'], 'Codified at CQLR c. A-2.1, r. 3.1 (Regulation respecting confidentiality incidents).'),
  ontario('ca-on-cyber-act', 's24024', ['Strengthening Cyber Security', 'Enhancing Digital Security'], 'S.O. 2024, c. 24 (Bill 194, Strengthening Cyber Security and Building Trust in the Public Sector Act, 2024).'),

  // Canada: provinces and territories
  pdf('ca-ab-pipa', 'https://kings-printer.alberta.ca/documents/Acts/P06P5.pdf', ['Personal Information Protection Act']),
  pdf('ca-ab-hia', 'https://kings-printer.alberta.ca/documents/Acts/H05.pdf', ['Health Information Act']),
  pdf('ca-ab-pop-act', 'https://kings-printer.alberta.ca/documents/Acts/P28P5.pdf', ['Protection of Privacy Act']),
  pdf('ca-ab-ati-act', 'https://kings-printer.alberta.ca/documents/Acts/A01P4.pdf', ['Access to Information Act']),
  pdf('ca-sas-hipa', 'https://publications.saskatchewan.ca/api/v1/products/4523/formats/8623/download', ['Health Information Protection Act']),
  pdf('ca-sas-foip', 'https://publications.saskatchewan.ca/api/v1/products/527/formats/694/download', ['Freedom of Information and Protection of Privacy Act']),
  pdf('ca-sas-lafoip', 'https://publications.saskatchewan.ca/api/v1/products/605/formats/850/download', ['Local Authority Freedom of Information']),
  pdf('ca-mb-phia', 'https://web2.gov.mb.ca/laws/statutes/ccsm/_pdf.php?cap=p33.5', ['Personal Health Information Act']),
  pdf('ca-mb-fippa', 'https://web2.gov.mb.ca/laws/statutes/ccsm/_pdf.php?cap=f175', ['Freedom of Information and Protection of Privacy Act']),
  a2aj('ca-ns-pha', 'SNS 2010, c 41', ['Personal Health Information Act']),
  a2aj('ca-ns-foipop', 'SNS 1993, c 5', ['Freedom of Information and Protection of Privacy Act']),
  pdf('ca-nb-phipaa', 'https://laws.gnb.ca/en/ShowPdf/cs/P-7.05.pdf', ['Personal Health Information Privacy and Access Act']),
  pdf('ca-nb-rtipp', 'https://laws.gnb.ca/en/ShowPdf/cs/R-10.6.pdf', ['Right to Information and Protection of Privacy Act']),
  html('ca-nl-phia', 'https://www.assembly.nl.ca/legislation/sr/statutes/p07-01.htm', ['Personal Health Information Act']),
  html('ca-nl-atippa', 'https://www.assembly.nl.ca/legislation/sr/statutes/a01-2.htm', ['Access to Information and Protection of Privacy Act']),
  pdf('ca-pe-hia', 'https://www.princeedwardisland.ca/sites/default/files/legislation/h-01-41-health_information_act.pdf', ['Health Information Act']),
  pdf('ca-pe-foipp', 'https://www.princeedwardisland.ca/sites/default/files/legislation/f-15-01-freedom_of_information_and_protection_of_privacy_act.pdf', ['Freedom of Information and Protection of Privacy Act']),
  a2aj('ca-yt-atipp', 'SY 2018, c 9', ['Access to Information and Protection of Privacy Act']),
  a2aj('ca-yt-hipma', 'SY 2013, c 16', ['Health Information Privacy and Management Act']),
  a2aj('ca-nt-atipp', 'SNWT 1994, c 20', ['Access to Information and Protection of Privacy Act']),
  a2aj('ca-nt-hia', 'SNWT 2014, c 2', ['Health Information Act']),
  pdf('ca-nu-atipp', 'https://web.archive.org/web/20240501000000id_/https://www.nunavutlegislation.ca/en/file-download/download/public/684', ['Access to Information and Protection of Privacy Act', 'S.Nu.'], { officialUrl: 'https://www.nunavutlegislation.ca/en/consolidated-law/access-information-and-protection-privacy-act-consolidation', note: 'Nunavut Legislative Assembly official consolidation of the ATIPP Act (S.N.W.T. 1994, c. 20, as amended for Nunavut by Statutes of Nunavut) via Internet Archive.' }),

  // US federal (remaining)
  usc('us-fed-hitech', 42, ['17921', '17931', '17932', '17933', '17934', '17935', '17936', '17937', '17938', '17939', '17951', '17952', '17953'], ['covered entity|business associate'], 'Codified HITECH Act provisions (Title XIII of Pub. L. 111-5, 42 U.S.C. ch. 156); the rest of Pub. L. 111-5 is the unrelated 2009 stimulus act.'),
  usc('us-fed-fisa', 50, [...range('', 1801, 1813), '1881', '1881a', '1881b', '1881c', '1881d', '1881e', '1881f', '1881g'], ['foreign intelligence'], 'FISA Title I (electronic surveillance, §§ 1801-1813) and Title VII (§§ 1881-1881g) only; other titles are not included.'),
  usc('us-fed-cloud-act', 18, ['2713', '2523'], ['electronic communication'], 'The CLOUD Act (Pub. L. 115-141, Div. V) is codified at 18 U.S.C. §§ 2713 and 2523; the omnibus appropriations act it was enacted in is not included.'),
  usc('us-fed-nerc-cip', 16, ['824o'], ['reliability standard'], 'Statute only (Federal Power Act § 215). The NERC CIP Reliability Standards themselves are published by NERC and not fetched.'),
  ecfr('us-fed-reg-sci', [[17, 242, '242.1000'], [17, 242, '242.1001'], [17, 242, '242.1002'], [17, 242, '242.1003'], [17, 242, '242.1004'], [17, 242, '242.1005'], [17, 242, '242.1006'], [17, 242, '242.1007']], ['systems compliance and integrity|SCI']),
  html('us-fed-dfars-7012', 'https://www.acquisition.gov/dfars/252.204-7012-safeguarding-covered-defense-information-and-cyber-incident-reporting.', ['covered defense information']),
  html('us-fed-far-52-204-21', 'https://www.acquisition.gov/far/52.204-21', ['Basic Safeguarding']),
  html('us-fed-eo-14028', 'https://www.federalregister.gov/documents/full_text/html/2021/05/17/2021-10460.html', ['Improving the Nation']),
  ecfr('us-fed-sec-cyber-disclosure', [[17, 229, '229.106']], ['Cybersecurity', 'Item 106'], '17 C.F.R. § 229.106 (Regulation S-K Item 106).'),
  usc('us-fed-padfa', 15, ['9901'], ['foreign adversary', 'data broker']),
  pdf('us-fed-omb-a130', 'https://www.whitehouse.gov/wp-content/uploads/legacy_drupal_files/omb/circulars/A130/a130revised.pdf', ['Managing Information as a Strategic Resource']),
  html('us-fed-eu-us-dpf', 'https://www.govinfo.gov/content/pkg/FR-2022-10-14/html/2022-22531.htm', ['Enhancing Safeguards for United States Signals Intelligence Activities'], { note: 'Executive Order 14086 (87 FR 62283); see eu-adequacy-us for the EU-U.S. Data Privacy Framework Principles.' }),
  pdf('us-fed-nist-csf', 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf', ['Cybersecurity Framework']),
  pdf('us-fed-nist-privacy', 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.01162020.pdf', ['Privacy Framework']),
  pdf('us-fed-nist-800-53', 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf', ['Security and Privacy Controls']),
  pdf('us-fed-nist-800-171', 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171r3.pdf', ['Controlled Unclassified Information']),
  pdf('us-fed-nist-800-122', 'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-122.pdf', ['Personally Identifiable Information']),
  pdf('us-fed-nist-ai-rmf', 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf', ['Artificial Intelligence Risk Management Framework']),

  // US: California (fetched via official California Legislature pubinfo_2025 bulk database)
  caLeg('us-ca-ccpa', 'CIV', '^1798\\.1\\d\\d(\\.\\d+)?$', ['California Consumer Privacy Act|consumers', 'personal information'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=1.81.5.&part=4.' }),
  caLeg('us-ca-cmia', 'CIV', '^56(\\.\\d+)?$', ['Confidentiality of Medical Information', 'medical information'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?lawCode=CIV&division=1.&part=2.6.' }),
  caLeg('us-ca-delete-act', 'CIV', '^1798\\.99\\.8\\d$', ['data broker'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=1.81.48.&part=4.' }),
  caLeg('us-ca-breach', 'CIV', '^1798\\.8(0|1|1\\.5|2|4)$', ['personal information', 'breach of the security'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=1.81.&part=4.' }),
  caLeg('us-ca-caloppa', 'BPC', '^2257[5-9]$', ['personally identifiable information', 'conspicuously post'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=BPC&division=8.&chapter=22.' }),
  caLeg('us-ca-shine-the-light', 'CIV', '^1798\\.8[34]$', ['direct marketing'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codesSections.xhtml?lawCode=CIV&sectionNum=1798.83.' }),
  caLeg('us-ca-cipa', 'PEN', '^63\\d(\\.\\d+)?$', ['wiretap|confidential communication'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=PEN&part=1.&title=15.&chapter=1.5.' }),
  caLeg('us-ca-calecpa', 'PEN', '^1546(\\.\\d+)?$', ['electronic communication information'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=PEN&part=2.&title=12.&chapter=3.6.' }),
  caLeg('us-ca-aadc', 'CIV', '^1798\\.99\\.(2[89]|[34]\\d)$', ['Age-Appropriate Design Code', 'Data Protection Impact Assessment'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=1.81.47.&part=4.' }),
  caLeg('us-ca-sb53', 'BPC', '^22757\\.1[0-6]$', ['frontier', 'artificial intelligence'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB53', note: 'Bus. & Prof. Code §§ 22757.10–22757.16 as added by SB 53 (Stats. 2025, ch. 138).' }),
  caLeg('us-ca-constitution', 'CONS', '^SECTION 1$', ['inalienable rights', 'privacy'], { article: 'I', officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CONS&sectionNum=SECTION%201.&article=I' }),
  { id: 'us-ca-ccpa-regs', parts: [
    { kind: 'pdf', url: 'https://cppa.ca.gov/regulations/pdf/20230329_final_regs_text.pdf', label: 'CCPA Regulations, final text (March 2023)' },
    { kind: 'pdf', url: 'https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf', label: 'CCPA Updates, Cybersecurity Audits, Risk Assessments, ADMT and Insurance Regulations (approved text)' },
  ], expect: ['California Consumer Privacy Act'], note: 'Two texts: the March 2023 final regulations and the later approved updates; whether the updates are in force or amended since was not verified.' },

  // US: state comprehensive privacy laws
  html('us-va-vcdpa', 'https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/', ['Consumer Data Protection Act']),
  pdf('us-co-cpa', 'https://leg.colorado.gov/sites/default/files/2021a_190_signed.pdf', ['Colorado Privacy Act'], 'Signed session law (SB 21-190) as enacted, not the current consolidated statute.'),
  html('us-ct-ctdpa', 'https://www.cga.ct.gov/current/pub/chap_743jj.htm', ['personal data', 'controller'], { useSystemCa: true }),
  pdf('us-ut-ucpa', 'https://le.utah.gov/xcode/Title13/Chapter61/C13-61_2022050420231231.pdf', ['Utah Consumer Privacy Act']),
  pdf('us-tx-tdpsa', 'https://capitol.texas.gov/tlodocs/88R/billtext/pdf/HB00004F.pdf', ['Data Privacy and Security Act'], 'HB 4 (88th Leg.) as enacted.'),
  pdf('us-or-ocpa', 'https://olis.oregonlegislature.gov/liz/2023R1/Downloads/MeasureDocument/SB619/Enrolled', ['consumer'], 'Enrolled SB 619 as enacted, not the current consolidated statute.'),
  { id: 'us-mt-mcdpa', parts: [{ kind: 'crawl', url: 'https://www.leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/sections_index.html', linkPattern: /href="([^"]*0300-0140-0280-\d+\.html)"/gi }], expect: ['Consumer Data Privacy'], note: 'Montana Code Annotated Title 30, ch. 14, part 28 (current codified text).' },
  pdf('us-fl-fdbr', 'https://www.flsenate.gov/Session/Bill/2023/262/BillText/er/PDF', ['Digital Bill of Rights'], 'Enrolled SB 262 as enacted.'),
  html('us-de-dpdpa', 'https://delcode.delaware.gov/title6/c012d/index.html', ['Personal Data Privacy Act']),
  pdf('us-ia-icdpa', 'https://www.legis.iowa.gov/docs/code/715D.pdf', ['Consumer Data Protection']),
  pdf('us-ne-ndpa', 'https://nebraskalegislature.gov/FloorDocs/108/PDF/Slip/LB1074.pdf', ['Data Privacy Act'], 'Slip law (LB 1074) as enacted.'),
  html('us-nh-nhpa', 'https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm', ['Expectation of Privacy', 'controller']),
  pdf('us-nj-njdpa', 'https://pub.njleg.gov/Bills/2022/PL23/266_.PDF', ['personal data'], 'P.L. 2023, c. 266 as enacted.'),
  pdf('us-tn-tipa', 'https://www.capitol.tn.gov/Bills/113/Bill/SB0073.pdf', ['Tennessee Information Protection Act'], 'SB 73 (113th Gen. Assemb.) as enacted.'),
  html('us-mn-mcdpa', 'https://www.revisor.mn.gov/statutes/cite/325M/full', ['Consumer Data Privacy']),
  pdf('us-md-modpa', 'https://mgaleg.maryland.gov/2024rs/chapters_noln/ch_454_hb0567e.pdf', ['Online Data Privacy'], 'Chapter 454 (HB 567) as enacted; the Senate companion SB 541 is Chapter 455.'),
  pdf('us-in-icdpa', 'https://web.archive.org/web/20240925052350id_/https://iga.in.gov/pdf-documents/123/2023/senate/bills/SB0005/SB0005.05.ENRH.pdf', ['Consumer Data Protection'], { officialUrl: 'https://iga.in.gov/legislative/laws/2026/ic/titles/24#24-15', note: 'Senate Enrolled Act No. 5 (P.L. 94-2023) via Internet Archive.' }),
  pdf('us-ky-kcdpa', 'https://apps.legislature.ky.gov/recorddocuments/bill/24RS/hb15/bill.pdf', ['Consumer Data Protection'], 'HB 15 as enacted.'),
  { id: 'us-ri-ridtppa', parts: [{ kind: 'crawl', url: 'https://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm' }], expect: ['Data Transparency and Privacy'] },

  // US: other state laws
  html('us-il-bipa', 'https://web.archive.org/web/20250530051532id_/https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57', ['Biometric Information Privacy Act'], { officialUrl: 'https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57', note: '740 ILCS 14/ via Internet Archive.' }),
  html('us-il-pipa', 'https://web.archive.org/web/20250616202837id_/https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ChapterID=67&ActID=2702', ['Personal Information Protection Act'], { officialUrl: 'https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=2702&ChapterID=67', note: '815 ILCS 530/ via Internet Archive.' }),
  html('us-il-gipa', 'https://web.archive.org/web/20250413140417id_/https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1567&ChapterID=35', ['Genetic Information Privacy Act'], { officialUrl: 'https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1567&ChapterID=35', note: '410 ILCS 513/ via Internet Archive.' }),
  html('us-tx-cubi', 'https://tcss.legis.texas.gov/resources/BC/htm/BC.503.htm', ['Biometric Identifier'], { officialUrl: 'https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm' }),
  html('us-tx-hb300', 'https://tcss.legis.texas.gov/resources/HS/htm/HS.181.htm', ['Medical Records Privacy'], { officialUrl: 'https://statutes.capitol.texas.gov/Docs/HS/htm/HS.181.htm' }),
  html('us-tx-itepa', 'https://tcss.legis.texas.gov/resources/BC/htm/BC.521.htm', ['Identity Theft Enforcement and Protection Act'], { officialUrl: 'https://statutes.capitol.texas.gov/Docs/BC/htm/BC.521.htm' }),
  pdf('us-tx-traiga', 'https://capitol.texas.gov/tlodocs/89R/billtext/pdf/HB00149F.pdf', ['Artificial Intelligence'], 'HB 149 as enacted.'),
  html('us-wa-mhmda', 'https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true', ['consumer health data']),
  html('us-wa-biometric', 'https://app.leg.wa.gov/RCW/default.aspx?cite=19.375&full=true', ['biometric']),
  pdf('us-nv-sb370', 'https://www.leg.state.nv.us/Session/82nd2023/Bills/SB/SB370_EN.pdf', ['consumer health data'], 'SB 370 as enrolled.'),
  pdf('us-ny-shield', 'https://legislation.nysenate.gov/pdf/bills/2019/S5575B', ['Stop Hacks', 'Improve Electronic Data Security'], 'Senate Bill S5575B (2019) as enacted (SHIELD Act).'),
  pdf('us-ny-child-data', 'https://legislation.nysenate.gov/pdf/bills/2023/S7695A', ['New York child data protection act'], 'Senate Bill S7695A (2023-2024) as enacted.'),
  pdf('us-ny-dfs-500', 'https://www.dfs.ny.gov/system/files/documents/2023/10/rf_fs_2amend23NYCRR500_text_20231101.pdf', ['Cybersecurity Requirements for Financial Services Companies'], 'Second Amendment as adopted 1 Nov 2023, shown as a redline (new matter underscored, deleted matter bracketed).'),
  pdf('us-ma-201cmr17', 'https://web.archive.org/web/20250101000000id_/https://www.mass.gov/doc/201-cmr-17-standards-for-the-protection-of-personal-information-of-residents-of-the-commonwealth/download', ['Standards for the Protection of Personal Information'], { officialUrl: 'https://www.mass.gov/regulations/201-CMR-1700-standards-for-the-protection-of-personal-information-of-residents-of-the-commonwealth', note: 'Official Mass.gov regulation PDF via Internet Archive.' }),
  pdf('us-co-ai-act', 'https://leg.colorado.gov/sites/default/files/2024a_205_signed.pdf', ['artificial intelligence'], 'SB 24-205 as signed; later amendments and delays are not included.'),
  html('us-ut-ai-policy', 'https://le.utah.gov/~2024/bills/static/SB0149.html', ['Artificial Intelligence']),
  html('us-fl-fipa', 'http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.171.html', ['security of confidential personal information']),
  html('us-oh-dpa', 'https://codes.ohio.gov/ohio-revised-code/chapter-1354', ['cybersecurity']),
  html('us-vt-data-broker', 'https://legislature.vermont.gov/statutes/section/09/062/02430', ['data broker']),
  ...['us-breach-all-states', 'us-insurance-data-security', 'us-state-wiretap-all-party', 'us-state-kids-codes', 'us-state-health-data']
    .map((id) => none(id, 'no-source', 'Aggregate entry covering many separate statutes; there is no single text to fetch.')),

  // EU (remaining)
  none('eu-bcr', 'no-source', 'Binding corporate rules are defined in Article 47 of the GDPR; see the GDPR entry. There is no separate instrument.'),
  pdf('eu-edpb-supp-measures', 'https://www.edpb.europa.eu/system/files/2021-06/edpb_recommendations_202001vo.2.0_supplementarymeasurestransferstools_en.pdf', ['supplementary measures']),
  celex('eu-digital-omnibus', '52025PC0837', ['Digital Omnibus'], 'European Commission proposal COM(2025) 837.'),

  // ═══ Third pass: international, regional and other jurisdictions ════════
  // Asia-Pacific: canonical sources. Content checks are intentionally omitted
  // where phrase matching would be mistaken for legal verification.
  pdf('in-dpdp-act', 'https://web.archive.org/web/20250901000000id_/https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf', ['Digital Personal Data Protection Act'], { officialUrl: 'https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf', note: 'India, Act No. 22 of 2023 (via Internet Archive). Assented 11 August 2023; commencement is phased under Gazette notification G.S.R. 843(E), 13 November 2025. Phrase check identifies document text only and does not verify commencement or legal effect.' }),
  xml('jp-appi', 'https://laws.e-gov.go.jp/api/1/lawdata/415AC0000000057', ['平成十五年法律第五十七号', '個人情報の保護に関する法律'], { note: 'Japan, Act No. 57 of 2003. Current Japanese-language text from the official e-Gov Law API; English translations are separate and tentative, not authoritative. Phrase check identifies document text only.' }),
  html('au-privacy-act', 'https://www.legislation.gov.au/C2004A03712/2026-06-04/2026-06-04/text/original/epub/OEBPS/document_1/document_1.html', ['Privacy Act 1988', 'Compilation No. 104', 'Compilation date: 4 June 2026'], { note: 'Australia, Privacy Act 1988 (Cth), compilation 104 (C2026C00227), compilation date 4 June 2026. Pinned compilation; uncommenced amendments are not included in compiled text. Phrase check identifies document text only.' }),

  html('int-udhr-art12', 'https://www.un.org/en/about-us/universal-declaration-of-human-rights', ['Article 12', 'arbitrary interference']),
  html('int-iccpr-art17', 'https://web.archive.org/web/20260925000000id_/https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-civil-and-political-rights', ['Article 17', 'arbitrary or unlawful interference'], { officialUrl: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-civil-and-political-rights', note: 'OHCHR text via Internet Archive.' }),
  pdf('int-unga-68-167', 'https://documents.un.org/api/symbol/access?s=A/RES/68/167&l=en&t=pdf', ['right to privacy in the digital age'], { officialUrl: 'https://undocs.org/A/RES/68/167' }),
  pdf('int-oecd-privacy', 'https://legalinstruments.oecd.org/public/doc/114/114.en.pdf', ['Guidelines', 'Collection Limitation Principle']),
  pdf('int-budapest', 'https://web.archive.org/web/20260901000000id_/https://rm.coe.int/1680081561', ['Convention on Cybercrime', 'illegal access'], { officialUrl: 'https://rm.coe.int/1680081561', note: 'Council of Europe ETS No. 185 via Internet Archive.' }),
  pdf('int-coe-108plus', 'https://web.archive.org/web/20260901000000id_/https://rm.coe.int/convention-108-convention-for-the-protection-of-individuals-with-regar/16808b36f1', ['Convention 108|automatic processing of personal data'], { officialUrl: 'https://rm.coe.int/convention-108-convention-for-the-protection-of-individuals-with-regar/16808b36f1', note: 'Council of Europe CETS No. 223 (Convention 108+) via Internet Archive.' }),
  celex('eu-charter', '12012P/TXT', ['Charter of Fundamental Rights', 'protection of personal data']),
  pdf('sa-pdpl', 'https://dgp.sdaia.gov.sa/wps/wcm/connect/ce84f976-2fdf-4a76-a8c4-638b7ca9e3ba/Personal%2BData%2BEnglish.pdf?CACHEID=ROOTWORKSPACE-ce84f976-2fdf-4a76-a8c4-638b7ca9e3ba-oMcvYOB&CONVERT_TO=url&MOD=AJPERES', ['Personal Data Protection Law', 'Competent Authority'], 'Official SDAIA English PDPL text. Phrase check identifies document text only; retrieval does not verify consolidated amendment status, implementing regulations, or legal interpretation.'),
  none('ae-pdpl', 'blocked', 'The UAE official legislation portal rejected a current download (HTTP 403). A prior text snapshot remains in the source directory, but its retrieval path and legal currency are unverified; the snapshot is not treated as verified current source.'),
  none('ae-adgm-dpr', 'blocked', 'The ADGM legal database rejected a current consolidated-text download (HTTP 403). A prior text snapshot remains in the source directory, but its retrieval path and legal currency are unverified; the snapshot is not treated as verified current source.'),
  pdf('ae-difc-dpl', 'https://assets.difc.com/v1/media/edge/images/dubaiintern0078-difcexperie96c5-production-3253/media/project/difcexperiences/difc/difcwebsite/documents/laws--regulations/data-protection-law.pdf', ['DIFC LAW NO. 5 OF 2020', 'Consolidated Version', 'July 2025', 'DIFC Laws Amendment Law'], 'DIFC publisher consolidated text, July 2025. The published consolidation states it includes DIFC Laws Amendment Law No. 1 of 2025; phrase check identifies document text only and does not independently determine current legal status or interpretation.'),
  html('om-pdpl', 'https://decree.om/2022/rd20220006/', ['Personal Data'], { officialUrl: 'https://qanoon.om/p/2022/rd2022006/', note: 'Royal Decree 6/2022 English translation via decree.om (linked from official Oman Qanoon portal).' }),
  html('cn-csl', 'https://www.cac.gov.cn/2016-11/07/c_1119867116.htm', ['网络安全法']),
  html('cn-cac-cross-border-2024', 'https://www.cac.gov.cn/2024-03/22/c_1712776611775634.htm', ['数据出境'], { note: 'Chinese-language original.' }),
  html('cn-genai-measures', 'https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm', ['生成式人工智能'], { note: 'Chinese-language original.' }),
  html('cn-network-data-regs', 'https://www.gov.cn/zhengce/content/202409/content_6977766.htm', ['网络数据安全管理条例'], { note: 'Chinese-language original.' }),
  pravoRu('ru-152-fz', 495372, ['персональных данных'], { officialUrl: 'http://actual.pravo.gov.ru/content/content.html#hash=98490812b3409e2a8d78a11ca9010f434ea3d9250a11dbbdb78690cd5551bdd6', note: 'Russian-language original from actual.pravo.gov.ru.' }),
  pravoRu('ru-149-fz', 485979, ['информации'], { officialUrl: 'http://actual.pravo.gov.ru/content/content.html#hash=a93cb46410f9a12778a4cbd6ce7e6ffd0e07ebd11eedeaaf7e3699a475f27c69', note: 'Russian-language original from actual.pravo.gov.ru.' }),
  pravoRu('ru-187-fz', 471260, ['критической информационной инфраструктуры'], { officialUrl: 'http://actual.pravo.gov.ru/content/content.html#hash=3f65f96628feced2ea4e7b07ff2a307d5b8c2dc2a490f5791b1929a973aa4fd8', note: 'Russian-language original from actual.pravo.gov.ru.' }),
  html('ru-gov-res-1119', 'https://base.garant.ru/70252506/', ['персональных данных'], { encoding: 'windows-1251', officialUrl: 'http://pravo.gov.ru/proxy/ips/?docbody=&nd=102160563', note: 'Russian-language original.' }),
  justice('ca-fed-bank-act', 'B-1.01', ['Bank Act']),
  html('ke-computer-misuse', 'https://web.archive.org/web/20240501000000id_/https://new.kenyalaw.org/akn/ke/act/2018/5/eng@2022-12-31', ['Computer Misuse and Cybercrimes'], { officialUrl: 'https://new.kenyalaw.org/akn/ke/act/2018/5/eng@2022-12-31', note: 'National Council for Law Reporting (Kenya Law) via Internet Archive.' }),
  pdf('us-mun-sf-19b', 'https://sfbos.org/sites/default/files/o0107-19.pdf', ['Surveillance Technology'], 'San Francisco Board of Supervisors Ordinance No. 107-19 enacting Administrative Code Chapter 19B.'),
  caLeg('us-ca-iot-sb327', 'CIV', '^1798\\.91\\.0[456]$', ['connected device'], { officialUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=1.81.26.&part=4.' }),
];
