import { describe, expect, it } from 'vitest';
import { INSTRUMENT_CATALOGUE } from '../src/data/verified-examples/instrument-catalogue';
import { REGISTRY } from '../scripts/source-fetch/registry.mjs';

function fetchable(id: string) {
  const entry = REGISTRY.find((candidate) => candidate.id === id);
  return entry && 'parts' in entry ? entry : undefined;
}

describe('Middle East legal source registry', () => {
  it('uses the SDAIA English PDPL source and records review caveats', () => {
    const source = fetchable('sa-pdpl');

    expect(source?.parts?.[0]?.kind).toBe('pdf');
    expect(source?.parts?.[0]?.url).toContain('dgp.sdaia.gov.sa');
    expect(source?.expect).toContain('Personal Data Protection Law');
    expect(source && 'note' in source ? source.note : undefined).toMatch(/does not verify|not verify/i);
  });

  it('records UAE Arabic and ADGM consolidated primary source provenance without asserting model verification', () => {
    const uae = fetchable('ae-pdpl');
    const adgm = fetchable('ae-adgm-dpr');

    expect(uae?.parts?.[0]?.kind).toBe('pdf');
    expect(uae?.parts?.[0]?.url).toContain('uaelegislation.gov.ae/ar/legislations/1972/download');
    expect(uae?.expect?.length).toBeGreaterThan(0);
    expect(uae && 'note' in uae ? uae.note : undefined).toMatch(/Arabic/i);

    expect(adgm?.parts?.[0]?.kind).toBe('pdf');
    expect(adgm?.parts?.[0]?.url).toContain('ADGM1547_23167_VER992025.pdf');
    expect(adgm?.expect).toEqual([]);
    expect(adgm && 'note' in adgm ? adgm.note : undefined).toMatch(/August 2025/);
    expect(adgm && 'note' in adgm ? adgm.note : undefined).toMatch(/independent review/i);
  });

  it('records the DIFC publisher consolidation and cited amendment', () => {
    const catalogue = INSTRUMENT_CATALOGUE.find((instrument) => instrument.id === 'ae-difc-dpl');
    const source = fetchable('ae-difc-dpl');

    expect(catalogue?.officialSourceUrl).toContain('assets.difc.com');
    expect(catalogue?.citation).toMatch(/consolidated July 2025/i);
    expect(catalogue?.citation).toMatch(/DIFC Laws Amendment Law No\. 1 of 2025/i);
    expect(catalogue?.statusNote).toMatch(/publisher consolidation/i);
    expect(source?.parts?.[0]?.kind).toBe('pdf');
    expect(source?.parts?.[0]?.url).toBe(catalogue?.officialSourceUrl);
    expect(source?.expect).toContain('DIFC LAW NO. 5 OF 2020');
    expect(source && 'note' in source ? source.note : undefined).toMatch(/does not independently determine current legal status/i);
  });
});
