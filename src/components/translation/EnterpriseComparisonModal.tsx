import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  GitMerge,
  Layers,
  FileCode2,
  ArrowRight,
  Sparkles,
  Scale,
  BookOpen,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { ConsistencyChecker } from '../../engine/gam-core/consistency-checker.js';
import { OntologyChecker } from '../../engine/gam-core/ontology-checker.js';
import { emitAlloy } from '../../engine/gam-core/alloy-emitter.js';
import type {
  EnterpriseComparisonCase,
  GalJsonModel,
} from '../../types/contracts.ts';

export interface EnterpriseComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: EnterpriseComparisonCase[];
}

interface ConsistencyViolation {
  type: string;
  severity: string;
  message: string;
  user?: string;
  activity?: string;
  process?: string;
  process1?: string;
  process2?: string;
  role?: string;
  grantedVia?: string[];
  prohibitedVia?: string[];
  reachedVia?: Record<string, string[]>;
  separationOrigin?: string;
}

interface OntologyViolation {
  type: string;
  severity: string;
  requirement: string;
  message: string;
  process?: string;
  activity?: string;
  from?: string;
  to?: string;
  rationale?: string;
}

interface PrincipalClosureSummary {
  user: string;
  directRoles: string[];
  inheritedRoles: string[];
  effectiveActivities: string[];
  forbiddenActivities: string[];
  effectiveProcesses: string[];
  forbiddenProcesses: string[];
}

interface ProcessClosureSummary {
  process: string;
  subProcesses: string[];
  activities: string[];
}

