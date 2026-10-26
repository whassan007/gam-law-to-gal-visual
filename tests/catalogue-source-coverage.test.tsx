import React from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import manifest from '../public/source-texts/manifest.json';
import { INSTRUMENT_CATALOGUE, getCatalogueForCountry } from '../src/data/verified-examples/instrument-catalogue';
import { InstrumentCataloguePanel } from '../src/components/law-selector/InstrumentCataloguePanel';
import { App } from '../src/App';

describe('source manifest and jurisdiction catalogue integration', () => {
  it('verifies 247 fetched & verified laws, 2 blocked GCC entries, 0 failed/timed-out, and 6 no-source entries on disk', () => {
    const entries = Object.entries(manifest.entries);
    expect(entries.length).toBe(255);

    const fetched = entries.filter(([, e]) => e.status === 'fetched');
    const blocked = entries.filter(([, e]) => e.status === 'blocked');
    const failed = entries.filter(([, e]) => (e.status as string) === 'failed');
    const noSource = entries.filter(([, e]) => e.status === 'no-source');

    expect(fetched.length).toBe(247);
    expect(blocked.map(([id]) => id).sort()).toEqual(['ae-adgm-dpr', 'ae-pdpl']);
    expect(failed.length).toBe(0);
    expect(noSource.length).toBe(6);

    for (const [id, entry] of fetched) {
      const rec = entry as { contentCheck?: string; file?: string };
      expect(rec.contentCheck, `${id} contentCheck`).toBe('match');
      expect(rec.file, `${id} file`).toBe(`${id}.txt`);
      const fullPath = resolve(process.cwd(), 'public/source-texts', rec.file!);
      expect(existsSync(fullPath), `${id} file exists on disk`).toBe(true);
    }
  });

  it('maps every manifest instrument to a country catalogue entry', () => {
    for (const id of Object.keys(manifest.entries)) {
      const instrument = INSTRUMENT_CATALOGUE.find((entry) => entry.id === id);
      expect(instrument, `manifest entry ${id} must appear in the UI catalogue`).toBeDefined();
      expect(getCatalogueForCountry(instrument!.countryCode)).toContainEqual(instrument);
    }
  });

  it('renders every fetched source as readable and every blocked source with its status reason', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      if (String(url).endsWith('/manifest.json')) {
        return new Response(JSON.stringify(manifest), { status: 200 });
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    try {
      render(<InstrumentCataloguePanel instruments={INSTRUMENT_CATALOGUE} />);
      const list = within(screen.getByTestId('instrument-catalogue'));

      for (const [id, source] of Object.entries(manifest.entries)) {
        const item = screen.getByTestId(`catalogue-item-${id}`);
        if (source.status === 'fetched') {
          expect(await within(item).findByTestId(`source-text-${id}`), id).toBeInTheDocument();
        } else if (source.status === 'blocked' || source.status === 'failed' || source.status === 'no-source') {
          expect(within(item).getByText(/Source text not bundled/), id).toBeInTheDocument();
        }
      }

      expect(list.getAllByRole('listitem').length).toBe(INSTRUMENT_CATALOGUE.length);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('opens the source catalogue inside the upgraded Deontic Editor and translates a fetched law excerpt into GAL', async () => {
    const fippaText = readFileSync(resolve(process.cwd(), 'public/source-texts/ca-on-fippa.txt'), 'utf8');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith('/manifest.json')) return new Response(JSON.stringify(manifest), { status: 200 });
      if (u.endsWith('/ca-on-fippa.txt')) return new Response(fippaText, { status: 200 });
      return new Response('', { status: 404 });
    }) as typeof fetch;

    try {
      render(<App />);
      expect(screen.getByTestId('screen-deontic-editor')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('editor-open-catalogue'));
      const modal = screen.getByTestId('editor-catalogue-modal');
      expect(modal).toBeInTheDocument();

      const fippaItem = within(modal).getByTestId('catalogue-item-ca-on-fippa');
      const translateBtn = await within(fippaItem).findByTestId('translate-source-ca-on-fippa');
      fireEvent.click(translateBtn);

      await waitFor(() => expect(screen.queryByTestId('editor-catalogue-modal')).not.toBeInTheDocument());
      expect(screen.getByTestId('editor-statute-card')).toHaveTextContent('FIPPA (Ontario) · R.S.O. 1990, c. F.31');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
