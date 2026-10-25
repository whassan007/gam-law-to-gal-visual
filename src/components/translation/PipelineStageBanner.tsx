import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Binary,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileCode2,
  FlaskConical,
  GitBranch,
  Info,
  Layers,
  Radio,
  ShieldCheck,
  Sigma,
  Sparkles,
  Split,
} from 'lucide-react';
import type {
  PipelineStageId,
  SourceSpan,
  TranslationEvent,
  TranslationReadiness,
  TranslationResult,
} from '../../types/contracts';

export interface PipelineStageBannerProps {
  /** Currently active pipeline stage (`source`, `segment`, `extract`, `entity`, `relation`, `gal`, `validate`) */
  activeStage: PipelineStageId;
  /** Optional callback to switch directly to a pipeline stage */
  onSelectStage?: (stage: PipelineStageId) => void;
  /** Translation readiness level of the active provision or pipeline run */
  readiness?: TranslationReadiness;
  /** Latest active trace event from the animation timeline or stage filter */
  latestEvent?: TranslationEvent | null;
  /** Full list of trace events (used if `latestEvent` is not explicitly provided) */
  events?: TranslationEvent[];
  /** Optional full translation result to derive live stage metrics and readiness */
  translationResult?: TranslationResult | null;
  /** Optional callback when the user clicks the source span badge in the trace ticker */
  onHighlightSpan?: (span: SourceSpan | null) => void;
  /** Respect user/system reduced motion preference */
  reducedMotion?: boolean;
  /** Optional additional className */
  className?: string;
}

export interface StageMathSpecification {
  id: PipelineStageId;
  stageNumber: number;
  stageBadge: string;
  title: string;
  shortTitle: string;
  formalMapping: string;
  formalFormula: string;
  codomainSummary: string;
  operationalNotes: string;
  accentColor: 'cyan' | 'sky' | 'indigo' | 'emerald' | 'violet' | 'amber';
  icon: React.ComponentType<{ className?: string }>;
}

