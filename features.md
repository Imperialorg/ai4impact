# Civix-Pulse — Feature Roadmap

> Tier-wise breakdown of all features, organized by judge-impact and demo priority for a 30-hour hackathon.
>
> **Tiering rule**: Tier 1 = the five features that define the pitch and *must* work on stage. Tier 2 = technical depth shown working but not lingered on. Tier 3 = polish, mockable, or roadmap.
>
> **Team assumption**: 3 devs minimum. 4th dev is a bonus. Build order at the bottom accounts for both.

---

## Tier 1 — "They'll Remember Us" (5 Features, Must Work Live)

These are the hero moments. If any breaks on stage, the pitch loses its spine. Budget the most time here. Five, not six — breathing room matters in 30 hours.

### 1. Autonomous Portal Filer (Computer-Use Agent)

The single most memorable moment of the demo. An agent watches a grievance arrive, opens a headless Chromium, navigates a mock BWSSB portal, fills the work-order form, and submits — on its own. A screen recording of this plays inline in the dashboard.

- Browser-Use (open source) + Playwright underneath.
- Mock portal: a dead-simple Flask app — 4 text fields, 1 dropdown, 1 submit. **No auth, no captcha, no file upload, no multi-step wizard.** Keep it trivially simple so the automation is reliable.
- LLM drives via accessibility tree first (cheap, fast), falls back to screenshots for visual-only elements.
- Full session recorded as a Playwright trace → tamper-proof audit log.
- **Demo strategy**: Pre-record a successful run before going on stage. Play the video during the pitch. Keep live mode as a Q&A flex if judges ask "is this real?" Never stake 5 minutes of stage time on non-deterministic AI.
- **Why it wins**: zero-API integration for the 80% of government portals that will never expose REST. No other civic-AI team will show this.

### 2. Live Agent Orchestration Canvas

Real-time UI showing LangGraph nodes activating as agents process a grievance: ingestion → triage → clustering → resolution → portal-filing.

- Visualizes the LangGraph state machine in the browser.
- Each node pulses on activation; edges animate data flow; status badges show `idle` / `processing` / `complete` / `error`.
- **Paired with #1**: the "Resolution" node culminates in the browser recording playing, not just a green checkmark.
- Built-in reasoning trace: every node logs its chain-of-thought (inputs → logic → output → confidence). Visible as a collapsible panel per complaint. This is not a separate feature — it's a property of building the canvas correctly.
- **Time budget**: 4–5 hours max. If animations are eating time, fall back to a clean sequential log with status badges. Judges care about the pipeline working, not CSS transitions.

### 3. Multilingual Voice-First Intake (Bhashini VoicERA)

Citizen sends a Hindi voice note on WhatsApp → transcribed, translated, classified, routed. One 60-second clip of a citizen complaining in Hindi is worth more than any slide.

- Bhashini hosted STT + translation APIs. **Hindi + English only. Don't add more languages.** One language working perfectly beats three with edge-case glitches.
- WhatsApp Business sandbox as the channel (Telegram fallback if WhatsApp provisioning is slow).
- Response translated back to citizen's language.
- **Pre-work (before hackathon starts)**: provision Bhashini API access 2–3 days in advance — onboarding isn't instant. Pre-record 3–4 audio clips in Hindi of realistic complaints. Have a Whisper/Google STT fallback if Bhashini is down during your demo slot.
- **India-context win**: judges from Indian institutions look for this explicitly.

### 4. Governance Knowledge Graph with Root-Cause Collapse

Force-directed graph linking complaints → infrastructure → departments → officers. When the Systemic Auditor detects 50 low-pressure complaints tracing to one pump station, the graph **visually collapses** them into a single root-cause node.

- Interactive, zoomable (Cytoscape.js or D3-force).
- Nodes: complaints, infrastructure assets, departments, officers.
- Edges: `assigned_to`, `caused_by`, `resolved_by`, `affects`.
- Root-cause collapse animation is the visual payoff.
- LLM generates a plain-language hypothesis per cluster: *"Fixing Pump Station 7 would likely resolve 47 of these complaints."*
- **Honesty note**: this is clustering (DBSCAN on embeddings) + LLM narrative generation, not formal causal inference. Call it "root-cause hypothesis" in the pitch, not "causal analysis." In Q&A, if asked how you *know* it's the pump, the honest answer is: "the model hypothesises from complaint text and infrastructure proximity — a field engineer confirms before action." That's a responsible answer.

