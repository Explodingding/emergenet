// =====================================================================
// useNetworkTopology — loads buildings/floors/object_types/objects/
// dependencies/object_floors/fault_events from Supabase and reshapes
// them into the format the dashboard UI expects.
//
// Scale convention:
//   DB stores positions in CENTIMETRES.
//   UI canvas works in PIXELS at CM_PER_PX (default = 10).
// =====================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BUILDINGS_LAYOUT } from '@/lib/buildings-layout';
import { parseLocationCode, ZONE_X, ROOM_ANCHORS } from '@/lib/room-anchors';

export const CM_PER_PX = 15;

function extractRating(p) {
  if (!p) return null;
  if (p.rating_kva) return `${p.rating_kva} kVA`;
  if (p.rating_amps) return `${p.rating_amps} A`;
  if (p.rating_kw) return `${p.rating_kw} kW`;
  return null;
}
function extractVoltage(p) {
  if (!p) return null;
  if (p.primary_kv && p.secondary_v) return `${p.primary_kv} kV / ${p.secondary_v} V`;
  if (p.primary_v && p.secondary_v) return `${p.primary_v} V / ${p.secondary_v} V`;
  if (p.voltage_v) return `${p.voltage_v} V`;
  return null;
}

// ---------------------------------------------------------------------------
// Compute canvas coordinates (cm) for an object using location_code →
// room anchors.  Falls back to stored coord_x / coord_y when unresolved.
// ---------------------------------------------------------------------------
function resolveCoordsCm(o, building) {
  // Already positioned (non-zero)
  if (o.coord_x !== 0 || o.coord_y !== 0) return { x: o.coord_x, y: o.coord_y };
  if (!building) return { x: o.coord_x, y: o.coord_y };

  const locationCode = o.properties?.location_code;
  if (!locationCode) return { x: o.coord_x, y: o.coord_y };

  const { zone, room } = parseLocationCode(locationCode);

  const bx = building.bounds_x;
  const by = building.bounds_y;
  const bw = building.bounds_w;
  const bh = building.bounds_h;
  const MARGIN = Math.min(bw, bh) * 0.06;

  // Anchor X from zone first, then room
  const zoneMap = ZONE_X[building.code] || {};
  let relX = 0.5;
  if (zone && zoneMap[zone] !== undefined) {
    relX = zoneMap[zone];
  } else if (room && ROOM_ANCHORS[room]) {
    relX = ROOM_ANCHORS[room].rel_x;
  }

  // Anchor Y from room
  let relY = 0.5;
  if (room && ROOM_ANCHORS[room]) {
    relY = ROOM_ANCHORS[room].rel_y;
  }

  const x = Math.round(bx + MARGIN + relX * (bw - MARGIN * 2));
  const y = Math.round(by + MARGIN + relY * (bh - MARGIN * 2));

  return { x, y };
}

