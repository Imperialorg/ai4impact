import type { PulseEvent, SwarmLogEntry, IntakeFeedItem } from "./types";

const HYDERABAD_CENTER = { lat: 17.385, lng: 78.4867 };

const OFFICER_NAMES = [
  "OP-441", "OP-227", "OP-318", "OP-512", "OP-109", "OP-663",
  "OP-774", "OP-155", "OP-892", "OP-346", "OP-501", "OP-213",
  "OP-687", "OP-029", "OP-445", "OP-760", "OP-188", "OP-934",
  "OP-072", "OP-611",
];

const DOMAINS: PulseEvent["domain"][] = ["Municipal", "Traffic", "Construction", "Emergency", "Water", "Electricity"];
const CHANNELS: IntakeFeedItem["channel"][] = ["whatsapp", "twitter", "portal", "camera", "sensor"];

const SCENARIOS: { summary: string; domain: PulseEvent["domain"]; severity: PulseEvent["severity"]; log: string }[] = [
  // Municipal (8)
  { summary: "Water main break on MG Road", domain: "Municipal", severity: "critical", log: "Water Main Break classified as Critical. Flooding reported." },
  { summary: "Streetlight out on Jubilee Hills Road No. 36", domain: "Municipal", severity: "standard", log: "Streetlight failure logged. Standard priority." },
  { summary: "Garbage overflow near Charminar for 5 days", domain: "Municipal", severity: "high", log: "Sanitation alert: overflow at collection point CH-14. 5 day backlog." },
  { summary: "Open manhole cover on Banjara Hills Road 1", domain: "Municipal", severity: "critical", log: "CRITICAL: Open manhole on busy road. Pedestrian safety hazard." },
  { summary: "Park benches vandalized in KBR Park", domain: "Municipal", severity: "standard", log: "Property damage logged. Standard maintenance request." },
  { summary: "Broken water fountain leaking at Tank Bund", domain: "Municipal", severity: "standard", log: "Municipal asset damage. Water wastage flagged." },
  { summary: "Illegal dumping near Hussain Sagar lake perimeter", domain: "Municipal", severity: "high", log: "Environmental violation. Hazardous waste near water body." },
  { summary: "Stray dog menace reported across Madhapur colony", domain: "Municipal", severity: "high", log: "Animal control: 12 complaints from same ward in 48h." },

  // Water (6)
  { summary: "Low water pressure in Secunderabad Ward 7", domain: "Water", severity: "high", log: "Cluster: 23 complaints mapped to Pumping Station SEC-7." },
  { summary: "Sewage overflow into residential area in Malkajgiri", domain: "Water", severity: "critical", log: "CRITICAL: Sewage contamination. Public health risk." },
  { summary: "Pipeline burst flooding Begumpet underpass", domain: "Water", severity: "critical", log: "CRITICAL: 36-inch main burst. Road impassable. Emergency repair." },
  { summary: "No water supply since 2 days in Uppal colony", domain: "Water", severity: "high", log: "Supply disruption: 340 households affected. Tanker dispatch needed." },
  { summary: "Contaminated water complaints from Alwal area", domain: "Water", severity: "critical", log: "CRITICAL: Brownish water reported. Lab test ordered. Boil advisory issued." },
  { summary: "Leaking fire hydrant wasting water at Ameerpet", domain: "Water", severity: "standard", log: "Hydrant valve failure. Repair crew notified." },

  // Electricity (6)
  { summary: "Exposed live wire near Gachibowli school", domain: "Electricity", severity: "critical", log: "CRITICAL: Live electrical hazard in school zone. Override priority." },
  { summary: "Transformer explosion in Miyapur residential block", domain: "Electricity", severity: "critical", log: "CRITICAL: Transformer fire. 2000 households without power. Fire dept alerted." },
  { summary: "Power outage across Kondapur for 8 hours", domain: "Electricity", severity: "high", log: "Extended outage: grid failure traced to substation KDP-04." },
  { summary: "Sparking from electricity pole during rain", domain: "Electricity", severity: "critical", log: "CRITICAL: Arcing on wet pole. Electrocution risk. Area cordon needed." },
  { summary: "Streetlight flickering entire stretch of PVNR Expressway", domain: "Electricity", severity: "standard", log: "Streetlight circuit fault. Night visibility hazard on expressway." },
  { summary: "Illegal power tapping detected in Chandrayangutta", domain: "Electricity", severity: "high", log: "Power theft flagged. Revenue loss estimated ₹4.2L/month." },

  // Traffic (6)
  { summary: "Pothole causing traffic buildup near Hitech City", domain: "Traffic", severity: "high", log: "Pothole cluster detected. Traffic backup 2.3km." },
  { summary: "Traffic signal malfunction at Kukatpally junction", domain: "Traffic", severity: "high", log: "Signal outage. Manual traffic control recommended." },
  { summary: "Multi-car accident on ORR near Shamshabad", domain: "Traffic", severity: "critical", log: "CRITICAL: Multi-vehicle collision. Emergency dispatch initiated." },
  { summary: "School zone speeding complaints on Road No. 10", domain: "Traffic", severity: "high", log: "Speed camera data: 78% vehicles exceeding 25 km/h limit." },
  { summary: "Road cave-in near Dilsukhnagar metro station", domain: "Traffic", severity: "critical", log: "CRITICAL: Road subsidence. Metro construction linked. Detour set up." },
  { summary: "Waterlogging causing traffic gridlock at Paradise Circle", domain: "Traffic", severity: "high", log: "Flood alert: drainage failure. 3 km traffic jam. Diversion active." },

  // Construction (4)
  { summary: "Construction debris blocking Ameerpet footpath", domain: "Construction", severity: "high", log: "Construction violation: debris on public walkway." },
  { summary: "Crane operating without safety perimeter near hospital", domain: "Construction", severity: "critical", log: "CRITICAL: Crane safety violation. No perimeter fencing detected." },
  { summary: "Unauthorized building extension violating setback rules", domain: "Construction", severity: "high", log: "Building code violation. Stop-work notice recommended." },
  { summary: "Night-time construction noise exceeding 85dB limit", domain: "Construction", severity: "standard", log: "Noise ordinance violation. 3rd complaint this week." },

  // Emergency (4)
  { summary: "Gas leak reported at LPG distribution center Kukatpally", domain: "Emergency", severity: "critical", log: "CRITICAL: Gas leak. 500m evacuation zone. Fire brigade en route." },
  { summary: "Building wall collapse after heavy rainfall in Old City", domain: "Emergency", severity: "critical", log: "CRITICAL: Structural collapse. Rescue teams deployed. 3 trapped." },
  { summary: "Chemical spill at industrial area Jeedimetla", domain: "Emergency", severity: "critical", log: "HAZMAT: Chemical spill. Toxic fumes. Evacuation in progress." },
  { summary: "Fire at commercial complex in Abids area", domain: "Emergency", severity: "critical", log: "CRITICAL: Structure fire. 4 fire engines dispatched. Crowd control needed." },
];

