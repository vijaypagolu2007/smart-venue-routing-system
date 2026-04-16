# 🏟️ SVOS — Smart Venue Orchestration System

> **Real-time AI-powered crowd management and predictive routing for large-scale venues.**

SVOS is a tactical "Digital Twin" command console that monitors stadium crowd pressure in real time. It doesn't just react to congestion—it **predicts** it. Using a horizon-based routing engine, SVOS anticipates surges and proactively reroutes attendees along paths that minimize wait times and maximize safety, all visualized on a professional-grade Neural Graph.

---

## 🎬 Showcase Features

| Feature | Description |
|---|---|
| **Predictive AI Engine** | Projects zone density 2 steps ahead using inflow/outflow trends to pre-emptively avoid bottlenecks. |
| **"What-If" Ghosting** | Visualizes the "Naive" congested path (dashed red) vs the "Smart" AI path (green) to provide a clear baseline of performance. |
| **Predictive Horizon Glow** | A state-of-the-art heatmap layer that glows based on *future* pressure, giving situational awareness before surges happen. |
| **Tactical Dashboard** | Built with **React Flow**, featuring kinetic flow particles, glow effects, and a glassmorphic command sidebar. |
| **Wait-Time Trends** | Real-time queue velocity tracking (↑/↓) for all amenities (Food Courts, VIP Lounges, Restrooms). |
| **Emergency Modality** | The dashboard automatically transitions to "Evacuation Mode" (Red Alert) when the AI detects critical safety hazards. |

---

## ✨ Key Features

### 🧠 Modern AI Routing Layer
- **Predictive Weighting** — The Dijkstra implementation factors in `Inflow - Outflow` velocity to predict future congestion, moving from reactive to proactive management.
- **Explainable AI (XAI)** — The "Engine Directive" console translates complex mathematical weights into natural language rationale (e.g., *"Bypassing high-pressure Food Court A...*").
- **Naive Distance Calibration** — Computes raw shortest-distance paths for benchmarking against AI-weighted routes.

### 🛰️ Production-Ready Architecture
- **Distributed State Simulation** — A multi-layered simulation engine follows crowd drift patterns, ensuring a 1:1 "Digital Twin" feel.
- **Socket-Driven Sync** — High-fidelity, sequenced WebSocket pipeline ensures UI telemetry is always synchronized with the hub.
- **Modular Services** — Clean separation between simulation, state management, and the routing logic.

### 🗺️ Visual HUD (Neural Graph)
- **Radar Tracker** — A high-visibility "YOU" marker with a concentric pulse for rapid localization.
- **Dynamic Edge Scaling** — Path segments turn Yellow if internal zone pressure is high, even on a generally safe route.
- **Heatmap Overlay** — Ambient predictive glows provide global situational awareness without cluttering the nodal layout.

---

## 🏗️ Project Structure

```
svos/
├── server/                     # Node.js + Socket.io Core
│   ├── index.js                # WebSocket Hub & Event Orchestration
│   ├── config/
│   │   └── venue.json          # DECADE (Decoupled Arena Data) Topology
│   ├── services/
│   │   └── routingService.js   # Predictive AI Routing Engine (Dijkstra)
│   └── simulation/
│       ├── venueState.js       # Digital Twin State Manager
│       ├── crowdSimulator.js   # Dynamic Movement Simulation
│       └── DataPipeline.js     # Abstracted Ingestion Layer
│
├── svos-ui/                    # React 18 + Vite Frontend
│   └── src/
│       ├── components/
│       │   └── VenueFlow.jsx   # Managed React Flow Graph Component
│       ├── App.jsx             # Tactical Command HUD & State
│       └── index.css           # Modern Tactical Design System
│
└── tests/                      # Validation Suite
    └── socketTest.js           # End-to-end Socket Emitter Validation
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Flow, Framer Motion |
| **Backend** | Node.js, Express, Socket.io (WS-only) |
| **Database** | Firebase Firestore (Optional Persistence) |
| **AI/Logic** | Predictive Dijkstra (Weighted Graph Theory) |

---

## ⚡ Getting Started

### 1. Start the Backend
```bash
# From /svos
npm install
npm run dev
```

### 2. Start the Tactical Dashboard
```bash
# In a new terminal
cd svos-ui
npm install
npm run dev
```

### 3. Run Validation
To verify the routing engine and socket connection independently:
```bash
node tests/socketTest.js
```

---

<div align="center">
  <strong>Built for real-time crowd safety & venue intelligence.</strong><br/>
  <em>Strategic Virtual Orchestration System — SVOS v4.0</em>
</div>
