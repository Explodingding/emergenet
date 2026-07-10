// =====================================================================
// useFaultHistory — loads the full fault_events log (open + cleared),
// joined to the object's code/name via PostgREST's FK embedding, for the
// Fault History panel. Separate from useNetworkTopology, which only
// fetches *open* fault_events (to seed live faultedIds).
// =====================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFaultHistory() {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('fault_events')
      .select('*, objects(code, name)')
      .order('started_at', { ascending: false })
      .limit(500);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setEvents(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}
