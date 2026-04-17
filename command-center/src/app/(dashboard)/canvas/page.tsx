"use client";

import { AgentCanvas } from "@/components/AgentCanvas";
import { usePulse } from "@/lib/pulse-context";

export default function CanvasPage() {
  const { events, logs } = usePulse();
  return <AgentCanvas events={events} logs={logs} />;
}
