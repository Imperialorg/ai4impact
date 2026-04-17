"use client";

import { Reports } from "@/components/Reports";
import { usePulse } from "@/lib/pulse-context";

export default function ReportsPage() {
  const { events, logs, intake } = usePulse();
  return <Reports events={events} logs={logs} intake={intake} />;
}
