# 🏟️ SVOS — Smart Venue Orchestration System

> **Real-time AI-powered crowd management and intelligent routing for large-scale venues.**

SVOS is a full-stack tactical command console that monitors crowd density across arena zones in real time, computes optimal navigation paths using a shortest-path algorithm, and dynamically reroutes attendees the moment a zone becomes dangerously congested — all visualized on a live, high-fidelity neural graph dashboard.

---

## 🎬 Demo

| Feature | Preview |
|---|---|
| **Live Heatmap Pressure Field** | Radial gradient blobs merge into a continuous density map |
| **Kinetic Flow Particles** | Organic-speed dots travel along the active route |
| **AI Thinking Overlay** | "Analyzing congestion…" spinner fires before every reroute |
| **Critical Surge Banner** | Red alert drops in when any zone hits >90% capacity |
| **Config-Driven Venue Engine** | Instant stadium layout swapping via JSON without code changes |
| **Controlled Demo Mode** | 4-step narrative walkthrough for presentations |

---

## ✨ Key Features

### 🧠 Intelligence Layer
- **Dijkstra/Shortest-Path Routing** — Backend computes optimal `Zone1 → Zone4` paths every 2 seconds, factoring in live crowd density and queue wait times.
- **Congestion Alerting** — Zones exceeding 80% capacity trigger rerouting; >90% fires a critical surge banner.
- **Sequenced Pipeline** — Timestamp-based data processing ensures UI state never jitters or drifts out of order.

### 🛰️ Production-Ready Architecture
- **Config-Driven Zones** — Decoupled stadium geometry, connectivity, and SVG coordinates stored in `venue.json`.
- **Pluggable Data Pipeline** — Abstracted ingestion layer allows switching between simulation and real-world sensor streams (Cams/WiFi) via environment variables.
- **Neural Engine Overlay** — Deliberate 500–800ms "perception lag" allows the UI to feel analytical and intelligent during reroutes.

### 🗺️ Map Visualization
- **Ghost Graph** — Full venue connection graph rendered as faint dashed lines (the "neural network" backdrop).
- **Dominant Active Path** — Bright neon route with double drop-shadow and flow particles.
- **Dynamic Heatmap** — Per-zone radial gradient blobs that blend into a continuous crowd pressure field.

---

## 🏗️ Architecture

```
svos/
├── server/                     # Node.js + Express backend
│   ├── index.js                # Main server & Socket.io hub
│   ├── config/
│   │   └── venue.json          # Decoupled stadium layout & geometry
│   ├── services/
│   │   ├── routingService.js   # Dijkstra implementation
│   │   ├── alertService.js     # Threshold detection
│   │   └── firebaseService.js  # Persistence layer
│   └── simulation/
│       ├── DataPipeline.js     # Pluggable sensor abstraction layer
│       ├── stadium.js          # Config-driven zone state
│       └── crowdSimulator.js   # Production-ready drift simulation
│
├── svos-ui/                    # React + Vite frontend
│   └── src/
│       ├── App.jsx             # Dynamic dashboard (Map, SVG, Panels)
│       └── index.css           # Global design system
│
└── tests/                      # mocha/chai integration suite
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v4, Framer Motion |
| **Backend** | Node.js, Express, Socket.io (WebSocket-only transport) |
| **Database** | Firebase Firestore |
| **Transport** | High-fidelity sequenced socket pipeline |
| **Dev Tools** | Nodemon, Mocha, Chai, Supertest |

---

## ⚡ Getting Started

### 1. Configure Environment
Create a `.env` file in the root `/svos` directory:

```env
PORT=3001
DATA_SOURCE=SIMULATION # Or SENSOR_ENGINE for live feeds
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL="..."
```

### 2. Start the System
```bash
# Terminal 1: Backend
npm install
npm run dev

# Terminal 2: Frontend
cd svos-ui
npm install
npm run dev
```

---

## 🧪 Testing

SVOS includes a comprehensive integration suite to ensure routing and alert reliability.

```bash
# Run all unit and integration tests
npm test

# Run manual socket event validation
node tests/socketTest.js
```

---

## 📡 API Reference

### REST Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/config` | Returns the dynamic venue layout and graph |
| `GET` | `/crowd` | Returns current density for all zones |
| `POST` | `/route` | Returns optimal path between source and dest |

### Socket Events (Broadcast)
| Event | Payload | Frequency |
|-------|---------|-----------|
| `crowd_update` | `{ zones, timestamp }` | Every 2s |
| `auto_route` | `{ path, quality, reason, … }` | On change |
| `congestion_alert`| `{ alerts, timestamp }` | Threshold trigger |

---

## 📋 Roadmap
- [x] **Config-Driven Architecture** — Done
- [x] **Pluggable Data Pipeline** — Done (Simulation/Sensor abstraction)
- [ ] **Multi-destination routing** — Support for complex attendee journeys
- [ ] **Mobile-responsive layout** — For handheld security devices
- [ ] **Historical analytics** — Heatmap playback for incident reviews

---

<div align="center">
  <strong>Built with ⚡ for real-time crowd safety and venue intelligence.</strong>
</div>
