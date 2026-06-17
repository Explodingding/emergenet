// =====================================================================
// Building room / wall definitions
// =====================================================================
// Each room is a rectangle defined by relative coordinates (0-1) within
// the building's bounds.  These are used by BuildingZone to draw internal
// walls and room labels on the canvas.
//
//   x1, y1 = top-left corner  (0=left/top edge of building)
//   x2, y2 = bottom-right corner (1=right/bottom edge of building)
//
// All values are based on engineering drawings from the project.
// =====================================================================

// Subtle fill tints per room category
const TINTS = {
  mv:     'rgba(239,68,68,0.04)',     // red — MV / switchgear
  lv:     'rgba(239,68,68,0.03)',     // red — LV panels
  mech:   'rgba(59,130,246,0.03)',    // blue — mechanical / compressors
  util:   'rgba(16,185,129,0.03)',    // green — utilities / workshop
  ctrl:   'rgba(168,85,247,0.04)',    // purple — control rooms
  fire:   'rgba(249,115,22,0.04)',    // orange — fire / safety
  hvac:   'rgba(20,184,166,0.03)',    // teal — HVAC / fans
  furnace:'rgba(245,158,11,0.04)',    // amber — furnace / hot process
  batch:  'rgba(168,85,247,0.03)',    // purple — batch process
  cold:   'rgba(99,102,241,0.03)',    // indigo — cold end
  social: 'rgba(107,114,128,0.02)',   // grey — lockers / canteen
};

