import React from 'react';
import {
  X,
  Sigma,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  GitMerge,
  Layers,
  Split,
  Scale,
} from 'lucide-react';

export interface FormalTupleLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUPLE_COMPONENTS = [
  {
    symbol: 'P, A, R, U',
    name: 'Four Core Sorts',
    galJson: 'entities[].type',
    description:
      'Process (trust zone), Activity (capability/action), Role (organizational identity), User (principal).',
  },
  {
    symbol: 'PP',
    name: 'Process Composition',
    galJson: 'ComposedOf (parent → child)',
    description:
      'Hierarchical nesting of processes. Entering an outer process reaches nested child processes under PP*.',
  },
  {
    symbol: 'PA',
    name: 'Process Containment',
    galJson: 'Contains (Process → Activity)',
    description:
      'Binds an Activity inside a Process boundary. Required duties are checked via OntologyChecker over PP* ∘ PA.',
  },
  {
    symbol: 'RR',
    name: 'Role Inclusion',
    galJson: 'Includes (senior → junior)',
    description:
      'Role inheritance hierarchy. Senior role inherits all positive permissions of junior roles across RR*.',
  },
  {
    symbol: 'S',
    name: 'Activity Succession',
    galJson: 'Next (Activity → Activity)',
    description:
      'Temporal/workflow ordering between activities. Evaluated over transitive precedence Next+ by ScenarioChecker.',
  },
  {
    symbol: 'X',
    name: 'Separation of Concerns',
    galJson: 'Separate (Process ↔ Process)',
    description:
      'Symmetric mutual exclusion between two processes. No single principal may effectively reach both sides.',
  },
  {
    symbol: 'RA±',
    name: 'Role–Activity Assignment',
    galJson: 'AssignedTo (+) / CanAssignTo (±)',
    description:
      'Permitted (RA+) vs. Prohibited (RA−) activity assignments for a role. Evaluated over closure RA* ∩ RA− = ∅.',
  },
  {
    symbol: 'RU±',
    name: 'Role Occupancy',
    galJson: 'Acts (+) / CanAct (±)',
    description:
      'Permitted (RU+) vs. Prohibited (RU−) user occupancy in roles. Checked via RU+ ∩ RU− = ∅.',
  },
  {
    symbol: 'UP±',
    name: 'User–Process Access',
    galJson: 'Assumes (+) / CanAssume (±)',
    description:
      'Permitted (UP+) vs. Prohibited (UP−) user entry into processes. Checked over closure UP* ∩ UP− = ∅.',
  },
  {
    symbol: 'RP±',
    name: 'Role–Process Reachability',
    galJson: 'Reaches (+) / CanReach (±)',
    description:
      'Permitted (RP+) vs. Prohibited (RP−) role reachability into a process trust zone.',
  },
  {
    symbol: 'D±',
    name: 'Delegation Authority',
    galJson: 'CanDelegate (±)',
    description:
      'Role-to-role delegation of an activity, process, or unrestricted (⊤). Cannot launder a prohibition.',
  },
];

