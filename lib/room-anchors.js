// =====================================================================
// Room / Zone anchors — spatial layout within each building
// =====================================================================
// All coordinates are RELATIVE to the building's own bounds:
//   rel_x = 0.0 = left edge,  rel_x = 1.0 = right edge
//   rel_y = 0.0 = top  edge,  rel_y = 1.0 = bottom edge
//
// Location code format from SLD:  BLDG-ZONE-ELEVATION-ROOM
//   e.g.  UTB-Y1-5.5-LVR,  F10-A1-0.0-FPR,  BAH-12.0-CPC
//
// Zone (Y1/Y2/Y3 in UTL-01, A1/A2/A3/A4 in FRN buildings) controls
// the X band.  Room code controls the Y offset within the band.
// The hook uses the coarser zone when room is unknown.
// =====================================================================

// ---------------------------------------------------------------------------
// Zone X-bands  (per building)
// ---------------------------------------------------------------------------
export const ZONE_X = {
  // UTL-01 — Utility Building  (long E-W strip, 8200 cm wide)
  // Y1 = MV switchgear hall (center-left, ~25% from edge)
  // Y2 = Utilities / UPS / technical room (center, ~53%)
  // Y3 = Compressor hall (right side, ~82%)
  'UTL-01': { Y1: 0.25, Y2: 0.53, Y3: 0.82 },

  // FRN-10 / FRN-20 — Furnace Buildings  (8200 cm wide)
  'FRN-10': { A1: 0.10, A2: 0.37, A3: 0.62, A4: 0.85 },
  'FRN-20': { A1: 0.10, A2: 0.37, A3: 0.62, A4: 0.85 },

  // BTH-03 — Batch House  (4000 cm wide)
  'BTH-03': { Z1: 0.25, Z2: 0.50, Z3: 0.75 },

  // DST-01 — Distribution Building  (single MV room row, left→right)
  'DST-01': { Z1: 0.50 },
};