const FALLBACK_THESIS_CASES: EnterpriseComparisonCase[] = [
  {
    id: 'thesis-ch7-ex2',
    title: 'Thesis Ch.7 Ex.2 Access Right Interaction',
    thesisReference: 'Hassan (2009) Ch. 7 Example 2 — Cross-Role Effective Access Conflict',
    description:
      'Law Φ_L forbids role PrivDiv from performing AccessPI. Enterprise Φ_E grants AccessPI to FinAdminAssistants (inherited via FinDiv). Principal AdminAssistant1 acts in both PrivDiv and FinAdminAssistants.',
    lawModel: {
      model_type: 'Law_Model',
      context: 'PIPEDA / Privacy Division Access Prohibition (Ch.7 Ex.2)',
      jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' },
      effective_date: '2009-01-01',
      domains: ['Privacy'],
      entities: [
        { id: 'AccessPI', type: 'Activity', sort: 'Activity', name: 'Access Personal Information' },
        { id: 'PrivDiv', type: 'Role', sort: 'Role', name: 'Privacy Division Role' },
      ],
      relations: [],
      policies: [
        {
          type: 'CanAssignTo',
          modality: 'Deny',
          allow_deny: 'Deny',
          source: 'AccessPI',
          target: 'PrivDiv',
          rationale: 'Statutory privacy wall: PrivDiv is prohibited from accessing operational PI.',
        },
      ],
    },
    asBuiltEnterpriseModel: {
      model_type: 'Enterprise_Model',
      context: 'As-Built Enterprise Configuration (Dual Role Occupancy)',
      jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' },
      effective_date: '2009-01-01',
      domains: ['Privacy'],
      entities: [
        { id: 'AccessPI', type: 'Activity', sort: 'Activity' },
        { id: 'PrivDiv', type: 'Role', sort: 'Role' },
        { id: 'FinDiv', type: 'Role', sort: 'Role' },
        { id: 'FinAdminAssistants', type: 'Role', sort: 'Role' },
        { id: 'AdminAssistant1', type: 'User', sort: 'User' },
      ],
      relations: [
        { type: 'Includes', source: 'FinDiv', target: 'FinAdminAssistants' },
        { type: 'AssignedTo', source: 'FinAdminAssistants', target: 'AccessPI' },
        { type: 'Acts', source: 'PrivDiv', target: 'AdminAssistant1' },
        { type: 'Acts', source: 'FinAdminAssistants', target: 'AdminAssistant1' },
      ],
      policies: [],
    },
    remediatedEnterpriseModel: {
      model_type: 'Enterprise_Model',
      context: 'Remediated Enterprise Configuration (Role Assignment Separated)',
      jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' },
      effective_date: '2009-01-01',
      domains: ['Privacy'],
      entities: [
        { id: 'AccessPI', type: 'Activity', sort: 'Activity' },
        { id: 'PrivDiv', type: 'Role', sort: 'Role' },
        { id: 'FinDiv', type: 'Role', sort: 'Role' },
        { id: 'FinAdminAssistants', type: 'Role', sort: 'Role' },
        { id: 'AdminAssistant1', type: 'User', sort: 'User' },
        { id: 'PrivacyOfficer1', type: 'User', sort: 'User' },
      ],
      relations: [
        { type: 'Includes', source: 'FinDiv', target: 'FinAdminAssistants' },
        { type: 'AssignedTo', source: 'FinAdminAssistants', target: 'AccessPI' },
        { type: 'Acts', source: 'PrivDiv', target: 'PrivacyOfficer1' },
        { type: 'Acts', source: 'FinAdminAssistants', target: 'AdminAssistant1' },
      ],
      policies: [],
    },
    explanation:
      'No single role holds both a declared permit and a declared denial for AccessPI. A naive per-relation diff reports 0 conflicts. GAM computes the closure over shared vocabulary and derives AccessPI ∈ effAct(AdminAssistant1) ∩ effForbiddenAct(AdminAssistant1).',
    sufficiencyNote:
      'Demonstrates why closure evaluation over shared vocabulary (RA* ∩ RA⁻) is required to detect cross-role policy interactions.',
  },
  {
    id: 'thesis-ch7-ex1b',
    title: 'Thesis Ch.7 Ex.1(b) Stale Identity / Consistent Yet Non-Compliant',
    thesisReference: 'Hassan (2009) Ch. 7 Ex. 1(b) & Appendix B2 — Missing Mandatory Activity',
    description:
      'Law Φ_L mandates that the Privacy process contain activity ProvideCPOIdentity (PIPEDA Principle 4.1.2). As-built enterprise Φ_E has no contradictions, yet omits ProvideCPOIdentity from its Privacy process.',
    lawModel: {
      model_type: 'Law_Model',
      context: 'PIPEDA Principle 4.1.2 Accountability Duty (Ch.7 Ex.1b)',
      jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' },
      effective_date: '2009-01-01',
      domains: ['Privacy'],
      entities: [
        { id: 'Privacy', type: 'Process', sort: 'Process', name: 'Privacy Governance Zone' },
        { id: 'ProvideCPOIdentity', type: 'Activity', sort: 'Activity', name: 'Provide CPO Identity on Request' },
        { id: 'CPO', type: 'Role', sort: 'Role', name: 'Chief Privacy Officer' },
      ],
      relations: [],
      policies: [],
      ontologyRequirements: [
        {
          id: 'PIPEDA-4.1.2',
          process: 'Privacy',
          activity: 'ProvideCPOIdentity',
          rationale:
            'PIPEDA Schedule 1 Principle 4.1.2 requires the identity of the individual designated to oversee compliance to be made known upon request.',
        },
      ],
    },
    asBuiltEnterpriseModel: {
      model_type: 'Enterprise_Model',
      context: 'As-Built Enterprise Configuration (Consistent Yet Non-Compliant)',
      jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' },
      effective_date: '2009-01-01',
      domains: ['Privacy'],
      entities: [
        { id: 'Privacy', type: 'Process', sort: 'Process' },
        { id: 'LogPrivacyRequest', type: 'Activity', sort: 'Activity' },
        { id: 'CPO', type: 'Role', sort: 'Role' },
        { id: 'AliceCPO', type: 'User', sort: 'User' },
      ],
      relations: [
        { type: 'Contains', source: 'Privacy', target: 'LogPrivacyRequest' },
        { type: 'AssignedTo', source: 'CPO', target: 'LogPrivacyRequest' },
        { type: 'Acts', source: 'CPO', target: 'AliceCPO' },
      ],
      policies: [],
    },
    remediatedEnterpriseModel: {
      model_type: 'Enterprise_Model',
      context: 'Remediated Enterprise Configuration (Ontology Duty Fulfilled)',
      jurisdiction: { country: 'CA', level: 'Federal', name: 'Canada' },
      effective_date: '2009-01-01',
      domains: ['Privacy'],
      entities: [
        { id: 'Privacy', type: 'Process', sort: 'Process' },
        { id: 'LogPrivacyRequest', type: 'Activity', sort: 'Activity' },
        { id: 'ProvideCPOIdentity', type: 'Activity', sort: 'Activity' },
        { id: 'CPO', type: 'Role', sort: 'Role' },
        { id: 'AliceCPO', type: 'User', sort: 'User' },
      ],
      relations: [
        { type: 'Contains', source: 'Privacy', target: 'LogPrivacyRequest' },
        { type: 'Contains', source: 'Privacy', target: 'ProvideCPOIdentity' },
        { type: 'AssignedTo', source: 'CPO', target: 'ProvideCPOIdentity' },
        { type: 'Acts', source: 'CPO', target: 'AliceCPO' },
      ],
      policies: [],
    },
    explanation:
      'An absent mandatory activity contradicts nothing: ConsistencyChecker reports Con = TRUE (0 contradictions). Only OntologyChecker detects ONTOLOGY_GAP because ProvideCPOIdentity ∉ act(Privacy).',
    sufficiencyNote:
      'Consistency is necessary, not sufficient, for compliance. Passing Con alone never proves compliance when structural ontology requirements are unmet.',
  },
  {
    id: 'thesis-ch8-sox',
    title: 'Thesis Ch.8 SOX Segregation of Duties',
    thesisReference: 'Hassan (2009) Ch. 8 — COSO Segregation of Duties under SOX §404 ICFR',
    description:
      'Under COSO internal control practices applied for SOX §404 ICFR assessment, PurchaseOrderApproval and PaymentDisbursement are held in symmetric Separation of Concerns (X). In Φ_E, SeniorController inherits sub-roles that reach both separated processes.',
    lawModel: {
      model_type: 'Law_Model',
      context: 'SOX §404 ICFR / COSO Segregation of Duties Control (Ch.8)',
      jurisdiction: { country: 'US', level: 'Federal', name: 'United States' },
      effective_date: '2009-01-01',
      domains: ['Financial'],
      entities: [
        { id: 'PurchaseOrderZone', type: 'Process', sort: 'Process', name: 'Purchase Order Authorization Zone' },
        { id: 'PaymentDisbursementZone', type: 'Process', sort: 'Process', name: 'Payment Disbursement Zone' },
      ],
      relations: [
        {
          type: 'Separate',
          source: 'PurchaseOrderZone',
          target: 'PaymentDisbursementZone',
          rationale: 'Symmetric separation of concerns (X): no principal may effectively reach both zones.',
        },
      ],
      policies: [],
    },
    asBuiltEnterpriseModel: {
      model_type: 'Enterprise_Model',
      context: 'As-Built Enterprise Configuration (Role Hierarchy Bridges X)',
      jurisdiction: { country: 'US', level: 'Federal', name: 'United States' },
      effective_date: '2009-01-01',
      domains: ['Financial'],
      entities: [
        { id: 'PurchaseOrderZone', type: 'Process', sort: 'Process' },
        { id: 'PaymentDisbursementZone', type: 'Process', sort: 'Process' },
        { id: 'SeniorController', type: 'Role', sort: 'Role' },
        { id: 'ProcurementLead', type: 'Role', sort: 'Role' },
        { id: 'TreasuryDisburser', type: 'Role', sort: 'Role' },
        { id: 'ControllerBob', type: 'User', sort: 'User' },
      ],
      relations: [
        { type: 'Includes', source: 'SeniorController', target: 'ProcurementLead' },
        { type: 'Includes', source: 'SeniorController', target: 'TreasuryDisburser' },
        { type: 'Reaches', source: 'ProcurementLead', target: 'PurchaseOrderZone' },
        { type: 'Reaches', source: 'TreasuryDisburser', target: 'PaymentDisbursementZone' },
        { type: 'Acts', source: 'SeniorController', target: 'ControllerBob' },
      ],
      policies: [],
    },
    remediatedEnterpriseModel: {
      model_type: 'Enterprise_Model',
      context: 'Remediated Enterprise Configuration (Inheritance Split Across Principals)',
      jurisdiction: { country: 'US', level: 'Federal', name: 'United States' },
      effective_date: '2009-01-01',
      domains: ['Financial'],
      entities: [
        { id: 'PurchaseOrderZone', type: 'Process', sort: 'Process' },
        { id: 'PaymentDisbursementZone', type: 'Process', sort: 'Process' },
        { id: 'ProcurementLead', type: 'Role', sort: 'Role' },
        { id: 'TreasuryDisburser', type: 'Role', sort: 'Role' },
        { id: 'ControllerBob', type: 'User', sort: 'User' },
        { id: 'TreasurerCarol', type: 'User', sort: 'User' },
      ],
      relations: [
        { type: 'Reaches', source: 'ProcurementLead', target: 'PurchaseOrderZone' },
        { type: 'Reaches', source: 'TreasuryDisburser', target: 'PaymentDisbursementZone' },
        { type: 'Acts', source: 'ProcurementLead', target: 'ControllerBob' },
        { type: 'Acts', source: 'TreasuryDisburser', target: 'TreasurerCarol' },
      ],
      policies: [],
    },
    explanation:
      'Role SeniorController does not directly declare Reaches edges, but inherits both ProcurementLead and TreasuryDisburser via RR*. Principal ControllerBob therefore reaches both sides of the symmetric X pair.',
    sufficiencyNote:
      'Note: SOX §404 mandates ICFR assessment rather than prescribing SOD directly; SOD is a COSO control practice modeled here via symmetric Separate (X).',
  },
];