export const FormalTupleLegendModal: React.FC<FormalTupleLegendModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="formal-tuple-modal-title"
      data-testid="formal-tuple-legend-modal"
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-navy-900 border border-cyan-500/30 shadow-2xl text-slate-100">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-navy-900/95 backdrop-blur border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center">
              <Sigma className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2
                id="formal-tuple-modal-title"
                className="text-lg font-bold text-white tracking-tight"
              >
                GAM Formalism Reference &amp; Canonical Semantics
              </h2>
              <p className="text-xs text-slate-400">
                W. A. Hassan, <em>Validating Legal Compliance — Governance Analysis Method</em> (Ph.D., University of Ottawa, 2009) &amp; GAM 2.0 Corrections
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="close-formal-legend-button"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Formalism Reference Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Canonical Mathematical Tuple Banner */}
          <div className="p-4 rounded-xl bg-navy-950 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                14-Component Governance Analysis Model Tuple
              </div>
              <div className="font-mono text-sm sm:text-base text-slate-100">
                Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
              </div>
            </div>
            <div className="text-xs text-slate-300 bg-navy-800/90 px-3 py-2 rounded-lg border border-slate-700 font-mono">
              Con(Φ) ⇔ (RA* ∩ RA⁻ = ∅) ∧ (RU⁺ ∩ RU⁻ = ∅) ∧ (UP* ∩ UP⁻ = ∅) ∧ Sep(X) ∧ Sound(D±)
            </div>
          </div>

          {/* Section 1: The Three Non-Negotiable GAM Principles */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>1. Three Non-Negotiable Principles of GAM 2.0</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-navy-800/60 border border-slate-700/80">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm mb-1.5">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>1. One Shared Vocabulary</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Statutory norms (<span className="font-mono text-cyan-300">Φ_L</span>) and enterprise configurations (<span className="font-mono text-emerald-300">Φ_E</span>) inhabit the <strong>exact same entity and relation namespace</strong>. Provenance (<code className="text-slate-200">law</code> / <code className="text-slate-200">enterprise</code> / <code className="text-slate-200">both</code>) is tracked for audit reporting, never by prefixing identifiers. Disjoint namespaces are trivially satisfiable and mask cross-model violations.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-navy-800/60 border border-slate-700/80">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm mb-1.5">
                  <Split className="w-4 h-4 shrink-0" />
                  <span>2. Explicit Polarity Split (±)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every policy relation partitions into an explicit permitted set (<span className="font-mono text-emerald-400">+</span>) and prohibited set (<span className="font-mono text-rose-400">−</span>): <span className="font-mono">RA±, RU±, UP±, RP±, D±</span>. A legal prohibition (<code className="text-rose-300">Deny</code>) is an positive negative fact in <span className="font-mono">RA⁻</span>, fundamentally distinct from the absence of permission (silence).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-navy-800/60 border border-slate-700/80">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm mb-1.5">
                  <GitMerge className="w-4 h-4 shrink-0" />
                  <span>3. Closure Evaluation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Compliance conflicts are computed over <strong>effective access</strong>—the transitive closure of role inheritance (<span className="font-mono">RR*</span>), process nesting (<span className="font-mono">PP*</span>), and delegation (<span className="font-mono">D+</span>)—never by comparing flat declared edges alone.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Canonical Edge Directions (Avoiding Silent Reversal Pitfalls) */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm mb-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>2. Canonical Edge Directions: Structural Relations vs. Deontic Policies</span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              In GAL-JSON, positive structural relations (<code className="text-cyan-300">relations[]</code>) and polarized policies (<code className="text-emerald-300">policies[]</code>) intentionally use distinct source/target argument orders matching <code className="text-slate-200">src/core/model.js</code>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-navy-950/90 border border-slate-800">
                <div className="text-cyan-400 font-sans font-semibold mb-1.5">
                  Positive Structural Relations (relations[])
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300">AssignedTo (RA+)</span>
                    <span>Role <ArrowRight className="inline w-3 h-3 text-slate-500" /> Activity</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300">Acts (RU+)</span>
                    <span>Role <ArrowRight className="inline w-3 h-3 text-slate-500" /> User</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300">Includes (RR)</span>
                    <span>Senior Role <ArrowRight className="inline w-3 h-3 text-slate-500" /> Junior Role</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300">ComposedOf (PP)</span>
                    <span>Parent Process <ArrowRight className="inline w-3 h-3 text-slate-500" /> Child Process</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-navy-950/90 border border-slate-800">
                <div className="text-amber-300 font-sans font-semibold mb-1.5">
                  Polarized Deontic Policies (policies[] • Allow / Deny)
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300">CanAssignTo (RA±)</span>
                    <span><strong>Activity</strong> <ArrowRight className="inline w-3 h-3 text-amber-400" /> <strong>Role</strong></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300">CanAct (RU±)</span>
                    <span><strong>User</strong> <ArrowRight className="inline w-3 h-3 text-amber-400" /> <strong>Role</strong></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">CanAssume (UP±)</span>
                    <span>User <ArrowRight className="inline w-3 h-3 text-slate-500" /> Process</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">CanReach (RP±)</span>
                    <span>Role <ArrowRight className="inline w-3 h-3 text-slate-500" /> Process</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Formal Distinction: Law Model (Φ_L) vs. Enterprise Closure (Φ_L ∧ Φ_E) */}
          <div className="p-4 rounded-xl bg-navy-800/50 border border-cyan-500/25">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm mb-2">
              <Scale className="w-4 h-4 shrink-0" />
              <span>3. Statutory Translation (Φ_L) vs. Enterprise Compliance Validation (Φ_L ∧ Φ_E)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Translating a statute into GAL-JSON produces the <strong>Law Model (<span className="font-mono text-cyan-300">Φ_L</span>)</strong> and verifies its internal structural well-formedness, typing, and modality self-consistency. However, <strong>a law model alone does not establish organizational compliance</strong>. Full GAM validation merges <span className="font-mono text-cyan-300">Φ_L</span> with an organization&apos;s operational configuration (<span className="font-mono text-emerald-300">Φ_E</span>) and evaluates three complementary checks:
              <span className="block mt-1.5 font-mono text-[11px] text-slate-200">
                1. ConsistencyChecker (Con over closures) • 2. OntologyChecker (required duties under PP* ∘ PA) • 3. ScenarioChecker (Next+ precedence)
              </span>
              Note: <em>Consistency is necessary, but not sufficient, for compliance</em>—an omitted mandatory safeguard causes no logical contradiction in <code className="text-cyan-300">Con</code> and is caught specifically by <code className="text-emerald-300">OntologyChecker</code>.
            </p>
          </div>

          {/* Section 4: Complete Tuple Reference Table */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
              4. Complete Symbol &amp; GAL-JSON Mapping Table
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-navy-950 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 font-semibold">Symbol</th>
                    <th className="py-2.5 px-3 font-semibold">Formal Component</th>
                    <th className="py-2.5 px-3 font-semibold">GAL-JSON Operator</th>
                    <th className="py-2.5 px-3 font-semibold">Governance Semantics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 bg-navy-900/60">
                  {TUPLE_COMPONENTS.map((item) => (
                    <tr key={item.symbol} className="hover:bg-navy-800/40">
                      <td className="py-2 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                        {item.symbol}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-200 whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-300 whitespace-nowrap">
                        {item.galJson}
                      </td>
                      <td className="py-2 px-3 text-slate-300">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-3 bg-navy-950/95 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Engine alignment: <code className="text-cyan-300">src/engine/gamCore.ts</code> &amp;{' '}
            <code className="text-cyan-300">alloy/gam_core.als</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-medium transition-colors"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormalTupleLegendModal;
