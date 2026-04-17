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