const CLOSURE_STEPS = [
  {
    step: 1,
    title: 'Step 1: Declared Relations Check (0 single-role conflicts)',
    formula: '∀r ∈ R : mayDo(r) ∩ mustNotDo(r) = ∅',
    shortLabel: 'Declared Relations Check',
  },
  {
    step: 2,
    title: 'Step 2: Role Inheritance & Process Composition Closure (RR*, PP*, PA*)',
    formula: 'roleClosure(R) = RR* · proc(P) = PP* · act(P) = PA(PP*)',
    shortLabel: 'Transitive Closure (RR*, PP*, PA*)',
  },
  {
    step: 3,
    title: 'Step 3: Effective Access Intersection (RA* ∩ RA⁻ ≠ ∅ or X Breach)',
    formula: 'effAct(u) ∩ effForbiddenAct(u)  ∨  effProc(u) × effProc(u) ∩ X',
    shortLabel: 'Effective Access Intersection',
  },
  {
    step: 4,
    title: 'Step 4: Witness & Minimal Unsatisfiable Core',
    formula: 'Witness(u, a/p, path⁺, path⁻) + DPLL MUS Cross-Check & OntologyChecker',
    shortLabel: 'Witness, MUS & Ontology Verdict',
  },
];

export const EnterpriseComparisonModal: React.FC<EnterpriseComparisonModalProps> = ({
  isOpen,
  onClose,
  cases,
}) => {
  const availableCases = cases && cases.length > 0 ? cases : FALLBACK_THESIS_CASES;

  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    availableCases[0]?.id || 'thesis-ch7-ex2'
  );
  const [configMode, setConfigMode] = useState<'asBuilt' | 'remediated'>('asBuilt');
  const [activeClosureStep, setActiveClosureStep] = useState<number>(4);
  const [isAnimatingClosure, setIsAnimatingClosure] = useState<boolean>(false);
  const [showAlloyPreview, setShowAlloyPreview] = useState<boolean>(false);
  const [copiedAlloy, setCopiedAlloy] = useState<boolean>(false);

  const selectedCase = useMemo(() => {
    return (
      availableCases.find((c) => c.id === selectedCaseId) || availableCases[0]
    );
  }, [availableCases, selectedCaseId]);

  const activeEnterpriseModel: GalJsonModel = useMemo(() => {
    if (!selectedCase) return FALLBACK_THESIS_CASES[0].asBuiltEnterpriseModel;
    return configMode === 'asBuilt'
      ? selectedCase.asBuiltEnterpriseModel
      : selectedCase.remediatedEnterpriseModel;
  }, [selectedCase, configMode]);

  // Run REAL GAM ConsistencyChecker, OntologyChecker, and emitAlloy live!
  const liveAnalysis = useMemo(() => {
    if (!selectedCase) return null;

    const consistencyChecker = new ConsistencyChecker();
    const ontologyChecker = new OntologyChecker();

    const rawConResult = consistencyChecker.check(
      selectedCase.lawModel,
      activeEnterpriseModel
    ) as unknown as {
      consistent: boolean;
      violations: ConsistencyViolation[];
      minimalConflict?: string[];
      stats?: unknown;
      model: {
        users: string[];
        processes: string[];
        roles: string[];
        RAp: Map<string, Set<string>>;
        RAm: Map<string, Set<string>>;
        rolesOf: (u: string) => Set<string>;
        roleClosure: (roles: Set<string>) => Set<string>;
        effAct: (u: string) => Set<string>;
        effForbiddenAct: (u: string) => Set<string>;
        effProc: (u: string) => Set<string>;
        effForbiddenProc: (u: string) => Set<string>;
        proc: (procs: Set<string>) => Set<string>;
        act: (procs: Set<string>) => Set<string>;
      };
    };
    const ontResult = ontologyChecker.check(
      selectedCase.lawModel,
      activeEnterpriseModel
    );

    const alloySpec = emitAlloy(selectedCase.lawModel, activeEnterpriseModel, {
      moduleName: `${selectedCase.id.replace(/[^A-Za-z0-9_]/g, '_')}_${configMode}`,
      title: `${selectedCase.title} (${configMode})`,
      scope: 20,
    });

    const M = rawConResult.model;

    // Step 1: Check if any single role directly holds both RAp and RAm for the same activity
    const singleRoleClashes: Array<{ role: string; activity: string }> = [];
    for (const r of M.roles) {
      const may = M.RAp.get(r) || new Set<string>();
      const mustNot = M.RAm.get(r) || new Set<string>();
      for (const a of may) {
        if (mustNot.has(a)) {
          singleRoleClashes.push({ role: r, activity: a });
        }
      }
    }

    // Step 2 & 3: Principal effective closures
    const principalClosures: PrincipalClosureSummary[] = M.users.map((u: string) => {
      const directRoles: string[] = [...M.rolesOf(u)];
      const inheritedRoles: string[] = [...M.roleClosure(new Set(directRoles))];
      const effectiveActivities: string[] = [...M.effAct(u)];
      const forbiddenActivities: string[] = [...M.effForbiddenAct(u)];
      const effectiveProcesses: string[] = [...M.effProc(u)];
      const forbiddenProcesses: string[] = [...M.effForbiddenProc(u)];

      return {
        user: u,
        directRoles,
        inheritedRoles,
        effectiveActivities,
        forbiddenActivities,
        effectiveProcesses,
        forbiddenProcesses,
      };
    });

    const processClosures: ProcessClosureSummary[] = M.processes.map((p: string) => ({
      process: p,
      subProcesses: [...M.proc(new Set([p]))],
      activities: [...M.act(new Set([p]))],
    }));

    return {
      conResult: {
        consistent: Boolean(rawConResult.consistent),
        violations: (rawConResult.violations || []) as ConsistencyViolation[],
        minimalConflict: (rawConResult.minimalConflict || []) as string[],
        stats: rawConResult.stats,
      },
      ontResult: {
        satisfied: Boolean(ontResult.satisfied),
        violations: (ontResult.violations || []) as OntologyViolation[],
      },
      alloySpec,
      singleRoleClashes,
      principalClosures,
      processClosures,
    };
  }, [selectedCase, activeEnterpriseModel, configMode]);

  // Animate step-by-step closure derivation when requested
  useEffect(() => {
    if (!isAnimatingClosure) return;
    const timer = setTimeout(() => {
      setActiveClosureStep((prev) => {
        if (prev < 4) return prev + 1;
        setIsAnimatingClosure(false);
        return 4;
      });
    }, 950);
    return () => clearTimeout(timer);
  }, [isAnimatingClosure, activeClosureStep]);

  const handleTriggerStepAnimation = () => {
    setActiveClosureStep(1);
    setIsAnimatingClosure(true);
  };

  const handleCopyAlloy = async () => {
    if (!liveAnalysis) return;
    try {
      await navigator.clipboard.writeText(liveAnalysis.alloySpec);
      setCopiedAlloy(true);
      setTimeout(() => setCopiedAlloy(false), 2000);
    } catch {
      setCopiedAlloy(false);
    }
  };

  if (!isOpen || !selectedCase || !liveAnalysis) {
    return null;
  }

  const { conResult, ontResult, singleRoleClashes, principalClosures, processClosures } =
    liveAnalysis;

  const isConsistentYetNonCompliant =
    conResult.consistent && !ontResult.satisfied;

  const isFullyCompliantInScope =
    conResult.consistent && ontResult.satisfied;

  return (
    <div
      data-testid="enterprise-comparison-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-comparison-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#050814] text-slate-100 shadow-2xl">
        {/* ─── MODAL HEADER ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0a0f24] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="enterprise-comparison-modal-title"
                  className="text-base font-bold text-white sm:text-lg"
                >
                  GAM Consistency &amp; Closure Explainer: Law (Φ_L) ∧ Enterprise (Φ_E)
                </h2>
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                  Live Engine Evaluation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Section 8 Interactive Demonstration — Real-time execution of{' '}
                <code className="font-mono text-cyan-300">ConsistencyChecker</code>,{' '}
                <code className="font-mono text-cyan-300">OntologyChecker</code>, and{' '}
                <code className="font-mono text-cyan-300">emitAlloy</code> over shared vocabulary
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-enterprise-modal-button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-300 transition-colors hover:border-rose-400/50 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── MODAL BODY (SCROLLABLE) ──────────────────────────────────────── */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* ─── NECESSARY BUT NOT SUFFICIENT BANNER ────────────────────────── */}
          <div
            data-testid="necessary-not-sufficient-callout"
            className={`rounded-xl border p-4 transition-colors ${
              isConsistentYetNonCompliant
                ? 'border-amber-400/60 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 shadow-lg'
                : 'border-slate-800 bg-[#0a0f24]/90'
            }`}
          >
            <div className="flex items-start gap-3">
              <Scale
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  isConsistentYetNonCompliant ? 'text-amber-300' : 'text-cyan-400'
                }`}
              />
              <div className="space-y-1 text-xs leading-relaxed">
                <div className="font-bold uppercase tracking-wider text-amber-300">
                  Core Thesis Theorem (§2.2 &amp; Appendix B2): Consistency is Necessary, Not Sufficient, for Compliance
                </div>
                <p className="text-slate-200">
                  Propositional and relational consistency{' '}
                  <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">
                    Con(⋀Φ_E ∧ ⋀Φ_L)
                  </code>{' '}
                  detects permit/deny collisions (<code className="font-mono">RA* ∩ RA⁻ ≠ ∅</code>), role clashes, and separation breaches (<code className="font-mono">X</code>). However, an{' '}
                  <strong className="text-white">absent mandatory safety or governance activity contradicts nothing</strong> —{' '}
                  <code className="font-mono text-emerald-300">Con</code> holds with 0 contradictions while{' '}
                  <code className="font-mono text-amber-300">OntologyChecker</code> reports{' '}
                  <code className="font-mono text-rose-300">ONTOLOGY_GAP</code>.
                </p>
                {selectedCase.sufficiencyNote && (
                  <p className="text-cyan-200/90 font-medium">
                    • {selectedCase.sufficiencyNote}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ─── CASE SELECTOR & AS-BUILT vs REMEDIATED TOGGLE ──────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Case Selector (8 cols) */}
            <div className="lg:col-span-8 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                1. Select Canonical Thesis Case Study
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {availableCases.map((c) => {
                  const isSelected = c.id === selectedCase.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-testid={`select-case-${c.id}`}
                      onClick={() => {
                        setSelectedCaseId(c.id);
                        setActiveClosureStep(4);
                      }}
                      className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-md'
                          : 'border-slate-800 bg-[#111936]/60 text-slate-300 hover:border-slate-700 hover:bg-[#111936]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-cyan-300 line-clamp-1">
                          {c.title}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                          {c.thesisReference}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-cyan-200">
                        <span>Load Φ_L ∧ Φ_E</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configuration Mode Toggle (4 cols) */}
            <div className="lg:col-span-4 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. Enterprise Configuration State
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-[#0a0f24] p-1.5">
                <button
                  type="button"
                  data-testid="toggle-as-built-config"
                  onClick={() => setConfigMode('asBuilt')}
                  className={`flex flex-col items-center justify-center rounded-lg px-3 py-3 text-center transition-all ${
                    configMode === 'asBuilt'
                      ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="text-xs">As-Built Config (Φ_E)</span>
                  <span className="mt-0.5 text-[10px] opacity-80">
                    Defective / Pre-Audit
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="toggle-remediated-config"
                  onClick={() => setConfigMode('remediated')}
                  className={`flex flex-col items-center justify-center rounded-lg px-3 py-3 text-center transition-all ${
                    configMode === 'remediated'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="text-xs">Remediated Config (Φ_E&apos;)</span>
                  <span className="mt-0.5 text-[10px] opacity-80">
                    Restructured Closure
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── SELECTED CASE SUMMARY & LIVE VERDICT BADGES ────────────────── */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-[#111936]/75 p-4 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-300">
                  {selectedCase.thesisReference}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{selectedCase.title}</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                {selectedCase.description}
              </p>
              <p className="text-xs italic text-cyan-200/90">
                {selectedCase.explanation}
              </p>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              {/* Verdict 1: ConsistencyChecker Con(Φ_E ∧ Φ_L) */}
              <div
                data-testid="live-consistency-verdict"
                className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                  conResult.consistent
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {conResult.consistent ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold">
                      Consistency Con(⋀Φ_E ∧ ⋀Φ_L)
                    </div>
                    <div className="text-[11px] opacity-80">
                      {conResult.consistent
                        ? '0 Contradictions (SAT)'
                        : `${conResult.violations.length} Closure Conflict(s) (UNSAT)`}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase">
                  {conResult.consistent ? 'PASS' : 'FAIL'}
                </span>
              </div>

              {/* Verdict 2: OntologyChecker */}
              <div
                data-testid="live-ontology-verdict"
                className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                  ontResult.satisfied
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                    : 'border-amber-500/50 bg-amber-950/40 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {ontResult.satisfied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold">
                      Ontology &amp; Scenario Duties
                    </div>
                    <div className="text-[11px] opacity-80">
                      {ontResult.satisfied
                        ? 'All Structural & Precedence Duties Met'
                        : `${ontResult.violations.length} Ontology/Scenario Violation(s)`}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold uppercase">
                  {ontResult.satisfied ? 'PASS' : 'ONTOLOGY_GAP'}
                </span>
              </div>

              {/* Verdict 3: Combined Scope Outcome */}
              <div
                data-testid="live-combined-verdict"
                className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                  isFullyCompliantInScope
                    ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-200'
                    : isConsistentYetNonCompliant
                    ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
                    : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <div className="text-xs font-bold">
                    {isFullyCompliantInScope
                      ? 'Consistent & Ontology Duties Satisfied'
                      : isConsistentYetNonCompliant
                      ? 'Consistent Yet Non-Compliant (Ontology Gap)'
                      : 'Non-Compliant (Closure Contradiction)'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── STEP-BY-STEP CLOSURE DERIVATION ANIMATOR ───────────────────── */}
          <div className="rounded-xl border border-slate-800 bg-[#0a0f24] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span>Step-by-Step Closure Derivation Walkthrough</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Trace how GAM merges <code className="font-mono text-cyan-300">Φ_L</code> and{' '}
                  <code className="font-mono text-cyan-300">
                    {configMode === 'asBuilt' ? 'Φ_E' : "Φ_E'"}
                  </code>{' '}
                  into a single vocabulary and derives effective access before checking intersections.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="animate-closure-steps-button"
                  onClick={handleTriggerStepAnimation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30"
                >
                  <Play className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Animate Derivation Steps (1 → 4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAnimatingClosure(false);
                    setActiveClosureStep(4);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Show All</span>
                </button>
              </div>
            </div>

            {/* Step Selector Pills */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {CLOSURE_STEPS.map((s) => {
                const isCurrent = activeClosureStep === s.step;
                const isReached = activeClosureStep >= s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    data-testid={`closure-step-button-${s.step}`}
                    onClick={() => {
                      setIsAnimatingClosure(false);
                      setActiveClosureStep(s.step);
                    }}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                      isCurrent
                        ? 'border-cyan-400 bg-cyan-500/15 shadow-md'
                        : isReached
                        ? 'border-slate-700 bg-[#111936]/90'
                        : 'border-slate-800/60 bg-slate-900/40 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                        Step {s.step}
                      </span>
                      {isReached && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                      )}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-white">
                      {s.title}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-400">
                      {s.formula}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step Detail Cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* STEP 1 DETAIL */}
              {activeClosureStep >= 1 && (
                <div
                  data-testid="closure-step-panel-1"
                  className="rounded-xl border border-slate-800 bg-[#111936]/70 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Step 1: Declared Relations Check (0 single-role conflicts)
                    </h4>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300 border border-emerald-500/30">
                      {singleRoleClashes.length} Direct Role Clashes
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Evaluates <code className="font-mono text-cyan-300">pred DeclaredOnlyCheck</code>:{' '}
                    <code className="font-mono">no r : Role | some (r.mayDo &amp; r.mustNotDo)</code>.
                    A naive per-relation table review checks whether any single role simultaneously declares both a positive assignment and a negative prohibition.
                  </p>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 font-mono text-xs text-slate-200">
                    <div>
                      • Law Φ_L Policies: {selectedCase.lawModel.policies.length} · Relations:{' '}
                      {selectedCase.lawModel.relations.length}
                    </div>
                    <div>
                      • Enterprise {configMode === 'asBuilt' ? 'Φ_E' : "Φ_E'"} Relations:{' '}
                      {activeEnterpriseModel.relations.length} · Policies:{' '}
                      {activeEnterpriseModel.policies.length}
                    </div>
                    <div className="mt-1 text-emerald-300">
                      → Direct Single-Role Intersection: {singleRoleClashes.length} conflicts found. (Naive audit stops here and misses transitive interactions!)
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 DETAIL */}
              {activeClosureStep >= 2 && (
                <div
                  data-testid="closure-step-panel-2"
                  className="rounded-xl border border-slate-800 bg-[#111936]/70 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Step 2: Role Inheritance &amp; Process Composition Closure (RR*, PP*, PA*)
                    </h4>
                    <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 font-mono text-[11px] text-cyan-300 border border-cyan-500/30">
                      {principalClosures.length} Principal(s) Analysed
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Computes reflexive-transitive closures over role hierarchy (<code className="font-mono text-cyan-300">Includes / RR*</code>) and process composition (<code className="font-mono text-cyan-300">ComposedOf / PP*</code>, <code className="font-mono text-cyan-300">Contains / PA*</code>).
                  </p>
                  <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 font-mono text-xs">
                    {principalClosures.map((pc) => (
                      <div key={pc.user} className="text-slate-200">
                        <span className="font-bold text-amber-300">{pc.user}</span>{' '}
                        acts in [{pc.directRoles.join(', ')}] →{' '}
                        <span className="text-emerald-300">
                          RR* = &#123;{pc.inheritedRoles.join(', ')}&#125;
                        </span>
                      </div>
                    ))}
                    {processClosures.map((prc) => (
                      <div key={prc.process} className="text-slate-300">
                        <span className="font-bold text-purple-300">{prc.process}</span>{' '}
                        →{' '}
                        <span className="text-cyan-300">
                          PA* = &#123;{prc.activities.join(', ') || '∅'}&#125;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3 DETAIL */}
              {activeClosureStep >= 3 && (
                <div
                  data-testid="closure-step-panel-3"
                  className="rounded-xl border border-slate-800 bg-[#111936]/70 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Step 3: Effective Access Intersection (RA* ∩ RA⁻ ≠ ∅ or X Breach)
                    </h4>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] border ${
                        conResult.consistent
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {conResult.consistent ? 'Intersection = ∅' : 'Non-Empty Intersection!'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    For each principal <code className="font-mono">u ∈ U</code>, intersects effective capabilities <code className="font-mono text-emerald-300">effAct(u)</code> against inherited prohibitions <code className="font-mono text-rose-300">effForbiddenAct(u)</code>, and checks effective zones <code className="font-mono text-purple-300">effProc(u)</code> against symmetric separation pairs <code className="font-mono text-rose-300">X</code>.
                  </p>
                  <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 font-mono text-xs">
                    {principalClosures.map((pc) => (
                      <div key={pc.user} className="space-y-0.5 border-b border-slate-800/80 pb-1.5 last:border-none last:pb-0">
                        <div className="font-bold text-white">Principal: {pc.user}</div>
                        <div className="text-emerald-300">
                          effAct({pc.user}) = &#123;{pc.effectiveActivities.join(', ') || '∅'}&#125;
                        </div>
                        <div className="text-rose-300">
                          effForbiddenAct({pc.user}) = &#123;{pc.forbiddenActivities.join(', ') || '∅'}&#125;
                        </div>
                        {pc.effectiveProcesses.length > 0 && (
                          <div className="text-purple-300">
                            effProc({pc.user}) = &#123;{pc.effectiveProcesses.join(', ')}&#125;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4 DETAIL */}
              {activeClosureStep >= 4 && (
                <div
                  data-testid="closure-step-panel-4"
                  className="rounded-xl border border-slate-800 bg-[#111936]/70 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Step 4: Witness &amp; Minimal Unsatisfiable Core
                    </h4>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-[11px] text-cyan-300">
                      SAT Cross-Check Agreed
                    </span>
                  </div>

                  {/* Consistency Violations & Witness Paths */}
                  {conResult.violations.length > 0 ? (
                    <div className="space-y-2">
                      {conResult.violations.map((v, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between font-mono font-bold text-rose-300">
                            <span>[{v.type}] Witness: {v.user || 'Role'}</span>
                            <span>{v.severity}</span>
                          </div>
                          <p className="text-slate-100">{v.message}</p>
                          {v.grantedVia && v.grantedVia.length > 0 && (
                            <div className="font-mono text-[11px] text-emerald-300">
                              + Granted via: {v.grantedVia.join(' ; ')}
                            </div>
                          )}
                          {v.prohibitedVia && v.prohibitedVia.length > 0 && (
                            <div className="font-mono text-[11px] text-rose-300">
                              − Prohibited via: {v.prohibitedVia.join(' ; ')}
                            </div>
                          )}
                          {v.reachedVia && (
                            <div className="font-mono text-[11px] text-purple-200 space-y-0.5">
                              {Object.entries(v.reachedVia).map(([zone, paths]) => (
                                <div key={zone}>
                                  • Zone {zone}: {(paths as string[]).join(' ; ')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {conResult.minimalConflict.length > 0 && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 font-mono text-[11px] text-amber-200">
                          <div className="font-bold text-amber-300">
                            Minimal Unsatisfiable Core (DPLL Deletion MUS):
                          </div>
                          <ul className="mt-1 list-disc pl-4 space-y-0.5">
                            {conResult.minimalConflict.map((clause, i) => (
                              <li key={i}>{clause}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-xs text-emerald-200">
                      <span className="font-semibold">Con(⋀Φ_E ∧ ⋀Φ_L) = TRUE:</span> Zero consistency violations across closure and DPLL SAT cross-check.
                    </div>
                  )}

                  {/* Ontology & Scenario Violations */}
                  {ontResult.violations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {ontResult.violations.map((ov, idx) => (
                        <div
                          key={idx}
                          data-testid="ontology-gap-finding"
                          className="rounded-lg border border-amber-500/50 bg-amber-950/35 p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-mono font-bold text-amber-300">
                            <span>
                              [{ov.type}] Requirement {ov.requirement}
                            </span>
                            <span>Necessary ≠ Sufficient Proof</span>
                          </div>
                          <p className="text-slate-100">{ov.message}</p>
                          {ov.rationale && (
                            <p className="text-[11px] text-amber-200/80">
                              Statutory Rationale: {ov.rationale}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── OPTIONAL LIVE ALLOY 6.2.0 EMITTER FOR MERGED MODEL ─────────── */}
          <div className="rounded-xl border border-slate-800 bg-[#0a0f24] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">
                  Combined (Φ_L ∧ {configMode === 'asBuilt' ? 'Φ_E' : "Φ_E'"}) Alloy 6.2.0 Module
                </span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
                  Alloy 6.2.0 Specification Emitted (Static Emission — External Kodkod/JVM Solver Not Claimed)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAlloy}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:text-white"
                >
                  {copiedAlloy ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Copy Combined .als</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  data-testid="toggle-combined-alloy-preview"
                  onClick={() => setShowAlloyPreview((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
                >
                  <span>{showAlloyPreview ? 'Hide .als Source' : 'Inspect Emitted .als'}</span>
                </button>
              </div>
            </div>

            {showAlloyPreview && (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-[#050814] p-3 font-mono text-xs text-cyan-100">
                <code>{liveAnalysis.alloySpec}</code>
              </pre>
            )}
          </div>
        </div>

        {/* ─── MODAL FOOTER ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0a0f24] px-6 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span>
              W. A. Hassan, <em>Validating Legal Compliance — Governance Analysis Method</em> (Ph.D., University of Ottawa, 2009) &amp; GAM 2.0 Formal Corrections
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseComparisonModal;
