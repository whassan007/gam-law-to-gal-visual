import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { App } from '../src/App';
import { VERIFIED_LAWS, getLawsForCountry } from '../src/data/verified-examples';
import { translateLawProvision } from '../src/engine/gam-adapter';
import { docFromSeed, encodeShare, type EditorSeed } from '../src/components/editor/editorState';

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('Interactive editor integration', () => {
  it('opens the light editor with six stages and collapsed technical output', () => {
    render(<App />);
    expect(screen.getByTestId('screen-deontic-editor')).toHaveAttribute('data-theme', 'light');
    for (const stage of ['segment', 'extract', 'entity', 'deontic', 'gal', 'alloy']) {
      expect(screen.getByTestId(`stage-card-${stage}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('editor-gal-json')).not.toBeInTheDocument();
    expect(screen.getByTestId('deontic-graph-editor')).toBeInTheDocument();
  });

  it('synchronizes a concept rename into graph and output and supports undo', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('edit-extraction-button'));
    const law = getLawsForCountry('CA')[0];
    const concept = translateLawProvision(law, law.provisions[0], 'curated').concepts.find((c) => c.mappedEntityId)!;
    const row = screen.getByTestId(`concept-edit-row-${concept.id}`);
    const field = within(row).getByRole('textbox');
    const original = (field as HTMLInputElement).value;
    fireEvent.change(field, { target: { value: 'Updated policy concept' } });
    expect(screen.getByTestId('deontic-graph-editor')).toHaveTextContent(/Updated policy\s*concept/);
    fireEvent.click(screen.getByRole('tab', { name: 'GAL-JSON' }));
    expect(screen.getByTestId('editor-gal-json')).toHaveTextContent('Updated policy concept');
    fireEvent.blur(field);
    expect(field).toHaveValue('Updated policy concept');
    expect(screen.getByTestId('editor-undo')).toBeEnabled();
    fireEvent.click(screen.getByTestId('editor-undo'));
    expect(field).toHaveValue(original);
  });

  it('translates custom text through the editor', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Translate your own statute'));
    fireEvent.change(screen.getByLabelText('Statute text'), { target: { value: 'The auditor must review records.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Translate statute →' }));
    expect(screen.getByTestId('editor-statute-text')).toHaveTextContent('The auditor must review records.');
  });

  it('restores a read-only shared model and can create an editable copy', async () => {
    const law = VERIFIED_LAWS[0], provision = law.provisions[0];
    const result = translateLawProvision(law, provision, 'curated');
    const seed: EditorSeed = { key: 'test', lawId: law.id, provisionId: provision.id, title: law.shortName, subtitle: provision.title, readiness: result.readiness, sourceText: result.sourceText, clauses: result.clauses, concepts: result.concepts, galModel: result.galModel };
    const token = await encodeShare({ v: 1, lawId: law.id, provisionId: provision.id, mode: 'curated', readOnly: true, doc: docFromSeed(seed) });
    window.history.replaceState(null, '', `/#share=${token}`);
    render(<App />);
    await waitFor(() => expect(screen.getByText('You are viewing a read-only shared model.')).toBeInTheDocument());
    expect(screen.getByTestId('editor-save-draft')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Make an editable copy' }));
    expect(screen.getByTestId('editor-save-draft')).toBeEnabled();
  });
});