// ---------------------------------------------------------------------------
// Room definitions by building code
// All x1/y1/x2/y2 are 0-1 relative to building bounds
// ---------------------------------------------------------------------------
export const BUILDING_ROOMS = {

  // -------------------------------------------------------------------------
  // UTL-01  Utility Building  (8200 × 1300 cm  ≈  82 m × 13 m)
  // Long east-west strip with three main zones: Y1 (MV/LV), Y2 (UPS/Util), Y3 (Compressor)
  // -------------------------------------------------------------------------
  'UTL-01': [
    // ── Zone Y1: MV / LV side (west) ───────────────────────────────────
    { code: 'MVC',  label: 'MV Corridor',          x1: 0.00, y1: 0.00, x2: 0.26, y2: 0.32, fill: TINTS.mv },
    { code: 'LVR',  label: 'LV Room',              x1: 0.00, y1: 0.32, x2: 0.26, y2: 0.72, fill: TINTS.lv },
    { code: 'STR',  label: 'Safety TR Room',       x1: 0.00, y1: 0.72, x2: 0.14, y2: 1.00, fill: TINTS.mv },
    { code: 'CRR',  label: 'Corner Reserve',       x1: 0.14, y1: 0.72, x2: 0.26, y2: 1.00, fill: TINTS.util },

    // ── Zone Y2: UPS / utilities (centre) ──────────────────────────────
    { code: 'UPS',  label: 'UPS Room',             x1: 0.26, y1: 0.00, x2: 0.43, y2: 0.50, fill: TINTS.ctrl },
    { code: 'UTR',  label: 'Utilities Tech Room',  x1: 0.26, y1: 0.50, x2: 0.43, y2: 1.00, fill: TINTS.util },
    { code: 'UTW',  label: 'Utilities Workshop',   x1: 0.43, y1: 0.00, x2: 0.60, y2: 1.00, fill: TINTS.util },

    // ── Zone Y3: Compressor hall (east) ────────────────────────────────
    { code: 'CPH',  label: 'Compressor Hall',      x1: 0.60, y1: 0.00, x2: 0.84, y2: 1.00, fill: TINTS.mech },
    { code: 'CPR',  label: 'Compressor Panel Rm',  x1: 0.66, y1: 0.55, x2: 0.84, y2: 1.00, fill: TINTS.lv },
    { code: 'GSR',  label: 'Generator Sync Rm',    x1: 0.84, y1: 0.00, x2: 1.00, y2: 1.00, fill: TINTS.mech },
  ],

  // -------------------------------------------------------------------------
  // FRN-10  Furnace 10  (8200 × 4175 cm  ≈  82 m × 42 m)
  // Large footprint: chimney end (north), furnace (centre), cold end (south)
  // -------------------------------------------------------------------------
  'FRN-10': [
    // ── North strip: chimney / CFS ──────────────────────────────────────
    { code: 'CFS',  label: 'Chimney Filtration',   x1: 0.30, y1: 0.00, x2: 0.70, y2: 0.14, fill: TINTS.hvac },
    { code: 'FGS',  label: 'Furnace Gas Skid',     x1: 0.70, y1: 0.00, x2: 1.00, y2: 0.14, fill: TINTS.fire },

    // ── West wing: LV panels + control rooms ────────────────────────────
    { code: 'LCR',  label: 'Lathi Control Rm',     x1: 0.00, y1: 0.14, x2: 0.18, y2: 0.50, fill: TINTS.ctrl },
    { code: 'FPL',  label: 'Fan Panel Left',       x1: 0.00, y1: 0.65, x2: 0.18, y2: 0.82, fill: TINTS.lv },
    { code: 'FRL',  label: 'Fan Room Left',        x1: 0.00, y1: 0.82, x2: 0.22, y2: 1.00, fill: TINTS.hvac },

    // ── Level 5 west: BMR / BTR ──────────────────────────────────────────
    { code: 'BMR',  label: 'Botero Machine Rm',    x1: 0.02, y1: 0.20, x2: 0.25, y2: 0.40, fill: TINTS.ctrl },
    { code: 'BTR',  label: 'Botero Timing Rm',     x1: 0.02, y1: 0.14, x2: 0.22, y2: 0.22, fill: TINTS.ctrl },

    // ── Centre: Furnace body + forehearths ──────────────────────────────
    { code: 'FUR',  label: 'Furnace',              x1: 0.18, y1: 0.24, x2: 0.68, y2: 0.72, fill: TINTS.furnace },
    { code: 'FCR',  label: 'Fusion Pool Ctrl Rm',  x1: 0.32, y1: 0.60, x2: 0.52, y2: 0.76, fill: TINTS.ctrl },
    { code: 'FSS',  label: 'Fire Suppression',     x1: 0.34, y1: 0.72, x2: 0.52, y2: 0.84, fill: TINTS.fire },

    // ── Forehearths (Level 9) ────────────────────────────────────────────
    { code: 'FH1',  label: 'FH-1',                 x1: 0.05, y1: 0.00, x2: 0.22, y2: 0.14, fill: TINTS.furnace },
    { code: 'FH2',  label: 'FH-2',                 x1: 0.22, y1: 0.00, x2: 0.40, y2: 0.14, fill: TINTS.furnace },
    { code: 'FH3',  label: 'FH-3',                 x1: 0.40, y1: 0.00, x2: 0.58, y2: 0.14, fill: TINTS.furnace },
    { code: 'FH4',  label: 'FH-4',                 x1: 0.58, y1: 0.00, x2: 0.72, y2: 0.14, fill: TINTS.furnace },

    // ── East side panels ─────────────────────────────────────────────────
    { code: 'FPR',  label: 'Fan Panel Right',      x1: 0.68, y1: 0.65, x2: 0.86, y2: 0.82, fill: TINTS.lv },
    { code: 'VPR',  label: 'Vacuum Panel Rm',      x1: 0.68, y1: 0.52, x2: 0.86, y2: 0.65, fill: TINTS.lv },
    { code: 'VCC',  label: 'Vacuum Corner',        x1: 0.68, y1: 0.82, x2: 0.86, y2: 0.92, fill: TINTS.mech },
    { code: 'FRR',  label: 'Fan Room Right',       x1: 0.78, y1: 0.82, x2: 1.00, y2: 1.00, fill: TINTS.hvac },

    // ── Service corridor (Level 5 east) ──────────────────────────────────
    { code: 'UPS5', label: 'UPS (L5)',             x1: 0.42, y1: 0.14, x2: 0.60, y2: 0.26, fill: TINTS.ctrl },
    { code: 'CRA',  label: 'Cullet Return',        x1: 0.55, y1: 0.26, x2: 0.75, y2: 0.45, fill: TINTS.batch },

    // ── South: service rooms ─────────────────────────────────────────────
    { code: 'LTR',  label: 'Tech Rm Left',         x1: 0.00, y1: 0.56, x2: 0.18, y2: 0.66, fill: TINTS.util },
    { code: 'FLR',  label: 'Female Locker',        x1: 0.18, y1: 0.56, x2: 0.30, y2: 0.72, fill: TINTS.social },
    { code: 'MLR',  label: 'Male Locker',          x1: 0.30, y1: 0.56, x2: 0.42, y2: 0.72, fill: TINTS.social },
    { code: 'CNC',  label: 'Canteen',              x1: 0.42, y1: 0.56, x2: 0.58, y2: 0.72, fill: TINTS.social },
    { code: 'GPR',  label: 'Ground Panel Rm',      x1: 0.42, y1: 0.72, x2: 0.58, y2: 0.84, fill: TINTS.lv },
    { code: 'RTR',  label: 'Tech Rm Right',        x1: 0.76, y1: 0.56, x2: 0.94, y2: 0.66, fill: TINTS.util },

    // ── Cold end (south-east) ─────────────────────────────────────────────
    { code: 'COE',  label: 'Cold End',             x1: 0.76, y1: 0.38, x2: 1.00, y2: 0.56, fill: TINTS.cold },
    { code: 'PEL',  label: 'Pallet Elevator',      x1: 0.82, y1: 0.56, x2: 0.94, y2: 0.72, fill: TINTS.cold },
    { code: 'RPL',  label: 'Re-Paletizer',         x1: 0.68, y1: 0.72, x2: 0.82, y2: 0.84, fill: TINTS.cold },
    { code: 'SWP',  label: 'Shrink Wrap',          x1: 0.82, y1: 0.72, x2: 1.00, y2: 0.84, fill: TINTS.cold },
  ],

  // -------------------------------------------------------------------------
  // FRN-20  Furnace 20  (same footprint as FRN-10, mirrored)
  // -------------------------------------------------------------------------
  'FRN-20': [
    { code: 'CFS',  label: 'Chimney Filtration',   x1: 0.30, y1: 0.00, x2: 0.70, y2: 0.14, fill: TINTS.hvac },
    { code: 'FGS',  label: 'Furnace Gas Skid',     x1: 0.70, y1: 0.00, x2: 1.00, y2: 0.14, fill: TINTS.fire },
    { code: 'FUR',  label: 'Furnace',              x1: 0.18, y1: 0.24, x2: 0.68, y2: 0.72, fill: TINTS.furnace },
    { code: 'FCR',  label: 'Fusion Pool Ctrl Rm',  x1: 0.32, y1: 0.60, x2: 0.52, y2: 0.76, fill: TINTS.ctrl },
    { code: 'LCR',  label: 'Lathi Control Rm',     x1: 0.00, y1: 0.14, x2: 0.18, y2: 0.50, fill: TINTS.ctrl },
    { code: 'FH1',  label: 'FH-1',                 x1: 0.05, y1: 0.00, x2: 0.22, y2: 0.14, fill: TINTS.furnace },
    { code: 'FH2',  label: 'FH-2',                 x1: 0.22, y1: 0.00, x2: 0.40, y2: 0.14, fill: TINTS.furnace },
    { code: 'FH3',  label: 'FH-3',                 x1: 0.40, y1: 0.00, x2: 0.58, y2: 0.14, fill: TINTS.furnace },
    { code: 'FH4',  label: 'FH-4',                 x1: 0.58, y1: 0.00, x2: 0.72, y2: 0.14, fill: TINTS.furnace },
    { code: 'COE',  label: 'Cold End',             x1: 0.76, y1: 0.38, x2: 1.00, y2: 0.56, fill: TINTS.cold },
    { code: 'GPR',  label: 'Ground Panel Rm',      x1: 0.42, y1: 0.72, x2: 0.58, y2: 0.84, fill: TINTS.lv },
    { code: 'FPR',  label: 'Fan Panel Right',      x1: 0.68, y1: 0.65, x2: 0.86, y2: 0.82, fill: TINTS.lv },
    { code: 'FRL',  label: 'Fan Room Left',        x1: 0.00, y1: 0.82, x2: 0.22, y2: 1.00, fill: TINTS.hvac },
    { code: 'FRR',  label: 'Fan Room Right',       x1: 0.78, y1: 0.82, x2: 1.00, y2: 1.00, fill: TINTS.hvac },
  ],

  // -------------------------------------------------------------------------
  // BTH-03  Batch House  (4000 × 1200 cm  ≈  40 m × 12 m)
  // Multi-storey silo tower — 2D footprint shows control room + silo array
  // -------------------------------------------------------------------------
  'BTH-03': [
    { code: 'BFC',  label: 'Batch & Furnace Ctrl', x1: 0.35, y1: 0.10, x2: 0.65, y2: 0.50, fill: TINTS.ctrl },
    { code: 'CPC',  label: 'Control Panel Corner', x1: 0.65, y1: 0.05, x2: 0.85, y2: 0.45, fill: TINTS.lv },
    // Silo bays (simplified grid 3×2)
    { code: 'SL-A', label: 'Silos A',              x1: 0.00, y1: 0.00, x2: 0.35, y2: 0.50, fill: TINTS.batch },
    { code: 'SL-B', label: 'Silos B',              x1: 0.00, y1: 0.50, x2: 0.35, y2: 1.00, fill: TINTS.batch },
    { code: 'SL-C', label: 'Silos C',              x1: 0.35, y1: 0.50, x2: 0.65, y2: 1.00, fill: TINTS.batch },
    { code: 'SL-D', label: 'Silos D',              x1: 0.65, y1: 0.45, x2: 1.00, y2: 1.00, fill: TINTS.batch },
  ],

  // -------------------------------------------------------------------------
  // DST-01  Distribution Building  (1200 × 800 cm  ≈  12 m × 8 m)
  // -------------------------------------------------------------------------
  'DST-01': [
    { code: 'MV',   label: 'MV Room',              x1: 0.00, y1: 0.00, x2: 0.50, y2: 1.00, fill: TINTS.mv },
    { code: 'LV',   label: 'LV Room',              x1: 0.50, y1: 0.00, x2: 1.00, y2: 1.00, fill: TINTS.lv },
  ],
};
