"use client";

import { useEffect, useState, useCallback } from "react";
import type { PulseEvent, SwarmLogEntry } from "@/lib/types";

// Pipeline node definitions matching backend's graph.py
const PIPELINE_NODES = [
  { id: "intake", label: "Omnichannel Intake", icon: "📡", description: "Multimodal ingestion — WhatsApp, voice, web, letters" },
  { id: "auditor", label: "Systemic Auditor", icon: "🔍", description: "Cluster detection via vector similarity" },
  { id: "priority", label: "Priority Logic", icon: "⚖️", description: "LLM-based impact scoring (1–100)" },
  { id: "dispatch", label: "Spatial Dispatch", icon: "📍", description: "Nearest qualified officer matching" },
  { id: "resolution", label: "Verification", icon: "✓", description: "AI-verified resolution via photo proof" },
] as const;

type NodeId = (typeof PIPELINE_NODES)[number]["id"];
type NodeState = "idle" | "processing" | "completed" | "waiting";

interface NodeStatus {
  state: NodeState;
  lastEvent?: string;
  detail?: string;
  score?: number;
  color?: string;
  timestamp?: number;
}

interface AgentCanvasProps {
  events: PulseEvent[];
  logs: SwarmLogEntry[];
}

function deriveNodeStates(events: PulseEvent[], logs: SwarmLogEntry[]): Record<NodeId, NodeStatus> {
  const states: Record<NodeId, NodeStatus> = {
    intake: { state: "idle" },
    auditor: { state: "idle" },
    priority: { state: "idle" },
    dispatch: { state: "idle" },
    resolution: { state: "idle" },
  };

  if (events.length === 0) return states;

  const latest = events[0];
  const recentLogs = logs.slice(0, 8);

  // Intake always completed if we have events
  states.intake = { state: "completed", lastEvent: latest.event_id, detail: `${events.length} events ingested` };

  // Derive from latest event status
  switch (latest.status) {
    case "NEW":
      states.auditor = { state: "processing", lastEvent: latest.event_id, detail: "Checking clusters..." };
      break;
    case "ANALYZING":
      states.auditor = { state: "completed", lastEvent: latest.event_id, detail: "Cluster check done" };
      states.priority = { state: "processing", lastEvent: latest.event_id, detail: "Scoring impact..." };
      break;
    case "DISPATCHED":
      states.auditor = { state: "completed", lastEvent: latest.event_id };
      states.priority = {
        state: "completed", lastEvent: latest.event_id,
        detail: latest.log_message || "Scored",
        score: parseInt(latest.log_message?.match(/score: (\d+)/i)?.[1] || "0"),
        color: latest.severity_color,
      };
      states.dispatch = {
        state: "completed", lastEvent: latest.event_id,
        detail: latest.assigned_officer ? `Officer ${latest.assigned_officer.officer_id}` : "Dispatched",
      };
      states.resolution = { state: "waiting", detail: "Awaiting field verification" };
      break;
    case "IN_PROGRESS":
      states.auditor = { state: "completed" };
      states.priority = { state: "completed", color: latest.severity_color };
      states.dispatch = { state: "completed" };
      states.resolution = { state: "processing", detail: "Officer en route..." };
      break;
    case "RESOLVED":
      states.auditor = { state: "completed" };
      states.priority = { state: "completed", color: latest.severity_color };
      states.dispatch = { state: "completed" };
      states.resolution = { state: "completed", detail: "Verified & closed" };
      break;
  }

  // Enrich from logs
  for (const log of recentLogs) {
    if (log.type === "analysis" && log.event_id === latest.event_id) {
      if (log.message.toLowerCase().includes("cluster")) {
        states.auditor.detail = log.message.slice(0, 60);
      }
      if (log.message.toLowerCase().includes("score")) {
        states.priority.detail = log.message.slice(0, 60);
      }
    }
    if (log.type === "dispatch" && log.event_id === latest.event_id) {
      states.dispatch.detail = log.message.slice(0, 60);
    }
  }

  return states;
}

const stateColors: Record<NodeState, { bg: string; fg: string; border: string; pulse?: boolean }> = {
  idle: { bg: "var(--bg-surface)", fg: "var(--fg-muted)", border: "var(--border-light)" },
  processing: { bg: "var(--accent-blue-dim)", fg: "var(--accent-blue)", border: "var(--accent-blue)", pulse: true },
  completed: { bg: "var(--accent-green-dim)", fg: "var(--accent-green)", border: "var(--accent-green)" },
  waiting: { bg: "var(--accent-amber-dim)", fg: "var(--accent-amber)", border: "var(--accent-amber)" },
};

