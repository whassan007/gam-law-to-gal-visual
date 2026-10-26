import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
  type Simulation, type SimulationLinkDatum, type SimulationNodeDatum,
} from 'd3-force';
import { MousePointer2, Plus, Maximize2, ZoomIn, ZoomOut, Shuffle } from 'lucide-react';
import type { GamSort } from '../../types/contracts';
import { useEditor, highlightedIds } from './editorState';
import {
  DEONTIC_OPERATORS, OPERATOR_META, STRUCTURAL_COLOR, listEdges, operatorInfo, statusFor, type DeonticOperator,
} from './deontic';
import { sortColors, sortLetter, btnGhost } from './ui';
import { entitySort } from '../../engine/gam-adapter';

const R = 30;
const LANE: Record<GamSort | 'Unmapped', number> = { User: 0, Role: 1, Activity: 2, Process: 3, Unmapped: 4 };

interface SimNode extends SimulationNodeDatum {
  id: string;
  sort: GamSort | 'Unmapped';
  label: string;
}

export type OperatorFilter = Record<DeonticOperator | 'Structural', boolean>;
export const ALL_VISIBLE: OperatorFilter = { Must: true, Shall: true, May: true, Can: true, Prohibits: true, Structural: true };

export interface GraphCanvasHandle {
  fit: () => void;
  zoomBy: (factor: number) => void;
  relayout: () => void;
  getSvgMarkup: () => string | null;
}

type Drag =
  | { kind: 'node'; id: string; startX: number; startY: number; moved: boolean }
  | { kind: 'pan'; startX: number; startY: number; tx: number; ty: number; moved: boolean }
  | { kind: 'connect'; from: string; x: number; y: number }
  | { kind: 'rewire'; edgeId: string; end: 'source' | 'target'; x: number; y: number };

function wrapLabel(label: string, max = 16): string[] {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) return [lines[0], `${lines[1].slice(0, max - 1)}…`];
  return lines;
}

