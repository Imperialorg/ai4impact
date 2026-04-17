"use client";

import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { usePulse } from "@/lib/pulse-context";

export default function GraphPage() {
  const { events } = usePulse();
  return <KnowledgeGraph events={events} />;
}
