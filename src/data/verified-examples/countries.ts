/**
 * Country catalogue for the 3D globe and searchable country list.
 *
 * `isoNumeric` matches the feature ids in world-atlas `countries-110m.json`
 * (3-digit, zero-padded strings). `EU` is a supranational pseudo-entry with no
 * globe polygon (no isoNumeric); it is selectable from the list and linked
 * from EU member states.
 *
 * `supported: true` is reserved for jurisdictions that have at least one
 * bundled, provenance-tracked law in laws.ts. Every other country carries an
 * honest note instead of invented legislation.
 */
import type { CountryMetadata } from '../../types/contracts';

const NO_LAW = (name: string, extra = '') =>
  `No validated GAM demonstration law is currently bundled for ${name}.${extra} No legislation has been mapped or inferred for this jurisdiction.`;

const EU_MEMBER_NOTE = (name: string) =>
  NO_LAW(
    name,
    ' As an EU member state the EU GDPR applies directly; select the European Union entry to explore the bundled GDPR translation.',
  );

export const COUNTRIES: CountryMetadata[] = [
  // ── Supported jurisdictions (real, bundled laws) ─────────────────────────
  {
    isoA3: 'CAN', isoNumeric: '124', code: 'CA', name: 'Canada', region: 'North America', flag: '🇨🇦',
    coordinates: { lat: 45.42, lng: -75.7 }, supported: true,
    lawIds: ['ca-pipeda', 'ca-on-phipa', 'ca-qc-law25'],
    legalTradition: 'Common law (federal, Ontario); civil law (Quebec private law)',
    notes: 'Bundled: PIPEDA (federal), Ontario PHIPA, and Quebec Law 25 (Act respecting the protection of personal information in the private sector).',
  },
  {
    isoA3: 'USA', isoNumeric: '840', code: 'US', name: 'United States', region: 'North America', flag: '🇺🇸',
    coordinates: { lat: 38.9, lng: -77.04 }, supported: true,
    lawIds: ['us-hipaa', 'us-ca-ccpa', 'us-sox'],
    legalTradition: 'Common law (federal and state)',
    notes: 'Bundled: HIPAA Privacy Rule excerpts (federal), California CCPA/CPRA (state), and Sarbanes-Oxley §§ 201, 202, 301, 404 (federal).',
  },
  {
    isoA3: 'EUU', code: 'EU', name: 'European Union', region: 'Europe', flag: '🇪🇺',
    coordinates: { lat: 50.85, lng: 4.35 }, supported: true,
    lawIds: ['eu-gdpr'],
    legalTradition: 'Supranational (EU law)',
    notes: 'Supranational entry (no globe polygon). Bundled: GDPR, Regulation (EU) 2016/679. The EU AI Act (Regulation (EU) 2024/1689) is NOT bundled yet.',
  },
  {
    isoA3: 'DEU', isoNumeric: '276', code: 'DE', name: 'Germany', region: 'Europe', flag: '🇩🇪',
    coordinates: { lat: 52.52, lng: 13.4 }, supported: true,
    lawIds: ['de-bdsg', 'eu-gdpr'],
    legalTradition: 'Civil law',
    notes: 'Bundled: Bundesdatenschutzgesetz (BDSG) §§ 22, 38 plus the directly applicable EU GDPR.',
  },
  {
    isoA3: 'FRA', isoNumeric: '250', code: 'FR', name: 'France', region: 'Europe', flag: '🇫🇷',
    coordinates: { lat: 48.86, lng: 2.35 }, supported: true,
    lawIds: ['fr-lil', 'eu-gdpr'],
    legalTradition: 'Civil law',
    notes: 'Bundled: Loi Informatique et Libertés (Loi n° 78-17) Articles 8 and 44 (CNIL) plus the directly applicable EU GDPR.',
  },
  {
    isoA3: 'GBR', isoNumeric: '826', code: 'UK', name: 'United Kingdom', region: 'Europe', flag: '🇬🇧',
    coordinates: { lat: 51.51, lng: -0.13 }, supported: true,
    lawIds: ['uk-dpa'],
    legalTradition: 'Common law',
    notes: 'Bundled: Data Protection Act 2018 (ss. 8 and 64), which sits alongside the UK GDPR.',
  },

  // ── Europe (no bundled national law) ─────────────────────────────────────
  { isoA3: 'IRL', isoNumeric: '372', code: 'IE', name: 'Ireland', region: 'Europe', flag: '🇮🇪', coordinates: { lat: 53.35, lng: -6.26 }, supported: false, lawIds: [], legalTradition: 'Common law', notes: EU_MEMBER_NOTE('Ireland') },
  { isoA3: 'ITA', isoNumeric: '380', code: 'IT', name: 'Italy', region: 'Europe', flag: '🇮🇹', coordinates: { lat: 41.9, lng: 12.5 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: EU_MEMBER_NOTE('Italy') },
  { isoA3: 'ESP', isoNumeric: '724', code: 'ES', name: 'Spain', region: 'Europe', flag: '🇪🇸', coordinates: { lat: 40.42, lng: -3.7 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: EU_MEMBER_NOTE('Spain') },
  { isoA3: 'NLD', isoNumeric: '528', code: 'NL', name: 'Netherlands', region: 'Europe', flag: '🇳🇱', coordinates: { lat: 52.37, lng: 4.9 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: EU_MEMBER_NOTE('the Netherlands') },
  { isoA3: 'SWE', isoNumeric: '752', code: 'SE', name: 'Sweden', region: 'Europe', flag: '🇸🇪', coordinates: { lat: 59.33, lng: 18.07 }, supported: false, lawIds: [], legalTradition: 'Civil law (Nordic)', notes: EU_MEMBER_NOTE('Sweden') },
  { isoA3: 'POL', isoNumeric: '616', code: 'PL', name: 'Poland', region: 'Europe', flag: '🇵🇱', coordinates: { lat: 52.23, lng: 21.01 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: EU_MEMBER_NOTE('Poland') },
  { isoA3: 'AUT', isoNumeric: '040', code: 'AT', name: 'Austria', region: 'Europe', flag: '🇦🇹', coordinates: { lat: 48.21, lng: 16.37 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: EU_MEMBER_NOTE('Austria') },
  { isoA3: 'BEL', isoNumeric: '056', code: 'BE', name: 'Belgium', region: 'Europe', flag: '🇧🇪', coordinates: { lat: 50.85, lng: 4.35 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: EU_MEMBER_NOTE('Belgium') },
  { isoA3: 'CHE', isoNumeric: '756', code: 'CH', name: 'Switzerland', region: 'Europe', flag: '🇨🇭', coordinates: { lat: 46.95, lng: 7.45 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('Switzerland', ' Switzerland is not an EU member state.') },
  { isoA3: 'NOR', isoNumeric: '578', code: 'NO', name: 'Norway', region: 'Europe', flag: '🇳🇴', coordinates: { lat: 59.91, lng: 10.75 }, supported: false, lawIds: [], legalTradition: 'Civil law (Nordic)', notes: NO_LAW('Norway', ' Norway is not an EU member state.') },

  // ── Asia-Pacific ─────────────────────────────────────────────────────────
  { isoA3: 'JPN', isoNumeric: '392', code: 'JP', name: 'Japan', region: 'Asia-Pacific', flag: '🇯🇵', coordinates: { lat: 35.68, lng: 139.69 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('Japan') },
  { isoA3: 'KOR', isoNumeric: '410', code: 'KR', name: 'South Korea', region: 'Asia-Pacific', flag: '🇰🇷', coordinates: { lat: 37.57, lng: 126.98 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('South Korea') },
  { isoA3: 'SGP', isoNumeric: '702', code: 'SG', name: 'Singapore', region: 'Asia-Pacific', flag: '🇸🇬', coordinates: { lat: 1.35, lng: 103.82 }, supported: false, lawIds: [], legalTradition: 'Common law', notes: NO_LAW('Singapore') },
  { isoA3: 'AUS', isoNumeric: '036', code: 'AU', name: 'Australia', region: 'Asia-Pacific', flag: '🇦🇺', coordinates: { lat: -35.28, lng: 149.13 }, supported: false, lawIds: [], legalTradition: 'Common law', notes: NO_LAW('Australia') },
  { isoA3: 'NZL', isoNumeric: '554', code: 'NZ', name: 'New Zealand', region: 'Asia-Pacific', flag: '🇳🇿', coordinates: { lat: -41.29, lng: 174.78 }, supported: false, lawIds: [], legalTradition: 'Common law', notes: NO_LAW('New Zealand') },
  { isoA3: 'IND', isoNumeric: '356', code: 'IN', name: 'India', region: 'Asia-Pacific', flag: '🇮🇳', coordinates: { lat: 28.61, lng: 77.21 }, supported: false, lawIds: [], legalTradition: 'Common law (mixed)', notes: NO_LAW('India') },
  { isoA3: 'CHN', isoNumeric: '156', code: 'CN', name: 'China', region: 'Asia-Pacific', flag: '🇨🇳', coordinates: { lat: 39.9, lng: 116.41 }, supported: false, lawIds: [], legalTradition: 'Civil law (socialist)', notes: NO_LAW('China') },

  // ── Middle East & Africa ─────────────────────────────────────────────────
  { isoA3: 'ARE', isoNumeric: '784', code: 'AE', name: 'United Arab Emirates', region: 'Middle East & Africa', flag: '🇦🇪', coordinates: { lat: 24.45, lng: 54.38 }, supported: false, lawIds: [], legalTradition: 'Civil law (with Sharia influence)', notes: NO_LAW('the United Arab Emirates') },
  { isoA3: 'SAU', isoNumeric: '682', code: 'SA', name: 'Saudi Arabia', region: 'Middle East & Africa', flag: '🇸🇦', coordinates: { lat: 24.71, lng: 46.68 }, supported: false, lawIds: [], legalTradition: 'Sharia-based', notes: NO_LAW('Saudi Arabia') },
  { isoA3: 'EGY', isoNumeric: '818', code: 'EG', name: 'Egypt', region: 'Middle East & Africa', flag: '🇪🇬', coordinates: { lat: 30.04, lng: 31.24 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('Egypt') },
  { isoA3: 'NGA', isoNumeric: '566', code: 'NG', name: 'Nigeria', region: 'Middle East & Africa', flag: '🇳🇬', coordinates: { lat: 9.08, lng: 7.4 }, supported: false, lawIds: [], legalTradition: 'Common law (mixed)', notes: NO_LAW('Nigeria') },
  { isoA3: 'ZAF', isoNumeric: '710', code: 'ZA', name: 'South Africa', region: 'Middle East & Africa', flag: '🇿🇦', coordinates: { lat: -25.75, lng: 28.19 }, supported: false, lawIds: [], legalTradition: 'Mixed (Roman-Dutch civil and common law)', notes: NO_LAW('South Africa') },

  // ── Latin America ────────────────────────────────────────────────────────
  { isoA3: 'BRA', isoNumeric: '076', code: 'BR', name: 'Brazil', region: 'Latin America', flag: '🇧🇷', coordinates: { lat: -15.79, lng: -47.88 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('Brazil') },
  { isoA3: 'MEX', isoNumeric: '484', code: 'MX', name: 'Mexico', region: 'Latin America', flag: '🇲🇽', coordinates: { lat: 19.43, lng: -99.13 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('Mexico') },
  { isoA3: 'ARG', isoNumeric: '032', code: 'AR', name: 'Argentina', region: 'Latin America', flag: '🇦🇷', coordinates: { lat: -34.6, lng: -58.38 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('Argentina') },
  { isoA3: 'CHL', isoNumeric: '152', code: 'CL', name: 'Chile', region: 'Latin America', flag: '🇨🇱', coordinates: { lat: -33.45, lng: -70.67 }, supported: false, lawIds: [], legalTradition: 'Civil law', notes: NO_LAW('Chile') },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code.toUpperCase(), c]));
const byIsoNumeric = new Map(COUNTRIES.filter((c) => c.isoNumeric).map((c) => [c.isoNumeric as string, c]));
const byIsoA3 = new Map(COUNTRIES.map((c) => [c.isoA3.toUpperCase(), c]));

/**
 * Look up by app code ('CA', 'US', 'EU', 'UK', ...). Also accepts the ISO
 * alpha-2 'GB' for the United Kingdom and an ISO alpha-3 code.
 */
export function getCountryByCode(code: string): CountryMetadata | undefined {
  const k = code.trim().toUpperCase();
  return byCode.get(k === 'GB' ? 'UK' : k) ?? byIsoA3.get(k);
}

/** Look up by world-atlas numeric id ('124', '840', ...). Accepts unpadded numbers ('36' → '036'). */
export function getCountryByIsoNumeric(num: string): CountryMetadata | undefined {
  const k = num.trim().padStart(3, '0');
  return byIsoNumeric.get(k);
}
