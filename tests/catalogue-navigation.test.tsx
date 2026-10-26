import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../src/App';
import sourceManifest from '../public/source-texts/manifest.json';

const appiText = readFileSync(resolve(process.cwd(), 'public/source-texts/jp-appi.txt'), 'utf8');

describe('catalogued legal source navigation', () => {
  it('opens the country catalogue from the globe and reads the bundled APPI source text', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const requested = String(url);
      if (requested.endsWith('/manifest.json')) {
        return new Response(JSON.stringify(sourceManifest), { status: 200 });
      }
      if (requested.endsWith('/jp-appi.txt')) return new Response(appiText, { status: 200 });
      return new Response('', { status: 404 });
    }) as typeof fetch;

    try {
      render(<App initialView="classic" />);
      const allJurisdictions = screen.queryByRole('button', { name: /All Jurisdictions/i });
      if (allJurisdictions) fireEvent.click(allJurisdictions);
      fireEvent.click(screen.getByTestId('country-option-JP'));

      const drawer = screen.getByTestId('world-jurisdiction-drawer');
      expect(within(drawer).getByText(/Sources Catalogued · No GAM Pack/)).toBeInTheDocument();
      fireEvent.click(within(drawer).getByTestId('browse-catalogue-JP'));

      expect(screen.getByTestId('screen-law-selection')).toBeInTheDocument();
      const appi = screen.getByTestId('catalogue-item-jp-appi');
      expect(within(appi).getByText('APPI')).toBeInTheDocument();
      fireEvent.click(await within(appi).findByTestId('source-text-jp-appi'));

      const viewer = await screen.findByTestId('source-text-viewer');
      expect(within(viewer).getByText(/個人情報の保護に関する法律/)).toBeInTheDocument();
      expect(within(viewer).getByText(/Current Japanese-language text/)).toBeInTheDocument();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
