import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Handle,
  Position,
  getStraightPath
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';

// ─── CUSTOM NODE ─────────────────────────────────────────────────────────────
const VenueNode = ({ data }) => {
  const { id, pct = 0, zoneName, isInRoute, isBeingAvoided, isCritical } = data;
  
  const getColorBase = (p) => {
    if (p > 90) return "bg-rose-600/90 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]";
    if (p > 70) return "bg-amber-600/80 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
    if (p > 50) return "bg-sky-600/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]";
    return "bg-slate-800/80 border-slate-600 shadow-[0_0_15px_rgba(255,255,255,0.05)]";
  };

  return (
    <div 
      className="relative group"
      role="region"
      aria-label={`Zone ${zoneName}, ${pct.toFixed(0)}% occupancy`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" aria-hidden="true" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" aria-hidden="true" />
      <Handle type="target" position={Position.Left} className="opacity-0" aria-hidden="true" />
      <Handle type="source" position={Position.Right} className="opacity-0" aria-hidden="true" />
 
      <motion.div
        animate={{
          scale: isInRoute ? 1.08 : isBeingAvoided ? [1, 1.1, 1] : isCritical ? [1, 1.05, 1] : 1,
        }}
        transition={
          isBeingAvoided ? { repeat: Infinity, duration: 1.2 } :
          isCritical ? { repeat: Infinity, duration: 1.8 } : { duration: 0.3 }
        }
        className={`w-[148px] h-[88px] flex flex-col items-center justify-center
          rounded-2xl border backdrop-blur-xl transition-colors duration-500
          ${getColorBase(pct)}
          ${isInRoute ? "ring-2 ring-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.5)] border-sky-400" : ""}
          ${isBeingAvoided ? "ring-2 ring-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.6)] border-rose-500" : ""}
        `}
      >
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1" aria-hidden="true">{id}</span>
        <h3 className="text-[12px] font-black text-white text-center px-1 uppercase leading-tight truncate w-full tracking-wide">
          {zoneName}
        </h3>
        <div 
          className="text-[24px] font-black mt-0.5 text-white leading-none tabular-nums drop-shadow-lg"
          aria-label={`${pct.toFixed(0)} percent`}
        >
          {pct.toFixed(0)}<span className="text-xs opacity-50 ml-0.5" aria-hidden="true">%</span>
        </div>
      </motion.div>
    </div>
  );
};

// ─── HEATMAP NODE ────────────────────────────────────────────────────────────
const HeatmapNode = ({ data }) => {
  const { pressure } = data;
  const glowColor = pressure > 80 ? "rgba(244,63,94,0.4)" : 
                    pressure > 60 ? "rgba(245,158,11,0.25)" : 
                    "rgba(56,189,248,0.15)";
  const randomDuration = useMemo(() => 3 + Math.random() * 2, []);

  return (
    <div className="flex items-center justify-center pointer-events-none" style={{ transform: "translate(-50%, -50%)" }}>
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.3, 1] }}
        transition={{ repeat: Infinity, duration: randomDuration }}
        style={{
          width: 320,
          height: 240,
          borderRadius: '50%',
          filter: 'blur(60px)',
          backgroundColor: glowColor
        }}
      />
    </div>
  );
};

// ─── CUSTOM EDGE ─────────────────────────────────────────────────────────────
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, data }) => {
  const { isInRoute, isHazard, targetDensity = 0, isNaive = false } = data;
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  const strokeColor = isInRoute 
    ? (targetDensity > 70 ? "#f59e0b" : "#10b981") 
    : isNaive ? "#f43f5e" : (isHazard ? "#ef4444" : "rgba(255,255,255,0.2)");

  return (
    <>
      {isNaive && !isInRoute && (
        <path
          d={edgePath}
          fill="none"
          stroke="#f43f5e"
          strokeWidth={2}
          strokeOpacity={0.4}
          strokeDasharray="4 4"
          className="animate-[pulse_2s_infinite]"
        />
      )}
      {isInRoute && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor} 
          strokeWidth={8}
          strokeOpacity={0.2}
          className="blur-md"
        />
      )}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isInRoute ? 4 : 2}
        strokeOpacity={isInRoute ? 1 : isNaive ? 0.3 : isHazard ? 0.8 : 0.4}
        strokeDasharray={isInRoute ? "0" : isNaive ? "4 4" : "8 6"}
        className="transition-all duration-700"
      />
      {isInRoute && (
        <motion.circle r="4" fill={targetDensity > 70 ? "#f59e0b" : "#10b981"}>
          <animateMotion path={edgePath} dur="2.5s" repeatCount="indefinite" />
        </motion.circle>
      )}
    </>
  );
};

