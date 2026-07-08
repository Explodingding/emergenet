// =====================================================================
// Building room / wall definitions — per building, per floor
// =====================================================================
// Structure:  BUILDING_ROOMS[buildingCode][floorName] = [...rooms]
//
// floorName must match the `name` field from the `floors` table:
//   'Ground', 'Level 5', 'Level 9', 'Level 12', 'Level 17', etc.
//   Use 'default' as fallback (shown when no floor filter is active).
//
// Room rectangle: x1,y1  (top-left)  →  x2,y2  (bottom-right)
//   Values are RELATIVE (0.0–1.0) to the building bounds.
//
// All layouts are derived from SLD engineering drawings.
// =====================================================================

const T = {
  mv:      'rgba(239,68,68,0.05)',
  lv:      'rgba(239,68,68,0.03)',
  mech:    'rgba(59,130,246,0.04)',
  util:    'rgba(16,185,129,0.03)',
  ctrl:    'rgba(168,85,247,0.05)',
  fire:    'rgba(249,115,22,0.04)',
  hvac:    'rgba(20,184,166,0.03)',
  furnace: 'rgba(245,158,11,0.05)',
  batch:   'rgba(168,85,247,0.03)',
  cold:    'rgba(99,102,241,0.04)',
  social:  'rgba(107,114,128,0.02)',
  silo:    'rgba(120,113,108,0.04)',
};