### 5. Proactive Sensing Agent (Satellite + CCTV)

Auto-filed grievances on behalf of silent citizens. The system spots problems from satellite imagery or street cameras before anyone complains.

- **Satellite**: 2–3 pre-cached before/after Sentinel-2 tiles. A live Grounding-DINO zero-shot call on stage with prompt "garbage pile" or "waterlogging" surfaces a detection → auto-files a grievance.
- **CCTV**: a single Gemini 3 video clip (~30s of footage) analysed on stage — detects waterlogging or an open manhole.
- Can be pre-baked images + a real LLM API call during demo. Doesn't need full production pipeline.
- **Narrative payoff**: *"These grievances were filed by nobody. Our satellite agent found them. We file for the people who never file."* This is your paradigm-shift moment — you go from "we process complaints better" to "we generate complaints from reality."
- **Why Tier 1 over Heatmap**: every civic-tech hackathon has a coloured map. Nobody has "we detected this from space." This is the line judges repeat to each other during deliberation.

---

## Tier 2 — "Yes, It's Real" (6 Features, Happy-Path Demo)

Technical depth that proves engineering rigor. Each should work on a happy-path demo but doesn't need to be bulletproof. These fill the middle of the pitch and survive Q&A.

### 6. AI-Verified Resolution Pipeline

Officer uploads a "verification photo" → vision model confirms the issue is actually fixed before the ticket closes.

- Gemini 3 Flash vision compares before/after photos.
- Binary verdict (`Resolved` / `Not Resolved`) + confidence score.
- Corruption prevention story: not just human-says-done, **AI-confirms-done**.
- Implementation: ~2 hours. One prompt, two images, structured output.
- Strong feature, clean story, just not a hero moment — that's why it's top of Tier 2 instead of Tier 1.

### 7. Constitutional / Policy RAG Engine

RAG pipeline over government policy documents, RTI acts, municipal bylaws. On each complaint, auto-cites relevant policy, applicable SLA, responsible authority.

- **Scope control**: exactly 5 PDFs. The Karnataka Right to Services Act, one RTI act, one municipal bylaw, two departmental SLA docs. Don't ingest 50 — retrieval quality degrades fast with volume.
- Chunk, embed, retrieve, cite alongside the grievance in the dashboard.
- Enables **governed AI with verifiable citations** — a scoring criterion judges check for.

### 8. Auto-Appeal & Mock UPI Compensation

On SLA breach, the system drafts a Right-to-Services Commission appeal as a PDF and shows a mock UPI payout toast.

- LLM generates a legally-plausible appeal letter → rendered as downloadable PDF.
- Frontend shows `"₹250 credited to citizen UPI for SLA breach"` notification.
- No real UPI integration needed.
- **Social-impact punchline**: the system costs the government money when it fails. This is the only thing that actually changes bureaucratic behavior.
- ~2 hours to build. Don't skip it — it's the emotional close of the pitch.

### 9. Multimodal Parallel Ingestion Demo

Three modalities processed simultaneously through the Agent Canvas.

- **Handwritten letter** → OCR → structured JSON.
- **Voice complaint** → Bhashini STT → classified grievance.
- **Text / WhatsApp** → NLP → categorized complaint.
- All three flowing through the canvas at once. Visual proof the swarm is real.

### 10. Semantic Duplicate & Cluster Engine

Embedding-based similarity search auto-merges near-duplicate complaints.

- Pgvector + any embedding model (OpenAI, Cohere, or open-source).
- Auto-merge with a representative summary per cluster.
- Citizen-facing: *"47 others reported this same issue."*
- Feeds directly into the Knowledge Graph's root-cause collapse (#4).

### 11. Priority Agent with Sentiment, Vulnerability & SLA Awareness

One unified priority scorer that combines everything — not three separate features.

