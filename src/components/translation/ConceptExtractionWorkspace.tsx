import React, { useMemo, useState } from 'react';
import {
  Users,
  Shield,
  Activity,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  Share2,
  Layers,
  ArrowRight,
  Search,
  Filter,
  Sparkles,
  FileText,
  Link2,
  Eye,
} from 'lucide-react';
import type { ExtractedConceptToken, SegmentedClause } from '../../types/contracts';

export interface ConceptExtractionWorkspaceProps {
  concepts: ExtractedConceptToken[];
  unmappedConcepts?: ExtractedConceptToken[];
  clauses: SegmentedClause[];
  selectedConceptId: string | null;
  onSelectConcept: (concept: ExtractedConceptToken | null) => void;
  onHighlightSpan: (span: { start: number; end: number } | null) => void;
  reducedMotion?: boolean;
}

type ConceptCategory = ExtractedConceptToken['category'];

interface CategoryMetadata {
  label: string;
  gamTargetHint: string;
  badgeClasses: string;
  borderClasses: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_META: Record<ConceptCategory, CategoryMetadata> = {
  Actor: {
    label: 'Actor',
    gamTargetHint: 'GAM Sort: User (U) / Role (R)',
    badgeClasses: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
    borderClasses: 'border-cyan-500/30 hover:border-cyan-400/60',
    icon: Users,
  },
  Role: {
    label: 'Role',
    gamTargetHint: 'GAM Sort: Role (R)',
    badgeClasses: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    borderClasses: 'border-sky-500/30 hover:border-sky-400/60',
    icon: Shield,
  },
  Activity: {
    label: 'Activity',
    gamTargetHint: 'GAM Sort: Activity (A)',
    badgeClasses: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
    borderClasses: 'border-indigo-500/30 hover:border-indigo-400/60',
    icon: Activity,
  },
  Process: {
    label: 'Process',
    gamTargetHint: 'GAM Sort: Process (P)',
    badgeClasses: 'bg-violet-500/15 text-violet-300 border-violet-500/35',
    borderClasses: 'border-violet-500/30 hover:border-violet-400/60',
    icon: Layers,
  },
  Permission: {
    label: 'Permission',
    gamTargetHint: 'GAM Polarity: Allow (+)',
    badgeClasses: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    borderClasses: 'border-emerald-500/30 hover:border-emerald-400/60',
    icon: CheckCircle2,
  },
  Prohibition: {
    label: 'Prohibition',
    gamTargetHint: 'GAM Polarity: Deny (-)',
    badgeClasses: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    borderClasses: 'border-rose-500/30 hover:border-rose-400/60',
    icon: XCircle,
  },
  Condition: {
    label: 'Condition',
    gamTargetHint: 'Policy Guard / Parameter',
    badgeClasses: 'bg-teal-500/15 text-teal-300 border-teal-500/35',
    borderClasses: 'border-teal-500/30 hover:border-teal-400/60',
    icon: Sliders,
  },
  Exception: {
    label: 'Exception',
    gamTargetHint: 'Defeat / Carve-out Rule',
    badgeClasses: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
    borderClasses: 'border-orange-500/30 hover:border-orange-400/60',
    icon: GitBranch,
  },
  Delegation: {
    label: 'Delegation',
    gamTargetHint: 'GAM Relation: D± (CanDelegate)',
    badgeClasses: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
    borderClasses: 'border-purple-500/30 hover:border-purple-400/60',
    icon: Share2,
  },
  Structure: {
    label: 'Structure',
    gamTargetHint: 'GAM Hierarchy: PP / PA / RR / X',
    badgeClasses: 'bg-blue-500/15 text-blue-300 border-blue-500/35',
    borderClasses: 'border-blue-500/30 hover:border-blue-400/60',
    icon: Layers,
  },
  Ordering: {
    label: 'Ordering',
    gamTargetHint: 'GAM Precedence: Next (S)',
    badgeClasses: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/35',
    borderClasses: 'border-fuchsia-500/30 hover:border-fuchsia-400/60',
    icon: ArrowRight,
  },
  Unmapped: {
    label: 'Unmapped',
    gamTargetHint: 'Requires Formal Human Review',
    badgeClasses: 'bg-amber-500/20 text-amber-300 border-amber-500/45',
    borderClasses: 'border-amber-500/40 hover:border-amber-400/70',
    icon: AlertTriangle,
  },
};

interface ConceptGroupDefinition {
  id: string;
  title: string;
  subtitle: string;
  categories: ConceptCategory[];
  accentBorder: string;
  headerBg: string;
}

const CONCEPT_GROUPS: ConceptGroupDefinition[] = [
  {
    id: 'actors-roles',
    title: 'Governance Actors & Roles',
    subtitle: 'Legal subjects, controllers, authorities, and organizational roles → GAM Sorts U & R',
    categories: ['Actor', 'Role'],
    accentBorder: 'border-cyan-500/25',
    headerBg: 'from-cyan-950/40 to-slate-900/40',
  },
  {
    id: 'activities-processes',
    title: 'Regulated Activities & Processes',
    subtitle: 'Operational actions, data handling tasks, and governance workflows → GAM Sorts A & P',
    categories: ['Activity', 'Process'],
    accentBorder: 'border-indigo-500/25',
    headerBg: 'from-indigo-950/40 to-slate-900/40',
  },
  {
    id: 'normative-modalities',
    title: 'Normative Modalities (Permissions & Prohibitions)',
    subtitle: 'Deontic authorizations and prohibitions driving positive (+) and negative (-) GAM relations',
    categories: ['Permission', 'Prohibition'],
    accentBorder: 'border-emerald-500/25',
    headerBg: 'from-emerald-950/35 to-slate-900/40',
  },
  {
    id: 'structural-constraints',
    title: 'Conditions, Exceptions, Delegations & Ordering',
    subtitle: 'Structural composition (PP, PA, RR), precedence ordering (S), delegation (D±), and guards',
    categories: ['Condition', 'Exception', 'Delegation', 'Structure', 'Ordering'],
    accentBorder: 'border-purple-500/25',
    headerBg: 'from-purple-950/35 to-slate-900/40',
  },
  {
    id: 'unmapped-review',
    title: 'Unmapped / Human Review Required',
    subtitle: 'Definitions, recitals, or heuristic extractions that do not directly map to a GAM sort',
    categories: ['Unmapped'],
    accentBorder: 'border-amber-500/35',
    headerBg: 'from-amber-950/40 to-slate-900/40',
  },
];

function isValidSourceSpan(span?: { start: number; end: number } | null): span is { start: number; end: number } {
  if (!span) return false;
  return (
    typeof span.start === 'number' &&
    typeof span.end === 'number' &&
    !Number.isNaN(span.start) &&
    !Number.isNaN(span.end) &&
    span.start >= 0 &&
    span.end > span.start
  );
}

export function isVerifiedConceptToken(concept: ExtractedConceptToken): boolean {
  return (
    concept.category !== 'Unmapped' &&
    concept.verified === true &&
    isValidSourceSpan(concept.sourceSpan)
  );
}

export const ConceptExtractionWorkspace: React.FC<ConceptExtractionWorkspaceProps> = ({
  concepts,
  unmappedConcepts = [],
  clauses,
  selectedConceptId,
  onSelectConcept,
  onHighlightSpan,
  reducedMotion = false,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<ConceptCategory | 'ALL'>('ALL');
  const [activeClauseFilter, setActiveClauseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyShowReviewRequired, setOnlyShowReviewRequired] = useState<boolean>(false);

  // Merge concepts and unmappedConcepts without duplicates
  const allConcepts = useMemo(() => {
    const map = new Map<string, ExtractedConceptToken>();
    for (const c of concepts) {
      map.set(c.id, c);
    }
    for (const u of unmappedConcepts) {
      if (!map.has(u.id)) {
        map.set(u.id, u);
      }
    }
    return Array.from(map.values());
  }, [concepts, unmappedConcepts]);

  const clauseLookup = useMemo(() => {
    const map = new Map<string, SegmentedClause>();
    for (const clause of clauses) {
      map.set(clause.id, clause);
    }
    return map;
  }, [clauses]);

  // Filter concepts
  const filteredConcepts = useMemo(() => {
    return allConcepts.filter((concept) => {
      const verified = isVerifiedConceptToken(concept);
      if (onlyShowReviewRequired && verified) {
        return false;
      }
      if (activeCategoryFilter !== 'ALL' && concept.category !== activeCategoryFilter) {
        return false;
      }
      if (activeClauseFilter !== 'ALL' && concept.clauseId !== activeClauseFilter) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchLabel = concept.label.toLowerCase().includes(q);
        const matchCategory = concept.category.toLowerCase().includes(q);
        const matchEntity = concept.mappedEntityId?.toLowerCase().includes(q) ?? false;
        const matchRelation = concept.mappedRelationId?.toLowerCase().includes(q) ?? false;
        const matchNotes = concept.notes?.toLowerCase().includes(q) ?? false;
        return matchLabel || matchCategory || matchEntity || matchRelation || matchNotes;
      }
      return true;
    });
  }, [
    allConcepts,
    onlyShowReviewRequired,
    activeCategoryFilter,
    activeClauseFilter,
    searchQuery,
  ]);

  // Group filtered concepts into the 5 visual groups
  // Note: Also place any !verified concept into its category group AND/OR ensure unmapped/review group captures Unmapped tokens
  const groupedConcepts = useMemo(() => {
    return CONCEPT_GROUPS.map((group) => {
      const items = filteredConcepts.filter((c) => {
        if (group.id === 'unmapped-review') {
          return c.category === 'Unmapped' || !isVerifiedConceptToken(c);
        }
        return group.categories.includes(c.category) && c.category !== 'Unmapped';
      });
      return {
        ...group,
        items,
      };
    }).filter((g) => g.items.length > 0);
  }, [filteredConcepts]);

  const stats = useMemo(() => {
    const total = allConcepts.length;
    const verifiedCount = allConcepts.filter(isVerifiedConceptToken).length;
    const reviewCount = total - verifiedCount;
    const bridgedCount = allConcepts.filter(
      (c) => Boolean(c.mappedEntityId) || Boolean(c.mappedRelationId)
    ).length;
    return { total, verifiedCount, reviewCount, bridgedCount };
  }, [allConcepts]);

  const selectedConcept = useMemo(
    () => allConcepts.find((c) => c.id === selectedConceptId) ?? null,
    [allConcepts, selectedConceptId]
  );

  const handleTokenClick = (concept: ExtractedConceptToken) => {
    const isAlreadySelected = selectedConceptId === concept.id;
    if (isAlreadySelected) {
      onSelectConcept(null);
      onHighlightSpan(null);
    } else {
      onSelectConcept(concept);
      if (isValidSourceSpan(concept.sourceSpan)) {
        onHighlightSpan({
          start: concept.sourceSpan.start,
          end: concept.sourceSpan.end,
        });
      } else {
        onHighlightSpan(null);
      }
    }
  };

  const handleTokenMouseEnter = (concept: ExtractedConceptToken) => {
    if (isValidSourceSpan(concept.sourceSpan)) {
      onHighlightSpan({
        start: concept.sourceSpan.start,
        end: concept.sourceSpan.end,
      });
    }
  };

  const handleTokenMouseLeave = () => {
    if (selectedConcept && isValidSourceSpan(selectedConcept.sourceSpan)) {
      onHighlightSpan({
        start: selectedConcept.sourceSpan.start,
        end: selectedConcept.sourceSpan.end,
      });
    } else {
      onHighlightSpan(null);
    }
  };

  const allCategories: ConceptCategory[] = [
    'Actor',
    'Role',
    'Activity',
    'Process',
    'Permission',
    'Prohibition',
    'Condition',
    'Exception',
    'Delegation',
    'Structure',
    'Ordering',
    'Unmapped',
  ];

  return (
    <div
      className="flex flex-col gap-5 text-slate-100"
      data-testid="stage2-concept-extraction-workspace"
    >
      {/* Top Header & Extraction Telemetry Summary */}
      <div className="rounded-xl border border-sky-500/20 bg-slate-900/80 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Stage 2 · Legal Concept Extraction
              </span>
              <span className="text-xs text-slate-400">
                Lexical &amp; Deontic Tokenization → GAM Sort &amp; Relation Bridge
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">
              Extracted Legal Concept Tokens &amp; Source Span Traceability
            </h2>
            <p className="max-w-3xl text-xs text-slate-300">
              Hover or click any extracted concept token to highlight its exact originating passage in
              the statutory text and inspect its formal bridge to GAM entities (
              <code className="text-cyan-300">P, A, R, U</code>) or relations (
              <code className="text-cyan-300">PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±</code>).
            </p>
          </div>

          {/* Summary Telemetry Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-center">
              <div className="text-xs text-slate-400">Total Tokens</div>
              <div className="text-base font-bold text-white" data-testid="concept-total-count">
                {stats.total}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-3 py-2 text-center">
              <div className="text-xs text-emerald-300/90">Verified Source Mapping</div>
              <div
                className="text-base font-bold text-emerald-400"
                data-testid="concept-verified-count"
              >
                {stats.verifiedCount}
              </div>
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/25 px-3 py-2 text-center">
              <div className="text-xs text-cyan-300/90">GAM Bridged</div>
              <div
                className="text-base font-bold text-cyan-300"
                data-testid="concept-bridged-count"
              >
                {stats.bridgedCount}
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-center">
              <div className="text-xs text-amber-300/90">Requires Human Review</div>
              <div
                className="text-base font-bold text-amber-400"
                data-testid="concept-review-count"
              >
                {stats.reviewCount}
              </div>
            </div>
          </div>
        </div>

        {/* Search, Clause Filter & Category Filter Bar */}
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-800/80 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search input */}
            <div className="relative min-w-[220px] flex-1">
              <Search className=" pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tokens by label, category, GAM entity/relation ID, or review notes..."
                aria-label="Filter extracted concepts"
                className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Clause filter dropdown */}
            {clauses.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <label htmlFor="stage2-clause-filter" className="text-xs text-slate-400">
                  Clause:
                </label>
                <select
                  id="stage2-clause-filter"
                  value={activeClauseFilter}
                  onChange={(e) => setActiveClauseFilter(e.target.value)}
                  className="rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="ALL">All Clauses ({clauses.length})</option>
                  {clauses.map((clause) => (
                    <option key={clause.id} value={clause.id}>
                      Clause #{clause.index + 1} ({clause.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggle Review Required Only */}
            <button
              type="button"
              onClick={() => setOnlyShowReviewRequired((prev) => !prev)}
              data-testid="toggle-review-required-filter"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                onlyShowReviewRequired
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-slate-700/80 bg-slate-950/60 text-slate-300 hover:border-amber-500/40 hover:text-amber-200'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Unmapped / Review Only ({stats.reviewCount})
            </button>
          </div>

          {/* Category Pill Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ALL')}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                activeCategoryFilter === 'ALL'
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              All Categories ({allConcepts.length})
            </button>
            {allCategories.map((category) => {
              const count = allConcepts.filter((c) => c.category === category).length;
              const meta = CATEGORY_META[category];
              const isSelected = activeCategoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setActiveCategoryFilter((curr) => (curr === category ? 'ALL' : category))
                  }
                  data-testid={`category-filter-${category}`}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    isSelected
                      ? meta.badgeClasses
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{category}</span>
                  <span className="rounded bg-slate-900/80 px-1.5 py-0.2 text-[10px] text-slate-300">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Concept Detail Inspector Banner (if a concept is selected) */}
      {selectedConcept && (
        <div
          data-testid="selected-concept-inspector"
          className="rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-slate-900/90 p-4 shadow-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Selected Token Inspector
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${
                    CATEGORY_META[selectedConcept.category].badgeClasses
                  }`}
                >
                  {selectedConcept.category}
                </span>
                {isVerifiedConceptToken(selectedConcept) ? (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Source Mapping
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/45 bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Unmapped / Requires Human Review
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-white">{selectedConcept.label}</div>
              {selectedConcept.sourceSpan?.text && (
                <p className="text-xs italic text-slate-300">
                  Source Quote: &ldquo;{selectedConcept.sourceSpan.text}&rdquo;
                </p>
              )}
              {selectedConcept.notes && (
                <p className="text-xs text-amber-200/90">
                  <strong className="font-semibold">Note:</strong> {selectedConcept.notes}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2">
                <div className="text-[11px] text-slate-400">Source Span Offsets</div>
                <div className="font-mono text-cyan-300">
                  {selectedConcept.sourceSpan
                    ? `[${selectedConcept.sourceSpan.start}..${selectedConcept.sourceSpan.end}] · Clause ${selectedConcept.clauseId}`
                    : 'No verified source span'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2">
                <div className="text-[11px] text-slate-400">Target GAM Mapping Bridge</div>
                <div className="font-mono text-emerald-300">
                  {selectedConcept.mappedEntityId ? (
                    <span>Entity: {selectedConcept.mappedEntityId}</span>
                  ) : selectedConcept.mappedRelationId ? (
                    <span>Relation/Policy: {selectedConcept.mappedRelationId}</span>
                  ) : (
                    <span className="text-amber-300">Unmapped (No Formal GAM Sort)</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectConcept(null);
                  onHighlightSpan(null);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categorized Visual Token Groups */}
      {groupedConcepts.length === 0 ? (
        <div
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400"
          data-testid="concept-empty-state"
        >
          No extracted legal concepts match the current filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {groupedConcepts.map((group) => (
            <section
              key={group.id}
              data-testid={`concept-group-${group.id}`}
              className={`rounded-xl border ${group.accentBorder} bg-slate-900/70 shadow-md overflow-hidden`}
            >
              {/* Group Header */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-gradient-to-r ${group.headerBg} px-4 py-3`}
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">{group.title}</h3>
                  <p className="text-xs text-slate-400">{group.subtitle}</p>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                  {group.items.length} {group.items.length === 1 ? 'token' : 'tokens'}
                </span>
              </div>

              {/* Token Cards Grid */}
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((concept, idx) => {
                  const meta = CATEGORY_META[concept.category];
                  const IconComponent = meta.icon;
                  const verified = isVerifiedConceptToken(concept);
                  const isSelected = selectedConceptId === concept.id;
                  const originatingClause = clauseLookup.get(concept.clauseId);
                  const hasBridge =
                    Boolean(concept.mappedEntityId) || Boolean(concept.mappedRelationId);

                  return (
                    <div
                      key={concept.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      data-testid={`concept-token-${concept.id}`}
                      data-category={concept.category}
                      data-verified={verified ? 'true' : 'false'}
                      onClick={() => handleTokenClick(concept)}
                      onMouseEnter={() => handleTokenMouseEnter(concept)}
                      onMouseLeave={handleTokenMouseLeave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleTokenClick(concept);
                        }
                      }}
                      style={
                        reducedMotion
                          ? undefined
                          : {
                              animationDelay: `${Math.min(idx * 35, 350)}ms`,
                            }
                      }
                      className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left outline-none ${
                        reducedMotion ? '' : 'transition-all duration-200 hover:-translate-y-0.5'
                      } ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-950/50'
                          : !verified
                          ? 'border-amber-500/40 bg-amber-950/15 hover:border-amber-400/70 hover:bg-amber-950/25'
                          : `${meta.borderClasses} bg-slate-950/75 hover:bg-slate-900/90`
                      }`}
                    >
                      {/* Top Row: Category Badge + Verification Status Badge */}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClasses}`}
                          >
                            <IconComponent className="h-3 w-3" />
                            {meta.label}
                          </span>

                          {verified ? (
                            <span
                              data-testid={`verification-badge-${concept.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              Verified Source Mapping
                            </span>
                          ) : (
                            <span
                              data-testid={`verification-badge-${concept.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              Unmapped / Requires Human Review
                            </span>
                          )}
                        </div>

                        {/* Token Label & Lexical Text */}
                        <div className="mt-2.5 flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-white group-hover:text-cyan-200">
                            {concept.label}
                          </h4>
                          <span
                            title={concept.sourceSpan ? 'Highlight source span in legal document' : 'No verified source span'}
                            className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 group-hover:text-cyan-300"
                          >
                            <Eye className="h-2.5 w-2.5" />{concept.sourceSpan
                              ? `[${concept.sourceSpan.start}..${concept.sourceSpan.end}]`
                              : 'No source span'}
                          </span>
                        </div>

                        {/* Source Span Snippet or Clause Context */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                          <FileText className="h-3 w-3 shrink-0 text-slate-500" />
                          <span className="truncate">
                            Clause <code className="text-slate-300">{concept.clauseId}</code>
                            {originatingClause
                              ? ` · ${originatingClause.deonticModality} (${originatingClause.polarity})`
                              : ''}
                          </span>
                        </div>

                        {/* Unmapped / Review Notes in Amber */}
                        {(!verified || concept.notes) && (
                          <div
                            data-testid={`concept-notes-${concept.id}`}
                            className={`mt-2.5 rounded-lg border px-2.5 py-2 text-xs ${
                              !verified
                                ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                                : 'border-slate-800 bg-slate-900/70 text-slate-300'
                            }`}
                          >
                            {!verified && (
                              <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                                <AlertTriangle className="h-3 w-3" />
                                Why Not Mapped to GAM Sort:
                              </div>
                            )}
                            <p className="leading-relaxed">
                              {concept.notes ||
                                'Heuristic or definitional legal token without a validated GAM sort mapping; requires human formal verification.'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Visual Mapping Bridge: Extracted Concept -> GAM Target */}
                      <div
                        data-testid={`concept-bridge-${concept.id}`}
                        className="mt-3 border-t border-slate-800/90 pt-2.5"
                      >
                        <div className="flex items-center justify-between gap-1.5 text-[11px]">
                          <span className="truncate font-medium text-slate-400">
                            {meta.gamTargetHint}
                          </span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-cyan-400" />
                          {hasBridge ? (
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {concept.mappedEntityId && (
                                <span
                                  data-testid={`mapped-entity-${concept.id}`}
                                  className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-200"
                                >
                                  <Link2 className="h-2.5 w-2.5 text-cyan-400" />
                                  {concept.mappedEntityId}
                                </span>
                              )}
                              {concept.mappedRelationId && (
                                <span
                                  data-testid={`mapped-relation-${concept.id}`}
                                  className="inline-flex items-center gap-1 rounded border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple-200"
                                >
                                  <Link2 className="h-2.5 w-2.5 text-purple-400" />
                                  {concept.mappedRelationId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                              Unmapped
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConceptExtractionWorkspace;
