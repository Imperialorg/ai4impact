"use client";

import { Leaderboard } from "@/components/Leaderboard";
import { usePulse } from "@/lib/pulse-context";

export default function LeaderboardPage() {
  const { events } = usePulse();
  return <Leaderboard events={events} />;
}