const INTAKE_MESSAGES: { orig: string; trans: string; ch: IntakeFeedItem["channel"] }[] = [
  { orig: "पानी नहीं आ रहा सुबह से", trans: "No water supply since morning", ch: "whatsapp" },
  { orig: "Huge pothole on road 36 almost hit my car", trans: "Huge pothole on road 36 almost hit my car", ch: "twitter" },
  { orig: "బిల్డింగ్ సైట్ లో హెల్మెట్ లేకుండా పని చేస్తున్నారు", trans: "Workers at building site without helmets", ch: "whatsapp" },
  { orig: "[Camera Feed] Anomaly detected: waterlogging", trans: "Waterlogging detected at CCTV node KP-22", ch: "camera" },
  { orig: "Traffic jam since 1 hour near cyber towers", trans: "Traffic jam since 1 hour near Cyber Towers", ch: "portal" },
  { orig: "[IoT Sensor] Water pressure drop below threshold", trans: "Water pressure anomaly at sensor WP-SEC-07", ch: "sensor" },
  { orig: "सड़क पर तार गिरा है बहुत खतरनाक है", trans: "Fallen wire on road, very dangerous", ch: "whatsapp" },
  { orig: "Garbage not picked up for 3 days in colony", trans: "Garbage not picked up for 3 days in colony", ch: "portal" },
  { orig: "நேற்று முழுவதும் மின்சாரம் இல்லை", trans: "No electricity since yesterday entire day", ch: "whatsapp" },
  { orig: "ಮ್ಯಾನ್‌ಹೋಲ್ ತೆರೆದಿದೆ ಮಕ್ಕಳಿಗೆ ಅಪಾಯ", trans: "Manhole open, dangerous for children", ch: "whatsapp" },
  { orig: "[Camera Feed] Vehicle wrong-way on one-way street", trans: "Wrong-way vehicle detected on one-way lane TR-44", ch: "camera" },
  { orig: "[IoT Sensor] Transformer temperature critical: 98°C", trans: "Transformer overheating alert: unit TX-KDP-04", ch: "sensor" },
  { orig: "Sewage overflowing into our street for 2 days now", trans: "Sewage overflow on residential street for 2 days", ch: "portal" },
  { orig: "Building construction at night 2am very loud", trans: "Illegal night construction noise at 2am", ch: "portal" },
  { orig: "مکان گرنے والا ہے بارش سے دیوار ٹوٹی", trans: "House wall about to collapse due to rain damage", ch: "whatsapp" },
  { orig: "[IoT Sensor] Gas concentration above safe limit", trans: "Gas leak detected at sensor GL-KKP-07. Above 500ppm.", ch: "sensor" },
  { orig: "Fire in the market area near Charminar please help", trans: "Fire reported in market area near Charminar", ch: "twitter" },
  { orig: "నీళ్ళలో పురుగులు వస్తున్నాయి", trans: "Insects coming in drinking water supply", ch: "whatsapp" },
  { orig: "[Camera Feed] Crowd gathering — possible stampede risk", trans: "Unusual crowd density at event venue. Stampede risk assessment.", ch: "camera" },
  { orig: "Road completely broken after metro work nobody repaired", trans: "Road damaged by metro construction, unrepaired for weeks", ch: "twitter" },
];