// ─── TRACKER NODE ────────────────────────────────────────────────────────────
const TrackerNode = () => (
  <div style={{ transform: "translate(-50%, -50%)" }} className="flex items-center justify-center pointer-events-none">
    <motion.div
      animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      className="absolute w-8 h-8 rounded-full border-2 border-blue-500/60"
    />
    <div className="w-5 h-5 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_20px_#3b82f6] relative z-10" />
    <motion.div 
      animate={{ y: [0, -5, 0] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="absolute -top-[70px] px-3 py-1.5 bg-blue-600 rounded-full text-[11px] font-black text-white whitespace-nowrap shadow-[0_0_20px_rgba(59,130,246,0.5)] border-2 border-white/40 z-20"
    >
      YOU
    </motion.div>
  </div>
);

// ─── DESTINATION NODE ────────────────────────────────────────────────────────
const DestNode = ({ data }) => {
  const { eta } = data;
  return (
    <div style={{ transform: "translate(-50%, -50%)" }} className="flex flex-col items-center pointer-events-none">
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-emerald-400 text-4xl font-black leading-none mb-24 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]"
      >
        ↓
      </motion.div>
      <div className="absolute top-16 flex flex-col items-center gap-1">
        <span className="text-[10px] font-black text-emerald-400 bg-slate-900/95 px-3 py-1.5 rounded-full border-2 border-emerald-500/40 uppercase tracking-[0.2em] shadow-2xl">
          DESTINATION
        </span>
        {eta && <span className="text-[10px] font-black text-white bg-emerald-600/80 px-2 py-0.5 rounded-md shadow-lg">{eta} MIN</span>}
      </div>
    </div>
  );
};

const nodeTypes = { venueNode: VenueNode, heatmap: HeatmapNode, tracker: TrackerNode, dest: DestNode };
const edgeTypes = { customEdge: CustomEdge };

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function VenueFlow({ config, zones, route, avoidedZone, naivePath = [], heatmapActive = false }) {
  const SCALE_X = 1200 / 100;
  const SCALE_Y = 800 / 100;

  const nodes = useMemo(() => {
    if (!config) return [];
    const base = [];
    
    // 1. Add Heatmap Glow Nodes if active
    if (heatmapActive) {
      Object.entries(config.zones).forEach(([id, z]) => {
        const zoneData = zones[id];
        if (!zoneData) return;
        const pressure = ((zoneData.density + (zoneData.inflow - zoneData.outflow) * 2) / zoneData.capacity) * 100;
        
        base.push({
          id: `heatmap-${id}`,
          type: 'heatmap',
          position: { x: parseFloat(z.pos.x) * SCALE_X + 74, y: parseFloat(z.pos.y) * SCALE_Y + 44 }, // Centered on node
          data: { pressure },
          draggable: false,
          zIndex: -1, // Behind everything
        });
      });
    }

    // 2. Add Venue Nodes
    Object.entries(config.zones).forEach(([id, z]) => {
      let pct = 0;
      if (zones[id] && zones[id].capacity > 0) {
        pct = (zones[id].density / zones[id].capacity) * 100;
      }
      if (isNaN(pct)) pct = 0;
      base.push({
        id,
        type: 'venueNode',
        position: { x: parseFloat(z.pos.x) * SCALE_X, y: parseFloat(z.pos.y) * SCALE_Y },
        data: { id, zoneName: z.name, pct, isCritical: pct > 90, isInRoute: route.includes(id), isBeingAvoided: avoidedZone === id },
        draggable: true,
      });
    });

    // 3. Add Overlays
    const startId = route[0];
    const destId = route[route.length - 1];

    if (startId && route.length > 0) {
      base.push({ id: 'tracker-node', type: 'tracker', parentNode: startId, position: { x: 74, y: 44 }, extent: 'parent', draggable: false, zIndex: 1000 });
    }
    if (destId && route.length > 1) {
      base.push({ id: 'dest-node', type: 'dest', parentNode: destId, position: { x: 74, y: 44 }, extent: 'parent', draggable: false, data: { eta: (route.length - 1) * 2 }, zIndex: 1001 });
    }
    return base;
  }, [config, zones, route, avoidedZone, heatmapActive, SCALE_X, SCALE_Y]);

  const edges = useMemo(() => {
    if (!config) return [];
    return (config.edges || []).map(([a, b]) => {
      const isInRoute = route.some((z, i) => (route[i] === a && route[i+1] === b) || (route[i] === b && route[i+1] === a));
      const isNaive = naivePath.some((z, i) => (naivePath[i] === a && naivePath[i+1] === b) || (naivePath[i] === b && naivePath[i+1] === a));
      const targetDensity = zones[b] ? (zones[b].density / zones[b].capacity) * 100 : 0;
      const isHazard = (zones[a]?.density / zones[a]?.capacity >= 0.85) || (zones[b]?.density / zones[b]?.capacity >= 0.85);

      return { id: `e-${a}-${b}`, source: a, target: b, type: 'customEdge', data: { isInRoute, isHazard, targetDensity, isNaive } };
    });
  }, [config, route, naivePath, zones]);

  return (
    <div 
      className="w-full h-full relative"
      role="application"
      aria-label="Interactive arena map showing crowd density and navigation routes"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden="true">
         <span className="text-[140px] font-black text-white/[0.03] uppercase tracking-[0.25em] select-none">ARENA</span>
      </div>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView minZoom={0.2} maxZoom={2} style={{ background: 'transparent' }}>
        <Background variant="dots" gap={30} size={1} color="rgba(255, 255, 255, 0.05)" />
      </ReactFlow>
    </div>
  );
}