// ---------------------------------------------------------------------------
// Room anchors  (relative x, y within the building)
// ---------------------------------------------------------------------------
// Rooms are listed once and reused for all buildings that have them.
// Where a room appears in different zones in different buildings the zone_x
// above takes priority for x — the room anchor's rel_x is used as a
// refinement when zone is not known.
// ---------------------------------------------------------------------------
export const ROOM_ANCHORS = {
  // ── Utility Building rooms ────────────────────────────────────────
  LVR:  { rel_x: 0.10, rel_y: 0.50, label: 'Low Voltage Room' },        // Y1
  STR:  { rel_x: 0.15, rel_y: 0.70, label: 'Safety Transformer Room' }, // Y1
  MVC:  { rel_x: 0.10, rel_y: 0.30, label: 'MV Corridor' },             // Y1
  CRR:  { rel_x: 0.08, rel_y: 0.85, label: 'Corner Reserve Room' },     // Y1
  UPS:  { rel_x: 0.40, rel_y: 0.38, label: 'UPS Room' },                // Y2
  UTR:  { rel_x: 0.43, rel_y: 0.55, label: 'Utilities Technical Room' },// Y2
  UTW:  { rel_x: 0.58, rel_y: 0.50, label: 'Utilities Workshop' },      // Y2-Y3
  CPH:  { rel_x: 0.63, rel_y: 0.50, label: 'Compressor Hall' },         // Y2-Y3
  CPR:  { rel_x: 0.72, rel_y: 0.60, label: 'Compressor Panel Room' },   // Y3
  GSR:  { rel_x: 0.85, rel_y: 0.50, label: 'Generator Sync Room' },     // Y3

  // ── Furnace building rooms (ground floor) ────────────────────────
  FPR:  { rel_x: 0.20, rel_y: 0.82, label: 'Fan Panel Room Right' },    // A1
  FPL:  { rel_x: 0.10, rel_y: 0.82, label: 'Fan Panel Room Left' },     // A1
  VPR:  { rel_x: 0.28, rel_y: 0.82, label: 'Vacuum Panel Room' },       // A1
  VCC:  { rel_x: 0.30, rel_y: 0.90, label: 'Vacuum Corner' },           // A1
  FRL:  { rel_x: 0.15, rel_y: 0.92, label: 'Fan Room Left' },           // A1
  FRR:  { rel_x: 0.38, rel_y: 0.92, label: 'Fan Room Right' },          // A1-A2
  FUR:  { rel_x: 0.47, rel_y: 0.50, label: 'Furnace' },                 // center
  FCR:  { rel_x: 0.44, rel_y: 0.55, label: 'Fusion Pool Control Room' },
  CFS:  { rel_x: 0.50, rel_y: 0.08, label: 'Chimney Filtration System' },
  FGS:  { rel_x: 0.55, rel_y: 0.08, label: 'Furnace Gas Skid' },
  GPR:  { rel_x: 0.50, rel_y: 0.80, label: 'Ground Level Panel Room' },
  CRV:  { rel_x: 0.65, rel_y: 0.50, label: 'Cullet Return Area' },      // A3
  CRA:  { rel_x: 0.65, rel_y: 0.50, label: 'Cullet Return Area' },
  COE:  { rel_x: 0.80, rel_y: 0.50, label: 'Cold End' },
  PEL:  { rel_x: 0.78, rel_y: 0.60, label: 'Pallet Elevator' },
  RPL:  { rel_x: 0.72, rel_y: 0.70, label: 'Re-Paletizer' },
  SWP:  { rel_x: 0.82, rel_y: 0.70, label: 'Shrinking Wrap Pallet' },
  LCR:  { rel_x: 0.10, rel_y: 0.60, label: 'Lathi Control Room' },
  FSS:  { rel_x: 0.45, rel_y: 0.75, label: 'Fire Suppression System Room' },

  // ── Furnace building rooms (Level 5, 5.5 m) ─────────────────────
  BMR:  { rel_x: 0.18, rel_y: 0.30, label: 'Botero Machine Room' },     // A1, Level5
  BTH:  { rel_x: 0.24, rel_y: 0.25, label: 'Botero Timing Hallway' },   // A1, Level5
  BTR:  { rel_x: 0.29, rel_y: 0.25, label: 'Botero Timing Room' },      // A1, Level5
  RFR:  { rel_x: 0.38, rel_y: 0.22, label: 'Right Rotary Filter Room' },// A1, Level5
  RFL:  { rel_x: 0.20, rel_y: 0.22, label: 'Left Rotary Filter Room' }, // A1, Level5
  CRA5: { rel_x: 0.65, rel_y: 0.40, label: 'Cullet Return Area (L5)' }, // A2, Level5

  // ── Furnace building rooms (Level 9, 9.0 m) ─────────────────────
  FH1:  { rel_x: 0.12, rel_y: 0.18, label: 'Foreheart 1' },             // A1, Level9
  FH2:  { rel_x: 0.32, rel_y: 0.18, label: 'Foreheart 2' },             // A2, Level9
  FH3:  { rel_x: 0.52, rel_y: 0.18, label: 'Foreheart 3' },             // A3, Level9
  FH4:  { rel_x: 0.72, rel_y: 0.18, label: 'Foreheart 4' },             // A4, Level9
  FRF:  { rel_x: 0.50, rel_y: 0.50, label: 'Fan Room Furnace' },

  // ── Furnace building — service corridor rooms ────────────────────
  FLR:  { rel_x: 0.30, rel_y: 0.68, label: 'Female Locker Room' },      // A2
  MLR:  { rel_x: 0.38, rel_y: 0.68, label: 'Male Locker Room' },        // A2
  CNC:  { rel_x: 0.52, rel_y: 0.68, label: 'Canteen Corridor' },        // A2
  HSE:  { rel_x: 0.48, rel_y: 0.62, label: 'HSE Office Corridor' },
  MTR:  { rel_x: 0.50, rel_y: 0.72, label: 'Monosection Training Room' },
  LTR:  { rel_x: 0.16, rel_y: 0.62, label: 'Technical Room Left' },
  RTR:  { rel_x: 0.82, rel_y: 0.62, label: 'Technical Room Right' },

  // ── Batch House rooms ────────────────────────────────────────────
  BFC:  { rel_x: 0.50, rel_y: 0.30, label: 'Batch & Furnace Control Room' },
  CPC:  { rel_x: 0.78, rel_y: 0.20, label: 'Control Panel Corner' },

  // ── Distribution Building — single MV row ────────────────────────
  DST:  { rel_x: 0.50, rel_y: 0.50, label: 'Distribution Building' },
};