function jitter(center: number, range: number) {
  return center + (Math.random() - 0.5) * range;
}

let eventCounter = 0;

function uid() {
  return `evt-${Date.now().toString(36)}-${(eventCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const SEVERITY_COLORS = { standard: "#ca8a04", high: "#dc2626", critical: "#dc2626" };

export function generatePulseEvent(): PulseEvent {
  const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  const officer = OFFICER_NAMES[Math.floor(Math.random() * OFFICER_NAMES.length)];
  const statuses: PulseEvent["status"][] = ["NEW", "ANALYZING", "DISPATCHED", "IN_PROGRESS"];
  return {
    event_id: uid(),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    coordinates: { lat: jitter(HYDERABAD_CENTER.lat, 0.08), lng: jitter(HYDERABAD_CENTER.lng, 0.08) },
    severity_color: SEVERITY_COLORS[scenario.severity],
    severity: scenario.severity,
    domain: scenario.domain,
    summary: scenario.summary,
    assigned_officer: Math.random() > 0.3 ? {
      officer_id: officer,
      current_lat: jitter(HYDERABAD_CENTER.lat, 0.06),
      current_lng: jitter(HYDERABAD_CENTER.lng, 0.06),
    } : undefined,
    log_message: scenario.log,
    timestamp: Date.now(),
  };
}

export function generateSwarmLog(event?: PulseEvent): SwarmLogEntry {
  const types: SwarmLogEntry["type"][] = ["analysis", "dispatch", "verification", "system"];
  const type = event ? (Math.random() > 0.5 ? "dispatch" : "analysis") : types[Math.floor(Math.random() * types.length)];

  const messages: Record<SwarmLogEntry["type"], string[]> = {
    analysis: [
      "Priority Agent: Impact score calculated — School Zone modifier applied.",
      "Systemic Auditor: Cluster detected — 23 complaints linked to single pump station.",
      "Domain classified: Municipal → Water Infrastructure.",
      "NLP: Sentiment = Urgent. Language = Hindi. Translated via Bhashini.",
      "Auditor: Cross-referencing 47 events in 2km radius. Pattern emerging.",
      "Priority Agent: Score 91/100 — critical infrastructure + school proximity.",
      "Auditor: Cluster confidence 94%. Root cause: Substation KDP-04 transformer failure.",
      "Domain reclassified: Emergency ← Traffic (vehicle collision detected).",
      "NLP: Sentiment = Angry. 5 repeat complaints from same citizen in 48h.",
      "Priority Agent: Societal impact multiplier 1.8x — affects 2000+ households.",
      "Auditor: No cluster match. Isolated event. First report from this zone.",
      "NLP: OCR confidence 87%. Handwritten letter processed. Language = Telugu.",
      "Priority Agent: Score 34/100 — low urgency, standard maintenance queue.",
      "Auditor: Temporal pattern — 3rd similar event this week. Systemic issue flagged.",
      "Speech-to-Text: IVR call processed. Duration 2m14s. Urgency keywords detected.",
    ],
    dispatch: [
      `Resolution Agent: Dispatching ${event?.assigned_officer?.officer_id ?? "OP-441"} to coordinates.`,
      "Matchmaker: Filtering available officers within 2km radius.",
      "Escalation: Officer declined. Pinging next closest unit.",
      `Live-Grid: Drawing dispatch line to ${event?.assigned_officer?.officer_id ?? "OP-227"}.`,
      "Dispatch: 3 officers available in zone. Selecting by skill match + proximity.",
      "Resolution Agent: ETA 12 minutes. Officer en route with equipment kit.",
      "Dispatch: Officer OP-512 accepted. Travel distance: 1.8km. ETA: 8 min.",
      "Matchmaker: No officers in 2km. Expanding radius to 5km. 2 found.",
      "SLA Timer: Started. Target resolution: 45 minutes for HIGH priority.",
      "Dispatch: Multi-officer assignment. OP-318 (primary) + OP-109 (backup).",
    ],
    verification: [
      "Verification: Geo-tagged photo received. Analyzing completion.",
      "Citizen notified via WhatsApp: 'Your issue has been resolved by Officer Raj.'",
      "Task closed. Time-to-resolution: 47 minutes.",
      "Verification: Before/after photo comparison — 92% match. Resolution confirmed.",
      "Citizen feedback: ★★★★★ 'Very fast response, thank you!'",
      "Task closed. Time-to-resolution: 23 minutes. Below SLA target ✓",
      "Verification: Photo rejected — issue not fully resolved. Reopening ticket.",
      "Citizen survey sent. Response rate: 73% this week.",
    ],
    escalation: [
      "ESCALATION: 3 officers declined. Alerting Sector Commander.",
      "SLA breach in 12 minutes. Auto-escalation queued.",
      "ESCALATION: Critical event unresolved for 2 hours. District Collector notified.",
      "SLA BREACH: Target exceeded by 34 minutes. Root cause: officer shortage in Zone 4.",
      "ESCALATION: Cluster event — 50+ complaints. Escalating to Commissioner level.",
    ],
    system: [
      "Swarm heartbeat: All 5 agents responsive. Latency: 23ms avg.",
      "Ingestion rate: 3.2 events/min across all channels.",
      "Model routing: Nemotron 120B handling classification batch.",
      "Pinecone: Index health OK. 1,247 vectors. Query latency: 12ms p99.",
      "WebSocket: 3 dashboard clients connected. Broadcast latency: 2ms.",
      "LangSmith: 847 traces logged. Pipeline success rate: 99.2%.",
      "System: Daily digest generated. 127 events processed today.",
      "Auto-scaling: Ingestion swarm scaled to 4 workers (peak hour detected).",
      "Backup: PostgreSQL snapshot completed. 23MB compressed.",
    ],
  };

  const pool = messages[type];
  return {
    id: uid(),
    type,
    message: pool[Math.floor(Math.random() * pool.length)],
    timestamp: Date.now(),
    event_id: event?.event_id,
  };
}

export function generateIntakeItem(): IntakeFeedItem {
  const msg = INTAKE_MESSAGES[Math.floor(Math.random() * INTAKE_MESSAGES.length)];
  return {
    id: uid(),
    channel: msg.ch,
    original_text: msg.orig,
    translated_text: msg.trans,
    timestamp: Date.now(),
    coordinates: { lat: jitter(HYDERABAD_CENTER.lat, 0.08), lng: jitter(HYDERABAD_CENTER.lng, 0.08) },
  };
}
