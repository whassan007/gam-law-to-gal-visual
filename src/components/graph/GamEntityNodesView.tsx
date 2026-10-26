import React, { useMemo, useState } from 'react';
import {
  Hexagon,
  Diamond,
  Shield,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Filter,
  Sparkles,
  Scale,
  Building2,
  Layers,
  Info,
} from 'lucide-react';
import type {
  ExtractedConceptToken,
  GamSort,
  GraphNode,
} from '../../types/contracts';

export interface GamEntityNodesViewProps {
  nodes: GraphNode[];
  unmappedConcepts?: ExtractedConceptToken[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  onHighlightSpan: (span: { start: number; end: number } | null) => void;
  reducedMotion?: boolean;
}

interface SortMeta {
  sort: GamSort;
  symbol: 'P' | 'A' | 'R' | 'U';
  title: string;
  subtitle: string;
  formalNote: string;
  shapeLabel: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  badgeClasses: string;
  svgFill: string;
  svgStroke: string;
  svgText: string;
}

const CANONICAL_SORTS: SortMeta[] = [
  {
    sort: 'Process',
    symbol: 'P',
    title: 'Process',
    subtitle: 'Trust Zones / Organizational Processes',
    formalNote: 'Bounded organizational contexts, divisions, or jurisdictional trust zones (P)',
    shapeLabel: 'Hexagon Container',
    accentText: 'text-cyan-300',
    accentBg: 'bg-cyan-950/35',
    accentBorder: 'border-cyan-500/40',
    badgeClasses: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50',
    svgFill: '#083344',
    svgStroke: '#22d3ee',
    svgText: '#cffafe',
  },
  {
    sort: 'Activity',
    symbol: 'A',
    title: 'Activity',
    subtitle: 'Capabilities / Regulated Actions',
    formalNote: 'Regulated operations, data handling actions, or statutory duties (A)',
    shapeLabel: 'Diamond Action',
    accentText: 'text-emerald-300',
    accentBg: 'bg-emerald-950/35',
    accentBorder: 'border-emerald-500/40',
    badgeClasses: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
    svgFill: '#064e3b',
    svgStroke: '#34d399',
    svgText: '#d1fae5',
  },
  {
    sort: 'Role',
    symbol: 'R',
    title: 'Role',
    subtitle: 'Functional Identities / Offices',
    formalNote: 'Statutory offices, organizational titles, or authority holders (R)',
    shapeLabel: 'Shield Identity',
    accentText: 'text-indigo-300',
    accentBg: 'bg-indigo-950/35',
    accentBorder: 'border-indigo-500/40',
    badgeClasses: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/50',
    svgFill: '#1e1b4b',
    svgStroke: '#818cf8',
    svgText: '#e0e7ff',
  },
  {
    sort: 'User',
    symbol: 'U',
    title: 'User',
    subtitle: 'Named Principals / Subjects',
    formalNote: 'Concrete legal subjects, affected individuals, or named principals (U)',
    shapeLabel: 'Circle Principal',
    accentText: 'text-amber-300',
    accentBg: 'bg-amber-950/35',
    accentBorder: 'border-amber-500/40',
    badgeClasses: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
    svgFill: '#451a03',
    svgStroke: '#fbbf24',
    svgText: '#fef3c7',
  },
];

function SortIcon({ sort, className = 'w-4 h-4' }: { sort: GamSort; className?: string }) {
  switch (sort) {
    case 'Process':
      return <Hexagon className={className} aria-hidden="true" />;
    case 'Activity':
      return <Diamond className={className} aria-hidden="true" />;
    case 'Role':
      return <Shield className={className} aria-hidden="true" />;
    case 'User':
      return <UserIcon className={className} aria-hidden="true" />;
  }
}

function renderSvgSortShape(
  sort: GamSort,
  cx: number,
  cy: number,
  fill: string,
  stroke: string,
  isSelected: boolean
) {
  const strokeWidth = isSelected ? 2.8 : 1.75;
  switch (sort) {
    case 'Process': {
      // Hexagon around (cx, cy), width 136, height 44
      const w = 68;
      const h = 22;
      const cut = 14;
      const points = [
        `${cx - w + cut},${cy - h}`,
        `${cx + w - cut},${cy - h}`,
        `${cx + w},${cy}`,
        `${cx + w - cut},${cy + h}`,
        `${cx - w + cut},${cy + h}`,
        `${cx - w},${cy}`,
      ].join(' ');
      return (
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }
    case 'Activity': {
      // Diamond / Chamfered Rhombus around (cx, cy)
      const w = 72;
      const h = 25;
      const points = [
        `${cx},${cy - h}`,
        `${cx + w},${cy}`,
        `${cx},${cy + h}`,
        `${cx - w},${cy}`,
      ].join(' ');
      return (
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }
    case 'Role': {
      // Shield / Crest shape around (cx, cy)
      const w = 66;
      const h = 23;
      const d = [
        `M ${cx - w} ${cy - h}`,
        `L ${cx + w} ${cy - h}`,
        `L ${cx + w} ${cy + 2}`,
        `Q ${cx + w} ${cy + h - 2} ${cx} ${cy + h + 3}`,
        `Q ${cx - w} ${cy + h - 2} ${cx - w} ${cy + 2}`,
        'Z',
      ].join(' ');
      return (
        <path
          d={d}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }
    case 'User': {
      // Pill / Circle-ended principal capsule around (cx, cy)
      const w = 66;
      const h = 22;
      return (
        <rect
          x={cx - w}
          y={cy - h}
          width={w * 2}
          height={h * 2}
          rx={h}
          ry={h}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }
  }
}

export const GamEntityNodesView: React.FC<GamEntityNodesViewProps> = ({
  nodes,
  unmappedConcepts = [],
  selectedNodeId,
  onSelectNode,
  onHighlightSpan,
  reducedMotion = false,
}) => {
  const [activeSortFilter, setActiveSortFilter] = useState<GamSort | 'ALL'>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | 'law' | 'enterprise' | 'both'>('ALL');

  const { groupedBySort, unmappedNodes } = useMemo(() => {
    const groups: Record<GamSort, GraphNode[]> = {
      Process: [],
      Activity: [],
      Role: [],
      User: [],
    };
    const extraUnmapped: GraphNode[] = [];

    for (const node of nodes) {
      if (
        originFilter !== 'ALL' &&
        node.origin !== originFilter &&
        !(originFilter === 'law' && node.origin === 'both') &&
        !(originFilter === 'enterprise' && node.origin === 'both')
      ) {
        continue;
      }

      if (
        node.sort === 'Process' ||
        node.sort === 'Activity' ||
        node.sort === 'Role' ||
        node.sort === 'User'
      ) {
        groups[node.sort].push(node);
      } else {
        extraUnmapped.push(node);
      }
    }

    return { groupedBySort: groups, unmappedNodes: extraUnmapped };
  }, [nodes, originFilter]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const handleNodeClick = (node: GraphNode) => {
    const isAlreadySelected = selectedNodeId === node.id;
    const nextNode = isAlreadySelected ? null : node;
    onSelectNode(nextNode);
    if (nextNode?.sourceSpan) {
      onHighlightSpan({
        start: nextNode.sourceSpan.start,
        end: nextNode.sourceSpan.end,
      });
    } else if (!nextNode) {
      onHighlightSpan(null);
    }
  };

  const maxLaneCount = Math.max(
    1,
    groupedBySort.Process.length,
    groupedBySort.Activity.length,
    groupedBySort.Role.length,
    groupedBySort.User.length
  );
  const svgHeight = Math.max(240, 88 + maxLaneCount * 68);

  return (
    <div
      className="flex flex-col gap-5 text-slate-100"
      data-testid="gam-entity-nodes-view"
    >
      {/* Formal Stage 3 Header: GAM Sort Decomposition */}
      <div className="rounded-xl border border-cyan-500/25 bg-slate-950/80 p-4 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-cyan-200 uppercase">
                <Layers className="h-3.5 w-3.5" />
                Stage 3 · GAM Entity Sort Identification
              </span>
              <span className="font-mono text-xs text-slate-400">
                Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">
              Canonical 4-Sort Decomposition:{' '}
              <span className="font-mono text-cyan-300">P</span> (Process),{' '}
              <span className="font-mono text-emerald-300">A</span> (Activity),{' '}
              <span className="font-mono text-indigo-300">R</span> (Role),{' '}
              <span className="font-mono text-amber-300">U</span> (User)
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl">
              Every legal or organizational concept admitted into the GAM universe is normalized
              into one of the four disjoint primary sorts with distinct geometric notation, sort
              symbol, and provenance link. Non-governance nouns (such as penalty formulas or
              external references) remain explicitly unmapped rather than silently forced into{' '}
              <span className="font-mono">P, A, R, U</span>.
            </p>
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1">
              <Filter className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setActiveSortFilter('ALL')}
                className={`rounded px-2 py-1 font-medium transition ${
                  activeSortFilter === 'ALL'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Sorts ({nodes.filter((n) => n.sort !== 'Unmapped').length})
              </button>
              {CANONICAL_SORTS.map((meta) => (
                <button
                  key={meta.sort}
                  type="button"
                  onClick={() =>
                    setActiveSortFilter(activeSortFilter === meta.sort ? 'ALL' : meta.sort)
                  }
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 font-mono font-medium transition ${
                    activeSortFilter === meta.sort
                      ? meta.badgeClasses + ' border'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{meta.symbol}</span>
                  <span className="text-[10px] opacity-80">
                    ({groupedBySort[meta.sort].length})
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1">
              {(['ALL', 'law', 'enterprise'] as const).map((orig) => (
                <button
                  key={orig}
                  type="button"
                  onClick={() => setOriginFilter(orig)}
                  className={`rounded px-2 py-1 capitalize transition ${
                    originFilter === orig
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {orig === 'ALL' ? 'All Origins' : orig === 'law' ? 'Law (Φ_L)' : 'Enterprise (Φ_E)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive SVG Node-Placement Swimlane Preview */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 shadow-inner">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h4 className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
              Interactive GAM Sort-Partitioned Node Placement Canvas
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Hexagon className="h-3.5 w-3.5 text-cyan-400" />
              <strong className="font-mono text-cyan-300">P</strong> Hexagon = Process
            </span>
            <span className="inline-flex items-center gap-1">
              <Diamond className="h-3.5 w-3.5 text-emerald-400" />
              <strong className="font-mono text-emerald-300">A</strong> Diamond = Activity
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <strong className="font-mono text-indigo-300">R</strong> Shield = Role
            </span>
            <span className="inline-flex items-center gap-1">
              <UserIcon className="h-3.5 w-3.5 text-amber-400" />
              <strong className="font-mono text-amber-300">U</strong> Capsule = User
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#060b19]">
          <svg
            viewBox={`0 0 880 ${svgHeight}`}
            className="w-full min-w-[680px] select-none"
            role="img"
            aria-label="GAM Four-Sort Entity Node Placement Diagram"
            data-testid="gam-entity-svg-canvas"
          >
            <defs>
              <pattern
                id="gam-stage3-grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.06)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <rect width="880" height={svgHeight} fill="url(#gam-stage3-grid)" />

            {CANONICAL_SORTS.map((meta, colIdx) => {
              const colX = 20 + colIdx * 215;
              const colCenter = colX + 97;
              const laneNodes = groupedBySort[meta.sort];
              const isDimmed =
                activeSortFilter !== 'ALL' && activeSortFilter !== meta.sort;

              return (
                <g
                  key={meta.sort}
                  opacity={isDimmed ? 0.3 : 1}
                  data-testid={`svg-swimlane-${meta.sort}`}
                >
                  {/* Column lane background */}
                  <rect
                    x={colX}
                    y={14}
                    width={195}
                    height={svgHeight - 28}
                    rx={10}
                    fill="rgba(15, 23, 42, 0.65)"
                    stroke={meta.svgStroke}
                    strokeOpacity={0.28}
                    strokeWidth={1}
                  />

                  {/* Column Header Banner */}
                  <rect
                    x={colX + 8}
                    y={22}
                    width={179}
                    height={38}
                    rx={7}
                    fill={meta.svgFill}
                    stroke={meta.svgStroke}
                    strokeOpacity={0.6}
                    strokeWidth={1.2}
                  />
                  <text
                    x={colX + 22}
                    y={45}
                    fill={meta.svgText}
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    [{meta.symbol}] {meta.title}
                  </text>
                  <text
                    x={colX + 175}
                    y={45}
                    textAnchor="end"
                    fill={meta.svgText}
                    fontSize="11"
                    fontFamily="monospace"
                    opacity={0.85}
                  >
                    {laneNodes.length}
                  </text>

                  {/* Nodes in this sort column */}
                  {laneNodes.map((node, rowIdx) => {
                    const cy = 98 + rowIdx * 64;
                    const isSelected = selectedNodeId === node.id;
                    const shortLabel =
                      node.label.length > 17
                        ? `${node.label.slice(0, 16)}…`
                        : node.label;
                    const shortId =
                      node.id.length > 19 ? `${node.id.slice(0, 18)}…` : node.id;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(0, 0)`}
                        onClick={() => handleNodeClick(node)}
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={`${meta.sort} entity ${node.label} (${node.id})`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNodeClick(node);
                          }
                        }}
                      >
                        {isSelected && (
                          <rect
                            x={colCenter - 78}
                            y={cy - 29}
                            width={156}
                            height={58}
                            rx={12}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            strokeDasharray={reducedMotion ? undefined : '4 3'}
                          />
                        )}

                        {renderSvgSortShape(
                          meta.sort,
                          colCenter,
                          cy,
                          meta.svgFill,
                          isSelected ? '#ffffff' : meta.svgStroke,
                          isSelected
                        )}

                        {/* Sort symbol pill inside node */}
                        <circle
                          cx={colCenter - 48}
                          cy={cy - 6}
                          r={8}
                          fill="rgba(2, 6, 23, 0.75)"
                          stroke={meta.svgStroke}
                          strokeWidth={1}
                        />
                        <text
                          x={colCenter - 48}
                          y={cy - 2.5}
                          textAnchor="middle"
                          fill={meta.svgText}
                          fontSize="9.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {meta.symbol}
                        </text>

                        {/* Primary Node Label */}
                        <text
                          x={colCenter + 6}
                          y={cy - 3}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {shortLabel}
                        </text>

                        {/* Explicit ID & Origin tag */}
                        <text
                          x={colCenter}
                          y={cy + 12}
                          textAnchor="middle"
                          fill={meta.svgText}
                          fontSize="9"
                          fontFamily="monospace"
                          opacity={0.85}
                        >
                          {shortId} · {node.origin.toUpperCase()}
                        </text>
                      </g>
                    );
                  })}

                  {laneNodes.length === 0 && (
                    <text
                      x={colCenter}
                      y={112}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                      fontStyle="italic"
                    >
                      No {meta.sort} entities
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Four Canonical GAM Sort Swimlanes with Detailed Entity Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CANONICAL_SORTS.map((meta) => {
          const laneNodes = groupedBySort[meta.sort];
          const isHiddenByFilter =
            activeSortFilter !== 'ALL' && activeSortFilter !== meta.sort;

          if (isHiddenByFilter) {
            return null;
          }

          return (
            <section
              key={meta.sort}
              data-testid={`sort-swimlane-${meta.sort}`}
              aria-label={`${meta.title} (${meta.symbol}) Swimlane`}
              className={`flex flex-col rounded-xl border ${meta.accentBorder} ${meta.accentBg} p-3.5 shadow-md`}
            >
              {/* Swimlane Header */}
              <div className="mb-3 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border font-mono text-sm font-bold ${meta.badgeClasses}`}
                      title={`GAM Sort ${meta.symbol} (${meta.title})`}
                    >
                      {meta.symbol}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <SortIcon
                          sort={meta.sort}
                          className={`h-4 w-4 ${meta.accentText}`}
                        />
                        <h4 className="text-sm font-bold text-white">{meta.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-300">{meta.subtitle}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-xs font-semibold ${meta.badgeClasses}`}
                  >
                    {laneNodes.length}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                  {meta.formalNote}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <span>Shape: {meta.shapeLabel}</span>
                </div>
              </div>

              {/* Swimlane Node List */}
              <div className="flex flex-1 flex-col gap-2.5">
                {laneNodes.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                    No {meta.title} ({meta.symbol}) entities extracted in this provision.
                  </div>
                ) : (
                  laneNodes.map((node, idx) => {
                    const isSelected = selectedNodeId === node.id;
                    return (
                      <div
                        key={node.id}
                        data-testid={`entity-node-${node.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNodeClick(node)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNodeClick(node);
                          }
                        }}
                        style={
                          reducedMotion
                            ? undefined
                            : {
                                animationDelay: `${idx * 45}ms`,
                              }
                        }
                        className={`group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition ${
                          reducedMotion ? '' : ' duration-200 hover:-translate-y-0.5'
                        } ${
                          isSelected
                            ? 'border-cyan-400 bg-slate-900/95 ring-2 ring-cyan-400/30'
                            : 'border-slate-800/90 bg-slate-900/75 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {/* Top row: Sort badge + Label + Origin badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${meta.badgeClasses}`}
                            >
                              <SortIcon sort={meta.sort} className="h-3 w-3" />
                              {meta.symbol}:{node.sort}
                            </span>
                            <span className="truncate text-xs font-semibold text-white">
                              {node.label}
                            </span>
                          </div>

                          {/* Origin Badge: Law vs Enterprise */}
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                              node.origin === 'law'
                                ? 'border border-sky-500/40 bg-sky-500/15 text-sky-200'
                                : node.origin === 'enterprise'
                                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-200'
                                : 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                            }`}
                            title={`Entity Origin: ${node.origin}`}
                          >
                            {node.origin === 'law' ? (
                              <Scale className="h-2.5 w-2.5" />
                            ) : (
                              <Building2 className="h-2.5 w-2.5" />
                            )}
                            {node.origin}
                          </span>
                        </div>

                        {/* Explicit Identifier & Raw GAL Type */}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-slate-400">
                          <span className="truncate" title={node.id}>
                            id: <strong className="text-slate-200">{node.id}</strong>
                          </span>
                          {node.rawType && node.rawType !== node.sort && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                              raw: {node.rawType}
                            </span>
                          )}
                        </div>

                        {node.description && (
                          <p className="text-[11px] leading-snug text-slate-300 line-clamp-2">
                            {node.description}
                          </p>
                        )}

                        {/* Bottom provenance link & verification badge */}
                        <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-slate-800/70 pt-1.5 text-[10px]">
                          {node.sourceSpan ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectNode(node);
                                onHighlightSpan({
                                  start: node.sourceSpan!.start,
                                  end: node.sourceSpan!.end,
                                });
                              }}
                              className="inline-flex items-center gap-1 font-mono text-cyan-300 hover:text-cyan-200 hover:underline"
                              title="Highlight originating statutory passage"
                            >
                              <FileText className="h-3 w-3" />
                              <span>
                                span [{node.sourceSpan.start}..{node.sourceSpan.end}]
                                {node.sourceSpan.clauseId ? ` · ${node.sourceSpan.clauseId}` : ''}
                              </span>
                            </button>
                          ) : (
                            <span className="font-mono text-slate-500">
                              No direct text span
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              node.verified ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {node.verified ? 'Verified' : 'Draft'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Selected Entity Inspector Bar */}
      {selectedNode && (
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-500/40 bg-cyan-950/25 p-3.5 text-xs"
          data-testid="selected-entity-inspector"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Info className="h-4 w-4 text-cyan-300 shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-white">{selectedNode.id}</span>
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[11px] text-cyan-200">
                  Sort: {selectedNode.sort}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                  Origin: {selectedNode.origin}
                </span>
              </div>
              {selectedNode.description && (
                <p className="mt-1 text-slate-300">{selectedNode.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedNode.sourceSpan && (
              <button
                type="button"
                onClick={() =>
                  onHighlightSpan({
                    start: selectedNode.sourceSpan!.start,
                    end: selectedNode.sourceSpan!.end,
                  })
                }
                className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 font-mono text-xs text-cyan-100 hover:bg-cyan-500/30"
              >
                Highlight Source [{selectedNode.sourceSpan.start}..
                {selectedNode.sourceSpan.end}]
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onSelectNode(null);
                onHighlightSpan(null);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-300 hover:bg-slate-800"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Unmapped / Non-GAM Concepts Tray */}
      <section
        data-testid="unmapped-concepts-tray"
        aria-label="Unmapped and Non-GAM Concepts Tray"
        className="rounded-xl border border-amber-500/35 bg-amber-950/20 p-4 shadow-md"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-500/20 pb-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <h4 className="text-xs font-bold tracking-wider text-amber-200 uppercase">
                Unmapped / Non-GAM Concepts Tray (Requires Review or Outside ⟨P, A, R, U⟩)
              </h4>
              <p className="mt-0.5 text-xs text-slate-300">
                Formal Safeguard: Not every noun in a statute is a GAM entity. Monetary penalty
                formulas, statutory definitions, external citations, or temporal thresholds are
                explicitly quarantined here rather than silently forced into{' '}
                <span className="font-mono text-amber-200">Process</span>,{' '}
                <span className="font-mono text-amber-200">Activity</span>,{' '}
                <span className="font-mono text-amber-200">Role</span>, or{' '}
                <span className="font-mono text-amber-200">User</span>.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-200">
            {unmappedConcepts.length + unmappedNodes.length} unmapped
          </span>
        </div>

        {unmappedConcepts.length === 0 && unmappedNodes.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            All extracted tokens in this provision have been formally reviewed or mapped; no
            unmapped residual concepts detected.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {unmappedConcepts.map((concept) => (
              <div
                key={concept.id}
                data-testid={`unmapped-concept-${concept.id}`}
                onClick={() => concept.sourceSpan && onHighlightSpan({ start: concept.sourceSpan.start, end: concept.sourceSpan.end })}
                role={concept.sourceSpan ? 'button' : undefined}
                tabIndex={concept.sourceSpan ? 0 : undefined}
                onKeyDown={(e) => {
                  if (concept.sourceSpan && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onHighlightSpan({ start: concept.sourceSpan.start, end: concept.sourceSpan.end });
                  }
                }}
                className="flex flex-col justify-between gap-1.5 rounded-lg border border-amber-500/30 bg-slate-950/75 p-2.5 text-left transition hover:border-amber-400/60 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-amber-100">
                    “{concept.label}”
                  </span>
                  <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                    {concept.category}
                  </span>
                </div>
                {concept.notes && (
                  <p className="text-[11px] text-slate-300">{concept.notes}</p>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>id: {concept.id}</span>
                  <span className="text-amber-300">
                    {concept.sourceSpan ? `span [${concept.sourceSpan.start}..${concept.sourceSpan.end}]` : 'No source span available'}
                  </span>
                </div>
              </div>
            ))}

            {unmappedNodes.map((node) => (
              <div
                key={node.id}
                data-testid={`entity-node-${node.id}`}
                onClick={() => handleNodeClick(node)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNodeClick(node);
                  }
                }}
                className="flex flex-col justify-between gap-1.5 rounded-lg border border-amber-500/30 bg-slate-950/75 p-2.5 text-left transition hover:border-amber-400/60 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-amber-100">
                    {node.label}
                  </span>
                  <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                    Unmapped ({node.rawType})
                  </span>
                </div>
                {node.description && (
                  <p className="text-[11px] text-slate-300">{node.description}</p>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>id: {node.id}</span>
                  {node.sourceSpan && (
                    <span className="text-amber-300">
                      span [{node.sourceSpan.start}..{node.sourceSpan.end}]
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default GamEntityNodesView;