// ---------------------------------------------------------------------------
// Code-prefix → zone fallback  (used when no location_code is assigned)
// Entries are matched in order — first prefix match wins.
// ---------------------------------------------------------------------------
export const CODE_ZONE_MAP = {
  'UTL-01': [
    // Turbo / boost compressor MV panels — right side
    { prefix: 'MV-TCOMP',   zone: 'Y3', room: 'CPH' },
    { prefix: 'MV-BOOST',   zone: 'Y3', room: 'CPH' },
    // General MV switchgear (HZ01 bus, supplies, feeders, spares) — left side
    { prefix: 'MV-',        zone: 'Y1', room: 'MVC' },
    // Transformers, LV distribution — left side
    { prefix: 'TR-',        zone: 'Y1', room: 'LVR' },
    // Compressors and dryers — right side
    { prefix: 'UT-COMP',    zone: 'Y3', room: 'CPH' },
    { prefix: 'UT-DRY',     zone: 'Y3', room: 'CPH' },
    // Utilities / UPS / technical — middle
    { prefix: 'UTL-',       zone: 'Y2', room: 'UTR' },
    { prefix: 'UT-LP',      zone: 'Y2', room: 'UTR' },
    { prefix: 'UT-UPS',     zone: 'Y2', room: 'UPS' },
  ],
  'FRN-10': [
    { prefix: 'F1-MDP',     zone: 'A1', room: 'FPR' },
    { prefix: 'FHDP',       zone: 'A1', room: 'FUR' },
    { prefix: 'SPDB',       zone: 'A1', room: 'FUR' },
    { prefix: 'FH10',       zone: 'A1', room: 'FUR' },
  ],
  'FRN-20': [
    { prefix: 'F2-MDP',     zone: 'A1', room: 'FPR' },
    { prefix: 'FHDP-2',     zone: 'A1', room: 'FUR' },
  ],
};

