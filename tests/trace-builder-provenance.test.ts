import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GalJsonModel } from '../src/types/contracts';

const { patternSource } = vi.hoisted(() => ({ patternSource: 'The controller shall delete records.' }));

vi.mock('../src/engine/gam-pipeline/phase1-extractor.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/engine/gam-pipeline/phase1-extractor.js')>();
  return {
    ...actual,
    extractPatterns: () => ({ patterns: [{ subtype: 'activity', source: patternSource, entity: 'delete-records' }] }),
  };
});

import { extractLiveConcepts, segmentLegalText } from '../src/engine/gam-adapter/trace-builder';

const model: GalJsonModel = {
  model_type: 'Law_Model', context: 'Trace fixture',
  jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' }, effective_date: '2026-01-01',
  domains: ['Privacy'], entities: [{ id: 'delete-records', type: 'Activity' }], relations: [], policies: [],
};

describe('live concept source evidence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('links a pattern only to its exact occurrence inside a parsed clause', () => {
    const text = `Preamble. ${patternSource} Another sentence.`;
    const clauses = segmentLegalText(text);
    const concept = extractLiveConcepts(text, clauses, model)[0];

    const start = text.indexOf(patternSource);
    expect(concept.sourceSpan).toEqual({ start, end: start + patternSource.length, clauseId: clauses[1].id, text: patternSource });
    expect(concept.clauseId).toBe(clauses[1].id);
    expect(concept.category).toBe('Activity');
    expect(concept.mappedEntityId).toBe('delete-records');
  });

  it('withholds source span and mapping when the pattern is absent from the input', () => {
    const text = 'This source contains no matching passage.';
    const concept = extractLiveConcepts(text, segmentLegalText(text), model)[0];

    expect(concept.category).toBe('Unmapped');
    expect(concept.verified).toBe(false);
    expect(concept.sourceSpan).toBeUndefined();
    expect(concept.clauseId).toBe('');
    expect(concept.mappedEntityId).toBeUndefined();
    expect(concept.mappedRelationId).toBeUndefined();
  });
});