- **Impact Matrix**: severity × blast-radius × vulnerability × time-decay.
- **Sentiment analysis**: desperate vs routine tone (single LLM call with structured output).
- **Vulnerability flags**: elderly, disabled, low-income (keyword + LLM-scored).
- **SLA breach prediction**: category + department workload + time-in-queue → breach probability. Auto-escalates with a generated briefing when threshold exceeded.
- Reasoning trace emitted as structured JSON → displayed in the canvas's collapsible panel (#2).
- This is one prompt with one structured output schema, not four features.

---

## Tier 3 — "Polish & Roadmap" (Mock or Defer)

Time-permitting. Most mockable in 20 minutes. Some are just slides.

### 12. Predictive Hotspot Heatmap

Leaflet/Mapbox complaint density map with category filters. Skip the "prediction overlay" unless you have real historical data — Prophet on 60 seeded complaints is statistical theater. A clean density heatmap with drill-down is still valuable and honest.

### 13. Content-Credentials & Deepfake Guard

Perceptual hash for photo-reuse detection + simple AI-image classifier for synthetic content. Build the hash check (30 min). Mention C2PA in a slide. This is a **judge-Q&A defense**, not a demo feature. Pre-empts: *"What stops fake complaints?"*

### 14. Auto-Generated Executive Reports

One-click PDF: systemic issues, resolution metrics, department scorecards. LLM-written narrative + charts.

### 15. Department Performance Leaderboard

Gamified scorecards — fastest resolvers, lowest reopen rate, highest satisfaction. Competitive accountability layer.

### 16. Anomaly Spike Detection

Real-time alert on abnormal volume spikes. *"⚠️ 300% increase in water complaints in Zone 4."* Auto-triggers emergency workflow.

### 17. Citizen Feedback Loop

Post-resolution rating via WhatsApp/SMS. Stars + optional text → feeds officer performance metrics. Closes the loop.

### 18. Budget Impact Estimator

*"Fixing pump X costs ₹2L but resolves 50 complaints affecting 2,000 residents."* Ranks systemic issues by ROI.

### 19. Red-Team Adversary Agent

Shadow agent inventing adversarial grievances (spam waves, geo-spoofing, deepfake photos) to stress-test the swarm. Mention in architecture slide as a roadmap item. Don't build it.

---

## Demo Script (5 Minutes, Revised Pacing)

Build tension → peak with browser automation → land on social impact.

1. **Problem framing** (30s) — 30 lakh grievances/year, 16-day resolution, silent citizens never heard. *"Complaints are treated as tickets to close, not insights to solve."*