// ---------------------------------------------------------------------------
// Parse a location code  →  { building_hint, zone, room }
// Format:  BLDG-ZONE-ELEVATION-ROOM   or   BLDG-ELEVATION-ROOM
// ---------------------------------------------------------------------------
export function parseLocationCode(code) {
  if (!code) return {};
  const parts = code.split('-');
  if (parts.length === 4) {
    // e.g. UTB-Y1-5.5-LVR  /  F10-A1-0.0-FPR
    return { zone: parts[1], room: parts[3] };
  }
  if (parts.length === 3) {
    // e.g. BAH-12.0-CPC  /  F10-0.0-CFS
    // middle part is elevation (numeric) or zone (alpha)
    const isElevation = /^\d/.test(parts[1]);
    return isElevation ? { room: parts[2] } : { zone: parts[1], room: parts[2] };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Area anchors — direct area-name → position lookup for Batch House /
// Cullet Tower / Batch Transport objects sourced from
// BH_equipment_locations_merged.csv. Unlike ROOM_ANCHORS (used when only
// a code-prefix guess is available), these come from an exact area
// assigned to each object tag, so no prefix guessing is needed — the
// CSV's `subtitle_location` string is the lookup key.
// ---------------------------------------------------------------------------
export const AREA_ANCHORS = {
  'BATCH HOUSE +8.190...+9.965':            { building: 'BTH-03', floor: 'Level 9 m',   rel_x: 0.50, rel_y: 0.50 },
  'BATCH HOUSE CULLET RETURN':              { building: 'BTH-03', floor: 'Level 0 m',   rel_x: 0.65, rel_y: 0.50 },
  'BATCH HOUSE +5.135':                     { building: 'BTH-03', floor: 'Level 5 m',   rel_x: 0.25, rel_y: 0.50 },
  'BATCH HOUSE -3.850':                     { building: 'BTH-03', floor: 'Level -3.8 m',rel_x: 0.50, rel_y: 0.50 },
  'BATCH HOUSE +0.000, +2.135':             { building: 'BTH-03', floor: 'Level 0 m',   rel_x: 0.75, rel_y: 0.50 },
  'BATCH HOUSE +17.460':                    { building: 'BTH-03', floor: 'Level 22 m',  rel_x: 0.25, rel_y: 0.50 },
  'BATCH HOUSE +32.460...+42.125':          { building: 'BTH-03', floor: 'Level 32 m',  rel_x: 0.50, rel_y: 0.50 },
  'BATCH HOUSE +22.760':                    { building: 'BTH-03', floor: 'Level 22 m',  rel_x: 0.75, rel_y: 0.50 },
  'BATCH HOUSE +10.435, +12.435':           { building: 'BTH-03', floor: 'Level 12 m',  rel_x: 0.50, rel_y: 0.50 },

  'CULLET TOWER +0.000':                    { building: 'CT-10',  floor: 'Level 0 m',   rel_x: 0.50, rel_y: 0.50 },
  'CULLET TOWER -5.000':                    { building: 'CT-10',  floor: 'Level -5 m',  rel_x: 0.50, rel_y: 0.50 },
  'CULLET TOWER +26.300 / +29.000':         { building: 'CT-10',  floor: 'Level 27 m',  rel_x: 0.50, rel_y: 0.50 },
  'CULLET TOWER +26.300':                   { building: 'CT-10',  floor: 'Level 27 m',  rel_x: 0.35, rel_y: 0.50 },
  'CULLET TOWER +22.700':                   { building: 'CT-10',  floor: 'Level 22 m',  rel_x: 0.50, rel_y: 0.50 },
  'CULLET TOWER +18.800':                   { building: 'CT-10',  floor: 'Level 18 m',  rel_x: 0.50, rel_y: 0.50 },
  'CULLET TOWER +4.720':                    { building: 'CT-10',  floor: 'Level 5 m',   rel_x: 0.50, rel_y: 0.50 },
  'CULLET TOWER +32.380':                   { building: 'CT-10',  floor: 'Level 32 m',  rel_x: 0.50, rel_y: 0.50 },
  'CULLET TOWER -3.500':                    { building: 'CT-10',  floor: 'Level -3.8 m',rel_x: 0.50, rel_y: 0.50 },

  // BTR-01's box is a narrow horizontal strip from Batch House's right
  // edge to Utility Building's left edge — rel_x runs 0 (Batch House
  // side) to 1 (Utility Building side); rel_y stays centered.
  'BATCH TRANSPORT START':                  { building: 'BTR-01', floor: 'Level 0 m',   rel_x: 0.10, rel_y: 0.50 },
  'BATCH TRANSPORT START +0.000':           { building: 'BTR-01', floor: 'Level 0 m',   rel_x: 0.10, rel_y: 0.50 },
  'BATCH TRANSPORT START +20.730 / +18.370':{ building: 'BTR-01', floor: 'Level 18 m',  rel_x: 0.35, rel_y: 0.50 },
  'BATCH TRANSPORT END +13.680':            { building: 'BTR-01', floor: 'Level 14 m',  rel_x: 0.55, rel_y: 0.50 },
  'BATCH TRANSPORT END +18.374':            { building: 'BTR-01', floor: 'Level 18 m',  rel_x: 0.75, rel_y: 0.50 },
  'BATCH TRANSPORT END +21.341':            { building: 'BTR-01', floor: 'Level 21 m',  rel_x: 0.90, rel_y: 0.50 },
};

// ---------------------------------------------------------------------------
// Resolve pixel coordinates for an object given its building, floor, and
// optional zone / room codes.
//
// Returns  { x, y }  in CENTIMETRES (to match DB convention), or null if
// the building bounds are not found.
// ---------------------------------------------------------------------------
export function resolveCoordinates(building, floor, locationCode, indexInGroup, groupSize) {
  if (!building) return null;

  const { zone, room } = parseLocationCode(locationCode);

  const bw = building.bounds_w;
  const bh = building.bounds_h;
  const bx = building.bounds_x;
  const by = building.bounds_y;

  const MARGIN = Math.min(bw, bh) * 0.05;      // 5% edge buffer
  const usableW = bw - MARGIN * 2;
  const usableH = bh - MARGIN * 2;

  // --- Determine anchor X from zone ----------------------------------------
  const zoneMap = ZONE_X[building.code] || {};
  let anchorX = 0.5; // default: center
  if (zone && zoneMap[zone] !== undefined) {
    anchorX = zoneMap[zone];
  } else if (room && ROOM_ANCHORS[room]) {
    anchorX = ROOM_ANCHORS[room].rel_x;
  }

  // --- Determine anchor Y from room ----------------------------------------
  let anchorY = 0.5;
  if (room && ROOM_ANCHORS[room]) {
    anchorY = ROOM_ANCHORS[room].rel_y;
  }

  // --- Spread objects within a 120×120 cm cell around the anchor -----------
  const SPREAD = 120; // cm
  const cols = Math.ceil(Math.sqrt(groupSize));
  const col = indexInGroup % cols;
  const row = Math.floor(indexInGroup / cols);
  const offsetX = (col - (cols - 1) / 2) * SPREAD;
  const offsetY = (row - Math.floor(groupSize / cols) / 2) * SPREAD;

  const x = bx + MARGIN + anchorX * usableW + offsetX;
  const y = by + MARGIN + anchorY * usableH + offsetY;

  // Clamp inside building
  return {
    x: Math.round(Math.max(bx + MARGIN, Math.min(bx + bw - MARGIN, x))),
    y: Math.round(Math.max(by + MARGIN, Math.min(by + bh - MARGIN, y))),
  };
}