function reshape({ floors, object_types, objects, dependencies }) {
  const buildings = BUILDINGS_LAYOUT;
  const typeById = new Map(object_types.map((t) => [t.id, t]));
  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const floorById = new Map(floors.map((f) => [f.id, f]));
  const objectById = new Map(objects.map((o) => [o.id, o]));

  // Group objects by (building_id, floor_id, location_code) so we can
  // spread them within a room rather than stacking at the same point.
  const groupKey = (o) => `${o.building_id}|${o.primary_floor_id}|${o.properties?.location_code || ''}`;
  const groups = new Map();
  for (const o of objects) {
    const k = groupKey(o);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o.id);
  }

  // Buildings -> UI
  const uiBuildings = [...buildings]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((b) => ({
      id: b.code,
      code: b.code,
      name: b.name,
      description: b.description,
      bounds: {
        x: b.bounds_x / CM_PER_PX,
        y: b.bounds_y / CM_PER_PX,
        w: b.bounds_w / CM_PER_PX,
        h: b.bounds_h / CM_PER_PX,
      },
      accent: b.accent_color,
    }));

  // dependsOn map: only 'feeds' relation propagates power-loss
  const dependsOnMap = new Map(); // code -> [parent codes]
  // controls / monitors / backup_for collected separately for the drawer
  const controlsMap = new Map();   // controller code -> [target codes]
  const controlledByMap = new Map(); // target code -> [controller codes]
  const monitorsMap = new Map();
  const backupForMap = new Map();  // backup source -> [target codes]
  const backedUpByMap = new Map(); // target -> [backup source codes]

  for (const d of dependencies) {
    if (d.is_active === false) continue;
    const src = objectById.get(d.source_id);
    const tgt = objectById.get(d.target_id);
    if (!src || !tgt) continue;
    if (d.relation === 'feeds') {
      if (!dependsOnMap.has(tgt.code)) dependsOnMap.set(tgt.code, []);
      dependsOnMap.get(tgt.code).push(src.code);
    } else if (d.relation === 'controls') {
      if (!controlsMap.has(src.code)) controlsMap.set(src.code, []);
      controlsMap.get(src.code).push(tgt.code);
      if (!controlledByMap.has(tgt.code)) controlledByMap.set(tgt.code, []);
      controlledByMap.get(tgt.code).push(src.code);
    } else if (d.relation === 'monitors') {
      if (!monitorsMap.has(src.code)) monitorsMap.set(src.code, []);
      monitorsMap.get(src.code).push(tgt.code);
    } else if (d.relation === 'backup_for') {
      if (!backupForMap.has(src.code)) backupForMap.set(src.code, []);
      backupForMap.get(src.code).push(tgt.code);
      if (!backedUpByMap.has(tgt.code)) backedUpByMap.set(tgt.code, []);
      backedUpByMap.get(tgt.code).push(src.code);
    }
  }

  // Objects -> UI nodes
  const uiNodes = objects
    .filter((o) => o.is_active !== false)
    .map((o) => {
      const t = typeById.get(o.type_id);
      const b = buildingById.get(o.building_id);
      const fl = floorById.get(o.primary_floor_id);

      // Spread objects within the same room/group so they don't overlap
      const k = groupKey(o);
      const group = groups.get(k) || [o.id];
      const indexInGroup = group.indexOf(o.id);
      const groupSize = group.length;

      // Resolve coordinates: use room anchors for unpositioned objects (0,0)
      const { x: cx, y: cy } = resolveCoordsCm(o, b);
      // Apply spread within the room cell (120 cm grid spacing)
      const SPREAD = 120;
      const cols = Math.max(1, Math.ceil(Math.sqrt(groupSize)));
      const col = indexInGroup % cols;
      const row = Math.floor(indexInGroup / cols);
      const spreadX = (col - (cols - 1) / 2) * SPREAD;
      const spreadY = (row - (Math.ceil(groupSize / cols) - 1) / 2) * SPREAD;

      // Final coordinates — clamp inside building bounds
      let finalX = cx + spreadX;
      let finalY = cy + spreadY;
      if (b) {
        const margin = 50;
        finalX = Math.max(b.bounds_x + margin, Math.min(b.bounds_x + b.bounds_w - margin, finalX));
        finalY = Math.max(b.bounds_y + margin, Math.min(b.bounds_y + b.bounds_h - margin, finalY));
      }

      return {
        id: o.code,
        uuid: o.id,
        name: o.name,
        type: t?.code || 'cabinet',
        type_label: t?.label || 'Component',
        type_icon: t?.icon || 'Box',
        type_category: t?.category || 'control',
        building: b?.code || null,
        building_name: b?.name || '',
        floor: fl?.name || 'Ground',
        floor_level: fl?.level ?? 0,
        coordinates: { x: finalX / CM_PER_PX, y: finalY / CM_PER_PX },
        coord_cm: { x: finalX, y: finalY },
        location_code: o.properties?.location_code || null,
        rotation: o.rotation ?? 0,
        status: 'operational',
        dependsOn: dependsOnMap.get(o.code) || [],
        controlsTargets: controlsMap.get(o.code) || [],
        controlledBy: controlledByMap.get(o.code) || [],
        monitors: monitorsMap.get(o.code) || [],
        backupFor: backupForMap.get(o.code) || [],
        backedUpBy: backedUpByMap.get(o.code) || [],
        rating: extractRating(o.properties),
        voltage: extractVoltage(o.properties),
        installed: o.properties?.installed || null,
        properties: o.properties || {},
      };
    });

  // Category -> human label (for legend / quick filters)
  const categories = Array.from(new Set(object_types.map((t) => t.category)));

  return { buildings: uiBuildings, nodes: uiNodes, types: object_types, categories };
}

export function useNetworkTopology() {
  const supabase = useMemo(() => createClient(), []);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [f, t, o, d] = await Promise.all([
      supabase.from('floors').select('*').limit(500),
      supabase.from('object_types').select('*').limit(500),
      supabase.from('objects').select('*').limit(10000),
      supabase.from('dependencies').select('*').limit(50000),
    ]);
    const first = [f, t, o, d].find((r) => r.error);
    if (first?.error) {
      setError(first.error.message);
      setLoading(false);
      return;
    }
    setRaw({
      floors: f.data || [],
      object_types: t.data || [],
      objects: o.data || [],
      dependencies: d.data || [],
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const shaped = useMemo(() => (raw ? reshape(raw) : null), [raw]);

  return {
    loading,
    error,
    buildings: shaped?.buildings || [],
    nodes: shaped?.nodes || [],
    types: shaped?.types || [],
    categories: shaped?.categories || [],
    refresh: load,
  };
}
