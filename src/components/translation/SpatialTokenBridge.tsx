import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  CheckCircle2,
  Diamond,
  FileText,
  GitBranch,
  Hexagon,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';
import type {
  ExtractedConceptToken,
  GalEntity,
  GalJsonModel,
  GalPolicy,
  GalRelation,
  GamSort,
  GraphEdge,
  GraphNode,
  PipelineStageId,
  SegmentedClause,
  SourceSpan,
  TranslationResult,
} from '../../types/contracts';

export interface SpatialTokenBridgeProps {
  /** Currently active or highlighted source span `[start..end]` */
  activeSpan?: SourceSpan | null;
  /** Optional explicitly selected segmented clause */
  selectedClause?: SegmentedClause | null;
  /** Optional explicitly selected concept token */
  selectedConcept?: ExtractedConceptToken | null;
  /** Optional explicitly selected GAM graph node */
  selectedNode?: GraphNode | null;
  /** Optional explicitly selected GAM graph edge */
  selectedEdge?: GraphEdge | null;
  /** Optional full translation result to resolve linked clauses, tokens, nodes, edges, and GAL-JSON */
  translationResult?: TranslationResult | null;
  /** Optional segmented clauses if `translationResult` is not passed directly */
  clauses?: SegmentedClause[];
  /** Optional extracted concepts if `translationResult` is not passed directly */
  concepts?: ExtractedConceptToken[];
  /** Optional graph nodes if `translationResult` is not passed directly */
  nodes?: GraphNode[];
  /** Optional graph edges if `translationResult` is not passed directly */
  edges?: GraphEdge[];
  /** Optional GAL-JSON model if `translationResult` is not passed directly */
  galModel?: GalJsonModel | null;
  /** Active pipeline stage to highlight the corresponding column in the spatial bridge */
  activeStage?: PipelineStageId;
  /** Callback when the user clicks a span, token, node, or edge in the bridge */
  onHighlightSpan?: (span: SourceSpan | null) => void;
  /** Respect user/system reduced motion preference */
  reducedMotion?: boolean;
  /** Optional additional className */
  className?: string;
}

