import { afterEach, describe, expect, it, vi } from 'vitest';

describe('eCFR source provenance', () => {
  afterEach(() => {
    vi.doUnmock('../scripts/source-fetch/lib.mjs');
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns the pinned version date and requested/final URLs for a section fetch', async () => {
    const politeFetch = vi.fn(async (url: string) => {
      if (url.endsWith('/titles.json')) {
        return {
          status: 200,
          buf: Buffer.from(JSON.stringify({ titles: [{ number: 45, up_to_date_as_of: '2026-04-01' }] })),
          finalUrl: url,
        };
      }
      return {
        status: 200,
        buf: Buffer.from(`<ROOT>${'<P>Section content and legal text.</P>'.repeat(20)}</ROOT>`),
        finalUrl: 'https://www.ecfr.gov/redirected/versioned-section.xml',
      };
    });
    vi.doMock('../scripts/source-fetch/lib.mjs', async () => {
      const actual = await vi.importActual<typeof import('../scripts/source-fetch/lib.mjs')>('../scripts/source-fetch/lib.mjs');
      return { ...actual, politeFetch };
    });

    const { ADAPTERS } = await import('../scripts/source-fetch/adapters.mjs');
    const result = await ADAPTERS.ecfr({ title: 45, part: 164, section: '164.502' });

    expect(result.versionDate).toBe('2026-04-01');
    expect(result.requestedUrl).toContain('/2026-04-01/title-45.xml?section=164.502');
    expect(result.finalUrl).toBe('https://www.ecfr.gov/redirected/versioned-section.xml');
    expect(result.url).toBe('https://www.ecfr.gov/current/title-45/section-164.502');
  });
});
