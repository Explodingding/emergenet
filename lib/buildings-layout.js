// =====================================================================
// Hard-coded plant layout (single source of truth for buildings)
// =====================================================================
// Buildings change very rarely; objects/dependencies change often. We
// therefore stop querying Supabase for the `buildings` table and use
// this static configuration directly. UUIDs are kept here to preserve
// FK joins for objects.building_id -> code resolution.
//
// All distances in CENTIMETRES. Rendered scale is set by CM_PER_PX in
// hooks/useNetworkTopology.js (currently 15 cm/px).
// =====================================================================

export const BUILDINGS_LAYOUT = [
  {
    id: 'cb415f24-8508-45a3-be65-bf9239afeb81',
    code: 'FRN-20',
    name: 'Furnace 20',
    description: 'Glass furnace 20 — melting + working ends',
    bounds_x: 9300,
    bounds_y: 200,
    bounds_w: 8200,
    bounds_h: 4175,
    accent_color: '#f59e0b',
    display_order: 1,
  },
  {
    id: 'c92216bb-c77b-4f2b-8167-8f3817901d80',
    code: 'UTL-01',
    name: 'Utility Building',
    description: 'Main MV/LV step-down, transformers, MCCs and service utilities',
    bounds_x: 9300,
    bounds_y: 4375,
    bounds_w: 8200,
    bounds_h: 1300,
    accent_color: '#ef4444',
    display_order: 2,
  },
  {
    id: '96656dcd-b6b6-40b5-8205-82d5b88d4a56',
    code: 'FRN-10',
    name: 'Furnace 10',
    description: 'Glass furnace 10 — melting + working ends',
    bounds_x: 9300,
    bounds_y: 5675,
    bounds_w: 8200,
    bounds_h: 4175,
    accent_color: '#3b82f6',
    display_order: 3,
  },
  {
    id: '030a3a88-b6e0-4429-8567-9b85767c7949',
    code: 'RST-01',
    name: 'Resorting Line',
    description: 'Glass resorting / sorting and quality inspection line',
    bounds_x: 17600,
    bounds_y: 200,
    bounds_w: 1800,
    bounds_h: 9650,
    accent_color: '#10b981',
    display_order: 4,
  },
  {
    id: '2de1ab67-96b7-4641-a8e9-ed296418ccae',
    code: 'BTH-03',
    name: 'Batch House',
    description: 'Stand-alone batch house: raw material storage, weighing, silo feeders',
    bounds_x: 300,
    bounds_y: 4425,
    bounds_w: 4000,
    bounds_h: 1200,
    accent_color: '#a855f7',
    display_order: 5,
  },
];
