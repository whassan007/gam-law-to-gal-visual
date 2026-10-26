import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  ExternalLink,
  FileText,
  Globe2,
  Hash,
  Info,
  Languages,
  Layers,
  Play,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { InstrumentCataloguePanel } from './InstrumentCataloguePanel';
import type {
  CatalogueInstrument,
  CountryMetadata,
  LawMetadata,
  LawProvision,
  TranslationReadiness,
} from '../../types/contracts';

export interface LawSelectorPanelProps {
  country: CountryMetadata | null;
  laws: LawMetadata[];
  /** Metadata-only catalogue of further instruments for this jurisdiction. */
  catalogue?: CatalogueInstrument[];
  selectedLaw: LawMetadata | null;
  selectedProvision: LawProvision | null;
  onSelectLaw: (law: LawMetadata) => void;
  onSelectProvision: (provision: LawProvision) => void;
  onProcessLaw: (mode: 'curated' | 'live-pipeline') => void;
  onTranslateSourcePassage?: (instrument: CatalogueInstrument, passage: string) => void;
  onBackToGlobe?: () => void;
}

const READINESS_META: Record<
  TranslationReadiness,
  {
    label: string;
    description: string;
    badgeClasses: string;
    dotClasses: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  'human-reviewed': {
    label: 'Human-Reviewed GAM Translation',
    description:
      'Authoritative statutory mapping formally reviewed against GAM 2.0 typing and deontic constraints.',
    badgeClasses:
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    dotClasses: 'bg-emerald-400',
    icon: ShieldCheck,
  },
  'actual-generated': {
    label: 'Live GAM Pipeline Output',
    description:
      'Produced directly by the deterministic readLawToGAM lexical/deontic translation pipeline.',
    badgeClasses: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    dotClasses: 'bg-cyan-400',
    icon: Cpu,
  },
  'unverified-draft': {
    label: 'Unverified Heuristic Draft',
    description:
      'Candidate extraction requiring formal legal-ontological review before compliance modeling.',
    badgeClasses: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    dotClasses: 'bg-amber-400',
    icon: AlertTriangle,
  },
  unsupported: {
    label: 'Unsupported / Unmapped',
    description: 'No validated GAM formalization is available for this instrument.',
    badgeClasses: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    dotClasses: 'bg-rose-400',
    icon: ShieldAlert,
  },
};

const LEVEL_BADGE_STYLES: Record<LawMetadata['jurisdictionLevel'], string> = {
  Federal: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  State: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  Provincial: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Supranational: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
};

