"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import type { PulseEvent } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types for the graph
// ---------------------------------------------------------------------------
type NodeKind = "complaint" | "infrastructure" | "department" | "officer" | "root_cause";

interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  severity?: string;
  color: string;
  radius: number;
  clusterId?: string;
  collapsed?: boolean;
  childCount?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: "reported_at" | "assigned_to" | "caused_by" | "resolved_by" | "affects";
  color: string;
}

interface KnowledgeGraphProps {
  events: PulseEvent[];
}

// ---------------------------------------------------------------------------
// Infrastructure & department seed data (Hyderabad-themed)
// ---------------------------------------------------------------------------
const INFRA_NODES: { id: string; label: string; domain: string }[] = [
  { id: "infra-pump-7", label: "Pump Station 7 — Madhapur", domain: "Municipal" },
  { id: "infra-feeder-3", label: "Feeder Zone 3 — Gachibowli", domain: "Emergency" },
  { id: "infra-road-nh65", label: "NH-65 Stretch — Kondapur", domain: "Traffic" },
  { id: "infra-drain-12", label: "Storm Drain 12 — Kukatpally", domain: "Municipal" },
  { id: "infra-signal-41", label: "Signal Junction 41 — HITEC City", domain: "Traffic" },
  { id: "infra-transformer-9", label: "Transformer 9 — Jubilee Hills", domain: "Emergency" },
];

const DEPT_NODES: { id: string; label: string; domain: string }[] = [
  { id: "dept-water", label: "Water & Sewage Dept", domain: "Municipal" },
  { id: "dept-traffic", label: "Traffic Management", domain: "Traffic" },
  { id: "dept-electrical", label: "Electrical Division", domain: "Emergency" },
  { id: "dept-roads", label: "Roads & Bridges", domain: "Construction" },
  { id: "dept-municipal", label: "Municipal Corp", domain: "Municipal" },
  { id: "dept-safety", label: "Public Safety", domain: "Emergency" },
];

const KIND_COLORS: Record<NodeKind, string> = {
  complaint: "#64748b",
  infrastructure: "#ca8a04",
  department: "#2563eb",
  officer: "#16a34a",
  root_cause: "#dc2626",
};

// Deterministic pseudo-cluster assignment based on domain
function getClusterInfra(domain: string): string {
  const map: Record<string, string> = {
    Municipal: "infra-pump-7",
    Traffic: "infra-road-nh65",
    Emergency: "infra-feeder-3",
    Construction: "infra-road-nh65",
  };
  return map[domain] || "infra-pump-7";
}

function getDept(domain: string): string {
  const map: Record<string, string> = {
    Municipal: "dept-water",
    Traffic: "dept-traffic",
    Emergency: "dept-electrical",
    Construction: "dept-roads",
  };
  return map[domain] || "dept-municipal";
}

