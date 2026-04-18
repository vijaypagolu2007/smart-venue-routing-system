/**
 * SVOS TACTICAL DASHBOARD
 * Core frontend application for real-time stadium orchestration.
 * Connects to the Core Engine via WebSockets for live data.
 */
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import VenueFlow from "./components/VenueFlow";
import LoginPage from "./pages/LoginPage";
import { analytics, auth, db } from "./firebase";
import { logEvent } from "firebase/analytics";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ─── SOCKET BRIDGE ────────────────────────────────────────────────────────────
const BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : window.location.origin;

const socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: true });

// ─── STATIC CONFIG ────────────────────────────────────────────────────────────
// ─── HELPERS ─────────────────────────────────────────────────────────────────
// Global Null Guard for Node Rendering
const ensureCoords = (z, zonePositions) => zonePositions[z] || { x: "50%", y: "50%" };

// Pre-compute stable random durations for particles (wider range = more organic)
const PARTICLE_DURATIONS = Array.from({ length: 20 }, () =>
  (0.7 + Math.random() * 1.8).toFixed(2)
);

// ─── DEMO MODE CONFIG ────────────────────────────────────────────────────────
const DEMO_STEPS = [
  {
    id: 0,
    label: "Step 1 of 3",
    title: "System Live",
    desc: "Arena monitoring active. All zones nominal. AI routing optimized.",
    action: null,
    color: "emerald",
  },
  {
    id: 1,
    label: "Step 2 of 3",
    title: "Surge Event",
    desc: "Simulating Food Court overcapacity event. Watch the AI respond.",
    action: "spike",
    color: "red",
  },
  {
    id: 2,
    label: "Step 3 of 3",
    title: "AI Rerouting",
    desc: "Neural engine bypassing congested zone. Optimal path restored.",
    action: null,
    color: "blue",
  },
  {
    id: 3,
    label: "Complete",
    title: "System Restored",
    desc: "Crowd normalized. Routing efficiency returned to optimal state.",
    action: null,
    color: "emerald",
  },
];


const DEMO_PHASES = {
  RUNNING: "running",
  PAUSED: "paused",
  SPIKE: "spike",
  THINKING: "thinking"
};

/**
 * App Component
 * The main container for the dashboard. Manages state, socket listeners,
 * and renders the interactive map and sidebar.
 */
