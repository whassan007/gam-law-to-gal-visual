import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileText,
  Filter,
  GitBranch,
  Globe,
  HelpCircle,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Split,
  Unlock,
} from 'lucide-react';
import type {
  DeonticStatus,
  LawMetadata,
  LawProvision,
  PipelineStageId,
  PolarityModality,
  SegmentedClause,
  TranslationReadiness,
} from '../../types/contracts';

export interface LegalDocumentPanelProps {
  law: LawMetadata;
  provision: LawProvision;
  clauses: SegmentedClause[];
  activeStage: PipelineStageId;
  activeSpan: { start: number; end: number } | null;
  selectedClauseId: string | null;
  onSelectClause: (clause: SegmentedClause | null) => void;
  onSelectSpan?: (span: { start: number; end: number } | null) => void;
  reducedMotion?: boolean;
}

type KeywordCategory =
  | 'obligation'
  | 'permission'
  | 'prohibition'
  | 'exception'
  | 'condition'
  | 'delegation';

interface KeywordStyleMeta {
  label: string;
  shortTag: string;
  badgeClass: string;
  underlineClass: string;
}

const KEYWORD_CATEGORY_STYLES: Record<KeywordCategory, KeywordStyleMeta> = {
  prohibition: {
    label: 'Prohibition',
    shortTag: 'PROHIB',
    badgeClass:
      'bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
    underlineClass: 'decoration-rose-400 decoration-2 underline underline-offset-4',
  },
  obligation: {
    label: 'Obligation',
    shortTag: 'OBLIG',
    badgeClass:
      'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.2)]',
    underlineClass: 'decoration-cyan-400 decoration-2 underline underline-offset-4',
  },
  permission: {
    label: 'Permission',
    shortTag: 'PERM',
    badgeClass:
      'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    underlineClass: 'decoration-emerald-400 decoration-2 underline underline-offset-4',
  },
  exception: {
    label: 'Exception',
    shortTag: 'EXCEPT',
    badgeClass:
      'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    underlineClass: 'decoration-amber-400 decoration-2 underline underline-offset-4',
  },
  condition: {
    label: 'Condition',
    shortTag: 'COND',
    badgeClass:
      'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    underlineClass: 'decoration-amber-400 decoration-wavy underline underline-offset-4',
  },
  delegation: {
    label: 'Delegation',
    shortTag: 'DELEG',
    badgeClass:
      'bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.2)]',
    underlineClass: 'decoration-purple-400 decoration-2 underline underline-offset-4',
  },
};

const FALLBACK_NORMATIVE_PATTERNS: Array<{
  regex: RegExp;
  category: KeywordCategory;
}> = [
  { regex: /\b(?:shall\s+not|must\s+not|may\s+not|prohibited)\b/gi, category: 'prohibition' },
  { regex: /\b(?:must|shall|responsible|obligated|required)\b/gi, category: 'obligation' },
  { regex: /\b(?:may|authorized|permitted|entitled)\b/gi, category: 'permission' },
  { regex: /\b(?:unless|except)\b/gi, category: 'exception' },
  { regex: /\b(?:delegated|delegate|assign)\b/gi, category: 'delegation' },
];

const READINESS_META: Record<
  TranslationReadiness,
  {
    label: string;
    className: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  'human-reviewed': {
    label: 'Human-Reviewed GAM Model',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    icon: ShieldCheck,
  },
  'actual-generated': {
    label: 'Live GAM Pipeline Output',
    className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    icon: Sparkles,
  },
  'unverified-draft': {
    label: 'Heuristic Draft (Needs Review)',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    icon: AlertTriangle,
  },
  unsupported: {
    label: 'Unsupported / Partial Scope',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    icon: ShieldAlert,
  },
};

function getPolarityBadge(polarity: PolarityModality) {
  if (polarity === 'Allow') {
    return {
      label: 'GAM Polarity: Allow (+)',
      shortLabel: 'Allow (+)',
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      Icon: Unlock,
    };
  }
  return {
    label: 'GAM Polarity: Deny (−)',
    shortLabel: 'Deny (−)',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    Icon: Lock,
  };
}

