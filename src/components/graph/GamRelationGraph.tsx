import React, { useState, useMemo, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Share2,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  HelpCircle,
  Info,
  ArrowRight,
  ArrowLeftRight,
  AlertTriangle,
  ExternalLink,
  X,
} from 'lucide-react';
import type {
  GraphNode,
  GraphEdge,
  GamSort,
  PipelineStageId,
} from '../../types/contracts';

export interface GamRelationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  onSelectEdge: (edge: GraphEdge | null) => void;
  onHighlightSpan: (span: { start: number; end: number } | null) => void;
  activeStage?: PipelineStageId;
  conflictWitnessEdgeIds?: string[];
  reducedMotion?: boolean;
}

type LayoutMode = 'swimlane' | 'radial';
type PolarityFilter = 'all' | '+' | '-' | 'structural' | 'uncertain';
type OriginFilter = 'all' | 'law' | 'enterprise' | 'both';

interface PositionedNode extends GraphNode {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

interface CanonicalEdgeSpec {
  symbol: string;
  formula: string;
  expectedSourceSort: string;
  expectedTargetSort: string;
  canonicalDirection: string;
  pitfallWarning?: string;
}

const CANONICAL_EDGE_SPECS: Record<string, CanonicalEdgeSpec> = {
  CanAssignTo: {
    symbol: 'RA±',
    formula: 'CanAssignTo(Activity, Role) ∈ RA⁺ ∪ RA⁻',
    expectedSourceSort: 'Activity',
    expectedTargetSort: 'Role',
    canonicalDirection: 'Activity → Role (RA⁺ Allow / RA⁻ Deny)',
    pitfallWarning:
      'Opposite direction from AssignedTo! CanAssignTo always points Activity → Role.',
  },
  AssignedTo: {
    symbol: 'RA⁺',
    formula: 'AssignedTo(Role, Activity) ∈ RA⁺',
    expectedSourceSort: 'Role',
    expectedTargetSort: 'Activity',
    canonicalDirection: 'Role → Activity (RA⁺ positive assignment)',
    pitfallWarning:
      'Opposite direction from CanAssignTo! AssignedTo always points Role → Activity.',
  },
  Acts: {
    symbol: 'RU⁺',
    formula: 'Acts(Role, User) ∈ RU⁺',
    expectedSourceSort: 'Role',
    expectedTargetSort: 'User',
    canonicalDirection: 'Role → User (RU⁺ role occupancy)',
    pitfallWarning:
      'Opposite direction from CanAct! Acts always points Role → User.',
  },
  CanAct: {
    symbol: 'RU±',
    formula: 'CanAct(User, Role) ∈ RU⁺ ∪ RU⁻',
    expectedSourceSort: 'User',
    expectedTargetSort: 'Role',
    canonicalDirection: 'User → Role (RU± occupancy policy)',
    pitfallWarning:
      'Opposite direction from Acts! CanAct always points User → Role.',
  },
  Assumes: {
    symbol: 'UP⁺',
    formula: 'Assumes(User, Process) ∈ UP⁺',
    expectedSourceSort: 'User',
    expectedTargetSort: 'Process',
    canonicalDirection: 'User → Process (UP⁺ direct process entry)',
  },
  CanAssume: {
    symbol: 'UP±',
    formula: 'CanAssume(User, Process) ∈ UP⁺ ∪ UP⁻',
    expectedSourceSort: 'User',
    expectedTargetSort: 'Process',
    canonicalDirection: 'User → Process (UP± process entry policy)',
  },
  Reaches: {
    symbol: 'RP⁺',
    formula: 'Reaches(Role, Process) ∈ RP⁺',
    expectedSourceSort: 'Role',
    expectedTargetSort: 'Process',
    canonicalDirection: 'Role → Process (RP⁺ role zone reachability)',
  },
  CanReach: {
    symbol: 'RP±',
    formula: 'CanReach(Role, Process) ∈ RP⁺ ∪ RP⁻',
    expectedSourceSort: 'Role',
    expectedTargetSort: 'Process',
    canonicalDirection: 'Role → Process (RP± role zone policy)',
  },
  ComposedOf: {
    symbol: 'PP',
    formula: 'ComposedOf(ParentProcess, ChildProcess) ∈ PP',
    expectedSourceSort: 'Process',
    expectedTargetSort: 'Process',
    canonicalDirection: 'parent Process → child Process (PP hierarchy)',
  },
  Contains: {
    symbol: 'PA',
    formula: 'Contains(Process, Activity) ∈ PA',
    expectedSourceSort: 'Process',
    expectedTargetSort: 'Activity',
    canonicalDirection: 'Process → Activity (PA capability containment)',
  },
  Includes: {
    symbol: 'RR',
    formula: 'Includes(SeniorRole, JuniorRole) ∈ RR',
    expectedSourceSort: 'Role',
    expectedTargetSort: 'Role',
    canonicalDirection: 'senior Role → junior Role (RR inheritance)',
  },
  Next: {
    symbol: 'S',
    formula: 'Next(PredecessorActivity, SuccessorActivity) ∈ S',
    expectedSourceSort: 'Activity',
    expectedTargetSort: 'Activity',
    canonicalDirection: 'predecessor Activity → successor Activity (S ordering)',
  },
  Separate: {
    symbol: 'X',
    formula: 'Separate(Process₁, Process₂) ∈ X',
    expectedSourceSort: 'Process',
    expectedTargetSort: 'Process',
    canonicalDirection: 'Process ↔ Process (X symmetric separation of concerns)',
  },
  CanDelegate: {
    symbol: 'D±',
    formula: 'CanDelegate(FromRole, ToRole) ∈ D⁺ ∪ D⁻',
    expectedSourceSort: 'Role',
    expectedTargetSort: 'Role',
    canonicalDirection: 'from Role → to Role (D± delegation authority)',
  },
  Delegate: {
    symbol: 'D⁺',
    formula: 'Delegate(FromRole, ToRole) ∈ D⁺',
    expectedSourceSort: 'Role',
    expectedTargetSort: 'Role',
    canonicalDirection: 'from Role → to Role (D⁺ active delegation)',
  },
};

const SORT_SWIMLANES: Array<{
  sort: GamSort | 'Unmapped';
  symbol: string;
  title: string;
  subtitle: string;
  y: number;
  color: string;
  bgTint: string;
  borderColor: string;
}> = [
  {
    sort: 'Process',
    symbol: 'P',
    title: 'Processes (P)',
    subtitle: 'Organizational & jurisdictional trust zones',
    y: 95,
    color: '#38bdf8',
    bgTint: 'rgba(56, 189, 248, 0.06)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  {
    sort: 'Activity',
    symbol: 'A',
    title: 'Activities (A)',
    subtitle: 'Regulated operations & capabilities',
    y: 230,
    color: '#a78bfa',
    bgTint: 'rgba(167, 139, 250, 0.06)',
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  {
    sort: 'Role',
    symbol: 'R',
    title: 'Roles (R)',
    subtitle: 'Institutional functions & offices',
    y: 365,
    color: '#fbbf24',
    bgTint: 'rgba(251, 191, 36, 0.06)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  {
    sort: 'User',
    symbol: 'U',
    title: 'Users / Principals (U)',
    subtitle: 'Individual actors & subjects',
    y: 500,
    color: '#34d399',
    bgTint: 'rgba(52, 211, 153, 0.06)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  {
    sort: 'Unmapped',
    symbol: '?',
    title: 'Unmapped / Auxiliary',
    subtitle: 'Non-core or unresolved legal tokens',
    y: 615,
    color: '#94a3b8',
    bgTint: 'rgba(148, 163, 184, 0.05)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
];

function getEdgeVisualStyle(edge: GraphEdge, isWitness: boolean) {
  if (edge.polarity === '-' || edge.modality === 'Deny') {
    return {
      stroke: '#ef4444',
      strokeDasharray: '7 4',
      badgeText: '[− DENY]',
      shortBadge: '[−]',
      categoryLabel: 'Explicit Prohibition',
      markerEnd: 'url(#gam-arrow-deny)',
      markerStart: undefined,
      bgBadge: '#450a0a',
      borderBadge: '#ef4444',
      textColor: '#fca5a5',
      glowColor: isWitness ? 'rgba(239, 68, 68, 0.65)' : 'rgba(239, 68, 68, 0.25)',
    };
  }
  if (edge.polarity === 'uncertain') {
    return {
      stroke: '#f59e0b',
      strokeDasharray: '3 4',
      badgeText: '[? UNCERTAIN]',
      shortBadge: '[?]',
      categoryLabel: 'Uncertain / Conditional',
      markerEnd: 'url(#gam-arrow-uncertain)',
      markerStart: undefined,
      bgBadge: '#451a03',
      borderBadge: '#f59e0b',
      textColor: '#fcd34d',
      glowColor: 'rgba(245, 158, 11, 0.25)',
    };
  }
  if (edge.polarity === 'structural') {
    const isSeparate = edge.type === 'Separate';
    return {
      stroke: '#06b6d4',
      strokeDasharray: isSeparate ? '10 3 2 3' : undefined,
      badgeText: isSeparate ? '[X SEPARATE]' : '[STRUCT]',
      shortBadge: isSeparate ? '[X]' : '[STRUCT]',
      categoryLabel: isSeparate
        ? 'Separation of Concerns (Symmetric)'
        : 'Structural Hierarchy / Ordering',
      markerEnd: isSeparate ? 'url(#gam-arrow-separate-end)' : 'url(#gam-arrow-struct)',
      markerStart: isSeparate ? 'url(#gam-arrow-separate-start)' : undefined,
      bgBadge: '#083344',
      borderBadge: '#06b6d4',
      textColor: '#67e8f9',
      glowColor: 'rgba(6, 182, 212, 0.25)',
    };
  }
  // Default '+' positive permission / assignment
  return {
    stroke: '#10b981',
    strokeDasharray: undefined,
    badgeText: '[+ ALLOW]',
    shortBadge: '[+]',
    categoryLabel: 'Positive Permission / Assignment',
    markerEnd: 'url(#gam-arrow-allow)',
    markerStart: undefined,
    bgBadge: '#064e3b',
    borderBadge: '#10b981',
    textColor: '#6ee7b7',
    glowColor: isWitness ? 'rgba(16, 185, 129, 0.65)' : 'rgba(16, 185, 129, 0.25)',
  };
}

function getSortColors(sort: GamSort | 'Unmapped') {
  switch (sort) {
    case 'Process':
      return {
        stroke: '#38bdf8',
        fill: '#0c2340',
        badgeBg: '#0284c7',
        text: '#e0f2fe',
        symbol: 'P',
      };
    case 'Activity':
      return {
        stroke: '#a78bfa',
        fill: '#1e1638',
        badgeBg: '#7c3aed',
        text: '#ede9fe',
        symbol: 'A',
      };
    case 'Role':
      return {
        stroke: '#fbbf24',
        fill: '#2e210b',
        badgeBg: '#d97706',
        text: '#fef3c7',
        symbol: 'R',
      };
    case 'User':
      return {
        stroke: '#34d399',
        fill: '#082c23',
        badgeBg: '#059669',
        text: '#d1fae5',
        symbol: 'U',
      };
    default:
      return {
        stroke: '#94a3b8',
        fill: '#1e293b',
        badgeBg: '#475569',
        text: '#f1f5f9',
        symbol: '?',
      };
  }
}

/**
 * Computes intersections between a line from (x1, y1) to (x2, y2) and a rectangular box
 * centered at (cx, cy) with given width and height, plus padding for arrowhead clearance.
 */
function getRectBoundaryPoint(
  cx: number,
  cy: number,
  width: number,
  height: number,
  targetX: number,
  targetY: number,
  padding = 6
): { x: number; y: number } {
  const dx = targetX - cx;
  const dy = targetY - cy;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: cy };
  }
  const hw = width / 2 + padding;
  const hh = height / 2 + padding;
  const scaleX = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

export const GamRelationGraph: React.FC<GamRelationGraphProps> = ({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onHighlightSpan,
  activeStage,
  conflictWitnessEdgeIds = [],
  reducedMotion = false,
}) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('swimlane');
  const [polarityFilter, setPolarityFilter] = useState<PolarityFilter>('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [showDirectionGuide, setShowDirectionGuide] = useState<boolean>(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan and zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );

  const VIEWBOX_WIDTH = 1120;
  const VIEWBOX_HEIGHT = 640;

  const hasUnmappedNodes = useMemo(
    () => nodes.some((n) => n.sort === 'Unmapped'),
    [nodes]
  );

  const visibleSwimlanes = useMemo(
    () =>
      SORT_SWIMLANES.filter(
        (lane) => lane.sort !== 'Unmapped' || hasUnmappedNodes
      ),
    [hasUnmappedNodes]
  );

  // Position nodes according to active layout mode
  const positionedNodes = useMemo<PositionedNode[]>(() => {
    const nodeWidth = 166;
    const nodeHeight = 52;

    if (layoutMode === 'swimlane') {
      const grouped = new Map<GamSort | 'Unmapped', GraphNode[]>();
      for (const lane of SORT_SWIMLANES) {
        grouped.set(lane.sort, []);
      }
      for (const node of nodes) {
        const list = grouped.get(node.sort) ?? grouped.get('Unmapped')!;
        list.push(node);
      }

      const result: PositionedNode[] = [];
      const leftMargin = 205;
      const usableWidth = VIEWBOX_WIDTH - leftMargin - 45;

      for (const lane of SORT_SWIMLANES) {
        const laneNodes = grouped.get(lane.sort) ?? [];
        const count = laneNodes.length;
        laneNodes.forEach((node, idx) => {
          const step = usableWidth / (count + 1);
          const cx =
            typeof node.x === 'number'
              ? node.x
              : leftMargin + step * (idx + 1);
          const cy = typeof node.y === 'number' ? node.y : lane.y;
          result.push({
            ...node,
            cx,
            cy,
            width: nodeWidth,
            height: nodeHeight,
          });
        });
      }
      return result;
    } else {
      // Radial Formal Graph layout grouped by quadrant sector
      const centerX = VIEWBOX_WIDTH / 2 + 40;
      const centerY = VIEWBOX_HEIGHT / 2;
      const radiusX = 340;
      const radiusY = 215;

      const sortOrder: Array<GamSort | 'Unmapped'> = [
        'Process',
        'Activity',
        'Role',
        'User',
        'Unmapped',
      ];
      const sortedNodes = [...nodes].sort(
        (a, b) => sortOrder.indexOf(a.sort) - sortOrder.indexOf(b.sort)
      );

      const total = Math.max(sortedNodes.length, 1);
      return sortedNodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / total - Math.PI / 2;
        return {
          ...node,
          cx: centerX + radiusX * Math.cos(angle),
          cy: centerY + radiusY * Math.sin(angle),
          width: nodeWidth,
          height: nodeHeight,
        };
      });
    }
  }, [nodes, layoutMode]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const n of positionedNodes) {
      map.set(n.id, n);
    }
    return map;
  }, [positionedNodes]);

  // Filter edges
  const filteredEdges = useMemo(() => {
    return edges.filter((edge) => {
      if (polarityFilter !== 'all' && edge.polarity !== polarityFilter) {
        return false;
      }
      if (originFilter !== 'all' && edge.origin !== originFilter) {
        return false;
      }
      return nodeMap.has(edge.source) && nodeMap.has(edge.target);
    });
  }, [edges, polarityFilter, originFilter, nodeMap]);

  // Group parallel edges between the same pair of nodes so curves never overlap
  const edgeCurvatureIndexMap = useMemo(() => {
    const pairCounts = new Map<string, string[]>();
    for (const edge of filteredEdges) {
      const pairKey =
        edge.source < edge.target
          ? `${edge.source}::${edge.target}`
          : `${edge.target}::${edge.source}`;
      const list = pairCounts.get(pairKey) ?? [];
      list.push(edge.id);
      pairCounts.set(pairKey, list);
    }
    const result = new Map<string, { index: number; total: number }>();
    for (const [, ids] of pairCounts.entries()) {
      ids.forEach((id, idx) => {
        result.set(id, { index: idx, total: ids.length });
      });
    }
    return result;
  }, [filteredEdges]);

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId]
  );

  const selectedNode = useMemo(
    () => positionedNodes.find((n) => n.id === selectedNodeId) ?? null,
    [positionedNodes, selectedNodeId]
  );

  const witnessSet = useMemo(
    () => new Set(conflictWitnessEdgeIds),
    [conflictWitnessEdgeIds]
  );

  // Handlers for interactive selection + synchronized text span highlighting
  const selectEdge = (edge: GraphEdge) => {
    const isAlreadySelected = selectedEdgeId === edge.id;
    if (isAlreadySelected) {
      onSelectEdge(null);
      onHighlightSpan(null);
    } else {
      onSelectNode(null);
      onSelectEdge(edge);
      if (edge.sourceSpan) {
        onHighlightSpan({
          start: edge.sourceSpan.start,
          end: edge.sourceSpan.end,
        });
      } else {
        onHighlightSpan(null);
      }
    }
  };

  const selectNode = (node: GraphNode) => {
    const isAlreadySelected = selectedNodeId === node.id;
    if (isAlreadySelected) {
      onSelectNode(null);
      onHighlightSpan(null);
    } else {
      onSelectEdge(null);
      onSelectNode(node);
      if (node.sourceSpan) {
        onHighlightSpan({
          start: node.sourceSpan.start,
          end: node.sourceSpan.end,
        });
      } else {
        onHighlightSpan(null);
      }
    }
  };

  const activateWithKeyboard = (e: React.KeyboardEvent<SVGGElement>, activate: () => void) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    activate();
  };

  const handleEdgeClick = (e: React.MouseEvent, edge: GraphEdge) => {
    e.stopPropagation();
    selectEdge(edge);
  };

  const handleNodeClick = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    selectNode(node);
  };

  const handleCanvasBackgroundClick = () => {
    onSelectNode(null);
    onSelectEdge(null);
    onHighlightSpan(null);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Counts by polarity for filter pills
  const counts = useMemo(() => {
    let allow = 0;
    let deny = 0;
    let structural = 0;
    let uncertain = 0;
    for (const e of edges) {
      if (e.polarity === '+') allow++;
      else if (e.polarity === '-') deny++;
      else if (e.polarity === 'structural') structural++;
      else if (e.polarity === 'uncertain') uncertain++;
    }
    return { allow, deny, structural, uncertain, total: edges.length };
  }, [edges]);

  return (
    <div
      className="flex flex-col w-full h-full bg-[#070b1d] border border-sky-500/20 rounded-xl overflow-hidden select-none"
      data-testid="gam-relation-graph-container"
    >
      {/* Top Formal Graph Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0a1029] border-b border-sky-500/20">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-mono font-semibold">
            <Share2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩</span>
          </div>
          {activeStage && (
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
              Stage: {activeStage.toUpperCase()}
            </span>
          )}
        </div>

        {/* Polarity & Modality Filter Buttons (Never color alone: always symbol + label) */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter edges by GAM polarity"
        >
          <button
            type="button"
            onClick={() => setPolarityFilter('all')}
            data-testid="filter-polarity-all"
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              polarityFilter === 'all'
                ? 'bg-slate-700/80 text-white border-sky-400/60'
                : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            ALL ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setPolarityFilter('+')}
            data-testid="filter-polarity-allow"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              polarityFilter === '+'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400'
                : 'bg-emerald-950/30 text-emerald-400/80 border-emerald-700/40 hover:bg-emerald-950/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>[+ ALLOW] ({counts.allow})</span>
          </button>
          <button
            type="button"
            onClick={() => setPolarityFilter('-')}
            data-testid="filter-polarity-deny"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              polarityFilter === '-'
                ? 'bg-red-950/90 text-red-300 border-red-400'
                : 'bg-red-950/30 text-red-400/80 border-red-700/40 hover:bg-red-950/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>[− DENY] ({counts.deny})</span>
          </button>
          <button
            type="button"
            onClick={() => setPolarityFilter('structural')}
            data-testid="filter-polarity-structural"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              polarityFilter === 'structural'
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400'
                : 'bg-cyan-950/30 text-cyan-400/80 border-cyan-700/40 hover:bg-cyan-950/50'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>[STRUCT] ({counts.structural})</span>
          </button>
          {counts.uncertain > 0 && (
            <button
              type="button"
              onClick={() => setPolarityFilter('uncertain')}
              data-testid="filter-polarity-uncertain"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                polarityFilter === 'uncertain'
                  ? 'bg-amber-950/90 text-amber-300 border-amber-400'
                  : 'bg-amber-950/30 text-amber-400/80 border-amber-700/40 hover:bg-amber-950/50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>[? UNCERTAIN] ({counts.uncertain})</span>
            </button>
          )}
        </div>

        {/* Layout, Origin Filter & Viewport Controls */}
        <div className="flex items-center gap-1.5">
          {edges.some((e) => e.origin === 'enterprise' || e.origin === 'both') && (
            <select
              aria-label="Filter by model provenance"
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as OriginFilter)}
              className="bg-slate-900 text-slate-200 text-xs font-mono px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-sky-400"
            >
              <option value="all">Origin: Φ_L ∪ Φ_E</option>
              <option value="law">Law Only (Φ_L)</option>
              <option value="enterprise">Enterprise Only (Φ_E)</option>
              <option value="both">Shared (Φ_L ∩ Φ_E)</option>
            </select>
          )}

          <button
            type="button"
            onClick={() =>
              setLayoutMode((m) => (m === 'swimlane' ? 'radial' : 'swimlane'))
            }
            data-testid="toggle-graph-layout"
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/70 transition-colors"
            title="Switch between GAM Sort Swimlane Hierarchy and Radial Formal Graph"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>{layoutMode === 'swimlane' ? 'Swimlane Sorts' : 'Radial Graph'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDirectionGuide((v) => !v)}
            data-testid="toggle-direction-guide"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              showDirectionGuide
                ? 'bg-sky-900/80 text-sky-200 border-sky-400'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-600/70'
            }`}
            title="Show GAM Canonical Edge Direction Reference"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Edge Directions</span>
          </button>

          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.55, +(z - 0.15).toFixed(2)))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              title="Reset Pan & Zoom"
              aria-label="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Canonical Edge Direction Cheat-Sheet Overlay */}
      {showDirectionGuide && (
        <div
          className="px-4 py-3 bg-[#0d1536]/95 border-b border-sky-400/30 text-xs"
          data-testid="canonical-direction-guide"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-semibold text-sky-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>
                Authoritative GAM Edge-Direction Conventions (W. A. Hassan 2009 / GAM 2.0) — Relations and Policies use distinct argument orders!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDirectionGuide(false)}
              className="text-slate-400 hover:text-white"
              aria-label="Close direction guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-900/90 border border-emerald-500/30">
              <div className="text-emerald-300 font-bold mb-1">
                Positive Relations (relations[])
              </div>
              <ul className="space-y-0.5 text-slate-300">
                <li>
                  <span className="text-emerald-400">AssignedTo</span>: Role → Activity (RA⁺)
                </li>
                <li>
                  <span className="text-emerald-400">Acts</span>: Role → User (RU⁺)
                </li>
                <li>
                  <span className="text-emerald-400">Assumes</span>: User → Process (UP⁺)
                </li>
                <li>
                  <span className="text-emerald-400">Reaches</span>: Role → Process (RP⁺)
                </li>
              </ul>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-red-500/30">
              <div className="text-amber-300 font-bold mb-1">
                Polarized Policies (policies[] Allow/Deny)
              </div>
              <ul className="space-y-0.5 text-slate-300">
                <li>
                  <span className="text-sky-300">CanAssignTo</span>:{' '}
                  <strong className="text-white underline">Activity → Role</strong> (RA±)
                </li>
                <li>
                  <span className="text-sky-300">CanAct</span>:{' '}
                  <strong className="text-white underline">User → Role</strong> (RU±)
                </li>
                <li>
                  <span className="text-sky-300">CanAssume</span>: User → Process (UP±)
                </li>
                <li>
                  <span className="text-sky-300">CanReach</span>: Role → Process (RP±)
                </li>
                <li>
                  <span className="text-sky-300">CanDelegate</span>: fromRole → toRole (D±)
                </li>
              </ul>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-cyan-500/30">
              <div className="text-cyan-300 font-bold mb-1">
                Structural Relations (PP, PA, RR, S, X)
              </div>
              <ul className="space-y-0.5 text-slate-300">
                <li>
                  <span className="text-cyan-400">ComposedOf</span>: parent Process → child Process
                </li>
                <li>
                  <span className="text-cyan-400">Contains</span>: Process → Activity
                </li>
                <li>
                  <span className="text-cyan-400">Includes</span>: senior Role → junior Role
                </li>
                <li>
                  <span className="text-cyan-400">Next</span>: pred Activity → succ Activity
                </li>
                <li>
                  <span className="text-cyan-400">Separate</span>: Process ↔ Process (symmetric X)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive SVG Graph Canvas */}
      <div className="relative flex-1 min-h-[380px] overflow-hidden bg-[#060a1a]">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
            <Share2 className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">
              No GAM entities or relations loaded for this stage.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Select a supported provision or advance to Stage 4 (Relations &amp; Policies) to inspect the formal graph.
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className={`w-full h-full ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasBackgroundClick}
            data-testid="gam-relation-graph-svg"
            role="group"
            aria-label="Interactive Governance Analysis Method (GAM) Formal Entity and Directed Relation Graph"
          >
            <defs>
              {/* Subtle technical grid */}
              <pattern
                id="gam-formal-grid"
                width="28"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 28 0 L 0 0 0 28"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.06)"
                  strokeWidth="1"
                />
              </pattern>

              {/* Directed Arrowhead: Positive Permission (+ Allow) */}
              <marker
                id="gam-arrow-allow"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
              >
                <path d="M 0 1.5 L 11 6 L 0 10.5 z" fill="#10b981" />
              </marker>

              {/* Directed Arrowhead: Explicit Prohibition (- Deny) with perpendicular bar */}
              <marker
                id="gam-arrow-deny"
                viewBox="0 0 14 12"
                refX="12"
                refY="6"
                markerWidth="9"
                markerHeight="9"
                orient="auto"
              >
                <line
                  x1="1"
                  y1="1"
                  x2="1"
                  y2="11"
                  stroke="#ef4444"
                  strokeWidth="2.2"
                />
                <path d="M 3 1.5 L 13 6 L 3 10.5 z" fill="#ef4444" />
              </marker>

              {/* Directed Arrowhead: Structural Hierarchy (PP, PA, RR, S) */}
              <marker
                id="gam-arrow-struct"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
              >
                <path d="M 0 1.5 L 11 6 L 0 10.5 z" fill="#06b6d4" />
              </marker>

              {/* Symmetric Separation of Concerns (X: Separate) Start & End Markers */}
              <marker
                id="gam-arrow-separate-end"
                viewBox="0 0 14 12"
                refX="12"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
              >
                <line
                  x1="2"
                  y1="1"
                  x2="2"
                  y2="11"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
                <path d="M 4 1.5 L 13 6 L 4 10.5 z" fill="#06b6d4" />
              </marker>
              <marker
                id="gam-arrow-separate-start"
                viewBox="0 0 14 12"
                refX="2"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
              >
                <path d="M 10 1.5 L 1 6 L 10 10.5 z" fill="#06b6d4" />
                <line
                  x1="12"
                  y1="1"
                  x2="12"
                  y2="11"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
              </marker>

              {/* Directed Arrowhead: Uncertain (?) */}
              <marker
                id="gam-arrow-uncertain"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
              >
                <path d="M 0 1.5 L 11 6 L 0 10.5 z" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Background Grid */}
            <rect
              x="0"
              y="0"
              width={VIEWBOX_WIDTH}
              height={VIEWBOX_HEIGHT}
              fill="url(#gam-formal-grid)"
            />

            <g
              transform={`translate(${pan.x + (VIEWBOX_WIDTH * (1 - zoom)) / 2}, ${
                pan.y + (VIEWBOX_HEIGHT * (1 - zoom)) / 2
              }) scale(${zoom})`}
            >
              {/* Swimlane Bands in Swimlane Mode */}
              {layoutMode === 'swimlane' &&
                visibleSwimlanes.map((lane) => (
                  <g key={lane.sort}>
                    <rect
                      x={16}
                      y={lane.y - 54}
                      width={VIEWBOX_WIDTH - 32}
                      height={108}
                      rx={10}
                      fill={lane.bgTint}
                      stroke={lane.borderColor}
                      strokeWidth={1}
                      strokeDasharray={lane.sort === 'Unmapped' ? '4 4' : undefined}
                    />
                    {/* Swimlane Header Column */}
                    <g transform={`translate(28, ${lane.y - 36})`}>
                      <rect
                        x={0}
                        y={0}
                        width={28}
                        height={28}
                        rx={6}
                        fill="rgba(15, 23, 42, 0.9)"
                        stroke={lane.color}
                        strokeWidth={1.5}
                      />
                      <text
                        x={14}
                        y={19}
                        textAnchor="middle"
                        fill={lane.color}
                        className="font-mono font-bold text-sm"
                      >
                        {lane.symbol}
                      </text>
                      <text
                        x={36}
                        y={13}
                        fill={lane.color}
                        className="font-mono font-semibold text-xs"
                      >
                        {lane.title}
                      </text>
                      <text
                        x={36}
                        y={27}
                        fill="#94a3b8"
                        className="text-[10px]"
                      >
                        {lane.subtitle}
                      </text>
                    </g>
                  </g>
                ))}

              {/* Radial Guide Rings in Radial Mode */}
              {layoutMode === 'radial' && (
                <g>
                  <ellipse
                    cx={VIEWBOX_WIDTH / 2 + 40}
                    cy={VIEWBOX_HEIGHT / 2}
                    rx={340}
                    ry={215}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.14)"
                    strokeWidth={1.5}
                    strokeDasharray="6 6"
                  />
                  <ellipse
                    cx={VIEWBOX_WIDTH / 2 + 40}
                    cy={VIEWBOX_HEIGHT / 2}
                    rx={170}
                    ry={108}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.08)"
                    strokeWidth={1}
                  />
                </g>
              )}

              {/* Directed Edges Layer */}
              {filteredEdges.map((edge) => {
                const sourceNode = nodeMap.get(edge.source);
                const targetNode = nodeMap.get(edge.target);
                if (!sourceNode || !targetNode) return null;

                const isSelected = selectedEdgeId === edge.id;
                const isHovered = hoveredEdgeId === edge.id;
                const isWitness = witnessSet.has(edge.id);
                const isConnectedToSelectedNode =
                  selectedNodeId !== null &&
                  (edge.source === selectedNodeId || edge.target === selectedNodeId);

                const style = getEdgeVisualStyle(edge, isWitness);
                const pairMeta = edgeCurvatureIndexMap.get(edge.id) ?? {
                  index: 0,
                  total: 1,
                };

                // Calculate start and end points on rectangular node boundaries
                const startPt = getRectBoundaryPoint(
                  sourceNode.cx,
                  sourceNode.cy,
                  sourceNode.width,
                  sourceNode.height,
                  targetNode.cx,
                  targetNode.cy,
                  4
                );
                const endPt = getRectBoundaryPoint(
                  targetNode.cx,
                  targetNode.cy,
                  targetNode.width,
                  targetNode.height,
                  sourceNode.cx,
                  sourceNode.cy,
                  8
                );

                // Compute quadratic Bezier control point for clean non-overlapping arcs
                const midX = (startPt.x + endPt.x) / 2;
                const midY = (startPt.y + endPt.y) / 2;
                const dx = endPt.x - startPt.x;
                const dy = endPt.y - startPt.y;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = -dy / dist;
                const ny = dx / dist;

                // Offset curve when multiple edges connect same pair or nodes are in same horizontal row
                const sameRowOffset =
                  Math.abs(sourceNode.cy - targetNode.cy) < 20 ? -42 : 0;
                const multiEdgeOffset =
                  (pairMeta.index - (pairMeta.total - 1) / 2) * 34;
                const curveOffset = sameRowOffset + multiEdgeOffset;

                const ctrlX = midX + nx * curveOffset;
                const ctrlY = midY + ny * curveOffset;

                // Midpoint on quadratic Bezier at t = 0.5
                const labelX = 0.25 * startPt.x + 0.5 * ctrlX + 0.25 * endPt.x;
                const labelY = 0.25 * startPt.y + 0.5 * ctrlY + 0.25 * endPt.y;

                const pathD = `M ${startPt.x} ${startPt.y} Q ${ctrlX} ${ctrlY} ${endPt.x} ${endPt.y}`;
                const spec = CANONICAL_EDGE_SPECS[edge.type];
                const mathSymbol = spec?.symbol ?? edge.kind.toUpperCase();

                const dimmed =
                  (selectedEdgeId !== null && !isSelected) ||
                  (selectedNodeId !== null && !isConnectedToSelectedNode);

                return (
                  <g
                    key={edge.id}
                    data-testid={`graph-edge-${edge.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${edge.type} relation from ${sourceNode.label} to ${targetNode.label}; ${style.categoryLabel}`}
                    aria-pressed={isSelected}
                    onClick={(e) => handleEdgeClick(e, edge)}
                    onKeyDown={(e) => activateWithKeyboard(e, () => selectEdge(edge))}
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                    className="cursor-pointer"
                    style={{
                      opacity: dimmed ? 0.32 : 1,
                      transition: reducedMotion ? 'none' : 'opacity 180ms ease',
                    }}
                  >
                    {/* Wide invisible hit target for easy clicking */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                    />

                    {/* Outer glow when selected, hovered, or conflict witness */}
                    {(isSelected || isHovered || isWitness) && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={style.glowColor}
                        strokeWidth={isSelected ? 8 : 6}
                        strokeLinecap="round"
                      />
                    )}

                    {/* Main Directed Edge Path */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth={isSelected || isHovered ? 2.8 : 2}
                      strokeDasharray={style.strokeDasharray}
                      markerEnd={style.markerEnd}
                      markerStart={style.markerStart}
                    />

                    {/* Animated directional flow pulse (disabled when reducedMotion is true) */}
                    {!reducedMotion && (isSelected || isHovered || isWitness) && (
                      <circle r="3.5" fill={style.stroke}>
                        <animateMotion
                          dur={edge.polarity === '-' ? '2.2s' : '1.6s'}
                          repeatCount="indefinite"
                          path={pathD}
                        />
                      </circle>
                    )}

                    {/* Edge Polarity & Operator Badge Pill */}
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x={-68}
                        y={-12}
                        width={136}
                        height={24}
                        rx={6}
                        fill={style.bgBadge}
                        stroke={isSelected ? '#ffffff' : style.borderBadge}
                        strokeWidth={isSelected ? 1.8 : 1.1}
                      />
                      <text
                        x={0}
                        y={3.5}
                        textAnchor="middle"
                        fill={style.textColor}
                        className="font-mono text-[10px] font-semibold"
                      >
                        {`${style.shortBadge} ${edge.type} (${mathSymbol})`}
                      </text>

                      {/* Prohibition Slash Marker Badge for Deny Edges */}
                      {(edge.polarity === '-' || edge.modality === 'Deny') && (
                        <g transform="translate(64, -10)">
                          <circle
                            cx="0"
                            cy="0"
                            r="7"
                            fill="#7f1d1d"
                            stroke="#ef4444"
                            strokeWidth="1.2"
                          />
                          <line
                            x1="-3.5"
                            y1="3.5"
                            x2="3.5"
                            y2="-3.5"
                            stroke="#fecaca"
                            strokeWidth="1.6"
                          />
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}

              {/* GAM Entity Nodes Layer */}
              {positionedNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const colors = getSortColors(node.sort);

                const isEndpointOfSelectedEdge =
                  selectedEdge !== null &&
                  (selectedEdge.source === node.id ||
                    selectedEdge.target === node.id);

                const dimmed =
                  (selectedNodeId !== null && !isSelected) ||
                  (selectedEdge !== null && !isEndpointOfSelectedEdge);

                return (
                  <g
                    key={node.id}
                    data-testid={`graph-node-${node.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${node.sort} ${node.label}${node.verified ? ', verified' : ', draft'}${node.sourceSpan ? ', linked to source text' : ', no source text link'}`}
                    aria-pressed={isSelected}
                    transform={`translate(${node.cx - node.width / 2}, ${
                      node.cy - node.height / 2
                    })`}
                    onClick={(e) => handleNodeClick(e, node)}
                    onKeyDown={(e) => activateWithKeyboard(e, () => selectNode(node))}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer"
                    style={{
                      opacity: dimmed ? 0.4 : 1,
                      transition: reducedMotion ? 'none' : 'opacity 180ms ease',
                    }}
                  >
                    {/* Selection / Hover Halo */}
                    {(isSelected || isHovered || isEndpointOfSelectedEdge) && (
                      <rect
                        x={-4}
                        y={-4}
                        width={node.width + 8}
                        height={node.height + 8}
                        rx={12}
                        fill="none"
                        stroke={isSelected ? '#ffffff' : colors.stroke}
                        strokeWidth={2}
                        strokeOpacity={0.75}
                      />
                    )}

                    {/* Node Card Body */}
                    <rect
                      x={0}
                      y={0}
                      width={node.width}
                      height={node.height}
                      rx={9}
                      fill={colors.fill}
                      stroke={isSelected ? '#ffffff' : colors.stroke}
                      strokeWidth={isSelected ? 2.2 : 1.5}
                    />

                    {/* Sort Symbol Badge (P / A / R / U) */}
                    <rect
                      x={8}
                      y={8}
                      width={24}
                      height={22}
                      rx={5}
                      fill={colors.badgeBg}
                    />
                    <text
                      x={20}
                      y={23}
                      textAnchor="middle"
                      fill="#ffffff"
                      className="font-mono text-xs font-bold"
                    >
                      {colors.symbol}
                    </text>

                    {/* Entity Label */}
                    <text
                      x={38}
                      y={22}
                      fill={colors.text}
                      className="font-mono text-[11px] font-semibold"
                    >
                      {node.label.length > 16
                        ? `${node.label.slice(0, 15)}…`
                        : node.label}
                    </text>

                    {/* Entity Sort & Origin Sub-caption */}
                    <text
                      x={10}
                      y={42}
                      fill="#94a3b8"
                      className="font-mono text-[9.5px]"
                    >
                      {`${node.sort} · ${
                        node.origin === 'law'
                          ? 'Φ_L'
                          : node.origin === 'enterprise'
                          ? 'Φ_E'
                          : 'Φ_L∩Φ_E'
                      }${node.verified ? ' ✓' : ' (draft)'}`}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Floating Non-Color-Alone Polarity Legend */}
        <div
          className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-lg bg-[#080e24]/90 border border-slate-700/80 text-[11px] font-mono backdrop-blur-sm"
          data-testid="gam-polarity-legend"
        >
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="inline-block w-5 h-0.5 bg-emerald-400" />
            <span>[+ ALLOW] Solid</span>
          </span>
          <span className="flex items-center gap-1.5 text-red-300">
            <span className="inline-block w-5 h-0.5 border-b-2 border-dashed border-red-400" />
            <span>[− DENY] Dashed + Bar</span>
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="inline-block w-5 h-0.5 bg-cyan-400" />
            <span>[STRUCT] PP/PA/RR/S/X</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="inline-block w-5 h-0.5 border-b-2 border-dotted border-amber-400" />
            <span>[? UNCERTAIN] Dotted</span>
          </span>
        </div>
      </div>

      {/* Bottom Synchronized Edge / Node Inspector Drawer */}
      <div
        className="px-4 py-3 bg-[#0a1029] border-t border-sky-500/20 text-xs"
        data-testid="gam-graph-inspector"
      >
        {selectedEdge ? (
          (() => {
            const srcNode = nodeMap.get(selectedEdge.source);
            const tgtNode = nodeMap.get(selectedEdge.target);
            const spec = CANONICAL_EDGE_SPECS[selectedEdge.type];
            const style = getEdgeVisualStyle(
              selectedEdge,
              witnessSet.has(selectedEdge.id)
            );
            const isSymmetric = selectedEdge.type === 'Separate';

            return (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded font-mono font-bold text-[11px] border"
                      style={{
                        backgroundColor: style.bgBadge,
                        borderColor: style.borderBadge,
                        color: style.textColor,
                      }}
                    >
                      {style.badgeText}
                    </span>
                    <span className="font-mono font-bold text-sm text-white">
                      {selectedEdge.type}
                    </span>
                    {spec && (
                      <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono text-[11px]">
                        {spec.formula}
                      </span>
                    )}
                    <span className="text-slate-400 font-mono text-[11px]">
                      Origin:{' '}
                      <strong className="text-slate-200">
                        {selectedEdge.origin.toUpperCase()}
                      </strong>
                    </span>
                  </div>

                  {/* Directed Source -> Target Callout */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-slate-200 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-sky-300">
                      {srcNode ? `${srcNode.label} (${srcNode.sort})` : selectedEdge.source}
                    </span>
                    {isSymmetric ? (
                      <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-sky-400" />
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-amber-300">
                      {tgtNode ? `${tgtNode.label} (${tgtNode.sort})` : selectedEdge.target}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      — {selectedEdge.canonicalDirectionNote || spec?.canonicalDirection}
                    </span>
                  </div>

                  {selectedEdge.rationale && (
                    <p className="text-slate-300 text-xs pt-0.5">
                      <span className="text-slate-400 font-semibold">
                        Legal Rationale:{' '}
                      </span>
                      {selectedEdge.rationale}
                    </p>
                  )}

                  {spec?.pitfallWarning && (
                    <p className="text-amber-300/90 text-[11px] font-mono flex items-center gap-1.5 pt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>GAM Direction Rule: {spec.pitfallWarning}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedEdge.sourceSpan && (
                    <button
                      type="button"
                      onClick={() =>
                        onHighlightSpan({
                          start: selectedEdge.sourceSpan!.start,
                          end: selectedEdge.sourceSpan!.end,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 font-mono text-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        Highlight Statutory Span [{selectedEdge.sourceSpan.start}–
                        {selectedEdge.sourceSpan.end}]
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectEdge(null);
                      onHighlightSpan(null);
                    }}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    aria-label="Clear edge selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()
        ) : selectedNode ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono font-bold text-[11px]">
                  Sort: {selectedNode.sort} (
                  {getSortColors(selectedNode.sort).symbol})
                </span>
                <span className="font-mono font-bold text-sm text-white">
                  {selectedNode.label}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Raw Type: {selectedNode.rawType} · Origin:{' '}
                  {selectedNode.origin.toUpperCase()}
                </span>
              </div>
              {selectedNode.description && (
                <p className="text-slate-300 text-xs">{selectedNode.description}</p>
              )}
              <p className="text-slate-400 font-mono text-[11px]">
                Incident Edges:{' '}
                {
                  edges.filter(
                    (e) =>
                      e.source === selectedNode.id || e.target === selectedNode.id
                  ).length
                }{' '}
                (outgoing:{' '}
                {edges.filter((e) => e.source === selectedNode.id).length},
                incoming:{' '}
                {edges.filter((e) => e.target === selectedNode.id).length})
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedNode.sourceSpan && (
                <button
                  type="button"
                  onClick={() =>
                    onHighlightSpan({
                      start: selectedNode.sourceSpan!.start,
                      end: selectedNode.sourceSpan!.end,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 font-mono text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    Highlight Statutory Span [{selectedNode.sourceSpan.start}–
                    {selectedNode.sourceSpan.end}]
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onSelectNode(null);
                  onHighlightSpan(null);
                }}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                aria-label="Clear node selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Click any <strong className="text-slate-200">directed edge</strong> or{' '}
                <strong className="text-slate-200">entity node</strong> to inspect its canonical GAM direction, polarity modality (
                <code className="text-emerald-300">Allow</code> /{' '}
                <code className="text-red-300">Deny</code>), and highlight its originating statutory clause.
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              Showing {filteredEdges.length} of {edges.length} edges ·{' '}
              {positionedNodes.length} entities
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamRelationGraph;