export const STAGE_MATH_SPECIFICATIONS: Record<PipelineStageId, StageMathSpecification> = {
  source: {
    id: 'source',
    stageNumber: 0,
    stageBadge: 'Stage 0',
    title: 'Stage 0: Authoritative Statutory Corpus',
    shortTitle: 'Source Text',
    formalMapping: 'Verbatim Statutory Provision → Indexed Character Stream Σ*[0..n]',
    formalFormula: 'ℒ_raw : Σ*[0..n] → ⟨Citation, Jurisdiction, VerbatimSpan⟩',
    codomainSummary: 'Immutable statutory text buffer with zero-indexed character provenance',
    operationalNotes:
      'Preserves verbatim statutory text and official citation metadata prior to normative clause decomposition.',
    accentColor: 'sky',
    icon: Layers,
  },
  segment: {
    id: 'segment',
    stageNumber: 1,
    stageBadge: 'Stage 1',
    title: 'Stage 1: Text Segmentation',
    shortTitle: 'Segmentation',
    formalMapping: 'Natural-Language Clauses → Deontic Polarity (±)',
    formalFormula: 'σ_seg : Σ*[0..n] → { c_i = ⟨span_i, polarity ∈ {+, −}, modality ∈ {O, P, F, C}⟩ }',
    codomainSummary: 'Partitioned normative clauses with deontic modality & Allow (+)/Deny (−) polarity',
    operationalNotes:
      'Decomposes complex statutory sentences into atomic normative clauses, isolating obligations (Must/Shall), permissions (May), prohibitions (Shall not), and exceptions.',
    accentColor: 'cyan',
    icon: Split,
  },
  extract: {
    id: 'extract',
    stageNumber: 2,
    stageBadge: 'Stage 2',
    title: 'Stage 2: Legal Concept Extraction',
    shortTitle: 'Concept Extraction',
    formalMapping: 'Segmented Clauses → Candidate Governance Tokens τ_k@[start..end]',
    formalFormula: 'τ_ext : { c_i } → { ⟨id, label, category, span ⊆ c_i, verified⟩ }',
    codomainSummary: 'Candidate actors, roles, activities, processes, modalities, and conditions',
    operationalNotes:
      'Extracts candidate legal concept spans while quarantining non-operational statutory definitions or penalty formulas that require human review.',
    accentColor: 'sky',
    icon: Sparkles,
  },
  entity: {
    id: 'entity',
    stageNumber: 3,
    stageBadge: 'Stage 3',
    title: 'Stage 3: GAM Entity Identification',
    shortTitle: 'GAM Entities',
    formalMapping: 'Extracted Tokens → Typed Sorts ⟨P, A, R, U⟩',
    formalFormula: 'π_sort : τ_k → P (Process) ⊔ A (Activity) ⊔ R (Role) ⊔ U (User) ⊔ Unmapped',
    codomainSummary: 'Disjoint 4-sort GAM carrier sets P, A, R, U with strict sort partitioning',
    operationalNotes:
      'Maps verified domain tokens into W. A. Hassan’s four canonical GAM carrier sets: Process (P), Activity (A), Role (R), and User (U).',
    accentColor: 'indigo',
    icon: Cpu,
  },
  relation: {
    id: 'relation',
    stageNumber: 4,
    stageBadge: 'Stage 4',
    title: 'Stage 4: Relation & Policy Mapping',
    shortTitle: 'Relations & Policies',
    formalMapping: 'Normative Clauses → Directed Edges ⟨PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩',
    formalFormula:
      'ρ_edge : ⟨P, A, R, U⟩ × ⟨P, A, R, U⟩ → { PP, PA, RR, S, X } ∪ { RA±(A→R), RU±(U→R), UP±(U→P), RP±(R→P), D±(R→R) }',
    codomainSummary: 'Canonical structural relations & signed Allow (+)/Deny (−) deontic policy edges',
    operationalNotes:
      'Enforces canonical GAM 2.0 endpoint directions (e.g., CanAssignTo: Activity → Role; Includes: senior Role → junior Role) and signed deontic polarity.',
    accentColor: 'emerald',
    icon: GitBranch,
  },
  gal: {
    id: 'gal',
    stageNumber: 5,
    stageBadge: 'Stage 5',
    title: 'Stage 5: GAL-JSON Generation',
    shortTitle: 'GAL-JSON',
    formalMapping: 'Formal Model Φ_L → Serialized GAL-JSON Artifact with Span Provenance',
    formalFormula: 'Φ_L = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩ ↦ GAL-JSON',
    codomainSummary: 'Machine-checkable Law_Model JSON with bidirectional [start..end] traceability',
    operationalNotes:
      'Serializes entities, structural relations, signed policies, ontology requirements, and scenario precedence constraints into canonical GAL-JSON.',
    accentColor: 'violet',
    icon: FileCode2,
  },
  validate: {
    id: 'validate',
    stageNumber: 6,
    stageBadge: 'Stage 6',
    title: 'Stage 6: Formal Validation',
    shortTitle: 'Validation',
    formalMapping: 'GAL-JSON Φ_L → Con(⋀Φ_L) & Alloy 6.2.0 Emission',
    formalFormula: '⊢ Con(⋀Φ_L) ∧ TypeSafe(P,A,R,U) ∧ CanonicalDir(E) ↦ Alloy 6.2.0 (gam_core)',
    codomainSummary: 'Sort safety, canonical direction guard, internal consistency & Alloy 6.2.0 module',
    operationalNotes:
      'Verifies internal law consistency Con(⋀Φ_L) and emits Alloy 6.2.0 specs. Note: organizational compliance requires checking enterprise model M against Φ_L (M ⊨ Φ_L).',
    accentColor: 'amber',
    icon: ShieldCheck,
  },
};

const ORDERED_WORKBENCH_STAGES: readonly PipelineStageId[] = [
  'segment',
  'extract',
  'entity',
  'relation',
  'gal',
  'validate',
] as const;

