'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRooms, getFloorPlan } from '../lib/building-rooms';
import Link from 'next/link';
import {
  AlertTriangle,
  Zap,
  Activity,
  Power,
  Cpu,
  Box,
  Factory,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Search,
  CircuitBoard,
  Gauge,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  Radio,
  Fuel,
  BatteryFull,
  LayoutPanelTop,
  Cog,
  Flame,
  Lightbulb,
  Square,
  Loader2,
  LogIn,
  LogOut,
  Database,
  RefreshCw,
  Plus,
  Minus,
  Maximize2,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { computeNetworkStatus, downstreamOf } from '@/lib/network-utils';
import { useNetworkTopology } from '@/hooks/useNetworkTopology';
import { createClient } from '@/lib/supabase/client';

// Icon registry: map icon name string -> lucide component
const ICONS = {
  Zap, CircuitBoard, Cpu, Box, Gauge, ShieldCheck, Fuel, BatteryFull,
  LayoutPanelTop, Cog, Flame, Lightbulb, Square, Activity, Power,
};
const iconFor = (name) => ICONS[name] || Box;


const TROUBLESHOOT_STEPS = {
  power_source: [
    'Verify primary and secondary voltage with a calibrated meter.',
    'Inspect cooling system (oil level / fans) and temperature sensors.',
    'Check Buchholz / sudden pressure relay status.',
    'Review insulation resistance (IR) and dissolved gas analysis (DGA) trend.',
    'Confirm protection relay trip history and reset breaker if safe.',
  ],
  switching: [
    'Confirm SCADA / HMI alarm log and breaker position.',
    'Verify trip unit / protection relay settings and target.',
    'Inspect bus voltage and current readings against nominal.',
    'Perform thermal scan on busbar connections and lugs.',
    'Coordinate lock-out / tag-out before manual reset.',
  ],
  distribution: [
    'Identify which feeder breaker tripped or shows alarm.',
    'Measure incoming and outgoing voltage at the busbar.',
    'Inspect MCBs / MCCBs for visible signs of overload or arc.',
    'Verify neutral and earth bonding integrity.',
    'Reset breakers sequentially while monitoring load currents.',
  ],
  control: [
    'Read PLC / drive diagnostic codes from HMI.',
    'Verify 24 V control voltage and digital input states.',
    'Inspect interlock chain and emergency stop loop.',
    'Confirm communication network status (PROFINET / Modbus).',
    'Replace failed module after isolating and verifying spare.',
  ],
  consumer: [
    'Check local indicator lights and emergency stop status.',
    'Inspect MCB / contactor status inside the cabinet.',
    'Measure motor / heater terminal voltage and current draw.',
    'Verify thermal protection and overload relay state.',
    'Test interlocks with upstream feeder before energising.',
  ],
  protection: [
    'Check battery state of charge and inverter status LEDs.',
    'Run UPS / protection self-test from the front panel.',
    'Verify bypass switch position and source availability.',
    'Review event log for recent transfers or alarms.',
    'Confirm grounding and shielding of protected loads.',
  ],
  monitoring: [
    'Verify meter / sensor communication (Modbus / 4-20 mA).',
    'Cross-check measured values against a portable reference.',
    'Inspect CT / VT connections and burden.',
    'Review historian trend for anomalies.',
    'Recalibrate or replace the device if drift exceeds tolerance.',
  ],
  passive: [
    'Open the junction box and verify torque on all terminals.',
    'Inspect insulation for thermal damage or moisture ingress.',
    'Check earth continuity and shield bonding.',
    'Confirm cable IDs match drawings.',
    'Reseal and label after work.',
  ],
};

// =====================================================================
// Node marker — compact rectangle, counter-scaled, LOD labels
// =====================================================================
// W × H is constant on screen regardless of zoom level.
// Only faulted nodes get animated spans (few → cheap).
// Plain <button> instead of motion.button for 300+ node performance.
const NODE_W = 12; // px constant screen width
const NODE_H = 8;  // px constant screen height

function NodeMarker({ node, onSelect, isSelected, zoom }) {
  const isFault = node.status === 'fault';
  const isAffected = node.status === 'affected';
  const safeZoom = zoom || 1;

  // Border and fill colours by status
  const borderColor = isFault ? '#ef4444' : isAffected ? '#f59e0b' : '#22c55e';
  const fillColor   = isFault ? 'rgba(127,29,29,0.92)'
                    : isAffected ? 'rgba(120,53,15,0.88)'
                    : 'rgba(15,23,32,0.82)';

  // Level-of-detail text below the rect
  const showCode = safeZoom > 3;
  const showName = safeZoom > 7;

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className="group absolute"
      style={{
        left: node.coordinates.x,
        top: node.coordinates.y,
        width: NODE_W,
        height: NODE_H,
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        // Counter-scale: pin stays constant screen size at every zoom level
        transform: `translate(-50%, -50%) scale(${1 / safeZoom})`,
      }}
    >
      {/* ── Main rectangle ── */}
      <div
        style={{
          width: NODE_W,
          height: NODE_H,
          backgroundColor: fillColor,
          border: `1.5px solid ${borderColor}`,
          borderRadius: '2px',
          position: 'relative',
          boxShadow: isFault ? `0 0 8px 1px ${borderColor}80` : 'none',
        }}
      >
        {/* Fault pulse — only rendered when faulted */}
        {isFault && (
          <>
            <motion.span
              className="absolute inset-0"
              style={{ borderRadius: '2px', background: 'rgba(239,68,68,0.3)' }}
              animate={{ opacity: [0.2, 0.85, 0.2] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="absolute"
              style={{ inset: '-5px', borderRadius: '4px', border: '1.5px solid rgba(239,68,68,0.5)' }}
              animate={{ scale: [1, 1.5, 2], opacity: [0.7, 0.3, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          </>
        )}
        {/* Affected dim pulse */}
        {isAffected && (
          <motion.span
            className="absolute inset-0"
            style={{ borderRadius: '2px', background: 'rgba(245,158,11,0.2)' }}
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {/* Selection ring */}
        {isSelected && (
          <span
            className="absolute pointer-events-none"
            style={{ inset: '-4px', border: '2px solid #f97316', borderRadius: '4px' }}
          />
        )}
      </div>

      {/* ── Hover tooltip (always) ── */}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-zinc-200 bg-zinc-950/95 border border-white/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg"
        style={{ top: '100%', marginTop: '4px' }}
      >
        <span className="font-mono text-[9px] text-zinc-500 mr-1.5">{node.id}</span>
        {node.name}
      </span>

      {/* ── LOD: code label at zoom > 3 ── */}
      {showCode && !showName && (
        <span
          className="pointer-events-none absolute left-1/2 whitespace-nowrap font-mono text-zinc-400 z-10 leading-none"
          style={{ fontSize: '8px', top: '100%', transform: 'translateX(-50%)', marginTop: '2px' }}
        >
          {node.id}
        </span>
      )}

      {/* ── LOD: full name at zoom > 7 ── */}
      {showName && (
        <span
          className="pointer-events-none absolute left-1/2 whitespace-nowrap text-[9px] font-medium text-zinc-200 bg-zinc-900/85 border border-white/10 px-1.5 py-0.5 rounded z-10"
          style={{ top: '100%', transform: 'translateX(-50%)', marginTop: '2px' }}
        >
          {node.name}
        </span>
      )}
    </button>
  );
}

// =====================================================================
// Building zone
// =====================================================================
// LOD thresholds (pixels on screen = bounds_px * zoom)
const LOD_FULL   = 80;  // rooms + labels visible
const LOD_SIMPLE = 36;  // outline + name only
const LOD_MINI   = 16;  // tiny dot marker
// Below LOD_MINI → building is completely hidden

function BuildingZone({ building, hasFault, hasAffected, nodeCount, zoom, selectedFloor, showFloorPlan }) {
  const { bounds } = building;
  const safeZoom = zoom || 1;

  // ── Level-of-detail based on the SMALLER rendered dimension ──────────────
  const minPx = Math.min(bounds.w, bounds.h) * safeZoom;
  if (minPx < LOD_MINI) return null;  // too small to show at all

  const lod = minPx >= LOD_FULL ? 'full' : minPx >= LOD_SIMPLE ? 'simple' : 'mini';

  const borderColor = hasFault
    ? 'border-red-500/50'
    : hasAffected
    ? 'border-amber-500/40'
    : 'border-zinc-700/60';

  const cornerColor = hasFault
    ? 'border-red-400/70'
    : hasAffected
    ? 'border-amber-400/70'
    : 'border-zinc-500/70';

  // ── MINI: just a small coloured rectangle ────────────────────────────────
  if (lod === 'mini') {
    return (
      <div
        className={`absolute rounded pointer-events-none border ${borderColor} bg-zinc-900/40`}
        style={{ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }}
      />
    );
  }

  // ── SIMPLE / FULL ────────────────────────────────────────────────────────
  const rooms = lod === 'full' ? getRooms(building.code, selectedFloor) : [];
  const floorPlanSrc = showFloorPlan ? getFloorPlan(building.code, selectedFloor) : null;

  return (
    // Outer wrapper: no overflow-hidden so the label can float above the border
    <div
      className="absolute pointer-events-none"
      style={{ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }}
    >
      {/* ── Building label — floated ABOVE the building, counter-scaled ── */}
      <div
        className="absolute flex items-center gap-2 origin-bottom-left whitespace-nowrap"
        style={{
          bottom: '100%',
          left: 0,
          marginBottom: 6,
          transform: `scale(${1 / safeZoom})`,
        }}
      >
        <div
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ background: building.accent, boxShadow: `0 0 8px ${building.accent}` }}
        />
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-300 drop-shadow-sm">
          {building.name}
        </span>
        {lod === 'full' && (
          <span className="text-[10px] font-mono text-zinc-500">{building.code}</span>
        )}
        {nodeCount > 0 && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border"
            style={{ color: building.accent, borderColor: `${building.accent}55`, background: `${building.accent}15` }}
          >
            {nodeCount}
          </span>
        )}
      </div>

      {/* ── Inner container — overflow-hidden keeps rooms clipped ── */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        {/* Background fill + border */}
        <div className={`absolute inset-0 rounded-2xl border-2 ${borderColor} bg-zinc-900/30 backdrop-blur-[2px]`} />

        {/* Fault overlay */}
        <AnimatePresence>
          {(hasFault || hasAffected) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 rounded-2xl ${hasFault ? 'bg-red-500/[0.06]' : 'bg-amber-500/[0.06]'}`}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-30"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, ${
                    hasFault ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.14)'
                  } 0 8px, transparent 8px 22px)`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floor plan reference overlay ── */}
        {floorPlanSrc && (
          <img
            src={floorPlanSrc}
            alt="floor plan"
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            style={{ objectFit: 'fill', opacity: 0.45, mixBlendMode: 'screen' }}
            draggable={false}
          />
        )}

        {/* Room walls (full LOD only) */}
        {rooms.map((room) => (
          <div
            key={room.code}
            className="absolute border border-zinc-600/25"
            style={{
              left:   `${room.x1 * 100}%`,
              top:    `${room.y1 * 100}%`,
              width:  `${(room.x2 - room.x1) * 100}%`,
              height: `${(room.y2 - room.y1) * 100}%`,
              background: room.fill || 'transparent',
            }}
          >
            <span
              className="absolute top-0.5 left-1 font-mono text-zinc-500/55 leading-none whitespace-nowrap pointer-events-none select-none"
              style={{ fontSize: 8, transform: `scale(${1 / safeZoom})`, transformOrigin: 'top left' }}
            >
              {room.code}
            </span>
          </div>
        ))}

        {/* Corner brackets (full LOD only) */}
        {lod === 'full' && ['top-2 left-2', 'top-2 right-2 rotate-90', 'bottom-2 left-2 -rotate-90', 'bottom-2 right-2 rotate-180'].map((pos) => (
          <div
            key={pos}
            className={`absolute ${pos} h-4 w-4 border-t-2 border-l-2 ${cornerColor}`}
          />
        ))}
      </div>
    </div>
  );
}

// Short labels for category filter pills
const CAT_SHORT = {
  power_source: 'POWER',
  switching: 'SWITCH',
  distribution: 'DIST',
  control: 'CTRL',
  consumer: 'CONS',
  protection: 'UPS',
  monitoring: 'MON',
  passive: 'JB',
};

// =====================================================================
// Fault simulator panel
// =====================================================================
function FaultPanel({ buildings, nodes, faultedIds, onInject, onClear, onSelect, selectedId, collapsed, onToggle }) {
  const [query, setQuery] = useState('');
  const [activeBldg, setActiveBldg] = useState(null);   // building code filter
  const [activeCat, setActiveCat] = useState(null);     // category filter
  // Auto-collapse large sections on first render; user can expand manually
  const [collapsedBldgs, setCollapsedBldgs] = useState(() => new Set());

  // Buildings that actually have nodes on the current floor
  const presentBuildings = useMemo(() => {
    const codes = new Set(nodes.map((n) => n.building).filter(Boolean));
    return buildings.filter((b) => codes.has(b.code));
  }, [nodes, buildings]);

  // Categories present in current node set
  const presentCats = useMemo(() => {
    const m = new Map();
    for (const n of nodes) {
      m.set(n.type_category, (m.get(n.type_category) || 0) + 1);
    }
    return m;
  }, [nodes]);

  // Apply all filters
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes.filter((n) => {
      if (activeBldg && n.building !== activeBldg) return false;
      if (activeCat && n.type_category !== activeCat) return false;
      if (!q) return true;
      return (
        n.name.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        n.type.includes(q) ||
        (n.type_label || '').toLowerCase().includes(q)
      );
    });
  }, [nodes, query, activeBldg, activeCat]);

  // Group filtered nodes by building
  const grouped = useMemo(() => {
    const map = new Map();
    for (const b of presentBuildings) map.set(b.code, []);
    for (const n of filtered) {
      if (map.has(n.building)) map.get(n.building).push(n);
    }
    return map;
  }, [filtered, presentBuildings]);

  const toggleBldg = (code) =>
    setCollapsedBldgs((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const activeFilterCount = (activeBldg ? 1 : 0) + (activeCat ? 1 : 0) + (query ? 1 : 0);

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 420 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="relative shrink-0 h-full bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col"
    >
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center gap-4 pt-6">
          <ShieldAlert className="text-orange-400" size={20} />
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 [writing-mode:vertical-rl] rotate-180">
            FAULT SIMULATOR
          </span>
          {faultedIds.size > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
        </div>
      ) : (
        <>
          {/* ── Header ── */}
          <div className="px-4 pt-5 pb-3 border-b border-white/5 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-orange-400" size={15} />
              <h2 className="text-[13px] font-bold tracking-[0.18em] uppercase text-zinc-100 flex-1">
                Fault Simulator
              </h2>
              {faultedIds.size > 0 && (
                <span className="text-[10px] font-bold text-red-400 font-mono">
                  {faultedIds.size}✕
                </span>
              )}
            </div>

            <Button
              variant="destructive"
              size="sm"
              disabled={faultedIds.size === 0}
              onClick={onClear}
              className="w-full h-7 text-xs"
            >
              <RotateCcw size={12} className="mr-1.5" /> Clear All Faults
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search id, name, type…"
                className="pl-8 pr-7 h-7 text-xs bg-zinc-900/70 border-white/10"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Building filter pills — wrap on multiple rows */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveBldg(null)}
                className={`h-6 px-2 rounded text-[10px] font-semibold transition-colors whitespace-nowrap ${
                  !activeBldg
                    ? 'bg-white/15 text-zinc-100'
                    : 'bg-white/[0.04] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.07]'
                }`}
              >
                All <span className="font-mono opacity-60">({nodes.length})</span>
              </button>
              {presentBuildings.map((b) => {
                const cnt = nodes.filter((n) => n.building === b.code).length;
                const isActive = activeBldg === b.code;
                return (
                  <button
                    key={b.code}
                    onClick={() => setActiveBldg((prev) => (prev === b.code ? null : b.code))}
                    className="h-6 px-2 rounded text-[10px] font-semibold transition-all whitespace-nowrap"
                    style={
                      isActive
                        ? { background: `${b.accent}25`, color: b.accent, border: `1px solid ${b.accent}50` }
                        : { background: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid transparent' }
                    }
                  >
                    {b.code} <span className="font-mono opacity-60">({cnt})</span>
                  </button>
                );
              })}
            </div>

            {/* Category filter chips — wrap */}
            {presentCats.size > 1 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveCat(null)}
                  className={`h-5 px-2 rounded text-[9px] font-mono transition-colors ${
                    !activeCat ? 'bg-white/10 text-zinc-300' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  all
                </button>
                {[...presentCats.entries()].sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCat((prev) => (prev === cat ? null : cat))}
                    className={`h-5 px-2 rounded text-[9px] font-mono transition-colors whitespace-nowrap ${
                      activeCat === cat
                        ? 'bg-white/10 text-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {CAT_SHORT[cat] || cat} <span className="opacity-50">({cnt})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results summary strip */}
          <div className="px-4 py-1 flex items-center gap-1.5 border-b border-white/5 text-[10px] text-zinc-500 bg-zinc-950/40">
            <span className="font-mono text-zinc-300">{filtered.length}</span>
            <span>of</span>
            <span className="font-mono">{nodes.length}</span>
            <span>objects</span>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setActiveBldg(null); setActiveCat(null); setQuery(''); }}
                className="ml-auto text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5"
              >
                <X size={10} /> clear filters
              </button>
            )}
          </div>

          {/* ── Node list ── */}
          <ScrollArea className="flex-1 scrollbar-thin">
            <div className="px-3 py-2 space-y-1">
              {presentBuildings.map((b) => {
                const items = grouped.get(b.code) || [];
                if (!items.length) return null;
                const isColl = collapsedBldgs.has(b.code);
                return (
                  <div key={b.code}>
                    {/* Building header — click to collapse/expand */}
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors group/bldg"
                      onClick={() => toggleBldg(b.code)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: b.accent }} />
                      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-zinc-400 flex-1 text-left group-hover/bldg:text-zinc-300">
                        {b.name}
                      </span>
                      <span className="text-[9px] text-zinc-600 font-mono">{items.length}</span>
                      <ChevronRight
                        size={11}
                        className={`text-zinc-600 transition-transform ${isColl ? '' : 'rotate-90'}`}
                      />
                    </button>

                    {!isColl && (
                      <div className="space-y-0.5 mb-1">
                        {items.map((n) => {
                          const Icon = iconFor(n.type_icon);
                          const isFaulted = faultedIds.has(n.id);
                          const isAffected = n.status === 'affected';
                          return (
                            <div
                              key={n.id}
                              className={`group flex items-center gap-2 px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                                selectedId === n.id
                                  ? 'bg-orange-500/10 border-orange-500/40'
                                  : isFaulted
                                  ? 'bg-red-500/10 border-red-500/40'
                                  : isAffected
                                  ? 'bg-amber-500/[0.06] border-amber-500/25'
                                  : 'border-transparent hover:bg-white/[0.03] hover:border-white/5'
                              }`}
                              onClick={() => onSelect(n)}
                            >
                              <Icon
                                size={12}
                                className={`flex-shrink-0 ${isFaulted ? 'text-red-400' : isAffected ? 'text-amber-400' : 'text-zinc-500'}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-zinc-200 truncate leading-tight">
                                  {n.name}
                                </div>
                                <div className="text-[9px] text-zinc-600 font-mono">
                                  {n.id} · {n.type_label}
                                </div>
                              </div>
                              <button
                                title={isFaulted ? 'Clear fault' : 'Inject fault'}
                                className={`flex-shrink-0 h-6 w-6 rounded flex items-center justify-center border transition-colors ${
                                  isFaulted
                                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                                    : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInject(n.id);
                                }}
                              >
                                {isFaulted ? <X size={10} /> : <Zap size={10} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-8 text-center text-[11px] text-zinc-600">
                  No objects match the current filters.
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </motion.aside>
  );
}

// =====================================================================
// Node drawer
// =====================================================================
function NodeDrawer({ node, allNodes, faultedIds, onInject, onClear, onOpenChange }) {
  if (!node) return null;
  const current = allNodes.find((n) => n.id === node.id) || node;
  const Icon = iconFor(current.type_icon);
  const parents = (current.dependsOn || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const downstreamIds = downstreamOf(allNodes, current.id);
  const downstream = downstreamIds.map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const isFaulted = faultedIds.has(current.id);
  const controls = (current.controlsTargets || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const controlledBy = (current.controlledBy || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const backedUpBy = (current.backedUpBy || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const backupFor = (current.backupFor || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);

  const statusColor =
    current.status === 'fault' ? 'text-red-400' : current.status === 'affected' ? 'text-amber-400' : 'text-emerald-400';

  const steps = TROUBLESHOOT_STEPS[current.type_category] || TROUBLESHOOT_STEPS.control;

  return (
    <Sheet open={!!node} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[440px] sm:max-w-[480px] bg-zinc-950/95 border-l border-white/5 text-zinc-100 backdrop-blur-xl p-0"
      >
        <SheetHeader className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`h-11 w-11 rounded-lg flex items-center justify-center border ${
                current.status === 'fault'
                  ? 'bg-red-500/10 border-red-500/30'
                  : current.status === 'affected'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <Icon className={statusColor} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-zinc-100 text-base leading-tight">{current.name}</SheetTitle>
              <SheetDescription className="font-mono text-[11px] text-zinc-500">
                {current.id} · {current.type_label}
              </SheetDescription>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Badge
              className={`uppercase tracking-widest text-[10px] font-bold ${
                current.status === 'fault'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/20'
                  : current.status === 'affected'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {current.status === 'fault' && <Radio size={10} className="mr-1 animate-pulse" />}
              {current.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
              {current.building_name}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
              {current.floor}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-500">
              rot {current.rotation}°
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] scrollbar-thin">
          <div className="p-6 space-y-5">
            <div className="flex gap-2">
              {isFaulted ? (
                <Button onClick={() => onClear(current.id)} variant="outline" className="flex-1 border-white/10">
                  <CheckCircle2 size={14} className="mr-2" /> Clear Fault
                </Button>
              ) : (
                <Button onClick={() => onInject(current.id)} variant="destructive" className="flex-1">
                  <Zap size={14} className="mr-2" /> Inject Fault Here
                </Button>
              )}
            </div>

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Gauge size={11} /> Specifications
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <SpecBox label="Type" value={current.type_label} />
                <SpecBox label="Category" value={current.type_category} />
                <SpecBox label="Rating" value={current.rating || '—'} />
                <SpecBox label="Voltage" value={current.voltage || '—'} />
                <SpecBox label="Position" value={`${current.coord_cm.x}, ${current.coord_cm.y} cm`} />
                <SpecBox label="Installed" value={current.installed || '—'} />
              </div>
              {current.properties && Object.keys(current.properties).length > 0 && (
                <details className="mt-2 group">
                  <summary className="text-[10px] uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300">
                    All properties
                  </summary>
                  <pre className="mt-2 text-[10px] text-zinc-400 bg-black/40 border border-white/5 rounded p-2 overflow-auto">
                    {JSON.stringify(current.properties, null, 2)}
                  </pre>
                </details>
              )}
            </section>

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Power size={11} /> Upstream Power Source
              </h3>
              {parents.length === 0 ? (
                <div className="text-[11px] text-zinc-500 italic">Grid feed / root node</div>
              ) : (
                <div className="space-y-1.5">
                  {parents.map((p) => (<DependencyRow key={p.id} node={p} />))}
                </div>
              )}
            </section>

            {backedUpBy.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-400/80 mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={11} /> Backup Sources
                </h3>
                <div className="space-y-1.5">
                  {backedUpBy.map((p) => (<DependencyRow key={p.id} node={p} tone="blue" />))}
                </div>
              </section>
            )}

            {controlledBy.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-purple-400/80 mb-2 flex items-center gap-1.5">
                  <Cpu size={11} /> Controlled By
                </h3>
                <div className="space-y-1.5">
                  {controlledBy.map((p) => (<DependencyRow key={p.id} node={p} tone="purple" />))}
                </div>
              </section>
            )}

            {controls.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-purple-400/80 mb-2 flex items-center gap-1.5">
                  <Cpu size={11} /> Controls ({controls.length})
                </h3>
                <div className="space-y-1.5">
                  {controls.map((p) => (<DependencyRow key={p.id} node={p} tone="purple" />))}
                </div>
              </section>
            )}

            {backupFor.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-400/80 mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={11} /> Backup For
                </h3>
                <div className="space-y-1.5">
                  {backupFor.map((p) => (<DependencyRow key={p.id} node={p} tone="blue" />))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Activity size={11} /> Downstream Impact ({downstream.length})
              </h3>
              {downstream.length === 0 ? (
                <div className="text-[11px] text-zinc-500 italic">No dependent nodes — leaf component.</div>
              ) : (
                <div className="space-y-1.5">
                  {downstream.map((p) => (
                    <DependencyRow key={p.id} node={p} highlight={isFaulted || current.status === 'fault'} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Wrench size={11} /> Troubleshooting Steps
              </h3>
              <ol className="space-y-2 text-[12px] text-zinc-300">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 h-5 w-5 rounded bg-orange-500/15 text-orange-300 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function SpecBox({ label, value }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{label}</div>
      <div className="text-[12px] text-zinc-200 font-medium mt-0.5 break-words">{value}</div>
    </div>
  );
}

function DependencyRow({ node, highlight, tone }) {
  const Icon = iconFor(node.type_icon);
  let cls;
  if (tone === 'purple') cls = 'border-purple-500/25 bg-purple-500/[0.05] text-purple-100';
  else if (tone === 'blue') cls = 'border-blue-500/25 bg-blue-500/[0.05] text-blue-100';
  else if (node.status === 'fault') cls = 'border-red-500/30 bg-red-500/[0.06] text-red-200';
  else if (node.status === 'affected') cls = 'border-amber-500/30 bg-amber-500/[0.06] text-amber-200';
  else if (highlight) cls = 'border-amber-500/20 bg-amber-500/[0.04] text-zinc-200';
  else cls = 'border-white/5 bg-white/[0.02] text-zinc-300';
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${cls}`}>
      <Icon size={13} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate">{node.name}</div>
        <div className="text-[9px] text-zinc-500 font-mono">{node.id} · {node.type_label}</div>
      </div>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          node.status === 'fault' ? 'bg-red-500' : node.status === 'affected' ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />
    </div>
  );
}

// =====================================================================
// Top status bar with auth
// =====================================================================
function StatusBar({ stats, user, onSignOut, onRefresh, refreshing }) {
  return (
    <div className="h-14 shrink-0 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 gap-6">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
          <Factory size={16} className="text-white" />
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-100 leading-none">Plant Electrical</div>
          <div className="text-[9px] text-zinc-500 font-mono leading-none mt-1">TROUBLESHOOT · v2.0 · SUPABASE</div>
        </div>
      </div>
      <Separator orientation="vertical" className="h-8 bg-white/5" />

      <StatPill label="Operational" value={stats.operational} color="emerald" icon={<CheckCircle2 size={12} />} />
      <StatPill label="Affected" value={stats.affected} color="amber" icon={<AlertTriangle size={12} />} />
      <StatPill label="Fault" value={stats.fault} color="red" icon={<Radio size={12} className={stats.fault > 0 ? 'animate-pulse' : ''} />} />

      <div className="flex-1" />

      <Button variant="outline" size="sm" onClick={onRefresh} className="h-8 text-[11px] border-white/10">
        <RefreshCw size={12} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
        Reload
      </Button>

      {user ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300 bg-emerald-500/5">
            <ShieldCheck size={10} className="mr-1" /> {user.email}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onSignOut} className="h-8 text-[11px]">
            <LogOut size={12} className="mr-1.5" /> Sign out
          </Button>
        </div>
      ) : (
        <Link href="/login">
          <Button variant="outline" size="sm" className="h-8 text-[11px] border-white/10">
            <LogIn size={12} className="mr-1.5" /> Sign in
          </Button>
        </Link>
      )}

      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
        <span className={`h-2 w-2 rounded-full ${stats.fault > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
        {stats.fault > 0 ? 'NETWORK COMPROMISED' : 'ALL SYSTEMS NOMINAL'}
      </div>
    </div>
  );
}

function StatPill({ label, value, color, icon }) {
  const colorMap = {
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/[0.06]',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-500/[0.06]',
    red: 'text-red-300 border-red-500/20 bg-red-500/[0.06]',
  };
  return (
    <div className={`flex items-center gap-2 h-8 px-3 rounded-md border ${colorMap[color]} text-[11px] font-semibold`}>
      {icon}
      <span className="tracking-widest uppercase text-[10px] text-zinc-400 font-bold">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// =====================================================================
// Floor selector
// =====================================================================
function FloorSelector({ floors, selectedFloor, onSelect, totalNodes }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-zinc-950/85 backdrop-blur-xl border border-white/10 rounded-lg p-1 shadow-2xl pointer-events-auto">
      <div className="flex items-center gap-1.5 px-2 pr-3 border-r border-white/10 text-[10px] font-bold tracking-[0.16em] uppercase text-zinc-500 select-none">
        <Layers size={11} /> Floor
      </div>
      <button
        onClick={() => onSelect(null)}
        className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
          selectedFloor === null
            ? 'bg-white/15 text-zinc-100'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
        }`}
      >
        All
        <span className="text-[9px] text-zinc-500 font-mono">({totalNodes})</span>
      </button>
      {floors.map((f) => (
        <button
          key={f.name}
          onClick={() => onSelect(f.name)}
          className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
            selectedFloor === f.name
              ? 'bg-white/15 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          {f.name}
          <span className="text-[9px] text-zinc-500 font-mono">({f.count})</span>
        </button>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-20 bg-zinc-950/85 backdrop-blur-xl border border-white/10 rounded-lg p-3 text-[10px] text-zinc-400 space-y-1.5 shadow-2xl">
      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-1.5">Legend</div>
      <LegendRow color="bg-emerald-500" label="Operational" />
      <LegendRow color="bg-amber-500" label="Affected (obszar zagrożony)" />
      <LegendRow color="bg-red-500" label="Fault — root cause" pulse />
      <Separator className="my-2 bg-white/5" />
      <div className="text-[9px] font-mono text-zinc-600">scale 1 px = 15 cm</div>
    </div>
  );
}
function LegendRow({ color, label, pulse }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
    </div>
  );
}

// =====================================================================
// Main page
// =====================================================================
export default function HomePage() {
  const { buildings, nodes, loading, error, refresh } = useNetworkTopology();
  const [refreshing, setRefreshing] = useState(false);
  const [faultedIds, setFaultedIds] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('Ground');
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  // Zoom / pan state
  const containerRef = React.useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  // minZoom is updated dynamically to the fit-to-window zoom so the user
  // cannot zoom out beyond seeing the full plant layout.
  const minZoomRef = React.useRef(0.05);
  const MAX_ZOOM = 30;

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const computed = useMemo(() => computeNetworkStatus(nodes, faultedIds), [nodes, faultedIds]);

  // Derive sorted list of floors from loaded nodes
  const availableFloors = useMemo(() => {
    const floorMap = new Map();
    for (const n of computed) {
      if (!floorMap.has(n.floor)) {
        floorMap.set(n.floor, { name: n.floor, level: n.floor_level, count: 0 });
      }
      floorMap.get(n.floor).count += 1;
    }
    return Array.from(floorMap.values()).sort((a, b) => a.level - b.level);
  }, [computed]);

  // Nodes visible on the currently selected floor (null = all)
  const visibleNodes = useMemo(() => {
    if (selectedFloor === null) return computed;
    return computed.filter((n) => n.floor === selectedFloor);
  }, [computed, selectedFloor]);

  const toggleFault = useCallback((id) => {
    setFaultedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const inject = useCallback((id) => setFaultedIds((p) => new Set(p).add(id)), []);
  const clearOne = useCallback((id) => {
    setFaultedIds((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
  }, []);
  const clearAll = useCallback(() => setFaultedIds(new Set()), []);

  const stats = useMemo(() => {
    const s = { operational: 0, affected: 0, fault: 0 };
    for (const n of computed) s[n.status] += 1;
    return s;
  }, [computed]);

  const buildingStatus = useMemo(() => {
    const map = {};
    for (const b of buildings) map[b.code] = { hasFault: false, hasAffected: false };
    for (const n of computed) {
      if (!map[n.building]) continue;
      if (n.status === 'fault') map[n.building].hasFault = true;
      else if (n.status === 'affected') map[n.building].hasAffected = true;
    }
    return map;
  }, [computed, buildings]);

  const nodesByBuilding = useMemo(() => {
    const map = {};
    for (const n of visibleNodes) {
      if (!n.building) continue;
      map[n.building] = (map[n.building] || 0) + 1;
    }
    return map;
  }, [visibleNodes]);

  // Canvas dimensions derived from buildings extent (+ padding)
  const canvasDims = useMemo(() => {
    if (!buildings.length) return { w: 1360, h: 720 };
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const b of buildings) {
      minX = Math.min(minX, b.bounds.x);
      minY = Math.min(minY, b.bounds.y);
      maxX = Math.max(maxX, b.bounds.x + b.bounds.w);
      maxY = Math.max(maxY, b.bounds.y + b.bounds.h);
    }
    return { w: Math.ceil(maxX + 30), h: Math.ceil(maxY + 30) };
  }, [buildings]);

  // Fit-to-window on initial load & when canvas size changes
  const fitToWindow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const fz = Math.min(cw / canvasDims.w, ch / canvasDims.h) * 0.92;
    // Update the dynamic minimum: user can never zoom out past this level
    minZoomRef.current = fz;
    setZoom(fz);
    setOffset({
      x: (cw - canvasDims.w * fz) / 2,
      y: (ch - canvasDims.h * fz) / 2,
    });
  }, [canvasDims]);

  useEffect(() => {
    if (loading || !buildings.length) return;
    let canceled = false;
    let tries = 0;
    const tryFit = () => {
      if (canceled) return;
      const el = containerRef.current;
      if (el && el.clientWidth > 50 && el.clientHeight > 50) {
        fitToWindow();
      } else if (tries++ < 30) {
        setTimeout(tryFit, 50);
      }
    };
    tryFit();
    return () => {
      canceled = true;
    };
  }, [loading, buildings.length, fitToWindow]);

  useEffect(() => {
    const onResize = () => fitToWindow();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitToWindow]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    const next = Math.max(minZoomRef.current, Math.min(MAX_ZOOM, zoom * (1 + delta)));
    const k = next / zoom;
    setOffset((o) => ({ x: mx - (mx - o.x) * k, y: my - (my - o.y) * k }));
    setZoom(next);
  }, [zoom]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);
  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  }, [isDragging]);
  const stopDrag = useCallback(() => setIsDragging(false), []);

  const zoomBy = useCallback((factor) => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    const next = Math.max(minZoomRef.current, Math.min(MAX_ZOOM, zoom * factor));
    const k = next / zoom;
    setOffset((o) => ({ x: cw / 2 - (cw / 2 - o.x) * k, y: ch / 2 - (ch / 2 - o.y) * k }));
    setZoom(next);
  }, [zoom]);

  const signOut = async () => {
    await createClient().auth.signOut();
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <StatusBar
          stats={stats}
          user={user}
          onSignOut={signOut}
          onRefresh={handleRefresh}
          refreshing={refreshing || loading}
        />

        <div className="flex-1 flex overflow-hidden">
          <FaultPanel
            buildings={buildings}
            nodes={visibleNodes}
            faultedIds={faultedIds}
            onInject={toggleFault}
            onClear={clearAll}
            onSelect={(n) => setSelected(n)}
            selectedId={selected?.id}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />

          <main className="relative flex-1 overflow-hidden">
            {loading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Loader2 className="animate-spin" size={18} />
                  <span className="text-sm tracking-wider uppercase">Loading topology from Supabase…</span>
                </div>
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center">
                <div className="max-w-md p-6 bg-red-950/50 border border-red-500/30 rounded-lg text-red-200">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <Database size={16} /> Supabase error
                  </div>
                  <pre className="text-[11px] whitespace-pre-wrap break-words">{error}</pre>
                </div>
              </div>
            )}

            {/* Pan/zoom viewport */}
            <div
              ref={containerRef}
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              className={`absolute inset-0 overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ touchAction: 'none' }}
            >
              <div
                className="relative blueprint-grid industrial-noise origin-top-left"
                style={{
                  width: canvasDims.w,
                  height: canvasDims.h,
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  willChange: 'transform',
                }}
              >
                {buildings.map((b) => (
                  <BuildingZone
                    key={b.code}
                    building={b}
                    hasFault={buildingStatus[b.code]?.hasFault}
                    hasAffected={buildingStatus[b.code]?.hasAffected}
                    nodeCount={nodesByBuilding[b.code] || 0}
                    zoom={zoom}
                    selectedFloor={selectedFloor}
                    showFloorPlan={showFloorPlan}
                  />
                ))}

                {visibleNodes.map((node) => (
                  <NodeMarker
                    key={node.id}
                    node={node}
                    onSelect={(n) => setSelected(n)}
                    isSelected={selected?.id === node.id}
                    zoom={zoom}
                  />
                ))}
              </div>
            </div>

            {/* Floor selector — fixed overlay above the canvas */}
            <FloorSelector
              floors={availableFloors}
              selectedFloor={selectedFloor}
              onSelect={setSelectedFloor}
              totalNodes={computed.length}
            />

            {/* Legend (fixed, outside transform) */}
            <Legend />

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 bg-zinc-950/85 backdrop-blur-xl border border-white/10 rounded-lg p-1 shadow-2xl">
              <button onClick={() => zoomBy(1.25)} className="h-8 w-8 rounded-md hover:bg-white/5 text-zinc-200 flex items-center justify-center" title="Zoom in (scroll up)">
                <Plus size={14} />
              </button>
              <button onClick={() => zoomBy(0.8)} className="h-8 w-8 rounded-md hover:bg-white/5 text-zinc-200 flex items-center justify-center" title="Zoom out (scroll down)">
                <Minus size={14} />
              </button>
              <div className="h-px bg-white/5 my-0.5" />
              <button onClick={fitToWindow} className="h-8 w-8 rounded-md hover:bg-white/5 text-zinc-200 flex items-center justify-center" title="Fit to window">
                <Maximize2 size={14} />
              </button>
              <div className="h-px bg-white/5 my-0.5" />
              {/* Floor plan overlay toggle — only visible when an overlay exists */}
              <button
                onClick={() => setShowFloorPlan((v) => !v)}
                className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                  showFloorPlan
                    ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                    : 'hover:bg-white/5 text-zinc-500'
                }`}
                title="Toggle floor plan overlay (CAD reference)"
              >
                <LayoutPanelTop size={14} />
              </button>
              <div className="text-[9px] text-zinc-500 font-mono text-center pt-1 pb-0.5">
                {Math.round(zoom * 100)}%
              </div>
            </div>

            {/* Watermark */}
            <div className="absolute top-4 right-6 text-right pointer-events-none z-10">
              <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-600">
                Plant Blueprint · Sector A
              </div>
              <div className="text-[9px] font-mono text-zinc-700 mt-0.5">
                Top-down view · 1 px = 15 cm · {visibleNodes.length}/{nodes.length} objects · {selectedFloor || 'All floors'} · zoom {Math.round(zoom * 100)}%
              </div>
            </div>
          </main>
        </div>

        <NodeDrawer
          node={selected}
          allNodes={computed}
          faultedIds={faultedIds}
          onInject={inject}
          onClear={clearOne}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      </div>
    </TooltipProvider>
  );
}
