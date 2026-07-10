// =====================================================================
// useFaultReport — fetches fault_events within a date range (server-side
// filtered), joined to the object's code/name/building_id, for the
// supervisor Reports dashboard. Separate from useFaultHistory (which is
// capped at 500 rows, newest-first, for the map sidebar's browse view) --
// reports need an accurate range, not just "recent".
// =====================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFaultReport({ from, to } = {}) {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from('fault_events')
      .select('*, objects(code, name, building_id)')
      .order('started_at', { ascending: false })
      .limit(5000);
    if (from) q = q.gte('started_at', from);
    if (to) q = q.lte('started_at', to);
    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setEvents(data || []);
    setLoading(false);
  }, [supabase, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}
