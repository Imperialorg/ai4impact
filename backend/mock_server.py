"""
Civix-Pulse Mock Backend — FastAPI WebSocket server.

Simulates the real backend by streaming pulse_update, intake_update,
swarm_log, and event_status messages over ws://localhost:8000/ws/dashboard.

Usage:
    python backend/mock_server.py
    # or: uvicorn backend.mock_server:app --host 0.0.0.0 --port 8000 --reload

Frontend env:
    NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/dashboard
"""

import asyncio
import json
import random
import time
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Civix-Pulse Mock Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Hyderabad mock data ────────────────────────────────────────────

HYDERABAD = (17.385, 78.4867)

SCENARIOS = [
    {"summary": "Water main break on MG Road", "domain": "Municipal", "severity": "critical", "color": "#dc2626"},
    {"summary": "Pothole causing traffic buildup near Hitech City", "domain": "Traffic", "severity": "high", "color": "#dc2626"},
    {"summary": "Exposed live wire near Gachibowli school", "domain": "Emergency", "severity": "critical", "color": "#dc2626"},
    {"summary": "Streetlight out on Jubilee Hills Road No. 36", "domain": "Municipal", "severity": "standard", "color": "#ca8a04"},
    {"summary": "Construction debris blocking Ameerpet footpath", "domain": "Construction", "severity": "high", "color": "#dc2626"},
    {"summary": "Traffic signal malfunction at Kukatpally junction", "domain": "Traffic", "severity": "high", "color": "#dc2626"},
    {"summary": "Garbage overflow near Charminar", "domain": "Municipal", "severity": "standard", "color": "#ca8a04"},
    {"summary": "Crane operating without safety perimeter", "domain": "Construction", "severity": "critical", "color": "#dc2626"},
    {"summary": "Multi-car accident on ORR near Shamshabad", "domain": "Emergency", "severity": "critical", "color": "#dc2626"},
    {"summary": "Low water pressure in Secunderabad Ward 7", "domain": "Municipal", "severity": "standard", "color": "#ca8a04"},
]

OFFICERS = ["OP-441", "OP-227", "OP-318", "OP-512", "OP-109", "OP-663"]

INTAKE_MESSAGES = [
    {"orig": "पानी नहीं आ रहा सुबह से", "trans": "No water supply since morning", "ch": "whatsapp"},
    {"orig": "Huge pothole on road 36 almost hit my car", "trans": "Huge pothole on road 36 almost hit my car", "ch": "twitter"},
    {"orig": "బిల్డింగ్ సైట్ లో హెల్మెట్ లేకుండా", "trans": "Workers at building site without helmets", "ch": "whatsapp"},
    {"orig": "[Camera Feed] Anomaly detected: waterlogging", "trans": "Waterlogging detected at CCTV node KP-22", "ch": "camera"},
    {"orig": "Traffic jam since 1 hour near cyber towers", "trans": "Traffic jam since 1 hour near Cyber Towers", "ch": "portal"},
    {"orig": "[IoT Sensor] Water pressure drop below threshold", "trans": "Water pressure anomaly at sensor WP-SEC-07", "ch": "sensor"},
    {"orig": "सड़क पर तार गिरा है बहुत खतरनाक है", "trans": "Fallen wire on road, very dangerous", "ch": "whatsapp"},
    {"orig": "Garbage not picked up for 3 days in colony", "trans": "Garbage not picked up for 3 days in colony", "ch": "portal"},
]

SWARM_MESSAGES = [
    {"type": "analysis", "msg": "Priority Agent: Impact score calculated — School Zone modifier applied."},
    {"type": "analysis", "msg": "Systemic Auditor: Cluster detected — 23 complaints linked to single pump station."},
    {"type": "analysis", "msg": "NLP: Sentiment = Urgent. Language = Hindi. Translated via Bhashini."},
    {"type": "dispatch", "msg": "Resolution Agent: Dispatching closest available unit to coordinates."},
    {"type": "dispatch", "msg": "Matchmaker: Filtering available officers within 2km radius."},
    {"type": "dispatch", "msg": "Escalation: Officer declined. Pinging next closest unit."},
    {"type": "verification", "msg": "Verification: Geo-tagged photo received. Analyzing completion."},
    {"type": "verification", "msg": "Citizen notified via WhatsApp: 'Your issue has been resolved.'"},
    {"type": "escalation", "msg": "ESCALATION: 3 officers declined. Alerting Sector Commander."},
    {"type": "escalation", "msg": "SLA breach in 12 minutes. Auto-escalation queued."},
    {"type": "system", "msg": "Swarm heartbeat: All 4 agents responsive."},
    {"type": "system", "msg": "Ingestion rate: 3.2 events/min across all channels."},
    {"type": "system", "msg": "Model routing: Gemini Flash handling classification batch."},
]