function getDeonticBadge(
  modality: DeonticStatus | 'Conditional' | 'Constitutive' | 'Unmapped'
) {
  switch (modality) {
    case 'Obligatory':
      return {
        label: 'Obligatory (O)',
        symbol: 'O',
        className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
        Icon: CheckCircle2,
      };
    case 'Permitted':
      return {
        label: 'Permitted (P)',
        symbol: 'P',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        Icon: Unlock,
      };
    case 'Prohibited':
      return {
        label: 'Prohibited (F)',
        symbol: 'F',
        className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
        Icon: ShieldAlert,
      };
    case 'Conditional':
      return {
        label: 'Conditional (C)',
        symbol: 'C',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        Icon: GitBranch,
      };
    case 'Constitutive':
      return {
        label: 'Constitutive (≡)',
        symbol: '≡',
        className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
        Icon: Scale,
      };
    case 'Unmapped':
    default:
      return {
        label: 'Unmapped (!)',
        symbol: '!',
        className: 'bg-amber-500/20 text-amber-200 border-amber-500/50',
        Icon: HelpCircle,
      };
  }
}

/**
 * Computes non-overlapping keyword intervals for a clause, falling back to regex scanning
 * for standard normative keywords if `clause.highlightedKeywords` is empty or partial.
 */
function resolveClauseKeywords(clause: SegmentedClause): Array<{
  term: string;
  category: KeywordCategory;
  startOffset: number;
  endOffset: number;
}> {
  const rawList: Array<{
    term: string;
    category: KeywordCategory;
    startOffset: number;
    endOffset: number;
  }> = [];

  if (clause.highlightedKeywords && clause.highlightedKeywords.length > 0) {
    for (const kw of clause.highlightedKeywords) {
      if (
        kw.startOffset >= 0 &&
        kw.endOffset > kw.startOffset &&
        kw.endOffset <= clause.text.length
      ) {
        rawList.push({
          term: kw.term,
          category: kw.category,
          startOffset: kw.startOffset,
          endOffset: kw.endOffset,
        });
      } else if (kw.term) {
        const idx = clause.text.toLowerCase().indexOf(kw.term.toLowerCase());
        if (idx !== -1) {
          rawList.push({
            term: clause.text.slice(idx, idx + kw.term.length),
            category: kw.category,
            startOffset: idx,
            endOffset: idx + kw.term.length,
          });
        }
      }
    }
  }

  for (const { regex, category } of FALLBACK_NORMATIVE_PATTERNS) {
    const clone = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null = clone.exec(clause.text);
    while (match !== null) {
      const startOffset = match.index;
      const endOffset = startOffset + match[0].length;
      const overlaps = rawList.some(
        (existing) => startOffset < existing.endOffset && endOffset > existing.startOffset
      );
      if (!overlaps) {
        rawList.push({
          term: match[0],
          category,
          startOffset,
          endOffset,
        });
      }
      match = clone.exec(clause.text);
    }
  }

  return rawList.sort((a, b) => a.startOffset - b.startOffset);
}

/**
 * Renders the full statutory text with character-offset highlighting when `activeSpan` is active.
 */
function renderHighlightedPassage(
  originalText: string,
  activeSpan: { start: number; end: number } | null,
  onClearSpan?: () => void
) {
  if (!activeSpan) {
    return (
      <p
        data-testid="legal-original-passage-text"
        className="font-serif text-sm sm:text-base leading-relaxed text-slate-200 whitespace-pre-wrap"
      >
        {originalText}
      </p>
    );
  }

  const clampedStart = Math.max(0, Math.min(originalText.length, activeSpan.start));
  const clampedEnd = Math.max(clampedStart, Math.min(originalText.length, activeSpan.end));

  const beforeText = originalText.slice(0, clampedStart);
  const highlightedText = originalText.slice(clampedStart, clampedEnd);
  const afterText = originalText.slice(clampedEnd);

  return (
    <div className="space-y-2">
      <div
        data-testid="active-source-span-banner"
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-3 py-1.5 text-xs text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-semibold tracking-wide uppercase text-cyan-300">
            Active Source Traceability Span
          </span>
          <code
            data-testid="active-span-offset-badge"
            className="rounded border border-emerald-400/40 bg-emerald-950/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300"
          >
            [{clampedStart}..{clampedEnd}] (chars {clampedStart}–{clampedEnd})
          </code>
        </div>
        {onClearSpan && (
          <button
            type="button"
            onClick={onClearSpan}
            className="rounded border border-cyan-500/30 bg-cyan-900/40 px-2 py-0.5 text-[11px] font-medium text-cyan-200 hover:bg-cyan-800/50 transition-colors"
          >
            Clear Trace
          </button>
        )}
      </div>

      <p
        data-testid="legal-original-passage-text"
        className="font-serif text-sm sm:text-base leading-relaxed text-slate-300 whitespace-pre-wrap"
      >
        <span>{beforeText}</span>
        <mark
          data-testid="highlighted-source-span"
          data-span-start={clampedStart}
          data-span-end={clampedEnd}
          className="relative inline rounded-md border border-cyan-400 bg-gradient-to-r from-cyan-500/30 via-emerald-500/30 to-cyan-500/30 px-1.5 py-0.5 font-semibold text-white shadow-[0_0_16px_rgba(6,182,212,0.45)] ring-1 ring-emerald-400/60"
        >
          {highlightedText || originalText.slice(0, Math.min(24, originalText.length))}
          <span className="ml-1.5 inline-flex items-center rounded bg-slate-950/90 px-1.5 py-0.2 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-400/50 align-middle">
            [{clampedStart}..{clampedEnd}]
          </span>
        </mark>
        <span>{afterText}</span>
      </p>
    </div>
  );
}

