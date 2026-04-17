"use client";

import { useMemo } from "react";
import type { PulseEvent } from "@/lib/types";

// Mock department data derived from events
interface DepartmentStats {
  name: string;
  domain: string;
  totalEvents: number;
  resolved: number;
  avgResolutionMin: number;
  slaCompliance: number;
  satisfaction: number;
  clusterResolution: number;
}

const DEPARTMENTS = ["Municipal", "Traffic", "Water", "Electricity", "Sewage", "Safety"] as const;

function deriveDepartmentStats(events: PulseEvent[]): DepartmentStats[] {
  return DEPARTMENTS.map((dept) => {
    const deptEvents = events.filter(
      (e) => e.domain?.toUpperCase() === dept.toUpperCase() ||
             (dept === "Municipal" && !DEPARTMENTS.slice(1).some(d => e.domain?.toUpperCase() === d.toUpperCase()))
    );
    const total = Math.max(deptEvents.length, 1);
    const resolved = deptEvents.filter((e) => e.status === "RESOLVED").length;
    // Generate plausible stats
    const seed = dept.charCodeAt(0);
    return {
      name: `${dept} Services`,
      domain: dept,
      totalEvents: total,
      resolved,
      avgResolutionMin: Math.round(15 + (seed % 45)),
      slaCompliance: Math.round(65 + (seed % 30)),
      satisfaction: parseFloat((3.2 + ((seed * 7) % 18) / 10).toFixed(1)),
      clusterResolution: Math.round(50 + (seed % 40)),
    };
  }).sort((a, b) => b.slaCompliance - a.slaCompliance);
}

function RankBadge({ rank }: { rank: number }) {
  const colors = rank === 1
    ? { bg: "#fef3c7", fg: "#b45309" }
    : rank === 2
    ? { bg: "#f3f4f6", fg: "#6b7280" }
    : rank === 3
    ? { bg: "#fed7aa", fg: "#c2410c" }
    : { bg: "var(--bg-surface)", fg: "var(--fg-muted)" };

  return (
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
      style={{ background: colors.bg, color: colors.fg }}>
      {rank}
    </span>
  );
}

function MeterBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}

interface LeaderboardProps {
  events: PulseEvent[];
}

export function Leaderboard({ events }: LeaderboardProps) {
  const departments = useMemo(() => deriveDepartmentStats(events), [events]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border-light)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Department Leaderboard</h2>
        <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--fg-muted)" }}>
          Ranked by SLA compliance · Updated in real-time
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_1fr_80px_80px_70px_80px] gap-2 px-4 py-2 border-b text-[9px] font-mono uppercase tracking-wider"
        style={{ borderColor: "var(--border-light)", color: "var(--fg-muted)" }}>
        <span>#</span>
        <span>Department</span>
        <span className="text-right">Avg TTR</span>
        <span className="text-right">SLA %</span>
        <span className="text-right">Rating</span>
        <span className="text-right">Clusters</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {departments.map((dept, i) => (
          <div key={dept.domain}
            className="grid grid-cols-[40px_1fr_80px_80px_70px_80px] gap-2 px-4 py-3 items-center border-b transition-colors hover:brightness-[0.98]"
            style={{ borderColor: "var(--border-light)", background: i === 0 ? "var(--accent-green-dim)" : "transparent" }}>
            <RankBadge rank={i + 1} />
            <div>
              <p className="text-[12px] font-semibold" style={{ color: "var(--fg-primary)" }}>{dept.name}</p>
              <p className="text-[10px] font-mono" style={{ color: "var(--fg-muted)" }}>
                {dept.totalEvents} events · {dept.resolved} resolved
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-mono tabular-nums" style={{ color: "var(--fg-primary)" }}>
                {dept.avgResolutionMin}m
              </p>
              <MeterBar value={60 - Math.min(dept.avgResolutionMin, 60)} max={60} color="var(--accent-blue)" />
            </div>
            <div className="text-right">
              <p className="text-[12px] font-mono tabular-nums font-semibold"
                style={{ color: dept.slaCompliance >= 80 ? "var(--accent-green)" : dept.slaCompliance >= 60 ? "var(--accent-amber)" : "var(--accent-crimson)" }}>
                {dept.slaCompliance}%
              </p>
              <MeterBar value={dept.slaCompliance} max={100}
                color={dept.slaCompliance >= 80 ? "var(--accent-green)" : dept.slaCompliance >= 60 ? "var(--accent-amber)" : "var(--accent-crimson)"} />
            </div>
            <div className="text-right">
              <p className="text-[12px] font-mono tabular-nums" style={{ color: "var(--fg-primary)" }}>
                {"★".repeat(Math.round(dept.satisfaction))}
              </p>
              <p className="text-[10px] font-mono" style={{ color: "var(--fg-muted)" }}>{dept.satisfaction}/5</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-mono tabular-nums" style={{ color: "var(--fg-primary)" }}>
                {dept.clusterResolution}%
              </p>
              <MeterBar value={dept.clusterResolution} max={100} color="var(--accent-blue)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
