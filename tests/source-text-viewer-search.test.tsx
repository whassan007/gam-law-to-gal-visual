import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SourceTextViewer } from '../src/components/law-selector/SourceTextViewer';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SourceTextViewer search', () => {
  it('finds late matches in a large source text and keeps the immediate query visible', async () => {
    const text = Array.from({ length: 5000 }, (_, i) => `Paragraph ${i + 1}: general statutory text.`);
    text[4998] = 'Article 88: The controller shall notify the authority without undue delay.';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new TextEncoder().encode(text.join('\n')))));

    render(<SourceTextViewer title="Test Act" citation="Act 1" file="test.txt" onClose={() => {}} />);
    const viewer = screen.getByTestId('source-text-viewer');
    const search = within(viewer).getByRole('searchbox', { name: 'Find in text' });
    fireEvent.change(search, { target: { value: 'CONTROLLER' } });

    expect(search).toHaveValue('CONTROLLER');
    expect(await within(viewer).findByText(/Article 88: The controller shall notify/)).toBeTruthy();
    expect(within(viewer).getByText('1 matching paragraph')).toBeTruthy();
  });
});
