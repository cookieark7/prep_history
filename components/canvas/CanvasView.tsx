"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ReactFlow, ReactFlowProvider, Handle, Position, useInternalNode, useReactFlow,
  type Node, type Edge, type NodeProps, type EdgeProps,
} from "@xyflow/react";
import type { CauseEdge, CauseGraphBlock, CauseNode, Layer } from "@/lib/contracts";
import {
  layoutCauseGraph, LANES, NODE_H, NODE_W, type CauseGraphLayout,
} from "@/lib/layout/cause-graph-layout";
import { edgeKey, pathBetween, reachable, rippleOrder, rulerTicks } from "@/lib/graph";
import { useWorkspace } from "@/lib/store/workspace";
import { useCanvas, type CanvasTool } from "./canvas-store";
import { NodeCard } from "./NodeCard";
import { ArrowDefs, EdgeStroke, ShapeAt } from "@/components/blocks/GraphGlyphs";
import { GraphLegend } from "@/components/blocks/CauseGraphBlock";
import { ConfidenceDot, LAYER_LABEL, LayerShape } from "@/components/ui/marks";
import { Icon, type IconName } from "@/components/ui/icons";
import { NoteForm } from "@/components/notes/NoteForm";
import { GraphQuizButton } from "@/components/quiz/GraphQuizButton";
import { CauseList } from "@/components/blocks/CauseList";

type CauseData = { node: CauseNode; state: "normal" | "lit" | "dim"; selected: boolean; pathEnd: boolean; flash: boolean };
type LaneData = { layer: Exclude<Layer, "event"> };
type RulerData = { ticks: { t: number; x: number }[]; width: number };
type CauseRFNode = Node<CauseData, "cause">;
type LaneRFNode = Node<LaneData, "lane">;
type RulerRFNode = Node<RulerData, "ruler">;
type ConfRFEdge = Edge<{ edge: CauseEdge; state: "normal" | "lit" | "dim" }, "conf">;

const nodeTypes = { cause: CauseNodeView, lane: LaneLabel, ruler: YearsRuler };
const edgeTypes = { conf: ConfEdge };

export function CanvasView() {
  const blocks = useWorkspace((s) => s.blocks);
  const graphs = useMemo(() => blocks.filter((b): b is CauseGraphBlock => b.type === "cause_graph"), [blocks]);
  const focusId = useWorkspace((s) => s.focusId);
  const graphId = useCanvas((s) => s.graphId);
  const graph = graphs.find((g) => g.id === graphId) ?? graphs.find((g) => g.id === focusId) ?? graphs[0];
  const narrow = useNarrow();

  if (!graph) {
    return (
      <div className="grid h-[calc(100dvh-57px)] place-items-center px-6 text-center">
        <div>
          <svg width="160" height="90" viewBox="0 0 160 90" aria-hidden className="mx-auto mb-4 text-rule-strong">
            <rect x="8" y="10" width="34" height="22" fill="none" stroke="currentColor" strokeDasharray="4 4" />
            <rect x="8" y="58" width="34" height="22" fill="none" stroke="currentColor" strokeDasharray="4 4" />
            <rect x="110" y="32" width="42" height="26" rx="5" fill="none" stroke="currentColor" strokeDasharray="4 4" />
            <path d="M42 21 C80 21 80 45 110 45 M42 69 C80 69 80 45 110 45" fill="none" stroke="currentColor" strokeDasharray="4 4" />
          </svg>
          <p className="font-heading text-[20px]">No cause map in this lesson yet.</p>
          <p className="mt-1 text-[13.5px] text-muted">Ask “why did … happen?” and one will appear here.</p>
        </div>
      </div>
    );
  }
  if (narrow) return <PhoneMap graph={graph} graphs={graphs} />;
  return (
    <ReactFlowProvider>
      <GraphCanvas key={graph.id} graph={graph} graphs={graphs} />
    </ReactFlowProvider>
  );
}

const NARROW = "(max-width: 767px)";
function useNarrow() {
  return useSyncExternalStore(
    (on) => { const mq = matchMedia(NARROW); mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); },
    () => matchMedia(NARROW).matches,
    () => false,
  );
}