interface ReadinessBadgeDescriptor {
  label: string;
  shortCode: string;
  tooltipTitle: string;
  tooltipDetail: string;
  containerClass: string;
  dotClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const READINESS_DESCRIPTORS: Record<TranslationReadiness, ReadinessBadgeDescriptor> = {
  'human-reviewed': {
    label: 'Human-Reviewed GAM Translation',
    shortCode: 'VERIFIED Φ_L',
    tooltipTitle: 'Authoritative Human-Reviewed GAM Translation',
    tooltipDetail:
      'Every segmented clause, GAM sort assignment ⟨P, A, R, U⟩, canonical relation direction, and deontic policy edge has been formally reviewed and anchored to verbatim statutory spans.',
    containerClass:
      'bg-emerald-500/15 text-emerald-200 border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    dotClass: 'bg-emerald-400',
    icon: CheckCircle2,
  },
  'actual-generated': {
    label: 'Actual Generated Translation',
    shortCode: 'LIVE ENGINE',
    tooltipTitle: 'Live GAM Pipeline Execution Output',
    tooltipDetail:
      'Produced directly by the deterministic GAM translation engine with sort normalization and canonical direction verification.',
    containerClass:
      'bg-cyan-500/15 text-cyan-200 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    dotClass: 'bg-cyan-400',
    icon: FlaskConical,
  },
  'unverified-draft': {
    label: 'Unverified Heuristic Draft',
    shortCode: 'HEURISTIC DRAFT',
    tooltipTitle: 'Heuristic Extraction — Formal Review Required',
    tooltipDetail:
      'Generated via live pattern/keyword extraction (readLawToGAM). Direction reversals across distinct sorts are normalized, but legal semantics and unmapped spans require human formal review.',
    containerClass:
      'bg-amber-500/15 text-amber-200 border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    dotClass: 'bg-amber-400',
    icon: AlertTriangle,
  },
  unsupported: {
    label: 'Unsupported Clause',
    shortCode: 'UNSUPPORTED',
    tooltipTitle: 'Unsupported Statutory Clause / Provision',
    tooltipDetail:
      'Contains non-operational statutory definitions, administrative metadata, or penalty calculations that cannot be faithfully reduced to ⟨P, A, R, U⟩ governance relations without fabrication.',
    containerClass: 'bg-rose-500/15 text-rose-200 border-rose-400/40',
    dotClass: 'bg-rose-400',
    icon: AlertTriangle,
  },
};

export const PipelineStageBanner: React.FC<PipelineStageBannerProps> = ({
  activeStage,
  onSelectStage,
  readiness: readinessProp,
  latestEvent: latestEventProp,
  events: eventsProp,
  translationResult,
  onHighlightSpan,
  reducedMotion = false,
  className = '',
}) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const resolvedStage: PipelineStageId =
    activeStage in STAGE_MATH_SPECIFICATIONS ? activeStage : 'segment';
  const stageSpec = STAGE_MATH_SPECIFICATIONS[resolvedStage];
  const StageIcon = stageSpec.icon;

  const readiness: TranslationReadiness =
    readinessProp ?? translationResult?.readiness ?? 'human-reviewed';
  const readinessInfo = READINESS_DESCRIPTORS[readiness] ?? READINESS_DESCRIPTORS['human-reviewed'];
  const ReadinessIcon = readinessInfo.icon;

  const resolvedEvent = useMemo<TranslationEvent | null>(() => {
    if (latestEventProp) return latestEventProp;
    const allEvents = eventsProp ?? translationResult?.events ?? [];
    if (allEvents.length === 0) return null;

    // Prefer the latest event matching the current stage, or fallback to the last event overall
    const matchingStageEvents = allEvents.filter((ev) => ev.stage === resolvedStage);
    if (matchingStageEvents.length > 0) {
      return matchingStageEvents[matchingStageEvents.length - 1];
    }
    return allEvents[allEvents.length - 1];
  }, [latestEventProp, eventsProp, translationResult, resolvedStage]);

  const stageMetricsSummary = useMemo(() => {
    if (!translationResult) return null;
    switch (resolvedStage) {
      case 'source':
      case 'segment': {
        const total = translationResult.clauses.length;
        const supported = translationResult.clauses.filter((c) => c.supported).length;
        return `${supported}/${total} normative clauses mapped`;
      }
      case 'extract': {
        const verified = translationResult.concepts.filter((c) => c.verified).length;
        const unmapped = translationResult.unmappedConcepts.length;
        return `${verified} verified tokens · ${unmapped} quarantined`;
      }
      case 'entity': {
        const { processes, activities, roles, users } = translationResult.validation.counts;
        return `|P|=${processes} · |A|=${activities} · |R|=${roles} · |U|=${users}`;
      }
      case 'relation': {
        const { relations, allowPolicies, denyPolicies } = translationResult.validation.counts;
        return `${relations} relations · ${allowPolicies} Allow (+) · ${denyPolicies} Deny (−)`;
      }
      case 'gal': {
        const { entities, relations, policies } = translationResult.validation.counts;
        return `Φ_L: ${entities} entities · ${relations + policies} edges`;
      }
      case 'validate': {
        const isConsistent = translationResult.validation.internalLawConsistent;
        const cov = Math.round(translationResult.validation.sourceCoveragePercent);
        return `${isConsistent ? 'Con(⋀Φ_L) Valid' : 'Conflict Detected'} · ${cov}% coverage`;
      }
      default:
        return null;
    }
  }, [translationResult, resolvedStage]);

