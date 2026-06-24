// =====================================================================
// Site-wide floor-plan backgrounds
// =====================================================================
// A single unified site plan rendered behind everything on the canvas.
// Each floor (plus `default`, shown when no floor is selected) maps to one
// or more image placements. Coordinates are in CENTIMETRES (same space as
// buildings-layout.js); the renderer divides by CM_PER_PX to get pixels.
//
// Source: real CAD plans extracted from
// "Cinerglass Electrical Panel Locations.dwf" (1.38 GB DXF, streamed +
// rendered via scripts/cache-dxf-segments.py + crop-render.py). The drawing
// stores one stacked plan per level; site-level0 is the LEVEL 0.00 plan of
// the whole connected production complex (furnaces + utility + resorting).
//
// The building zones in buildings-layout.js are being re-aligned to sit on
// top of this plan, so SITE_PLAN_RECT is the single source of truth for the
// plan's position/size on the canvas — adjust here and the borders follow.
// =====================================================================

// Where the site plan sits on the canvas (cm). Plan content aspect ~2.026
// (the full "Model ALL" site plan rasterised from the PDF); height derived
// to avoid distortion.
export const SITE_PLAN_RECT = { x: 600, y: 600, w: 18800, h: 9280 };

const lvl = (src) => [{ src, ...SITE_PLAN_RECT }];

export const SITE_BACKGROUNDS = {
  // "All floors" / default view → full styled site plan from the PDF.
  // This is shown ONLY when no specific floor is selected.
  default: lvl('/floor-plans/site-all.png'),

  // Per-floor plans, shown when that floor is selected. Delivered
  // incrementally — uncomment / add as each floor's plan arrives:
  // 'Level 0 m':    lvl('/floor-plans/floor-level0.png'),   // ground floor, all buildings
  // 'Level 5 m':    lvl('/floor-plans/floor-level5.png'),   // 1st floor
  // 'Level 9 m':    lvl('/floor-plans/floor-level9.png'),
  // 'Level -3.8 m': lvl('/floor-plans/floor-level-3.8.png'),
};

// Returns [{ src, x, y, w, h }] (cm) for the current view, base path applied.
// - "All floors" (selectedFloor == null) → the `default` site overview.
// - A specific floor → that floor's plan if one exists, otherwise nothing
//   (so floors without a delivered plan show no backdrop rather than the
//   all-levels overview).
export function getSiteBackground(selectedFloor) {
  const layers =
    selectedFloor == null
      ? SITE_BACKGROUNDS.default || []
      : SITE_BACKGROUNDS[selectedFloor] || [];
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return layers.map((l) => ({ ...l, src: `${base}${l.src}` }));
}

// True when a site-wide plan backdrop is active for the given floor, so the
// building zone fills can be made transparent to let the plan show through.
export function hasSiteBackgroundFor(selectedFloor) {
  return getSiteBackground(selectedFloor).length > 0;
}