export const DeonticGraphCanvas = forwardRef<GraphCanvasHandle, {
  filter: OperatorFilter;
  onFilterChange: (f: OperatorFilter) => void;
  onEditEntity?: (id: string) => void;
  reducedMotion?: boolean;
  className?: string;
}>(({ filter, onFilterChange, onEditEntity, reducedMotion = false, className = '' }, ref) => {
  const { doc, result, issues, selection, select, dispatch, readOnly } = useEditor();
  const model = result.galModel;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 640, h: 440 });
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [, setFrame] = useState(0);
  const [mode, setMode] = useState<'select' | 'connect'>('select');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const positions = useRef(new Map<string, SimNode>());
  const simRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(null);
  const didFit = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Simulation: reuse positions across edits so the layout stays put while you work.
  const nodes: SimNode[] = useMemo(() => model.entities.map((e) => {
    const prev = positions.current.get(e.id);
    const sort = entitySort(e) ?? 'Unmapped';
    const node: SimNode = prev ?? { id: e.id, sort, label: e.name ?? e.id, x: 120 + LANE[sort] * 150, y: 80 + (positions.current.size % 5) * 70 };
    node.sort = sort;
    node.label = e.name ?? e.id;
    return node;
  }), [model.entities]);

  const refs = useMemo(() => listEdges(model), [model]);
  const structureKey = useMemo(() => `${nodes.map((n) => `${n.id}:${n.sort}`).join(',')}|${refs.map((r) => `${r.edge.source}>${r.edge.target}`).join(',')}`, [nodes, refs]);

  useEffect(() => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    const isNew = nodes.some((n) => !positions.current.has(n.id));
    positions.current = map;
    const links = refs.filter((r) => map.has(r.edge.source) && map.has(r.edge.target) && r.edge.source !== r.edge.target)
      .map((r) => ({ source: r.edge.source, target: r.edge.target }));
    simRef.current?.stop();
    const sim = forceSimulation<SimNode>(nodes)
      .force('link', forceLink<SimNode, SimulationLinkDatum<SimNode>>(links).id((d) => d.id).distance(140).strength(0.4))
      .force('charge', forceManyBody().strength(-520))
      .force('collide', forceCollide(R + 22))
      .force('x', forceX<SimNode>((d) => 100 + LANE[d.sort] * 170).strength(0.12))
      .force('y', forceY(200).strength(0.06))
      .stop();
    simRef.current = sim;
    if (!didFit.current || reducedMotion) {
      // First layout (and reduced motion) is computed synchronously: deterministic and no jiggle.
      sim.alpha(didFit.current ? 0.3 : 1);
      for (let i = 0; i < 220; i++) sim.tick();
      setFrame((f) => f + 1);
    } else if (isNew) {
      sim.alpha(0.35).restart();
    }
    let raf = 0;
    sim.on('tick', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setFrame((f) => f + 1)); });
    return () => { sim.stop(); cancelAnimationFrame(raf); };
    // structureKey captures every change that should re-seed forces
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey, reducedMotion]);

  const fit = useCallback(() => {
    const pts = [...positions.current.values()];
    if (!pts.length) return;
    const xs = pts.map((p) => p.x ?? 0), ys = pts.map((p) => p.y ?? 0);
    const pad = R + 40;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad + 20;
    const k = Math.min(1.6, Math.max(0.3, Math.min(size.w / (maxX - minX), size.h / (maxY - minY))));
    setTransform({ k, x: (size.w - (maxX + minX) * k) / 2, y: (size.h - (maxY + minY) * k) / 2 });
  }, [size]);

  useEffect(() => { if (!didFit.current && nodes.length) { fit(); didFit.current = true; } }, [fit, nodes.length]);
  useEffect(() => { fit(); /* refit when the canvas is resized */ }, [size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomBy = useCallback((factor: number, cx = size.w / 2, cy = size.h / 2) => {
    setTransform((t) => {
      const k = Math.min(3, Math.max(0.25, t.k * factor));
      return { k, x: cx - ((cx - t.x) * k) / t.k, y: cy - ((cy - t.y) * k) / t.k };
    });
  }, [size]);

  const relayout = useCallback(() => {
    for (const n of positions.current.values()) { n.fx = null; n.fy = null; }
    const sim = simRef.current;
    if (!sim) return;
    if (reducedMotion) { sim.alpha(1); for (let i = 0; i < 220; i++) sim.tick(); setFrame((f) => f + 1); fit(); }
    else sim.alpha(0.9).restart();
  }, [fit, reducedMotion]);

  useImperativeHandle(ref, () => ({
    fit, zoomBy, relayout,
    getSvgMarkup: () => svgRef.current?.outerHTML ?? null,
  }), [fit, zoomBy, relayout]);

  // Native non-passive wheel listener so the page doesn't scroll while zooming.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - rect.left, e.clientY - rect.top);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const toGraph = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - transform.x) / transform.k, y: (clientY - rect.top - transform.y) / transform.k };
  };
  const nodeAt = (x: number, y: number) => [...positions.current.values()].find((n) => Math.hypot((n.x ?? 0) - x, (n.y ?? 0) - y) <= R + 4);

  // ── Pointer handling
  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = toGraph(e.clientX, e.clientY);
    if (mode === 'connect' && !readOnly) setDrag({ kind: 'connect', from: id, x: p.x, y: p.y });
    else setDrag({ kind: 'node', id, startX: e.clientX, startY: e.clientY, moved: false });
  };
  const onHandlePointerDown = (e: React.PointerEvent, edgeId: string, end: 'source' | 'target') => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = toGraph(e.clientX, e.clientY);
    setDrag({ kind: 'rewire', edgeId, end, x: p.x, y: p.y });
  };
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ kind: 'pan', startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y, moved: false });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    if (drag.kind === 'pan') {
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      setTransform((t) => ({ ...t, x: drag.tx + dx, y: drag.ty + dy }));
      if (!drag.moved && Math.hypot(dx, dy) > 3) setDrag({ ...drag, moved: true });
    } else if (drag.kind === 'node') {
      const moved = drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 3;
      if (moved) {
        const n = positions.current.get(drag.id);
        const p = toGraph(e.clientX, e.clientY);
        if (n) { n.fx = p.x; n.fy = p.y; n.x = p.x; n.y = p.y; }
        if (!reducedMotion) simRef.current?.alphaTarget(0.2).restart();
        setFrame((f) => f + 1);
        if (!drag.moved) setDrag({ ...drag, moved: true });
      }
    } else {
      const p = toGraph(e.clientX, e.clientY);
      setDrag({ ...drag, x: p.x, y: p.y });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    simRef.current?.alphaTarget(0);
    if (drag.kind === 'node' && !drag.moved) select({ kind: 'node', id: drag.id });
    if (drag.kind === 'pan' && !drag.moved) { select({ kind: 'none' }); setRenaming(null); }
    if (drag.kind === 'connect') {
      const p = toGraph(e.clientX, e.clientY);
      const target = nodeAt(p.x, p.y);
      if (target && target.id !== drag.from) select({ kind: 'pending', source: drag.from, target: target.id });
    }
    if (drag.kind === 'rewire') {
      const p = toGraph(e.clientX, e.clientY);
      const target = nodeAt(p.x, p.y);
      if (target) dispatch({ type: 'rewire', edgeId: drag.edgeId, end: drag.end, nodeId: target.id });
    }
    setDrag(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setMode('select'); setDrag(null); if (selection.kind === 'pending') select({ kind: 'none' }); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.kind === 'edge' && !readOnly && !renaming) {
      e.preventDefault();
      dispatch({ type: 'delete-edge', edgeId: selection.id });
    }
  };

  // ── Geometry
  const hl = highlightedIds(selection, doc, result.clauses);
  const hasFocus = hl.nodes.size > 0 || hl.edges.size > 0;
  const pairCount = new Map<string, number>();
  const pairIndex = new Map<string, number>();
  for (const r of refs) {
    const k = [r.edge.source, r.edge.target].sort().join('\u0000');
    pairIndex.set(r.edge.id!, pairCount.get(k) ?? 0);
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }

  const visibleEdges = refs.map((r) => {
    const info = operatorInfo(r, doc.annotations[r.edge.id!]);
    const key = info.operator ?? 'Structural';
    return { r, info, key, visible: filter[key] };
  });

  const edgeGeometry = (sourceId: string, targetId: string, id: string, override?: { end: 'source' | 'target'; x: number; y: number }) => {
    const s = positions.current.get(sourceId), t = positions.current.get(targetId);
    if (!s || !t) return null;
    let sx = s.x ?? 0, sy = s.y ?? 0, tx = t.x ?? 0, ty = t.y ?? 0;
    if (override?.end === 'source') { sx = override.x; sy = override.y; }
    if (override?.end === 'target') { tx = override.x; ty = override.y; }
    if (sourceId === targetId && !override) {
      const d = `M ${sx - 12} ${sy - R} C ${sx - 50} ${sy - R - 70}, ${sx + 50} ${sy - R - 70}, ${sx + 12} ${sy - R}`;
      return { d, lx: sx, ly: sy - R - 52, start: { x: sx - 12, y: sy - R }, end: { x: sx + 12, y: sy - R } };
    }
    const k = [sourceId, targetId].sort().join('\u0000');
    const n = pairCount.get(k) ?? 1;
    const idx = pairIndex.get(id) ?? 0;
    const flip = sourceId > targetId ? -1 : 1;
    const offset = (idx - (n - 1) / 2) * 34 * flip;
    const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const cx = (sx + tx) / 2 + nx * offset, cy = (sy + ty) / 2 + ny * offset;
    const trim = (px: number, py: number, qx: number, qy: number, by: number) => {
      const l = Math.hypot(qx - px, qy - py) || 1;
      return { x: px + ((qx - px) / l) * by, y: py + ((qy - py) / l) * by };
    };
    const start = override?.end === 'source' ? { x: sx, y: sy } : trim(sx, sy, cx, cy, R);
    const end = override?.end === 'target' ? { x: tx, y: ty } : trim(tx, ty, cx, cy, R + 4);
    return { d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`, lx: 0.25 * start.x + 0.5 * cx + 0.25 * end.x, ly: 0.25 * start.y + 0.5 * cy + 0.25 * end.y, start, end };
  };

  const markerFor = (key: string) => `ed-arrow-${key}`;
  const colorFor = (key: string) => (key === 'Structural' ? STRUCTURAL_COLOR : OPERATOR_META[key as DeonticOperator].color);
  const renamingNode = renaming ? positions.current.get(renaming.id) : undefined;

  return (
    <div className={`relative flex min-h-0 flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-ed-border px-2 py-1.5" role="toolbar" aria-label="Graph tools">
        <button type="button" className={`${btnGhost} ${mode === 'select' ? 'bg-ed-sunken text-ed-text' : ''}`} aria-pressed={mode === 'select'} onClick={() => setMode('select')} title="Select and move (Esc)">
          <MousePointer2 className="h-3.5 w-3.5" /> Select
        </button>
        {!readOnly && (
          <button type="button" data-testid="graph-connect-mode" className={`${btnGhost} ${mode === 'connect' ? 'bg-ed-accent-soft text-ed-accent' : ''}`} aria-pressed={mode === 'connect'} onClick={() => setMode((m) => (m === 'connect' ? 'select' : 'connect'))} title="New relation: drag from one node to another">
            <Plus className="h-3.5 w-3.5" /> New relation
          </button>
        )}
        <span className="mx-1 h-4 w-px bg-ed-border" aria-hidden="true" />
        <button type="button" className={btnGhost} onClick={() => zoomBy(1.2)} aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
        <button type="button" className={btnGhost} onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button type="button" className={btnGhost} onClick={fit} data-testid="graph-fit-view"><Maximize2 className="h-3.5 w-3.5" /> Fit</button>
        <button type="button" className={btnGhost} onClick={relayout}><Shuffle className="h-3.5 w-3.5" /> Auto-layout</button>
        <fieldset className="ml-auto flex flex-wrap items-center gap-1" aria-label="Filter by deontic operator">
          <legend className="sr-only">Show operators</legend>
          {[...DEONTIC_OPERATORS, 'Structural' as const].map((op) => (
            <label key={op} className="op-badge cursor-pointer select-none" style={{ ['--op-color' as string]: colorFor(op), opacity: filter[op] ? 1 : 0.45 }}>
              <input type="checkbox" className="h-3 w-3 accent-current" checked={filter[op]} onChange={(e) => onFilterChange({ ...filter, [op]: e.target.checked })} data-testid={`graph-filter-${op}`} />
              {op}
            </label>
          ))}
        </fieldset>
      </div>

      <div ref={wrapRef} className="relative min-h-[320px] flex-1 overflow-hidden bg-ed-bg">
        <svg
          ref={svgRef}
          data-testid="deontic-graph-svg"
          role="application"
          aria-label="Deontic logic graph. Tab to a node or edge, Enter to select, Delete removes a selected edge, Escape cancels."
          tabIndex={0}
          width={size.w}
          height={size.h}
          className={`block h-full w-full touch-none select-none ${mode === 'connect' ? 'cursor-crosshair' : drag?.kind === 'pan' ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {[...DEONTIC_OPERATORS, 'Structural'].map((k) => (
              <marker key={k} id={markerFor(k)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: colorFor(k) }} />
              </marker>
            ))}
          </defs>
          <rect width={size.w} height={size.h} fill="transparent" onPointerDown={onBackgroundPointerDown} />
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            {/* Edges */}
            {visibleEdges.map(({ r, info, key, visible }) => {
              if (!visible) return null;
              const override = drag?.kind === 'rewire' && drag.edgeId === r.edge.id ? { end: drag.end, x: drag.x, y: drag.y } : undefined;
              const g = edgeGeometry(r.edge.source, r.edge.target, r.edge.id!, override);
              if (!g) return null;
              const selected = selection.kind === 'edge' && selection.id === r.edge.id;
              const dim = hasFocus && !hl.edges.has(r.edge.id!);
              const status = statusFor(issues, (i) => i.edgeIds.includes(r.edge.id!));
              const confidence = doc.annotations[r.edge.id!]?.confidence;
              const label = `${info.operator ?? r.edge.type}${info.inferred ? '*' : ''}${confidence !== undefined ? ` · ${confidence.toFixed(2)}` : ''}`;
              const color = colorFor(key);
              const name = (id: string) => model.entities.find((e) => e.id === id)?.name ?? id;
              return (
                <g
                  key={r.edge.id}
                  className="ed-graph-edge"
                  opacity={dim ? 0.25 : 1}
                  data-testid={`graph-edge-${r.edge.id}`}
                  data-operator={info.operator ?? 'Structural'}
                  role="button"
                  tabIndex={0}
                  aria-label={`${info.operator ?? 'Structural'} ${r.edge.type} from ${name(r.edge.source)} to ${name(r.edge.target)}${status !== 'ok' ? `, ${status}` : ''}`}
                  aria-pressed={selected}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select({ kind: 'edge', id: r.edge.id! }); } }}
                >
                  <path d={g.d} fill="none" stroke="transparent" strokeWidth={14} className="cursor-pointer" onPointerDown={(e) => { e.stopPropagation(); select({ kind: 'edge', id: r.edge.id! }); }} />
                  <path
                    d={g.d}
                    fill="none"
                    style={{ stroke: color }}
                    strokeWidth={selected ? 3.5 : key === 'Structural' ? 1.5 : 2.25}
                    strokeDasharray={key === 'Prohibits' ? '7 4' : key === 'Structural' ? '2 4' : undefined}
                    markerEnd={`url(#${markerFor(key)})`}
                    pointerEvents="none"
                  />
                  <g transform={`translate(${g.lx} ${g.ly})`} pointerEvents="none">
                    <rect x={-(label.length * 3.1 + 14)} y={-9} width={label.length * 6.2 + 28} height={18} rx={9} style={{ fill: 'var(--color-bg-secondary)', stroke: selected ? color : 'var(--color-border)' }} />
                    <text x={-6} y={4} textAnchor="middle" fontSize={10.5} fontWeight={600} style={{ fill: color }}>{label}</text>
                    <text x={label.length * 3.1 + 6} y={4} textAnchor="middle" fontSize={11} fontWeight={700} style={{ fill: status === 'error' ? 'var(--color-error)' : status === 'warning' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {status === 'error' ? '✕' : status === 'warning' ? '!' : '✓'}
                    </text>
                  </g>
                  {selected && !readOnly && (['source', 'target'] as const).map((end) => {
                    const pt = end === 'source' ? g.start : g.end;
                    return (
                      <circle
                        key={end}
                        cx={pt.x}
                        cy={pt.y}
                        r={6}
                        className="cursor-move"
                        style={{ fill: 'var(--color-bg-secondary)', stroke: color }}
                        strokeWidth={2}
                        onPointerDown={(e) => onHandlePointerDown(e, r.edge.id!, end)}
                        data-testid={`edge-handle-${end}`}
                      >
                        <title>Drag to rewire the {end}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}

            {/* Rubber band for new relations */}
            {drag?.kind === 'connect' && positions.current.get(drag.from) && (
              <line x1={positions.current.get(drag.from)!.x} y1={positions.current.get(drag.from)!.y} x2={drag.x} y2={drag.y} style={{ stroke: 'var(--color-accent)' }} strokeWidth={2} strokeDasharray="5 4" pointerEvents="none" />
            )}

            {/* Nodes */}
            {[...positions.current.values()].map((n) => {
              const c = sortColors(n.sort);
              const selected = selection.kind === 'node' && selection.id === n.id;
              const related = hl.nodes.has(n.id);
              const dim = hasFocus && !related;
              const status = statusFor(issues, (i) => i.entityIds.includes(n.id));
              const lines = wrapLabel(n.label);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                  opacity={dim ? 0.35 : 1}
                  data-testid={`graph-node-${n.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.sort} ${n.label}${status !== 'ok' ? `, ${status}` : ''}`}
                  aria-pressed={selected}
                  className={mode === 'connect' ? 'cursor-crosshair' : 'cursor-pointer'}
                  onPointerDown={(e) => onNodePointerDown(e, n.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); if (!readOnly) setRenaming({ id: n.id, value: n.label }); }}
                  onContextMenu={(e) => { e.preventDefault(); select({ kind: 'node', id: n.id }); onEditEntity?.(n.id); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select({ kind: 'node', id: n.id }); }
                    if (e.key === 'F2' && !readOnly) setRenaming({ id: n.id, value: n.label });
                  }}
                >
                  {(selected || related) && <circle r={R + 6} fill="none" style={{ stroke: 'var(--color-accent)' }} strokeWidth={selected ? 3 : 1.5} strokeDasharray={selected ? undefined : '3 3'} />}
                  <circle r={R} style={{ fill: c.fill, stroke: c.stroke }} strokeWidth={2} />
                  <text y={-4} textAnchor="middle" fontSize={15} fontWeight={700} style={{ fill: c.stroke }} pointerEvents="none">{sortLetter(n.sort)}</text>
                  <text y={12} textAnchor="middle" fontSize={8.5} style={{ fill: c.stroke }} pointerEvents="none">{n.sort === 'Unmapped' ? 'untyped' : n.sort.toLowerCase()}</text>
                  {lines.map((line, i) => (
                    <text key={i} y={R + 15 + i * 13} textAnchor="middle" fontSize={11.5} fontWeight={500} style={{ fill: 'var(--color-text-primary)', paintOrder: 'stroke', stroke: 'var(--color-bg-primary)', strokeWidth: 3 }} pointerEvents="none">{line}</text>
                  ))}
                  {status !== 'ok' && (
                    <g transform={`translate(${R * 0.72} ${-R * 0.72})`} pointerEvents="none">
                      <circle r={7} style={{ fill: status === 'error' ? 'var(--color-error)' : 'var(--color-warning)' }} />
                      <text y={3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">{status === 'error' ? '✕' : '!'}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {renaming && renamingNode && (
          <input
            autoFocus
            aria-label="Rename entity"
            data-testid="graph-inline-rename"
            className="absolute z-10 w-40 -translate-x-1/2 rounded-md border border-ed-accent bg-ed-surface px-2 py-1 text-xs text-ed-text shadow"
            style={{ left: transform.x + (renamingNode.x ?? 0) * transform.k, top: transform.y + ((renamingNode.y ?? 0) + R + 4) * transform.k }}
            value={renaming.value}
            onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { dispatch({ type: 'rename-entity', id: renaming.id, name: renaming.value }); setRenaming(null); }
              if (e.key === 'Escape') setRenaming(null);
            }}
            onBlur={() => { dispatch({ type: 'rename-entity', id: renaming.id, name: renaming.value }); setRenaming(null); }}
          />
        )}

        {nodes.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-ed-subtle">No entities yet. Add concepts in Stage 2 or entities in Stage 3.</p>
        )}
        <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-ed-surface/90 px-2 py-1 text-[11px] text-ed-subtle shadow-sm">
          {mode === 'connect' ? 'Drag from a node to another node to create a relation · Esc to cancel' : 'Scroll to zoom · drag canvas to pan · double-click a node to rename · right-click to edit'}
        </p>
      </div>
    </div>
  );
});
DeonticGraphCanvas.displayName = 'DeonticGraphCanvas';