export function AgentCanvas({ events, logs }: AgentCanvasProps) {
  const [nodeStates, setNodeStates] = useState<Record<NodeId, NodeStatus>>(() => deriveNodeStates([], []));
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    setNodeStates(deriveNodeStates(events, logs));
    setProcessedCount(events.length);
  }, [events, logs]);

  // Animate processing nodes
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 800);
    return () => clearInterval(id);
  }, []);

  const selectedInfo = selectedNode ? PIPELINE_NODES.find(n => n.id === selectedNode) : null;
  const selectedStatus = selectedNode ? nodeStates[selectedNode] : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: "var(--border-light)" }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Live Agent Canvas</h2>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--fg-muted)" }}>
            Real-time swarm pipeline visualization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono px-2 py-1 rounded"
            style={{ background: "var(--bg-surface)", color: "var(--fg-muted)" }}>
            {processedCount} events processed
          </span>
        </div>
      </div>

      {/* Pipeline graph */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="flex items-center gap-2 md:gap-4 max-w-full">
          {PIPELINE_NODES.map((node, i) => {
            const status = nodeStates[node.id];
            const colors = stateColors[status.state];
            const isProcessing = status.state === "processing";
            const isSelected = selectedNode === node.id;

            return (
              <div key={node.id} className="flex items-center gap-2 md:gap-4">
                {/* Node */}
                <button
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  className="relative flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer min-w-[90px] md:min-w-[120px]"
                  style={{
                    background: colors.bg,
                    borderColor: isSelected ? colors.fg : colors.border,
                    boxShadow: isSelected ? `0 0 0 2px ${colors.fg}30` : "none",
                  }}
                >
                  {/* Processing pulse */}
                  {isProcessing && (
                    <span className="absolute inset-0 rounded-xl animate-ping opacity-20"
                      style={{ background: colors.fg }} />
                  )}

                  <span className="text-xl md:text-2xl">{node.icon}</span>
                  <span className="text-[10px] md:text-[11px] font-semibold text-center leading-tight"
                    style={{ color: colors.fg }}>
                    {node.label}
                  </span>

                  {/* State badge */}
                  <span className="text-[8px] md:text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full"
                    style={{ background: `${colors.fg}20`, color: colors.fg }}>
                    {isProcessing ? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧"][tick % 8] + " " : ""}
                    {status.state}
                  </span>

                  {/* Score badge for priority node */}
                  {node.id === "priority" && status.score ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: status.color || "var(--accent-amber)", color: "#fff" }}>
                      {status.score}
                    </span>
                  ) : null}
                </button>

                {/* Edge arrow */}
                {i < PIPELINE_NODES.length - 1 && (
                  <div className="flex items-center">
                    <div className="w-4 md:w-8 h-0.5 rounded-full relative overflow-hidden"
                      style={{
                        background: status.state === "completed" ? "var(--accent-green)" : "var(--border-light)",
                      }}>
                      {isProcessing && (
                        <div className="absolute inset-y-0 left-0 w-1/2 rounded-full animate-pulse"
                          style={{ background: "var(--accent-blue)" }} />
                      )}
                    </div>
                    <span className="text-[10px]"
                      style={{ color: status.state === "completed" ? "var(--accent-green)" : "var(--fg-muted)" }}>
                      ▸
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selectedInfo && selectedStatus && (
        <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: "var(--border-light)", background: "var(--bg-surface)" }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{selectedInfo.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>{selectedInfo.label}</h3>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--fg-muted)" }}>{selectedInfo.description}</p>
              {selectedStatus.detail && (
                <p className="text-[11px] font-mono mt-1.5 px-2 py-1 rounded inline-block"
                  style={{ background: "var(--bg-card)", color: "var(--fg-secondary)" }}>
                  {selectedStatus.detail}
                </p>
              )}
              {selectedStatus.lastEvent && (
                <p className="text-[9px] font-mono mt-1" style={{ color: "var(--fg-muted)" }}>
                  Event: {selectedStatus.lastEvent}
                </p>
              )}
            </div>
            <span className="text-[9px] font-mono uppercase px-2 py-1 rounded-full shrink-0"
              style={{
                background: stateColors[selectedStatus.state].bg,
                color: stateColors[selectedStatus.state].fg,
                border: `1px solid ${stateColors[selectedStatus.state].border}`,
              }}>
              {selectedStatus.state}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