export const BUILDING_ROOMS = {

  // =========================================================================
  // UTL-01  Utility Building  (8200 × 1300 cm  ≈  82 m × 13 m)
  // Long E-W strip.  Room positions traced from the ground-floor CAD plan.
  //
  // Major vertical walls (% of total width from plan image):
  //   ~10% — mid-split inside Y1 (two columns of LV rooms)
  //   ~19% — end of Y1 zone (electrical hall)
  //   ~39% — end of Y2 zone (UPS / UTR)
  //   ~57% — end of UTW (workshop)
  //   ~80% — end of CPH (compressor hall, start of GSR block)
  //
  // Horizontal splits inside Y1 (% of height):  ~28%, ~70%
  // Horizontal split inside Y2 (% of height):   ~45%
  // Horizontal split inside CPH (sub-room):      ~55%
  // Right block (80-100%): 5 equal-ish stacked rooms (~20% height each)
  // =========================================================================
  'UTL-01': {
    default: [
      // ── Zone Y1: MV / LV electrical hall (west, 0–19 %) ──────────────
      // Top band: MV corridor / cable tray level (full Y1 width)
      { code: 'MVC',  label: 'MV Corridor',           x1: 0.00, y1: 0.00, x2: 0.19, y2: 0.28, fill: T.mv   },
      // Middle band: LV switchgear — left column
      { code: 'LVR',  label: 'LV Room',               x1: 0.00, y1: 0.28, x2: 0.10, y2: 0.70, fill: T.lv   },
      // Middle band: LV switchgear — right column
      { code: 'LVR2', label: 'LV Room (ext)',          x1: 0.10, y1: 0.28, x2: 0.19, y2: 0.70, fill: T.lv   },
      // Bottom-left: Safety Transformer Room
      { code: 'STR',  label: 'Safety TR Room',         x1: 0.00, y1: 0.70, x2: 0.10, y2: 1.00, fill: T.mv   },
      // Bottom-right: Corner Reserve Room
      { code: 'CRR',  label: 'Corner Reserve',         x1: 0.10, y1: 0.70, x2: 0.19, y2: 1.00, fill: T.util },

      // ── Zone Y2: UPS + Utilities technical (19–39 %) ─────────────────
      { code: 'UPS',  label: 'UPS Room',               x1: 0.19, y1: 0.00, x2: 0.39, y2: 0.45, fill: T.ctrl },
      { code: 'UTR',  label: 'Utilities Tech Room',    x1: 0.19, y1: 0.45, x2: 0.39, y2: 1.00, fill: T.util },

      // ── Zone UTW: Utilities Workshop open hall (39–57 %) ─────────────
      { code: 'UTW',  label: 'Utilities Workshop',     x1: 0.39, y1: 0.00, x2: 0.57, y2: 1.00, fill: T.util },

      // ── Zone Y3: Compressor Hall (57–80 %) ───────────────────────────
      { code: 'CPH',  label: 'Compressor Hall',        x1: 0.57, y1: 0.00, x2: 0.80, y2: 1.00, fill: T.mech },
      // Sub-room inside CPH: panel/control corner in lower portion
      { code: 'CPR',  label: 'Compressor Panel Rm',    x1: 0.63, y1: 0.55, x2: 0.80, y2: 1.00, fill: T.lv   },

      // ── East block: GSR + ancillary rooms (80–100 %), 5 stacked bands ─
      { code: 'GSR',  label: 'Generator Sync Room',    x1: 0.80, y1: 0.00, x2: 1.00, y2: 0.20, fill: T.mech },
      { code: 'TR1',  label: 'Transformer Room 1',     x1: 0.80, y1: 0.20, x2: 1.00, y2: 0.40, fill: T.mv   },
      { code: 'TR2',  label: 'Transformer Room 2',     x1: 0.80, y1: 0.40, x2: 1.00, y2: 0.60, fill: T.mv   },
      { code: 'SRV',  label: 'Service Room',           x1: 0.80, y1: 0.60, x2: 1.00, y2: 0.80, fill: T.util },
      { code: 'STO',  label: 'Storage',                x1: 0.80, y1: 0.80, x2: 1.00, y2: 1.00, fill: T.util },
    ],
  },

  // =========================================================================
  // FRN-10  Furnace 10  (8200 × 4175 cm  ≈  82 m × 42 m)
  // =========================================================================
  'FRN-10': {
    // ── Ground floor (0 m) ──────────────────────────────────────────────────
    'Level 0 m': [
      // North strip: CFS / FGS (above forehearths)
      { code: 'CFS',  label: 'Chimney Filtration', x1: 0.30, y1: 0.00, x2: 0.70, y2: 0.14, fill: T.hvac    },
      { code: 'FGS',  label: 'Furnace Gas Skid',   x1: 0.70, y1: 0.00, x2: 1.00, y2: 0.14, fill: T.fire    },
      // Furnace body (centre mass)
      { code: 'FUR',  label: 'Furnace',            x1: 0.15, y1: 0.24, x2: 0.68, y2: 0.72, fill: T.furnace },
      { code: 'FCR',  label: 'Fusion Pool Ctrl',   x1: 0.34, y1: 0.60, x2: 0.52, y2: 0.74, fill: T.ctrl    },
      // West wing: control + fan rooms
      { code: 'LCR',  label: 'Lathi Control Rm',   x1: 0.00, y1: 0.14, x2: 0.18, y2: 0.50, fill: T.ctrl    },
      { code: 'FPL',  label: 'Fan Panel Left',     x1: 0.00, y1: 0.65, x2: 0.18, y2: 0.82, fill: T.lv      },
      { code: 'FRL',  label: 'Fan Room Left',      x1: 0.00, y1: 0.82, x2: 0.22, y2: 1.00, fill: T.hvac    },
      // East wing: panels + cold end
      { code: 'VPR',  label: 'Vacuum Panel Rm',    x1: 0.68, y1: 0.52, x2: 0.86, y2: 0.65, fill: T.lv      },
      { code: 'FPR',  label: 'Fan Panel Right',    x1: 0.68, y1: 0.65, x2: 0.86, y2: 0.82, fill: T.lv      },
      { code: 'VCC',  label: 'Vacuum Corner',      x1: 0.68, y1: 0.82, x2: 0.86, y2: 0.92, fill: T.mech    },
      { code: 'FRR',  label: 'Fan Room Right',     x1: 0.78, y1: 0.82, x2: 1.00, y2: 1.00, fill: T.hvac    },
      { code: 'COE',  label: 'Cold End',           x1: 0.78, y1: 0.38, x2: 1.00, y2: 0.55, fill: T.cold    },
      { code: 'GPR',  label: 'Ground Panel Rm',    x1: 0.42, y1: 0.72, x2: 0.58, y2: 0.84, fill: T.lv      },
      { code: 'FSS',  label: 'Fire Suppression',   x1: 0.34, y1: 0.74, x2: 0.52, y2: 0.84, fill: T.fire    },
      // South service corridor
      { code: 'LTR',  label: 'Tech Rm Left',       x1: 0.00, y1: 0.56, x2: 0.18, y2: 0.66, fill: T.util    },
      { code: 'FLR',  label: 'Female Locker',      x1: 0.18, y1: 0.56, x2: 0.30, y2: 0.72, fill: T.social  },
      { code: 'MLR',  label: 'Male Locker',        x1: 0.30, y1: 0.56, x2: 0.42, y2: 0.72, fill: T.social  },
      { code: 'CNC',  label: 'Canteen',            x1: 0.42, y1: 0.56, x2: 0.58, y2: 0.72, fill: T.social  },
      { code: 'RTR',  label: 'Tech Rm Right',      x1: 0.76, y1: 0.56, x2: 0.94, y2: 0.66, fill: T.util    },
      // Cold-end handling
      { code: 'PEL',  label: 'Pallet Elevator',    x1: 0.82, y1: 0.55, x2: 0.94, y2: 0.72, fill: T.cold    },
      { code: 'RPL',  label: 'Re-Paletizer',       x1: 0.68, y1: 0.72, x2: 0.82, y2: 0.84, fill: T.cold    },
      { code: 'SWP',  label: 'Shrink Wrap',        x1: 0.82, y1: 0.72, x2: 1.00, y2: 0.84, fill: T.cold    },
    ],

    // ── Level 5 (5.5 m) ─────────────────────────────────────────────────────
    'Level 5 m': [
      // West wing: Botero machine rooms
      { code: 'BMR',  label: 'Botero Machine Rm',  x1: 0.02, y1: 0.18, x2: 0.24, y2: 0.42, fill: T.ctrl    },
      { code: 'BTH',  label: 'Botero Timing Hall', x1: 0.02, y1: 0.10, x2: 0.18, y2: 0.18, fill: T.ctrl    },
      { code: 'BTR',  label: 'Botero Timing Rm',   x1: 0.18, y1: 0.10, x2: 0.30, y2: 0.18, fill: T.ctrl    },
      { code: 'RFL',  label: 'Rotary Filter Left', x1: 0.02, y1: 0.04, x2: 0.16, y2: 0.10, fill: T.mech    },
      { code: 'RFR',  label: 'Rotary Filter Right',x1: 0.16, y1: 0.04, x2: 0.30, y2: 0.10, fill: T.mech    },
      // Centre: UPS + cullet return
      { code: 'UPS',  label: 'UPS Room',           x1: 0.40, y1: 0.04, x2: 0.58, y2: 0.22, fill: T.ctrl    },
      { code: 'CRA',  label: 'Cullet Return',      x1: 0.58, y1: 0.04, x2: 0.76, y2: 0.30, fill: T.batch   },
      // Furnace crown level overview
      { code: 'FUR',  label: 'Furnace Crown',      x1: 0.15, y1: 0.26, x2: 0.70, y2: 0.76, fill: T.furnace },
    ],

    // ── Level 9 (9.0 m) — forehearths ───────────────────────────────────────
    'Level 9 m': [
      { code: 'FH1',  label: 'Foreheart 1',        x1: 0.04, y1: 0.02, x2: 0.22, y2: 0.18, fill: T.furnace },
      { code: 'FH2',  label: 'Foreheart 2',        x1: 0.22, y1: 0.02, x2: 0.42, y2: 0.18, fill: T.furnace },
      { code: 'FH3',  label: 'Foreheart 3',        x1: 0.42, y1: 0.02, x2: 0.60, y2: 0.18, fill: T.furnace },
      { code: 'FH4',  label: 'Foreheart 4',        x1: 0.60, y1: 0.02, x2: 0.78, y2: 0.18, fill: T.furnace },
      { code: 'FUR',  label: 'Furnace Crown',      x1: 0.15, y1: 0.18, x2: 0.80, y2: 0.70, fill: T.furnace },
      { code: 'FRF',  label: 'Fan Room Furnace',   x1: 0.40, y1: 0.70, x2: 0.60, y2: 0.90, fill: T.hvac    },
    ],
  },

  // =========================================================================
  // FRN-20  Furnace 20  (same footprint as FRN-10, mirrored east-west)
  // =========================================================================
  'FRN-20': {
    'Level 0 m': [
      { code: 'CFS',  label: 'Chimney Filtration', x1: 0.30, y1: 0.00, x2: 0.70, y2: 0.14, fill: T.hvac    },
      { code: 'FGS',  label: 'Furnace Gas Skid',   x1: 0.70, y1: 0.00, x2: 1.00, y2: 0.14, fill: T.fire    },
      { code: 'FUR',  label: 'Furnace',            x1: 0.15, y1: 0.24, x2: 0.68, y2: 0.72, fill: T.furnace },
      { code: 'FCR',  label: 'Fusion Pool Ctrl',   x1: 0.34, y1: 0.60, x2: 0.52, y2: 0.74, fill: T.ctrl    },
      { code: 'LCR',  label: 'Lathi Control Rm',   x1: 0.00, y1: 0.14, x2: 0.18, y2: 0.50, fill: T.ctrl    },
      { code: 'FPL',  label: 'Fan Panel Left',     x1: 0.00, y1: 0.65, x2: 0.18, y2: 0.82, fill: T.lv      },
      { code: 'FRL',  label: 'Fan Room Left',      x1: 0.00, y1: 0.82, x2: 0.22, y2: 1.00, fill: T.hvac    },
      { code: 'FPR',  label: 'Fan Panel Right',    x1: 0.68, y1: 0.65, x2: 0.86, y2: 0.82, fill: T.lv      },
      { code: 'FRR',  label: 'Fan Room Right',     x1: 0.78, y1: 0.82, x2: 1.00, y2: 1.00, fill: T.hvac    },
      { code: 'COE',  label: 'Cold End',           x1: 0.78, y1: 0.38, x2: 1.00, y2: 0.55, fill: T.cold    },
      { code: 'GPR',  label: 'Ground Panel Rm',    x1: 0.42, y1: 0.72, x2: 0.58, y2: 0.84, fill: T.lv      },
      { code: 'VPR',  label: 'Vacuum Panel Rm',    x1: 0.68, y1: 0.52, x2: 0.86, y2: 0.65, fill: T.lv      },
      { code: 'FSS',  label: 'Fire Suppression',   x1: 0.34, y1: 0.74, x2: 0.52, y2: 0.84, fill: T.fire    },
    ],
    'Level 5 m': [
      { code: 'BMR',  label: 'Botero Machine Rm',  x1: 0.02, y1: 0.18, x2: 0.24, y2: 0.42, fill: T.ctrl    },
      { code: 'BTR',  label: 'Botero Timing Rm',   x1: 0.02, y1: 0.10, x2: 0.28, y2: 0.18, fill: T.ctrl    },
      { code: 'RFL',  label: 'Rotary Filter Left', x1: 0.02, y1: 0.04, x2: 0.16, y2: 0.10, fill: T.mech    },
      { code: 'RFR',  label: 'Rotary Filter Right',x1: 0.16, y1: 0.04, x2: 0.30, y2: 0.10, fill: T.mech    },
      { code: 'CRA',  label: 'Cullet Return',      x1: 0.58, y1: 0.04, x2: 0.76, y2: 0.30, fill: T.batch   },
      { code: 'FUR',  label: 'Furnace Crown',      x1: 0.15, y1: 0.26, x2: 0.70, y2: 0.76, fill: T.furnace },
    ],
    'Level 9 m': [
      { code: 'FH1',  label: 'Foreheart 1',        x1: 0.04, y1: 0.02, x2: 0.22, y2: 0.18, fill: T.furnace },
      { code: 'FH2',  label: 'Foreheart 2',        x1: 0.22, y1: 0.02, x2: 0.42, y2: 0.18, fill: T.furnace },
      { code: 'FH3',  label: 'Foreheart 3',        x1: 0.42, y1: 0.02, x2: 0.60, y2: 0.18, fill: T.furnace },
      { code: 'FH4',  label: 'Foreheart 4',        x1: 0.60, y1: 0.02, x2: 0.78, y2: 0.18, fill: T.furnace },
      { code: 'FUR',  label: 'Furnace Crown',      x1: 0.15, y1: 0.18, x2: 0.80, y2: 0.70, fill: T.furnace },
    ],
  },

  // =========================================================================
  // BTH-03  Batch House  (4000 × 1200 cm  ≈  40 m × 12 m)
  // Multi-storey silo tower viewed as a 2D footprint.
  // =========================================================================
  'BTH-03': {
    // Ground floor: silo bases + conveyor hall
    'Level 0 m': [
      { code: 'SL-W',  label: 'West Silos',         x1: 0.00, y1: 0.00, x2: 0.30, y2: 1.00, fill: T.silo  },
      { code: 'MIX',   label: 'Mixer Hall',          x1: 0.30, y1: 0.00, x2: 0.62, y2: 1.00, fill: T.batch },
      { code: 'SL-E',  label: 'East Silos',          x1: 0.62, y1: 0.00, x2: 1.00, y2: 1.00, fill: T.silo  },
    ],
    // Level 5 m: silo mid-section + dosing equipment
    'Level 5 m': [
      { code: 'DOS',   label: 'Dosing Level',        x1: 0.00, y1: 0.00, x2: 0.62, y2: 1.00, fill: T.batch },
      { code: 'CNV',   label: 'Conveyor Hall',       x1: 0.62, y1: 0.00, x2: 1.00, y2: 1.00, fill: T.batch },
    ],
    // Level 12 m: control room + upper silo heads
    'Level 12 m': [
      { code: 'CPC',   label: 'Control Panel Corner',x1: 0.62, y1: 0.00, x2: 0.88, y2: 0.55, fill: T.ctrl  },
      { code: 'SH-W',  label: 'Silo Heads West',     x1: 0.00, y1: 0.00, x2: 0.30, y2: 1.00, fill: T.silo  },
      { code: 'SH-E',  label: 'Silo Heads East',     x1: 0.30, y1: 0.00, x2: 0.62, y2: 1.00, fill: T.silo  },
    ],
    // Upper silo levels: open silo space
    'Level 22 m': [
      { code: 'SILO',  label: 'Silo Array',          x1: 0.00, y1: 0.00, x2: 1.00, y2: 1.00, fill: T.silo  },
    ],
    'Level 27 m': [
      { code: 'SILO',  label: 'Silo Array',          x1: 0.00, y1: 0.00, x2: 1.00, y2: 1.00, fill: T.silo  },
    ],
    'Level 32 m': [
      { code: 'SILO',  label: 'Silo Array',          x1: 0.00, y1: 0.00, x2: 1.00, y2: 1.00, fill: T.silo  },
    ],
  },

  // =========================================================================
  // DST-01  Distribution Building  (1200 × 800 cm)
  // =========================================================================
  'DST-01': {
    default: [
      { code: 'MV',  label: 'MV Room',  x1: 0.00, y1: 0.00, x2: 0.50, y2: 1.00, fill: T.mv },
      { code: 'LV',  label: 'LV Room',  x1: 0.50, y1: 0.00, x2: 1.00, y2: 1.00, fill: T.lv },
    ],
  },
};

