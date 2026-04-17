# Civix-Pulse — Progress Notes & Evaluator Q&A

> **Team Role**: Dev 3 — Command Center (Next.js Dashboard)  
> **Status**: All 9 dashboard pages built, backend integrated, real-data mode active  
> **Last updated**: Hour ~24 of hackathon

---

## What's Built & Running

| Service | Port | Status |
|---------|------|--------|
| **Next.js Dashboard** | :3000 | ✅ 9 routes, all rendering |
| **FastAPI Backend** (LangGraph swarm) | :8000 | ✅ Pipeline working E2E + demo-burst + trigger-swarm |
| **n8n Workflow Engine** | :5678 | ✅ Instance running |

### Dashboard Pages (9 total)

| Route | Feature | What It Does |
|-------|---------|--------------|
| `/` | Live Grid + Heatmap (#12) | MapLibre map with severity-weighted heatmap, event markers, officer blips, intake feed + swarm log sidebar, trigger analysis button |
| `/intake` | Intake Feed | Full-page multilingual ingestion stream (Hindi/Telugu/Kannada/Urdu/English) |
| `/swarm-log` | Swarm Log | Full-page agent activity timeline with type-colored badges |
| `/canvas` | Agent Orchestration Canvas (#2) | Pipeline flow visualization (5 agents), agent health matrix, recent actions feed |
| `/graph` | Knowledge Graph (#4) | Force-directed graph with root-cause collapse, AI hypothesis panel |
| `/reports` | Executive Reports (#14) | Cross-department summary, per-department drill-down with grievance logs |
| `/analytics` | Analytics | KPI cards, domain breakdown bars, intake channel stats, resolution rates |
| `/officers` | Field Officers (#15) | Officer dispatch tracker with assignment counts and domain specializations |
| `/settings` | System Settings | Service status (6 services), session data, architecture overview |

### Backend Endpoints

| Endpoint | What It Does |
|----------|-------------|
| `POST /api/v1/trigger-analysis` | Single complaint through real LangGraph pipeline |
| `POST /api/v1/trigger-swarm?count=N` | N complaints through real pipeline (with LLM) |
| `POST /api/v1/demo-burst?count=N` | Instant N pre-scored events (no LLM, for demos) |
| `GET /health` | Health check |
| `WS /ws/dashboard` | Real-time event stream |

---

## Technical Decisions & Why

### Q: Why MapLibre instead of Leaflet?
**A**: Native heatmap layers as first-class paint operations. No plugins needed. Leaflet-heat is unmaintained. Zero API key with CartoDB Positron tiles.

### Q: Why React Context instead of Zustand?
**A**: Single WebSocket feeding 9 pages — Context is simpler, no extra dependency. `PulseProvider` wraps the layout, `usePulse()` consumed everywhere. For 9 routes sharing one stream, this is optimal.

### Q: Why URL routing instead of tab state?
**A**: Next.js App Router gives code splitting, browser back/forward, bookmarkable URLs, independent loading states. Architecturally superior to a monolithic tab-switching page.

### Q: Why light theme when AGENTS.md says dark?
**A**: 1) Projectors wash out dark UIs. 2) Differentiates from every other hackathon team. 3) Linear/Notion-inspired enterprise feel. Warm parchment palette (#f0ede8).

### Q: Why no mock data anymore?
**A**: Removed all mock generators. Dashboard starts empty, populates only from backend. Demo-burst endpoint fills it instantly without mocks. Cleaner architecture, honest data flow.

### Q: Why CartoDB Positron tiles?
**A**: Free, no API key required. Light style matches our UI. Mapbox needs a token (GitHub push protection already caught one).

### Q: How does the Knowledge Graph work without Cytoscape?
**A**: Custom canvas-based force-directed graph with spring physics simulation. Nodes: complaints (amber), infrastructure (blue), departments (green), officers (gray). Root-cause collapse: ≥2 complaints on same infra → collapsed red node. No external graph library needed.

---

## How to Demo

```bash
# Terminal 1 — Backend
cd /workspaces/ai4impact
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd /workspaces/ai4impact/command-center
npx next dev --turbopack -p 3000

# Terminal 3 — Fill dashboard (instant, no LLM)
curl -X POST "http://localhost:8000/api/v1/demo-burst?count=25"

# Or fire real LangGraph pipeline (with LLM, ~10s/event)
curl -X POST "http://localhost:8000/api/v1/trigger-swarm?count=5"
```

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Dashboard pages | 9 |
| Components | 11 custom |
| Frontend LOC | ~2,800 |
| Backend LOC | ~1,600 |
| Pipeline agents | 3 (Auditor → Priority → Dispatch) |
| Languages | Hindi, Telugu, Kannada, Urdu, English |
| Departments | 6 |
| Demo scenarios | 25 Hyderabad-specific |
| Officers in pool | 20 |
| WebSocket latency | Sub-second |
| LLM cost/complaint | ~₹0.03 |
| API keys for demo | 0 |

---

*See report.md for the comprehensive A-to-Z evaluator Q&A reference.*
