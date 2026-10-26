# Ranked issues

## P1

1. **Legal version and citation provenance is incomplete.** Most source records still lack stable version identifiers, legal status/effective dates, and article-level locators. `contentCheck: match` is only a phrase check. The eCFR path now records a pinned version date and the manifest can retain requested/final URLs, but this is not yet consistently populated across all adapters or model elements.
2. **Current law text remains inaccessible for some configured sources.** India DPDP was imported through an Internet Archive copy; UAE federal and ADGM current downloads are blocked. Their retained files remain explicitly blocked/unverified. Do not use them as current verified source text.
3. **Nunavut source evidence was conflated with the NWT.** The matching text artifact is retained, but `ca-nu-atipp` is now blocked and the catalogue remains candidate-only until an authoritative Nunavut-specific current source is confirmed.
4. **Free-text legal transformation still has semantic gaps.** The `may not` deontic mismatch is fixed. Compound conditions/exceptions and some obligation/permission/prohibition mappings still need fail-closed behavior and model-level validation; a generic `CanAssignTo(Deny)` may not represent a general statutory prohibition.

## P2

1. **No article-level amendment impact workflow.** The fetcher now archives changed source text and metadata by SHA-256 and failed refreshes preserve last-success metadata. It does not segment amended articles, identify affected GAM/GAL elements, or render a model diff/review queue.
2. **Cross-jurisdiction and legal-version comparison UI is absent.** The existing comparison modal compares enterprise models to law models, not legal requirements between jurisdictions.
3. **Large graph performance remains unbenchmarked.** Keyboard access improved; a 1,000-node/5,000-edge benchmark and jurisdiction/effective-date filters remain outstanding. The production bundle warning also remains (926.11 kB main JS chunk).
4. **Africa and global framework ingestion remains incomplete.** The repository has broad candidate metadata, but several exact official texts remain missing, blocked, or mismatched. Candidate catalogue records should not be reported as validated coverage.
5. **Not all end-to-end scenarios were run.** In particular, Saudi-vs-GDPR model comparison, article-level amendment impact, historical/current visual comparison, and large-graph stress remain unverified.

## P0

No P0 defect was found in the changes covered by this verification run.
