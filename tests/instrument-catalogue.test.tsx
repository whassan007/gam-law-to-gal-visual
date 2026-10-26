import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  INSTRUMENT_CATALOGUE,
  VERIFIED_LAWS,
  getCatalogueForCountry,
} from '../src/data/verified-examples';
import { InstrumentCataloguePanel } from '../src/components/law-selector/InstrumentCataloguePanel';

describe('Instrument catalogue data', () => {
  it('has unique ids', () => {
    const ids = INSTRUMENT_CATALOGUE.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers Canada, the United States and the European Union in depth', () => {
    expect(getCatalogueForCountry('CA').length).toBeGreaterThanOrEqual(40);
    expect(getCatalogueForCountry('US').length).toBeGreaterThanOrEqual(100);
    expect(getCatalogueForCountry('EU').length).toBeGreaterThanOrEqual(40);
  });

  it('only links translatedLawId to bundled laws of the same country', () => {
    const linked = INSTRUMENT_CATALOGUE.filter((i) => i.translatedLawId);
    expect(linked.length).toBeGreaterThan(0);
    for (const i of linked) {
      const law = VERIFIED_LAWS.find((l) => l.id === i.translatedLawId);
      expect(law, `${i.id} -> ${i.translatedLawId}`).toBeDefined();
      expect(law!.countryCode).toBe(i.countryCode);
    }
  });

  it('every bundled CA/US/EU law has a catalogue entry', () => {
    const covered = new Set(INSTRUMENT_CATALOGUE.map((i) => i.translatedLawId));
    for (const law of VERIFIED_LAWS.filter((l) => ['CA', 'US', 'EU'].includes(l.countryCode))) {
      expect(covered.has(law.id), law.id).toBe(true);
    }
  });

  it('requires every entry to have a citation and, if it has a URL, an https one', () => {
    for (const i of INSTRUMENT_CATALOGUE) {
      expect(i.citation.length, i.id).toBeGreaterThan(0);
      if (i.officialSourceUrl) expect(i.officialSourceUrl, i.id).toMatch(/^https:\/\//);
    }
  });

  it('classifies EU regulations and directives by their citation', () => {
    const byId = (id: string) => INSTRUMENT_CATALOGUE.find((i) => i.id === id)!;
    expect(byId('eu-gdpr').instrumentType).toBe('Regulation');
    expect(byId('eu-nis2').instrumentType).toBe('Directive');
    expect(byId('eu-adequacy-us').instrumentType).toBe('Decision');
  });

  it('marks non-operative instruments honestly', () => {
    const byId = (id: string) => INSTRUMENT_CATALOGUE.find((i) => i.id === id)!;
    expect(byId('ca-fed-c27-cppa-aida').status).toBe('lapsed');
    expect(byId('eu-nis1').status).toBe('repealed');
    expect(byId('eu-drd').status).toBe('invalidated');
  });
});

describe('InstrumentCataloguePanel', () => {
  const ca = getCatalogueForCountry('CA');

  it('lists instruments and filters by search text', () => {
    render(<InstrumentCataloguePanel instruments={ca} />);
    const list = screen.getByTestId('instrument-catalogue');
    expect(within(list).getAllByRole('listitem').length).toBe(ca.length);
    fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: 'CASL' } });
    expect(within(list).getAllByRole('listitem').length).toBeLessThan(ca.length);
    expect(screen.getByTestId('catalogue-item-ca-fed-casl')).toBeTruthy();
  });

  it('filters by category', () => {
    render(<InstrumentCataloguePanel instruments={ca} />);
    fireEvent.click(screen.getByRole('button', { name: 'Health privacy' }));
    const expected = ca.filter((i) => i.category === 'Health privacy').length;
    expect(within(screen.getByTestId('instrument-catalogue')).getAllByRole('listitem').length).toBe(expected);
  });

  it('opens a translated law from its badge', () => {
    let opened = '';
    render(<InstrumentCataloguePanel instruments={ca} onOpenTranslatedLaw={(id) => (opened = id)} />);
    fireEvent.click(
      within(screen.getByTestId('catalogue-item-ca-fed-pipeda')).getByRole('button', { name: /translated/i }),
    );
    expect(opened).toBe('ca-pipeda');
  });

  it('renders nothing for an empty catalogue', () => {
    const { container } = render(<InstrumentCataloguePanel instruments={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('InstrumentCataloguePanel source texts', () => {
  it('opens a fetched source text in the reader and explains missing ones', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (String(url).endsWith('manifest.json')) {
        return new Response(
          JSON.stringify({
            entries: {
              'ca-fed-pipeda': { status: 'fetched', file: 'ca-fed-pipeda.txt', chars: 111217, contentCheck: 'match', retrievedAt: '2026-10-25T00:00:00Z', sha256: 'abc123abc123abc123' },
              'ca-fed-casl': { status: 'blocked', note: 'Site rejected automated requests.' },
            },
          }),
          { status: 200 },
        );
      }
      return new Response('Accountability\n\nAn organization is responsible for personal information.\n', { status: 200 });
    }) as typeof fetch;
    try {
      render(<InstrumentCataloguePanel instruments={getCatalogueForCountry('CA')} />);
      fireEvent.click(await screen.findByTestId('source-text-ca-fed-pipeda'));
      const viewer = await screen.findByTestId('source-text-viewer');
      expect(await within(viewer).findByText(/An organization is responsible/)).toBeTruthy();
      fireEvent.change(within(viewer).getByPlaceholderText(/find in text/i), { target: { value: 'organization' } });
      expect(within(viewer).getByText(/1 matching paragraph/)).toBeTruthy();
      fireEvent.click(within(viewer).getByRole('button', { name: /close source text/i }));
      expect(screen.queryByTestId('source-text-viewer')).toBeNull();
      expect(await screen.findByText(/Site rejected automated requests/)).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });
});
