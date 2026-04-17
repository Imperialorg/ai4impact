"""
Civix-Pulse Backend — FastAPI Application
==========================================
Central Brain & Dispatch Engine for the agentic grievance resolution swarm.
All LLM inference runs on cloud APIs — zero local model loading.
"""

import json
import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from backend.swarm.graph import compile_graph, PulseState
except ImportError:
    from swarm.graph import compile_graph, PulseState

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("civix-pulse")

# ---------------------------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Manages active WebSocket connections for real-time dashboard updates."""

    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Dashboard client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
        logger.info(f"Dashboard client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a JSON message to all connected dashboard clients."""
        payload = json.dumps(message)
        stale: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                stale.append(connection)
        for ws in stale:
            self.active_connections.discard(ws)


manager = ConnectionManager()

# ---------------------------------------------------------------------------
# Lifespan — compile graph once on startup
# ---------------------------------------------------------------------------

swarm_app = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global swarm_app
    swarm_app = compile_graph()
    logger.info("LangGraph swarm compiled and ready.")
    yield
    logger.info("Shutting down Civix-Pulse backend.")

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Civix-Pulse API",
    description="Agentic Governance & Grievance Resolution Swarm — Central Brain",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # wide open for hackathon; lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class Coordinates(BaseModel):
    lat: float = Field(..., description="Latitude of the event")
    lng: float = Field(..., description="Longitude of the event")


class TriggerAnalysisRequest(BaseModel):
    event_id: str = Field(..., description="UUID of the Pulse Event from Pinecone")
    translated_description: str = Field(..., description="English description of the grievance")
    domain: str = Field(..., description="Category: MUNICIPAL, TRAFFIC, WATER, ELECTRICITY, etc.")
    coordinates: Coordinates


class DispatchResponse(BaseModel):
    event_type: str = "NEW_DISPATCH"
    data: dict[str, Any]

# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "civix-pulse-backend"}


@app.post("/api/v1/trigger-analysis", response_model=DispatchResponse)
async def trigger_analysis(payload: TriggerAnalysisRequest) -> DispatchResponse:
    """
    Awakens the swarm to process a newly ingested Pulse Event.
    Called by Dev 2's n8n workflow after a complaint is written to Pinecone.

    Pipeline: Cluster Check → Priority Scoring → Spatial Dispatch
    Broadcasts intake, swarm log, and dispatch events to dashboard in real-time.
    """
    logger.info(f"Trigger received for event: {payload.event_id}")
    ts = int(time.time() * 1000)

    # ── 1. Broadcast intake event (complaint received) ────────────
    await manager.broadcast({
        "type": "intake_update",
        "data": {
            "id": f"intake-{payload.event_id}",
            "channel": "portal",
            "original_text": payload.translated_description,
            "translated_text": payload.translated_description,
            "timestamp": ts,
            "coordinates": {
                "lat": payload.coordinates.lat,
                "lng": payload.coordinates.lng,
            },
        },
    })

    # ── 2. Broadcast swarm log: pipeline started ──────────────────
    await manager.broadcast({
        "type": "swarm_log",
        "data": {
            "id": f"log-{payload.event_id}-start",
            "type": "system",
            "message": f"Pipeline awakened for {payload.domain} event {payload.event_id[:12]}…",
            "timestamp": ts,
            "event_id": payload.event_id,
        },
    })

    # Build initial state for the LangGraph pipeline
    initial_state: PulseState = {
        "event_id": payload.event_id,
        "translated_description": payload.translated_description,
        "domain": payload.domain,
        "coordinates": {"lat": payload.coordinates.lat, "lng": payload.coordinates.lng},
        "cluster_found": False,
        "impact_score": 0,
        "severity_color": "#FFFF00",
        "reasoning": "",
        "matched_officer": None,
    }

    # Invoke the compiled LangGraph pipeline
    final_state = await swarm_app.ainvoke(initial_state)
    ts_after = int(time.time() * 1000)

    logger.info(
        f"Pipeline complete for {payload.event_id} | "
        f"Score: {final_state['impact_score']} | "
        f"Cluster: {final_state['cluster_found']} | "
        f"Officer: {final_state.get('matched_officer', {}).get('officer_id', 'N/A')}"
    )

    # ── 3. Broadcast swarm logs: auditor + priority + dispatch ────
    await manager.broadcast({
        "type": "swarm_log",
        "data": {
            "id": f"log-{payload.event_id}-audit",
            "type": "analysis",
            "message": (
                f"Systemic Auditor: {'CLUSTER DETECTED — linked to existing pattern' if final_state['cluster_found'] else 'No cluster match. Isolated event.'}"
            ),
            "timestamp": ts_after,
            "event_id": payload.event_id,
        },
    })

    reasoning = final_state.get("reasoning", "")
    await manager.broadcast({
        "type": "swarm_log",
        "data": {
            "id": f"log-{payload.event_id}-priority",
            "type": "analysis",
            "message": (
                f"Priority Agent: Score {final_state['impact_score']}/100 "
                f"({final_state['severity_color']}). {reasoning}"
            ),
            "timestamp": ts_after + 1,
            "event_id": payload.event_id,
        },
    })

    officer = final_state.get("matched_officer") or {}
    officer_id = officer.get("officer_id", "N/A")
    await manager.broadcast({
        "type": "swarm_log",
        "data": {
            "id": f"log-{payload.event_id}-dispatch",
            "type": "dispatch",
            "message": f"Dispatch Agent: Assigned {officer_id} → ({payload.coordinates.lat:.4f}, {payload.coordinates.lng:.4f})",
            "timestamp": ts_after + 2,
            "event_id": payload.event_id,
        },
    })

    # ── 4. Broadcast NEW_DISPATCH (map update) ────────────────────
    dispatch_payload: dict[str, Any] = {
        "event_type": "NEW_DISPATCH",
        "data": {
            "pulse_event": {
                "event_id": final_state["event_id"],
                "category": final_state["domain"],
                "impact_score": final_state["impact_score"],
                "severity_color": final_state["severity_color"],
                "cluster_found": final_state["cluster_found"],
                "coordinates": final_state["coordinates"],
                "reasoning": reasoning,
                "summary": payload.translated_description[:80],
            },
            "assigned_officer": final_state["matched_officer"],
        },
    }

    await manager.broadcast(dispatch_payload)
    logger.info(f"Broadcasted 5 events to {len(manager.active_connections)} clients.")

    return DispatchResponse(**dispatch_payload)


# ---------------------------------------------------------------------------
# Demo Burst — instant dense population (no LLM calls)
# ---------------------------------------------------------------------------

import random
import asyncio
import uuid

# ---------------------------------------------------------------------------
# Real LangGraph Batch — fires complaints through the full swarm pipeline
# ---------------------------------------------------------------------------

SWARM_COMPLAINTS: list[dict[str, Any]] = [
    {"desc": "Exposed live wire dangling over school playground in Gachibowli", "domain": "ELECTRICITY", "lat": 17.4401, "lng": 78.3489},
    {"desc": "Water main burst flooding MG Road near Secunderabad station", "domain": "WATER", "lat": 17.4399, "lng": 78.5018},
    {"desc": "Large pothole causing traffic jam at Kukatpally junction", "domain": "TRAFFIC", "lat": 17.4947, "lng": 78.3996},
    {"desc": "Garbage overflow near Charminar for 5 days strong smell", "domain": "MUNICIPAL", "lat": 17.3616, "lng": 78.4747},
    {"desc": "Crane operating without safety perimeter near hospital", "domain": "CONSTRUCTION", "lat": 17.4156, "lng": 78.4347},
    {"desc": "Sewage overflow into Malkajgiri residential area", "domain": "WATER", "lat": 17.4534, "lng": 78.5267},
    {"desc": "Gas leak at LPG distribution center Kukatpally", "domain": "EMERGENCY", "lat": 17.4849, "lng": 78.3942},
    {"desc": "Building wall collapse in Old City after rainfall", "domain": "EMERGENCY", "lat": 17.3604, "lng": 78.4736},
    {"desc": "Sparking electricity pole during rain Kondapur", "domain": "ELECTRICITY", "lat": 17.4632, "lng": 78.3522},
    {"desc": "Chemical spill at Jeedimetla industrial area", "domain": "EMERGENCY", "lat": 17.5085, "lng": 78.4498},
]


@app.post("/api/v1/trigger-swarm")
async def trigger_swarm(count: int = 5) -> dict[str, Any]:
    """
    Fires N complaints through the REAL LangGraph pipeline.
    Each event goes through: Auditor → Priority (LLM) → Dispatch.
    Events appear on the dashboard one by one as they complete.
    """
    n = min(count, len(SWARM_COMPLAINTS))
    picked = random.sample(SWARM_COMPLAINTS, n)
    results: list[dict[str, Any]] = []

    for s in picked:
        eid = str(uuid.uuid4())
        payload = TriggerAnalysisRequest(
            event_id=eid,
            translated_description=s["desc"],
            domain=s["domain"],
            coordinates=Coordinates(lat=s["lat"], lng=s["lng"]),
        )
        try:
            result = await trigger_analysis(payload)
            results.append({"event_id": eid, "status": "ok", "score": result.data["pulse_event"]["impact_score"]})
        except Exception as e:
            logger.error(f"Swarm event {eid} failed: {e}")
            results.append({"event_id": eid, "status": "error", "error": str(e)})

    ok_count = sum(1 for r in results if r["status"] == "ok")
    logger.info(f"Trigger-swarm complete: {ok_count}/{n} events processed via LangGraph.")
    return {"status": "ok", "events_fired": ok_count, "total": n, "results": results}


# ---------------------------------------------------------------------------
# Demo Burst — instant dense population (no LLM calls, for quick fills)
# ---------------------------------------------------------------------------

DEMO_SCENARIOS: list[dict[str, Any]] = [
    {"desc": "Exposed live wire dangling over school playground in Gachibowli", "domain": "ELECTRICITY", "lat": 17.4401, "lng": 78.3489, "score": 92, "cluster": True},
    {"desc": "Water main burst flooding MG Road near Secunderabad station", "domain": "WATER", "lat": 17.4399, "lng": 78.5018, "score": 88, "cluster": True},
    {"desc": "Large pothole causing traffic jam at Kukatpally junction", "domain": "TRAFFIC", "lat": 17.4947, "lng": 78.3996, "score": 61, "cluster": False},
    {"desc": "Garbage overflow near Charminar for 5 days strong smell", "domain": "MUNICIPAL", "lat": 17.3616, "lng": 78.4747, "score": 54, "cluster": False},
    {"desc": "Crane operating without safety perimeter near hospital", "domain": "CONSTRUCTION", "lat": 17.4156, "lng": 78.4347, "score": 78, "cluster": False},
    {"desc": "Sewage overflow into Malkajgiri residential area", "domain": "WATER", "lat": 17.4534, "lng": 78.5267, "score": 82, "cluster": True},
    {"desc": "Transformer explosion in Miyapur residential block", "domain": "ELECTRICITY", "lat": 17.4969, "lng": 78.3579, "score": 91, "cluster": True},
    {"desc": "Multi-car accident on ORR near Shamshabad", "domain": "EMERGENCY", "lat": 17.2403, "lng": 78.4294, "score": 89, "cluster": False},
    {"desc": "Gas leak at LPG distribution center Kukatpally", "domain": "EMERGENCY", "lat": 17.4849, "lng": 78.3942, "score": 95, "cluster": False},
    {"desc": "Building wall collapse in Old City after rainfall", "domain": "EMERGENCY", "lat": 17.3604, "lng": 78.4736, "score": 93, "cluster": False},
    {"desc": "Open manhole cover on Banjara Hills Road 1", "domain": "MUNICIPAL", "lat": 17.4109, "lng": 78.4487, "score": 72, "cluster": False},
    {"desc": "No water supply for 2 days in Uppal colony", "domain": "WATER", "lat": 17.3997, "lng": 78.5594, "score": 68, "cluster": True},
    {"desc": "Sparking electricity pole during rain Kondapur", "domain": "ELECTRICITY", "lat": 17.4632, "lng": 78.3522, "score": 94, "cluster": True},
    {"desc": "Road cave-in near Dilsukhnagar metro station", "domain": "TRAFFIC", "lat": 17.3688, "lng": 78.5255, "score": 81, "cluster": False},
    {"desc": "Fire at commercial complex in Abids area", "domain": "EMERGENCY", "lat": 17.3924, "lng": 78.4755, "score": 90, "cluster": False},
    {"desc": "Stray dog menace in Madhapur colony", "domain": "MUNICIPAL", "lat": 17.4484, "lng": 78.3908, "score": 42, "cluster": True},
    {"desc": "Illegal power tapping in Chandrayangutta", "domain": "ELECTRICITY", "lat": 17.3348, "lng": 78.4698, "score": 55, "cluster": False},
    {"desc": "Chemical spill at Jeedimetla industrial area", "domain": "EMERGENCY", "lat": 17.5085, "lng": 78.4498, "score": 96, "cluster": False},
    {"desc": "Contaminated water in Alwal area", "domain": "WATER", "lat": 17.5050, "lng": 78.4916, "score": 76, "cluster": True},
    {"desc": "Traffic signal malfunction at Paradise Circle", "domain": "TRAFFIC", "lat": 17.4425, "lng": 78.4820, "score": 63, "cluster": False},
    {"desc": "Pipeline burst flooding Begumpet underpass", "domain": "WATER", "lat": 17.4440, "lng": 78.4720, "score": 85, "cluster": True},
    {"desc": "Streetlight out on entire PVNR Expressway stretch", "domain": "ELECTRICITY", "lat": 17.3900, "lng": 78.4600, "score": 38, "cluster": False},
    {"desc": "Unauthorized building extension in Madhapur", "domain": "CONSTRUCTION", "lat": 17.4510, "lng": 78.3850, "score": 47, "cluster": False},
    {"desc": "Night construction noise exceeding 85dB limit", "domain": "CONSTRUCTION", "lat": 17.4200, "lng": 78.4100, "score": 35, "cluster": False},
    {"desc": "School zone speeding complaints Road No 10", "domain": "TRAFFIC", "lat": 17.4300, "lng": 78.4500, "score": 59, "cluster": True},
]

OFFICER_POOL = [
    {"officer_id": f"OP-{i:03d}", "current_lat": 17.385 + random.uniform(-0.06, 0.06), "current_lng": 78.4867 + random.uniform(-0.06, 0.06)}
    for i in [441, 227, 318, 512, 109, 663, 774, 155, 892, 346, 501, 213, 687, 29, 445, 760, 188, 934, 72, 611]
]

CHANNELS = ["portal", "whatsapp", "twitter", "camera", "sensor"]
REASONING_POOL = [
    "School zone proximity multiplier applied.",
    "Infrastructure failure affecting 2000+ households.",
    "Public health risk — contamination detected.",
    "Electrocution hazard in populated area.",
    "Emergency requiring immediate multi-agency response.",
    "Repeat complaints from same ward — systemic issue.",
    "Environmental hazard near water body.",
    "Traffic safety concern — accident history at location.",
    "Standard maintenance request — no immediate danger.",
    "Construction safety violation — regulatory action needed.",
]


def _score_to_color(score: int) -> str:
    if score >= 70:
        return "#FF0000"
    if score >= 40:
        return "#FFA500"
    return "#FFFF00"


@app.post("/api/v1/demo-burst")
async def demo_burst(count: int = 25) -> dict[str, Any]:
    """
    Instantly broadcasts pre-scored events to all dashboard clients.
    No LLM calls — designed for demo density. Fires up to 25 events
    with realistic scores, officer assignments, and full log trails.
    """
    n = min(count, len(DEMO_SCENARIOS))
    scenarios = random.sample(DEMO_SCENARIOS, n)
    fired = 0

    for i, s in enumerate(scenarios):
        ts = int(time.time() * 1000) + i
        eid = f"burst-{ts}-{i:03d}"
        score = s["score"] + random.randint(-5, 5)
        score = max(10, min(100, score))
        color = _score_to_color(score)
        officer = random.choice(OFFICER_POOL)
        reasoning = random.choice(REASONING_POOL)
        channel = random.choice(CHANNELS)

        # 1. Intake event
        await manager.broadcast({
            "type": "intake_update",
            "data": {
                "id": f"intake-{eid}",
                "channel": channel,
                "original_text": s["desc"],
                "translated_text": s["desc"],
                "timestamp": ts,
                "coordinates": {"lat": s["lat"], "lng": s["lng"]},
            },
        })

        # 2. Swarm logs (system + auditor + priority + dispatch)
        await manager.broadcast({
            "type": "swarm_log",
            "data": {"id": f"log-{eid}-sys", "type": "system", "message": f"Pipeline awakened for {s['domain']} event {eid[:16]}…", "timestamp": ts, "event_id": eid},
        })
        await manager.broadcast({
            "type": "swarm_log",
            "data": {"id": f"log-{eid}-aud", "type": "analysis", "message": f"Systemic Auditor: {'CLUSTER DETECTED — linked to existing pattern' if s['cluster'] else 'No cluster match. Isolated event.'}", "timestamp": ts + 1, "event_id": eid},
        })
        await manager.broadcast({
            "type": "swarm_log",
            "data": {"id": f"log-{eid}-pri", "type": "analysis", "message": f"Priority Agent: Score {score}/100 ({color}). {reasoning}", "timestamp": ts + 2, "event_id": eid},
        })
        await manager.broadcast({
            "type": "swarm_log",
            "data": {"id": f"log-{eid}-dsp", "type": "dispatch", "message": f"Dispatch Agent: Assigned {officer['officer_id']} → ({s['lat']:.4f}, {s['lng']:.4f})", "timestamp": ts + 3, "event_id": eid},
        })

        # 3. NEW_DISPATCH (map pin)
        await manager.broadcast({
            "event_type": "NEW_DISPATCH",
            "data": {
                "pulse_event": {
                    "event_id": eid,
                    "category": s["domain"],
                    "impact_score": score,
                    "severity_color": color,
                    "cluster_found": s["cluster"],
                    "coordinates": {"lat": s["lat"], "lng": s["lng"]},
                    "reasoning": reasoning,
                    "summary": s["desc"][:80],
                },
                "assigned_officer": officer,
            },
        })

        fired += 1
        await asyncio.sleep(0.08)  # slight stagger for visual effect

    logger.info(f"Demo burst: {fired} events broadcasted to {len(manager.active_connections)} clients.")
    return {"status": "ok", "events_fired": fired}

# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket) -> None:
    """Real-time event stream for the Command Center dashboard (Dev 3)."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; listen for client pings
            data = await websocket.receive_text()
            # Echo back for keep-alive / debugging
            await websocket.send_text(json.dumps({"event_type": "PONG", "data": data}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
