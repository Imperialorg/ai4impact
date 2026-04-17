"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { PulseEvent, SwarmLogEntry, IntakeFeedItem } from "./types";
import { generatePulseEvent, generateSwarmLog, generateIntakeItem } from "./mock-data";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/dashboard";
const MAX_ITEMS = 50;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 8000;
const RECONNECT_MAX_ATTEMPTS = 5;
const CONNECT_TIMEOUT = 3000;

// ── Backend payload mappers ────────────────────────────────────────

// Severity from hex color
function colorToSeverity(hex: string): PulseEvent["severity"] {
  const c = hex.toLowerCase();
  if (c === "#ff0000" || c.includes("dc2626")) return "critical";
  if (c === "#ffa500") return "high";
  return "standard";
}

// Map the REAL backend format (emmanuelmj/civix):
//   { event_type: "NEW_DISPATCH", data: { pulse_event: {...}, assigned_officer: {...} } }
function mapRealBackendDispatch(payload: Record<string, unknown>): PulseEvent {
  const data = payload.data as Record<string, unknown>;
  const pe = data.pulse_event as Record<string, unknown>;
  const off = data.assigned_officer as Record<string, unknown> | null;
  const coords = pe.coordinates as { lat: number; lng: number } | undefined;
  const severityColor = (pe.severity_color as string) || "#FFA500";

  return {
    event_id: (pe.event_id as string) || crypto.randomUUID(),
    status: off ? "DISPATCHED" : "ANALYZING",
    coordinates: coords || { lat: 17.385, lng: 78.4867 },
    severity_color: severityColor,
    severity: colorToSeverity(severityColor),
    domain: ((pe.category as string) || "Municipal") as PulseEvent["domain"],
    summary: (pe.summary as string) || (pe.category as string) || "New grievance event",
    assigned_officer: off ? {
      officer_id: (off.officer_id as string) || "OP-000",
      current_lat: off.current_lat as number,
      current_lng: off.current_lng as number,
    } : undefined,
    log_message: `Impact score: ${pe.impact_score}. ${pe.cluster_found ? "Cluster detected." : "New event."} ${off ? `Dispatched: ${off.officer_id}` : "Awaiting dispatch."}`,
    timestamp: Date.now(),
  };
}

// Map our own generic format:
//   { type: "pulse_update", data: { event_id, status, coordinates, ... } }
function mapGenericEvent(raw: Record<string, unknown>): PulseEvent {
  const coords = raw.coordinates as { lat: number; lng: number } | undefined;
  const officer = raw.assigned_officer as {
    officer_id: string;
    current_lat: number;
    current_lng: number;
  } | undefined;

  const severityColor = (raw.severity_color as string) || "#ca8a04";

  return {
    event_id: (raw.event_id as string) || crypto.randomUUID(),
    status: (raw.status as PulseEvent["status"]) || "NEW",
    coordinates: coords || { lat: 17.385, lng: 78.4867 },
    severity_color: severityColor,
    severity: raw.severity ? (raw.severity as PulseEvent["severity"]) : colorToSeverity(severityColor),
    domain: (raw.domain as PulseEvent["domain"]) || "Municipal",
    summary: (raw.summary as string) || (raw.log_message as string) || "New event",
    assigned_officer: officer,
    log_message: (raw.log_message as string) || "",
    timestamp: (raw.timestamp as number) || Date.now(),
    thumbnail: raw.thumbnail as string | undefined,
    original_text: raw.original_text as string | undefined,
  };
}

function mapBackendIntake(raw: Record<string, unknown>): IntakeFeedItem {
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    channel: (raw.channel as IntakeFeedItem["channel"]) || "portal",
    original_text: (raw.original_text as string) || "",
    translated_text: (raw.translated_text as string) || (raw.original_text as string) || "",
    thumbnail: raw.thumbnail as string | undefined,
    timestamp: (raw.timestamp as number) || Date.now(),
    coordinates: raw.coordinates as { lat: number; lng: number } | undefined,
  };
}

function mapBackendLog(raw: Record<string, unknown>): SwarmLogEntry {
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    type: (raw.type as SwarmLogEntry["type"]) || "system",
    message: (raw.message as string) || (raw.log_message as string) || "",
    timestamp: (raw.timestamp as number) || Date.now(),
    event_id: raw.event_id as string | undefined,
  };
}

