"use client";

import { createContext, useContext } from "react";
import { usePulseStream, type ConnectionStatus } from "@/lib/socket";
import type { PulseEvent, SwarmLogEntry, IntakeFeedItem } from "@/lib/types";

interface PulseContextValue {
  events: PulseEvent[];
  logs: SwarmLogEntry[];
  intake: IntakeFeedItem[];
  status: ConnectionStatus;
}

const PulseContext = createContext<PulseContextValue>({
  events: [],
  logs: [],
  intake: [],
  status: "connecting",
});

export function PulseProvider({ children }: { children: React.ReactNode }) {
  const stream = usePulseStream();
  return <PulseContext.Provider value={stream}>{children}</PulseContext.Provider>;
}

export function usePulse() {
  return useContext(PulseContext);
}
