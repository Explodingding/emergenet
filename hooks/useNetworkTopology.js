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

export const CM_PER_PX = 10;

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

function reshape({ buildings, floors, object_types, objects, dependencies }) {
  const typeById = new Map(object_types.map((t) => [t.id, t]));
  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const floorById = new Map(floors.map((f) => [f.id, f]));
  const objectById = new Map(objects.map((o) => [o.id, o]));

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
        coordinates: { x: o.coord_x / CM_PER_PX, y: o.coord_y / CM_PER_PX },
        coord_cm: { x: o.coord_x, y: o.coord_y },
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
    const [b, f, t, o, d] = await Promise.all([
      supabase.from('buildings').select('*'),
      supabase.from('floors').select('*'),
      supabase.from('object_types').select('*'),
      supabase.from('objects').select('*'),
      supabase.from('dependencies').select('*'),
    ]);
    const first = [b, f, t, o, d].find((r) => r.error);
    if (first?.error) {
      setError(first.error.message);
      setLoading(false);
      return;
    }
    setRaw({
      buildings: b.data || [],
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