export const LawSelectorPanel: React.FC<LawSelectorPanelProps> = ({
  country,
  laws,
  catalogue = [],
  selectedLaw,
  selectedProvision,
  onSelectLaw,
  onSelectProvision,
  onProcessLaw,
  onTranslateSourcePassage,
  onBackToGlobe,
}) => {
  const [processingMode, setProcessingMode] = useState<'curated' | 'live-pipeline'>('curated');
  const [copiedPassage, setCopiedPassage] = useState(false);

  const handleCopyVerbatimText = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedPassage(true);
    setTimeout(() => setCopiedPassage(false), 2000);
  };

  // State 1: No jurisdiction selected
  if (!country) {
    return (
      <section
        aria-label="Jurisdiction & Law Selector"
        className="flex flex-col items-center justify-center h-full min-h-[420px] rounded-2xl border border-slate-800/80 bg-navy-900/90 p-8 text-center text-slate-200 shadow-2xl backdrop-blur-md"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-inner">
          <Globe2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Select a Jurisdiction to Inspect Legislation
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          Choose a country or supranational region on the interactive 3D globe or from the
          jurisdiction directory to inspect verified statutory provisions and translate them into
          Governance Analysis Language (<span className="font-mono text-cyan-300">GAL</span>).
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Supported Jurisdictions: Verified Primary Sources
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-300">
            <Scale className="h-3.5 w-3.5 text-cyan-400" />
            GAM Tuple Φ = ⟨P, A, R, U ; Relations &amp; Policies⟩
          </span>
        </div>
      </section>
    );
  }

  // State 2: Country is unsupported or has no curated laws
  if (!country.supported || laws.length === 0) {
    return (
      <section
        aria-label="Jurisdiction & Law Selector"
        className="flex flex-col h-full rounded-2xl border border-slate-800/80 bg-navy-900/95 p-6 text-slate-200 shadow-2xl backdrop-blur-md"
      >
        {/* Header with optional back navigation */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none" role="img" aria-label={country.name}>
              {country.flag}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{country.name}</h2>
                <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                  {country.isoA3}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {country.region}
                {country.legalTradition ? ` • ${country.legalTradition}` : ''}
              </p>
            </div>
          </div>

          {onBackToGlobe && (
            <button
              type="button"
              onClick={onBackToGlobe}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Globe
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pt-4 space-y-6">
        {/* Honest Unsupported Notice */}
        <div
          data-testid="unsupported-country-notice"
          className="flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-950/20 p-8 text-center"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-xs font-medium text-amber-300">
            Unsupported Jurisdiction in Curated Corpus
          </span>
          <h3 className="text-lg font-semibold text-white">
            No Validated GAM Demonstration Law Available for {country.name}
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
            The Governance Analysis Method (<strong className="text-white">GAM</strong>) requires
            verified, verbatim statutory passages with traceable official citations and provenance
            metadata. This system <strong className="text-amber-300">never fabricates or synthesizes legislation</strong> to
            fill geographic coverage.
          </p>
          {country.notes && (
            <p className="mt-3 max-w-md rounded-lg border border-slate-800 bg-navy-950/80 px-4 py-2.5 text-xs text-slate-400">
              {country.notes}
            </p>
          )}
          <div className="mt-6 rounded-lg border border-slate-800 bg-navy-950/90 p-4 text-left text-xs text-slate-400 max-w-lg w-full">
            <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-cyan-400" />
              Why is {country.name} marked unsupported?
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Every GAM law model (<span className="font-mono text-cyan-300">Φ_L</span>) must map
                clauses to exact character spans in an authentic statutory publication.
              </li>
              <li>
                Select a highlighted jurisdiction (such as <strong>Canada</strong>,{' '}
                <strong>United States</strong>, <strong>European Union</strong>,{' '}
                <strong>Germany</strong>, <strong>France</strong>, <strong>United Kingdom</strong>, or{' '}
                <strong>Ireland</strong>) to inspect a verified primary statute.
              </li>
            </ul>
          </div>
        </div>

        {/* Catalogued (untranslated) instruments for this jurisdiction */}
        {catalogue.length > 0 && (
          <div
            data-testid="unsupported-catalogue-summary-banner"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-navy-900/90 to-indigo-950/30 p-4 text-left shadow-lg"
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-cyan-300">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-cyan-200">
                    {catalogue.length} Legal {catalogue.length === 1 ? 'Instrument' : 'Instruments'} Catalogued for {country.name}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  Explore the verified statutory registry below: you can read bundled full texts directly in-app or click{' '}
                  <strong className="font-semibold text-cyan-200">&ldquo;Translate excerpt → GAL&rdquo;</strong>{' '}
                  on any bundled text to load it directly into the live{' '}
                  <code className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-cyan-300">readLawToGAM</code>{' '}
                  Deontic Editor!
                </p>
              </div>
            </div>
          </div>
        )}
        <InstrumentCataloguePanel
          instruments={catalogue}
          onTranslateSourcePassage={onTranslateSourcePassage}
        />
        </div>
      </section>
    );
  }

  // Active law and provision fallback if parent hasn't initialized selection yet
  const activeLaw = selectedLaw ?? laws[0];
  const activeProvision =
    selectedProvision ?? (activeLaw.provisions.length > 0 ? activeLaw.provisions[0] : null);

  const lawReadiness = READINESS_META[activeLaw.readiness];
  const LawReadinessIcon = lawReadiness.icon;

  // Compute summary metrics for the selected provision
  const clauseCount = activeProvision ? activeProvision.clauses.length : 0;
  const conceptCount = activeProvision ? activeProvision.concepts.length : 0;
  const entityCount = activeProvision ? activeProvision.curatedGalModel.entities.length : 0;
  const relationCount = activeProvision ? activeProvision.curatedGalModel.relations.length : 0;
  const policyCount = activeProvision ? activeProvision.curatedGalModel.policies.length : 0;
  const unmappedCount = activeProvision?.unmappedClauses?.length ?? 0;

  // Compute deontic modality breakdown across clauses and policies
  const obligatoryCount = activeProvision
    ? activeProvision.clauses.filter((c) => c.deonticModality === 'Obligatory').length
    : 0;
  const permittedCount = activeProvision
    ? activeProvision.clauses.filter((c) => c.deonticModality === 'Permitted').length
    : 0;
  const prohibitedCount = activeProvision
    ? activeProvision.clauses.filter((c) => c.deonticModality === 'Prohibited').length
    : 0;

  return (
    <section
      aria-label="Jurisdiction & Law Selector"
      className="flex flex-col h-full rounded-2xl border border-slate-800/80 bg-navy-900/95 text-slate-200 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Top Bar: Country Identity & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-navy-950/60 px-6 py-4">
        <div className="flex items-center gap-3.5">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/60 text-3xl shadow-inner"
            role="img"
            aria-label={country.name}
          >
            {country.flag}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">{country.name}</h2>
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-300">
                {country.code} / {country.isoA3}
              </span>
              {country.legalTradition && (
                <span className="rounded-full border border-slate-700 bg-slate-800/90 px-2.5 py-0.5 text-xs text-slate-300">
                  {country.legalTradition}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {country.region} • {laws.length}{' '}
              {laws.length === 1 ? 'Verified Statute' : 'Verified Statutes'} Available
              {catalogue.length > 0 && ` • ${catalogue.length} catalogued instruments`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
        {catalogue.length > 0 && (
          <button
            type="button"
            data-testid="jump-to-catalogue"
            onClick={() =>
              document.getElementById('instrument-catalogue-anchor')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          >
            {catalogue.length} catalogued instruments ↓
          </button>
        )}
        {onBackToGlobe && (
          <button
            type="button"
            onClick={onBackToGlobe}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Globe View
          </button>
        )}
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Step 1: Selectable Law Cards */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Scale className="h-4 w-4 text-cyan-400" />
              1. Select Primary Legislative Instrument
            </h3>
            <span className="text-xs text-slate-400">
              Click a statute to inspect its official metadata &amp; provisions
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {laws.map((law) => {
              const isSelected = activeLaw.id === law.id;
              const readiness = READINESS_META[law.readiness];
              const ReadinessIcon = readiness.icon;
              const levelStyle =
                LEVEL_BADGE_STYLES[law.jurisdictionLevel] ??
                'bg-slate-800 text-slate-300 border-slate-700';

              return (
                <div
                  key={law.id}
                  data-testid={`law-card-${law.id}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => onSelectLaw(law)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectLaw(law);
                    }
                  }}
                  className={`group relative rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500/80 bg-cyan-950/20 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/50'
                      : 'border-slate-800 bg-navy-950/60 hover:border-slate-700 hover:bg-navy-950/90'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-cyan-300">
                          {law.shortName}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[11px] font-medium ${levelStyle}`}
                        >
                          {law.jurisdiction} • {law.jurisdictionLevel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${readiness.badgeClasses}`}
                        >
                          <ReadinessIcon className="h-3 w-3" />
                          {readiness.label}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-white group-hover:text-cyan-200 transition-colors">
                        {law.name}
                      </h4>
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-1 text-xs font-medium text-cyan-300 border border-cyan-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{law.summary}</p>

                  {/* Law Metadata Grid */}
                  <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-800/80 pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                          Official Citation
                        </span>
                        <span className="font-mono text-slate-200">{law.officialCitation}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-400">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                          Issuing Authority
                        </span>
                        <span className="text-slate-200">{law.issuingAuthority}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-400">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                          Effective / Version
                        </span>
                        <span className="text-slate-200">
                          {law.effectiveDate} ({law.version})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-400">
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                          Authoritative Source
                        </span>
                        <a
                          href={law.officialSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-medium text-cyan-400 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300"
                        >
                          Official Registry
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Catalogue of further instruments (metadata only) */}
        <div id="instrument-catalogue-anchor" />
        <InstrumentCataloguePanel
          instruments={catalogue}
          onOpenTranslatedLaw={(id) => {
            const law = laws.find((l) => l.id === id);
            if (law) onSelectLaw(law);
          }}
          onTranslateSourcePassage={onTranslateSourcePassage}
        />

        {/* Step 2: Provision Selector */}
        {activeLaw.provisions.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Layers className="h-4 w-4 text-cyan-400" />
                2. Select Curated Statutory Provision ({activeLaw.provisions.length})
              </h3>
              <span className="text-xs text-slate-400">
                Each provision preserves verbatim legislative text &amp; span offsets
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeLaw.provisions.map((prov) => {
                const isSelectedProv = activeProvision?.id === prov.id;
                const provReadiness = READINESS_META[prov.readiness];

                return (
                  <button
                    key={prov.id}
                    type="button"
                    data-testid={`provision-select-${prov.id}`}
                    onClick={() => onSelectProvision(prov)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                      isSelectedProv
                        ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-md shadow-cyan-950/40'
                        : 'border-slate-800 bg-navy-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${provReadiness.dotClasses}`}
                      title={provReadiness.label}
                    />
                    <div>
                      <div className="font-mono font-semibold text-cyan-300">{prov.section}</div>
                      <div className="text-xs font-medium text-slate-200 line-clamp-1">
                        {prov.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Authoritative Source Passage Inspector */}
        {activeProvision && (
          <div
            data-testid="source-passage-preview"
            className="rounded-xl border border-slate-800 bg-navy-950/90 p-5 shadow-inner space-y-4"
          >
            {/* Inspector Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-300">
                    <FileText className="h-3.5 w-3.5" />
                    {activeProvision.section}
                  </span>
                  <h4 className="text-base font-bold text-white">{activeProvision.title}</h4>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Authoritative Statutory Passage • Verbatim Primary Text with Character-Span
                  Provenance
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    READINESS_META[activeProvision.readiness].badgeClasses
                  }`}
                >
                  <LawReadinessIcon className="h-3.5 w-3.5" />
                  {READINESS_META[activeProvision.readiness].label}
                </span>
              </div>
            </div>

            {/* Verbatim Statutory Passage Block */}
            <div className="relative rounded-xl border border-slate-800/90 bg-[#070b19] p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <span>Verbatim Legislative Text ({activeProvision.language})</span>
                <div className="flex items-center gap-2.5">
                  <span>
                    {activeProvision.originalText.length} chars • Span [0..{activeProvision.originalText.length}]
                  </span>
                  <button
                    type="button"
                    data-testid="copy-verbatim-text-button"
                    onClick={() => handleCopyVerbatimText(activeProvision.originalText)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal transition ${
                      copiedPassage
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-200'
                    }`}
                  >
                    {copiedPassage ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-cyan-400" />
                        Copy Verbatim Text
                      </>
                    )}
                  </button>
                </div>
              </div>
              <blockquote className="font-serif text-sm sm:text-base leading-relaxed text-slate-100 whitespace-pre-line selection:bg-cyan-500/30 selection:text-cyan-100">
                {activeProvision.originalText}
              </blockquote>
            </div>

            {/* Provenance Metadata & Formal Extraction Summary */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* Left: Document Provenance */}
              <div className="rounded-lg border border-slate-800/80 bg-navy-900/60 p-3.5 text-xs space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-cyan-400" />
                  Document Provenance &amp; Authenticity
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Source Language</span>
                    <span className="font-medium text-slate-200">{activeProvision.language}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Version Date</span>
                    <span className="font-mono text-slate-200">{activeProvision.versionDate}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] uppercase text-slate-400">
                      Direct Statutory URL
                    </span>
                    <a
                      href={activeProvision.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 break-all"
                    >
                      {activeProvision.sourceUrl}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Right: GAM Pre-Flight Summary Counts */}
              <div className="rounded-lg border border-slate-800/80 bg-navy-900/60 p-3.5 text-xs space-y-2.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-cyan-400" />
                  GAM Formalization Scope (Φ_L Preview)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border border-slate-800 bg-navy-950/80 p-2 text-center">
                    <span className="block font-mono text-base font-bold text-cyan-300">
                      {clauseCount}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      Clauses
                    </span>
                  </div>
                  <div className="rounded border border-slate-800 bg-navy-950/80 p-2 text-center">
                    <span className="block font-mono text-base font-bold text-emerald-300">
                      {conceptCount}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      Legal Concepts
                    </span>
                  </div>
                  <div className="rounded border border-slate-800 bg-navy-950/80 p-2 text-center">
                    <span className="block font-mono text-base font-bold text-indigo-300">
                      {entityCount}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      GAL Entities
                    </span>
                  </div>
                </div>

                {/* Deontic Modality Balance Breakdown */}
                <div
                  data-testid="deontic-modality-breakdown"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800/90 bg-navy-950/70 px-2.5 py-1.5"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Deontic Balance
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-cyan-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Obligatory: <strong>{obligatoryCount}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Permitted: <strong>{permittedCount}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-rose-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Prohibited: <strong>{prohibitedCount}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-0.5 text-[11px] text-slate-400">
                  <span>
                    Relations: <strong className="text-slate-200">{relationCount}</strong> •
                    Deontic Policies: <strong className="text-slate-200">{policyCount}</strong>
                  </span>
                  {unmappedCount > 0 && (
                    <span className="text-amber-300">
                      {unmappedCount} non-operational clause{unmappedCount > 1 ? 's' : ''} flagged
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer: Mode Selector + Process Law Button */}
      <div className="border-t border-slate-800/90 bg-navy-950/90 px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Translation Engine Mode Toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Translation Pipeline Mode
            </span>
            <div
              role="group"
              aria-label="Translation Pipeline Mode"
              className="inline-flex rounded-xl border border-slate-800 bg-navy-900 p-1"
            >
              <button
                type="button"
                data-testid="mode-select-curated"
                onClick={() => setProcessingMode('curated')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  processingMode === 'curated'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Curated Human-Reviewed GAM
              </button>
              <button
                type="button"
                data-testid="mode-select-live-pipeline"
                onClick={() => setProcessingMode('live-pipeline')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  processingMode === 'live-pipeline'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                Live <span className="font-mono">readLawToGAM</span> Heuristic
              </button>
            </div>
          </div>

          {/* Primary & Secondary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {processingMode === 'curated' ? (
              <button
                type="button"
                data-testid="process-law-live-button"
                onClick={() => onProcessLaw('live-pipeline')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-2.5 text-xs font-medium text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-900/40"
                title="Run the deterministic readLawToGAM lexical extractor directly on the raw statutory text"
              >
                <Cpu className="h-4 w-4" />
                Compare Live Extractor
              </button>
            ) : (
              <button
                type="button"
                data-testid="process-law-curated-button"
                onClick={() => onProcessLaw('curated')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2.5 text-xs font-medium text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-900/40"
                title="Run with the human-reviewed authoritative GAM translation"
              >
                <ShieldCheck className="h-4 w-4" />
                Run Reviewed Model
              </button>
            )}

            <button
              type="button"
              data-testid="process-law-button"
              onClick={() => onProcessLaw(processingMode)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-navy-950"
            >
              <Play className="h-4 w-4 fill-current" />
              Process Law → GAL
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LawSelectorPanel;