// ── Types ──────────────────────────────────────────────────────────

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "mock";

interface UsePulseStreamReturn {
  events: PulseEvent[];
  logs: SwarmLogEntry[];
  intake: IntakeFeedItem[];
  status: ConnectionStatus;
}

// ── WebSocket message protocol ─────────────────────────────────────
// Real backend (emmanuelmj/civix) sends:  { event_type: "NEW_DISPATCH", data: { pulse_event, assigned_officer } }
// Also sends:                              { event_type: "PONG", data: "..." }
// Our generic format sends:                { type: "pulse_update" | "intake_update" | "swarm_log" | "event_status", data: {...} }

interface WSMessageGeneric {
  type: string;
  data: Record<string, unknown>;
}

interface WSMessageReal {
  event_type: string;
  data: Record<string, unknown>;
}

// ── Hook ───────────────────────────────────────────────────────────

export function usePulseStream(): UsePulseStreamReturn {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [logs, setLogs] = useState<SwarmLogEntry[]>([]);
  const [intake, setIntake] = useState<IntakeFeedItem[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ── Mock data fallback ─────────────────────────────────────────

  const startMockMode = useCallback(() => {
    if (mockIntervalRef.current) return;
    setStatus("mock");

    const seed = Array.from({ length: 25 }, () => generatePulseEvent());
    const seedLogs = seed.flatMap((e) => [generateSwarmLog(e), generateSwarmLog(e), generateSwarmLog()]);
    const seedIntake = Array.from({ length: 15 }, () => generateIntakeItem());
    setEvents(seed);
    setLogs(seedLogs);
    setIntake(seedIntake);

    mockIntervalRef.current = setInterval(() => {
      const roll = Math.random();
      if (roll < 0.4) {
        const evt = generatePulseEvent();
        setEvents((prev) => [evt, ...prev].slice(0, MAX_ITEMS));
        setLogs((prev) => [generateSwarmLog(evt), ...prev].slice(0, MAX_ITEMS));
      } else if (roll < 0.7) {
        setIntake((prev) => [generateIntakeItem(), ...prev].slice(0, MAX_ITEMS));
      } else {
        setLogs((prev) => [generateSwarmLog(), ...prev].slice(0, MAX_ITEMS));
      }

      if (Math.random() < 0.1) {
        setEvents((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((e) => e.status !== "RESOLVED");
          if (idx >= 0) {
            copy[idx] = { ...copy[idx], status: "RESOLVED" };
            setLogs((p) => [
              {
                id: `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                type: "verification" as const,
                message: `Task closed. ${copy[idx].summary} — resolved.`,
                timestamp: Date.now(),
                event_id: copy[idx].event_id,
              },
              ...p,
            ].slice(0, MAX_ITEMS));
          }
          return copy;
        });
      }
    }, 2500);
  }, []);

  const stopMock = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  // ── Message handler ────────────────────────────────────────────

  const addEventWithLog = useCallback((evt: PulseEvent) => {
    setEvents((prev) => [evt, ...prev].slice(0, MAX_ITEMS));
    if (evt.log_message) {
      const logType: SwarmLogEntry["type"] =
        evt.status === "DISPATCHED" ? "dispatch" : evt.status === "RESOLVED" ? "verification" : "analysis";
      setLogs((prev) => [
        {
          id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: logType,
          message: evt.log_message,
          timestamp: evt.timestamp,
          event_id: evt.event_id,
        },
        ...prev,
      ].slice(0, MAX_ITEMS));
    }
  }, []);

  const handleRawMessage = useCallback((raw: Record<string, unknown>) => {
    // Real backend format: { event_type: "NEW_DISPATCH", data: {...} }
    if (raw.event_type === "NEW_DISPATCH" && raw.data) {
      const evt = mapRealBackendDispatch(raw);
      addEventWithLog(evt);
      return;
    }
    // Ignore PONG keepalives
    if (raw.event_type === "PONG") return;

    // Generic / mock format: { type: "pulse_update" | "intake_update" | ..., data: {...} }
    const msgType = raw.type as string | undefined;
    const msgData = raw.data as Record<string, unknown> | undefined;
    if (!msgType || !msgData) return;

    switch (msgType) {
      case "pulse_update": {
        const evt = mapGenericEvent(msgData);
        addEventWithLog(evt);
        break;
      }
      case "intake_update":
        setIntake((prev) => [mapBackendIntake(msgData), ...prev].slice(0, MAX_ITEMS));
        break;
      case "swarm_log":
        setLogs((prev) => [mapBackendLog(msgData), ...prev].slice(0, MAX_ITEMS));
        break;
      case "event_status": {
        const { event_id, status: newStatus } = msgData as { event_id: string; status: PulseEvent["status"] };
        setEvents((prev) =>
          prev.map((e) => (e.event_id === event_id ? { ...e, status: newStatus } : e))
        );
        break;
      }
    }
  }, [addEventWithLog]);

  // ── WebSocket connect with exponential backoff ─────────────────

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const isReconnect = reconnectAttemptRef.current > 0;
    setStatus(isReconnect ? "reconnecting" : "connecting");

    let didOpen = false;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    const connectTimeout = setTimeout(() => {
      if (!didOpen) {
        ws.close();
      }
    }, CONNECT_TIMEOUT);

    ws.onopen = () => {
      didOpen = true;
      clearTimeout(connectTimeout);
      if (!mountedRef.current) { ws.close(); return; }
      reconnectAttemptRef.current = 0;
      stopMock();
      setStatus("connected");
      // Clear old data when switching from mock to live
      setEvents([]);
      setLogs([]);
      setIntake([]);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as Record<string, unknown>;
        handleRawMessage(parsed);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      clearTimeout(connectTimeout);
      wsRef.current = null;
      if (!mountedRef.current) return;

      if (reconnectAttemptRef.current < RECONNECT_MAX_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current),
          RECONNECT_MAX_DELAY
        );
        reconnectAttemptRef.current++;
        setStatus("reconnecting");
        reconnectTimerRef.current = setTimeout(connect, delay);
      } else {
        startMockMode();
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror — reconnect logic handled there
    };
  }, [handleRawMessage, startMockMode, stopMock]);

  // ── Lifecycle ──────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Fallback: if still not connected after timeout, start mock
    const fallback = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        startMockMode();
      }
    }, CONNECT_TIMEOUT + 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(fallback);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopMock();
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, startMockMode, stopMock]);

  return { events, logs, intake, status };
}

// ── Trigger Analysis — call backend or seed mock ───────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const QUICK_COMPLAINTS = [
  { desc: "Sewage overflow near Charminar residential colony", domain: "WATER" },
  { desc: "Live wire fallen on road after storm in Gachibowli", domain: "ELECTRICITY" },
  { desc: "Massive pothole on Road No. 12 Banjara Hills", domain: "TRAFFIC" },
  { desc: "Garbage not collected for 5 days in Ameerpet", domain: "MUNICIPAL" },
  { desc: "Crane operating without safety net near school", domain: "CONSTRUCTION" },
  { desc: "Building wall cracked and leaning dangerously", domain: "EMERGENCY" },
  { desc: "Water pipeline burst flooding entire street", domain: "WATER" },
  { desc: "Transformer sparking and smoking in rain", domain: "ELECTRICITY" },
  { desc: "Signal out at busy Kukatpally junction causing accidents", domain: "TRAFFIC" },
  { desc: "Open manhole cover on main road pedestrians falling", domain: "MUNICIPAL" },
  { desc: "Gas leak smell in Kukatpally residential area", domain: "EMERGENCY" },
  { desc: "Night construction noise at 2am violating rules", domain: "CONSTRUCTION" },
];

export async function triggerAnalysis(): Promise<{ ok: boolean; message: string }> {
  const complaint = QUICK_COMPLAINTS[Math.floor(Math.random() * QUICK_COMPLAINTS.length)];
  const eventId = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const body = {
    event_id: eventId,
    translated_description: complaint.desc,
    domain: complaint.domain,
    coordinates: {
      lat: 17.385 + (Math.random() - 0.5) * 0.1,
      lng: 78.4867 + (Math.random() - 0.5) * 0.1,
    },
  };

  try {
    const res = await fetch(`${API_URL}/api/v1/trigger-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, message: `Backend returned ${res.status}` };
    }
    const data = await res.json();
    const score = data?.data?.pulse_event?.impact_score ?? "?";
    return { ok: true, message: `Score: ${score} — ${complaint.desc.slice(0, 50)}` };
  } catch {
    return { ok: false, message: "Backend unreachable. Using mock mode." };
  }
}
