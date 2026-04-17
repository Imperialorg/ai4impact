"use client";

import { useEffect, useState } from "react";
import { MapLayer } from "@/components/MapLayer";
import { IngestionFeed } from "@/components/IngestionFeed";
import { SwarmLog } from "@/components/SwarmLog";
import { usePulse } from "@/lib/pulse-context";
import { triggerAnalysis } from "@/lib/socket";

export default function DashboardPage() {
  const { events, logs, intake, status } = usePulse();
  const [stats, setStats] = useState({ active: 0, critical: 0, resolved: 0, avgTime: "—" });
  const [mobileTab, setMobileTab] = useState<"map" | "intake" | "swarm">("map");
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState("");

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerMsg("");
    const result = await triggerAnalysis();
    setTriggerMsg(result.message);
    setTriggering(false);
    setTimeout(() => setTriggerMsg(""), 4000);
  };

  useEffect(() => {
    const active = events.filter(e => e.status !== "RESOLVED").length;
    const critical = events.filter(e => e.severity === "critical" && e.status !== "RESOLVED").length;
    const resolved = events.filter(e => e.status === "RESOLVED").length;
    setStats({ active, critical, resolved, avgTime: active > 0 ? "~12m" : "—" });
  }, [events]);

  const activeEvents = events.filter(e => e.status !== "RESOLVED");

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Mobile tab bar */}
      <div className="flex lg:hidden border-b shrink-0"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        {(["map", "intake", "swarm"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className="flex-1 py-2.5 text-[11px] font-mono uppercase tracking-wider text-center transition-colors border-b-2"
            style={{
              borderColor: mobileTab === tab ? "var(--accent-blue)" : "transparent",
              color: mobileTab === tab ? "var(--accent-blue)" : "var(--fg-muted)",
              background: mobileTab === tab ? "var(--accent-blue-dim)" : "transparent",
            }}>
            {tab === "map" ? `Grid (${stats.active})` : tab === "intake" ? `Intake (${intake.length})` : `Swarm (${logs.length})`}
          </button>
        ))}
      </div>

      {/* Mobile stats bar */}
      <div className="flex lg:hidden items-center gap-3 px-3 py-1.5 border-b overflow-x-auto shrink-0"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        <StatPill label="Active" value={stats.active} color="var(--accent-blue)" />
        <StatPill label="Crit" value={stats.critical} color="var(--accent-crimson)" />
        <StatPill label="Done" value={stats.resolved} color="var(--accent-green)" />
      </div>

      {/* Left: Ingestion Feed — desktop only */}
      <div className="hidden lg:flex w-72 shrink-0 border-r flex-col"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        <IngestionFeed items={intake} />
      </div>

      {/* Center: Map + Stats — desktop */}
      <div className="hidden lg:flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-6 px-4 py-2 border-b"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-light)" }}>
          <StatPill label="Active" value={stats.active} color="var(--accent-blue)" />
          <StatPill label="Critical" value={stats.critical} color="var(--accent-crimson)" />
          <StatPill label="Resolved" value={stats.resolved} color="var(--accent-green)" />
          <StatPill label="Avg Response" value={stats.avgTime} color="var(--fg-secondary)" />
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="px-3 py-1 rounded-md text-[11px] font-medium transition-all"
            style={{
              background: triggering ? "var(--bg-surface)" : "var(--accent-blue-dim)",
              color: triggering ? "var(--fg-muted)" : "var(--accent-blue)",
              border: "1px solid",
              borderColor: triggering ? "var(--border-light)" : "rgba(37,99,235,0.2)",
            }}
          >
            {triggering ? "⏳ Firing…" : "⚡ Trigger Analysis"}
          </button>
          {triggerMsg && (
            <span className="text-[10px] font-mono" style={{ color: "var(--fg-muted)" }}>
              {triggerMsg}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: status === "connected" ? "var(--accent-green-dim)" : "var(--accent-amber-dim)",
                color: status === "connected" ? "var(--accent-green)" : "var(--accent-amber)",
              }}>
              {status === "connected" ? "● LIVE" : status === "connecting" ? "◌ CONNECTING" : "◉ DEMO"}
            </span>
            {(["Municipal", "Traffic", "Water", "Electricity", "Construction", "Emergency"] as const).map(d => {
              const count = events.filter(e => e.domain === d && e.status !== "RESOLVED").length;
              return (
                <span key={d} className="text-[10px] font-mono px-2 py-0.5 rounded"
                  style={{ background: "var(--bg-elevated)", color: "var(--fg-muted)" }}>
                  {d.slice(0, 5)} {count}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex-1 p-2">
          <MapLayer events={activeEvents} />
        </div>
      </div>

      {/* Right: Swarm Log — desktop only */}
      <div className="hidden lg:flex w-72 shrink-0 border-l flex-col"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        <SwarmLog entries={logs} />
      </div>

      {/* Mobile content — full height, one panel at a time */}
      <div className="flex-1 lg:hidden overflow-hidden">
        {mobileTab === "map" && (
          <div className="h-full p-2">
            <MapLayer events={activeEvents} />
          </div>
        )}
        {mobileTab === "intake" && (
          <div className="h-full" style={{ background: "var(--bg-card)" }}>
            <IngestionFeed items={intake} />
          </div>
        )}
        {mobileTab === "swarm" && (
          <div className="h-full" style={{ background: "var(--bg-card)" }}>
            <SwarmLog entries={logs} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] font-mono uppercase" style={{ color: "var(--fg-muted)" }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