def jitter(center: float, spread: float) -> float:
    return center + (random.random() - 0.5) * spread


active_events: list[str] = []


def make_pulse_update() -> dict:
    s = random.choice(SCENARIOS)
    has_officer = random.random() > 0.3
    event_id = f"evt-{uuid.uuid4().hex[:8]}"
    active_events.append(event_id)
    if len(active_events) > 30:
        active_events.pop(0)

    data = {
        "event_id": event_id,
        "status": "DISPATCHED" if has_officer else random.choice(["NEW", "ANALYZING"]),
        "coordinates": {"lat": jitter(HYDERABAD[0], 0.08), "lng": jitter(HYDERABAD[1], 0.08)},
        "severity_color": s["color"],
        "severity": s["severity"],
        "domain": s["domain"],
        "summary": s["summary"],
        "log_message": f"{s['summary']} — classified as {s['severity'].upper()}.",
        "timestamp": int(time.time() * 1000),
    }
    if has_officer:
        officer = random.choice(OFFICERS)
        data["assigned_officer"] = {
            "officer_id": officer,
            "current_lat": jitter(HYDERABAD[0], 0.06),
            "current_lng": jitter(HYDERABAD[1], 0.06),
        }
    return {"type": "pulse_update", "data": data}


def make_intake_update() -> dict:
    m = random.choice(INTAKE_MESSAGES)
    return {
        "type": "intake_update",
        "data": {
            "id": str(uuid.uuid4()),
            "channel": m["ch"],
            "original_text": m["orig"],
            "translated_text": m["trans"],
            "timestamp": int(time.time() * 1000),
            "coordinates": {"lat": jitter(HYDERABAD[0], 0.08), "lng": jitter(HYDERABAD[1], 0.08)},
        },
    }


def make_swarm_log() -> dict:
    m = random.choice(SWARM_MESSAGES)
    return {
        "type": "swarm_log",
        "data": {
            "id": str(uuid.uuid4()),
            "type": m["type"],
            "message": m["msg"],
            "timestamp": int(time.time() * 1000),
        },
    }


def make_event_status() -> dict | None:
    if not active_events:
        return None
    return {
        "type": "event_status",
        "data": {
            "event_id": random.choice(active_events),
            "status": "RESOLVED",
        },
    }


# ── WebSocket endpoint ─────────────────────────────────────────────

@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    await websocket.accept()
    print(f"[mock] Dashboard client connected")
    try:
        while True:
            roll = random.random()
            if roll < 0.35:
                msg = make_pulse_update()
            elif roll < 0.55:
                msg = make_intake_update()
            elif roll < 0.80:
                msg = make_swarm_log()
            elif roll < 0.90:
                msg = make_event_status()
                if msg is None:
                    msg = make_swarm_log()
            else:
                await asyncio.sleep(2)
                continue

            await websocket.send_text(json.dumps(msg))
            await asyncio.sleep(random.uniform(1.5, 3.0))
    except WebSocketDisconnect:
        print(f"[mock] Dashboard client disconnected")


# ── Health check ───────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "mode": "mock", "service": "civix-pulse-backend"}


# ── Run directly ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("🚀 Civix-Pulse Mock Backend starting on http://0.0.0.0:8000")
    print("   WebSocket: ws://localhost:8000/ws/dashboard")
    print("   Health:    http://localhost:8000/health\n")
    uvicorn.run("backend.mock_server:app", host="0.0.0.0", port=8000, log_level="info")