export default function App() {
  const [config, setConfig]       = useState(null);
  const [zones, setZones]         = useState({});
  const [routeData, setRouteData] = useState({ path: [], naivePath: [], quality: "N/A", confidence: "—", reason: "" });
  const [queues, setQueues]       = useState({});
  const [prevQueues, setPrevQueues] = useState({});
  const [status, setStatus]       = useState("Connecting...");
  const [spikeAlert, setSpikeAlert] = useState(null);
  const [spiking, setSpiking]       = useState(false);
  const [demoStep, setDemoStep]     = useState(-1); // -1 = demo not started
  const spikeTimer = useRef(null);
  const demoTimer  = useRef(null);

  const [displayRoute, setDisplayRoute] = useState([]);
  const [pathFading, setPathFading] = useState(false);
  const [demoPhase, setDemoPhase] = useState(DEMO_PHASES.RUNNING);
  const [heatmapActive, setHeatmapActive] = useState(false);
 
  const [isProcessing, setIsProcessing] = useState(false); 
  const lastTs = useRef(0); 
  const procLock = useRef(false); 
  const [buffer, setBuffer] = useState(null); 
  const pendingRoute = useRef(null);
 
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── DYNAMIC ASSETS Derived from Config
  const zoneMap = useMemo(() => {
    if (!config) return {};
    const map = {};
    Object.entries(config.zones).forEach(([id, z]) => map[id] = z.name);
    return map;
  }, [config]);

  const zonePositions = useMemo(() => {
    if (!config) return {};
    const pos = {};
    Object.entries(config.zones).forEach(([id, z]) => pos[id] = z.pos);
    return pos;
  }, [config]);

  const venueEdges = useMemo(() => {
    return config?.edges || [];
  }, [config]);

  // ── Socket wiring
  useEffect(() => {
    // 1. Fetch Config First
    fetch(`${BACKEND_URL}/config`)
      .then(r => r.json())
      .then(d => setConfig(d))
      .catch(e => console.error("Config load failed", e));

    socket.on("connect", () => setStatus("Live"));
    socket.on("connect_error", () => setStatus("Error"));
 
    // Auth Listener
    let unsubscribeAuth = () => {};
    if (auth) {
      unsubscribeAuth = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
      });
    } else {
      setAuthLoading(false);
    }
 
    socket.on("crowd_update", (payload) => {
      if (demoPhase === DEMO_PHASES.PAUSED || demoPhase === DEMO_PHASES.THINKING || !payload?.zones) return; 
      const { zones: d, timestamp } = payload;
      if (timestamp < lastTs.current) return;
      lastTs.current = timestamp;
 
      if (procLock.current) {
        setBuffer({ type: "crowd", data: d });
        return;
      }
 
      procLock.current = true;
      setIsProcessing(true);
      setZones(d);
       
      const critical = Object.entries(d).find(([, z]) => (z.density / z.capacity) * 100 > 90);
      if (critical) {
        const [zId, zData] = critical;
        setSpikeAlert({ zone: zId, pct: ((zData.density / zData.capacity) * 100).toFixed(0) });
 
        // Log Critical Surge to Analytics & Firestore
        if (analytics && typeof analytics.logEvent === 'function') {
          logEvent(analytics, "surge_detected", { zone: zId, pct: zData.density / zData.capacity });
        }
        
        if (db) {
          addDoc(collection(db, "incidents"), {
            type: "SURGE",
            zone: zId,
            capacity_pct: (zData.density / zData.capacity),
            timestamp: serverTimestamp()
          }).catch(err => console.warn("Firestore Log Failed:", err));
        }
 
        clearTimeout(spikeTimer.current);
        spikeTimer.current = setTimeout(() => setSpikeAlert(null), 4000);
      }
 
      setIsProcessing(false);
      procLock.current = false;
    });

    socket.on("queue_update", (payload) => {
      if (demoPhase === DEMO_PHASES.PAUSED || demoPhase === DEMO_PHASES.THINKING || !payload?.data) return; 
      const { data: d, timestamp } = payload;
      if (timestamp < lastTs.current) return;
      setQueues(prev => {
        setPrevQueues(prev);
        return d;
      });
    });

    socket.on("auto_route_update", (payload) => {
      if (!payload || !payload.path) return;
      if (demoPhase === DEMO_PHASES.PAUSED || demoPhase === DEMO_PHASES.THINKING) return; 
      const { timestamp, path, naivePath } = payload;
      if (timestamp < lastTs.current) return;
      
      if (procLock.current) {
        setBuffer({ type: "route", data: payload });
        return;
      }

      procLock.current = true;
      setIsProcessing(true);
      pendingRoute.current = payload;

      setPathFading(true);
      setTimeout(() => {
        setRouteData(payload);
        setDisplayRoute(path || []);
        setPathFading(false);
        setTimeout(() => {
          procLock.current = false;
          setIsProcessing(false);
        }, 800);
      }, 350);
    });

    return () => {
      socket.removeAllListeners();
      unsubscribeAuth();
      clearTimeout(spikeTimer.current);
      clearTimeout(demoTimer.current);
    };
  }, [BACKEND_URL]); //config fetch and sockets dependent only on base URL

  // Buffer clearing effect — when lock releases, process latest pending update
  useEffect(() => {
    if (!isProcessing && buffer) {
      const next = buffer;
      setBuffer(null);
      if (next.type === "crowd") {
        setZones(next.data);
      } else if (next.type === "route") {
        setRouteData(next.data);
      }
    }
  }, [isProcessing, buffer]);
 
  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (analytics && typeof analytics.logEvent === 'function') {
        logEvent(analytics, "logout", { method: "manual" });
      }
    } catch (e) {
      console.error("Sign Out Failure", e);
    }
  };
 
  const route = displayRoute;

  // FIX 5 — detect avoided zone for congestion highlighting (regex updated for bracketed IDs)
  const avoidedZone = useMemo(() => {
    const m = routeData.reason?.match(/\(([A-Z0-9]+)\)/);
    return m ? m[1] : null;
  }, [routeData.reason]);



  // Advance demo story — each call moves to next step and fires its action
  const advanceDemo = useCallback(() => {
    setDemoStep((prev) => {
      const next = prev === -1 ? 0 : prev + 1;
      if (next >= DEMO_STEPS.length) return prev;
      return next;
    });
  }, []);

  // Handle Demo Step Side Effects
  useEffect(() => {
    if (demoStep < 0) return;
    const step = DEMO_STEPS[demoStep];
    
    if (analytics && typeof analytics.logEvent === 'function') {
      logEvent(analytics, "demo_step", { step_id: demoStep, title: step.title });
    }

    if (step.action === "spike") {
      setSpiking(true);
      socket.emit("trigger_spike");
      
      clearTimeout(demoTimer.current);
      demoTimer.current = setTimeout(() => {
        setDemoStep(2);
        demoTimer.current = setTimeout(() => setDemoStep(3), 8000);
      }, 2000);
      
      setTimeout(() => setSpiking(false), 10000);
    }
  }, [demoStep]);

  // Build active‑route edge set for quick lookup
  const activeEdgeSet = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < route.length - 1; i++) s.add(`${route[i]}-${route[i + 1]}`);
    return s;
  }, [route]);

      {/* AUTHENTICATION GATE */}
      if (!user && !authLoading) {
        return <LoginPage onLoginSuccess={() => {}} />;
      }

      if (authLoading) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-slate-950 text-blue-400 uppercase tracking-[0.4em] font-black animate-pulse">
            Verifying Clearance…
          </div>
        );
      }

      if (!config) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-slate-950 text-blue-400 uppercase tracking-[0.4em] font-black animate-pulse">
            Initializing Venue Config…
          </div>
        );
      }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-inter select-none overflow-hidden selection:bg-blue-500/30">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="h-[60px] flex justify-between items-center px-6 border-b border-white/5 shrink-0 bg-slate-900/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-5">
          <h1 className="text-2xl font-black tracking-tighter">
            SVOS <span className="text-blue-500">TACTICAL</span>
          </h1>
          <div className="flex items-center gap-2.5 bg-black/50 px-3 py-1 rounded-lg border border-white/5">
            <div className={`w-2 h-2 rounded-full ${status === "Live" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              {status === "Live" ? "Synchronized" : "Offline"}
            </span>
          </div>
          {user && (
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/30"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Clearance: Level 3</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* DEMO MODE LAUNCHER */}
          <button
            onClick={() => setDemoStep(demoStep >= 0 ? -1 : 0)}
            aria-label={demoStep >= 0 ? "Demo is active" : "Start stadium simulation demo"}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest
              transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-emerald-500/50 outline-none ${
              demoStep >= 0
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${demoStep >= 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} aria-hidden="true" />
            {demoStep >= 0 ? "Demo Active" : "Start Demo"}
          </button>
          
          <button
            onClick={() => setHeatmapActive(!heatmapActive)}
            aria-pressed={heatmapActive}
            aria-label="Toggle crowd density heatmap"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest
              transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-orange-500/50 outline-none ${
              heatmapActive
                ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            }`}
          >
            Heatmap
          </button>
 
          {/* SECURITY CLEARANCE TOGGLE */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-500/20 active:scale-95"
          >
            Terminal Exit
          </button>
           
          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest hidden md:block">
            Neural Graph v4 · Real-Time
          </span>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex min-h-0">

        {/* LEFT — MAP */}
        <div className="flex-1 flex flex-col p-4 min-w-0">

          {/* MAP CANVAS */}
          <div className="flex-1 relative bg-slate-900 rounded-2xl border border-white/10 overflow-hidden group min-h-[400px]">
            <VenueFlow 
              config={config} 
              zones={zones} 
              route={route} 
              naivePath={routeData.naivePath}
              avoidedZone={avoidedZone} 
              heatmapActive={heatmapActive}
            />

            {/* TACTICAL CORNERS */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 rounded-tl-xl z-20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500/40 rounded-tr-xl z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500/40 rounded-bl-xl z-20 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 rounded-br-xl z-20 pointer-events-none" />

            {/* MAP HUD PANEL (Top Left) */}
            <div className="absolute top-6 left-6 z-40 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-lg p-3 flex flex-col gap-1.5 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">System Integrity: 100%</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="text-[9px] font-medium text-blue-400 uppercase tracking-tighter leading-none">Active Nodes: {Object.keys(zones).length}</div>
              <div className="text-[9px] font-medium text-blue-400 uppercase tracking-tighter leading-none">Graph Density: 0.12ms/op</div>
            </div>

            {/* AI THINKING OVERLAY */}
            <AnimatePresence>
              {(pathFading || demoPhase === DEMO_PHASES.THINKING) && (
                <motion.div
                  key="thinking-overlay"
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
                    bg-slate-950/90 border border-blue-500/30 px-5 py-3 rounded-2xl
                    shadow-[0_0_40px_rgba(59,130,246,0.2)] backdrop-blur-xl pointer-events-none"
                >
                  {/* Spinner */}
                  <div className="relative w-4 h-4 shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-blue-400/70 uppercase tracking-[0.3em] leading-none mb-0.5">
                      Neural Engine
                    </div>
                    <div className="text-[13px] font-black text-white uppercase tracking-tight leading-none">
                      Analyzing congestion…
                    </div>
                  </div>
                  {/* Pulsing dot trail */}
                  <div className="flex gap-1 ml-1">
                    {[0, 0.2, 0.4].map((d) => (
                      <motion.div
                        key={d}
                        className="w-1 h-1 rounded-full bg-blue-400"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: d }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* INSIGHT BAR */}
          <motion.div
            animate={{
              backgroundColor: avoidedZone ? "rgba(220,38,38,0.13)" : "rgba(15,23,42,0.75)",
              borderColor:     avoidedZone ? "rgba(220,38,38,0.4)"  : "rgba(255,255,255,0.06)",
            }}
            className="mt-3 p-5 rounded-2xl border flex items-center gap-5 shrink-0 backdrop-blur-md relative overflow-hidden"
          >
            <div className={`absolute left-0 top-0 w-1.5 h-full rounded-r-full ${avoidedZone ? "bg-red-500" : "bg-blue-500"}`} />
            <div className={`p-2.5 rounded-xl border ${avoidedZone ? "bg-red-500/20 border-red-500/30" : "bg-blue-500/15 border-blue-500/30"}`}>
              {avoidedZone ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-[9px] font-black uppercase tracking-[0.25em] block mb-0.5 ${avoidedZone ? "text-red-400" : "text-blue-400/80"}`}>
                {avoidedZone ? "⚠ NEURAL ALERT — VULNERABILITY DETECTED" : "ENGINE DIRECTIVE"}
              </span>
              <p className="text-[1.1rem] font-black text-white uppercase tracking-tight truncate leading-tight">
                {routeData.reason || "Calibrating arena trajectories…"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-0.5">Confidence</span>
              <span className={`text-xl font-black ${avoidedZone ? "text-rose-400 animate-pulse drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]" : "text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]"}`}>
                {routeData.confidence}
              </span>
            </div>
            {/* fade‑out overlay during reroute */}
            <AnimatePresence>
              {pathFading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center"
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400 animate-pulse">
                    Rerouting…
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* RIGHT — TELEMETRY PANEL */}
        <aside 
          aria-label="Real-time venue telemetry"
          className="w-[260px] p-4 flex flex-col gap-4 border-l border-white/5 bg-slate-900/40 backdrop-blur-3xl shrink-0 shadow-[-20px_0_60px_rgba(0,0,0,0.4)] z-50">

          {/* LIVE TRAJECTORY */}
          <section className="flex-1 flex flex-col min-h-0 bg-black/20 rounded-2xl p-5 border border-white/5">
            <h2 className={`text-[9px] font-black uppercase tracking-[0.35em] mb-5 flex items-center gap-2 ${avoidedZone || routeData.quality === 'DANGEROUS' ? 'text-rose-500' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-3 rounded-full ${avoidedZone || routeData.quality === 'DANGEROUS' ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'}`} />
              {avoidedZone || routeData.quality === 'DANGEROUS' ? "Evacuation Path" : "Live Trajectory"}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              <AnimatePresence>
                {route.map((z, idx) => (
                  <motion.div
                    key={z + idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.07 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                  >
                    <span className="text-[9px] font-black text-blue-500/50 w-4 shrink-0">{idx + 1}</span>
                    <span className="text-[12px] font-black text-slate-100 uppercase tracking-wide truncate">{zoneMap[z] || z}</span>
                    {idx === route.length - 1 && (
                      <span className="ml-auto text-[8px] font-black text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">DEST</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {route.length === 0 && (
                <div className="text-center py-12 opacity-20 uppercase tracking-[0.3em] font-black text-[9px]">Idle</div>
              )}
            </div>

            {/* DEMO TOOLKIT — Formal state control */}
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setDemoPhase(demoPhase === DEMO_PHASES.PAUSED ? DEMO_PHASES.RUNNING : DEMO_PHASES.PAUSED)}
                  aria-label={demoPhase === DEMO_PHASES.PAUSED ? "Resume simulation" : "Pause simulation"}
                  className={`flex-1 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-500/40 outline-none ${
                    demoPhase === DEMO_PHASES.PAUSED 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 shadow-lg"
                  }`}
                >
                  {demoPhase === DEMO_PHASES.PAUSED ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg> Resume</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause</>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setDemoPhase(DEMO_PHASES.RUNNING);
                    setSpiking(false);
                  }}
                  aria-label="Reset simulation to default state"
                  className="px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 active:scale-95 focus:ring-2 focus:ring-blue-500/40 outline-none"
                  title="Reset Demo"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
              

            </div>
          </section>

          {/* AMENITY LOADS - COMPACTED */}
          <section className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col min-h-0 overflow-hidden">
            <h2 className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 mb-4 px-1">Amenity Load</h2>
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {Object.keys(queues).map((k) => {
                const currentWait = queues[k].wait;
                const prevWait = prevQueues[k]?.wait || currentWait;
                const trend = currentWait > prevWait ? "↑" : currentWait < prevWait ? "↓" : "";
                
                return (
                <div key={k} className="px-1">
                  <div className="flex justify-between text-[9px] font-black mb-1.5 uppercase tracking-widest text-slate-400">
                    <span>{k.replace(/([A-Z])/g, " $1").trim()}</span>
                    <div className="flex items-center gap-1">
                      <span className={trend === "↑" ? "text-rose-500" : trend === "↓" ? "text-emerald-500" : "text-slate-500"}>{trend}</span>
                      <span className={currentWait > 10 ? "text-red-400" : "text-emerald-400"}>{currentWait}m</span>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${currentWait > 10 ? "bg-red-500" : "bg-emerald-500"}`}
                      animate={{ width: `${Math.min(100, (currentWait / 20) * 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              )})}
            </div>
          </section>

          {/* STATUS TILES */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-slate-900/70 p-4 rounded-2xl border border-white/5 text-center group cursor-help transition-all hover:bg-slate-900">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1 group-hover:text-blue-400 transition-colors">Signal</span>
              <span className={`text-base font-black transition-colors ${routeData.quality === 'OPTIMAL' ? 'text-sky-400' : 'text-slate-400'}`}>
                {routeData.quality || "—"}
              </span>
            </div>
            <div className="bg-slate-900/70 p-4 rounded-2xl border border-white/5 text-center group cursor-help transition-all hover:bg-slate-900">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1 group-hover:text-emerald-400 transition-colors">Logic</span>
              <span className="text-base font-black text-emerald-400 shadow-emerald-500">PEAK</span>
            </div>
          </div>
        </aside>
      </main>

      {/* FIX 3 — CRITICAL SPIKE ALERT OVERLAY */}
      <AnimatePresence>
        {spikeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            aria-live="assertive"
            aria-atomic="true"
            className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4
              bg-red-950/95 border-2 border-red-500 rounded-2xl px-6 py-4 shadow-[0_0_60px_rgba(239,68,68,0.4)]
              backdrop-blur-xl pointer-events-none"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_20px_#ef4444]"
            />
            <div>
              <div className="text-[9px] font-black text-red-400 uppercase tracking-[0.3em] mb-0.5">⚠ CRITICAL SURGE DETECTED</div>
              <div className="text-lg font-black text-white uppercase tracking-tight">
                {zoneMap[spikeAlert.zone]} — {spikeAlert.pct}% Capacity (Surge)
              </div>
            </div>
            <div className="ml-4 text-[11px] font-black text-red-300 uppercase tracking-widest animate-pulse">
              REROUTING
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEMO MODE CONTROLLER — fixed bottom-right narrative panel */}
      <AnimatePresence>
        {demoStep >= 0 && demoStep < DEMO_STEPS.length && (() => {
          const step = DEMO_STEPS[demoStep];
          const isLast = demoStep === DEMO_STEPS.length - 1;
          const colorMap = {
            emerald: { border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-500", btn: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" },
            red:     { border: "border-rose-500/40",     text: "text-rose-400",     dot: "bg-rose-500 animate-ping",     btn: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]" },
            blue:    { border: "border-sky-500/40",    text: "text-sky-400",    dot: "bg-sky-500 animate-pulse",   btn: "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]" },
          };
          const c = colorMap[step.color] || colorMap.blue;
          return (
            <motion.div
              key={`demo-step-${demoStep}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className={`fixed bottom-12 right-12 z-[200] w-[320px] bg-slate-950/98 border ${c.border}
                rounded-2xl p-7 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-3xl`}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${c.text}`}>{step.label}</span>
                <div className="ml-auto flex gap-1">
                  {DEMO_STEPS.map((s) => (
                    <div
                      key={s.id}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        s.id === demoStep ? c.dot.replace(" animate-ping", "").replace(" animate-pulse", "") : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {/* Content */}
              <div className="mb-4">
                <div className="text-[15px] font-black text-white uppercase tracking-tight mb-1">{step.title}</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</div>
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                {!isLast ? (
                  <button
                    onClick={advanceDemo}
                    disabled={step.action === "spike" && spiking}
                    className={`flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest
                      transition-all active:scale-95 ${c.btn}`}
                  >
                    {step.id === 1 && spiking ? "Simulating…" : "Next Step →"}
                  </button>
                ) : (
                  <button
                    onClick={() => setDemoStep(-1)}
                    className="flex-1 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest
                      text-slate-400 hover:bg-white/5 transition-all active:scale-95"
                  >
                    Exit Demo
                  </button>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
