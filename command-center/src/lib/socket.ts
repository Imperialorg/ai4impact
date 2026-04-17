"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { PulseEvent, SwarmLogEntry, IntakeFeedItem } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/dashboard";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_ITEMS = 100;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 8000;
const RECONNECT_MAX_ATTEMPTS = 10;
const CONNECT_TIMEOUT = 5000;

// ── Backend payload mappers ────────────────────────────────────────

function colorToSeverity(hex: string): PulseEvent["severity"] {
  const c = hex.toLowerCase();
  if (c === "#ff0000" || c.includes("dc2626")) return "critical";
  if (c === "#ffa500") return "high";
  return "standard";
}

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
    assigned_officer: off
      ? {
          officer_id: (off.officer_id as string) || "OP-000",
          current_lat: off.current_lat as number,
          current_lng: off.current_lng as number,
        }
      : undefined,
    log_message: `Impact score: ${pe.impact_score}. ${pe.cluster_found ? "Cluster detected." : "New event."} ${off ? `Dispatched: ${off.officer_id}` : "Awaiting dispatch."}`,
    timestamp: Date.now(),
  };
}

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
    severity: raw.severity
      ? (raw.severity as PulseEvent["severity"])
      : colorToSeverity(severityColor),
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
    translated_text:
      (raw.translated_text as string) || (raw.original_text as string) || "",
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

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

interface UsePulseStreamReturn {
  events: PulseEvent[];
  logs: SwarmLogEntry[];
  intake: IntakeFeedItem[];
  status: ConnectionStatus;
}

// ── Hook ───────────────────────────────────────────────────────────

export function usePulseStream(): UsePulseStreamReturn {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [logs, setLogs] = useState<SwarmLogEntry[]>([]);
  const [intake, setIntake] = useState<IntakeFeedItem[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ── Message handler ────────────────────────────────────────────

  const addEventWithLog = useCallback((evt: PulseEvent) => {
    setEvents((prev) => [evt, ...prev].slice(0, MAX_ITEMS));
    if (evt.log_message) {
      const logType: SwarmLogEntry["type"] =
        evt.status === "DISPATCHED"
          ? "dispatch"
          : evt.status === "RESOLVED"
            ? "verification"
            : "analysis";
      setLogs((prev) =>
        [
          {
            id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            type: logType,
            message: evt.log_message,
            timestamp: evt.timestamp,
            event_id: evt.event_id,
          },
          ...prev,
        ].slice(0, MAX_ITEMS),
      );
    }
  }, []);

  const handleRawMessage = useCallback(
    (raw: Record<string, unknown>) => {
      if (raw.event_type === "NEW_DISPATCH" && raw.data) {
        const evt = mapRealBackendDispatch(raw);
        addEventWithLog(evt);
        return;
      }
      if (raw.event_type === "PONG") return;

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
          setIntake((prev) =>
            [mapBackendIntake(msgData), ...prev].slice(0, MAX_ITEMS),
          );
          break;
        case "swarm_log":
          setLogs((prev) =>
            [mapBackendLog(msgData), ...prev].slice(0, MAX_ITEMS),
          );
          break;
        case "event_status": {
          const { event_id, status: newStatus } = msgData as {
            event_id: string;
            status: PulseEvent["status"];
          };
          setEvents((prev) =>
            prev.map((e) =>
              e.event_id === event_id ? { ...e, status: newStatus } : e,
            ),
          );
          break;
        }
      }
    },
    [addEventWithLog],
  );

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
      if (!didOpen) ws.close();
    }, CONNECT_TIMEOUT);

    ws.onopen = () => {
      didOpen = true;
      clearTimeout(connectTimeout);
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      reconnectAttemptRef.current = 0;
      setStatus("connected");
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
          RECONNECT_MAX_DELAY,
        );
        reconnectAttemptRef.current++;
        setStatus("reconnecting");
        reconnectTimerRef.current = setTimeout(connect, delay);
      } else {
        setStatus("disconnected");
      }
    };

    ws.onerror = () => {};
  }, [handleRawMessage]);

  // ── Lifecycle ──────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { events, logs, intake, status };
}

// ── Trigger Analysis — fires real complaints through LangGraph swarm ────

export async function triggerAnalysis(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const res = await fetch(`${API_URL}/api/v1/trigger-swarm?count=5`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      return { ok: false, message: `Backend returned ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: true,
      message: `${data.events_fired}/${data.total} events processed via LangGraph`,
    };
  } catch {
    return { ok: false, message: "Backend unreachable." };
  }
}
