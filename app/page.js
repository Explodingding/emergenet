'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFloorPlan, getFloorPlanWallBBox } from '../lib/building-rooms';
import { getSiteBackground, hasSiteBackgroundFor } from '../lib/site-backgrounds';
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
  MapPin,
  Copy,
  Check,
  GitMerge,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { computeNetworkStatus, downstreamOf } from '@/lib/network-utils';
import { useNetworkTopology, CM_PER_PX } from '@/hooks/useNetworkTopology';
import { useIsMobile } from '@/hooks/use-mobile';
import { createClient } from '@/lib/supabase/client';

// Icon registry: map icon name string -> lucide component
const ICONS = {
  Zap, CircuitBoard, Cpu, Box, Gauge, ShieldCheck, Fuel, BatteryFull,
  LayoutPanelTop, Cog, Flame, Lightbulb, Square, Activity, Power, GitMerge,
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
// Node marker — counter-scaled rectangle, per-category size, LOD labels
// =====================================================================
// Screen size stays constant regardless of zoom (counter-scaled).
// Only faulted nodes get animated spans (few → cheap).
// Plain <button> instead of motion.button for 300+ node performance.

// Per-type-code overrides — checked before CATEGORY_SIZE
const TYPE_SIZE = {
  sync_panel: { w: 30, h: 18 },
};

// Screen px dimensions by object category (W × H).
// Cabinets (distribution / switching / control / protection) are 2× the base size.
const CATEGORY_SIZE = {
  power_source: { w: 14, h: 10 },   // transformers — slightly prominent
  distribution:  { w: 24, h: 16 },  // MCCs, panels, DBs — 2× base
  switching:     { w: 22, h: 14 },  // switchgear, breakers — 2× base
  control:       { w: 22, h: 14 },  // control panels — 2× base
  protection:    { w: 20, h: 14 },  // UPS — 2× base
  consumer:      { w: 12, h: 8  },  // motors, loads — base
  monitoring:    { w: 10, h: 7  },  // sensors, meters — small
  passive:       { w: 10, h: 7  },  // junction boxes — small
};
const DEFAULT_NODE_SIZE = { w: 12, h: 8 };

// LOD zoom thresholds
const LOD_SHOW_MARKERS  = 0.45;  // below this: hide individual markers (building count badges remain)
const LOD_SHOW_CODE     = 2.5;   // show short code label
const LOD_SHOW_NAME     = 5.0;   // show full name label
const LOD_SHOW_CABINETS = 8.0;   // below this: multi-cabinet panels collapse to single box + ×N badge

// NodeMarker receives pre-computed screen-space coords (screenX, screenY) so it
// renders outside the CSS-transformed canvas layer.  No counter-scale needed —
// the marker is always rendered at its native CSS pixel size → crisp at any zoom.
function NodeMarker({ node, onSelect, isSelected, zoom, screenX, screenY }) {
  const isFault = node.status === 'fault';
  const isAffected = node.status === 'affected';
  const safeZoom = zoom || 1;

  // Hide entirely at very low zoom — building count badges carry the info
  if (safeZoom < LOD_SHOW_MARKERS) return null;

  const rot = node.rotation ?? 0;
  const isTransposed = rot === 90 || rot === 270;
  const baseSize = TYPE_SIZE[node.type] || CATEGORY_SIZE[node.type_category] || DEFAULT_NODE_SIZE;
  const numCabinets = node.properties?.num_cabinets ?? 1;
  const DIVIDER_PX = 1;
  // Below LOD_SHOW_CABINETS: collapse to single rectangle + ×N badge to avoid flooding the map
  const showCabinetSegments = safeZoom >= LOD_SHOW_CABINETS;
  const displayCabinets = (numCabinets > 1 && showCabinetSegments) ? numCabinets : 1;
  const totalBaseW = baseSize.w * displayCabinets + (displayCabinets - 1) * DIVIDER_PX;
  const NODE_W = isTransposed ? baseSize.h : totalBaseW;
  const NODE_H = isTransposed ? totalBaseW : baseSize.h;

  // Border and fill colours by status; sync panels use cyan instead of green
  const isSyncPanel = node.type === 'sync_panel';
  const borderColor = isFault ? '#ef4444' : isAffected ? '#f59e0b' : isSyncPanel ? '#06b6d4' : '#22c55e';
  const fillColor   = isFault   ? 'rgba(127,29,29,0.92)'
                    : isAffected ? 'rgba(120,53,15,0.88)'
                    : isSyncPanel ? 'rgba(8,51,68,0.90)'
                    : 'rgba(15,23,32,0.82)';

  // Level-of-detail text below the rect
  const showCode = safeZoom >= LOD_SHOW_CODE;
  const showName = safeZoom >= LOD_SHOW_NAME;

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className="group absolute pointer-events-auto"
      style={{
        left: screenX,
        top: screenY,
        width: NODE_W,
        height: NODE_H,
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        transform: `translate(-50%, -50%)`,
      }}
    >
      {/* ── Main rectangle — rotated independently so labels stay horizontal ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: totalBaseW,
          height: baseSize.h,
          backgroundColor: fillColor,
          border: `1.5px solid ${borderColor}`,
          borderRadius: '2px',
          boxShadow: isFault ? `0 0 8px 1px ${borderColor}80` : 'none',
          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
        }}
      >
        {displayCabinets > 1 && Array.from({ length: displayCabinets - 1 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: (i + 1) * (baseSize.w + DIVIDER_PX) - DIVIDER_PX,
            top: 0,
            width: DIVIDER_PX,
            height: '100%',
            backgroundColor: borderColor,
            opacity: 0.8,
          }} />
        ))}
        {/* ×N badge — visible only in collapsed mode */}
        {numCabinets > 1 && !showCabinetSegments && (
          <div style={{
            position: 'absolute',
            top: -6,
            right: -2,
            fontSize: 7,
            lineHeight: '10px',
            padding: '0 2px',
            borderRadius: 2,
            backgroundColor: borderColor,
            color: '#0a0a0a',
            fontWeight: 700,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>×{numCabinets}</div>
        )}
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

      {/* ── LOD: code label at zoom > 7 (full name stays in hover tooltip) ── */}
      {showName && (
        <span
          className="pointer-events-none absolute left-1/2 whitespace-nowrap text-[9px] font-medium text-zinc-200 bg-zinc-900/85 border border-white/10 px-1.5 py-0.5 rounded z-10"
          style={{ top: '100%', transform: 'translateX(-50%)', marginTop: '2px' }}
        >
          {node.id}
        </span>
      )}
    </button>
  );
}

// =====================================================================
// Building zone
// =====================================================================
// LOD thresholds (pixels on screen = bounds_px * zoom)
const LOD_FULL   = 50;  // rooms + labels visible
const LOD_SIMPLE = 24;  // outline + name only
const LOD_MINI   = 16;  // tiny dot marker
// Below LOD_MINI → building is completely hidden

// =====================================================================
// Site background — unified floor-plan backdrop behind the building zones.
// Renders placed plan images (cm → px via CM_PER_PX) for the selected floor.
// =====================================================================
function SiteBackground({ selectedFloor }) {
  const layers = useMemo(() => getSiteBackground(selectedFloor), [selectedFloor]);
  if (!layers.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {layers.map((l, i) => (
        <img
          key={`${l.src}-${i}`}
          src={l.src}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={{
            left: l.x / CM_PER_PX,
            top: l.y / CM_PER_PX,
            width: l.w / CM_PER_PX,
            height: l.h / CM_PER_PX,
            objectFit: 'fill',
            opacity: 0.85,
            mixBlendMode: 'multiply',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-SVG floor plans (crisp at any zoom)
// ---------------------------------------------------------------------------
// An SVG loaded via <img> gets rasterized to a fixed-size bitmap the moment
// it's painted; our canvas zooms via a CSS `transform: scale(...)` on an
// ancestor, so zooming in just stretches that bitmap — hence the blur that
// gets worse the further you zoom. Fetching the raw markup and injecting it
// as real DOM (<path> elements) keeps it vector, so it stays sharp at any
// zoom level. Cached module-wide since these are static files fetched once.
const svgMarkupCache = new Map();

function prepareInlineSvg(svgText) {
  // Drop the root <svg>'s own width/height so our wrapper div's CSS
  // width/height (driven by the same math the old <img> used) controls
  // sizing — the viewBox still defines the coordinate system, so scaling
  // stays correct.
  return svgText.replace(/<svg\b([^>]*)>/, (_, attrs) => {
    const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    return `<svg${cleaned} style="width:100%;height:100%;display:block">`;
  });
}

function useSvgMarkup(src) {
  const [markup, setMarkup] = useState(() => (src ? svgMarkupCache.get(src) || null : null));
  useEffect(() => {
    if (!src) { setMarkup(null); return; }
    const cached = svgMarkupCache.get(src);
    if (cached) { setMarkup(cached); return; }
    let cancelled = false;
    fetch(src)
      .then((r) => r.text())
      .then((text) => {
        const prepared = prepareInlineSvg(text);
        svgMarkupCache.set(src, prepared);
        if (!cancelled) setMarkup(prepared);
      })
      .catch(() => {}); // fall back to no overlay rather than crash
    return () => { cancelled = true; };
  }, [src]);
  return markup;
}

function BuildingZone({ building, hasFault, hasAffected, nodeCount, zoom, selectedFloor, hasSiteBackground }) {
  const { bounds } = building;
  const safeZoom = zoom || 1;

  const floorMatches = !selectedFloor || !building.floors || building.floors.includes(selectedFloor);

  // ── Level-of-detail based on the SMALLER rendered dimension ──────────────
  const minPx = Math.min(bounds.w, bounds.h) * safeZoom;
  const lod = minPx < LOD_MINI ? 'hidden' : minPx >= LOD_FULL ? 'full' : minPx >= LOD_SIMPLE ? 'simple' : 'mini';

  // Skip the per-building overlay when the site background already covers this
  // building (avoids drawing two plans on top of each other).
  const floorPlanSrc =
    floorMatches && lod !== 'mini' && lod !== 'hidden' && !hasSiteBackground
      ? getFloorPlan(building.code, selectedFloor)
      : null;
  // When set, the overlay is scaled/positioned so this wall box (not the
  // full image) fits bounds.w x bounds.h — stairs/canopies outside the box
  // overflow past the building's border instead of being squeezed inside it.
  const wallBBox = floorPlanSrc ? getFloorPlanWallBBox(building.code, selectedFloor) : null;
  // Hooks must run unconditionally on every render, so this is called before
  // any early return below (even when floorPlanSrc is null — the hook itself
  // handles that by skipping the fetch).
  const svgMarkup = useSvgMarkup(floorPlanSrc && floorPlanSrc.endsWith('.svg') ? floorPlanSrc : null);

  // ── Hide building if it doesn't exist on the selected floor, or is too
  // small to show at all ──────────────────────────────────────────────────
  if (!floorMatches || lod === 'hidden') return null;

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
        className={`absolute rounded pointer-events-none border ${borderColor} bg-white/30`}
        style={{ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }}
      />
    );
  }

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
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-700 drop-shadow-sm">
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

      {/* ── Inner container — overflow-hidden clips floor plan to rounded shape ── */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        {/* Background fill + border — fill is transparent when the site
            background plan covers this building, so the plan shows through */}
        <div className={`absolute inset-0 rounded-2xl border-2 ${borderColor} ${hasSiteBackground ? 'bg-white/10' : 'bg-white/80'}`} />

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

        {/* CAD floor plan — shown automatically when an image exists for this building+floor.
            Only rendered here (clipped to the rounded box) when there's no wall bbox;
            the wall-bbox version renders unclipped on the outer wrapper below instead.
            Inline SVG markup (not <img>) so it stays vector-sharp at any zoom level;
            falls back to <img> for non-SVG overlays or while the markup is fetching. */}
        {floorPlanSrc && !wallBBox && (
          svgMarkup ? (
            <div
              className="absolute inset-0 pointer-events-none select-none"
              style={{ opacity: 0.9, mixBlendMode: 'multiply' }}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <img
              src={floorPlanSrc}
              alt={`${building.name} floor plan`}
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{ objectFit: 'fill', opacity: 0.9, mixBlendMode: 'multiply' }}
              draggable={false}
            />
          )
        )}

        {/* Corner brackets */}
        {lod === 'full' && ['top-2 left-2', 'top-2 right-2 rotate-90', 'bottom-2 left-2 -rotate-90', 'bottom-2 right-2 rotate-180'].map((pos) => (
          <div
            key={pos}
            className={`absolute ${pos} h-4 w-4 border-t-2 border-l-2 ${cornerColor}`}
          />
        ))}
      </div>

      {/* Wall-fit floor plan — scaled so wallBBox (not the full image) matches
          bounds.w x bounds.h exactly; stairs/canopies outside that box overflow
          past the building's border on purpose (outer wrapper has no overflow-hidden). */}
      {floorPlanSrc && wallBBox && (() => {
        let left, top, width, height;
        if (wallBBox.free) {
          // Free placement: image width = fraction of building width, uniform
          // scale, anchored horizontally, vertically centered — so a tall plan
          // (e.g. vertical galleries) overflows past the top & bottom edges.
          width = wallBBox.widthFracOfBuilding * bounds.w;
          const s = width / wallBBox.naturalW;
          height = wallBBox.naturalH * s;
          left = wallBBox.anchorX === 'right' ? bounds.w - width : 0;
          top = wallBBox.centerY ? (bounds.h - height) / 2 : 0;
        } else {
          // Wall-fit: scale so wallBBox (not the full image) matches the box.
          const scaleY = bounds.h / wallBBox.h;
          // uniform: keep true aspect (both axes from height) so a horizontal
          // strip overflows sideways instead of stretching to fill the box.
          const scaleX = wallBBox.uniform ? scaleY : bounds.w / wallBBox.w;
          left = -wallBBox.x * scaleX;
          top = -wallBBox.y * scaleY;
          width = wallBBox.naturalW * scaleX;
          height = wallBBox.naturalH * scaleY;
        }
        const sizeStyle = {
          left,
          top,
          width,
          height,
          // Tailwind Preflight sets img{max-width:100%;height:auto} — override
          // it so the overlay can exceed the building box and overflow past it.
          maxWidth: 'none',
          maxHeight: 'none',
          opacity: 0.9,
          mixBlendMode: 'multiply',
        };
        // Inline SVG markup (not <img>) so it stays vector-sharp at any zoom
        // level instead of being rasterized once and blurrily stretched.
        return svgMarkup ? (
          <div
            className="absolute pointer-events-none select-none"
            style={sizeStyle}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <img
            src={floorPlanSrc}
            alt={`${building.name} floor plan`}
            className="absolute pointer-events-none select-none"
            style={sizeStyle}
            draggable={false}
          />
        );
      })()}
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
  const isMobile = useIsMobile();
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
  const synchronizedGens = (current.synchronizes || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const syncPanels = (current.synchronizedBy || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);

  const statusColor =
    current.status === 'fault' ? 'text-red-400' : current.status === 'affected' ? 'text-amber-400' : 'text-emerald-400';

  const steps = TROUBLESHOOT_STEPS[current.type_category] || TROUBLESHOOT_STEPS.control;

  return (
    <Sheet open={!!node} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile
            ? 'h-[85vh] max-h-[85vh] rounded-t-2xl bg-zinc-950/95 border-t border-white/5 text-zinc-100 backdrop-blur-xl p-0 flex flex-col'
            : 'w-[440px] sm:max-w-[480px] bg-zinc-950/95 border-l border-white/5 text-zinc-100 backdrop-blur-xl p-0 flex flex-col'
        }
      >
        <SheetHeader className="p-6 pb-4 border-b border-white/5 shrink-0">
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
            {current.type === 'sync_panel' && (
              <Badge className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <GitMerge size={9} className="mr-1" />
                {current.properties?.sync_method || 'sync panel'}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 scrollbar-thin">
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

            {synchronizedGens.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400/80 mb-2 flex items-center gap-1.5">
                  <GitMerge size={11} /> Synchronized Generators ({synchronizedGens.length})
                </h3>
                {current.properties?.sync_method && (
                  <div className="grid grid-cols-3 gap-1.5 mb-2 text-[11px]">
                    <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center">
                      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Method</div>
                      <div className="text-zinc-200 font-medium mt-0.5">{current.properties.sync_method}</div>
                    </div>
                    {current.properties?.voltage_tolerance_pct != null && (
                      <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">V tol.</div>
                        <div className="text-zinc-200 font-medium mt-0.5">{current.properties.voltage_tolerance_pct}%</div>
                      </div>
                    )}
                    {current.properties?.freq_tolerance_hz != null && (
                      <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Hz tol.</div>
                        <div className="text-zinc-200 font-medium mt-0.5">{current.properties.freq_tolerance_hz} Hz</div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  {synchronizedGens.map((p) => <DependencyRow key={p.id} node={p} tone="cyan" />)}
                </div>
              </section>
            )}

            {syncPanels.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400/80 mb-2 flex items-center gap-1.5">
                  <GitMerge size={11} /> Sync Panel
                </h3>
                <div className="space-y-1.5">
                  {syncPanels.map((p) => <DependencyRow key={p.id} node={p} tone="cyan" />)}
                </div>
              </section>
            )}

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
  else if (tone === 'cyan') cls = 'border-cyan-500/25 bg-cyan-500/[0.05] text-cyan-100';
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
// Object placer — two modes:
//   "Edit existing" — pick from list, optionally rename, click to reposition
//   "Add new"       — type code/name, pick building/floor/type, click to place
// Both modes generate SQL (UPDATE or INSERT) ready to paste into Supabase.
// =====================================================================
function PlacerPanel({ nodes, buildings, objectTypes, placeTarget, onSetTarget, placements, onRemove, onClear }) {
  const [mode, setMode] = useState('pick');   // 'pick' | 'new'
  const [query, setQuery] = useState('');
  const [editName, setEditName] = useState('');
  const [editRotation, setEditRotation] = useState(0);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBldg, setNewBldg] = useState('');
  const [newFloor, setNewFloor] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newRotation, setNewRotation] = useState(0);
  const [copied, setCopied] = useState(false);

  // Pre-fill name + rotation when an existing object is armed
  useEffect(() => {
    if (placeTarget && !placeTarget.isNew) {
      setEditName(placeTarget.name || '');
      setEditRotation(placeTarget.rotation ?? 0);
    }
  }, [placeTarget]);

  // Floors for the chosen building (new-object form)
  const bldgFloors = useMemo(() => {
    const b = buildings.find((b) => b.code === newBldg);
    return b?.floors || [];
  }, [buildings, newBldg]);
  useEffect(() => { setNewFloor(bldgFloors[0] || ''); }, [bldgFloors]);

  // Filtered node list (edit-existing tab)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) =>
      n.id.toLowerCase().includes(q) ||
      n.name.toLowerCase().includes(q) ||
      (n.building || '').toLowerCase().includes(q)
    );
  }, [nodes, query]);

  const armExisting = (node) => {
    if (placeTarget?.id === node.id && !placeTarget?.isNew) { onSetTarget(null); return; }
    const r = node.rotation ?? 0;
    onSetTarget({ ...node, originalName: node.name, rotation: r });
    setEditName(node.name);
    setEditRotation(r);
  };

  const armNew = () => {
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name || !newBldg) return;
    const b = buildings.find((b) => b.code === newBldg);
    onSetTarget({ id: code, name, isNew: true, building_code: newBldg, building_id: b?.uuid || '', floor_name: newFloor, type_code: newTypeCode, rotation: newRotation });
  };

  // SQL generation — UPDATE for existing, INSERT for new
  const sql = useMemo(() => {
    if (!placements.length) return '';
    return placements.map((p) => {
      if (p.isNew) {
        const safeName = p.name.replace(/'/g, "''");
        const typeClause = p.type_code
          ? `(SELECT id FROM object_types WHERE code = '${p.type_code}')`
          : 'NULL';
        const floorClause = p.floor_name
          ? `(SELECT id FROM floors WHERE name = '${p.floor_name}' LIMIT 1)`
          : '(SELECT id FROM floors LIMIT 1)';
        // INSERT … SELECT so subqueries work and primary_floor_id is set inline
        const lines = [
          `-- INSERT: ${p.code} · ${p.name}`,
          `INSERT INTO objects (building_id, type_id, name, code, coord_x, coord_y, rotation, is_active, primary_floor_id)`,
          `SELECT`,
          `  '${p.building_id}',`,
          `  ${typeClause},`,
          `  '${safeName}',`,
          `  '${p.code}',`,
          `  ${p.x_cm}, ${p.y_cm}, ${p.rotation ?? 0}, true,`,
          `  ${floorClause};`,
        ];
        return lines.join('\n');
      }
      const nameChanged = p.name && p.name !== p.originalName;
      const nameClause = nameChanged ? `, name = '${p.name.replace(/'/g, "''")}'` : '';
      const rotClause = (p.rotation ?? 0) !== 0 ? `, rotation = ${p.rotation}` : '';
      return `UPDATE objects SET coord_x = ${p.x_cm}, coord_y = ${p.y_cm}${rotClause}${nameClause} WHERE code = '${p.code}';`;
    }).join('\n\n');
  }, [placements]);

  const copySQL = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });
  };

  const isArmedNew = placeTarget?.isNew;
  const isArmedPick = placeTarget && !placeTarget.isNew;

  return (
    <div className="absolute bottom-4 right-16 z-30 w-80 bg-zinc-950/95 backdrop-blur-xl border border-orange-500/30 rounded-lg shadow-2xl flex flex-col max-h-[85vh]">

      {/* ── Header + mode tabs ── */}
      <div className="px-3 pt-2.5 pb-0 border-b border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={13} className="text-orange-400" />
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-zinc-100 flex-1">Object Placer</span>
          {placements.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/25">
              {placements.length} queued
            </span>
          )}
        </div>
        <div className="flex gap-1 -mb-px">
          {[['pick', 'Edit existing'], ['new', 'Add new']].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); onSetTarget(null); }}
              className={`h-7 px-3 rounded-t text-[11px] font-semibold transition-colors ${
                mode === m
                  ? 'bg-zinc-900 border-t border-x border-white/10 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Edit existing ── */}
      {mode === 'pick' && (
        <>
          <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02] space-y-1.5">
            {isArmedPick ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                  <span className="font-mono text-[10px] text-orange-300 flex-1 truncate">{placeTarget.id}</span>
                  <button onClick={() => onSetTarget(null)} className="text-zinc-500 hover:text-zinc-300"><X size={11} /></button>
                </div>
                <input
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); onSetTarget({ ...placeTarget, name: e.target.value }); }}
                  placeholder="Edit display name…"
                  className="w-full px-2 py-1 text-[11px] bg-zinc-900 border border-white/10 rounded text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/40"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500">Rotation</span>
                  {[0, 90, 180, 270].map((r) => (
                    <button key={r} onClick={() => { setEditRotation(r); onSetTarget({ ...placeTarget, rotation: r }); }}
                      className={`h-5 px-1.5 rounded text-[9px] font-mono transition-colors ${editRotation === r ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40' : 'bg-white/[0.04] text-zinc-500 hover:text-zinc-300'}`}
                    >{r}°</button>
                  ))}
                </div>
                <div className="text-[9px] text-zinc-600">Click the canvas to set position</div>
              </>
            ) : (
              <span className="text-[11px] text-zinc-500 italic">Pick an object below, then click the canvas</span>
            )}
          </div>

          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" size={11} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code or name…"
                className="w-full pl-6 pr-2 py-1 text-[11px] bg-zinc-900 border border-white/10 rounded text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/40"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48 px-3 pb-2 space-y-0.5">
            {filtered.slice(0, 80).map((n) => {
              const placed = placements.find((p) => p.code === n.id);
              const isArmed = placeTarget?.id === n.id && !placeTarget?.isNew;
              return (
                <button key={n.id} onClick={() => armExisting(n)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                    isArmed ? 'bg-orange-500/15 border border-orange-500/30' : 'hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="font-mono text-[10px] text-zinc-400 w-24 truncate flex-shrink-0">{n.id}</span>
                  <span className="text-[10px] text-zinc-500 flex-1 truncate">{n.name}</span>
                  {placed && <span className="text-[9px] text-emerald-400 flex-shrink-0">✓</span>}
                </button>
              );
            })}
            {filtered.length === 0 && <div className="py-3 text-center text-[10px] text-zinc-600">No match</div>}
          </div>
        </>
      )}

      {/* ── Tab: Add new ── */}
      {mode === 'new' && (
        <div className="px-3 py-2.5 space-y-2 border-b border-white/5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 block mb-0.5">Code *</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="FRN10-MCC-01"
                className="w-full px-2 py-1 text-[11px] bg-zinc-900 border border-white/10 rounded text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/40"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 block mb-0.5">Building *</label>
              <select value={newBldg} onChange={(e) => setNewBldg(e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-zinc-900 border border-white/10 rounded text-zinc-200 outline-none focus:border-orange-500/40"
              >
                <option value="">—</option>
                {buildings.filter((b) => !b.code.startsWith('STAGING')).map((b) => (
                  <option key={b.code} value={b.code}>{b.code}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-500 block mb-0.5">Name *</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Main Compressor Drive MCC"
              className="w-full px-2 py-1 text-[11px] bg-zinc-900 border border-white/10 rounded text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-500/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 block mb-0.5">Floor</label>
              <select value={newFloor} onChange={(e) => setNewFloor(e.target.value)} disabled={!bldgFloors.length}
                className="w-full px-2 py-1 text-[11px] bg-zinc-900 border border-white/10 rounded text-zinc-200 outline-none focus:border-orange-500/40 disabled:opacity-50"
              >
                {!bldgFloors.length && <option value="">pick building first</option>}
                {bldgFloors.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 block mb-0.5">Type</label>
              <select value={newTypeCode} onChange={(e) => setNewTypeCode(e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-zinc-900 border border-white/10 rounded text-zinc-200 outline-none focus:border-orange-500/40"
              >
                <option value="">—</option>
                {objectTypes.map((t) => <option key={t.id} value={t.code}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500">Rotation</span>
            {[0, 90, 180, 270].map((r) => (
              <button key={r} onClick={() => { setNewRotation(r); if (placeTarget?.isNew) onSetTarget({ ...placeTarget, rotation: r }); }}
                className={`h-5 px-1.5 rounded text-[9px] font-mono transition-colors ${newRotation === r ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40' : 'bg-white/[0.04] text-zinc-500 hover:text-zinc-300'}`}
              >{r}°</button>
            ))}
          </div>

          {isArmedNew ? (
            <div className="flex items-center gap-2 py-1">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
              <span className="text-[11px] text-orange-300 flex-1 truncate">Armed: <span className="font-mono">{placeTarget.id}</span> — click canvas</span>
              <button onClick={() => onSetTarget(null)} className="text-zinc-500 hover:text-zinc-300"><X size={11} /></button>
            </div>
          ) : (
            <button onClick={armNew} disabled={!newCode.trim() || !newName.trim() || !newBldg}
              className="w-full h-7 rounded-md bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <MapPin size={12} /> Arm for placement
            </button>
          )}
        </div>
      )}

      {/* ── Queued placements + SQL ── */}
      {placements.length > 0 && (
        <>
          <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500 flex-1">
                Queued ({placements.length})
              </span>
              <button onClick={onClear} className="text-[9px] text-zinc-600 hover:text-red-400 transition-colors">clear all</button>
            </div>
            <div className="space-y-0.5 max-h-28 overflow-y-auto">
              {placements.map((p) => (
                <div key={p.code} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${p.isNew ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                  <span className="text-zinc-400 w-20 truncate flex-shrink-0">{p.code}</span>
                  <span className="text-zinc-600 flex-1 truncate text-[9px]">{p.name}</span>
                  <span className="text-zinc-700 flex-shrink-0">{p.x_cm},{p.y_cm}</span>
                  <button onClick={() => onRemove(p.code)} className="text-zinc-700 hover:text-red-400 flex-shrink-0"><X size={9} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="px-3 py-2 border-t border-white/5">
            <button onClick={copySQL}
              className="w-full flex items-center justify-center gap-1.5 h-7 rounded-md bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500/25 transition-colors text-[11px] font-semibold"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
// Main page
// =====================================================================
// Object detail overlay — full-screen panel for complex objects (num_cabinets ≥ 3)
// =====================================================================
// Single-line diagram for the SIVACON S8 Synchronization Switchgear (P25-0001-P006)
function SyncPanelOneLine() {
  // Front-elevation cabinet view — each of the 13 cubicles shown as a tall panel
  const CAB_W = 86;
  const CAB_GAP = 5;
  const PAD_X = 18;
  const N = SYNC_PANEL_CUBICLES.length;
  const STRIDE = CAB_W + CAB_GAP;
  const TOTAL_W = PAD_X * 2 + N * CAB_W + (N - 1) * CAB_GAP;
  const BUSBAR_Y = 46;
  const CAB_TOP = 58;
  const CAB_H = 284;
  const BRK_REL_Y = 56;
  const BRK_W = 32;
  const BRK_H = 32;
  const TOTAL_H = CAB_TOP + CAB_H + 30;

  const cabX = (i) => PAD_X + i * STRIDE;
  const midX = (i) => cabX(i) + CAB_W / 2;

  const typeColor = (t) => t === 'INCOMER' ? '#06b6d4' : t === 'COUPLER' ? '#f59e0b' : '#22c55e';
  const typeFill  = (t) => t === 'INCOMER' ? 'rgba(6,182,212,0.06)' : t === 'COUPLER' ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.06)';

  const COUPLER_I = SYNC_PANEL_CUBICLES.findIndex(c => c.type === 'COUPLER');
  const bus1x2 = cabX(COUPLER_I) - 3;
  const bus2x1 = cabX(COUPLER_I) + CAB_W + 3;

  return (
    <svg
      viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', minWidth: TOTAL_W, height: 'auto' }}
    >
      {/* Header */}
      <text x={PAD_X} y={16} fill="#52525b" fontSize={8} fontFamily="monospace" fontWeight="bold">
        SIVACON S8 · 400 V / 50 Hz / 3N+PE · Ie 4500 A · Ik 100 kA (1 s) · Order P25-0001-P006
      </text>
      {/* Section labels */}
      <text x={midX(2)} y={BUSBAR_Y - 10} textAnchor="middle" fill="#3f3f46" fontSize={7} fontFamily="monospace">── Section 1 (G1.1–G1.4) ──</text>
      <text x={midX(10)} y={BUSBAR_Y - 10} textAnchor="middle" fill="#3f3f46" fontSize={7} fontFamily="monospace">── Section 2 (G1.6–G1.8) ──</text>

      {/* Busbar rails */}
      <line x1={PAD_X - 2} y1={BUSBAR_Y} x2={bus1x2} y2={BUSBAR_Y} stroke="#71717a" strokeWidth={5} strokeLinecap="round" />
      <line x1={bus2x1} y1={BUSBAR_Y} x2={TOTAL_W - PAD_X + 2} y2={BUSBAR_Y} stroke="#71717a" strokeWidth={5} strokeLinecap="round" />
      <text x={(bus1x2 + bus2x1) / 2} y={BUSBAR_Y + 3} textAnchor="middle" fill="#52525b" fontSize={6.5} fontFamily="monospace">╌╌</text>

      {SYNC_PANEL_CUBICLES.map((c, i) => {
        const x  = cabX(i);
        const cx = midX(i);
        const col  = typeColor(c.type);
        const fill = typeFill(c.type);
        const isInc = c.type === 'INCOMER';
        const isCpl = c.type === 'COUPLER';
        const isOut = c.type === 'OUTGOING';

        const BRK_ABS_Y = CAB_TOP + BRK_REL_Y;
        const BRK_X    = cx - BRK_W / 2;
        const BRK_BOT  = BRK_ABS_Y + BRK_H;

        return (
          <g key={c.id}>
            {/* Cabinet body */}
            <rect x={x} y={CAB_TOP} width={CAB_W} height={CAB_H} rx={3}
              fill={fill} stroke={col} strokeWidth={1.5} />
            {/* Top colour band */}
            <rect x={x + 1} y={CAB_TOP + 1} width={CAB_W - 2} height={8} rx={2} fill={col} opacity={0.45} />
            {/* Panel ID */}
            <text x={cx} y={CAB_TOP + 21} textAnchor="middle"
              fill={col} fontSize={13} fontFamily="monospace" fontWeight="bold">{c.id}</text>
            {/* Type label */}
            <text x={cx} y={CAB_TOP + 33} textAnchor="middle"
              fill={col} fontSize={6.5} fontFamily="monospace" opacity={0.75}>{c.type}</text>
            {/* Separator */}
            <line x1={x + 8} y1={CAB_TOP + 37} x2={x + CAB_W - 8} y2={CAB_TOP + 37}
              stroke={col} strokeWidth={0.5} opacity={0.25} />

            {/* Busbar tap */}
            {!isCpl && (
              <line x1={cx} y1={BUSBAR_Y} x2={cx} y2={BRK_ABS_Y} stroke={col} strokeWidth={1.5} />
            )}

            {/* 3WA air circuit breaker */}
            {!isCpl && (
              <g>
                <rect x={BRK_X} y={BRK_ABS_Y} width={BRK_W} height={BRK_H}
                  fill="rgba(0,0,0,0.88)" stroke={col} strokeWidth={1.5} rx={2} />
                <line x1={BRK_X + 6} y1={BRK_BOT - 6} x2={BRK_X + BRK_W - 6} y2={BRK_ABS_Y + 6}
                  stroke={col} strokeWidth={1.3} />
                <text x={cx} y={BRK_ABS_Y + BRK_H / 2 + 3} textAnchor="middle"
                  fill={col} fontSize={6} fontFamily="monospace" opacity={0.6}>3WA</text>
              </g>
            )}
            {!isCpl && (
              <>
                <text x={cx} y={BRK_BOT + 11} textAnchor="middle"
                  fill={col} fontSize={5.5} fontFamily="monospace" opacity={0.85}>
                  {c.breaker.replace('3WA ', '')}
                </text>
                <text x={cx} y={BRK_BOT + 20} textAnchor="middle"
                  fill={col} fontSize={7} fontFamily="monospace" fontWeight="bold">{c.rating}</text>
              </>
            )}

            {/* OUTGOING: busbar → breaker → transformer → load */}
            {isOut && (
              <g>
                <line x1={cx} y1={BRK_BOT} x2={cx} y2={CAB_TOP + 136} stroke={col} strokeWidth={1.5} />
                <polygon points={`${cx},${CAB_TOP + 120} ${cx - 5},${CAB_TOP + 112} ${cx + 5},${CAB_TOP + 112}`} fill={col} />
                <circle cx={cx} cy={CAB_TOP + 150} r={13} fill="rgba(0,0,0,0.88)" stroke={col} strokeWidth={1.5} />
                <circle cx={cx} cy={CAB_TOP + 169} r={13} fill="rgba(0,0,0,0.88)" stroke={col} strokeWidth={1.5} />
                <text x={cx} y={CAB_TOP + 155} textAnchor="middle" fill={col} fontSize={7} fontFamily="monospace" opacity={0.55}>~</text>
                <text x={cx} y={CAB_TOP + 174} textAnchor="middle" fill={col} fontSize={7} fontFamily="monospace" opacity={0.55}>~</text>
                <text x={cx} y={CAB_TOP + 198} textAnchor="middle"
                  fill={col} fontSize={8} fontFamily="monospace" fontWeight="bold">{c.connected}</text>
                <text x={cx} y={CAB_TOP + 209} textAnchor="middle" fill="#71717a" fontSize={6} fontFamily="monospace">{c.busbar}</text>
              </g>
            )}

            {/* INCOMER: generator → CT → PAC meter → breaker → busbar */}
            {isInc && (
              <g>
                <polygon points={`${cx},${CAB_TOP + 108} ${cx - 5},${CAB_TOP + 116} ${cx + 5},${CAB_TOP + 116}`} fill={col} />
                <line x1={cx} y1={BRK_BOT} x2={cx} y2={CAB_TOP + 154} stroke={col} strokeWidth={1.5} />
                <ellipse cx={cx} cy={CAB_TOP + 154} rx={11} ry={7} fill="none" stroke={col} strokeWidth={1.3} />
                <text x={cx + 14} y={CAB_TOP + 157} fill={col} fontSize={6.5} fontFamily="monospace">CT</text>
                <rect x={cx - 13} y={CAB_TOP + 163} width={26} height={14} rx={2}
                  fill="rgba(0,0,0,0.75)" stroke={col} strokeWidth={0.9} opacity={0.7} />
                <text x={cx} y={CAB_TOP + 173} textAnchor="middle" fill={col} fontSize={5.5} opacity={0.7}>SENTRON PAC</text>
                <line x1={cx} y1={CAB_TOP + 177} x2={cx} y2={CAB_TOP + 200} stroke={col} strokeWidth={1.5} />
                <circle cx={cx} cy={CAB_TOP + 215} r={16} fill="rgba(0,0,0,0.88)" stroke={col} strokeWidth={1.8} />
                <text x={cx} y={CAB_TOP + 220} textAnchor="middle"
                  fill={col} fontSize={11} fontWeight="bold">G</text>
                <text x={cx} y={CAB_TOP + 244} textAnchor="middle"
                  fill={col} fontSize={8} fontFamily="monospace" fontWeight="bold">{c.connected}</text>
                <text x={cx} y={CAB_TOP + 255} textAnchor="middle" fill="#71717a" fontSize={6} fontFamily="monospace">{c.busbar}</text>
              </g>
            )}

            {/* COUPLER: bus-tie breaker bridging both sections */}
            {isCpl && (
              <g>
                <line x1={x - CAB_GAP - 1} y1={BUSBAR_Y} x2={x + 16} y2={BUSBAR_Y}
                  stroke={col} strokeWidth={1.5} strokeDasharray="4 3" />
                <line x1={x + CAB_W - 16} y1={BUSBAR_Y} x2={x + CAB_W + CAB_GAP + 1} y2={BUSBAR_Y}
                  stroke={col} strokeWidth={1.5} strokeDasharray="4 3" />
                <line x1={x + 18} y1={BUSBAR_Y} x2={x + 18} y2={CAB_TOP + 124} stroke={col} strokeWidth={1.5} />
                <line x1={x + CAB_W - 18} y1={BUSBAR_Y} x2={x + CAB_W - 18} y2={CAB_TOP + 124} stroke={col} strokeWidth={1.5} />
                <rect x={x + 6} y={CAB_TOP + 124} width={CAB_W - 12} height={50} rx={4}
                  fill="rgba(245,158,11,0.10)" stroke={col} strokeWidth={1.5} />
                <line x1={x + 14} y1={CAB_TOP + 166} x2={x + CAB_W - 14} y2={CAB_TOP + 132}
                  stroke={col} strokeWidth={1.2} />
                <text x={cx} y={CAB_TOP + 140} textAnchor="middle" fill={col} fontSize={6.5} fontFamily="monospace" fontWeight="bold">BUS COUPLER</text>
                <text x={cx} y={CAB_TOP + 151} textAnchor="middle" fill={col} fontSize={6} fontFamily="monospace">3WA 4P 100kA</text>
                <text x={cx} y={CAB_TOP + 163} textAnchor="middle" fill={col} fontSize={7} fontFamily="monospace" fontWeight="bold">{c.rating}</text>
                <text x={cx} y={CAB_TOP + 192} textAnchor="middle"
                  fill={col} fontSize={7.5} fontFamily="monospace">{c.connected}</text>
                <text x={cx} y={CAB_TOP + 203} textAnchor="middle" fill="#71717a" fontSize={6} fontFamily="monospace">{c.busbar}</text>
              </g>
            )}

            {/* PE ground symbol */}
            <g opacity={0.35}>
              <line x1={cx - 9} y1={CAB_TOP + CAB_H - 11} x2={cx + 9} y2={CAB_TOP + CAB_H - 11} stroke="#71717a" strokeWidth={1.2} />
              <line x1={cx - 6} y1={CAB_TOP + CAB_H - 7}  x2={cx + 6} y2={CAB_TOP + CAB_H - 7}  stroke="#71717a" strokeWidth={1.2} />
              <line x1={cx - 3} y1={CAB_TOP + CAB_H - 3}  x2={cx + 3} y2={CAB_TOP + CAB_H - 3}  stroke="#71717a" strokeWidth={1.2} />
            </g>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${TOTAL_W / 2 - 155}, ${CAB_TOP + CAB_H + 16})`}>
        <rect x={0}   y={-7} width={8} height={8} fill="none" stroke="#22c55e" strokeWidth={1} rx={1} />
        <text x={12}  y={1} fill="#22c55e" fontSize={7.5} fontFamily="monospace">Outgoing feeder</text>
        <rect x={128} y={-7} width={8} height={8} fill="none" stroke="#06b6d4" strokeWidth={1} rx={1} />
        <text x={140} y={1} fill="#06b6d4" fontSize={7.5} fontFamily="monospace">Generator incomer</text>
        <rect x={278} y={-7} width={8} height={8} fill="none" stroke="#f59e0b" strokeWidth={1} rx={1} />
        <text x={290} y={1} fill="#f59e0b" fontSize={7.5} fontFamily="monospace">Bus coupler</text>
      </g>
    </svg>
  );
}

// Cubicle layout data extracted from Synchronization Schematic Diagram (P25-0001-P006, rev R2 23.07.2025)
const SYNC_PANEL_CUBICLES = [
  { id: '01', type: 'OUTGOING', rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'TR-DP1.3', busbar: 'G1.1' },
  { id: '02', type: 'OUTGOING', rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'TR-DP1.1', busbar: 'G1.2' },
  { id: '03', type: 'OUTGOING', rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'TR-DP1.2', busbar: 'G1.3' },
  { id: '04', type: 'OUTGOING', rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'TR-DPC',   busbar: 'G1.4' },
  { id: '05', type: 'OUTGOING', rating: '630 A',  breaker: '3WA 3P 100kA', connected: 'Safety Panel', busbar: 'G1.5' },
  { id: '06', type: 'INCOMER',  rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'GEN-2',    busbar: '4000A AL' },
  { id: '07', type: 'INCOMER',  rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'GEN-1',    busbar: '4000A AL' },
  { id: '08', type: 'COUPLER',  rating: '6300 A', breaker: '3WA 4P 100kA', connected: 'BCL-6300A', busbar: 'Bus coupler' },
  { id: '09', type: 'INCOMER',  rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'GEN-3',    busbar: '4000A AL' },
  { id: '10', type: 'INCOMER',  rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'GEN-4',    busbar: '4000A AL' },
  { id: '11', type: 'OUTGOING', rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'TR-DP2.3', busbar: 'G1.6' },
  { id: '12', type: 'OUTGOING', rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'TR-DP2.1', busbar: 'G1.7' },
  { id: '13', type: 'OUTGOING', rating: '3200 A', breaker: '3WA 4P 100kA', connected: 'TR-DP2.2', busbar: 'G1.8' },
];

const SYNC_PANEL_TECH = {
  switchgear:      'SIVACON S8',
  order:           'P25-0001-P006',
  ratedVoltage:    '400 V AC / 50 Hz / 3N PE',
  mainBusbarIe:    '4500 A',
  loadRatedIr:     '5200 A',
  shortCircuit:    '100 kA (1s)',
  arcShortCircuit: '100 kA',
  arcDuration:     '100 ms',
  protection:      'IP31',
  cubicleHeight:   '2200 mm',
  cubicleDepth:    '800 mm',
  totalWidth:      '10 600 mm (13 cubicles)',
  busbarSection:   '2×4×30×10 mm Al (L1–L3, N)',
  peSection:       '1×2×40×5 mm',
};

// ─── F1-GEN-DP data (P25-0001-P023, DNT-GROUP, rev M0 14.11.2025) ────────────
const F1_GEN_DP_FEEDERS_02 = [
  { slot: 'B02', label: 'F1-DPG.4',  rating: '80A',  kind: 'out' },
  { slot: 'B03', label: 'F1-DPG.5',  rating: '80A',  kind: 'out' },
  { slot: 'B06', label: 'UT-DP',     rating: '160A', kind: 'out' },
  { slot: 'B12', label: 'F1-LP2',    rating: '80A',  kind: 'out' },
  { slot: 'B13', label: 'F1-LP3',    rating: '80A',  kind: 'out' },
  { slot: 'B14', label: 'F1-LP4',    rating: '80A',  kind: 'out' },
  { slot: 'B15', label: 'F1-LP5',    rating: '80A',  kind: 'out' },
  { slot: 'B16', label: 'F1-LP6',    rating: '80A',  kind: 'out' },
  { slot: 'B17', label: 'W1-LP1',    rating: '80A',  kind: 'out' },
  { slot: 'B18', label: 'F1-MCC.2',  rating: '100A', kind: 'out' },
  { slot: 'B20', label: 'F1-MCC.4',  rating: '80A',  kind: 'out' },
  { slot: 'B23', label: 'SPARE-5',   rating: '160A', kind: 'spare' },
];
const F1_GEN_DP_FEEDERS_03 = [
  { slot: null,  label: 'EMPTY',     rating: '—',    kind: 'empty' },
  { slot: 'B01', label: 'F1-DPG.3',  rating: '50A',  kind: 'out' },
  { slot: 'B04', label: 'F1-DPG.6',  rating: '50A',  kind: 'out' },
  { slot: 'B05', label: 'F1-DPG.7',  rating: '63A',  kind: 'out' },
  { slot: 'B07', label: 'MS-DP',     rating: '50A',  kind: 'out' },
  { slot: 'B08', label: 'SPARE-1',   rating: '63A',  kind: 'spare' },
  { slot: 'B09', label: 'F1-ADP',    rating: '50A',  kind: 'out' },
  { slot: 'B10', label: 'PW-DP',     rating: '63A',  kind: 'out' },
  { slot: 'B11', label: 'SPARE-2',   rating: '63A',  kind: 'spare' },
  { slot: 'B19', label: 'F1-MCC.3',  rating: '63A',  kind: 'out' },
  { slot: 'B21', label: 'SPARE-3',   rating: '40A',  kind: 'spare' },
  { slot: 'B22', label: 'SPARE-4',   rating: '80A',  kind: 'spare' },
];
const GEN_DP_TECH = {
  switchgear:     'SIVACON S8',
  order:          'P25-0001-P023',
  ratedVoltage:   '400 V AC / 50 Hz / 3N PE',
  mainBusbarIe:   '2200 A',
  loadRatedIr:    '500 A',
  shortCircuit:   '25 kA (1 s)',
  protection:     'IP31',
  cubicleHeight:  '2200 mm',
  cubicleDepth:   '1000 mm',
  totalWidth:     '2600 mm (3 cubicles)',
  busbarSection:  '1×2×20×10 mm (L1–L3, N)',
  peSection:      '1×2×20×5 mm',
  color:          'RAL 7035',
};

function GenDpElevation() {
  const PAD_X  = 16;
  const GAP    = 8;
  const W1     = 190;  // +01 INCOMER  (850 mm real)
  const W2     = 230;  // +02 OUTGOING A (850 mm real)
  const W3     = 130;  // +03 OUTGOING B (450 mm real)
  const CAB_H  = 300;
  const CAB_TOP   = 48;
  const BUSBAR_Y  = 32;
  const HEADER_H  = 18;
  const TOTAL_W   = PAD_X * 2 + W1 + GAP + W2 + GAP + W3; // 598
  const TOTAL_H   = CAB_TOP + CAB_H + 36;                   // 384

  const X1 = PAD_X;
  const X2 = X1 + W1 + GAP;
  const X3 = X2 + W2 + GAP;
  const BODY_Y = CAB_TOP;

  const CELL_H  = (CAB_H - HEADER_H - 4) / 6; // ≈46 px
  const CW2     = (W2 - 12) / 2;               // ≈109 px
  const CW3     = (W3 - 10) / 2;               // 60 px

  const KIND_CLR = { out: '#22c55e', spare: '#f59e0b', empty: '#3f3f46' };

  return (
    <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', minWidth: TOTAL_W, height: 'auto' }}>
      <rect width={TOTAL_W} height={TOTAL_H} fill="#0f172a" rx="6" />

      {/* Busbar rails L1 L2 L3 N PE */}
      {[0,3,6,9,12].map((off, i) => (
        <line key={i} x1={X1} y1={BUSBAR_Y - off} x2={X3 + W3} y2={BUSBAR_Y - off}
              stroke={['#ef4444','#f59e0b','#3b82f6','#a3a3a3','#22c55e'][i]}
              strokeWidth="2" />
      ))}
      {['L1','L2','L3','N','PE'].map((lbl, i) => (
        <text key={lbl} x={X1 - 3} y={BUSBAR_Y - i * 3 + 1.5} textAnchor="end" fill="#71717a" fontSize="5.5">{lbl}</text>
      ))}

      {/* ── Cabinet +01 INCOMER ── */}
      <rect x={X1} y={BODY_Y} width={W1} height={CAB_H} fill="#0c1a2e" stroke="#06b6d4" strokeWidth="1.5" rx="2" />
      <rect x={X1} y={BODY_Y} width={W1} height={HEADER_H} fill="rgba(6,182,212,0.12)" rx="2" />
      <text x={X1 + W1/2} y={BODY_Y + 12} textAnchor="middle" fill="#06b6d4" fontSize="7.5" fontWeight="700" letterSpacing="0.8">+01 · INCOMER</text>
      {/* feed line busbar → top of CT */}
      <line x1={X1 + W1/2} y1={BUSBAR_Y} x2={X1 + W1/2} y2={BODY_Y + HEADER_H + 16} stroke="#06b6d4" strokeWidth="1.2" />
      {/* CT ellipse */}
      <ellipse cx={X1 + W1/2} cy={BODY_Y + HEADER_H + 25} rx={24} ry={9} fill="none" stroke="#06b6d4" strokeWidth="1.2" />
      <text x={X1 + W1/2} y={BODY_Y + HEADER_H + 28} textAnchor="middle" fill="#06b6d4" fontSize="6">1000/1A</text>
      <text x={X1 + 4} y={BODY_Y + HEADER_H + 23} fill="#4b5563" fontSize="5.5">CT</text>
      {/* CT bottom → breaker top */}
      <line x1={X1 + W1/2} y1={BODY_Y + HEADER_H + 34} x2={X1 + W1/2} y2={BODY_Y + HEADER_H + 48} stroke="#06b6d4" strokeWidth="1.2" />
      {/* 3WA breaker */}
      <rect x={X1 + W1/2 - 30} y={BODY_Y + HEADER_H + 48} width={60} height={52} rx="3" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
      <line x1={X1 + W1/2 - 30} y1={BODY_Y + HEADER_H + 48} x2={X1 + W1/2 + 30} y2={BODY_Y + HEADER_H + 100} stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" />
      <text x={X1 + W1/2} y={BODY_Y + HEADER_H + 68} textAnchor="middle" fill="#06b6d4" fontSize="8" fontWeight="700">3WA</text>
      <text x={X1 + W1/2} y={BODY_Y + HEADER_H + 80} textAnchor="middle" fill="#06b6d4" fontSize="7">800 A · 4P</text>
      <text x={X1 + W1/2} y={BODY_Y + HEADER_H + 91} textAnchor="middle" fill="#06b6d4" fontSize="6">55 kA</text>
      {/* breaker → SENTRON PAC */}
      <line x1={X1 + W1/2} y1={BODY_Y + HEADER_H + 100} x2={X1 + W1/2} y2={BODY_Y + HEADER_H + 110} stroke="#06b6d4" strokeWidth="1.2" />
      {/* SENTRON PAC */}
      <rect x={X1 + W1/2 - 34} y={BODY_Y + HEADER_H + 110} width={68} height={34} rx="3" fill="#0a2040" stroke="#06b6d4" strokeWidth="1" />
      <text x={X1 + W1/2} y={BODY_Y + HEADER_H + 124} textAnchor="middle" fill="#06b6d4" fontSize="7" fontWeight="700">SENTRON PAC</text>
      <text x={X1 + W1/2} y={BODY_Y + HEADER_H + 136} textAnchor="middle" fill="#06b6d4" fontSize="6.5" opacity="0.7">U · I · P</text>
      {/* dashed cable down to generator entry */}
      <line x1={X1 + W1/2} y1={BODY_Y + HEADER_H + 144} x2={X1 + W1/2} y2={BODY_Y + CAB_H - 22} stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="3,2" />
      <polygon fill="#06b6d4" points={`${X1+W1/2-5},${BODY_Y+CAB_H-22} ${X1+W1/2+5},${BODY_Y+CAB_H-22} ${X1+W1/2},${BODY_Y+CAB_H-12}`} />
      <text x={X1 + W1/2} y={BODY_Y + CAB_H - 3} textAnchor="middle" fill="#4b5563" fontSize="6">From Generator</text>

      {/* ── Cabinet +02 OUTGOING A (12 feeders, 2×6) ── */}
      <rect x={X2} y={BODY_Y} width={W2} height={CAB_H} fill="#0c1a2e" stroke="#22c55e" strokeWidth="1.5" rx="2" />
      <rect x={X2} y={BODY_Y} width={W2} height={HEADER_H} fill="rgba(34,197,94,0.08)" rx="2" />
      <text x={X2 + W2/2} y={BODY_Y + 12} textAnchor="middle" fill="#22c55e" fontSize="7.5" fontWeight="700" letterSpacing="0.8">+02 · OUTGOING A</text>
      <line x1={X2 + W2/2} y1={BUSBAR_Y} x2={X2 + W2/2} y2={BODY_Y + HEADER_H} stroke="#22c55e" strokeWidth="1.2" strokeDasharray="2,2" />
      {F1_GEN_DP_FEEDERS_02.map((f, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx  = X2 + 6 + col * (CW2 + 1);
        const cy  = BODY_Y + HEADER_H + 4 + row * CELL_H;
        const clr = KIND_CLR[f.kind] || '#52525b';
        return (
          <g key={f.slot || idx}>
            <rect x={cx} y={cy} width={CW2} height={CELL_H - 2} rx="2" fill={`${clr}14`} stroke={clr} strokeWidth="0.6" />
            <text x={cx + CW2/2} y={cy + 12} textAnchor="middle" fill={clr} fontSize="6.5" fontWeight="600">{f.label}</text>
            <text x={cx + CW2/2} y={cy + 22} textAnchor="middle" fill={clr} fontSize="6" opacity="0.75">{f.rating}</text>
            {f.slot && <text x={cx + 2} y={cy + CELL_H - 5} fill="#3f3f46" fontSize="5">{f.slot}</text>}
          </g>
        );
      })}

      {/* ── Cabinet +03 OUTGOING B (12 feeders, 2×6) ── */}
      <rect x={X3} y={BODY_Y} width={W3} height={CAB_H} fill="#0c1a2e" stroke="#22c55e" strokeWidth="1.5" rx="2" />
      <rect x={X3} y={BODY_Y} width={W3} height={HEADER_H} fill="rgba(34,197,94,0.08)" rx="2" />
      <text x={X3 + W3/2} y={BODY_Y + 12} textAnchor="middle" fill="#22c55e" fontSize="7.5" fontWeight="700" letterSpacing="0.8">+03 · OUTGOING B</text>
      <line x1={X3 + W3/2} y1={BUSBAR_Y} x2={X3 + W3/2} y2={BODY_Y + HEADER_H} stroke="#22c55e" strokeWidth="1.2" strokeDasharray="2,2" />
      {F1_GEN_DP_FEEDERS_03.map((f, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx  = X3 + 5 + col * (CW3 + 1);
        const cy  = BODY_Y + HEADER_H + 4 + row * CELL_H;
        const clr = KIND_CLR[f.kind] || '#52525b';
        return (
          <g key={`c3-${idx}`}>
            <rect x={cx} y={cy} width={CW3} height={CELL_H - 2} rx="2" fill={`${clr}14`} stroke={clr} strokeWidth="0.6" />
            <text x={cx + CW3/2} y={cy + 12} textAnchor="middle" fill={clr} fontSize="6" fontWeight="600">{f.label}</text>
            <text x={cx + CW3/2} y={cy + 22} textAnchor="middle" fill={clr} fontSize="5.5" opacity="0.75">{f.rating}</text>
          </g>
        );
      })}

      {/* Legend */}
      {[['#22c55e','Outgoing feeder'],['#f59e0b','Spare / Reserved'],['#3f3f46','Empty position']].map(([c,l], i) => (
        <g key={l} transform={`translate(${PAD_X + i * 190}, ${BODY_Y + CAB_H + 14})`}>
          <rect width={8} height={8} rx="1" y={-1} fill={`${c}20`} stroke={c} strokeWidth="0.8" />
          <text x={12} y={7} fill="#71717a" fontSize="6.5">{l}</text>
        </g>
      ))}
    </svg>
  );
}

// =====================================================================
// Data-driven single-busbar distribution panel elevations. Keyed by
// object code (node.id) — add a new entry once a real panel drawing is
// available, and it renders automatically via DistributionBusbarElevation
// below. Same "row of feeder breakers off one busbar" convention already
// used for the MV panel rows (Fur10/Fur20 Main MV Panel).
// =====================================================================
const DISTRIBUTION_PANEL_DATA = {
  'UTL-TRDP-1.3': {
    title: 'TR-DP1.3',
    subtitle: '400V/230V 50Hz · IP31 · Form 4B TYPE6 · PROCESS',
    incomer: { label: 'TR 1.3', rating: '2500 kVA' },
    feeders: [
      { label: 'DISTRIBUTION BUILDING', target: 'DST-DP-UP',   rating: '6.5 kW',  kind: 'out' },
      { label: 'LPG BUILDING',          target: 'LPG-DP',      rating: '5.45 kW', kind: 'out' },
      { label: 'PEDESTRIAN GUARD',      target: 'GUH-DP-UP',   rating: '6.7 kW',  kind: 'out' },
      { label: 'TRUCK GUARD',           target: 'TRG-DP-UP1',  rating: '13.3 kW', kind: 'out' },
      { label: 'EV CHARGING',           target: 'UTL-EV-CHG',  rating: '150 kW',  kind: 'out' },
      { label: 'SPARE-17', kind: 'spare' },
      { label: 'SPARE-7',  kind: 'spare' },
      { label: 'SPARE-1',  kind: 'spare' },
      { label: 'SPARE-2',  kind: 'spare' },
      { label: 'SPARE-3',  kind: 'spare' },
      { label: 'SPARE-4',  kind: 'spare' },
      { label: 'SPARE-5',  kind: 'spare' },
      { label: 'SPARE-6',  kind: 'spare' },
      { label: '7 BAR COMPRESSOR', target: 'UTL-COMP7-1', rating: '2×354.3A', kind: 'out' },
      { label: 'SPARE-8', kind: 'spare' },
      { label: 'COUPLING TO SYNC', target: 'SYNCHRONIZATION PANEL', rating: '(4)', kind: 'tie' },
      { label: 'SPARE-9',  kind: 'spare' },
      { label: 'SPARE-10', kind: 'spare' },
      { label: 'SPARE-11', kind: 'spare' },
      { label: 'SPARE-12', kind: 'spare' },
      { label: 'SPARE-13', kind: 'spare' },
      { label: 'SPARE-14', kind: 'spare' },
      { label: 'SPARE-15', kind: 'spare' },
      { label: 'SPARE-16', kind: 'spare' },
    ],
    pfc: { label: 'TR-DP1.3 PFC w/ Harmonic Filter', target: 'UTL-PFC-1.3', rating: '1500 kVAr' },
    source: 'Panel elevation drawing (Utility Building, Level 5m)',
  },
};

const DP_KIND_CLR = { out: '#22c55e', spare: '#f59e0b', tie: '#06b6d4', empty: '#3f3f46' };

function DistributionBusbarElevation({ data }) {
  const PAD_X   = 20;
  const COL_W   = 62;
  const BODY_Y  = 60;
  const BUS_Y   = BODY_Y + 90;
  const CELL_H  = 70;
  const n       = data.feeders.length;
  const TOTAL_W = PAD_X * 2 + COL_W * (n + 1); // +1 for incomer column
  const TOTAL_H = BUS_Y + CELL_H + 90;

  const colX = (i) => PAD_X + COL_W * (i + 1) + COL_W / 2; // +1: incomer occupies column 0

  return (
    <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', minWidth: TOTAL_W, height: 'auto' }}>
      <rect width={TOTAL_W} height={TOTAL_H} fill="#0f172a" rx="6" />

      {/* Incomer */}
      <g>
        <line x1={colX(-1)} y1={BODY_Y} x2={colX(-1)} y2={BUS_Y} stroke="#22c55e" strokeWidth="1.5" />
        <path d={`M ${colX(-1)-5},${BODY_Y+18} L ${colX(-1)+5},${BODY_Y+18} L ${colX(-1)},${BODY_Y+30} Z`} fill="#22c55e" />
        <text x={colX(-1)} y={BODY_Y - 10} textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="700">{data.incomer.label}</text>
        <text x={colX(-1)} y={BODY_Y - 1} textAnchor="middle" fill="#22c55e" fontSize="6.5" opacity="0.75">{data.incomer.rating}</text>
      </g>

      {/* Busbar */}
      <line x1={PAD_X} y1={BUS_Y} x2={TOTAL_W - PAD_X} y2={BUS_Y} stroke="#71717a" strokeWidth="3" strokeLinecap="round" />

      {/* Feeder breakers */}
      {data.feeders.map((f, i) => {
        const cx = colX(i);
        const clr = DP_KIND_CLR[f.kind] || '#52525b';
        return (
          <g key={i}>
            <line x1={cx} y1={BUS_Y} x2={cx} y2={BUS_Y + 16} stroke={clr} strokeWidth="1.2" />
            <rect x={cx - 16} y={BUS_Y + 16} width={32} height={CELL_H - 16} rx="2" fill={`${clr}14`} stroke={clr} strokeWidth="0.8" />
            <text x={cx} y={BUS_Y + 30} textAnchor="middle" fill={clr} fontSize="5.5" fontWeight="600">
              {f.label.length > 14 ? f.label.slice(0, 13) + '…' : f.label}
            </text>
            {f.rating && (
              <text x={cx} y={BUS_Y + 41} textAnchor="middle" fill={clr} fontSize="5" opacity="0.75">{f.rating}</text>
            )}
            {f.target && (
              <text x={cx} y={BUS_Y + CELL_H - 4} textAnchor="middle" fill="#3f3f46" fontSize="4.5" fontFamily="monospace">{f.target}</text>
            )}
          </g>
        );
      })}

      {/* PFC filter, off to the side */}
      {data.pfc && (
        <g transform={`translate(${TOTAL_W - PAD_X - 150}, ${BUS_Y + CELL_H + 20})`}>
          <rect width="150" height="40" rx="3" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth="1" />
          <text x={75} y={16} textAnchor="middle" fill="#3b82f6" fontSize="6.5" fontWeight="700">{data.pfc.label}</text>
          <text x={75} y={27} textAnchor="middle" fill="#3b82f6" fontSize="6" opacity="0.8">{data.pfc.rating} · {data.pfc.target}</text>
        </g>
      )}

      {/* Legend */}
      {[['#22c55e','Outgoing feeder'],['#f59e0b','Spare / Reserved'],['#06b6d4','Bus tie']].map(([c,l], i) => (
        <g key={l} transform={`translate(${PAD_X + i * 170}, ${TOTAL_H - 14})`}>
          <rect width={8} height={8} rx="1" y={-6} fill={`${c}20`} stroke={c} strokeWidth="0.8" />
          <text x={12} y={0} fill="#71717a" fontSize="6.5">{l}</text>
        </g>
      ))}
    </svg>
  );
}

// Generic front-elevation for distribution_board / mcc — scales to num_cabinets
function GenericCabinetElevation({ node }) {
  const N       = Math.max(1, node.properties?.num_cabinets ?? 1);
  const CAB_W   = 130;
  const CAB_H   = 280;
  const CAB_GAP = 8;
  const PAD_X   = 16;
  const CAB_TOP = 44;
  const BUSBAR_Y = 28;
  const SLOTS   = 8;
  const SLOT_H  = (CAB_H - 22) / SLOTS;
  const TOTAL_W = PAD_X * 2 + N * CAB_W + (N - 1) * CAB_GAP;
  const TOTAL_H = CAB_TOP + CAB_H + 28;
  const voltage = node.properties?.voltage || '400 V';

  return (
    <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', minWidth: TOTAL_W, height: 'auto' }}>
      <rect width={TOTAL_W} height={TOTAL_H} fill="#0f172a" rx="6" />

      {/* Busbar rail */}
      <line x1={PAD_X} y1={BUSBAR_Y} x2={TOTAL_W - PAD_X} y2={BUSBAR_Y} stroke="#22c55e" strokeWidth="3" />
      <line x1={PAD_X} y1={BUSBAR_Y + 4} x2={TOTAL_W - PAD_X} y2={BUSBAR_Y + 4} stroke="#22c55e" strokeWidth="1.5" opacity="0.4" />
      <text x={PAD_X} y={BUSBAR_Y - 4} fill="#22c55e" fontSize="6" opacity="0.6">3/N/PE {voltage} 50Hz</text>

      {Array.from({ length: N }, (_, i) => {
        const x = PAD_X + i * (CAB_W + CAB_GAP);
        const mx = x + CAB_W / 2;
        return (
          <g key={i}>
            {/* Cabinet body */}
            <rect x={x} y={CAB_TOP} width={CAB_W} height={CAB_H} fill="#0c1a2e" stroke="#22c55e" strokeWidth="1.5" rx="2" />
            {/* Header bar */}
            <rect x={x} y={CAB_TOP} width={CAB_W} height={18} fill="rgba(34,197,94,0.1)" rx="2" />
            <text x={mx} y={CAB_TOP + 12} textAnchor="middle" fill="#22c55e" fontSize="7.5" fontWeight="700">
              {String(i + 1).padStart(2, '0')}
            </text>
            {/* Busbar tap */}
            <line x1={mx} y1={BUSBAR_Y + 4} x2={mx} y2={CAB_TOP + 18} stroke="#22c55e" strokeWidth="1" strokeDasharray="2,2" />
            {/* Incomer breaker (top slot, taller) */}
            <rect x={x + 8} y={CAB_TOP + 22} width={CAB_W - 16} height={SLOT_H * 1.5 - 2} rx="3"
                  fill="#0a2040" stroke="#06b6d4" strokeWidth="1" />
            <text x={mx} y={CAB_TOP + 22 + SLOT_H * 0.75 - 2} textAnchor="middle" fill="#06b6d4" fontSize="6.5" fontWeight="700">
              {i === 0 ? 'INCOMER' : 'BUS TIE'}
            </text>
            <text x={mx} y={CAB_TOP + 22 + SLOT_H * 0.75 + 8} textAnchor="middle" fill="#06b6d4" fontSize="6" opacity="0.7">3WA · ACB</text>
            {/* Outgoing drawer slots */}
            {Array.from({ length: SLOTS - 1 }, (_, s) => {
              const sy = CAB_TOP + 22 + SLOT_H * 1.5 + s * (SLOT_H * 0.9);
              return (
                <g key={s}>
                  <rect x={x + 8} y={sy} width={CAB_W - 16} height={SLOT_H * 0.9 - 2}
                        rx="2" fill="#132033" stroke="#1e3a52" strokeWidth="0.7" />
                  <rect x={x + 10} y={sy + 3} width={16} height={SLOT_H * 0.9 - 8}
                        rx="1" fill="#1e3a52" />
                  <text x={x + 34} y={sy + SLOT_H * 0.45 + 1} fill="#4b5563" fontSize="5.5">OUTGOING {s + 1}</text>
                </g>
              );
            })}
            {/* Cabinet number label below */}
            <text x={mx} y={CAB_TOP + CAB_H + 14} textAnchor="middle" fill="#3f3f46" fontSize="6.5" fontFamily="monospace">
              +{String(i + 1).padStart(2, '0')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ObjectDetailPanel({ node, allNodes, faultedIds, onClose, onSelect }) {
  const isMobile = useIsMobile();
  const find = (id) => allNodes.find((n) => n.id === id);
  const parents         = (node.dependsOn || []).map(find).filter(Boolean);
  const downstream      = downstreamOf(allNodes, node.id).map(find).filter(Boolean);
  const controls        = (node.controlsTargets || []).map(find).filter(Boolean);
  const controlledBy    = (node.controlledBy || []).map(find).filter(Boolean);
  const backedUpBy      = (node.backedUpBy || []).map(find).filter(Boolean);
  const backupFor       = (node.backupFor || []).map(find).filter(Boolean);
  const synchronizedGens = (node.synchronizes || []).map(find).filter(Boolean);
  const syncPanels      = (node.synchronizedBy || []).map(find).filter(Boolean);

  const numCabinets = node.properties?.num_cabinets ?? 1;
  const isSyncPanel  = node.type === 'sync_panel';
  const isGenDp      = node.id?.endsWith('-GEN-DP');
  const dpBusbarData = DISTRIBUTION_PANEL_DATA[node.id];
  const isDpBusbar   = !!dpBusbarData;
  const isDistPanel  = !isGenDp && !isSyncPanel && !isDpBusbar && ['distribution_board', 'mcc', 'cabinet'].includes(node.type);
  const borderColor = node.status === 'fault' ? '#ef4444' : node.status === 'affected' ? '#f59e0b' : isSyncPanel ? '#06b6d4' : isGenDp ? '#22c55e' : '#22c55e';
  const Icon = iconFor(node.type_icon);
  const steps = TROUBLESHOOT_STEPS[node.type_category] || TROUBLESHOOT_STEPS.control;

  const statusBadgeCls = node.status === 'fault'
    ? 'bg-red-500/15 text-red-300 border-red-500/30'
    : node.status === 'affected'
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

  return (
    <motion.div
      className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.18 }}
    >
      {/* ── Top bar ── */}
      <div className="h-12 shrink-0 border-b border-white/5 flex items-center px-5 gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-[12px] transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <Separator orientation="vertical" className="h-5 bg-white/5" />
        <span className="font-mono text-[11px] text-zinc-500">{node.id}</span>
        <span className="text-[12px] text-zinc-300 font-medium truncate">{node.name}</span>
        <div className="flex-1" />
        <Badge className={`uppercase tracking-widest text-[10px] font-bold border ${statusBadgeCls}`}>
          {node.status === 'fault' && <Radio size={10} className="mr-1 animate-pulse" />}
          {node.status}
        </Badge>
      </div>

      {/* ── Object header ── */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 ${
          node.status === 'fault' ? 'bg-red-500/10 border-red-500/30'
          : node.status === 'affected' ? 'bg-amber-500/10 border-amber-500/30'
          : isSyncPanel ? 'bg-cyan-500/10 border-cyan-500/30'
          : 'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <Icon size={22} style={{ color: borderColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-zinc-100 leading-tight">{node.name}</h2>
          <p className="font-mono text-[11px] text-zinc-500 mt-0.5">{node.id} · {node.type_label}</p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">{node.building_name}</Badge>
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">{node.floor}</Badge>
            {numCabinets > 1 && (
              <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
                <Layers size={9} className="mr-1" />{numCabinets} cabinets
              </Badge>
            )}
            {isSyncPanel && node.properties?.sync_method && (
              <Badge className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <GitMerge size={9} className="mr-1" />{node.properties.sync_method}
              </Badge>
            )}
          </div>
        </div>
        {/* Cabinet visual */}
        {numCabinets > 1 && (
          <div className="shrink-0 flex gap-0.5">
            {Array.from({ length: numCabinets }, (_, i) => (
              <div key={i} style={{ width: 28, height: 44, borderColor, borderWidth: '1.5px', borderStyle: 'solid', borderRadius: 3, position: 'relative', backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4, gap: 3 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: borderColor, opacity: 0.7 }} />
                <div style={{ width: 10, height: 1.5, borderRadius: 1, backgroundColor: borderColor, opacity: 0.4 }} />
                <div style={{ position: 'absolute', top: 3, fontSize: 8, color: '#71717a', fontFamily: 'monospace' }}>{i + 1}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Two-column body (stacks vertically on mobile) ── */}
      <div className={`flex-1 flex overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
        {/* Left — info */}
        <ScrollArea
          className={
            isMobile
              ? 'w-full max-h-[45vh] shrink-0 border-b border-white/5'
              : 'w-[460px] shrink-0 border-r border-white/5'
          }
        >
          <div className="p-5 space-y-5">

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Gauge size={11} /> Specifications
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <SpecBox label="Type" value={node.type_label} />
                <SpecBox label="Category" value={node.type_category} />
                <SpecBox label="Rating" value={node.rating || '—'} />
                <SpecBox label="Voltage" value={node.voltage || '—'} />
                <SpecBox label="Position" value={`${node.coord_cm.x}, ${node.coord_cm.y} cm`} />
                <SpecBox label="Installed" value={node.installed || '—'} />
                {numCabinets > 1 && <SpecBox label="Cabinets" value={String(numCabinets)} />}
              </div>
              {node.properties && Object.keys(node.properties).length > 0 && (
                <details className="mt-2 group">
                  <summary className="text-[10px] uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300">All properties</summary>
                  <pre className="mt-1.5 text-[10px] text-zinc-400 bg-black/40 border border-white/5 rounded p-2 overflow-auto">
                    {JSON.stringify(node.properties, null, 2)}
                  </pre>
                </details>
              )}
            </section>

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Power size={11} /> Upstream Power
              </h3>
              {parents.length === 0
                ? <p className="text-[11px] text-zinc-500 italic">Grid feed / root node</p>
                : <div className="space-y-1.5">{parents.map((p) => <DependencyRow key={p.id} node={p} />)}</div>}
            </section>

            {backedUpBy.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-400/80 mb-2 flex items-center gap-1.5"><ShieldCheck size={11} /> Backup Sources</h3>
                <div className="space-y-1.5">{backedUpBy.map((p) => <DependencyRow key={p.id} node={p} tone="blue" />)}</div>
              </section>
            )}
            {controlledBy.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-purple-400/80 mb-2 flex items-center gap-1.5"><Cpu size={11} /> Controlled By</h3>
                <div className="space-y-1.5">{controlledBy.map((p) => <DependencyRow key={p.id} node={p} tone="purple" />)}</div>
              </section>
            )}
            {controls.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-purple-400/80 mb-2 flex items-center gap-1.5"><Cpu size={11} /> Controls ({controls.length})</h3>
                <div className="space-y-1.5">{controls.map((p) => <DependencyRow key={p.id} node={p} tone="purple" />)}</div>
              </section>
            )}
            {backupFor.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-400/80 mb-2 flex items-center gap-1.5"><ShieldCheck size={11} /> Backup For</h3>
                <div className="space-y-1.5">{backupFor.map((p) => <DependencyRow key={p.id} node={p} tone="blue" />)}</div>
              </section>
            )}
            {synchronizedGens.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400/80 mb-2 flex items-center gap-1.5">
                  <GitMerge size={11} /> Synchronized Generators ({synchronizedGens.length})
                </h3>
                {node.properties?.sync_method && (
                  <div className="grid grid-cols-3 gap-1.5 mb-2 text-[11px]">
                    <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center">
                      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Method</div>
                      <div className="text-zinc-200 font-medium mt-0.5">{node.properties.sync_method}</div>
                    </div>
                    {node.properties?.voltage_tolerance_pct != null && (
                      <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">V tol.</div>
                        <div className="text-zinc-200 font-medium mt-0.5">{node.properties.voltage_tolerance_pct}%</div>
                      </div>
                    )}
                    {node.properties?.freq_tolerance_hz != null && (
                      <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Hz tol.</div>
                        <div className="text-zinc-200 font-medium mt-0.5">{node.properties.freq_tolerance_hz} Hz</div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">{synchronizedGens.map((p) => <DependencyRow key={p.id} node={p} tone="cyan" />)}</div>
              </section>
            )}
            {syncPanels.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400/80 mb-2 flex items-center gap-1.5"><GitMerge size={11} /> Sync Panel</h3>
                <div className="space-y-1.5">{syncPanels.map((p) => <DependencyRow key={p.id} node={p} tone="cyan" />)}</div>
              </section>
            )}

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Activity size={11} /> Downstream Impact ({downstream.length})
              </h3>
              {downstream.length === 0
                ? <p className="text-[11px] text-zinc-500 italic">No dependent nodes.</p>
                : <div className="space-y-1.5">{downstream.map((p) => <DependencyRow key={p.id} node={p} />)}</div>}
            </section>

            {isGenDp && (
              <>
                <section>
                  <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-400/80 mb-2 flex items-center gap-1.5">
                    <CircuitBoard size={11} /> Switchgear Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {Object.entries(GEN_DP_TECH).map(([k, v]) => (
                      <div key={k} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-zinc-200 font-medium mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-400/80 mb-2 flex items-center gap-1.5">
                    <Layers size={11} /> Outgoing Feeders ({F1_GEN_DP_FEEDERS_02.length + F1_GEN_DP_FEEDERS_03.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Cab.</th>
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Slot</th>
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Circuit</th>
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...F1_GEN_DP_FEEDERS_02.map(f => ({...f, cab: '+02'})), ...F1_GEN_DP_FEEDERS_03.map(f => ({...f, cab: '+03'}))].map((f, i) => {
                          const clsCls = f.kind === 'out' ? 'text-emerald-300 bg-emerald-500/10' : f.kind === 'spare' ? 'text-amber-300 bg-amber-500/10' : 'text-zinc-500 bg-zinc-500/10';
                          return (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="py-1 px-1.5 font-mono text-zinc-500">{f.cab}</td>
                              <td className="py-1 px-1.5 font-mono text-zinc-400">{f.slot || '—'}</td>
                              <td className="py-1 px-1.5 text-zinc-200 font-medium">{f.label}</td>
                              <td className="py-1 px-1.5"><span className={`px-1 py-0.5 rounded text-[9px] font-bold ${clsCls}`}>{f.rating}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {isSyncPanel && (
              <>
                <section>
                  <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400/80 mb-2 flex items-center gap-1.5">
                    <CircuitBoard size={11} /> Switchgear Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {Object.entries(SYNC_PANEL_TECH).map(([k, v]) => (
                      <div key={k} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-zinc-200 font-medium mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400/80 mb-2 flex items-center gap-1.5">
                    <Layers size={11} /> Cubicle Layout ({SYNC_PANEL_CUBICLES.length} panels)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">#</th>
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Type</th>
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Rating</th>
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Connected to</th>
                          <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Busbar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SYNC_PANEL_CUBICLES.map((c) => {
                          const typeCls = c.type === 'INCOMER'
                            ? 'text-cyan-300 bg-cyan-500/10'
                            : c.type === 'COUPLER'
                            ? 'text-amber-300 bg-amber-500/10'
                            : 'text-emerald-300 bg-emerald-500/10';
                          return (
                            <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="py-1 px-1.5 font-mono text-zinc-400">{c.id}</td>
                              <td className="py-1 px-1.5">
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${typeCls}`}>{c.type}</span>
                              </td>
                              <td className="py-1 px-1.5 font-mono text-zinc-300">{c.rating}</td>
                              <td className="py-1 px-1.5 text-zinc-200 font-medium">{c.connected}</td>
                              <td className="py-1 px-1.5 text-zinc-500 font-mono">{c.busbar}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Wrench size={11} /> Troubleshooting
              </h3>
              <ol className="space-y-2 text-[12px] text-zinc-300">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 h-5 w-5 rounded bg-orange-500/15 text-orange-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </ScrollArea>

        {/* Right — elevation / single-line drawing */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center shrink-0">
            <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500">
              {isSyncPanel || isGenDp || isDpBusbar ? 'Front Elevation' : isDistPanel ? 'Cabinet Layout' : 'Cabinet Drawing'}
            </span>
            {isSyncPanel
              ? <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ml-auto">SIVACON S8 · P25-0001-P006</Badge>
              : isGenDp
              ? <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto">SIVACON S8 · P25-0001-P023</Badge>
              : isDpBusbar
              ? <Badge className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-auto">{dpBusbarData.feeders.length} feeders · Level 5m</Badge>
              : isDistPanel
              ? <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto">{node.properties?.num_cabinets ?? 1} cabinet{(node.properties?.num_cabinets ?? 1) !== 1 ? 's' : ''} · schematic</Badge>
              : <Badge variant="outline" className="text-[9px] border-white/10 text-zinc-600 ml-auto">placeholder</Badge>
            }
          </div>

          {isSyncPanel ? (
            <div className="flex-1 overflow-auto">
              <div className="p-5" style={{ minWidth: 'max-content' }}>
                <SyncPanelOneLine />
                <p className="text-[9px] text-zinc-600 mt-2 text-center font-mono">
                  Front elevation · DNT-GROUP P25-0001-P006 rev R2 · 23.07.2025
                </p>
              </div>
            </div>
          ) : isDpBusbar ? (
            <div className="flex-1 overflow-auto">
              <div className="p-5" style={{ minWidth: 'max-content' }}>
                <DistributionBusbarElevation data={dpBusbarData} />
                <p className="text-[9px] text-zinc-600 mt-2 text-center font-mono">
                  {dpBusbarData.source}
                </p>
              </div>
            </div>
          ) : isGenDp ? (
            <div className="flex-1 overflow-auto">
              <div className="p-5" style={{ minWidth: 'max-content' }}>
                <GenDpElevation />
                <p className="text-[9px] text-zinc-600 mt-2 text-center font-mono">
                  Front elevation · DNT-GROUP P25-0001-P023 rev M0 · 14.11.2025
                </p>
              </div>
            </div>
          ) : isDistPanel ? (
            <div className="flex-1 overflow-auto">
              <div className="p-4" style={{ minWidth: 'max-content' }}>
                <GenericCabinetElevation node={node} />
                <p className="text-[9px] text-zinc-600 mt-2 text-center font-mono">
                  Schematic layout · {node.id} · {node.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                  <Layers size={28} className="text-zinc-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">No drawing attached</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Cabinet schematics for <span className="font-mono text-zinc-500">{node.id}</span> will appear here once uploaded.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================================
export default function HomePage() {
  const { buildings, nodes, types, loading, error, refresh } = useNetworkTopology();
  const [refreshing, setRefreshing] = useState(false);
  const [faultedIds, setFaultedIds] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null); // null = All floors (default view)

  const [detailNode, setDetailNode] = useState(null);
  const handleSelect = useCallback((n) => {
    const _isGenDp    = n.id?.endsWith('-GEN-DP');
    const _isDpBusbar = !!DISTRIBUTION_PANEL_DATA[n.id]; // curated real-drawing panels (e.g. TR-DP1.3) — always detailed, regardless of cabinet count
    // Generic distribution_board/mcc/cabinet only gets the tiered front-elevation
    // view when it actually has 3+ cabinets to show; smaller ones go back to the
    // plain NodeDrawer sidebar (the old view) instead of the elevation drawing.
    const _isDist = ['distribution_board', 'mcc', 'cabinet'].includes(n.type) && (n.properties?.num_cabinets ?? 1) >= 3;
    if (_isGenDp || _isDpBusbar || _isDist) {
      setDetailNode(n);
    } else {
      setSelected(n);
    }
  }, []);

  // Placement tool state
  const [placeModeActive, setPlaceModeActive] = useState(false);
  const [showCables, setShowCables] = useState(true);
  const [placeTarget, setPlaceTarget] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [cursorCm, setCursorCm] = useState(null);

  // Zoom / pan state
  const containerRef = React.useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const dragMovedRef = React.useRef(false);
  // minZoom is updated dynamically to the fit-to-window zoom so the user
  // cannot zoom out beyond seeing the full plant layout.
  const minZoomRef = React.useRef(0.05);
  const MAX_ZOOM = 30;
  // Mirrors `zoom` synchronously so rapid-fire wheel/pinch events within the
  // same React batch each read the truly-latest value instead of the stale
  // closure — setZoom() alone isn't enough since consecutive calls in one
  // batch overwrite rather than compound, while setOffset's functional form
  // does compound, causing zoom/offset to drift apart and the view to jump.
  const zoomRef = React.useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

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
        floorMap.set(n.floor, { name: n.floor, level: n.floor_level, elevation: n.floor_elevation, count: 0 });
      }
      floorMap.get(n.floor).count += 1;
    }
    // Sort by real elevation, not the DB `level` int — that int is only
    // consistent within a single building, so mixing buildings with
    // different floor sets (e.g. BTR-01's "Level 14 m") breaks a level-based sort.
    return Array.from(floorMap.values()).sort((a, b) => a.elevation - b.elevation);
  }, [computed]);

  // Whether a site-wide plan backdrop is active (makes building fills
  // transparent so the plan shows through underneath the zones).
  const siteBackgroundActive = useMemo(
    () => hasSiteBackgroundFor(selectedFloor),
    [selectedFloor]
  );

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
    zoomRef.current = fz;
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
    const cur = zoomRef.current;
    const next = Math.max(minZoomRef.current, Math.min(MAX_ZOOM, cur * (1 + delta)));
    const k = next / cur;
    zoomRef.current = next;
    setOffset((o) => ({ x: mx - (mx - o.x) * k, y: my - (my - o.y) * k }));
    setZoom(next);
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragMovedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  const onMouseMove = useCallback((e) => {
    // Track cursor canvas position for placement mode
    if (placeModeActive) {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        setCursorCm({
          x: Math.round(((sx - offset.x) / zoom) * CM_PER_PX),
          y: Math.round(((sy - offset.y) / zoom) * CM_PER_PX),
          sx, sy,
        });
      }
    }
    if (!isDragging) return;
    dragMovedRef.current = true;
    setOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  }, [isDragging, placeModeActive, offset, zoom]);

  const stopDrag = useCallback((e) => {
    // If mouse didn't move, treat as click — record placement if armed
    if (!dragMovedRef.current && placeModeActive && placeTarget && cursorCm && e?.type === 'mouseup') {
      setPlacements((prev) => {
        const next = prev.filter((p) => p.code !== placeTarget.id);
        return [...next, {
          code: placeTarget.id,
          name: placeTarget.name,
          originalName: placeTarget.originalName,
          isNew: placeTarget.isNew || false,
          building_id: placeTarget.building_id,
          building_code: placeTarget.building_code,
          floor_name: placeTarget.floor_name,
          type_code: placeTarget.type_code,
          rotation: placeTarget.rotation ?? 0,
          x_cm: cursorCm.x,
          y_cm: cursorCm.y,
        }];
      });
    }
    setIsDragging(false);
  }, [placeModeActive, placeTarget, cursorCm]);

  const zoomBy = useCallback((factor) => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    const cur = zoomRef.current;
    const next = Math.max(minZoomRef.current, Math.min(MAX_ZOOM, cur * factor));
    const k = next / cur;
    zoomRef.current = next;
    setOffset((o) => ({ x: cw / 2 - (cw / 2 - o.x) * k, y: ch / 2 - (ch / 2 - o.y) * k }));
    setZoom(next);
  }, []);

  // ── Touch: 1-finger pan, 2-finger pinch-zoom (mobile) ──────────────────
  // touchRef persists across renders without retriggering effects — mirrors
  // dragStartRef's role for mouse panning, plus pinch-specific start state
  // captured once per gesture so zoom scales smoothly relative to gesture
  // start (not incrementally re-based every touchmove frame).
  const touchRef = React.useRef({ mode: null });

  const touchDist = (t0, t1) => Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  const touchMid = (t0, t1, rect) => ({
    x: (t0.clientX + t1.clientX) / 2 - rect.left,
    y: (t0.clientY + t1.clientY) / 2 - rect.top,
  });

  const onTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.touches.length === 1) {
      touchRef.current = { mode: 'pan' };
      dragMovedRef.current = false;
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
    } else if (e.touches.length === 2) {
      const rect = el.getBoundingClientRect();
      touchRef.current = {
        mode: 'pinch',
        startDist: touchDist(e.touches[0], e.touches[1]),
        startZoom: zoomRef.current,
        startOffset: offset,
        mid: touchMid(e.touches[0], e.touches[1], rect),
      };
      setIsDragging(false);
    }
  }, [offset]);

  const onTouchMove = useCallback((e) => {
    const t = touchRef.current;
    if (t.mode === 'pan' && e.touches.length === 1) {
      dragMovedRef.current = true;
      setOffset({ x: e.touches[0].clientX - dragStartRef.current.x, y: e.touches[0].clientY - dragStartRef.current.y });
    } else if (t.mode === 'pinch' && e.touches.length === 2) {
      const dist = touchDist(e.touches[0], e.touches[1]);
      const next = Math.max(minZoomRef.current, Math.min(MAX_ZOOM, t.startZoom * (dist / t.startDist)));
      const k = next / t.startZoom;
      zoomRef.current = next;
      setOffset({ x: t.mid.x - (t.mid.x - t.startOffset.x) * k, y: t.mid.y - (t.mid.y - t.startOffset.y) * k });
      setZoom(next);
    }
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      touchRef.current = { mode: null };
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      // Lifted one finger out of a pinch — resume as a plain pan from here.
      touchRef.current = { mode: 'pan' };
      dragMovedRef.current = false;
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
    }
  }, [offset]);

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
            onSelect={handleSelect}
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
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchEnd}
              className={`absolute inset-0 overflow-hidden bg-white ${placeModeActive ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ touchAction: 'none' }}
            >
              {/* ── Transformed canvas: buildings + floor plans only ── */}
              <div
                className="relative blueprint-grid industrial-noise origin-top-left"
                style={{
                  width: canvasDims.w,
                  height: canvasDims.h,
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  willChange: 'transform',
                }}
              >
                <SiteBackground selectedFloor={selectedFloor} />

                {buildings.map((b) => (
                  <BuildingZone
                    key={b.code}
                    building={b}
                    hasFault={buildingStatus[b.code]?.hasFault}
                    hasAffected={buildingStatus[b.code]?.hasAffected}
                    nodeCount={nodesByBuilding[b.code] || 0}
                    zoom={zoom}
                    selectedFloor={selectedFloor}
                    hasSiteBackground={siteBackgroundActive}
                  />
                ))}
              </div>

              {/* ── Cable connections layer ── */}
              {showCables && (() => {
                // Only draw cables between endpoints both physically present
                // on the selected floor — cross-floor runs are covered by
                // the ghost-marker layer instead. "All floors" shows everything.
                const nodeMap = new Map(visibleNodes.map(n => [n.id, n]));
                const pairs = [];
                const seen = new Set();
                for (const n of visibleNodes) {
                  for (const parentId of (n.dependsOn || [])) {
                    const parent = nodeMap.get(parentId);
                    if (!parent) continue;
                    const key = `${parentId}→${n.id}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    pairs.push({ src: parent, dst: n });
                  }
                }
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3, overflow: 'visible' }}>
                    <defs>
                      <marker id="ca-arr" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                        <path d="M1,1 L6,3.5 L1,6 Z" fill="rgba(148,163,184,0.75)" />
                      </marker>
                      <marker id="ca-arr-fault" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                        <path d="M1,1 L6,3.5 L1,6 Z" fill="rgba(239,68,68,0.85)" />
                      </marker>
                      <marker id="ca-arr-affected" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                        <path d="M1,1 L6,3.5 L1,6 Z" fill="rgba(245,158,11,0.85)" />
                      </marker>
                    </defs>
                    {pairs.map(({ src, dst }) => {
                      const x1 = src.coordinates.x * zoom + offset.x;
                      const y1 = src.coordinates.y * zoom + offset.y;
                      const x2 = dst.coordinates.x * zoom + offset.x;
                      const y2 = dst.coordinates.y * zoom + offset.y;
                      const mx = (x1 + x2) / 2;
                      const my = (y1 + y2) / 2;
                      const isFault    = src.status === 'fault'    || dst.status === 'fault';
                      const isAffected = src.status === 'affected' || dst.status === 'affected';
                      const stroke = isFault ? 'rgba(239,68,68,0.55)' : isAffected ? 'rgba(245,158,11,0.45)' : 'rgba(148,163,184,0.35)';
                      const sw     = isFault || isAffected ? 3.2 : 2.6;
                      const arrow  = isFault ? 'url(#ca-arr-fault)' : isAffected ? 'url(#ca-arr-affected)' : 'url(#ca-arr)';
                      return (
                        <polyline key={`cable-${src.id}-${dst.id}`}
                          points={`${x1},${y1} ${mx},${my} ${x2},${y2}`}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={sw}
                          markerMid={arrow}
                        />
                      );
                    })}
                  </svg>
                );
              })()}

              {/* ── Fault propagation lines ── */}
              {faultedIds.size > 0 && (() => {
                const nodeMap = new Map(nodes.map(n => [n.id, n]));
                const pairs = [];
                const seen = new Set();
                for (const n of nodes) {
                  if (n.status !== 'fault' && n.status !== 'affected') continue;
                  for (const pid of (n.dependsOn || [])) {
                    const p = nodeMap.get(pid);
                    if (!p || (p.status !== 'fault' && p.status !== 'affected')) continue;
                    const key = `${pid}→${n.id}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    pairs.push({ src: p, dst: n, isFault: p.status === 'fault' || n.status === 'fault' });
                  }
                }
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5, overflow: 'visible' }}>
                    <defs>
                      <filter id="fl-glow-red" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="fl-glow-amb" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {pairs.map(({ src, dst, isFault }) => {
                      const x1 = src.coordinates.x * zoom + offset.x;
                      const y1 = src.coordinates.y * zoom + offset.y;
                      const x2 = dst.coordinates.x * zoom + offset.x;
                      const y2 = dst.coordinates.y * zoom + offset.y;
                      const col  = isFault ? '#ef4444' : '#f59e0b';
                      const glow = isFault ? 'url(#fl-glow-red)' : 'url(#fl-glow-amb)';
                      const spd  = isFault ? '0.55s' : '1.1s';
                      return (
                        <g key={`${src.id}-${dst.id}`}>
                          {/* glow halo */}
                          <line x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={col} strokeWidth={6} opacity={0.18} filter={glow} />
                          {/* animated dash */}
                          <line x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={col} strokeWidth={1.5} opacity={0.85}
                                strokeDasharray="7 5"
                                style={{ animation: `fault-dash ${spd} linear infinite` }} />
                        </g>
                      );
                    })}
                    {/* One hop upstream from each root-injected fault, even though
                        that parent is healthy — shows what feeds the faulted item
                        (distinct calmer styling: no glow, no animation, since the
                        parent itself isn't affected, just providing context). */}
                    {(() => {
                      const upstreamPairs = [];
                      const upSeen = new Set();
                      for (const n of nodes) {
                        if (n.status !== 'fault') continue;
                        for (const pid of (n.dependsOn || [])) {
                          const p = nodeMap.get(pid);
                          if (!p || p.status === 'fault' || p.status === 'affected') continue; // already drawn above
                          const key = `${pid}→${n.id}`;
                          if (upSeen.has(key)) continue;
                          upSeen.add(key);
                          upstreamPairs.push({ src: p, dst: n });
                        }
                      }
                      return upstreamPairs.map(({ src, dst }) => {
                        const x1 = src.coordinates.x * zoom + offset.x;
                        const y1 = src.coordinates.y * zoom + offset.y;
                        const x2 = dst.coordinates.x * zoom + offset.x;
                        const y2 = dst.coordinates.y * zoom + offset.y;
                        return (
                          <line key={`up-${src.id}-${dst.id}`}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke="#94a3b8" strokeWidth={1.5} opacity={0.7}
                                strokeDasharray="4 4" />
                        );
                      });
                    })()}
                  </svg>
                );
              })()}

              {/* ── Ghost markers: fault/affected nodes on other floors ── */}
              {selectedFloor !== null && faultedIds.size > 0 && (() => {
                const ghosts = computed.filter(n =>
                  n.floor !== selectedFloor &&
                  (n.status === 'fault' || n.status === 'affected')
                );
                if (!ghosts.length) return null;
                return (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {ghosts.map(node => {
                      const sx = node.coordinates.x * zoom + offset.x;
                      const sy = node.coordinates.y * zoom + offset.y;
                      const isFault = node.status === 'fault';
                      const col = isFault ? '#ef4444' : '#f59e0b';
                      const floorShort = node.floor.replace('Level ', '').trim();
                      return (
                        <div
                          key={`ghost-${node.id}`}
                          className="absolute pointer-events-auto"
                          style={{ left: sx, top: sy, transform: 'translate(-50%,-50%)' }}
                          title={`${node.id} · ${node.floor} — click to switch floor`}
                          onClick={() => setSelectedFloor(node.floor)}
                        >
                          {/* floor badge above */}
                          <div style={{
                            position: 'absolute', bottom: '100%', left: '50%',
                            transform: 'translateX(-50%) translateY(-2px)',
                            background: '#09090b', border: `1px solid ${col}55`,
                            borderRadius: 3, padding: '0 5px', lineHeight: '14px',
                            fontSize: 8, fontFamily: 'monospace', color: col,
                            whiteSpace: 'nowrap', opacity: 0.85,
                          }}>
                            {floorShort}
                          </div>
                          {/* dashed ghost circle */}
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%',
                            border: `1.5px dashed ${col}`,
                            background: `${col}18`,
                            opacity: 0.55,
                          }} />
                          {/* node id below */}
                          <div style={{
                            position: 'absolute', top: '100%', left: '50%',
                            transform: 'translateX(-50%) translateY(2px)',
                            background: '#09090bcc', borderRadius: 3,
                            padding: '0 4px', lineHeight: '13px',
                            fontSize: 8, fontFamily: 'monospace',
                            color: '#71717a', whiteSpace: 'nowrap',
                          }}>
                            {node.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── Screen-space overlay: node markers ──────────────────────
                   Rendered outside the CSS transform so markers are rasterised
                   at their native pixel size — sharp at every zoom level.
                   pointer-events-none on the wrapper; each button re-enables. ── */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {visibleNodes.map((node) => (
                  <NodeMarker
                    key={node.id}
                    node={node}
                    onSelect={handleSelect}
                    isSelected={selected?.id === node.id}
                    zoom={zoom}
                    screenX={node.coordinates.x * zoom + offset.x}
                    screenY={node.coordinates.y * zoom + offset.y}
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
              <button
                onClick={() => { setPlaceModeActive((v) => !v); if (placeModeActive) { setPlaceTarget(null); setCursorCm(null); } }}
                className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${placeModeActive ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40' : 'hover:bg-white/5 text-zinc-400'}`}
                title="Toggle object placement mode"
              >
                <MapPin size={14} />
              </button>
              <div className="h-px bg-white/5 my-0.5" />
              <button
                onClick={() => setShowCables(v => !v)}
                className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${showCables ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35' : 'hover:bg-white/5 text-zinc-500'}`}
                title="Toggle cable connections"
              >
                <Share2 size={14} />
              </button>
              <div className="text-[9px] text-zinc-500 font-mono text-center pt-1 pb-0.5">
                {Math.round(zoom * 100)}%
              </div>
            </div>

            {/* Placement mode: cursor coordinate tooltip */}
            {placeModeActive && cursorCm && (
              <div
                className="absolute z-40 pointer-events-none"
                style={{ left: cursorCm.sx + 12, top: cursorCm.sy - 8 }}
              >
                <div className="bg-zinc-900/95 border border-orange-500/30 rounded px-2 py-1 text-[10px] font-mono text-orange-300 whitespace-nowrap shadow-lg">
                  {cursorCm.x}, {cursorCm.y} cm
                </div>
              </div>
            )}

            {/* Placer panel — shown when placement mode is active */}
            {placeModeActive && (
              <PlacerPanel
                nodes={nodes}
                buildings={buildings}
                objectTypes={types}
                placeTarget={placeTarget}
                onSetTarget={setPlaceTarget}
                placements={placements}
                onRemove={(code) => setPlacements((prev) => prev.filter((p) => p.code !== code))}
                onClear={() => setPlacements([])}
              />
            )}

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

        <AnimatePresence>
          {detailNode && (
            <ObjectDetailPanel
              node={computed.find((n) => n.id === detailNode.id) || detailNode}
              allNodes={computed}
              faultedIds={faultedIds}
              onClose={() => setDetailNode(null)}
              onSelect={handleSelect}
            />
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