// ---------------------------------------------------------------------------
// Floor plan overlay images (served from /public/floor-plans/)
// These are used to show a semi-transparent reference image on the building
// so room wall positions can be visually calibrated.
// ---------------------------------------------------------------------------
export const FLOOR_PLAN_OVERLAYS = {
  'UTL-01': {
    'Level 0 m': '/floor-plans/utl-01-ground.svg',
    default:     '/floor-plans/utl-01-ground.svg',
  },
  'FRN-10': {
    'Level 0 m': '/floor-plans/frn-10-ground.svg',
    default:     '/floor-plans/frn-10-ground.svg',
  },
  'BTH-03': {
    'Level 0 m':    '/floor-plans/bth-03-ground.svg',
    'Level -3.8 m': '/floor-plans/bth-03-neg3.8.svg',
    default:        '/floor-plans/bth-03-ground.svg',
  },
};

// ---------------------------------------------------------------------------
// Wall bounding box within a floor-plan SVG's own coordinate space (viewBox
// units, NOT cm). When set for a building+floor, the overlay is scaled so
// THIS box — not the full image — fits the building's map bounds exactly.
// Anything outside the box (stairs, canopies, side rooms) overflows past the
// building's border instead of being squeezed inside it.
// naturalW/H must match the source SVG's own viewBox width/height.
//
// `uniform: true` keeps the image's true aspect ratio (scale driven by the
// box height only); width follows the same factor so a long strip like a
// basement corridor overflows sideways rather than being stretched to fit.
// Use this to left-anchor a plan and let corridors run out past the building.
// ---------------------------------------------------------------------------
export const FLOOR_PLAN_WALL_BBOX = {
  'BTH-03': {
    'Level 0 m': { x: 0, y: 56, w: 735, h: 222, naturalW: 810.495, naturalH: 363.975 },
    // -3.8 m: vertical underground sand-transport galleries. They run
    // perpendicular to BH, attach to the bucket elevators at BH's LEFT end,
    // and stick out top & bottom toward the truck unloading points.
    // "free" placement: image width = a fraction of the building width,
    // left-anchored, vertically centered so the galleries overflow past
    // BH's top and bottom edges. Tune widthFracOfBuilding to taste.
    'Level -3.8 m': {
      free: true,
      naturalW: 94.575, naturalH: 743.895,
      widthFracOfBuilding: 0.155,  // gallery bundle ≈ left 15.5% of BH width
      anchorX: 'left',
      centerY: true,
    },
  },
};

export function getFloorPlanWallBBox(buildingCode, selectedFloor) {
  const bldg = FLOOR_PLAN_WALL_BBOX[buildingCode];
  if (!bldg) return null;
  return (selectedFloor && bldg[selectedFloor]) ? bldg[selectedFloor] : (bldg.default || null);
}

export function getFloorPlan(buildingCode, selectedFloor) {
  const bldg = FLOOR_PLAN_OVERLAYS[buildingCode];
  if (!bldg) return null;
  const path = (selectedFloor && bldg[selectedFloor]) ? bldg[selectedFloor] : (bldg.default || null);
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${base}${path}`;
}

// ---------------------------------------------------------------------------
// Helper: get rooms for a building + floor combination
// Falls back: specific floor → 'default' → empty list
// ---------------------------------------------------------------------------
export function getRooms(buildingCode, selectedFloor) {
  const bldg = BUILDING_ROOMS[buildingCode];
  if (!bldg) return [];
  if (selectedFloor && bldg[selectedFloor]) return bldg[selectedFloor];
  if (bldg.default) return bldg.default;
  // If no default but some floors exist, pick the floor with lowest key order
  const keys = Object.keys(bldg);
  return keys.length > 0 ? bldg[keys[0]] : [];
}
