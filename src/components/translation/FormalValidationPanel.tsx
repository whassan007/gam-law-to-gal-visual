import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  FileCode2,
  Copy,
  Download,
  Check,
  GitMerge,
  ArrowRight,
  Compass,
  Scale,
  Layers,
  Activity,
  Users,
  Network,
  Sparkles,
  BookOpen,
  HelpCircle,
  Eye,
} from 'lucide-react';
import type {
  FormalValidationReport,
  TranslationReadiness,
} from '../../types/contracts.ts';

export interface FormalValidationPanelProps {
  validation: FormalValidationReport;
  readiness: TranslationReadiness;
  onHighlightSpan: (span: { start: number; end: number } | null) => void;
  onOpenEnterpriseComparison?: () => void;
}

const READINESS_META: Record<
  TranslationReadiness,
  { label: string; badgeClass: string; desc: string }
> = {
  'human-reviewed': {
    label: 'Human-Reviewed Authoritative GAM Model',
    badgeClass:
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    desc: 'Curated and formally audited against statutory clauses and GAM 2.0 edge-direction semantics.',
  },
  'actual-generated': {
    label: 'Live Pipeline Generated',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    desc: 'Constructed live by the GAM natural-language extraction and translation pipeline.',
  },
  'unverified-draft': {
    label: 'Unverified Heuristic Draft',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    desc: 'Heuristic NLP extraction; requires human formal review of polarity and edge orientation.',
  },
  unsupported: {
    label: 'Unsupported / Reference Only',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    desc: 'No formal translation available for this jurisdiction.',
  },
};

