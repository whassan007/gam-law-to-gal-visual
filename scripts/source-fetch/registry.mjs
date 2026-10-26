/**
 * Source registry: catalogue id -> where the authoritative text comes from.
 *
 * `expect` phrases must all appear in the fetched text, otherwise the entry is
 * stored but flagged `mismatch` (wrong page, redirect, boilerplate...).
 * Entries without `parts` are recorded with their `status` and `note` so the
 * UI can explain honestly why no text is available.
 */

const justice = (id, code, expect, note) => ({ id, parts: [{ kind: 'justice', code }], expect, note });
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
const html = (id, url, expect, opts = {}) => ({ id, parts: [{ kind: 'html', url, ...opts }], expect, note: opts.note });
const pdf = (id, url, expect, note) => ({ id, parts: [{ kind: 'pdf', url }], expect, note });
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

  // ── Canada: Quebec ──────────────────────────────────────────────────────
  none('ca-qc-law25', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-qc-private-sector-act', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-qc-access-act', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-qc-it-framework', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-qc-health-info-act', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-qc-info-resources-act', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-qc-charter', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),

  // ── Canada: British Columbia ────────────────────────────────────────────
  html('ca-bc-pipa', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/03063_01', ['Personal Information Protection Act']),
  html('ca-bc-fippa', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96165_00', ['Freedom of Information and Protection of Privacy Act']),
  html('ca-bc-privacy-act', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96373_01', ['Privacy Act', 'violation of privacy']),
  html('ca-bc-ehealth-act', 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/08038_01', ['E-Health']),

  // ── Canada: Ontario (bot-protected single-page app) ─────────────────────
  none('ca-on-phipa', 'blocked', 'Ontario e-Laws is a script-rendered site behind bot protection; automated retrieval is not possible. Use the official link.'),
  none('ca-on-fippa', 'blocked', 'Ontario e-Laws is behind bot protection; use the official link.'),
  none('ca-on-mfippa', 'blocked', 'Ontario e-Laws is behind bot protection; use the official link.'),

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
  none('ca-fed-c27-cppa-aida', 'blocked', 'parl.ca rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-fed-c8-cyber', 'blocked', 'parl.ca rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  html('ca-fed-osfi-b13', 'https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/technology-cyber-risk-management', ['Technology and Cyber Risk']),
  html('ca-fed-osfi-e23', 'https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/guideline-e-23-model-risk-management-2027', ['model risk']),
  none('ca-fed-tbs-privacy-policy', 'blocked', 'tbs-sct.canada.ca returned a script redirect stub rather than the policy text; not retrievable automatically. Use the official link.'),
  none('ca-fed-tbs-security-policy', 'blocked', 'tbs-sct.canada.ca returned a script redirect stub rather than the policy text; not retrievable automatically. Use the official link.'),
  none('ca-fed-csa-q830', 'no-source', 'A copyrighted CSA Group standard that is not freely published. Its text is reproduced as Schedule 1 of PIPEDA; see the PIPEDA entry.'),
  celex('ca-fed-eu-adequacy', '32002D0002', ['Canadian']),
  none('ca-qc-confidentiality-incidents-regs', 'blocked', 'Légis Québec rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-on-cyber-act', 'blocked', 'Ontario e-Laws is behind bot protection; use the official link.'),

  // Canada: provinces and territories
  pdf('ca-ab-pipa', 'https://kings-printer.alberta.ca/documents/Acts/P06P5.pdf', ['Personal Information Protection Act']),
  pdf('ca-ab-hia', 'https://kings-printer.alberta.ca/documents/Acts/H05.pdf', ['Health Information Act']),
  pdf('ca-mb-phia', 'https://web2.gov.mb.ca/laws/statutes/ccsm/_pdf.php?cap=p33.5', ['Personal Health Information Act']),
  pdf('ca-mb-fippa', 'https://web2.gov.mb.ca/laws/statutes/ccsm/_pdf.php?cap=f175', ['Freedom of Information and Protection of Privacy Act']),
  pdf('ca-ns-pha', 'https://nslegislature.ca/sites/default/files/legc/statutes/personal%20health%20information.pdf', ['Personal Health Information Act']),
  pdf('ca-ns-foipop', 'https://nslegislature.ca/sites/default/files/legc/statutes/freedom%20of%20information%20and%20protection%20of%20privacy.pdf', ['Freedom of Information and Protection of Privacy Act']),
  pdf('ca-nb-phipaa', 'https://laws.gnb.ca/en/ShowPdf/cs/P-7.05.pdf', ['Personal Health Information Privacy and Access Act']),
  pdf('ca-nb-rtipp', 'https://laws.gnb.ca/en/ShowPdf/cs/R-10.6.pdf', ['Right to Information and Protection of Privacy Act']),
  html('ca-nl-phia', 'https://www.assembly.nl.ca/legislation/sr/statutes/p07-01.htm', ['Personal Health Information Act']),
  html('ca-nl-atippa', 'https://www.assembly.nl.ca/legislation/sr/statutes/a01-2.htm', ['Access to Information and Protection of Privacy Act']),
  pdf('ca-pe-hia', 'https://www.princeedwardisland.ca/sites/default/files/legislation/h-01-41-health_information_act.pdf', ['Health Information Act']),
  pdf('ca-pe-foipp', 'https://www.princeedwardisland.ca/sites/default/files/legislation/f-15-01-freedom_of_information_and_protection_of_privacy_act.pdf', ['Freedom of Information and Protection of Privacy Act']),
  none('ca-yt-atipp', 'blocked', 'laws.yukon.ca rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  none('ca-yt-hipma', 'blocked', 'laws.yukon.ca rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),

  // US federal (remaining)
  usc('us-fed-hitech', 42, ['17921', '17931', '17932', '17933', '17934', '17935', '17936', '17937', '17938', '17939', '17951', '17952', '17953'], ['covered entity|business associate'], 'Codified HITECH Act provisions (Title XIII of Pub. L. 111-5, 42 U.S.C. ch. 156); the rest of Pub. L. 111-5 is the unrelated 2009 stimulus act.'),
  usc('us-fed-fisa', 50, [...range('', 1801, 1813), '1881', '1881a', '1881b', '1881c', '1881d', '1881e', '1881f', '1881g'], ['foreign intelligence'], 'FISA Title I (electronic surveillance, §§ 1801-1813) and Title VII (§§ 1881-1881g) only; other titles are not included.'),
  usc('us-fed-cloud-act', 18, ['2713', '2523'], ['electronic communication'], 'The CLOUD Act (Pub. L. 115-141, Div. V) is codified at 18 U.S.C. §§ 2713 and 2523; the omnibus appropriations act it was enacted in is not included.'),
  usc('us-fed-nerc-cip', 16, ['824o'], ['reliability standard'], 'Statute only (Federal Power Act § 215). The NERC CIP Reliability Standards themselves are published by NERC and not fetched.'),
  ecfr('us-fed-reg-sci', [[17, 242, '242.1000'], [17, 242, '242.1001'], [17, 242, '242.1002'], [17, 242, '242.1003'], [17, 242, '242.1004'], [17, 242, '242.1005'], [17, 242, '242.1006'], [17, 242, '242.1007']], ['systems compliance and integrity|SCI']),
  html('us-fed-dfars-7012', 'https://www.acquisition.gov/dfars/252.204-7012-safeguarding-covered-defense-information-and-cyber-incident-reporting.', ['covered defense information']),
  html('us-fed-far-52-204-21', 'https://www.acquisition.gov/far/52.204-21', ['Basic Safeguarding']),
  html('us-fed-eo-14028', 'https://www.federalregister.gov/documents/full_text/html/2021/05/17/2021-10460.html', ['Improving the Nation']),
  none('us-fed-sec-cyber-disclosure', 'no-source', 'Not fetched: the adopting release is a long PDF on sec.gov, which requires a declared contact in the User-Agent; retrieval was not attempted.'),
  none('us-fed-padfa', 'no-source', 'Enacted as Division I of Pub. L. 118-50, a multi-thousand-page omnibus act; the division was not extracted.'),
  none('us-fed-omb-a130', 'no-source', 'Not fetched: no stable machine-readable source was identified.'),
  none('us-fed-eu-us-dpf', 'no-source', 'A certification framework administered by the U.S. Department of Commerce at dataprivacyframework.gov; no single authoritative text was fetched.'),
  pdf('us-fed-nist-csf', 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf', ['Cybersecurity Framework']),
  pdf('us-fed-nist-privacy', 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.01162020.pdf', ['Privacy Framework']),
  pdf('us-fed-nist-800-53', 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf', ['Security and Privacy Controls']),
  pdf('us-fed-nist-800-171', 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171r3.pdf', ['Controlled Unclassified Information']),
  pdf('us-fed-nist-800-122', 'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-122.pdf', ['Personally Identifiable Information']),
  pdf('us-fed-nist-ai-rmf', 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf', ['Artificial Intelligence Risk Management Framework']),

  // US: California (legislature site rejects automated requests)
  ...['us-ca-ccpa', 'us-ca-cmia', 'us-ca-delete-act', 'us-ca-breach', 'us-ca-caloppa', 'us-ca-shine-the-light', 'us-ca-cipa', 'us-ca-calecpa', 'us-ca-aadc', 'us-ca-sb53', 'us-ca-constitution']
    .map((id) => none(id, 'blocked', 'leginfo.legislature.ca.gov rejected automated requests (HTTP 403); no workaround attempted. Use the official link.')),
  { id: 'us-ca-ccpa-regs', parts: [
    { kind: 'pdf', url: 'https://cppa.ca.gov/regulations/pdf/20230329_final_regs_text.pdf', label: 'CCPA Regulations, final text (March 2023)' },
    { kind: 'pdf', url: 'https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf', label: 'CCPA Updates, Cybersecurity Audits, Risk Assessments, ADMT and Insurance Regulations (approved text)' },
  ], expect: ['California Consumer Privacy Act'], note: 'Two texts: the March 2023 final regulations and the later approved updates; whether the updates are in force or amended since was not verified.' },

  // US: state comprehensive privacy laws
  html('us-va-vcdpa', 'https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/', ['Consumer Data Protection Act']),
  pdf('us-co-cpa', 'https://leg.colorado.gov/sites/default/files/2021a_190_signed.pdf', ['Colorado Privacy Act'], 'Signed session law (SB 21-190) as enacted, not the current consolidated statute.'),
  none('us-ct-ctdpa', 'blocked', 'cga.ct.gov serves an incomplete TLS certificate chain, so the connection cannot be verified; verification was not disabled. Use the official link.'),
  none('us-ut-ucpa', 'blocked', 'le.utah.gov renders statute text with scripts and the enrolled-bill URL tried returned 404. Use the official link.'),
  pdf('us-tx-tdpsa', 'https://capitol.texas.gov/tlodocs/88R/billtext/pdf/HB00004F.pdf', ['Data Privacy and Security Act'], 'HB 4 (88th Leg.) as enacted.'),
  pdf('us-or-ocpa', 'https://olis.oregonlegislature.gov/liz/2023R1/Downloads/MeasureDocument/SB619/Enrolled', ['consumer'], 'Enrolled SB 619 as enacted, not the current consolidated statute.'),
  { id: 'us-mt-mcdpa', parts: [{ kind: 'crawl', url: 'https://www.leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/sections_index.html', linkPattern: /href="([^"]*0300-0140-0280-\d+\.html)"/gi }], expect: ['Consumer Data Privacy'], note: 'Montana Code Annotated Title 30, ch. 14, part 28 (current codified text).' },
  pdf('us-fl-fdbr', 'https://www.flsenate.gov/Session/Bill/2023/262/BillText/er/PDF', ['Digital Bill of Rights'], 'Enrolled SB 262 as enacted.'),
  html('us-de-dpdpa', 'https://delcode.delaware.gov/title6/c012d/index.html', ['Personal Data Privacy Act']),
  pdf('us-ia-icdpa', 'https://www.legis.iowa.gov/docs/code/715D.pdf', ['Consumer Data Protection']),
  pdf('us-ne-ndpa', 'https://nebraskalegislature.gov/FloorDocs/108/PDF/Slip/LB1074.pdf', ['Data Privacy Act'], 'Slip law (LB 1074) as enacted.'),
  pdf('us-nj-njdpa', 'https://pub.njleg.gov/Bills/2022/PL23/266_.PDF', ['personal data'], 'P.L. 2023, c. 266 as enacted.'),
  none('us-tn-tipa', 'blocked', 'publications.tnsosfiles.com rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  html('us-mn-mcdpa', 'https://www.revisor.mn.gov/statutes/cite/325M/full', ['Consumer Data Privacy']),
  pdf('us-md-modpa', 'https://mgaleg.maryland.gov/2024rs/chapters_noln/ch_454_hb0567e.pdf', ['Online Data Privacy'], 'Chapter 454 (HB 567) as enacted; the Senate companion SB 541 is Chapter 455.'),
  pdf('us-ky-kcdpa', 'https://apps.legislature.ky.gov/recorddocuments/bill/24RS/hb15/bill.pdf', ['Consumer Data Protection'], 'HB 15 as enacted.'),
  { id: 'us-ri-ridtppa', parts: [{ kind: 'crawl', url: 'https://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm' }], expect: ['Data Transparency and Privacy'] },

  // US: other state laws
  none('us-il-bipa', 'blocked', 'ilga.gov serves an incomplete TLS certificate chain, so the connection cannot be verified; verification was not disabled. Use the official link.'),
  none('us-il-pipa', 'blocked', 'ilga.gov serves an incomplete TLS certificate chain, so the connection cannot be verified; verification was not disabled. Use the official link.'),
  none('us-tx-cubi', 'blocked', 'The Texas statutes site renders text with scripts and offers no static document to fetch. Use the official link.'),
  none('us-tx-hb300', 'blocked', 'The Texas statutes site renders text with scripts and offers no static document to fetch. Use the official link.'),
  none('us-tx-itepa', 'blocked', 'The Texas statutes site renders text with scripts and offers no static document to fetch. Use the official link.'),
  pdf('us-tx-traiga', 'https://capitol.texas.gov/tlodocs/89R/billtext/pdf/HB00149F.pdf', ['Artificial Intelligence'], 'HB 149 as enacted.'),
  html('us-wa-mhmda', 'https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true', ['consumer health data']),
  html('us-wa-biometric', 'https://app.leg.wa.gov/RCW/default.aspx?cite=19.375&full=true', ['biometric']),
  pdf('us-nv-sb370', 'https://www.leg.state.nv.us/Session/82nd2023/Bills/SB/SB370_EN.pdf', ['consumer health data'], 'SB 370 as enrolled.'),
  none('us-ny-shield', 'blocked', 'nysenate.gov rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
  pdf('us-ny-dfs-500', 'https://www.dfs.ny.gov/system/files/documents/2023/10/rf_fs_2amend23NYCRR500_text_20231101.pdf', ['Cybersecurity Requirements for Financial Services Companies'], 'Second Amendment as adopted 1 Nov 2023, shown as a redline (new matter underscored, deleted matter bracketed).'),
  none('us-ma-201cmr17', 'blocked', 'mass.gov rejected automated requests (HTTP 403); no workaround attempted. Use the official link.'),
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
  none('eu-digital-omnibus', 'no-source', 'Proposal under negotiation; the Commission documents were not identified or fetched.'),
];