// ---------------------------------------------------------------------------
// Build graph from events
// ---------------------------------------------------------------------------
function buildGraph(events: PulseEvent[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Set<string>();

  const add = (n: GraphNode) => {
    if (!nodeMap.has(n.id)) { nodeMap.add(n.id); nodes.push(n); }
  };

  // Infra nodes
  INFRA_NODES.forEach((inf) =>
    add({ id: inf.id, label: inf.label, kind: "infrastructure", x: 0, y: 0, vx: 0, vy: 0, color: KIND_COLORS.infrastructure, radius: 14 })
  );
  // Dept nodes
  DEPT_NODES.forEach((d) =>
    add({ id: d.id, label: d.label, kind: "department", x: 0, y: 0, vx: 0, vy: 0, color: KIND_COLORS.department, radius: 12 })
  );

  // Complaint nodes + edges
  events.forEach((ev) => {
    const infraId = getClusterInfra(ev.domain);
    const deptId = getDept(ev.domain);

    add({
      id: ev.event_id,
      label: ev.summary.slice(0, 40),
      kind: "complaint",
      x: 0, y: 0, vx: 0, vy: 0,
      severity: ev.severity,
      color: ev.severity_color || KIND_COLORS.complaint,
      radius: ev.severity === "critical" ? 10 : ev.severity === "high" ? 8 : 6,
      clusterId: infraId,
    });

    edges.push({ source: ev.event_id, target: infraId, relation: "affects", color: "rgba(202,138,4,0.35)" });
    edges.push({ source: ev.event_id, target: deptId, relation: "assigned_to", color: "rgba(37,99,235,0.3)" });

    if (ev.assigned_officer) {
      const offId = `officer-${ev.assigned_officer.officer_id}`;
      add({
        id: offId,
        label: ev.assigned_officer.officer_id,
        kind: "officer",
        x: 0, y: 0, vx: 0, vy: 0,
        color: KIND_COLORS.officer,
        radius: 7,
      });
      edges.push({ source: offId, target: ev.event_id, relation: "resolved_by", color: "rgba(22,163,74,0.3)" });
    }
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Collapse clusters into root-cause nodes
// ---------------------------------------------------------------------------
function collapseGraph(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Group complaints by clusterId
  const clusters: Record<string, GraphNode[]> = {};
  const nonComplaints: GraphNode[] = [];

  nodes.forEach((n) => {
    if (n.kind === "complaint" && n.clusterId) {
      (clusters[n.clusterId] ??= []).push(n);
    } else {
      nonComplaints.push(n);
    }
  });

  const collapsedNodes: GraphNode[] = [...nonComplaints];
  const collapsedEdges: GraphEdge[] = [];
  const removedIds = new Set<string>();

  Object.entries(clusters).forEach(([infraId, complaints]) => {
    if (complaints.length >= 2) {
      // Collapse into root-cause node
      const rcId = `rc-${infraId}`;
      const infraNode = nonComplaints.find((n) => n.id === infraId);
      const label = infraNode
        ? `Root Cause: ${infraNode.label} (${complaints.length} complaints)`
        : `Cluster: ${complaints.length} complaints`;

      collapsedNodes.push({
        id: rcId,
        label,
        kind: "root_cause",
        x: 0, y: 0, vx: 0, vy: 0,
        color: KIND_COLORS.root_cause,
        radius: 12 + Math.min(complaints.length * 2, 14),
        childCount: complaints.length,
        collapsed: true,
      });

      // Root cause → infrastructure
      collapsedEdges.push({ source: rcId, target: infraId, relation: "caused_by", color: "rgba(220,38,38,0.5)" });

      // Gather dept edges
      const depts = new Set<string>();
      complaints.forEach((c) => {
        removedIds.add(c.id);
        edges.filter((e) => e.source === c.id && e.relation === "assigned_to").forEach((e) => depts.add(e.target));
      });
      depts.forEach((d) => collapsedEdges.push({ source: rcId, target: d, relation: "assigned_to", color: "rgba(37,99,235,0.4)" }));
    } else {
      // Keep standalone complaints
      complaints.forEach((c) => collapsedNodes.push(c));
    }
  });

  // Keep non-removed edges
  edges.forEach((e) => {
    if (!removedIds.has(e.source) && !removedIds.has(e.target)) {
      collapsedEdges.push(e);
    }
  });

  return { nodes: collapsedNodes, edges: collapsedEdges };
}

// ---------------------------------------------------------------------------
// Force-directed layout (simple spring simulation)
// ---------------------------------------------------------------------------
function initPositions(nodes: GraphNode[], w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  const kindRings: Record<NodeKind, number> = {
    root_cause: 0,
    infrastructure: 80,
    department: 160,
    officer: 230,
    complaint: 200,
  };
  nodes.forEach((n, i) => {
    const r = kindRings[n.kind] + (Math.random() - 0.5) * 60;
    const angle = (i / nodes.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    n.x = cx + Math.cos(angle) * r;
    n.y = cy + Math.sin(angle) * r;
  });
}

function simulate(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const repulsion = 3000;
  const attraction = 0.005;
  const damping = 0.85;
  const center = { x: w / 2, y: h / 2 };

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
  }

  // Attraction along edges
  edges.forEach((e) => {
    const s = nodeMap.get(e.source), t = nodeMap.get(e.target);
    if (!s || !t) return;
    const dx = t.x - s.x, dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = dist * attraction;
    const fx = (dx / dist) * force, fy = (dy / dist) * force;
    s.vx += fx; s.vy += fy;
    t.vx -= fx; t.vy -= fy;
  });

  // Gravity toward center
  nodes.forEach((n) => {
    n.vx += (center.x - n.x) * 0.001;
    n.vy += (center.y - n.y) * 0.001;
  });

  // Integrate
  nodes.forEach((n) => {
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx;
    n.y += n.vy;
    // Bounds
    n.x = Math.max(n.radius, Math.min(w - n.radius, n.x));
    n.y = Math.max(n.radius, Math.min(h - n.radius, n.y));
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function KnowledgeGraph({ events }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const animRef = useRef<number>(0);
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const sizeRef = useRef({ w: 800, h: 600 });

  // Build & layout graph
  const rawGraph = useMemo(() => buildGraph(events), [events]);
  const displayGraph = useMemo(
    () => (collapsed ? collapseGraph(rawGraph.nodes, rawGraph.edges) : rawGraph),
    [rawGraph, collapsed]
  );

  // Root cause hypothesis text
  const hypotheses = useMemo(() => {
    const result: Record<string, string> = {};
    const clusters: Record<string, number> = {};
    events.forEach((ev) => {
      const infraId = getClusterInfra(ev.domain);
      clusters[infraId] = (clusters[infraId] || 0) + 1;
    });
    INFRA_NODES.forEach((inf) => {
      const count = clusters[inf.id] || 0;
      if (count >= 2) {
        result[`rc-${inf.id}`] = `Fixing ${inf.label} would likely resolve ${count} of these complaints.`;
      }
    });
    return result;
  }, [events]);

  // Initialize positions when graph changes
  useEffect(() => {
    const { w, h } = sizeRef.current;
    const g = { nodes: displayGraph.nodes.map((n) => ({ ...n })), edges: [...displayGraph.edges] };
    initPositions(g.nodes, w, h);
    // Run initial ticks
    for (let i = 0; i < 100; i++) simulate(g.nodes, g.edges, w, h);
    graphRef.current = g;
  }, [displayGraph]);

  // Handle hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const { nodes } = graphRef.current;
    let found: GraphNode | null = null;
    for (const n of nodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (dx * dx + dy * dy < (n.radius + 4) * (n.radius + 4)) { found = n; break; }
    }
    setHovered(found);
    if (canvas) canvas.style.cursor = found ? "pointer" : "default";
  }, []);

  const handleClick = useCallback(() => {
    if (hovered?.kind === "root_cause") {
      setSelectedCluster(selectedCluster === hovered.id ? null : hovered.id);
    }
  }, [hovered, selectedCluster]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: rect.width, h: rect.height };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const draw = () => {
      const { w, h } = sizeRef.current;
      const { nodes, edges } = graphRef.current;

      // Gentle simulation
      simulate(nodes, edges, w, h);

      ctx.clearRect(0, 0, w, h);

      // Draw edges
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      edges.forEach((e) => {
        const s = nodeMap.get(e.source), t = nodeMap.get(e.target);
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.relation === "caused_by" ? 2.5 : 1;
        if (e.relation === "caused_by") ctx.setLineDash([6, 4]);
        else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw nodes
      nodes.forEach((n) => {
        const isHovered = hovered?.id === n.id;
        const isSelected = selectedCluster === n.id;

        // Glow for root cause
        if (n.kind === "root_cause") {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "rgba(220,38,38,0.2)" : "rgba(220,38,38,0.08)";
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = isHovered ? 1 : 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Border
        if (isHovered || isSelected) {
          ctx.strokeStyle = "#1e1e1e";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Kind icon
        ctx.fillStyle = "#fff";
        ctx.font = `${n.radius * 0.9}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const icons: Record<NodeKind, string> = {
          complaint: "⚡",
          infrastructure: "🏗",
          department: "🏛",
          officer: "👤",
          root_cause: "⚠",
        };
        ctx.fillText(icons[n.kind], n.x, n.y);

        // Child count badge for root cause
        if (n.kind === "root_cause" && n.childCount) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px system-ui";
          ctx.fillText(`${n.childCount}`, n.x, n.y + n.radius + 10);
        }

        // Label (only for infra, dept, root_cause, or hovered)
        if (n.kind !== "complaint" && n.kind !== "officer" || isHovered) {
          ctx.fillStyle = "var(--fg-primary, #1e1e1e)";
          ctx.font = `${n.kind === "root_cause" ? "600 11px" : "10px"} system-ui`;
          ctx.textAlign = "center";
          const labelY = n.y - n.radius - 6;
          const truncLabel = n.label.length > 30 ? n.label.slice(0, 28) + "…" : n.label;
          ctx.fillStyle = n.kind === "root_cause" ? "#dc2626" : "#5c5856";
          ctx.fillText(truncLabel, n.x, labelY);
        }
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [hovered, selectedCluster]);

  const rootCauseNodes = displayGraph.nodes.filter((n) => n.kind === "root_cause");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>
            Governance Knowledge Graph
          </h2>
          <p className="text-[10px] font-mono" style={{ color: "var(--fg-muted)" }}>
            {displayGraph.nodes.length} nodes · {displayGraph.edges.length} edges
            {collapsed && rootCauseNodes.length > 0 && ` · ${rootCauseNodes.length} root causes detected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
            style={{
              background: collapsed ? "rgba(220,38,38,0.1)" : "var(--bg-surface)",
              color: collapsed ? "#dc2626" : "var(--fg-secondary)",
              border: "1px solid",
              borderColor: collapsed ? "rgba(220,38,38,0.2)" : "var(--border-light)",
            }}
          >
            {collapsed ? "⚠ Root-Cause View" : "◉ Expand All"}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b shrink-0"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-light)" }}>
        {([
          ["complaint", "Complaint", "#64748b"],
          ["infrastructure", "Infrastructure", "#ca8a04"],
          ["department", "Department", "#2563eb"],
          ["officer", "Officer", "#16a34a"],
          ["root_cause", "Root Cause", "#dc2626"],
        ] as const).map(([, label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-mono" style={{ color: "var(--fg-muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {/* Tooltip */}
        {hovered && (
          <div className="absolute top-3 right-3 max-w-xs p-3 rounded-lg border shadow-sm"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: hovered.color }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--fg-primary)" }}>
                {hovered.kind.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>{hovered.label}</p>
            {hovered.kind === "root_cause" && hovered.childCount && (
              <p className="text-[10px] font-mono mt-1" style={{ color: "#dc2626" }}>
                {hovered.childCount} complaints collapsed · click for hypothesis
              </p>
            )}
          </div>
        )}

        {/* Root-cause hypothesis panel */}
        {selectedCluster && hypotheses[selectedCluster] && (
          <div className="absolute bottom-3 left-3 right-3 p-4 rounded-lg border"
            style={{ background: "var(--bg-card)", borderColor: "rgba(220,38,38,0.3)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: "#dc2626" }} />
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#dc2626" }}>
                AI Root-Cause Hypothesis
              </span>
            </div>
            <p className="text-sm italic" style={{ color: "var(--fg-primary)" }}>
              &ldquo;{hypotheses[selectedCluster]}&rdquo;
            </p>
            <p className="text-[10px] mt-2 font-mono" style={{ color: "var(--fg-muted)" }}>
              Based on semantic clustering + spatial proximity. Field verification recommended before action.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
