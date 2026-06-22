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
import { parseLocationCode, ZONE_X, ROOM_ANCHORS, CODE_ZONE_MAP } from '@/lib/room-anchors';

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
// Match an object code against CODE_ZONE_MAP for a given building.
// Returns { zone, room } or null.
// ---------------------------------------------------------------------------
function matchCodeZone(objectCode, buildingCode) {
  if (!objectCode || !buildingCode) return null;
  const entries = CODE_ZONE_MAP[buildingCode];
  if (!entries) return null;
  const match = entries.find(e => objectCode.startsWith(e.prefix));
  return match ? { zone: match.zone, room: match.room } : null;
}

// ---------------------------------------------------------------------------
// Compute canvas coordinates (cm) for an object using location_code →
// room anchors, then code-prefix fallback.
// Falls back to stored coord_x / coord_y when nothing resolves.
// ---------------------------------------------------------------------------
function resolveCoordsCm(o, building) {
  // Already positioned (non-zero)
  if (o.coord_x !== 0 || o.coord_y !== 0) return { x: o.coord_x, y: o.coord_y };
  if (!building) return { x: o.coord_x, y: o.coord_y };

  const locationCode = o.properties?.location_code;

  const bx = building.bounds_x;
  const by = building.bounds_y;
  const bw = building.bounds_w;
  const bh = building.bounds_h;
  const MARGIN = Math.min(bw, bh) * 0.06;
  const zoneMap = ZONE_X[building.code] || {};

  let relX = 0.5;
  let relY = 0.5;

  if (locationCode) {
    const { zone, room } = parseLocationCode(locationCode);
    if (zone && zoneMap[zone] !== undefined) relX = zoneMap[zone];
    else if (room && ROOM_ANCHORS[room]) relX = ROOM_ANCHORS[room].rel_x;
    if (room && ROOM_ANCHORS[room]) relY = ROOM_ANCHORS[room].rel_y;
  } else {
    // No location code — try code-prefix zone fallback
    const auto = matchCodeZone(o.code, building.code);
    if (!auto) return { x: o.coord_x, y: o.coord_y };
    if (auto.zone && zoneMap[auto.zone] !== undefined) relX = zoneMap[auto.zone];
    if (auto.room && ROOM_ANCHORS[auto.room]) relY = ROOM_ANCHORS[auto.room].rel_y;
  }

  return {
    x: Math.round(bx + MARGIN + relX * (bw - MARGIN * 2)),
    y: Math.round(by + MARGIN + relY * (bh - MARGIN * 2)),
  };
}

function reshape({ floors, object_types, objects, dependencies }) {
  const buildings = BUILDINGS_LAYOUT;
  const typeById = new Map(object_types.map((t) => [t.id, t]));
  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const floorById = new Map(floors.map((f) => [f.id, f]));
  const objectById = new Map(objects.map((o) => [o.id, o]));

  // Group objects by (building_id, floor_id, zone-key) so we can
  // spread them within a room rather than stacking at the same point.
  // When no location_code, derive zone from code prefix so each zone
  // gets its own spread group rather than all defaulting to center.
  const groupKey = (o) => {
    const locCode = o.properties?.location_code;
    if (locCode) return `${o.building_id}|${o.primary_floor_id}|${locCode}`;
    const building = buildingById.get(o.building_id);
    const auto = building ? matchCodeZone(o.code, building.code) : null;
    const zoneKey = auto ? `AUTO-${auto.zone}-${auto.room}` : '_default';
    return `${o.building_id}|${o.primary_floor_id}|${zoneKey}`;
  };
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
      floors: b.floors,
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
        floor: fl?.name || 'Level 0 m',
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

// Fetches all rows from a Supabase table by paginating in batches of PAGE_SIZE,
// bypassing the server-side max_rows = 1000 PostgREST limit.
async function fetchAll(query, pageSize = 1000) {
  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return { data: all, error: null };
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
      fetchAll(supabase.from('floors').select('*')),
      fetchAll(supabase.from('object_types').select('*')),
      fetchAll(supabase.from('objects').select('*')),
      fetchAll(supabase.from('dependencies').select('*')),
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