  const transitionClass = reducedMotion ? '' : 'transition-all duration-300 ease-out';

  return (
    <section
      aria-label="GAM Pipeline Stage Mathematical Banner"
      data-testid="pipeline-stage-banner"
      data-stage={resolvedStage}
      className={`relative overflow-hidden rounded-xl border border-sky-500/25 bg-[#0a0f24]/95 shadow-[0_12px_40px_rgba(2,6,23,0.75)] backdrop-blur-md ${transitionClass} ${className}`}
    >
      {/* Subtle top formal luminescence bar */}
      <div
        aria-hidden="true"
        className="h-0.5 w-full bg-gradient-to-r from-cyan-500/80 via-sky-400/70 to-emerald-400/80"
      />

      <div className="p-3.5 sm:p-4">
        {/* Top Row: Stage Number/Title + Step Pill Strip + Translation Readiness Badge */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Stage Identity & Title */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-cyan-300 uppercase">
              <StageIcon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span data-testid="pipeline-stage-badge">{stageSpec.stageBadge}</span>
            </div>

            <h2
              data-testid="pipeline-stage-title"
              className="text-base sm:text-lg font-bold tracking-tight text-slate-100"
            >
              {stageSpec.title}
            </h2>

            {stageMetricsSummary && (
              <span
                data-testid="pipeline-stage-metrics-pill"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/90 px-2.5 py-0.5 font-mono text-xs text-sky-300"
              >
                <Activity className="h-3 w-3 text-sky-400" />
                {stageMetricsSummary}
              </span>
            )}
          </div>

          {/* Right: 6-Stage Quick Stepper + Readiness Badge with Tooltip */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 lg:justify-end">
            {/* Compact 1-6 Stage Indicator */}
            <nav
              aria-label="Pipeline stage progression"
              className="flex items-center gap-1 rounded-lg border border-slate-800/90 bg-[#050814]/80 p-1"
            >
              {ORDERED_WORKBENCH_STAGES.map((stageId) => {
                const spec = STAGE_MATH_SPECIFICATIONS[stageId];
                const isCurrent = stageId === resolvedStage;
                const isCompleted = spec.stageNumber < stageSpec.stageNumber;
                return (
                  <button
                    key={stageId}
                    type="button"
                    disabled={!onSelectStage}
                    onClick={() => onSelectStage?.(stageId)}
                    title={spec.title}
                    aria-current={isCurrent ? 'step' : undefined}
                    data-testid={`banner-stage-step-${stageId}`}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${transitionClass} ${
                      isCurrent
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                        : isCompleted
                          ? 'text-emerald-300/90 hover:bg-slate-800/70 border border-transparent'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    } ${onSelectStage ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="font-mono text-[11px] font-bold">{spec.stageNumber}</span>
                    <span className="hidden xl:inline">{spec.shortTitle}</span>
                  </button>
                );
              })}
            </nav>

            {/* Translation Readiness Badge with Accessible Tooltip */}
            <div
              className="relative"
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
            >
              <button
                type="button"
                onClick={() => setTooltipOpen((prev) => !prev)}
                onFocus={() => setTooltipOpen(true)}
                onBlur={() => setTooltipOpen(false)}
                aria-expanded={tooltipOpen}
                aria-describedby="readiness-tooltip-panel"
                data-testid="translation-readiness-badge"
                data-readiness={readiness}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide ${readinessInfo.containerClass} ${transitionClass}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${readinessInfo.dotClass} ${
                    !reducedMotion && readiness === 'actual-generated' ? 'animate-pulse' : ''
                  }`}
                />
                <ReadinessIcon className="h-3.5 w-3.5 shrink-0" />
                <span>{readinessInfo.label}</span>
                <Info className="h-3.5 w-3.5 opacity-75 shrink-0" />
              </button>

              {tooltipOpen && (
                <div
                  id="readiness-tooltip-panel"
                  role="tooltip"
                  data-testid="translation-readiness-tooltip"
                  className="absolute right-0 z-30 mt-2 w-80 sm:w-96 rounded-xl border border-sky-400/30 bg-[#050814]/95 p-3.5 text-left shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold tracking-wide text-slate-100 uppercase">
                      {readinessInfo.tooltipTitle}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                      {readinessInfo.shortCode}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {readinessInfo.tooltipDetail}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono text-[10px] text-slate-400">
                    <span>GAM 2.0 Epistemic Honesty Guard</span>
                    <span>Φ = ⟨P, A, R, U ; ...⟩</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Row: Formal GAM Mathematical Transformation */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-12">
          <div
            data-testid="pipeline-stage-math-transformation"
            className="lg:col-span-7 flex flex-col justify-center rounded-lg border border-cyan-500/20 bg-[#111936]/75 px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              <Sigma className="h-3.5 w-3.5 shrink-0" />
              <span>Formal GAM Mathematical Transformation</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                data-testid="pipeline-stage-formal-mapping"
                className="font-mono text-xs sm:text-sm font-semibold text-slate-100"
              >
                {stageSpec.formalMapping}
              </span>
              <span className="hidden sm:inline text-slate-600">|</span>
              <code
                data-testid="pipeline-stage-formal-formula"
                className="font-mono text-[11px] sm:text-xs text-sky-300/95"
              >
                {stageSpec.formalFormula}
              </code>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-center rounded-lg border border-slate-800/90 bg-[#050814]/70 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Binary className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Stage Codomain & Semantics</span>
            </div>
            <p className="mt-1 text-xs leading-snug text-slate-300">{stageSpec.operationalNotes}</p>
          </div>
        </div>

        {/* Bottom Row: Live Trace Event Ticker */}
        <div
          data-testid="pipeline-trace-ticker"
          className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/90 bg-[#050814]/90 px-3 py-2 text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300 shrink-0">
              <Radio
                className={`h-3 w-3 text-cyan-400 ${
                  !reducedMotion ? 'animate-pulse' : ''
                }`}
              />
              <span>LIVE TRACE</span>
            </span>

            {resolvedEvent ? (
              <>
                <span
                  data-testid="trace-event-step"
                  className="font-mono text-[11px] text-slate-400 shrink-0"
                >
                  [Step #{resolvedEvent.stepIndex + 1} · {resolvedEvent.stage.toUpperCase()}]
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <span
                  data-testid="trace-event-explanation"
                  className="truncate font-mono text-xs text-slate-200"
                  title={resolvedEvent.explanation}
                >
                  {resolvedEvent.explanation ??
                    `Executed stage '${resolvedEvent.stage}' transformation step ${resolvedEvent.stepIndex + 1}.`}
                </span>
              </>
            ) : (
              <span
                data-testid="trace-event-explanation"
                className="truncate font-mono text-xs text-slate-400"
              >
                Ready — Select any statutory clause, concept token, or GAM node to inspect live formal trace provenance.
              </span>
            )}
          </div>

          {/* Right side of ticker: Source span character range & linked entity/relation badges */}
          <div className="flex items-center gap-2 shrink-0">
            {resolvedEvent?.entityIds && resolvedEvent.entityIds.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                <span>Nodes:</span>
                <span>{resolvedEvent.entityIds.slice(0, 2).join(', ')}</span>
                {resolvedEvent.entityIds.length > 2 && (
                  <span>+{resolvedEvent.entityIds.length - 2}</span>
                )}
              </span>
            )}

            {resolvedEvent?.relationIds && resolvedEvent.relationIds.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                <ArrowRight className="h-3 w-3" />
                <span>{resolvedEvent.relationIds.slice(0, 2).join(', ')}</span>
              </span>
            )}

            {resolvedEvent?.sourceSpan ? (
              <button
                type="button"
                onClick={() =>
                  onHighlightSpan?.({
                    start: resolvedEvent.sourceSpan!.start,
                    end: resolvedEvent.sourceSpan!.end,
                  })
                }
                data-testid="trace-event-span-badge"
                className={`inline-flex items-center gap-1.5 rounded border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 ${transitionClass}`}
                title="Highlight character range in statutory source text"
              >
                <span>Span</span>
                <span>
                  [{resolvedEvent.sourceSpan.start}..{resolvedEvent.sourceSpan.end}]
                </span>
              </button>
            ) : (
              <span
                data-testid="trace-event-span-badge"
                className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-900/80 px-2 py-0.5 font-mono text-[11px] text-slate-400"
              >
                <span>Span [0..{translationResult?.sourceText?.length ?? 0}]</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PipelineStageBanner;
