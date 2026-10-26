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

  it('retains UAE and ADGM canonical links while reporting inaccessible source texts honestly', () => {
    const uae = REGISTRY.find((entry) => entry.id === 'ae-pdpl');
    const adgm = REGISTRY.find((entry) => entry.id === 'ae-adgm-dpr');
    const uaeCatalogue = INSTRUMENT_CATALOGUE.find((instrument) => instrument.id === 'ae-pdpl');
    const adgmCatalogue = INSTRUMENT_CATALOGUE.find((instrument) => instrument.id === 'ae-adgm-dpr');

    expect(uae && 'parts' in uae).toBe(false);
    expect(uae && 'status' in uae ? uae.status : undefined).toBe('blocked');
    expect(uaeCatalogue?.officialSourceUrl).toContain('uaelegislation.gov.ae');
    expect(uae && 'note' in uae ? uae.note : undefined).toMatch(/prior text snapshot.*unverified/i);

    expect(adgm && 'parts' in adgm).toBe(false);
    expect(adgm && 'status' in adgm ? adgm.status : undefined).toBe('blocked');
    expect(adgmCatalogue?.officialSourceUrl).toContain('ADGM1547_23167_VER992025.pdf');
    expect(adgm && 'note' in adgm ? adgm.note : undefined).toMatch(/prior text snapshot.*unverified/i);
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
