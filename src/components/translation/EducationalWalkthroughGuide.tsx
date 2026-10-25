import React, { useId, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, ChevronDown, HelpCircle, X } from 'lucide-react';
import type { GalPolicy, LawProvision, PipelineStageId } from '../../types/contracts';

export interface EducationalWalkthroughGuideProps {
  /** Current pipeline stage; drives the highlighted formal question. */
  stage: PipelineStageId;
  /** Optional current provision; enables law-specific Q&A cards. */
  provision?: LawProvision | null;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface StageGuide {
  title: string;
  question: string;
  answer: string;
}

const STAGE_ORDER: PipelineStageId[] = [
  'source',
  'segment',
  'extract',
  'entity',
  'relation',
  'gal',
  'validate',
];

const STAGE_GUIDES: Record<PipelineStageId, StageGuide> = {
  source: {
    title: '1 · Source text',
    question: 'Which authoritative text, in which version and jurisdiction, is being translated?',
    answer:
      'Everything downstream is only as good as this text. The translation Φ_L is of this version of this provision; a different amendment date can give a different Φ_L.',
  },
  segment: {
    title: '2 · Clause segmentation',
    question: 'Which phrases are normative, and is each one a permission (Allow) or a prohibition (Deny)?',
    answer:
      'Cue words ("must", "may", "shall not", "unless") mark a clause as obligation, permission or prohibition. Prohibition clauses become Deny policies; clauses with no GAM reading are shown as unmapped, not silently dropped.',
  },
  extract: {
    title: '3 · Concept extraction',
    question: 'Which noun phrase is a Process, Activity, Role or User, and why?',
    answer:
      'A Role is a standing position ("controller"), a User is a concrete principal, an Activity is something done ("disclose data"), a Process is a bounded workflow containing activities. A token that fits no sort is listed as unmapped with the reason.',
  },
  entity: {
    title: '4 · GAM entities',
    question: 'Does every entity have exactly one sort (P, A, R or U) and one identifier shared with the enterprise model?',
    answer:
      'The sort decides which edges are legal. The law and enterprise models must use the same identifiers, otherwise Con compares disjoint vocabularies and passes vacuously.',
  },
  relation: {
    title: '5 · Relations and policies',
    question: 'Which directed edge family does this clause become, and does the arrow point the right way?',
    answer:
      'Structure (PP, PA, RR, S, X) describes how things are organised. Policies (RA±, RU±, UP±, RP±, D±) say who may or may not do what. Direction is fixed by the sorts: CanAssignTo points Activity → Role.',
  },
  gal: {
    title: '6 · GAL model',
    question: 'What is the machine-readable Φ_L that the checker will read?',
    answer:
      'GAL JSON is the law model Φ_L only. It is a translation of the statute, not a statement about any organization.',
  },
  validate: {
    title: '7 · Formal validation',
    question: 'Is Φ_L internally consistent, and what has not been checked?',
    answer:
      'Checks here concern the law translation. An organizational verdict needs an enterprise model Φ_E and Con(⋀Φ_E ∧ ⋀Φ_L). Even then, a pass means "no violation found", never "compliant".',
  },
};

const SORT_CARDS: Array<{ sort: string; letter: string; test: string; example: string }> = [
  { sort: 'Process', letter: 'P', test: 'A bounded workflow or zone that contains activities.', example: '"processing of personal information"' },
  { sort: 'Activity', letter: 'A', test: 'Something that is done; the verb, nominalised.', example: '"disclose", "collect"' },
  { sort: 'Role', letter: 'R', test: 'A standing position or duty-holder, not a person.', example: '"controller", "Privacy Officer"' },
  { sort: 'User', letter: 'U', test: 'A concrete principal that can occupy roles.', example: '"Alice", "AdminAssistant1"' },
];

const FAMILY_CARDS: Array<{ family: string; edge: string; direction: string; reads: string }> = [
  { family: 'RA±', edge: 'CanAssignTo', direction: 'Activity → Role', reads: 'This activity may (Allow) / may not (Deny) be assigned to this role.' },
  { family: 'RA⁺', edge: 'AssignedTo', direction: 'Role → Activity', reads: 'This role is actually assigned this activity (a fact, not a permission).' },
  { family: 'RU±', edge: 'CanAct', direction: 'User → Role', reads: 'This user may / may not occupy this role.' },
  { family: 'UP±', edge: 'CanAssume', direction: 'User → Process', reads: 'This user may / may not enter this process.' },
  { family: 'RP±', edge: 'CanReach', direction: 'Role → Process', reads: 'This role may / may not reach this process.' },
  { family: 'D±', edge: 'CanDelegate', direction: 'from Role → to Role', reads: 'The first role may / may not delegate to the second.' },
];

const PITFALLS: Array<{ id: string; title: string; wrong: string; right: string }> = [
  {
    id: 'disjoint-vocabulary',
    title: '1. Disjoint vocabulary (the 1.x bug)',
    wrong:
      'Law entities are named "law:Controller" and organization entities "enterprise:Controller". Con sees two unrelated roles, finds no conflict, and reports a clean pass.',
    right:
      'Use one shared identifier for the same real-world role or activity in both models. A clean result across disjoint vocabularies proves nothing.',
  },
  {
    id: 'reversed-edge',
    title: '2. Reversed policy edge direction',
    wrong:
      'Writing CanAssignTo as Role → Activity because AssignedTo reads that way. The arrow now points the wrong way and the checker attaches the rule to the wrong entities.',
    right:
      'CanAssignTo: Activity → Role. AssignedTo: Role → Activity. Check the sort badge on each end of the arrow before trusting the edge.',
  },
  {
    id: 'deny-vs-silence',
    title: '3. Treating Deny as absence of Allow',
    wrong:
      'Assuming "no Allow edge" and "a Deny edge" mean the same. Silence only means the law did not say; it can be filled by another rule.',
    right:
      'Deny ∈ RA⁻ is an explicit prohibition and wins over an inherited Allow, which is how conflicts are found. Show Deny as its own mark, never as a missing edge.',
  },
  {
    id: 'con-vs-compliance',
    title: '4. Mistaking a passing Con for full compliance',
    wrong:
      'Con passes, so the organization is "compliant", even though the ontology check reports a gap (an Activity the Process cannot reach).',
    right:
      'Con only looks for conflicts among the rules it was given. Ontology gaps, scenario violations and untranslated clauses are separate findings. The strongest honest wording is "no violations found; completeness not validated".',
  },
];

function provisionQa(provision: LawProvision): Array<{ q: string; a: string }> {
  const model = provision.curatedGalModel;
  const policies: GalPolicy[] = model.policies ?? [];
  const allow = policies.filter((p) => p.modality === 'Allow').length;
  const deny = policies.filter((p) => p.modality === 'Deny').length;
  const first = policies[0];
  const name = (id: string) => model.entities.find((e) => e.id === id)?.name ?? id;
  const cards = [
    {
      q: `Why does §${provision.section} produce ${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}?`,
      a: `${allow} Allow and ${deny} Deny. Each normative clause that grants or forbids something becomes one signed edge; descriptive text and definitions become entities or structure instead.`,
    },
    {
      q: 'Is this the organization’s compliance result?',
      a: 'No. This is Φ_L, the translation of the law. Compliance would require an enterprise model Φ_E and the check Con(⋀Φ_E ∧ ⋀Φ_L), and even a pass is not proof of compliance.',
    },
  ];
  if (first) {
    cards.splice(1, 0, {
      q: `Why is "${name(first.source)} → ${name(first.target)}" drawn in this direction?`,
      a: `It is a ${first.type} edge with polarity ${first.modality}. ${first.type === 'CanAssignTo' ? 'CanAssignTo always points Activity → Role.' : 'The direction follows the sorts of the two ends for this family.'}`,
    });
  }
  if (provision.unmappedClauses?.length) {
    cards.push({
      q: `Why are ${provision.unmappedClauses.length} clause(s) left unmapped?`,
      a: 'They have no reading in the GAM tuple Φ. They are listed rather than guessed, so a gap in Φ_L is visible instead of looking like coverage.',
    });
  }
  return cards;
}

export default function EducationalWalkthroughGuide({
  stage,
  provision = null,
  defaultOpen = false,
  onOpenChange,
}: EducationalWalkthroughGuideProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const panelId = useId();

  const qa = useMemo(() => (provision ? provisionQa(provision) : []), [provision]);
  const current = STAGE_GUIDES[stage];

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const card = (id: string, q: string, a: string) => {
    const expanded = openCard === id;
    return (
      <div key={id} className="rounded-md border border-slate-700 bg-slate-900/70">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setOpenCard(expanded ? null : id)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-100 hover:bg-slate-800"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
            {q}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {expanded && <p className="px-3 pb-3 text-xs leading-relaxed text-slate-300">{a}</p>}
      </div>
    );
  };

  return (
    <aside data-testid="educational-walkthrough-guide" aria-label="How GAM works">
      <button
        type="button"
        data-testid="educational-guide-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => toggle(!open)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-cyan-500/60 bg-slate-900 px-4 py-2 text-xs font-semibold text-cyan-200 shadow-lg hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        {open ? 'Hide GAM guide' : 'How GAM works'}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="How GAM Works: Step-by-Step Pedagogical Guide and Formal Pitfalls"
          className="fixed bottom-16 right-4 top-16 z-40 flex w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-700 bg-[#0a1020] text-slate-200 shadow-2xl"
          onKeyDown={(e) => {
            if (e.key === 'Escape') toggle(false);
          }}
        >
          <header className="flex items-start justify-between gap-2 border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-cyan-300">
                How GAM Works: Step-by-Step Pedagogical Guide &amp; Formal Pitfalls
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
              </p>
            </div>
            <button
              type="button"
              aria-label="Close guide"
              onClick={() => toggle(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="space-y-5 overflow-y-auto px-4 py-3">
            <section data-testid="guide-current-stage" aria-label="Current stage question">
              <ol className="mb-2 flex gap-1" aria-label="Pipeline progress">
                {STAGE_ORDER.map((s) => (
                  <li
                    key={s}
                    aria-current={s === stage ? 'step' : undefined}
                    title={STAGE_GUIDES[s].title}
                    className={`h-1.5 flex-1 rounded-full ${s === stage ? 'bg-cyan-400' : 'bg-slate-700'}`}
                  />
                ))}
              </ol>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                {current.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-50">{current.question}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{current.answer}</p>
            </section>

            <section
              data-testid="guide-translation-vs-verdict"
              className="rounded-md border border-amber-500/50 bg-amber-950/30 p-3 text-xs leading-relaxed"
            >
              <h3 className="mb-1 font-bold text-amber-300">Translation is not a verdict</h3>
              <p>
                <code className="text-cyan-300">Φ_L</code> is the law, translated. It says what the statute permits and
                forbids.
              </p>
              <p className="mt-1">
                <code className="text-cyan-300">Con(⋀Φ_E ∧ ⋀Φ_L)</code> asks whether an organization’s rules Φ_E contradict
                Φ_L. It is a different question, needs a different model, and never answers “is this organization compliant?”.
              </p>
            </section>

            <section aria-label="Why a clause becomes a sort" data-testid="guide-sorts">
              <h3 className="mb-1 text-xs font-bold text-slate-100">Why a phrase becomes P, A, R or U</h3>
              <ul className="space-y-1">
                {SORT_CARDS.map((s) => (
                  <li key={s.sort} className="rounded border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-xs">
                    <span className="font-mono font-bold text-sky-300">{s.letter}</span>{' '}
                    <span className="font-semibold">{s.sort}</span>: {s.test}{' '}
                    <span className="text-slate-400">e.g. {s.example}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Edge families and direction" data-testid="guide-edge-directions">
              <h3 className="mb-1 text-xs font-bold text-slate-100">Which arrow, pointing where, and what Deny means</h3>
              <ul className="space-y-1">
                {FAMILY_CARDS.map((f) => (
                  <li key={f.edge} className="rounded border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-xs">
                    <span className="font-mono font-bold text-amber-300">{f.family}</span>{' '}
                    <span className="font-mono">{f.edge}</span>{' '}
                    <span className="font-mono text-sky-300">{f.direction}</span>
                    <br />
                    <span className="text-slate-300">{f.reads}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                <span className="font-semibold text-red-300">Deny ∈ RA⁻</span> is a statement the law makes.{' '}
                <span className="font-semibold text-slate-100">Silence</span> is the absence of a statement. They are not
                interchangeable.
              </p>
            </section>

            <section aria-label="Common formal pitfalls" data-testid="guide-pitfalls">
              <h3 className="mb-1 flex items-center gap-1 text-xs font-bold text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Common legal-engineering pitfalls
              </h3>
              <div className="space-y-2">
                {PITFALLS.map((p) => (
                  <div key={p.id} data-testid={`guide-pitfall-${p.id}`} className="rounded-md border border-red-500/30 bg-red-950/20 p-2 text-xs">
                    <p className="font-semibold text-red-200">{p.title}</p>
                    <p className="mt-1 text-slate-300">
                      <span className="font-semibold text-red-300">Wrong: </span>
                      {p.wrong}
                    </p>
                    <p className="mt-1 text-slate-300">
                      <span className="font-semibold text-emerald-300">Right: </span>
                      {p.right}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="Questions about this law" data-testid="guide-qa-cards">
              <h3 className="mb-1 text-xs font-bold text-slate-100">Questions about this translation</h3>
              <div className="space-y-1.5">
                {STAGE_ORDER.map((s) => card(`stage-${s}`, STAGE_GUIDES[s].question, STAGE_GUIDES[s].answer))}
                {qa.map((c, i) => card(`law-${i}`, c.q, c.a))}
                {!provision && (
                  <p className="text-[11px] text-slate-400">Select a law provision to see questions about its translation.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </aside>
  );
}