interface SortBadgeMeta {
  sort: GamSort | 'Unmapped';
  symbol: string;
  label: string;
  shapeLabel: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SORT_META: Record<GamSort | 'Unmapped', SortBadgeMeta> = {
  Process: {
    sort: 'Process',
    symbol: 'P',
    label: 'Process (P)',
    shapeLabel: 'Hexagon Container',
    badgeClass: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/45',
    icon: Hexagon,
  },
  Activity: {
    sort: 'Activity',
    symbol: 'A',
    label: 'Activity (A)',
    shapeLabel: 'Diamond Action',
    badgeClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/45',
    icon: Diamond,
  },
  Role: {
    sort: 'Role',
    symbol: 'R',
    label: 'Role (R)',
    shapeLabel: 'Shield Identity',
    badgeClass: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/45',
    icon: Shield,
  },
  User: {
    sort: 'User',
    symbol: 'U',
    label: 'User (U)',
    shapeLabel: 'Principal Pill',
    badgeClass: 'bg-sky-500/15 text-sky-200 border-sky-400/45',
    icon: User,
  },
  Unmapped: {
    sort: 'Unmapped',
    symbol: '∅',
    label: 'Unmapped / Non-GAM',
    shapeLabel: 'Quarantined',
    badgeClass: 'bg-amber-500/15 text-amber-200 border-amber-400/45',
    icon: AlertTriangle,
  },
};

function spansOverlap(a?: SourceSpan | null, b?: SourceSpan | null): boolean {
  if (!a || !b) return false;
  if (a.clauseId && b.clauseId && a.clauseId === b.clauseId) return true;
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

/**
 * Formats a formal signature for a GAM relation or policy edge, e.g.,
 * `CanAssignTo(Deny, Activity, Role)` or `Contains(Process, Activity)`.
 */
function formatFormalEdgeSignature(
  edge: GraphEdge,
  nodeMap: Map<string, GraphNode>
): {
  signature: string;
  endpointSummary: string;
  polarityBadge: string;
} {
  const sourceNode = nodeMap.get(edge.source);
  const targetNode = nodeMap.get(edge.target);
  const sourceSort = sourceNode?.sort && sourceNode.sort !== 'Unmapped' ? sourceNode.sort : 'Entity';
  const targetSort = targetNode?.sort && targetNode.sort !== 'Unmapped' ? targetNode.sort : 'Entity';

  if (edge.kind === 'policy') {
    const modality = edge.modality ?? (edge.polarity === '-' ? 'Deny' : 'Allow');
    return {
      signature: `${edge.type}(${modality}, ${sourceSort}, ${targetSort})`,
      endpointSummary: `${edge.source} (${sourceSort}) → ${edge.target} (${targetSort})`,
      polarityBadge: modality === 'Deny' ? 'Deny (−)' : 'Allow (+)',
    };
  }

  return {
    signature: `${edge.type}(${sourceSort}, ${targetSort})`,
    endpointSummary: `${edge.source} (${sourceSort}) → ${edge.target} (${targetSort})`,
    polarityBadge: 'Structural',
  };
}

export const SpatialTokenBridge: React.FC<SpatialTokenBridgeProps> = ({
  activeSpan,
  selectedClause: selectedClauseProp,
  selectedConcept: selectedConceptProp,
  selectedNode: selectedNodeProp,
  selectedEdge: selectedEdgeProp,
  translationResult,
  clauses: clausesProp,
  concepts: conceptsProp,
  nodes: nodesProp,
  edges: edgesProp,
  galModel: galModelProp,
  activeStage,
  onHighlightSpan,
  reducedMotion = false,
  className = '',
}) => {
  const clauses = clausesProp ?? translationResult?.clauses ?? [];
  const concepts = conceptsProp ?? translationResult?.concepts ?? [];
  const nodes = nodesProp ?? translationResult?.graph.nodes ?? [];
  const edges = edgesProp ?? translationResult?.graph.edges ?? [];
  const galModel = galModelProp ?? translationResult?.galModel ?? null;

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [nodes]);

  // 1. Resolve active SegmentedClause
  const resolvedClause = useMemo<SegmentedClause | null>(() => {
    if (selectedClauseProp) return selectedClauseProp;

    const targetSpan =
      activeSpan ??
      selectedConceptProp?.sourceSpan ??
      selectedNodeProp?.sourceSpan ??
      selectedEdgeProp?.sourceSpan ??
      null;

    if (targetSpan) {
      const byClauseId = targetSpan.clauseId
        ? clauses.find((c) => c.id === targetSpan.clauseId)
        : undefined;
      if (byClauseId) return byClauseId;

      const overlapping = clauses.find((c) => spansOverlap(c.sourceSpan, targetSpan));
      if (overlapping) return overlapping;
    }

    if (selectedConceptProp) {
      const byConceptClause = clauses.find((c) => c.id === selectedConceptProp.clauseId);
      if (byConceptClause) return byConceptClause;
    }

    return clauses[0] ?? null;
  }, [
    selectedClauseProp,
    activeSpan,
    selectedConceptProp,
    selectedNodeProp,
    selectedEdgeProp,
    clauses,
  ]);

  // Effective span `[start..end]`
  const effectiveSpan = useMemo<SourceSpan>(() => {
    if (activeSpan) return activeSpan;
    if (selectedConceptProp?.sourceSpan) return selectedConceptProp.sourceSpan;
    if (selectedNodeProp?.sourceSpan) return selectedNodeProp.sourceSpan;
    if (selectedEdgeProp?.sourceSpan) return selectedEdgeProp.sourceSpan;
    if (resolvedClause?.sourceSpan) return resolvedClause.sourceSpan;
    return {
      start: 0,
      end: translationResult?.sourceText ? Math.min(120, translationResult.sourceText.length) : 84,
      text:
        resolvedClause?.text ??
        translationResult?.sourceText?.slice(0, 120) ??
        'A controller shall not assign data processing activities to an unauthorized processor role.',
    };
  }, [
    activeSpan,
    selectedConceptProp,
    selectedNodeProp,
    selectedEdgeProp,
    resolvedClause,
    translationResult,
  ]);

  // 2. Resolve Extracted Concept Tokens linked to this clause/span
  const resolvedTokens = useMemo<ExtractedConceptToken[]>(() => {
    if (selectedConceptProp) {
      const siblings = concepts.filter(
        (t) =>
          t.id !== selectedConceptProp.id &&
          (t.clauseId === selectedConceptProp.clauseId ||
            spansOverlap(t.sourceSpan, selectedConceptProp.sourceSpan))
      );
      return [selectedConceptProp, ...siblings].slice(0, 4);
    }

    if (resolvedClause) {
      const matching = concepts.filter(
        (t) =>
          t.clauseId === resolvedClause.id ||
          spansOverlap(t.sourceSpan, resolvedClause.sourceSpan) ||
          spansOverlap(t.sourceSpan, effectiveSpan)
      );
      if (matching.length > 0) return matching.slice(0, 4);
    }

    return concepts.slice(0, 3);
  }, [selectedConceptProp, resolvedClause, concepts, effectiveSpan]);

  // 3. Resolve Typed GAM Sort Node (Process | Activity | Role | User)
  const resolvedNode = useMemo<GraphNode | null>(() => {
    if (selectedNodeProp) return selectedNodeProp;

    for (const token of resolvedTokens) {
      if (token.mappedEntityId && nodeMap.has(token.mappedEntityId)) {
        return nodeMap.get(token.mappedEntityId)!;
      }
    }

    const spanMatchedNode = nodes.find(
      (n) =>
        spansOverlap(n.sourceSpan, effectiveSpan) ||
        (resolvedClause && spansOverlap(n.sourceSpan, resolvedClause.sourceSpan))
    );
    if (spanMatchedNode) return spanMatchedNode;

    return nodes[0] ?? null;
  }, [selectedNodeProp, resolvedTokens, nodeMap, nodes, effectiveSpan, resolvedClause]);

  // 4. Resolve Directed Relation / Policy Edge
  const resolvedEdge = useMemo<GraphEdge | null>(() => {
    if (selectedEdgeProp) return selectedEdgeProp;

    for (const token of resolvedTokens) {
      if (token.mappedRelationId) {
        const found = edges.find((e) => e.id === token.mappedRelationId);
        if (found) return found;
      }
    }

    if (resolvedNode) {
      const incidentSpanEdge = edges.find(
        (e) =>
          (e.source === resolvedNode.id || e.target === resolvedNode.id) &&
          (spansOverlap(e.sourceSpan, effectiveSpan) ||
            (resolvedClause && spansOverlap(e.sourceSpan, resolvedClause.sourceSpan)))
      );
      if (incidentSpanEdge) return incidentSpanEdge;

      const incidentEdge = edges.find(
        (e) => e.source === resolvedNode.id || e.target === resolvedNode.id
      );
      if (incidentEdge) return incidentEdge;
    }

    const spanEdge = edges.find(
      (e) =>
        spansOverlap(e.sourceSpan, effectiveSpan) ||
        (resolvedClause && spansOverlap(e.sourceSpan, resolvedClause.sourceSpan))
    );
    if (spanEdge) return spanEdge;

    return edges[0] ?? null;
  }, [selectedEdgeProp, resolvedTokens, resolvedNode, edges, effectiveSpan, resolvedClause]);

  // 5. Resolve Resulting GAL-JSON Block snippet
  const galJsonSnippet = useMemo<string>(() => {
    if (galModel) {
      if (resolvedEdge) {
        if (resolvedEdge.kind === 'policy') {
          const matchingPolicy: GalPolicy | undefined =
            galModel.policies.find(
              (p) =>
                p.id === resolvedEdge.id ||
                (p.type === resolvedEdge.type &&
                  p.source === resolvedEdge.source &&
                  p.target === resolvedEdge.target)
            ) ?? galModel.policies[0];

          if (matchingPolicy) {
            return JSON.stringify(
              {
                type: matchingPolicy.type,
                modality: matchingPolicy.modality,
                source: matchingPolicy.source,
                target: matchingPolicy.target,
                ...(matchingPolicy.deontic_status
                  ? { deontic_status: matchingPolicy.deontic_status }
                  : {}),
                sourceSpan: matchingPolicy.sourceSpan ?? {
                  start: effectiveSpan.start,
                  end: effectiveSpan.end,
                },
              },
              null,
              2
            );
          }
        } else {
          const matchingRelation: GalRelation | undefined =
            galModel.relations.find(
              (r) =>
                r.id === resolvedEdge.id ||
                (r.type === resolvedEdge.type &&
                  r.source === resolvedEdge.source &&
                  r.target === resolvedEdge.target)
            ) ?? galModel.relations[0];

          if (matchingRelation) {
            return JSON.stringify(
              {
                type: matchingRelation.type,
                source: matchingRelation.source,
                target: matchingRelation.target,
                sourceSpan: matchingRelation.sourceSpan ?? {
                  start: effectiveSpan.start,
                  end: effectiveSpan.end,
                },
              },
              null,
              2
            );
          }
        }
      }

      if (resolvedNode) {
        const matchingEntity: GalEntity | undefined =
          galModel.entities.find((e) => e.id === resolvedNode.id) ?? galModel.entities[0];
        if (matchingEntity) {
          return JSON.stringify(
            {
              id: matchingEntity.id,
              type: matchingEntity.type,
              sort: matchingEntity.sort ?? resolvedNode.sort,
              sourceSpan: matchingEntity.sourceSpan ?? {
                start: effectiveSpan.start,
                end: effectiveSpan.end,
              },
            },
            null,
            2
          );
        }
      }
    }

    // Fallback canonical GAL-JSON representation
    const fallbackSort: GamSort =
      resolvedNode?.sort && resolvedNode.sort !== 'Unmapped' ? resolvedNode.sort : 'Activity';
    const fallbackEdgeType = resolvedEdge?.type ?? 'CanAssignTo';
    const fallbackModality =
      resolvedEdge?.modality ?? (resolvedClause?.polarity === 'Deny' ? 'Deny' : 'Allow');

    return JSON.stringify(
      {
        type: fallbackEdgeType,
        modality: fallbackModality,
        source: resolvedEdge?.source ?? resolvedNode?.id ?? 'DataProcessingActivity',
        target: resolvedEdge?.target ?? 'ProcessorRole',
        sort: fallbackSort,
        sourceSpan: {
          start: effectiveSpan.start,
          end: effectiveSpan.end,
        },
      },
      null,
      2
    );
  }, [galModel, resolvedEdge, resolvedNode, resolvedClause, effectiveSpan]);

  const sortMeta = SORT_META[resolvedNode?.sort ?? 'Activity'] ?? SORT_META.Activity;
  const SortIcon = sortMeta.icon;

  const formattedEdge = useMemo(() => {
    if (resolvedEdge) {
      return formatFormalEdgeSignature(resolvedEdge, nodeMap);
    }
    const defaultModality = resolvedClause?.polarity === 'Deny' ? 'Deny' : 'Allow';
    return {
      signature: `CanAssignTo(${defaultModality}, Activity, Role)`,
      endpointSummary: `${resolvedNode?.id ?? 'Activity_1'} (Activity) → Role_1 (Role)`,
      polarityBadge: defaultModality === 'Deny' ? 'Deny (−)' : 'Allow (+)',
    };
  }, [resolvedEdge, nodeMap, resolvedClause, resolvedNode]);

  const clauseSnippetText = useMemo(() => {
    const raw =
      effectiveSpan.text ??
      resolvedClause?.text ??
      (translationResult?.sourceText
        ? translationResult.sourceText.slice(effectiveSpan.start, effectiveSpan.end)
        : '') ??
      'Selected statutory clause span';
    return raw.length > 115 ? `${raw.slice(0, 112)}...` : raw;
  }, [effectiveSpan, resolvedClause, translationResult]);

  const connectorAnimationClass = reducedMotion ? '' : 'animate-pulse';

  const renderAnimatedConnector = (testId: string) => (
    <div
      aria-hidden="true"
      data-testid={testId}
      className="hidden xl:flex flex-col items-center justify-center px-1 shrink-0"
    >
      <div className="relative flex items-center">
        <svg className="h-6 w-10 text-cyan-400/75" viewBox="0 0 40 24" fill="none">
          <line
            x1="2"
            y1="12"
            x2="32"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeDasharray={reducedMotion ? undefined : '4 3'}
          />
          <path
            d="M28 7L35 12L28 17"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {!reducedMotion && (
            <circle cx="16" cy="12" r="2.5" className="fill-cyan-300 animate-ping" />
          )}
        </svg>
      </div>
    </div>
  );

  return (
    <section
      aria-label="Spatial Token-to-Formal-Model Transition Bridge"
      data-testid="spatial-token-bridge"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className={`rounded-xl border border-sky-500/20 bg-[#0a0f24]/90 p-3.5 shadow-[0_8px_30px_rgba(2,6,23,0.65)] backdrop-blur-md ${className}`}
    >
      {/* Bridge Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full bg-cyan-400 ${connectorAnimationClass}`}
            aria-hidden="true"
          />
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Spatial Provenance Data-Flow Bridge
          </h3>
          <span className="hidden sm:inline text-xs text-slate-400">
            Clause Span [start..end] → Concept Tokens → GAM Sort ⟨P,A,R,U⟩ → Directed Edge → GAL-JSON
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="rounded border border-slate-700/80 bg-slate-900/90 px-2 py-0.5 text-slate-300">
            Active Span:{' '}
            <strong className="text-cyan-300">
              [{effectiveSpan.start}..{effectiveSpan.end}]
            </strong>
          </span>
          {reducedMotion && (
            <span
              data-testid="spatial-bridge-reduced-motion-badge"
              className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300"
            >
              Static Motion Mode
            </span>
          )}
        </div>
      </div>

      {/* 5-Stage Spatial Flow Chain */}
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-stretch xl:gap-1">
        {/* Node 1: Legal Clause Span [start..end] */}
        <div
          data-testid="bridge-stage-clause-span"
          onClick={() => onHighlightSpan?.(effectiveSpan)}
          role={onHighlightSpan ? 'button' : undefined}
          tabIndex={onHighlightSpan ? 0 : undefined}
          onKeyDown={(e) => {
            if (onHighlightSpan && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onHighlightSpan(effectiveSpan);
            }
          }}
          className={`flex-1 rounded-lg border p-2.5 text-left ${
            activeStage === 'segment' || activeStage === 'source'
              ? 'border-cyan-400/60 bg-[#111936]/90 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'border-slate-800/90 bg-[#050814]/80 hover:border-cyan-500/40'
          } ${onHighlightSpan ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              <span>1. Clause Span</span>
            </span>
            <span
              data-testid="bridge-clause-span-range"
              className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-300"
            >
              [{effectiveSpan.start}..{effectiveSpan.end}]
            </span>
          </div>

          <p
            data-testid="bridge-clause-text"
            className="mt-1.5 line-clamp-2 font-serif text-xs italic leading-relaxed text-slate-200"
            title={clauseSnippetText}
          >
            “{clauseSnippetText}”
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <span
              className={`rounded border px-1.5 py-0.5 ${
                resolvedClause?.polarity === 'Deny'
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              }`}
            >
              Polarity: {resolvedClause?.polarity === 'Deny' ? 'Deny (−)' : 'Allow (+)'}
            </span>
            <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-300">
              {resolvedClause?.deonticModality ?? 'Obligatory'}
            </span>
          </div>
        </div>

        {renderAnimatedConnector('bridge-connector-1-2')}

        {/* Node 2: Extracted Concept Tokens */}
        <div
          data-testid="bridge-stage-concept-tokens"
          className={`flex-1 rounded-lg border p-2.5 ${
            activeStage === 'extract'
              ? 'border-sky-400/60 bg-[#111936]/90 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
              : 'border-slate-800/90 bg-[#050814]/80'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span>2. Concept Tokens</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {resolvedTokens.length} extracted
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {resolvedTokens.length > 0 ? (
              resolvedTokens.map((tok) => (
                <button
                  key={tok.id}
                  type="button"
                  onClick={() => onHighlightSpan?.(tok.sourceSpan)}
                  data-testid={`bridge-token-${tok.id}`}
                  className="inline-flex items-center gap-1 rounded border border-sky-500/35 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-200 hover:border-sky-400 hover:bg-sky-500/20"
                  title={`${tok.category} [${tok.sourceSpan.start}..${tok.sourceSpan.end}]`}
                >
                  <span className="truncate max-w-[110px]">{tok.label}</span>
                  <span className="rounded bg-slate-900/90 px-1 font-mono text-[10px] text-sky-300">
                    {tok.category}
                  </span>
                </button>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">
                No candidate concept tokens in active span.
              </span>
            )}
          </div>
        </div>

        {renderAnimatedConnector('bridge-connector-2-3')}

        {/* Node 3: Typed GAM Sort Node (Process | Activity | Role | User) */}
        <div
          data-testid="bridge-stage-gam-sort"
          className={`flex-1 rounded-lg border p-2.5 ${
            activeStage === 'entity'
              ? 'border-indigo-400/60 bg-[#111936]/90 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'border-slate-800/90 bg-[#050814]/80'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
              <SortIcon className="h-3.5 w-3.5 text-indigo-400" />
              <span>3. GAM Sort Node</span>
            </span>
            <span
              data-testid="bridge-gam-sort-badge"
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${sortMeta.badgeClass}`}
            >
              {sortMeta.label}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
            <div className="min-w-0">
              <div
                data-testid="bridge-gam-node-label"
                className="truncate font-mono text-xs font-semibold text-slate-100"
              >
                {resolvedNode?.label ?? resolvedNode?.id ?? 'DataProcessingActivity'}
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                Sort ∈ {'{Process, Activity, Role, User}'} · {sortMeta.shapeLabel}
              </div>
            </div>
            {resolvedNode?.verified !== false ? (
              <CheckCircle2
                className="h-4 w-4 text-emerald-400 shrink-0"
                aria-label="Verified GAM Sort"
              />
            ) : (
              <AlertTriangle
                className="h-4 w-4 text-amber-400 shrink-0"
                aria-label="Unverified Sort"
              />
            )}
          </div>
        </div>

        {renderAnimatedConnector('bridge-connector-3-4')}

        {/* Node 4: Directed Relation / Policy Edge */}
        <div
          data-testid="bridge-stage-directed-edge"
          className={`flex-1 rounded-lg border p-2.5 ${
            activeStage === 'relation'
              ? 'border-emerald-400/60 bg-[#111936]/90 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'border-slate-800/90 bg-[#050814]/80'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
              <span>4. Directed Edge</span>
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                formattedEdge.polarityBadge.includes('Deny')
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  : formattedEdge.polarityBadge.includes('Allow')
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
              }`}
            >
              {formattedEdge.polarityBadge}
            </span>
          </div>

          <div className="mt-2 rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 font-mono">
            <div
              data-testid="bridge-edge-signature"
              className="truncate text-xs font-bold text-emerald-300"
              title={formattedEdge.signature}
            >
              {formattedEdge.signature}
            </div>
            <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-300">
              <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="truncate">{formattedEdge.endpointSummary}</span>
            </div>
          </div>
        </div>

        {renderAnimatedConnector('bridge-connector-4-5')}

        {/* Node 5: Resulting GAL-JSON Block */}
        <div
          data-testid="bridge-stage-gal-json"
          className={`flex-1 rounded-lg border p-2.5 ${
            activeStage === 'gal' || activeStage === 'validate'
              ? 'border-violet-400/60 bg-[#111936]/90 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
              : 'border-slate-800/90 bg-[#050814]/80'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
              <Braces className="h-3.5 w-3.5 text-violet-400" />
              <span>5. GAL-JSON Block</span>
            </span>
            <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-mono text-[10px] text-violet-300">
              Φ_L Artifact
            </span>
          </div>

          <pre
            data-testid="bridge-gal-json-code"
            className="mt-1.5 max-h-24 overflow-x-auto overflow-y-auto rounded border border-slate-800/90 bg-[#030611] p-2 font-mono text-[10px] leading-tight text-cyan-200"
          >
            <code>{galJsonSnippet}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};

export default SpatialTokenBridge;
