"""Fire demo events to populate the dashboard. Use --dense for 20 events."""
import httpx
import time
import sys

DENSE_EVENTS = [
    {"event_id": "demo-001", "translated_description": "Exposed live wire dangling over school playground in Gachibowli", "domain": "ELECTRICITY", "coordinates": {"lat": 17.4401, "lng": 78.3489}},
    {"event_id": "demo-002", "translated_description": "Water main burst flooding MG Road near Secunderabad railway station", "domain": "WATER", "coordinates": {"lat": 17.4399, "lng": 78.5018}},
    {"event_id": "demo-003", "translated_description": "Large pothole causing traffic jam at Kukatpally junction", "domain": "TRAFFIC", "coordinates": {"lat": 17.4947, "lng": 78.3996}},
    {"event_id": "demo-004", "translated_description": "Garbage overflow near Charminar for 5 days, strong smell", "domain": "MUNICIPAL", "coordinates": {"lat": 17.3616, "lng": 78.4747}},
    {"event_id": "demo-005", "translated_description": "Construction crane operating without safety perimeter near hospital", "domain": "CONSTRUCTION", "coordinates": {"lat": 17.4156, "lng": 78.4347}},
    {"event_id": "demo-006", "translated_description": "Sewage overflow into residential area contaminating groundwater in Malkajgiri", "domain": "WATER", "coordinates": {"lat": 17.4534, "lng": 78.5267}},
    {"event_id": "demo-007", "translated_description": "Transformer explosion causing power outage in Miyapur residential block", "domain": "ELECTRICITY", "coordinates": {"lat": 17.4969, "lng": 78.3579}},
    {"event_id": "demo-008", "translated_description": "Multi-car accident blocking outer ring road near Shamshabad airport exit", "domain": "TRAFFIC", "coordinates": {"lat": 17.2403, "lng": 78.4294}},
    {"event_id": "demo-009", "translated_description": "Gas leak detected at LPG distribution center Kukatpally area residents evacuating", "domain": "EMERGENCY", "coordinates": {"lat": 17.4849, "lng": 78.3942}},
    {"event_id": "demo-010", "translated_description": "Building wall collapse after heavy rainfall in Old City trapping 3 people", "domain": "EMERGENCY", "coordinates": {"lat": 17.3604, "lng": 78.4736}},
    {"event_id": "demo-011", "translated_description": "Open manhole cover on busy Banjara Hills Road 1 pedestrian injured", "domain": "MUNICIPAL", "coordinates": {"lat": 17.4109, "lng": 78.4487}},
    {"event_id": "demo-012", "translated_description": "No water supply for 2 days in Uppal colony 340 households affected", "domain": "WATER", "coordinates": {"lat": 17.3997, "lng": 78.5594}},
    {"event_id": "demo-013", "translated_description": "Sparking from electricity pole during rain in Kondapur electrocution risk", "domain": "ELECTRICITY", "coordinates": {"lat": 17.4632, "lng": 78.3522}},
    {"event_id": "demo-014", "translated_description": "Road cave-in near Dilsukhnagar metro station construction area", "domain": "TRAFFIC", "coordinates": {"lat": 17.3688, "lng": 78.5255}},
    {"event_id": "demo-015", "translated_description": "Unauthorized building extension violating setback rules in Madhapur", "domain": "CONSTRUCTION", "coordinates": {"lat": 17.4484, "lng": 78.3908}},
    {"event_id": "demo-016", "translated_description": "Fire at commercial complex in Abids area 4 fire engines dispatched", "domain": "EMERGENCY", "coordinates": {"lat": 17.3924, "lng": 78.4755}},
    {"event_id": "demo-017", "translated_description": "Stray dog menace in Madhapur colony 12 complaints in 48 hours", "domain": "MUNICIPAL", "coordinates": {"lat": 17.4484, "lng": 78.3908}},
    {"event_id": "demo-018", "translated_description": "Illegal power tapping detected in Chandrayangutta revenue loss 4.2 lakh per month", "domain": "ELECTRICITY", "coordinates": {"lat": 17.3348, "lng": 78.4698}},
    {"event_id": "demo-019", "translated_description": "Chemical spill at industrial area Jeedimetla toxic fumes evacuation in progress", "domain": "EMERGENCY", "coordinates": {"lat": 17.5085, "lng": 78.4498}},
    {"event_id": "demo-020", "translated_description": "Contaminated brownish water reported in Alwal area boil advisory needed", "domain": "WATER", "coordinates": {"lat": 17.5050, "lng": 78.4916}},
]

QUICK_EVENTS = DENSE_EVENTS[:5]

def main():
    events = DENSE_EVENTS if "--dense" in sys.argv else QUICK_EVENTS
    total = len(events)
    print(f"\nFiring {total} events {'(dense mode)' if total > 5 else '(quick mode)'}...\n")

    for i, ev in enumerate(events):
        try:
            r = httpx.post("http://localhost:8000/api/v1/trigger-analysis", json=ev, timeout=90)
            d = r.json()["data"]["pulse_event"]
            score = d["impact_score"]
            color = d["severity_color"]
            domain = ev["domain"]
            print(f"  [{i+1}/{total}] {ev['event_id']} | {domain:<14} | score={score:>3} | {color} | {ev['translated_description'][:50]}…")
        except httpx.ReadTimeout:
            print(f"  [{i+1}/{total}] {ev['event_id']} | TIMEOUT (LLM slow, mock fallback will handle)")
        except Exception as e:
            print(f"  [{i+1}/{total}] {ev['event_id']} | ERROR: {e}")
        time.sleep(0.5)

    print(f"\n✓ Done! {total} events fired. Check http://localhost:3000\n")

if __name__ == "__main__":
    main()