/**
 * Renders a clause's text with semantic badges and underlines for normative keywords,
 * plus an inline highlight if `activeSpan` intersects a sub-span of this clause.
 */
function renderClauseTextWithKeywords(
  clause: SegmentedClause,
  activeSpan: { start: number; end: number } | null
) {
  const keywords = resolveClauseKeywords(clause);
  const text = clause.text;

  // Check if activeSpan is a sub-span inside this clause
  const clauseStart = clause.sourceSpan.start;
  const clauseEnd = clause.sourceSpan.end;
  const hasActiveSubSpan =
    activeSpan !== null &&
    activeSpan.start < clauseEnd &&
    activeSpan.end > clauseStart;

  if (keywords.length === 0 && !hasActiveSubSpan) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  keywords.forEach((kw, idx) => {
    if (kw.startOffset > cursor) {
      parts.push(
        <span key={`plain-${idx}`}>{text.slice(cursor, kw.startOffset)}</span>
      );
    }
    const style = KEYWORD_CATEGORY_STYLES[kw.category];
    parts.push(
      <span
        key={`kw-${idx}-${kw.startOffset}`}
        data-testid={`clause-keyword-${clause.id}-${idx}`}
        data-keyword-category={kw.category}
        className={`inline-flex items-baseline gap-1 mx-0.5 rounded border px-1.5 py-0.5 font-sans text-xs font-semibold ${style.badgeClass}`}
        title={`Normative Keyword (${style.label}): "${kw.term}"`}
      >
        <span className={style.underlineClass}>{text.slice(kw.startOffset, kw.endOffset)}</span>
        <span className="text-[9px] font-mono uppercase tracking-tighter opacity-85">
          {style.shortTag}
        </span>
      </span>
    );
    cursor = kw.endOffset;
  });

  if (cursor < text.length) {
    parts.push(<span key="plain-end">{text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
}

export const LegalDocumentPanel: React.FC<LegalDocumentPanelProps> = ({
  law,
  provision,
  clauses,
  activeStage,
  activeSpan,
  selectedClauseId,
  onSelectClause,
  onSelectSpan,
  reducedMotion = false,
}) => {
  const [modalityFilter, setModalityFilter] = useState<string>('ALL');

  const readinessInfo =
    READINESS_META[provision.readiness] ?? READINESS_META[law.readiness];
  const ReadinessIcon = readinessInfo.icon;

  const effectiveClauses = useMemo(() => {
    const sourceList = clauses && clauses.length > 0 ? clauses : provision.clauses;
    if (modalityFilter === 'ALL') {
      return sourceList;
    }
    if (modalityFilter === 'UNMAPPED') {
      return sourceList.filter(
        (c) => !c.supported || c.deonticModality === 'Unmapped'
      );
    }
    return sourceList.filter((c) => c.deonticModality === modalityFilter);
  }, [clauses, provision.clauses, modalityFilter]);

  const unmappedCount = useMemo(() => {
    const sourceList = clauses && clauses.length > 0 ? clauses : provision.clauses;
    return sourceList.filter(
      (c) => !c.supported || c.deonticModality === 'Unmapped'
    ).length;
  }, [clauses, provision.clauses]);

  const isSpanOverlappingClause = (clause: SegmentedClause): boolean => {
    if (!activeSpan) return false;
    return (
      activeSpan.start < clause.sourceSpan.end &&
      activeSpan.end > clause.sourceSpan.start
    );
  };

  const handleClauseClick = (clause: SegmentedClause) => {
    const isCurrentlySelected = selectedClauseId === clause.id;
    const nextClause = isCurrentlySelected ? null : clause;
    onSelectClause(nextClause);
    if (onSelectSpan) {
      onSelectSpan(
        nextClause
          ? { start: nextClause.sourceSpan.start, end: nextClause.sourceSpan.end }
          : null
      );
    }
  };

  return (
    <section
      aria-label="Authoritative Legal Text and Animated Clause Segmentation"
      data-testid="legal-document-panel"
      className="flex flex-col gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-4 sm:p-5 text-slate-100 shadow-xl backdrop-blur-md"
    >
      {/* 1. Authoritative Statutory Metadata Header */}
      <header
        data-testid="legal-document-header"
        className="flex flex-col gap-3 border-b border-slate-800 pb-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  data-testid="law-short-name"
                  className="text-base sm:text-lg font-bold tracking-tight text-white"
                >
                  {law.shortName}
                </h2>
                <span
                  data-testid="provision-section-badge"
                  className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-300"
                >
                  {provision.section}
                </span>
              </div>
              <p
                data-testid="law-official-citation"
                className="text-xs text-slate-400 font-medium"
              >
                {law.officialCitation} — {provision.title}
              </p>
            </div>
          </div>

          {/* Translation Readiness Badge */}
          <span
            data-testid="law-readiness-badge"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${readinessInfo.className}`}
          >
            <ReadinessIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{readinessInfo.label}</span>
          </span>
        </div>

        {/* Metadata Pills Row: Version Date, Source Language, Jurisdiction, Official Source Link */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span
            data-testid="law-version-date"
            className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>Version: {provision.versionDate || law.version}</span>
          </span>

          <span
            data-testid="law-source-language"
            className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>Lang: {provision.language || law.sourceLanguage}</span>
          </span>

          <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1">
            <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>
              {law.countryName} ({law.jurisdictionLevel})
            </span>
          </span>

          {(provision.sourceUrl || law.officialSourceUrl) && (
            <a
              href={provision.sourceUrl || law.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="law-official-source-link"
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-900/50 transition-colors"
            >
              <span>Official Statute</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </header>

      {/* 2. Authoritative Original Statutory Passage with Synchronized Source Span Traceability */}
      <div
        data-testid="statutory-passage-container"
        className={`rounded-xl border p-3.5 sm:p-4 transition-all ${
          activeSpan
            ? 'border-cyan-500/60 bg-slate-950/90 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
            : 'border-slate-800/80 bg-slate-950/70'
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Code2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>Authoritative Statutory Text (Character-Indexed Source)</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Total Length: {provision.originalText.length} chars [0..{provision.originalText.length}]
          </span>
        </div>

        {renderHighlightedPassage(
          provision.originalText,
          activeSpan,
          onSelectSpan ? () => onSelectSpan(null) : undefined
        )}
      </div>

      {/* 3. Animated Clause Segmentation Header & Filter Bar */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <Split className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Stage 1: Normative Clause Segmentation ({effectiveClauses.length} of{' '}
              {(clauses.length || provision.clauses.length)} clauses)
            </h3>
          </div>

          {/* Filter Pills */}
          <div
            role="group"
            aria-label="Filter clauses by deontic modality"
            className="flex flex-wrap items-center gap-1 text-xs"
          >
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" aria-hidden="true" />
            {(['ALL', 'Obligatory', 'Permitted', 'Prohibited', 'UNMAPPED'] as const).map(
              (filterKey) => {
                const isActive = modalityFilter === filterKey;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setModalityFilter(filterKey)}
                    data-testid={`clause-filter-${filterKey.toLowerCase()}`}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filterKey === 'ALL'
                      ? 'All'
                      : filterKey === 'UNMAPPED'
                      ? `Unmapped (${unmappedCount})`
                      : filterKey}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Legend for Normative Keyword Categories */}
        <div
          data-testid="normative-keyword-legend"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-1.5 text-[11px] text-slate-300"
        >
          <span className="font-semibold text-slate-400 uppercase tracking-wider">
            Normative Markers:
          </span>
          {(
            Object.entries(KEYWORD_CATEGORY_STYLES) as Array<
              [KeywordCategory, KeywordStyleMeta]
            >
          ).map(([key, meta]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 font-medium ${meta.badgeClass}`}
            >
              <span className={meta.underlineClass}>{meta.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 4. Segmented Clause Cards List */}
      <div
        data-testid="segmented-clause-list"
        className="flex flex-col gap-3"
      >
        {effectiveClauses.map((clause, idx) => {
          const isSelected = selectedClauseId === clause.id;
          const isSpanMatched = isSpanOverlappingClause(clause);
          const isUnmapped =
            !clause.supported || clause.deonticModality === 'Unmapped';

          const polarityBadge = getPolarityBadge(clause.polarity);
          const PolarityIcon = polarityBadge.Icon;

          const deonticBadge = getDeonticBadge(clause.deonticModality);
          const DeonticIcon = deonticBadge.Icon;

          const motionClasses = reducedMotion
            ? ''
            : 'transition-all duration-300 ease-out hover:-translate-y-0.5';

          let cardBorderClass = 'border-slate-800 bg-slate-950/75 hover:border-slate-700';
          if (isUnmapped) {
            cardBorderClass =
              'border-amber-500/60 bg-amber-950/20 hover:border-amber-400';
          }
          if (isSelected || isSpanMatched) {
            cardBorderClass =
              'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]';
          }

          return (
            <article
              key={clause.id}
              data-testid={`clause-card-${clause.id}`}
              data-clause-index={clause.index}
              data-clause-supported={clause.supported ? 'true' : 'false'}
              data-clause-modality={clause.deonticModality}
              data-stage={activeStage}
              style={
                reducedMotion
                  ? undefined
                  : {
                      animationDelay: `${idx * 75}ms`,
                    }
              }
              onClick={() => handleClauseClick(clause)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClauseClick(clause);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              className={`group relative flex flex-col gap-2.5 rounded-xl border p-3.5 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 ${cardBorderClass} ${motionClasses}`}
            >
              {/* Clause Top Bar: Index, Source Span Offset, Polarity & Deontic Modality Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300 border border-slate-700">
                    Clause #{clause.index} ({clause.id})
                  </span>

                  {/* Exact Source Span Offset Badge */}
                  <span
                    data-testid={`clause-span-${clause.id}`}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                      isSpanMatched
                        ? 'border-emerald-400/60 bg-emerald-950/70 text-emerald-200 font-semibold'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span>
                      chars {clause.sourceSpan.start}–{clause.sourceSpan.end}
                    </span>
                    <span className="opacity-75">
                      [{clause.sourceSpan.start}..{clause.sourceSpan.end}]
                    </span>
                  </span>
                </div>

                {/* Non-color-only Polarity & Deontic Modality Indicators */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    data-testid={`clause-polarity-${clause.id}`}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${polarityBadge.className}`}
                    title={polarityBadge.label}
                  >
                    <PolarityIcon className="h-3 w-3" aria-hidden="true" />
                    <span>{polarityBadge.shortLabel}</span>
                  </span>

                  <span
                    data-testid={`clause-modality-${clause.id}`}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${deonticBadge.className}`}
                    title={`Deontic Modality: ${deonticBadge.label}`}
                  >
                    <DeonticIcon className="h-3 w-3" aria-hidden="true" />
                    <span>{deonticBadge.label}</span>
                  </span>
                </div>
              </div>

              {/* Segmented Clause Text with Highlighted Normative Keywords */}
              <div
                data-testid={`clause-text-${clause.id}`}
                className="font-serif text-sm sm:text-[15px] leading-relaxed text-slate-100"
              >
                {renderClauseTextWithKeywords(clause, activeSpan)}
              </div>

              {/* Unsupported / Unmapped Clause Amber Warning Callout (Test 8) */}
              {isUnmapped && (
                <div
                  data-testid={`unmapped-clause-${clause.id}`}
                  role="note"
                  aria-label={`Unsupported or unmapped clause warning for ${clause.id}`}
                  className="mt-1 flex items-start gap-2.5 rounded-lg border border-amber-500/50 bg-amber-950/40 p-2.5 text-xs text-amber-200"
                >
                  <AlertTriangle
                    className="h-4 w-4 shrink-0 text-amber-400 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="space-y-0.5">
                    <div className="font-semibold text-amber-300">
                      Unsupported / Unmapped Statutory Clause (Outside Core GAM Operational Tuple Φ)
                    </div>
                    <p className="text-amber-200/90 leading-snug">
                      {clause.unmappedReason ||
                        'This statutory clause expresses a preamble, definition, or meta-normative rule that does not directly instantiate a GAM ⟨P, A, R, U⟩ relation or operational policy.'}
                    </p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default LegalDocumentPanel;