export const FormalValidationPanel: React.FC<FormalValidationPanelProps> = ({
  validation,
  readiness,
  onHighlightSpan,
  onOpenEnterpriseComparison,
}) => {
  const [activeTab, setActiveTab] = useState<'verification' | 'alloy'>('verification');
  const [copiedAlloy, setCopiedAlloy] = useState(false);

  const warningCount =
    validation.directionWarnings.length +
    validation.untypedEntities.length +
    validation.unresolvedReferences.length +
    validation.unmappedClauses.length +
    validation.ambiguousInterpretations.length;

  const isOverallValid =
    validation.structuralValid &&
    validation.entityTypingValid &&
    validation.relationDirectionsValid &&
    validation.modalityConsistent &&
    validation.internalLawConsistent &&
    validation.unresolvedReferences.length === 0;

  const readinessInfo = READINESS_META[readiness] ?? READINESS_META['unverified-draft'];

  const handleCopyAlloy = async () => {
    try {
      await navigator.clipboard.writeText(validation.alloySpecification || '');
      setCopiedAlloy(true);
      setTimeout(() => setCopiedAlloy(false), 2000);
    } catch {
      // Fallback if clipboard API fails in restricted environments
      setCopiedAlloy(false);
    }
  };

  const handleDownloadAlloy = () => {
    const blob = new Blob([validation.alloySpecification || ''], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gam_law_specification.als';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to resolve optional span on unmapped/ambiguous items if provided at runtime
  const resolveSpan = (
    item: {
      clauseId?: string;
      text?: string;
      sourceSpan?: { start: number; end: number };
    },
    fallbackIndex: number
  ): { start: number; end: number } => {
    if (
      item.sourceSpan &&
      typeof item.sourceSpan.start === 'number' &&
      typeof item.sourceSpan.end === 'number'
    ) {
      return { start: item.sourceSpan.start, end: item.sourceSpan.end };
    }
    const len = item.text ? item.text.length : 48;
    const start = fallbackIndex * 60;
    return { start, end: start + len };
  };

  return (
    <div
      className="flex flex-col gap-5 text-slate-100"
      data-testid="formal-validation-panel"
    >
      {/* ─── CRITICAL FORMAL DISTINCTION BANNER ───────────────────────────────── */}
      <div
        data-testid="no-false-compliance-banner"
        className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-cyan-950/50 p-4 shadow-lg"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-300">
              <Scale className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Formal Scope Boundary: Legal Model (Φ_L) vs. Organizational Compliance
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${readinessInfo.badgeClass}`}
                >
                  {readinessInfo.label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-200">
                {validation.complianceNotice ||
                  'Translating a statute into GAL produces the formal legal model Φ_L. Passing Stage 6 validates structural well-formedness and internal deontic consistency of Φ_L alone — it does NOT establish organizational compliance.'}
              </p>
              <p className="text-xs text-slate-400">
                Organizational compliance requires merging an enterprise configuration{' '}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">
                  Φ_E
                </code>{' '}
                into the shared vocabulary and evaluating{' '}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">
                  Con(⋀Φ_E ∧ ⋀Φ_L)
                </code>{' '}
                over role inheritance (<code className="font-mono">RR*</code>) and process composition (
                <code className="font-mono">PP*</code>) closures, alongside{' '}
                <span className="text-slate-200 font-medium">Ontology Completeness</span> and{' '}
                <span className="text-slate-200 font-medium">Scenario Precedence</span>.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              data-testid="open-enterprise-comparison-button"
              onClick={onOpenEnterpriseComparison}
              className="group inline-flex items-center gap-2.5 rounded-lg border border-cyan-400/50 bg-cyan-500/20 px-4 py-2.5 text-xs font-semibold text-cyan-200 shadow-md transition-all hover:border-cyan-300 hover:bg-cyan-500/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <GitMerge className="h-4 w-4 text-cyan-300 transition-transform group-hover:scale-110" />
              <span>Compare with Enterprise (Φ_L ∧ Φ_E Closure Demo)</span>
              <ArrowRight className="h-3.5 w-3.5 text-cyan-300 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY METRICS BAR ──────────────────────────────────────────────── */}
      <div
        data-testid="validation-summary-metrics-bar"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7"
      >
        {/* 1. Overall Validation Status */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0a0f24]/90 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Φ_L Status
          </span>
          <div className="mt-2 flex items-center gap-2">
            {isOverallValid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-bold text-emerald-300">Well-Formed</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-amber-300">Needs Review</span>
              </>
            )}
          </div>
          <span className="mt-1 text-[11px] text-slate-500">
            Internal Con(Φ_L): {validation.internalLawConsistent ? 'SAT' : 'UNSAT'}
          </span>
        </div>

        {/* 2. Entities (P, A, R, U) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0a0f24]/90 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Entities (P,A,R,U)
            </span>
            <Users className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {validation.counts.entities}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-purple-300">
              P:{validation.counts.processes}
            </span>
            <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-cyan-300">
              A:{validation.counts.activities}
            </span>
            <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-emerald-300">
              R:{validation.counts.roles}
            </span>
            <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-amber-300">
              U:{validation.counts.users}
            </span>
          </div>
        </div>

        {/* 3. Relations */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0a0f24]/90 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Relations
            </span>
            <Network className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {validation.counts.relations}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">
            PP, PA, RR, S, X, RU⁺, RA⁺
          </span>
        </div>

        {/* 4. Policies (Allow vs Deny) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0a0f24]/90 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Policies (±)
            </span>
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {validation.counts.policies}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
            <span className="text-emerald-400">
              +{validation.counts.allowPolicies} Allow
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">
              −{validation.counts.denyPolicies} Deny
            </span>
          </div>
        </div>

        {/* 5. Unresolved Items */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0a0f24]/90 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Unresolved Items
          </span>
          <div
            className={`mt-1 text-xl font-bold ${
              validation.counts.unresolved === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {validation.counts.unresolved}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">
            {validation.unresolvedReferences.length} dangling refs
          </span>
        </div>

        {/* 6. Source Coverage % */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0a0f24]/90 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Source Coverage
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-cyan-300">
              {validation.sourceCoveragePercent}%
            </span>
            <span className="text-xs text-slate-400">
              ({validation.mappedClauseCount}/{validation.totalClauseCount})
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
              style={{
                width: `${Math.min(100, Math.max(0, validation.sourceCoveragePercent))}%`,
              }}
            />
          </div>
        </div>

        {/* 7. Warnings */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0a0f24]/90 p-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Diagnostic Notices
          </span>
          <div
            className={`mt-1 text-xl font-bold ${
              warningCount === 0 ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {warningCount}
          </div>
          <span className="mt-1 text-[11px] text-slate-400">
            {validation.directionWarnings.length} edge · {validation.unmappedClauses.length} unmapped
          </span>
        </div>
      </div>

      {/* ─── NAVIGATION TABS (STAGE 6 CARDS vs. ALLOY 6.2.0 EMITTER) ─────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="tab-verification-cards"
            onClick={() => setActiveTab('verification')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'verification'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Stage 6 Verification Suite (8 Formal Checks)</span>
          </button>

          <button
            type="button"
            data-testid="tab-alloy-emitter"
            onClick={() => setActiveTab('alloy')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'alloy'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
          >
            <FileCode2 className="h-4 w-4" />
            <span>Alloy 6.2.0 Specification Emitter (.als)</span>
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Formalism:{' '}
          <code className="rounded bg-slate-900 px-2 py-0.5 font-mono text-cyan-300">
            Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
          </code>
        </div>
      </div>

      {/* ─── TAB 1: 8 RIGOROUS VERIFICATION CARDS ─────────────────────────────── */}
      {activeTab === 'verification' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* CARD 1: GAL Structural Validity */}
          <div
            data-testid="card-structural-validity"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    01
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    GAL Structural Validity
                  </h3>
                </div>
                {validation.structuralValid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Valid Schema
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-300 border border-rose-500/30">
                    <XCircle className="h-3.5 w-3.5" /> {validation.schemaErrors.length} Errors
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Verifies GAL-JSON structure against <code className="font-mono text-slate-300">schema.js validateModel</code> (required metadata, valid relation/policy enumerations, and cross-referenced entity identifiers).
              </p>

              {validation.schemaErrors.length === 0 ? (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-xs text-emerald-200">
                  Zero schema violations detected. All relations and policies conform to GAL-JSON structural grammar.
                </div>
              ) : (
                <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5 text-xs text-rose-200">
                  {validation.schemaErrors.map((err, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 font-mono">
                      <span className="text-rose-400">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* CARD 2: Entity Sort Typing (P, A, R, U) */}
          <div
            data-testid="card-entity-typing"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    02
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    Entity Sort Typing (<code className="font-mono text-cyan-300">P, A, R, U</code>)
                  </h3>
                </div>
                {validation.entityTypingValid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Disjoint Sorts Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="h-3.5 w-3.5" /> {validation.untypedEntities.length} Untyped
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Confirms every extracted concept maps to one of the four canonical GAM engine sorts: <span className="text-purple-300">Process (P)</span>, <span className="text-cyan-300">Activity (A)</span>, <span className="text-emerald-300">Role (R)</span>, or <span className="text-amber-300">User (U)</span>.
              </p>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg border border-purple-500/25 bg-purple-950/20 p-2">
                  <div className="text-xs font-bold text-purple-300">
                    {validation.counts.processes}
                  </div>
                  <div className="text-[10px] text-slate-400">Process (P)</div>
                </div>
                <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2">
                  <div className="text-xs font-bold text-cyan-300">
                    {validation.counts.activities}
                  </div>
                  <div className="text-[10px] text-slate-400">Activity (A)</div>
                </div>
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2">
                  <div className="text-xs font-bold text-emerald-300">
                    {validation.counts.roles}
                  </div>
                  <div className="text-[10px] text-slate-400">Role (R)</div>
                </div>
                <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-2">
                  <div className="text-xs font-bold text-amber-300">
                    {validation.counts.users}
                  </div>
                  <div className="text-[10px] text-slate-400">User (U)</div>
                </div>
              </div>

              {validation.untypedEntities.length > 0 && (
                <div className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 p-2 text-xs text-amber-200">
                  <span className="font-semibold">Untyped / Extended Entities: </span>
                  {validation.untypedEntities.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: Canonical Edge Direction (model.js _ingest) */}
          <div
            data-testid="card-edge-direction"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    03
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    Canonical Edge Direction (<code className="font-mono text-cyan-300">model.js _ingest</code>)
                  </h3>
                </div>
                {validation.relationDirectionsValid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Orientations Aligned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">
                    <Compass className="h-3.5 w-3.5" /> {validation.directionWarnings.length} Warnings
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Audits argument order against <code className="font-mono text-slate-300">GamModel._ingest</code>: relations use <code className="font-mono text-emerald-300">AssignedTo(Role→Activity)</code> &amp; <code className="font-mono text-emerald-300">Acts(Role→User)</code>, whereas policies invert to <code className="font-mono text-cyan-300">CanAssignTo(Activity→Role)</code> &amp; <code className="font-mono text-cyan-300">CanAct(User→Role)</code>.
              </p>

              {validation.directionWarnings.length === 0 ? (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-xs text-emerald-200">
                  All relations and policies satisfy canonical <code className="font-mono">model.js</code> source→target sort signatures.
                </div>
              ) : (
                <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-amber-200">
                  {validation.directionWarnings.map((warn, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 font-mono">
                      <span className="text-amber-400">⚠</span>
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* CARD 4: Polarity & Modality Consistency (RA±, RU±, UP±, RP±, D±) */}
          <div
            data-testid="card-polarity-modality"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    04
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    Polarity &amp; Modality Consistency (<code className="font-mono text-cyan-300">RA±, RU±, UP±, RP±, D±</code>)
                  </h3>
                </div>
                {validation.modalityConsistent && validation.internalLawConsistent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Con(Φ_L) Consistent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-300 border border-rose-500/30">
                    <ShieldAlert className="h-3.5 w-3.5" /> Polarity Clash
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Preserves the GAM 2.0 polarity split between Permitted (<code className="font-mono text-emerald-300">+</code>) and Prohibited (<code className="font-mono text-rose-300">−</code>) modalities so <code className="font-mono">Deny</code> is represented as an explicit fact rather than silence.
              </p>

              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-2.5 text-xs">
                <div className="flex-1">
                  <span className="text-slate-400">Permitted (+): </span>
                  <span className="font-mono font-bold text-emerald-300">
                    {validation.counts.allowPolicies} Allow
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex-1">
                  <span className="text-slate-400">Prohibited (−): </span>
                  <span className="font-mono font-bold text-rose-300">
                    {validation.counts.denyPolicies} Deny
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex-1">
                  <span className="text-slate-400">Internal Clash: </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {validation.internalViolations.length}
                  </span>
                </div>
              </div>

              {validation.internalViolations.length > 0 && (
                <ul className="mt-2.5 space-y-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5 text-xs text-rose-200">
                  {validation.internalViolations.map((v, i) => (
                    <li key={i}>
                      <span className="font-mono font-bold text-rose-300">[{v.type}]</span>{' '}
                      {v.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* CARD 5: Unresolved References */}
          <div
            data-testid="card-unresolved-references"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    05
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    Unresolved References &amp; Referential Integrity
                  </h3>
                </div>
                {validation.unresolvedReferences.length === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 0 Dangling Refs
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="h-3.5 w-3.5" /> {validation.unresolvedReferences.length} Unresolved
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Checks that every entity identifier referenced in <code className="font-mono text-slate-300">relations[]</code>, <code className="font-mono text-slate-300">policies[]</code>, <code className="font-mono text-slate-300">ontologyRequirements[]</code>, and <code className="font-mono text-slate-300">scenarioRequirements[]</code> is declared in the model universe.
              </p>

              {validation.unresolvedReferences.length === 0 ? (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-xs text-emerald-200">
                  Closed-world referential integrity satisfied across all declared facts.
                </div>
              ) : (
                <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs font-mono text-amber-200">
                  {validation.unresolvedReferences.map((ref, idx) => (
                    <li key={idx}>• {ref}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* CARD 6: Source Coverage & Translation Completeness */}
          <div
            data-testid="card-source-coverage"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    06
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    Source Coverage &amp; Translation Completeness
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                  {validation.mappedClauseCount} / {validation.totalClauseCount} Clauses ({validation.sourceCoveragePercent}%)
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Measures the proportion of segmented statutory clauses that produced verified GAL entities, relations, or deontic policies.
              </p>

              <div className="mt-3 space-y-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Formal Clause Mapping Ratio</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {validation.sourceCoveragePercent}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, validation.sourceCoveragePercent))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Note: In GAM (Thesis §2.2), consistency is formally validated while completeness of natural-language legal extraction is bounded by non-operational preamble or definitional clauses.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 7: Unmapped Clauses & Ambiguous Interpretations (Interactive Source Span Highlight) */}
          <div
            data-testid="card-unmapped-ambiguous"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    07
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    Unmapped Clauses &amp; Ambiguous Interpretations
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">
                  <HelpCircle className="h-3.5 w-3.5" />{' '}
                  {validation.unmappedClauses.length + validation.ambiguousInterpretations.length}{' '}
                  Items
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Explicitly surfaces statutory clauses not mapped to operational GAL rules and open legal ambiguities.{' '}
                <span className="text-cyan-300 font-medium">
                  Click any item to highlight its source span in the statute viewer.
                </span>
              </p>

              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {validation.unmappedClauses.length === 0 &&
                validation.ambiguousInterpretations.length === 0 ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-xs text-emerald-200">
                    All segmented clauses in this provision mapped cleanly without unmapped residuals.
                  </div>
                ) : (
                  <>
                    {validation.unmappedClauses.map((clause, idx) => {
                      const span = resolveSpan(clause, idx);
                      return (
                        <button
                          key={`unmapped-${clause.clauseId}-${idx}`}
                          type="button"
                          data-testid={`unmapped-clause-item-${clause.clauseId}`}
                          onClick={() => onHighlightSpan(span)}
                          onMouseEnter={() => onHighlightSpan(span)}
                          className="w-full text-left rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs transition-colors hover:border-cyan-400/60 hover:bg-slate-800/80"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-semibold text-amber-300">
                              Unmapped [{clause.clauseId}]
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300">
                              <Eye className="h-3 w-3" /> Highlight Span
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 italic text-slate-200">
                            &ldquo;{clause.text}&rdquo;
                          </p>
                          <p className="mt-1 text-[11px] text-amber-200/80">
                            Reason: {clause.reason}
                          </p>
                        </button>
                      );
                    })}

                    {validation.ambiguousInterpretations.map((amb, idx) => {
                      const span = resolveSpan(amb, idx + validation.unmappedClauses.length);
                      return (
                        <button
                          key={`ambiguous-${amb.id}-${idx}`}
                          type="button"
                          data-testid={`ambiguous-interpretation-item-${amb.id}`}
                          onClick={() => onHighlightSpan(span)}
                          onMouseEnter={() => onHighlightSpan(span)}
                          className="w-full text-left rounded-lg border border-purple-500/30 bg-purple-950/20 p-2.5 text-xs transition-colors hover:border-cyan-400/60 hover:bg-slate-800/80"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-semibold text-purple-300">
                              Ambiguity [{amb.id} · {amb.clauseId}]
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300">
                              <Eye className="h-3 w-3" /> Highlight Span
                            </span>
                          </div>
                          <p className="mt-1 text-slate-200">{amb.description}</p>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CARD 8: Ontology & Scenario Duties (OntologyChecker) */}
          <div
            data-testid="card-ontology-scenario-duties"
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111936]/80 p-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300">
                    08
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    Ontology &amp; Scenario Duties (<code className="font-mono text-cyan-300">OntologyChecker</code>)
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-medium text-cyan-300 border border-cyan-500/30">
                  <BookOpen className="h-3.5 w-3.5" />{' '}
                  {validation.ontologyRequirements.length} Ontology ·{' '}
                  {validation.scenarioRequirements.length} Scenario
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Structural presence duties (<code className="font-mono">ONTOLOGY_GAP</code> over <code className="font-mono">PA*, RR*, PP*</code>) and temporal precedence duties (<code className="font-mono">SCENARIO_VIOLATION</code> over <code className="font-mono">Next⁺</code>) that cannot be reduced to propositional consistency <code className="font-mono">Con</code>.
              </p>

              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {validation.ontologyRequirements.length === 0 &&
                validation.scenarioRequirements.length === 0 ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-400">
                    No structural ontology or temporal scenario duties declared in this provision.
                  </div>
                ) : (
                  <>
                    {validation.ontologyRequirements.map((req) => (
                      <div
                        key={`ont-${req.id}`}
                        onClick={() => req.sourceSpan && onHighlightSpan(req.sourceSpan)}
                        className="cursor-pointer rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2.5 text-xs hover:border-cyan-400/50"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-cyan-300">
                          <span>Ontology Duty [{req.id}]</span>
                          <span>
                            {req.process && req.activity
                              ? `${req.process} ⊇* ${req.activity}`
                              : req.parentRole && req.childRole
                              ? `${req.parentRole} ⊇* ${req.childRole}`
                              : `${req.parentProcess} ⊇* ${req.childProcess}`}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-300">{req.rationale}</p>
                      </div>
                    ))}

                    {validation.scenarioRequirements.map((scen) => (
                      <div
                        key={`scen-${scen.id}`}
                        onClick={() => scen.sourceSpan && onHighlightSpan(scen.sourceSpan)}
                        className="cursor-pointer rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2.5 text-xs hover:border-emerald-400/50"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-emerald-300">
                          <span>Scenario Duty [{scen.id}] ({scen.kind})</span>
                          <span>
                            {scen.from} →⁺ {scen.to}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-300">{scen.rationale}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: OPTIONAL ALLOY 6.2.0 SPECIFICATION EMITTER ───────────────── */}
      {activeTab === 'alloy' && (
        <div
          data-testid="alloy-spec-viewer"
          className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#0a0f24] p-4 shadow-lg"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <span>Emitted Alloy 6.2.0 Relational Specification</span>
                </h3>
                <span
                  data-testid="alloy-honest-status-badge"
                  className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-[11px] font-semibold text-amber-300"
                >
                  Alloy 6.2.0 Specification Emitted (Static Emission — External Kodkod/JVM Solver Not Claimed)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generated live by <code className="font-mono text-cyan-300">src/engine/gam-core/alloy-emitter.js</code> opening <code className="font-mono text-cyan-300">gam_core.als</code>. In-browser consistency and closure checks run directly via GAM&apos;s JavaScript closure &amp; DPLL/MUS engine; download this <code className="font-mono">.als</code> file to run bounded relational model checking in Alloy Analyzer 6.2.0.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                data-testid="copy-alloy-button"
                onClick={handleCopyAlloy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white"
              >
                {copiedAlloy ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied .als</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Copy .als</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="download-alloy-button"
                onClick={handleDownloadAlloy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
              >
                <Download className="h-3.5 w-3.5 text-cyan-300" />
                <span>Download .als</span>
              </button>
            </div>
          </div>

          <pre className="max-h-96 overflow-auto rounded-lg border border-slate-800/90 bg-[#050814] p-4 font-mono text-xs leading-relaxed text-cyan-100">
            <code>{validation.alloySpecification}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default FormalValidationPanel;
