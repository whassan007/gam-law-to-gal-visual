import React, { useState, useMemo, useCallback } from 'react';
import {
  Code2,
  Terminal,
  FileJson,
  Copy,
  Check,
  Download,
  Eye,
  Link2,
  Layers,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type {
  GalJsonModel,
  PipelineStageId,
  GalEntity,
  GalRelation,
  GalPolicy,
  OntologyRequirement,
  ScenarioRequirement,
  SourceSpan,
  GamSort,
} from '../../types/contracts';

export interface GalJsonSynchronizedViewerProps {
  galModel: GalJsonModel;
  activeStage: PipelineStageId;
  selectedEntityId: string | null;
  selectedRelationId: string | null;
  onSelectEntityId: (entityId: string | null) => void;
  onSelectRelationId: (relationId: string | null) => void;
  onHighlightSpan: (span: { start: number; end: number } | null) => void;
  onCopyGal?: () => void;
  onDownloadGal?: () => void;
  reducedMotion?: boolean;
}

type ViewerTabId = 'structured' | 'canonical' | 'raw';
type InspectorSubMode = 'none' | 'full-model' | 'source-mappings';

interface CanonicalDirectionDescriptor {
  sourceSort: GamSort | string;
  targetSort: GamSort | string;
  algebraSymbol: string;
  note: string;
}

const CANONICAL_RELATION_DIRECTIONS: Record<string, CanonicalDirectionDescriptor> = {
  ComposedOf: {
    sourceSort: 'Process',
    targetSort: 'Process',
    algebraSymbol: 'PP',
    note: 'parent Process → child Process (PP)',
  },
  Contains: {
    sourceSort: 'Process',
    targetSort: 'Activity',
    algebraSymbol: 'PA',
    note: 'Process → Activity (PA)',
  },
  Includes: {
    sourceSort: 'Role',
    targetSort: 'Role',
    algebraSymbol: 'RR',
    note: 'senior Role → junior Role (RR, senior inherits junior)',
  },
  Next: {
    sourceSort: 'Activity',
    targetSort: 'Activity',
    algebraSymbol: 'S',
    note: 'predecessor Activity → following Activity (S)',
  },
  Separate: {
    sourceSort: 'Process',
    targetSort: 'Process',
    algebraSymbol: 'X',
    note: 'Process ↔ Process (X, symmetric separation of duties)',
  },
  Acts: {
    sourceSort: 'Role',
    targetSort: 'User',
    algebraSymbol: 'RU+',
    note: 'Role → User (RU+)',
  },
  Assumes: {
    sourceSort: 'User',
    targetSort: 'Process',
    algebraSymbol: 'UP+',
    note: 'User → Process (UP+)',
  },
  AssignedTo: {
    sourceSort: 'Role',
    targetSort: 'Activity',
    algebraSymbol: 'RA+',
    note: 'Role → Activity (RA+)',
  },
  Reaches: {
    sourceSort: 'Role',
    targetSort: 'Process',
    algebraSymbol: 'RP+',
    note: 'Role → Process (RP+)',
  },
};

const CANONICAL_POLICY_DIRECTIONS: Record<string, CanonicalDirectionDescriptor> = {
  CanAssignTo: {
    sourceSort: 'Activity',
    targetSort: 'Role',
    algebraSymbol: 'RA±',
    note: 'Activity → Role (RA±; note swapped input order vs AssignedTo)',
  },
  CanAct: {
    sourceSort: 'User',
    targetSort: 'Role',
    algebraSymbol: 'RU±',
    note: 'User → Role (RU±; note swapped input order vs Acts)',
  },
  CanAssume: {
    sourceSort: 'User',
    targetSort: 'Process',
    algebraSymbol: 'UP±',
    note: 'User → Process (UP±)',
  },
  CanReach: {
    sourceSort: 'Role',
    targetSort: 'Process',
    algebraSymbol: 'RP±',
    note: 'Role → Process (RP±)',
  },
  CanDelegate: {
    sourceSort: 'Role',
    targetSort: 'Role',
    algebraSymbol: 'D±',
    note: 'fromRole → toRole (D±; scoped via parameters.activity_or_process)',
  },
};

const STAGE_ORDER: Record<PipelineStageId, number> = {
  source: 0,
  segment: 1,
  extract: 2,
  entity: 3,
  relation: 4,
  gal: 5,
  validate: 6,
};

function resolveEntitySort(entity: GalEntity): GamSort | 'Unmapped' {
  if (entity.sort) return entity.sort;
  if (
    entity.type === 'Process' ||
    entity.type === 'Activity' ||
    entity.type === 'Role' ||
    entity.type === 'User'
  ) {
    return entity.type;
  }
  if (entity.type === 'DepartmentRole') return 'Role';
  return 'Unmapped';
}

function getSortBadgeStyles(sort: GamSort | 'Unmapped'): {
  badgeClass: string;
  symbol: string;
} {
  switch (sort) {
    case 'Process':
      return {
        badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
        symbol: 'P',
      };
    case 'Activity':
      return {
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        symbol: 'A',
      };
    case 'Role':
      return {
        badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
        symbol: 'R',
      };
    case 'User':
      return {
        badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
        symbol: 'U',
      };
    default:
      return {
        badgeClass: 'bg-slate-800/80 text-slate-300 border-slate-600/50',
        symbol: '?',
      };
  }
}

function formatCanonicalRelationStatement(rel: GalRelation): {
  statement: string;
  directionNote: string;
  algebraSymbol: string;
} {
  const dir = CANONICAL_RELATION_DIRECTIONS[rel.type];
  const extra = rel.parameters?.additional_target
    ? `, ${rel.parameters.additional_target}`
    : '';
  return {
    statement: `${rel.type}(${rel.source}, ${rel.target}${extra})`,
    directionNote: dir ? dir.note : 'Extended GAM relation operator',
    algebraSymbol: dir ? dir.algebraSymbol : 'EXT',
  };
}

function formatCanonicalPolicyStatement(pol: GalPolicy): {
  statement: string;
  directionNote: string;
  algebraSymbol: string;
} {
  const dir = CANONICAL_POLICY_DIRECTIONS[pol.type];
  const modality = pol.modality || pol.allow_deny || 'Allow';
  const scopeParam = pol.parameters?.activity_or_process
    ? `, ${pol.parameters.activity_or_process}`
    : '';
  return {
    statement: `${pol.type}(${modality}, ${pol.source}, ${pol.target}${scopeParam})`,
    directionNote: dir ? dir.note : 'Extended GAM deontic policy operator',
    algebraSymbol: dir ? dir.algebraSymbol : 'POL±',
  };
}

function formatOntologyStatement(req: OntologyRequirement): {
  statement: string;
  operator: string;
  note: string;
} {
  if (req.process && req.activity) {
    return {
      statement: `Contains(${req.process}, ${req.activity})`,
      operator: 'PA (Required Containment)',
      note: 'Process → Activity structural ontology requirement',
    };
  }
  if (req.parentProcess && req.childProcess) {
    return {
      statement: `ComposedOf(${req.parentProcess}, ${req.childProcess})`,
      operator: 'PP (Required Composition)',
      note: 'parent Process → child Process structural ontology requirement',
    };
  }
  if (req.parentRole && req.childRole) {
    return {
      statement: `Includes(${req.parentRole}, ${req.childRole})`,
      operator: 'RR (Required Role Hierarchy)',
      note: 'senior Role → junior Role dominance requirement',
    };
  }
  return {
    statement: `OntologyRequirement(${req.id})`,
    operator: 'ONT',
    note: req.rationale,
  };
}

function formatScenarioStatement(sc: ScenarioRequirement): {
  statement: string;
  operator: string;
  note: string;
} {
  if (sc.kind === 'forbidden-precedence') {
    return {
      statement: `¬Next*(${sc.from}, ${sc.to})`,
      operator: '¬S* (Forbidden Precedence)',
      note: 'Activity must never precede target Activity in workflow trace',
    };
  }
  return {
    statement: `Next*(${sc.from}, ${sc.to})`,
    operator: 'S* (Required Precedence)',
    note: 'Prerequisite Activity must precede target Activity in workflow trace',
  };
}

export const GalJsonSynchronizedViewer: React.FC<GalJsonSynchronizedViewerProps> = ({
  galModel,
  activeStage,
  selectedEntityId,
  selectedRelationId,
  onSelectEntityId,
  onSelectRelationId,
  onHighlightSpan,
  onCopyGal,
  onDownloadGal,
  reducedMotion = false,
}) => {
  const [activeTab, setActiveTab] = useState<ViewerTabId>('structured');
  const [inspectorMode, setInspectorMode] = useState<InspectorSubMode>('none');
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    entities: true,
    relations: true,
    policies: true,
    ontology: true,
    scenarios: true,
    validationChecks: false,
  });

  const stageRank = STAGE_ORDER[activeStage] ?? 5;
  const entitiesRevealed = stageRank >= STAGE_ORDER.entity || inspectorMode === 'full-model';
  const relationsRevealed = stageRank >= STAGE_ORDER.relation || inspectorMode === 'full-model';
  const fullGalRevealed = stageRank >= STAGE_ORDER.gal || inspectorMode === 'full-model';

  const formattedJsonString = useMemo(() => {
    return JSON.stringify(galModel, null, 2);
  }, [galModel]);

  const jsonLines = useMemo(() => {
    return formattedJsonString.split('\n');
  }, [formattedJsonString]);

  const entityMap = useMemo(() => {
    const map = new Map<string, GalEntity>();
    for (const ent of galModel.entities) {
      map.set(ent.id, ent);
    }
    return map;
  }, [galModel.entities]);

  const sourceMappingsList = useMemo(() => {
    const mappings: Array<{
      id: string;
      category: 'Entity' | 'Relation' | 'Policy' | 'Ontology' | 'Scenario';
      label: string;
      span: SourceSpan;
      entityId?: string;
      relationId?: string;
    }> = [];

    galModel.entities.forEach((e) => {
      if (e.sourceSpan) {
        mappings.push({
          id: `map-entity-${e.id}`,
          category: 'Entity',
          label: `${e.id} (${resolveEntitySort(e)})`,
          span: e.sourceSpan,
          entityId: e.id,
        });
      }
    });

    galModel.relations.forEach((r, idx) => {
      const relId = r.id ?? `relation-${idx + 1}`;
      if (r.sourceSpan) {
        mappings.push({
          id: `map-rel-${idx}`,
          category: 'Relation',
          label: `${r.type}(${r.source}, ${r.target})`,
          span: r.sourceSpan,
          relationId: relId,
        });
      }
    });

    galModel.policies.forEach((p, idx) => {
      const polId = p.id ?? `policy-${idx + 1}`;
      if (p.sourceSpan) {
        mappings.push({
          id: `map-pol-${idx}`,
          category: 'Policy',
          label: `${p.type}(${p.modality}, ${p.source}, ${p.target})`,
          span: p.sourceSpan,
          relationId: polId,
        });
      }
    });

    (galModel.ontologyRequirements ?? []).forEach((o) => {
      if (o.sourceSpan) {
        mappings.push({
          id: `map-ont-${o.id}`,
          category: 'Ontology',
          label: formatOntologyStatement(o).statement,
          span: o.sourceSpan,
        });
      }
    });

    (galModel.scenarioRequirements ?? []).forEach((s) => {
      if (s.sourceSpan) {
        mappings.push({
          id: `map-scen-${s.id}`,
          category: 'Scenario',
          label: formatScenarioStatement(s).statement,
          span: s.sourceSpan,
        });
      }
    });

    return mappings.sort((a, b) => a.span.start - b.span.start);
  }, [galModel]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleCopyGal = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formattedJsonString);
      }
    } catch {
      // Fallback silent catch for headless test environments without clipboard permission
    }
    setCopiedState(true);
    onCopyGal?.();
    setTimeout(() => {
      setCopiedState(false);
    }, 2000);
  }, [formattedJsonString, onCopyGal]);

  const handleDownloadGal = useCallback(() => {
    onDownloadGal?.();
    try {
      if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
        const blob = new Blob([formattedJsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const safeContext = (galModel.context || 'law-model')
          .toLowerCase()
          .replace(/[^a-z0-9-_]+/g, '-')
          .replace(/^-|-$/g, '');
        anchor.href = url;
        anchor.download = `${safeContext || 'gal-model'}.gal.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Ignore DOM download errors in test/SSR environments
    }
  }, [formattedJsonString, galModel.context, onDownloadGal]);

  const handleEntityClick = useCallback(
    (entity: GalEntity) => {
      const nextId = selectedEntityId === entity.id ? null : entity.id;
      onSelectEntityId(nextId);
      onSelectRelationId(null);
      if (entity.sourceSpan) {
        onHighlightSpan({ start: entity.sourceSpan.start, end: entity.sourceSpan.end });
      } else {
        onHighlightSpan(null);
      }
    },
    [selectedEntityId, onSelectEntityId, onSelectRelationId, onHighlightSpan]
  );

  const handleRelationClick = useCallback(
    (rel: GalRelation, idx: number) => {
      const relId = rel.id ?? `relation-${idx + 1}`;
      const nextId = selectedRelationId === relId ? null : relId;
      onSelectRelationId(nextId);
      onSelectEntityId(rel.source || null);
      if (rel.sourceSpan) {
        onHighlightSpan({ start: rel.sourceSpan.start, end: rel.sourceSpan.end });
      } else {
        onHighlightSpan(null);
      }
    },
    [selectedRelationId, onSelectRelationId, onSelectEntityId, onHighlightSpan]
  );

  const handlePolicyClick = useCallback(
    (pol: GalPolicy, idx: number) => {
      const polId = pol.id ?? `policy-${idx + 1}`;
      const nextId = selectedRelationId === polId ? null : polId;
      onSelectRelationId(nextId);
      onSelectEntityId(pol.source || null);
      if (pol.sourceSpan) {
        onHighlightSpan({ start: pol.sourceSpan.start, end: pol.sourceSpan.end });
      } else {
        onHighlightSpan(null);
      }
    },
    [selectedRelationId, onSelectRelationId, onSelectEntityId, onHighlightSpan]
  );

  const handleInspectFullModel = useCallback(() => {
    setInspectorMode((prev) => (prev === 'full-model' ? 'none' : 'full-model'));
    setExpandedSections({
      metadata: true,
      entities: true,
      relations: true,
      policies: true,
      ontology: true,
      scenarios: true,
      validationChecks: true,
    });
  }, []);

  const handleInspectSourceMappings = useCallback(() => {
    setInspectorMode((prev) => (prev === 'source-mappings' ? 'none' : 'source-mappings'));
  }, []);

  const transitionClass = reducedMotion ? '' : 'transition-all duration-150';

  return (
    <section
      aria-label="Stage 5: GAL-JSON Generation & Synchronized Inspector"
      data-testid="gal-json-synchronized-viewer"
      className="flex flex-col h-full bg-navy-900/95 border border-cyan-500/20 rounded-xl overflow-hidden shadow-2xl text-slate-100"
    >
      {/* Top Header & Action Bar */}
      <div className="px-4 py-3 bg-navy-950/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Stage 5 · Φ_L
              </span>
              <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
                GAL-JSON Synchronized Code Generator &amp; Formal Inspector
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Incremental assembly of <code className="text-cyan-300 font-mono">Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩</code> with bidirectional statutory span traceability
            </p>
          </div>
        </div>

        {/* Export & Inspection Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleInspectFullModel}
            data-testid="inspect-full-model-button"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${transitionClass} ${
              inspectorMode === 'full-model'
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-sm'
                : 'bg-navy-800/80 text-slate-300 border-slate-700/70 hover:border-cyan-500/40 hover:text-cyan-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inspect Full Model</span>
          </button>

          <button
            type="button"
            onClick={handleInspectSourceMappings}
            data-testid="inspect-source-mappings-button"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${transitionClass} ${
              inspectorMode === 'source-mappings'
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50 shadow-sm'
                : 'bg-navy-800/80 text-slate-300 border-slate-700/70 hover:border-emerald-500/40 hover:text-emerald-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inspect Source Mappings ({sourceMappingsList.length})</span>
          </button>

          <button
            type="button"
            onClick={handleCopyGal}
            data-testid="copy-gal-button"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${transitionClass} ${
              copiedState
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
                : 'bg-cyan-500/15 text-cyan-200 border-cyan-400/40 hover:bg-cyan-500/25'
            }`}
          >
            {copiedState ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-300" />
                <span>Copy GAL</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadGal}
            data-testid="download-gal-button"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 hover:bg-indigo-500/30 ${transitionClass}`}
          >
            <Download className="w-3.5 h-3.5 text-indigo-300" />
            <span>Download GAL-JSON</span>
          </button>
        </div>
      </div>

      {/* Incremental Pipeline Stage Assembly Bar */}
      <div className="px-4 py-2 bg-navy-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Assembly Progress:
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
              entitiesRevealed
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            Entities ⟨P,A,R,U⟩: {galModel.entities.length}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
              relationsRevealed
                ? 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            Relations: {galModel.relations.length}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
              relationsRevealed
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            Policies (±): {galModel.policies.length}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
              fullGalRevealed
                ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            Ontology &amp; Scenarios:{' '}
            {(galModel.ontologyRequirements?.length ?? 0) +
              (galModel.scenarioRequirements?.length ?? 0)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="font-mono text-cyan-300">{galModel.model_type}</span>
          <span>·</span>
          <span>
            {galModel.jurisdiction.name} ({galModel.jurisdiction.level})
          </span>
          <span>·</span>
          <span className="font-mono">Eff. {galModel.effective_date}</span>
        </div>
      </div>

      {/* Optional Source Mappings Drawer when Inspect Source Mappings is active */}
      {inspectorMode === 'source-mappings' && (
        <div
          data-testid="source-mappings-inspector-drawer"
          className="px-4 py-3 bg-emerald-950/20 border-b border-emerald-500/30 max-h-52 overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Link2 className="w-3.5 h-3.5" />
              <span>Bidirectional Source Offset Index ({sourceMappingsList.length} verified spans)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Click any row to highlight statutory character offsets &amp; select graph element
            </span>
          </div>
          {sourceMappingsList.length === 0 ? (
            <p className="text-xs text-amber-300/90 py-2">
              No explicit character-offset source spans attached to this model.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {sourceMappingsList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onHighlightSpan({ start: item.span.start, end: item.span.end });
                    if (item.entityId) {
                      onSelectEntityId(item.entityId);
                      onSelectRelationId(null);
                    } else if (item.relationId) {
                      onSelectRelationId(item.relationId);
                    }
                  }}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-navy-900/90 border border-emerald-500/25 hover:border-emerald-400/60 text-left text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                      {item.category}
                    </span>
                    <span className="font-mono text-slate-200 truncate group-hover:text-emerald-200">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-cyan-300 shrink-0">
                    [{item.span.start}..{item.span.end}]
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optional Full Model Summary Banner when Inspect Full Model is active */}
      {inspectorMode === 'full-model' && (
        <div
          data-testid="full-model-inspector-banner"
          className="px-4 py-2.5 bg-cyan-950/30 border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2 text-cyan-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              <strong>Full Model Inspection Mode Active:</strong> All stages expanded (`entities`, `relations`, `policies`, `ontologyRequirements`, `scenarioRequirements`, `validation_checks`).
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
            <span>Context: {galModel.context}</span>
            <span>Domains: {galModel.domains.join(', ') || 'General'}</span>
          </div>
        </div>
      )}

      {/* 3 View Tabs Navigation */}
      <div
        role="tablist"
        aria-label="GAL-JSON Inspector View Modes"
        className="px-4 pt-2 bg-navy-950/80 border-b border-slate-800 flex items-center gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'structured'}
          data-testid="tab-structured-gal"
          onClick={() => setActiveTab('structured')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold border-t border-x ${transitionClass} ${
            activeTab === 'structured'
              ? 'bg-navy-900 text-cyan-300 border-cyan-500/40 border-b-transparent'
              : 'bg-navy-950/50 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>1. Interactive Structured GAL-JSON</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'canonical'}
          data-testid="tab-canonical-statements"
          onClick={() => setActiveTab('canonical')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold border-t border-x ${transitionClass} ${
            activeTab === 'canonical'
              ? 'bg-navy-900 text-cyan-300 border-cyan-500/40 border-b-transparent'
              : 'bg-navy-950/50 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>2. Canonical GAL Statements</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'raw'}
          data-testid="tab-raw-json"
          onClick={() => setActiveTab('raw')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold border-t border-x ${transitionClass} ${
            activeTab === 'raw'
              ? 'bg-navy-900 text-cyan-300 border-cyan-500/40 border-b-transparent'
              : 'bg-navy-950/50 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <FileJson className="w-3.5 h-3.5" />
          <span>3. Raw Exportable JSON (Φ_L)</span>
        </button>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-4">
        {/* TAB 1: INTERACTIVE STRUCTURED GAL-JSON */}
        {activeTab === 'structured' && (
          <div data-testid="structured-gal-tree" className="space-y-3">
            {/* Root opening brace & Model Header */}
            <div className="p-3 rounded-lg bg-navy-950/70 border border-slate-800/90 space-y-1.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleSection('metadata')}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300 font-semibold"
                >
                  {expandedSections.metadata ? (
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className="text-cyan-400">{'{'}</span>
                  <span className="text-sky-300">&quot;model_type&quot;</span>:{' '}
                  <span className="text-emerald-300">&quot;{galModel.model_type}&quot;</span>,
                  <span className="text-sky-300 ml-2">&quot;context&quot;</span>:{' '}
                  <span className="text-amber-200 truncate max-w-md">
                    &quot;{galModel.context}&quot;
                  </span>
                </button>
                <span className="text-[11px] text-slate-400 font-sans">
                  Click any entity, relation, or policy row to synchronize Legal Text &amp; GAM Graph
                </span>
              </div>

              {expandedSections.metadata && (
                <div className="pl-6 pt-1 space-y-1 text-[11px] text-slate-300 border-l border-slate-800 ml-1.5">
                  <div>
                    <span className="text-sky-300">&quot;jurisdiction&quot;</span>:{' '}
                    <span className="text-slate-400">{'{'}</span>{' '}
                    <span className="text-sky-300">&quot;country&quot;</span>:{' '}
                    <span className="text-emerald-300">
                      &quot;{galModel.jurisdiction.country}&quot;
                    </span>
                    , <span className="text-sky-300">&quot;level&quot;</span>:{' '}
                    <span className="text-emerald-300">
                      &quot;{galModel.jurisdiction.level}&quot;
                    </span>
                    , <span className="text-sky-300">&quot;name&quot;</span>:{' '}
                    <span className="text-emerald-300">
                      &quot;{galModel.jurisdiction.name}&quot;
                    </span>{' '}
                    <span className="text-slate-400">{'}'}</span>,
                  </div>
                  <div>
                    <span className="text-sky-300">&quot;effective_date&quot;</span>:{' '}
                    <span className="text-amber-300">&quot;{galModel.effective_date}&quot;</span>,{' '}
                    <span className="text-sky-300">&quot;domains&quot;</span>:{' '}
                    <span className="text-emerald-300">
                      [{galModel.domains.map((d) => `"${d}"`).join(', ')}]
                    </span>
                    ,
                  </div>
                </div>
              )}
            </div>

            {/* ENTITIES SECTION */}
            <div className="rounded-lg bg-navy-950/70 border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('entities')}
                className="w-full px-3 py-2 bg-navy-950 flex items-center justify-between text-left hover:bg-navy-800/60"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.entities ? (
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className="text-sky-300 font-semibold">&quot;entities&quot;</span>
                  <span className="text-slate-400">: [</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {galModel.entities.length} GAM Sort Nodes ⟨P, A, R, U⟩
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">
                  {entitiesRevealed ? 'Stage 3+ Active' : 'Assembling in Stage 3'}
                </span>
              </button>

              {expandedSections.entities && (
                <div className="p-2.5 space-y-1.5 border-t border-slate-800/80">
                  {galModel.entities.map((entity) => {
                    const sort = resolveEntitySort(entity);
                    const { badgeClass, symbol } = getSortBadgeStyles(sort);
                    const isSelected = selectedEntityId === entity.id;

                    return (
                      <div
                        key={entity.id}
                        role="button"
                        tabIndex={0}
                        data-testid={`gal-entity-row-${entity.id}`}
                        onClick={() => handleEntityClick(entity)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            handleEntityClick(entity);
                          }
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer ${transitionClass} ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 shadow-md ring-1 ring-cyan-400/40'
                            : 'bg-navy-900/70 border-slate-800/90 hover:border-cyan-500/40 hover:bg-navy-800/70'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}
                              title={`Normalized GAM Sort: ${sort}`}
                            >
                              [{symbol}] {sort}
                            </span>
                            <span className="text-slate-400">{'{'}</span>
                            <span>
                              <span className="text-sky-300">&quot;id&quot;</span>:{' '}
                              <span className="text-amber-200 font-semibold">
                                &quot;{entity.id}&quot;
                              </span>
                              ,
                            </span>
                            <span>
                              <span className="text-sky-300">&quot;type&quot;</span>:{' '}
                              <span className="text-emerald-300">&quot;{entity.type}&quot;</span>
                            </span>
                            {entity.name && (
                              <span>
                                , <span className="text-sky-300">&quot;name&quot;</span>:{' '}
                                <span className="text-slate-200">&quot;{entity.name}&quot;</span>
                              </span>
                            )}
                            <span className="text-slate-400">{'}'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {entity.verified ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Heuristic/Unverified
                              </span>
                            )}

                            {entity.sourceSpan && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                                span [{entity.sourceSpan.start}..{entity.sourceSpan.end}]
                              </span>
                            )}
                          </div>
                        </div>

                        {entity.description && (
                          <div className="mt-1 pl-4 text-[11px] text-slate-400 font-sans">
                            {entity.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="text-slate-400 pl-2">],</div>
                </div>
              )}
            </div>

            {/* RELATIONS SECTION */}
            <div className="rounded-lg bg-navy-950/70 border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('relations')}
                className="w-full px-3 py-2 bg-navy-950 flex items-center justify-between text-left hover:bg-navy-800/60"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.relations ? (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span className="text-sky-300 font-semibold">&quot;relations&quot;</span>
                  <span className="text-slate-400">: [</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {galModel.relations.length} Structural &amp; Operational Relations (PP, PA, RR, S, X, RA+, RU+, UP+, RP+)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">
                  {relationsRevealed ? 'Stage 4+ Active' : 'Assembling in Stage 4'}
                </span>
              </button>

              {expandedSections.relations && (
                <div className="p-2.5 space-y-1.5 border-t border-slate-800/80">
                  {galModel.relations.map((rel, idx) => {
                    const relId = rel.id ?? `relation-${idx + 1}`;
                    const isSelected = selectedRelationId === relId;
                    const dirInfo = CANONICAL_RELATION_DIRECTIONS[rel.type];
                    const sourceEntity = entityMap.get(rel.source);
                    const targetEntity = entityMap.get(rel.target);

                    return (
                      <div
                        key={relId}
                        role="button"
                        tabIndex={0}
                        data-testid={`gal-relation-row-${idx}`}
                        onClick={() => handleRelationClick(rel, idx)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            handleRelationClick(rel, idx);
                          }
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer ${transitionClass} ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-400 shadow-md ring-1 ring-indigo-400/40'
                            : 'bg-navy-900/70 border-slate-800/90 hover:border-indigo-500/40 hover:bg-navy-800/70'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-500/40">
                              {dirInfo ? dirInfo.algebraSymbol : 'REL'}
                            </span>
                            <span className="text-slate-400">{'{'}</span>
                            <span>
                              <span className="text-sky-300">&quot;type&quot;</span>:{' '}
                              <span className="text-cyan-300 font-semibold">
                                &quot;{rel.type}&quot;
                              </span>
                              ,
                            </span>
                            <span>
                              <span className="text-sky-300">&quot;source&quot;</span>:{' '}
                              <span className="text-amber-200">&quot;{rel.source}&quot;</span>
                              {sourceEntity && (
                                <span className="text-slate-400 text-[10px] ml-1">
                                  ({resolveEntitySort(sourceEntity)})
                                </span>
                              )}
                              ,
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>
                              <span className="text-sky-300">&quot;target&quot;</span>:{' '}
                              <span className="text-amber-200">&quot;{rel.target}&quot;</span>
                              {targetEntity && (
                                <span className="text-slate-400 text-[10px] ml-1">
                                  ({resolveEntitySort(targetEntity)})
                                </span>
                              )}
                            </span>
                            <span className="text-slate-400">{'}'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {dirInfo && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700 font-sans">
                                {dirInfo.note}
                              </span>
                            )}
                            {rel.sourceSpan && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                                span [{rel.sourceSpan.start}..{rel.sourceSpan.end}]
                              </span>
                            )}
                          </div>
                        </div>

                        {rel.rationale && (
                          <div className="mt-1 pl-4 text-[11px] text-slate-400 font-sans">
                            Rationale: {rel.rationale}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="text-slate-400 pl-2">],</div>
                </div>
              )}
            </div>

            {/* POLICIES SECTION */}
            <div className="rounded-lg bg-navy-950/70 border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('policies')}
                className="w-full px-3 py-2 bg-navy-950 flex items-center justify-between text-left hover:bg-navy-800/60"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.policies ? (
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="text-sky-300 font-semibold">&quot;policies&quot;</span>
                  <span className="text-slate-400">: [</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {galModel.policies.length} Normative Policies (RA±, RU±, UP±, RP±, D±)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">
                  Allow (+) vs Deny (−) Deontic Modalities
                </span>
              </button>

              {expandedSections.policies && (
                <div className="p-2.5 space-y-1.5 border-t border-slate-800/80">
                  {galModel.policies.map((pol, idx) => {
                    const polId = pol.id ?? `policy-${idx + 1}`;
                    const isSelected = selectedRelationId === polId;
                    const isDeny = pol.modality === 'Deny' || pol.allow_deny === 'Deny';
                    const dirInfo = CANONICAL_POLICY_DIRECTIONS[pol.type];
                    const sourceEntity = entityMap.get(pol.source);
                    const targetEntity = entityMap.get(pol.target);

                    return (
                      <div
                        key={polId}
                        role="button"
                        tabIndex={0}
                        data-testid={`gal-policy-row-${idx}`}
                        onClick={() => handlePolicyClick(pol, idx)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            handlePolicyClick(pol, idx);
                          }
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer ${transitionClass} ${
                          isSelected
                            ? isDeny
                              ? 'bg-rose-500/20 border-rose-400 shadow-md ring-1 ring-rose-400/40'
                              : 'bg-emerald-500/20 border-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                            : 'bg-navy-900/70 border-slate-800/90 hover:border-cyan-500/40 hover:bg-navy-800/70'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Non-color-only Allow/Deny badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                isDeny
                                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {isDeny ? (
                                <>
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>[−] Deny</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>[+] Allow</span>
                                </>
                              )}
                            </span>

                            <span className="text-slate-400">{'{'}</span>
                            <span>
                              <span className="text-sky-300">&quot;type&quot;</span>:{' '}
                              <span className="text-cyan-300 font-semibold">
                                &quot;{pol.type}&quot;
                              </span>
                              ,
                            </span>
                            <span>
                              <span className="text-sky-300">&quot;modality&quot;</span>:{' '}
                              <span className={isDeny ? 'text-rose-300' : 'text-emerald-300'}>
                                &quot;{pol.modality}&quot;
                              </span>
                              ,
                            </span>
                            <span>
                              <span className="text-sky-300">&quot;source&quot;</span>:{' '}
                              <span className="text-amber-200">&quot;{pol.source}&quot;</span>
                              {sourceEntity && (
                                <span className="text-slate-400 text-[10px] ml-1">
                                  ({resolveEntitySort(sourceEntity)})
                                </span>
                              )}
                              ,
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>
                              <span className="text-sky-300">&quot;target&quot;</span>:{' '}
                              <span className="text-amber-200">&quot;{pol.target}&quot;</span>
                              {targetEntity && (
                                <span className="text-slate-400 text-[10px] ml-1">
                                  ({resolveEntitySort(targetEntity)})
                                </span>
                              )}
                            </span>
                            {pol.parameters?.activity_or_process && (
                              <span>
                                , <span className="text-sky-300">&quot;scope&quot;</span>:{' '}
                                <span className="text-indigo-300">
                                  &quot;{pol.parameters.activity_or_process}&quot;
                                </span>
                              </span>
                            )}
                            <span className="text-slate-400">{'}'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {dirInfo && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700 font-sans">
                                {dirInfo.note}
                              </span>
                            )}
                            {pol.sourceSpan && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                                span [{pol.sourceSpan.start}..{pol.sourceSpan.end}]
                              </span>
                            )}
                          </div>
                        </div>

                        {(pol.rationale || pol.parameters?.condition) && (
                          <div className="mt-1 pl-4 text-[11px] text-slate-400 font-sans flex flex-wrap gap-3">
                            {pol.rationale && <span>Rationale: {pol.rationale}</span>}
                            {pol.parameters?.condition && (
                              <span className="text-amber-300/90">
                                Condition: {pol.parameters.condition}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="text-slate-400 pl-2">],</div>
                </div>
              )}
            </div>

            {/* ONTOLOGY REQUIREMENTS SECTION */}
            <div className="rounded-lg bg-navy-950/70 border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('ontology')}
                className="w-full px-3 py-2 bg-navy-950 flex items-center justify-between text-left hover:bg-navy-800/60"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.ontology ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="text-sky-300 font-semibold">
                    &quot;ontologyRequirements&quot;
                  </span>
                  <span className="text-slate-400">: [</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {galModel.ontologyRequirements?.length ?? 0} Structural Ontology Constraints
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">
                  Process-Activity (PA), Process-Process (PP), Role-Role (RR)
                </span>
              </button>

              {expandedSections.ontology && (
                <div className="p-2.5 space-y-1.5 border-t border-slate-800/80">
                  {(galModel.ontologyRequirements ?? []).length === 0 ? (
                    <div className="text-slate-500 pl-4 py-1 font-sans">
                      No additional ontologyRequirements declared on this model.
                    </div>
                  ) : (
                    (galModel.ontologyRequirements ?? []).map((req, idx) => {
                      const formatted = formatOntologyStatement(req);
                      const focusEntity =
                        req.process ||
                        req.activity ||
                        req.parentProcess ||
                        req.parentRole ||
                        null;

                      return (
                        <div
                          key={req.id || idx}
                          role="button"
                          tabIndex={0}
                          data-testid={`gal-ontology-row-${idx}`}
                          onClick={() => {
                            if (focusEntity) onSelectEntityId(focusEntity);
                            if (req.sourceSpan) {
                              onHighlightSpan({
                                start: req.sourceSpan.start,
                                end: req.sourceSpan.end,
                              });
                            }
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              if (focusEntity) onSelectEntityId(focusEntity);
                              if (req.sourceSpan) {
                                onHighlightSpan({
                                  start: req.sourceSpan.start,
                                  end: req.sourceSpan.end,
                                });
                              }
                            }
                          }}
                          className="p-2.5 rounded-lg bg-navy-900/70 border border-slate-800/90 hover:border-amber-500/40 cursor-pointer"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                                {formatted.operator}
                              </span>
                              <span className="text-amber-200 font-semibold">
                                {formatted.statement}
                              </span>
                              <span className="text-slate-400">
                                ({req.id})
                              </span>
                            </div>
                            {req.sourceSpan && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                                span [{req.sourceSpan.start}..{req.sourceSpan.end}]
                              </span>
                            )}
                          </div>
                          <div className="mt-1 pl-2 text-[11px] text-slate-400 font-sans">
                            {req.rationale}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div className="text-slate-400 pl-2">],</div>
                </div>
              )}
            </div>

            {/* SCENARIO REQUIREMENTS SECTION */}
            <div className="rounded-lg bg-navy-950/70 border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('scenarios')}
                className="w-full px-3 py-2 bg-navy-950 flex items-center justify-between text-left hover:bg-navy-800/60"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.scenarios ? (
                    <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                  )}
                  <span className="text-sky-300 font-semibold">
                    &quot;scenarioRequirements&quot;
                  </span>
                  <span className="text-slate-400">: [</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {galModel.scenarioRequirements?.length ?? 0} Workflow Scenario Ordering Rules
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">
                  Precedence (S*) &amp; Forbidden Precedence (¬S*)
                </span>
              </button>

              {expandedSections.scenarios && (
                <div className="p-2.5 space-y-1.5 border-t border-slate-800/80">
                  {(galModel.scenarioRequirements ?? []).length === 0 ? (
                    <div className="text-slate-500 pl-4 py-1 font-sans">
                      No workflow scenarioRequirements declared on this model.
                    </div>
                  ) : (
                    (galModel.scenarioRequirements ?? []).map((sc, idx) => {
                      const formatted = formatScenarioStatement(sc);
                      return (
                        <div
                          key={sc.id || idx}
                          role="button"
                          tabIndex={0}
                          data-testid={`gal-scenario-row-${idx}`}
                          onClick={() => {
                            onSelectEntityId(sc.from);
                            if (sc.sourceSpan) {
                              onHighlightSpan({
                                start: sc.sourceSpan.start,
                                end: sc.sourceSpan.end,
                              });
                            }
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              onSelectEntityId(sc.from);
                              if (sc.sourceSpan) {
                                onHighlightSpan({
                                  start: sc.sourceSpan.start,
                                  end: sc.sourceSpan.end,
                                });
                              }
                            }
                          }}
                          className="p-2.5 rounded-lg bg-navy-900/70 border border-slate-800/90 hover:border-purple-500/40 cursor-pointer"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                                {formatted.operator}
                              </span>
                              <span className="text-purple-200 font-semibold">
                                {formatted.statement}
                              </span>
                              <span className="text-slate-400">
                                ({sc.id}: {sc.from} → {sc.to})
                              </span>
                            </div>
                            {sc.sourceSpan && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                                span [{sc.sourceSpan.start}..{sc.sourceSpan.end}]
                              </span>
                            )}
                          </div>
                          <div className="mt-1 pl-2 text-[11px] text-slate-400 font-sans">
                            {sc.rationale}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div className="text-slate-400 pl-2">]</div>
                </div>
              )}
            </div>

            <div className="text-cyan-400 font-bold pl-1">{'}'}</div>
          </div>
        )}

        {/* TAB 2: CANONICAL GAL STATEMENTS (HASSAN 2009 FUNCTIONAL NOTATION) */}
        {activeTab === 'canonical' && (
          <div data-testid="canonical-gal-statements" className="space-y-4">
            {/* Formal Reference Callout Card */}
            <div className="p-3.5 rounded-lg bg-navy-950/90 border border-cyan-500/30 space-y-2 font-sans">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    Canonical GAL Functional Notation — W. A. Hassan (Ottawa 2009) &amp; GAM 2.0
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every statement below is rendered in canonical GAM functional syntax. Note the
                critical argument order distinction verified against <code className="text-cyan-300 font-mono">GamModel._ingest</code>:{' '}
                <code className="text-emerald-300 font-mono">CanAssignTo(Modality, Activity, Role)</code>{' '}
                takes <strong>Activity → Role</strong> (`RA±`), whereas operational assignment{' '}
                <code className="text-indigo-300 font-mono">AssignedTo(Role, Activity)</code> takes{' '}
                <strong>Role → Activity</strong> (`RA+`). Similarly,{' '}
                <code className="text-emerald-300 font-mono">CanAct(Modality, User, Role)</code> takes{' '}
                <strong>User → Role</strong> (`RU±`), whereas{' '}
                <code className="text-indigo-300 font-mono">Acts(Role, User)</code> takes{' '}
                <strong>Role → User</strong> (`RU+`).
              </p>
            </div>

            {/* 1. Sort Declarations */}
            <div className="p-3 rounded-lg bg-navy-950/70 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-cyan-300 font-sans flex items-center justify-between">
                <span>1. Formal Sort Declarations ⟨P, A, R, U⟩</span>
                <span className="text-[11px] font-mono text-slate-400">
                  {galModel.entities.length} declared symbols
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(['Process', 'Activity', 'Role', 'User'] as const).map((sort) => {
                  const members = galModel.entities.filter(
                    (e) => resolveEntitySort(e) === sort
                  );
                  const { badgeClass, symbol } = getSortBadgeStyles(sort);
                  return (
                    <div
                      key={sort}
                      className="p-2.5 rounded bg-navy-900/80 border border-slate-800/90"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                          Sort {symbol} ({sort})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          |{'{'}
                          {symbol}
                          {'}'}| = {members.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {members.length === 0 ? (
                          <span className="text-slate-500 text-[11px]">∅ (empty sort)</span>
                        ) : (
                          members.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleEntityClick(m)}
                              className={`px-2 py-0.5 rounded text-[11px] border ${
                                selectedEntityId === m.id
                                  ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400'
                                  : 'bg-navy-950 text-slate-200 border-slate-700/80 hover:border-cyan-500/40'
                              }`}
                            >
                              {m.id}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Normative Deontic Policy Statements */}
            <div className="p-3 rounded-lg bg-navy-950/70 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-emerald-300 font-sans flex items-center justify-between">
                <span>
                  2. Normative Policy Statements (RA±, RU±, UP±, RP±, D±)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Canonical Argument Order: Activity → Role for CanAssignTo
                </span>
              </div>
              <div className="space-y-1.5">
                {galModel.policies.map((pol, idx) => {
                  const formatted = formatCanonicalPolicyStatement(pol);
                  const isDeny = pol.modality === 'Deny' || pol.allow_deny === 'Deny';
                  const polId = pol.id ?? `policy-${idx + 1}`;
                  const isSelected = selectedRelationId === polId;

                  return (
                    <div
                      key={polId}
                      role="button"
                      tabIndex={0}
                      data-testid={`canonical-policy-statement-${idx}`}
                      onClick={() => handlePolicyClick(pol, idx)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          handlePolicyClick(pol, idx);
                        }
                      }}
                      className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400'
                          : 'bg-navy-900/80 border-slate-800/90 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            isDeny
                              ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                              : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {formatted.algebraSymbol}
                        </span>
                        <code className="text-xs font-bold text-slate-100">
                          {formatted.statement}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400 font-sans">
                          {formatted.directionNote}
                        </span>
                        {pol.sourceSpan && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                            [{pol.sourceSpan.start}..{pol.sourceSpan.end}]
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Structural & Operational Relation Statements */}
            <div className="p-3 rounded-lg bg-navy-950/70 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-indigo-300 font-sans flex items-center justify-between">
                <span>
                  3. Structural &amp; Operational Relations (PP, PA, RR, S, X, RA+, RU+, UP+, RP+)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {galModel.relations.length} relation axioms
                </span>
              </div>
              <div className="space-y-1.5">
                {galModel.relations.map((rel, idx) => {
                  const formatted = formatCanonicalRelationStatement(rel);
                  const relId = rel.id ?? `relation-${idx + 1}`;
                  const isSelected = selectedRelationId === relId;

                  return (
                    <div
                      key={relId}
                      role="button"
                      tabIndex={0}
                      data-testid={`canonical-relation-statement-${idx}`}
                      onClick={() => handleRelationClick(rel, idx)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          handleRelationClick(rel, idx);
                        }
                      }}
                      className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/20 border-indigo-400'
                          : 'bg-navy-900/80 border-slate-800/90 hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-500/40">
                          {formatted.algebraSymbol}
                        </span>
                        <code className="text-xs font-bold text-slate-100">
                          {formatted.statement}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400 font-sans">
                          {formatted.directionNote}
                        </span>
                        {rel.sourceSpan && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                            [{rel.sourceSpan.start}..{rel.sourceSpan.end}]
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Ontology & Scenario Axioms */}
            {((galModel.ontologyRequirements?.length ?? 0) > 0 ||
              (galModel.scenarioRequirements?.length ?? 0) > 0) && (
              <div className="p-3 rounded-lg bg-navy-950/70 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-amber-300 font-sans">
                  4. Required Ontology &amp; Workflow Scenario Axioms
                </div>
                <div className="space-y-1.5">
                  {(galModel.ontologyRequirements ?? []).map((req, idx) => {
                    const f = formatOntologyStatement(req);
                    return (
                      <div
                        key={`ont-canon-${idx}`}
                        className="p-2 rounded bg-navy-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40">
                            {f.operator}
                          </span>
                          <code className="text-amber-200 font-semibold">{f.statement}</code>
                        </div>
                        <span className="text-[11px] text-slate-400 font-sans">{f.note}</span>
                      </div>
                    );
                  })}
                  {(galModel.scenarioRequirements ?? []).map((sc, idx) => {
                    const f = formatScenarioStatement(sc);
                    return (
                      <div
                        key={`scen-canon-${idx}`}
                        className="p-2 rounded bg-navy-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/80 text-purple-300 border border-purple-500/40">
                            {f.operator}
                          </span>
                          <code className="text-purple-200 font-semibold">{f.statement}</code>
                        </div>
                        <span className="text-[11px] text-slate-400 font-sans">{f.note}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RAW EXPORTABLE JSON (Φ_L) WITH LINE NUMBERS */}
        {activeTab === 'raw' && (
          <div
            data-testid="raw-gal-json-viewer"
            className="rounded-lg bg-navy-950 border border-slate-800 overflow-hidden"
          >
            <div className="px-3 py-2 bg-navy-900/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-sans">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Exportable <code className="text-cyan-300 font-mono">Φ_L</code> artifact compatible with <code className="text-cyan-300 font-mono">validateModel</code>, <code className="text-cyan-300 font-mono">ConsistencyChecker</code>, and <code className="text-cyan-300 font-mono">emitAlloy</code>
                </span>
              </div>
              <span className="font-mono text-slate-400">{jsonLines.length} lines</span>
            </div>
            <div className="p-3 overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs">
                <tbody>
                  {jsonLines.map((line, lineIdx) => (
                    <tr
                      key={lineIdx}
                      className="hover:bg-navy-800/50 leading-relaxed"
                    >
                      <td className="select-none pr-4 text-right text-slate-600 w-10 align-top">
                        {lineIdx + 1}
                      </td>
                      <td className="text-slate-200 whitespace-pre">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GalJsonSynchronizedViewer;