/** Phones: the map as steps (CauseList), with a switcher when the lesson has more than one map. */
function PhoneMap({ graph, graphs }: { graph: CauseGraphBlock; graphs: CauseGraphBlock[] }) {
  return (
    <div className="mx-auto max-w-[680px] px-4 pb-40 pt-6">
      {graphs.length > 1 && (
        <div role="group" aria-label="Cause maps in this lesson" className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 scroll-thin">
          {graphs.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={g.id === graph.id}
              onClick={() => useCanvas.getState().open(g.id, null)}
              className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-[14px] ${g.id === graph.id ? "bg-text font-semibold text-bg" : "bg-sunk text-text"}`}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}
      <h1 className="font-heading text-[24px] font-bold leading-tight">{graph.title}</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">On a phone the map reads as steps. The drawn map is on a larger screen.</p>
      <div className="mt-5"><CauseList block={graph} /></div>
      <div className="mt-6"><GraphQuizButton graph={graph} /></div>
    </div>
  );
}

function GraphCanvas({ graph, graphs }: { graph: CauseGraphBlock; graphs: CauseGraphBlock[] }) {
  const lay = useMemo(() => layoutCauseGraph(graph.nodes), [graph.nodes]);
  const { selected, tool, pathEnds, lit, set } = useCanvas();
  const flash = useWorkspace((s) => (s.flash?.id === graph.id ? s.flash.node : null));
  const [noteAt, setNoteAt] = useState<{ node: CauseNode; x: number; y: number } | null>(null);
  const rf = useReactFlow();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRipple = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => stopRipple, []);
  // tool keys (the toolbar advertises them): v select, n note, p highlight path
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      const tool = ({ v: "select", n: "note", p: "path" } as const)[e.key as "v" | "n" | "p"];
      if (!tool) return;
      e.preventDefault();
      useCanvas.getState().set({ tool, pathEnds: [], ...(tool === "path" ? { lit: null } : {}) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!flash) return;
    set({ selected: flash });
    const p = lay.byId[flash];
    if (p) rf.setCenter(p.x + p.w / 2, p.y + p.h / 2, { zoom: 1.1, duration: 400 });
  }, [flash, lay, rf, set]);

  const nodes = useMemo(() => buildNodes(graph, lay, lit, selected, pathEnds, flash), [graph, lay, lit, selected, pathEnds, flash]);
  const edges = useMemo<ConfRFEdge[]>(() => graph.edges.map((e) => ({
    id: edgeKey(e), source: e.from, target: e.to, type: "conf", selectable: false,
    data: { edge: e, state: !lit ? "normal" : lit.edges.includes(edgeKey(e)) ? "lit" : "dim" },
  })), [graph.edges, lit]);

  const trace = useCallback((id: string) => {
    stopRipple();
    const anc = reachable(id, graph.edges, "back");
    const ns = [id, ...anc];
    set({ lit: { nodes: ns, edges: graph.edges.filter((e) => ns.includes(e.from) && ns.includes(e.to)).map(edgeKey), label: `Causes behind “${graph.nodes.find((n) => n.id === id)?.label}”` } });
  }, [graph, set]);

  const ripple = useCallback((id: string) => {
    stopRipple();
    const desc = reachable(id, graph.edges, "forward");
    const order = rippleOrder(graph, id, desc);
    const label = `What “${graph.nodes.find((n) => n.id === id)?.label}” led to`;
    const step = (k: number) => {
      const ns = [id, ...order.slice(0, k)];
      set({ lit: { nodes: ns, edges: graph.edges.filter((e) => ns.includes(e.from) && ns.includes(e.to)).map(edgeKey), label } });
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !order.length) return step(order.length);
    let k = 0;
    step(0);
    timer.current = setInterval(() => {
      k++;
      step(k);
      if (k >= order.length) stopRipple();
    }, 480);
  }, [graph, set]);

  const onNodeClick = (evt: React.MouseEvent, n: Node) => {
    if (n.type !== "cause") return;
    const id = n.id;
    if (tool === "path") {
      const ends = pathEnds.length >= 2 ? [id] : [...pathEnds, id];
      if (ends.length === 2) {
        const p = pathBetween(graph, ends[0], ends[1]);
        set({ pathEnds: ends, lit: p ? { nodes: p.nodes, edges: p.edges, label: "Path between the two selected events" } : { nodes: ends, edges: [], label: "No causal path between these two" } });
      } else set({ pathEnds: ends, lit: null });
      return;
    }
    if (tool === "note") {
      const node = graph.nodes.find((x) => x.id === id)!;
      setNoteAt({ node, x: evt.clientX, y: evt.clientY });
      return;
    }
    set({ selected: id });
  };

  const tools: { id: CanvasTool; label: string; icon: IconName; key: string }[] = [
    { id: "select", label: "Select", icon: "select", key: "v" },
    { id: "note", label: "Note", icon: "note", key: "n" },
    { id: "path", label: "Highlight path", icon: "path", key: "p" },
  ];

  return (
    <div className="relative h-[calc(100dvh-57px)] w-full overflow-hidden" style={{ backgroundImage: "radial-gradient(var(--rule) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <svg width="0" height="0" className="absolute"><ArrowDefs /></svg>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => { stopRipple(); set({ selected: null, lit: null, pathEnds: [] }); setNoteAt(null); }}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.25}
        maxZoom={2.2}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        aria-label={`Canvas: ${graph.title}`}
      />

      {/* floating toolbar */}
      <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-rule bg-surface p-1 shadow-[var(--shadow-float)]" role="toolbar" aria-label="Canvas tools">
        {tools.map((t) => {
          const I = Icon[t.icon];
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={tool === t.id}
              title={`${t.label} (${t.key})`}
              onClick={() => set({ tool: t.id, pathEnds: [], lit: t.id === "path" ? null : lit })}
              className={`inline-flex h-9 items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] ${tool === t.id ? "bg-text text-bg" : "text-muted hover:bg-hover hover:text-text"}`}
            >
              <I size={14} /> <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
        <span className="mx-1 h-5 w-px bg-rule" />
        <button type="button" title="Fit view" onClick={() => rf.fitView({ padding: 0.12, duration: 300 })} className="inline-flex h-9 items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] text-muted hover:bg-hover hover:text-text">
          <Icon.fit size={14} /> <span className="hidden sm:inline">Fit view</span>
        </button>
        <GraphQuizButton graph={graph} />
      </div>

      {graphs.length > 1 && (
        <label className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-rule bg-surface px-2 text-[12.5px] shadow-[var(--shadow-float)]">
          <span className="sr-only">Graph</span>
          <select value={graph.id} onChange={(e) => useCanvas.getState().open(e.target.value)} className="h-9 max-w-56 bg-transparent outline-none pointer-coarse:text-[16px]">
            {graphs.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </label>
      )}

      {/* status line for highlight modes */}
      {(lit || tool !== "select") && (
        <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-md border border-rule bg-surface px-3 py-1.5 text-[12.5px] shadow-[var(--shadow-float)] md:bottom-28">
          {lit ? lit.label : tool === "path" ? (pathEnds.length ? "Now pick the second event" : "Pick two events to highlight the path between them") : "Click an event to attach a note"}
          {lit && <button type="button" onClick={() => { stopRipple(); set({ lit: null, pathEnds: [] }); }} className="ml-2 text-accent hover:underline">Clear</button>}
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 hidden rounded-md border border-rule bg-surface px-3 py-2 text-[12.5px] text-muted shadow-[var(--shadow-float)] lg:block">
        <div className="mb-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {LANES.map((l) => <span key={l} className="inline-flex items-center gap-1"><LayerShape layer={l} size={10} />{LAYER_LABEL[l]}</span>)}
        </div>
        <GraphLegend />
      </div>

      {selected && graph.nodes.some((n) => n.id === selected) && (
        <div className="absolute inset-x-3 bottom-3 z-20 max-h-[55%] md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:h-[calc(100%-2rem)] md:max-h-none md:w-[340px]">
          <NodeCard
            block={graph}
            nodeId={selected}
            onClose={() => set({ selected: null })}
            onTrace={() => trace(selected)}
            onRipple={() => ripple(selected)}
            onSelect={(id) => {
              set({ selected: id });
              const p = lay.byId[id];
              if (p) rf.setCenter(p.x + p.w / 2, p.y + p.h / 2, { zoom: rf.getZoom(), duration: 300 });
            }}
          />
        </div>
      )}

      {noteAt && (
        <div className="fixed z-50" style={{ left: Math.min(noteAt.x, window.innerWidth - 300), top: Math.min(noteAt.y + 10, window.innerHeight - 260) }}>
          <NoteForm blockId={graph.id} quote={noteAt.node.label} section={null} onDone={() => setNoteAt(null)} />
        </div>
      )}
    </div>
  );
}

function buildNodes(
  graph: CauseGraphBlock, lay: CauseGraphLayout, lit: { nodes: string[] } | null,
  selected: string | null, pathEnds: string[], flash: string | null,
): Node[] {
  const out: Node[] = [];
  for (const n of graph.nodes) {
    const p = lay.byId[n.id];
    out.push({
      id: n.id, type: "cause", position: { x: p.x, y: p.y },
      data: {
        node: n,
        state: !lit ? "normal" : lit.nodes.includes(n.id) ? "lit" : "dim",
        selected: selected === n.id,
        pathEnd: pathEnds.includes(n.id),
        flash: flash === n.id,
      },
      draggable: true,
      style: { width: p.w, height: p.h },
    } satisfies CauseRFNode);
  }
  const minX = Math.min(...lay.nodes.map((p) => p.x));
  LANES.forEach((l, i) => {
    out.push({
      id: `lane-${l}`, type: "lane", position: { x: minX - 170, y: lay.laneY(i) + NODE_H / 2 - 12 },
      data: { layer: l }, draggable: false, selectable: false, focusable: false,
    } satisfies LaneRFNode);
  });
  if (lay.maxOffset > 0) {
    const x0 = lay.offsetToX(0);
    const ticks = rulerTicks(lay.maxOffset, lay.offsetToX).map((t) => ({ t, x: lay.offsetToX(t) - x0 + NODE_W / 2 }));
    out.push({
      id: "ruler", type: "ruler", position: { x: x0, y: lay.height + 4 },
      data: { ticks, width: lay.offsetToX(lay.maxOffset) - x0 + NODE_W },
      draggable: false, selectable: false, focusable: false,
    } satisfies RulerRFNode);
  }
  return out;
}

/* ---------------- node renderers ---------------- */

function CauseNodeView({ data }: NodeProps<CauseRFNode>) {
  const { node, state, selected, pathEnd, flash } = data;
  const isEvent = node.layer === "event";
  return (
    <div
      className={`relative flex h-full w-full items-start gap-2 rounded-[3px] px-2.5 py-2 text-left transition-opacity duration-200 ${flash ? "flash" : ""} ${
        isEvent ? "border-2 border-text bg-surface" : "border bg-surface"
      } ${selected || pathEnd ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg)]" : ""}`}
      style={{
        opacity: state === "dim" ? 0.28 : 1,
        borderColor: isEvent ? undefined : state === "lit" ? "var(--accent)" : "var(--rule-strong)",
        borderStyle: node.confidence === "C" && !isEvent ? "dashed" : "solid",
      }}
      title={node.label}
    >
      <Handle type="target" position={Position.Left} className="!pointer-events-none !opacity-0" />
      <svg width="14" height="14" viewBox="0 0 14 14" className="mt-[3px] shrink-0" aria-hidden>
        <ShapeAt layer={node.layer} cx={7} cy={7} r={isEvent ? 6 : 5.2} />
      </svg>
      <span className={`line-clamp-3 font-sans leading-[1.08] text-text ${isEvent ? "text-[21px] font-bold" : "text-[18px]"}`}>{node.label}</span>
      <span className="absolute bottom-1.5 right-1.5 text-muted" title={`confidence ${node.confidence}`}><ConfidenceDot c={node.confidence} size={7} /></span>
      <Handle type="source" position={Position.Right} className="!pointer-events-none !opacity-0" />
    </div>
  );
}

function LaneLabel({ data }: NodeProps<LaneRFNode>) {
  return (
    <div className="pointer-events-none flex w-[140px] items-center justify-end gap-1.5 text-[13px] font-medium text-muted">
      {LAYER_LABEL[data.layer]} <LayerShape layer={data.layer} size={11} />
    </div>
  );
}

function YearsRuler({ data }: NodeProps<RulerRFNode>) {
  return (
    <div className="pointer-events-none relative h-10" style={{ width: data.width }}>
      <div className="absolute left-0 right-0 top-2 h-px bg-rule-strong" />
      {data.ticks.map((t) => (
        <div key={t.t} className="absolute top-0" style={{ left: t.x }}>
          <div className="mx-auto h-4 w-px -translate-x-1/2 bg-rule-strong" />
          <span className="tnum absolute top-4 -translate-x-1/2 whitespace-nowrap text-[12px] text-muted">+{t.t}</span>
        </div>
      ))}
      <span className="absolute -bottom-3 right-0 text-[12px] italic text-muted">years later</span>
    </div>
  );
}

function ConfEdge({ source, target, data }: EdgeProps<ConfRFEdge>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t || !data) return null;
  const box = (n: NonNullable<typeof s>) => ({
    x: n.internals.positionAbsolute.x, y: n.internals.positionAbsolute.y,
    w: n.measured.width ?? NODE_W, h: n.measured.height ?? NODE_H,
  });
  return <EdgeStroke edge={data.edge} a={box(s)} b={box(t)} state={data.state} strokeWidth={1.6} />;
}
