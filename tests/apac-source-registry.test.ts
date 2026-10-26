import { describe, expect, it } from 'vitest';
import { INSTRUMENT_CATALOGUE } from '../src/data/verified-examples/instrument-catalogue';
import { REGISTRY } from '../scripts/source-fetch/registry.mjs';

describe('APAC legal source registry', () => {
  it('links India, Japan, and Australia catalogue entries to compatible sources without treating phrase checks as verification', () => {
    const expected = [
      { id: 'in-dpdp-act', code: 'IN', kind: 'pdf' },
      { id: 'jp-appi', code: 'JP', kind: 'xml' },
      { id: 'au-privacy-act', code: 'AU', kind: 'html' },
    ];

    for (const item of expected) {
      const catalogueItem = INSTRUMENT_CATALOGUE.find((instrument) => instrument.id === item.id);
      const source = REGISTRY.find((entry) => entry.id === item.id);
      const configuredSource = source && 'parts' in source ? source : undefined;

      expect(catalogueItem?.countryCode, item.id).toBe(item.code);
      expect(catalogueItem?.officialSourceUrl, item.id).toBeTruthy();
      expect(configuredSource?.parts?.[0]?.kind, item.id).toBe(item.kind);
      expect(configuredSource?.expect?.length, item.id).toBeGreaterThan(0);
      expect(configuredSource && 'note' in configuredSource ? configuredSource.note : '', item.id)
        .toMatch(/not|phrase|translation|compilation|commencement/i);
    }
  });

  it('records phased DPDP commencement and the APPI language caveat', () => {
    const india = INSTRUMENT_CATALOGUE.find((instrument) => instrument.id === 'in-dpdp-act');
    const japan = INSTRUMENT_CATALOGUE.find((instrument) => instrument.id === 'jp-appi');

    expect(india?.status).toBe('phased');
    expect(india?.statusNote).toMatch(/phased|commencement/i);
    expect(japan?.officialSourceUrl).toContain('laws.e-gov.go.jp');
    expect(japan?.statusNote).toMatch(/Japanese|tentative/i);
  });
});
