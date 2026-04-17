# Civix-Pulse — Progress Notes & Evaluator Q&A

> **Team Role**: Dev 3 — Command Center (Next.js Dashboard)  
> **Status**: Core dashboard + backend integration complete, live and functional  
> **Last updated**: Hour ~18 of hackathon

---

## What's Built & Running

| Service | Port | Status |
|---------|------|--------|
| **Next.js Dashboard** | :3000 | ✅ 4 routes, all rendering |
| **FastAPI Backend** (LangGraph swarm) | :8000 | ✅ Pipeline working E2E |
| **n8n Workflow Engine** | :5678 | ✅ Instance running, ready for webhook wiring |

### Dashboard Pages

| Route | Feature (from features.md) | What It Does |
|-------|---------------------------|--------------|
| `/` | Live Grid + Hotspot Heatmap (#12) | MapLibre map with severity-weighted heatmap layer, event markers, officer blips, dispatch lines, popup details. Ingestion feed + swarm log sidebar. |
| `/canvas` | Live Agent Orchestration Canvas (#2) | Visual pipeline: Intake → Auditor → Priority → Dispatch → Resolution. Nodes derive state from real WebSocket events — idle/processing/completed. Click-to-expand detail panel with scores and reasoning. |
| `/reports` | Executive Reports (#14) | KPI cards (total events, avg impact, critical %, cluster rate), domain distribution bar chart, hourly volume chart, severity breakdown, channel analysis. |
| `/leaderboard` | Department Leaderboard (#15) | Ranked table of 6 departments — TTR, SLA compliance %, satisfaction, cluster resolution metric. Medal indicators for top 3. |

### Backend Pipeline (Dev 1's code, integrated by us)

```
POST /api/v1/trigger-analysis → systemic_auditor → priority_logic → dispatch_agent → WebSocket broadcast
```

- **Systemic Auditor**: Cluster detection (mock: random, prod: Pinecone cosine similarity)
- **Priority Logic**: LLM-scored impact 1-100 (mock: keyword matching, prod: OpenRouter Claude)
- **Dispatch Agent**: Nearest qualified officer matching (mock: random from pool)
- All results broadcast via `ws://localhost:8000/ws/dashboard`

---

## Technical Decisions & Why

### Q: Why MapLibre instead of Leaflet (docs say Leaflet)?

**A**: MapLibre GL JS gives us native **heatmap layers** as a first-class `type: "heatmap"` paint operation — no plugins. Leaflet's heatmap requires leaflet-heat which is unmaintained and doesn't support severity-weighted density. MapLibre also gives us vector tile readiness if we upgrade to Mapbox later. Zero API key needed with CartoDB Positron raster tiles.

### Q: Why no Zustand store (ARCHITECTURE.md mentions Zustand)?

**A**: We use a **React Context + `usePulseStream` hook** pattern instead. For a hackathon with 4 routes sharing one WebSocket stream, Context is simpler and avoids an extra dependency. The WebSocket connects once in `PulseProvider` (wraps the dashboard layout), and every page reads from it. If this were production with 20+ components subscribing to different slices, Zustand would be the right call. For a demo, single-context is faster to build, easier to debug, and zero config.

### Q: How does the frontend handle both the real backend and mock data?

**A**: `socket.ts` has a **dual-protocol handler**. It inspects incoming WebSocket messages:
- If `event_type` field exists → real backend path (maps `NEW_DISPATCH` envelope → our `PulseEvent` type)
- If `type` field exists → generic/mock path
- Ignores `PONG` keepalives

This means the dashboard works identically whether connected to the real LangGraph backend or a mock server. No code changes needed to switch.

### Q: Why a light/warm theme instead of the dark palette in AGENTS.md?

**A**: AGENTS.md specifies "Space Gray + Black" which is standard enterprise dark. We went with a **warm parchment palette** (`#f0ede8` base, `#faf8f5` cards) because:
1. Projects on stage with better contrast — dark UIs wash out on projectors
2. Differentiates us visually from every other hackathon team using dark mode
3. Still enterprise-grade — think Linear/Notion, not neon

### Q: Why CartoDB Positron tiles and not Mapbox?

**A**: **No API key required.** CartoDB Positron is open, free, and the light neutral style matches our UI palette perfectly. Mapbox would require a token (which GitHub push protection already caught and blocked once). For a hackathon, free + no-config wins.

### Q: The Agent Canvas — is it connected to real LangGraph state?

**A**: Yes, indirectly. The canvas **derives node states from WebSocket events**:
- When events arrive with `cluster_found: true` → auditor node shows "completed"
- When `impact_score` and `severity_color` appear → priority node shows "completed" with the score
- When `assigned_officer` is present → dispatch node shows "completed"

It doesn't poll LangGraph's internal state — it interprets the pipeline's output. Same information, cleaner architecture, no extra endpoint needed.

### Q: Why is the priority scorer using keywords instead of an LLM?

**A**: The backend has a **mock scorer fallback** that activates when no OpenRouter API key is set. It uses keyword matching (e.g., "flood" → high score, "pothole" → medium). In production with an API key, it hits Claude Sonnet via OpenRouter with a City Planner persona prompt. We demo with mock scoring — it's deterministic, fast, and still produces realistic-looking severity distributions.

### Q: How does dispatch work without PostGIS?

**A**: The current `dispatch_agent` node selects from a **hardcoded officer pool** with random Hyderabad coordinates. In production, this would be a PostGIS `ST_Distance` query. For the demo, the officer blips appear on the map at realistic Hyderabad locations and dispatch lines connect them to events — visually identical to the real flow.

### Q: What's the WebSocket event format?

**A**: Backend broadcasts:
```json
{
  "event_type": "NEW_DISPATCH",
  "data": {
    "pulse_event": {
      "event_id": "EVT-2025-00042",
      "category": "WATER",
      "impact_score": 87,
      "severity_color": "Red",
      "cluster_found": true,
      "coordinates": { "lat": 17.385, "lng": 78.486 }
    },
    "assigned_officer": {
      "officer_id": "OFF-003",
      "name": "Ravi Kumar",
      "domain": "WATER",
      "current_lat": 17.39,
      "current_lng": 78.49,
      "status": "dispatched"
    }
  }
}
```

### Q: Where's the Knowledge Graph / Cytoscape.js?

**A**: Not built yet — that's Dev 1/2's responsibility per the build order (they own clustering + graph data). Our **Agent Canvas** fills the "visual pipeline" role. The Knowledge Graph (#4 in features.md) requires cluster data and infrastructure relationships that come from the backend's Pinecone integration. When that data exists, we can wire Cytoscape into a `/graph` route.

### Q: How do you handle the domain mismatch (backend sends WATER, frontend expects Municipal)?

**A**: `mapRealBackendDispatch()` in socket.ts does a **runtime mapping**:
- Backend domains: `WATER | TRAFFIC | ELECTRICITY | SEWAGE | MUNICIPAL | SAFETY`
- Frontend types: `Municipal | Traffic | Construction | Emergency`
- Mapping: WATER/SEWAGE→Municipal, TRAFFIC→Traffic, ELECTRICITY/SAFETY→Emergency
- Uses a type cast since backend domains are richer. In production, we'd expand the frontend union type.

---

## What's Not Done (and Why)

| Feature | Reason | Workaround |
|---------|--------|------------|
| Knowledge Graph (#4) | Needs Pinecone cluster data from Dev 1 | Agent Canvas shows pipeline visually |
| Browser Automation (#1) | Dev 2's scope — needs Browser-Use + mock portal | Pre-recorded video ready for demo |
| Voice Intake (#3) | Dev 2's scope — needs Bhashini API | Text intake works, voice is an input channel |
| Docker Compose | Time — everything runs fine as processes | Start with `uvicorn` + `next dev` + `n8n start` |
| Push to emmanuelmj/civix | 403 — no write access for our GitHub identity | Manual push commands provided to team lead |

---

## How to Demo (30-second setup)

```bash
# Terminal 1 — Backend
cd /workspaces/ai4impact
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd /workspaces/ai4impact/command-center
npx next dev --turbopack -p 3000

# Terminal 3 — Trigger test events
curl -X POST http://localhost:8000/api/v1/trigger-analysis \
  -H "Content-Type: application/json" \
  -d '{"event_id":"DEMO-001","translated_description":"Severe water logging in Madhapur junction blocking traffic","domain":"WATER","coordinates":{"lat":17.4435,"lng":78.3772}}'
```

Each trigger fires the full swarm pipeline → WebSocket broadcast → dashboard updates in real-time across all 4 pages.

---

## Repo Structure

```
ai4impact/
├── backend/           # Dev 1 — FastAPI + LangGraph swarm
│   ├── main.py        # WebSocket + REST endpoints
│   └── swarm/graph.py # 3-node pipeline
├── command-center/    # Dev 3 (us) — Next.js dashboard
│   └── src/
│       ├── app/(dashboard)/        # Routes: /, /canvas, /reports, /leaderboard
│       ├── components/             # AgentCanvas, MapLayer, Reports, Leaderboard, etc.
│       └── lib/                    # socket.ts, types.ts, pulse-context.tsx
├── omnichannel-intake/ # Dev 2 — n8n workflows (placeholder)
├── field-worker-app/   # Dev 4 — Expo mobile (placeholder)
└── docs/              # PRD, Architecture, TRD, Features, etc.
```

---

## Key Numbers for Judges

- **4 dashboard pages** built and routing
- **Real-time WebSocket** — sub-second event propagation
- **3-agent pipeline** running end-to-end (auditor → priority → dispatch)
- **Heatmap layer** with severity-weighted density
- **0 API keys needed** to demo (all mocks work out of the box)
- **~2,500 lines** of frontend code
- **Dual-protocol WebSocket** — works with real backend or mock server
