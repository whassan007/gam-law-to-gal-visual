/**
 * Shared builders and category constants for the instrument catalogue files.
 * See instrument-catalogue.ts for the honesty notes that apply to all entries.
 */
import type {
  CatalogueInstrument,
  CatalogueLevel,
  InstrumentCategory,
  InstrumentStatus,
  InstrumentType,
} from '../../types/contracts';

type Level = CatalogueLevel;

export interface Opts {
  type?: InstrumentType;
  status?: InstrumentStatus;
  note?: string;
  eff?: string;
  url?: string;
  law?: string;
  /** Entry and link came from a user-supplied reference list. */
  user?: boolean;
}

export type Row = [id: string, short: string, name: string, citation: string, category: InstrumentCategory, opts?: Opts];

export const usc = (title: number, section: string) =>
  `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${title}-section${section}&num=0&edition=prelim`;
export const cfr = (title: number, part: number) => `https://www.ecfr.gov/current/title-${title}/part-${part}`;
export const eli = (kind: string, year: number, num: number) => `https://eur-lex.europa.eu/eli/${kind}/${year}/${num}/oj`;
export const caAct = (code: string) => `https://laws-lois.justice.gc.ca/eng/acts/${code}/`;
export const qcAct = (code: string) => `https://www.legisquebec.gouv.qc.ca/en/document/cs/${code}`;
export const onAct = (code: string) => `https://www.ontario.ca/laws/statute/${code}`;

function inferType(citation: string): InstrumentType {
  if (/^(Implementing |Delegated )?Regulation/.test(citation)) return 'Regulation';
  if (/^Directive/.test(citation)) return 'Directive';
  if (/^(Implementing )?Decisions?\b/.test(citation)) return 'Decision';
  return 'Statute';
}

export function build(
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
    ...(o.user ? { userSupplied: true } : {}),
  }));
}

export const PRIV: InstrumentCategory = 'Privacy & data protection';
export const HEALTH: InstrumentCategory = 'Health privacy';
export const FIN: InstrumentCategory = 'Financial privacy';
export const CYBER: InstrumentCategory = 'Cybersecurity';
export const BREACH: InstrumentCategory = 'Breach notification';
export const XBORDER: InstrumentCategory = 'Cross-border transfer';
export const ATI: InstrumentCategory = 'Access to information';
export const SURV: InstrumentCategory = 'Surveillance & cybercrime';
export const AI: InstrumentCategory = 'AI & digital governance';
export const KIDS: InstrumentCategory = 'Children & education';
export const COMMS: InstrumentCategory = 'Communications & marketing';
export const STD: InstrumentCategory = 'Standards & guidance';

