import { describe, expect, it } from 'vitest';
import type { ExtractedConceptToken } from '../src/types/contracts';
import { isVerifiedConceptToken } from '../src/components/translation/ConceptExtractionWorkspace';

const concept = (overrides: Partial<ExtractedConceptToken> = {}): ExtractedConceptToken => ({
  id: 'concept-1',
  label: 'Disclose personal information',
  category: 'Activity',
  clauseId: 'clause-1',
  verified: true,
  sourceSpan: { start: 12, end: 40, text: 'disclose personal information' },
  ...overrides,
});

describe('model provenance verification', () => {
  it('does not treat a verified flag alone as sufficient source evidence', () => {
    expect(isVerifiedConceptToken(concept({ sourceSpan: undefined }))).toBe(false);
  });

  it('requires a non-empty source span for a verified mapped concept', () => {
    expect(isVerifiedConceptToken(concept())).toBe(true);
    expect(isVerifiedConceptToken(concept({ sourceSpan: { start: 8, end: 8 } }))).toBe(false);
  });

  it('keeps unverified and unmapped concepts out of verified counts even with a span', () => {
    expect(isVerifiedConceptToken(concept({ verified: false }))).toBe(false);
    expect(isVerifiedConceptToken(concept({ category: 'Unmapped' }))).toBe(false);
  });
});