2. **Citizen submits** a Hindi WhatsApp voice note live (Tier 1 #3). Arrives on screen.

3. **Ingestion Swarm** processes it alongside a pre-staged handwritten letter + text complaint — three channels in parallel (Tier 2 #9).

4. **Agent Canvas** lights up node-by-node (Tier 1 #2). Priority scores with sentiment and vulnerability reasoning visible.

5. **Systemic Auditor** links to 47 existing complaints. **Knowledge Graph collapses** to one root cause (Tier 1 #4). LLM narrates: *"Pump Station 7 pressure drop — fixing it resolves 47 tickets."*

6. **Proactive Sensing** (Tier 1 #5) — *"But these next complaints were filed by nobody."* Show satellite detection + CCTV clip. *"Our agents file for the people who never file."*

7. **SLA breach on an older ticket** → auto-appeal PDF generates, mock UPI credit: *"₹250 sent to the citizen. When the system fails, it pays."* (Tier 2 #8). This builds the stakes.

8. **🔥 Hero moment** — *"And here's how the system resolves it."* Resolution Agent opens a browser, fills the BWSSB portal, submits. **Narrate while it runs**: *"Claude is reading the form… selecting the Water department… pasting coordinates… submitting."* (Tier 1 #1). 30 seconds.

9. **Verification** — officer uploads a photo, vision AI confirms resolved (Tier 2 #6). Quick, clean.

10. **Close** (45s) — architecture slide, LLMflation cost curve (₹0.03/ticket today, 10× cheaper yearly), roadmap of Tier 3 features. *"We don't route tickets. We detect, file, resolve, and penalize."*

---

## Build Order (30 Hours)

### Pre-hackathon (do this the day before)

- Docker Compose with Postgres (pgvector enabled), Redis, MinIO — tested, working.
- Bhashini API access provisioned and tested with a curl call.
- Anthropic + Google AI Studio API keys loaded with credits ($30 Anthropic, Gemini free tier).
- 60 seeded complaints with realistic Bangalore ward coordinates, timestamps spanning 3 weeks, natural clusters (15 water near one pump, 10 potholes on one road, 8 electricity in one feeder zone). **This takes 2 hours to do well. Don't generate random data.**
- 3–4 pre-recorded Hindi audio clips of realistic complaints.
- Mock BWSSB portal Flask app: 4 text fields, 1 dropdown, 1 submit button, styled to look government-ish. Tested with Browser-Use once.
- 2–3 Sentinel-2 before/after image pairs downloaded and ready.
- One 30-second CCTV-style video clip showing visible waterlogging or open manhole.

### Hours 0–6 — Skeleton (all hands)

- FastAPI backend: intake endpoint, grievance CRUD, embedding on insert.
- Next.js shell: dashboard layout, complaint list, map placeholder.
- Verify Bhashini STT end-to-end: audio in → text out → complaint created.
- Verify Browser-Use: can open mock portal and fill one field reliably.
- Everything talks to Postgres. Don't optimise, just connect.

### Hours 6–16 — Parallel Tracks

**Dev A (Canvas + Pipeline)**:
- LangGraph state machine with 4 nodes: Ingestion → Priority → Auditor → Resolution.
- Each node emits structured JSON logs (the "reasoning trace" — this is not a separate feature, it's how you build the pipeline).
- React component for the canvas: nodes, edges, status badges. Keep animations minimal — a coloured border change is enough.

**Dev B (Knowledge Graph + Clustering)**:
- Pgvector similarity search on seeded complaints.
- DBSCAN clustering → cluster summary via LLM.
- Cytoscape.js or D3-force graph in the frontend.
- Root-cause collapse animation (group nodes → single node with label).
- Proactive sensing integration: wire up one Grounding-DINO API call and one Gemini 3 video call. Pre-cache results but make the API call live on stage.

**Dev C (Browser Automation — MUST NOT SLIP)**:
- Browser-Use + Claude Sonnet 4.6 reliably filling the mock portal end-to-end.
- Record 3 successful runs as backup videos.
- Wire it into the Resolution node of LangGraph so it triggers from the pipeline.
- Build the "session replay" component in the dashboard that plays the recording.
- If this is done early, help Dev A or Dev B.

**Dev D (if you have a 4th) or split across A/B after hour 12**:
- Priority scorer: one prompt, structured output with impact score + sentiment + vulnerability + reasoning.
- Hotspot map: Leaflet with complaint markers + density gradient. No prediction layer.
- Policy RAG: chunk 5 PDFs, embed, retrieve on complaint creation, show citations in dashboard.

### Hours 16–24 — Integration + Tier 2

- End-to-end flow: WhatsApp voice note → ingestion → canvas → priority → cluster → resolution → browser filing. All connected.
- Vision verification: before/after photo comparison on 3 sample pairs (#6).
- Auto-appeal PDF generation + UPI toast (#8).
- Multimodal parallel demo: trigger OCR + STT + text simultaneously through the canvas (#9).
- Duplicate detection message: *"47 others reported this"* (#10).
- Deepfake hash check — 30 minutes, just perceptual hash comparison (#13).

### Hours 24–27 — Polish

- Tier 3 items if time: executive report PDF (#14), leaderboard (#15), anomaly alert (#16).
- UI cleanup: loading states, error handling on the happy path, mobile-responsive complaint view.
- **Pitch deck** — someone starts this at hour 20 latest. Architecture diagram, cost slide, roadmap, problem framing.

### Hours 27–30 — Lockdown

- **Feature freeze at hour 27. No new code.**
- Record backup demo videos of every Tier 1 feature working.
- Rehearse the 5-minute demo 3 times end-to-end with the real setup.
- Test on the actual projector/screen if accessible.
- Charge all devices. Test the hotspot.

---

### If You Only Have 3 Devs

Drop Dev D's track. The priority scorer becomes a simple hardcoded prompt inside Dev A's LangGraph pipeline (still works, just less sophisticated). Hotspot map uses raw markers without density gradient. Policy RAG moves to hour 16–24 integration window or gets cut entirely. Everything else stays.

---

*This document is the single source of truth for Civix-Pulse feature scope and prioritization.*
