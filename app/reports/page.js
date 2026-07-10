'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle, ShieldCheck, Clock, Wrench, Activity } from 'lucide-react';
import { useFaultReport } from '@/hooks/useFaultReport';
import { BUILDINGS_LAYOUT } from '@/lib/buildings-layout';

// recharts JSX types can't survive next/dynamic on their own import path,
// so the chart lives in its own file and *that* is what gets dynamically
// (client-only) imported -- see FaultTrendChart.js for the full note.
const FaultTrendChart = dynamic(() => import('./FaultTrendChart'), { ssr: false });

const buildingById = new Map(BUILDINGS_LAYOUT.map((b) => [b.id, b]));

const RANGE_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: 'all', label: 'All time', days: null },
];

function rangeToFrom(days) {
  if (days == null) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function ReportsPage() {
  const [presetKey, setPresetKey] = useState('7d');
  const preset = RANGE_PRESETS.find((p) => p.key === presetKey) || RANGE_PRESETS[1];
  const from = useMemo(() => rangeToFrom(preset.days), [preset.days]);

  const { events, loading, error } = useFaultReport({ from });

  const kpis = useMemo(() => {
    const cleared = events.filter((e) => e.ended_at);
    const acknowledged = events.filter((e) => e.acknowledged_at);
    const withReactionAndFix = events.filter((e) => e.acknowledged_at && e.ended_at);

    const mtta = average(acknowledged.map((e) => new Date(e.acknowledged_at) - new Date(e.started_at)));
    const mttr = average(cleared.map((e) => new Date(e.ended_at) - new Date(e.started_at)));
    const avgFixing = average(withReactionAndFix.map((e) => new Date(e.ended_at) - new Date(e.acknowledged_at)));
    const stillOpen = events.filter((e) => !e.ended_at).length;

    return {
      total: events.length,
      stillOpen,
      mtta,
      mttr,
      avgFixing,
      acknowledgedCount: acknowledged.length,
      clearedCount: cleared.length,
    };
  }, [events]);

  const trendData = useMemo(() => {
    const byDay = new Map();
    for (const e of events) {
      const day = new Date(e.started_at).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date: date.slice(5), count })); // MM-DD for axis labels
  }, [events]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="h-14 shrink-0 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 text-[12px] transition-colors">
          <ChevronLeft size={14} /> Back to map
        </Link>
        <div className="h-5 w-px bg-white/10" />
        <h1 className="text-[13px] font-bold tracking-[0.18em] uppercase text-zinc-100">Fault Reports</h1>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Date range presets */}
        <div className="flex gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPresetKey(p.key)}
              className={`h-8 px-3 rounded-md text-[12px] font-semibold transition-colors ${
                presetKey === p.key
                  ? 'bg-white/10 text-zinc-100'
                  : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={AlertTriangle} label="Total Faults" value={loading ? '—' : String(kpis.total)} accent="#f97316" />
          <KpiCard icon={Activity} label="Still Open" value={loading ? '—' : String(kpis.stillOpen)} accent="#ef4444" />
          <KpiCard
            icon={ShieldCheck}
            label="MTTA (reaction time)"
            value={loading ? '—' : formatDuration(kpis.mtta)}
            sub={loading ? '' : `${kpis.acknowledgedCount} acknowledged`}
            accent="#f59e0b"
          />
          <KpiCard
            icon={Wrench}
            label="Avg Fixing Time"
            value={loading ? '—' : formatDuration(kpis.avgFixing)}
            sub="ack → clear"
            accent="#06b6d4"
          />
          <KpiCard
            icon={Clock}
            label="MTTR (resolution time)"
            value={loading ? '—' : formatDuration(kpis.mttr)}
            sub={loading ? '' : `${kpis.clearedCount} cleared`}
            accent="#22c55e"
          />
        </div>

        {/* Trend chart */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-zinc-500 mb-3">Faults per day</h2>
          {trendData.length > 0 ? (
            <FaultTrendChart data={trendData} />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[12px] text-zinc-600">
              {loading ? 'Loading…' : 'No fault events in this range.'}
            </div>
          )}
        </div>

        {/* Detail table */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
          <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-zinc-500 px-4 pt-4 pb-2">
            Fault log ({events.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-2">Object</th>
                  <th className="text-left font-medium px-3 py-2">Building</th>
                  <th className="text-left font-medium px-3 py-2">State</th>
                  <th className="text-left font-medium px-3 py-2">Started</th>
                  <th className="text-left font-medium px-3 py-2">Reaction</th>
                  <th className="text-left font-medium px-3 py-2">Fixing</th>
                  <th className="text-left font-medium px-3 py-2">Total</th>
                  <th className="text-left font-medium px-3 py-2">Triggered by</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const building = buildingById.get(e.objects?.building_id);
                  const reaction = e.acknowledged_at ? new Date(e.acknowledged_at) - new Date(e.started_at) : null;
                  const fixing = e.acknowledged_at && e.ended_at ? new Date(e.ended_at) - new Date(e.acknowledged_at) : null;
                  const total = e.ended_at ? new Date(e.ended_at) - new Date(e.started_at) : null;
                  const stateCls =
                    e.state === 'real_alarm' ? 'text-red-400 bg-red-500/10 border-red-500/30'
                    : e.state === 'cleared' ? 'text-zinc-400 bg-white/[0.03] border-white/10'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                  return (
                    <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-1.5 font-mono text-zinc-300">{e.objects?.code || e.object_id}</td>
                      <td className="px-3 py-1.5 text-zinc-500">{building?.code || '—'}</td>
                      <td className="px-3 py-1.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${stateCls}`}>{e.state}</span>
                      </td>
                      <td className="px-3 py-1.5 text-zinc-400 font-mono text-[11px]">{new Date(e.started_at).toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-zinc-400">{reaction != null ? formatDuration(reaction) : '—'}</td>
                      <td className="px-3 py-1.5 text-zinc-400">{fixing != null ? formatDuration(fixing) : '—'}</td>
                      <td className="px-3 py-1.5 text-zinc-300 font-medium">{total != null ? formatDuration(total) : 'open'}</td>
                      <td className="px-3 py-1.5 text-zinc-500 truncate max-w-[160px]">{e.triggered_by || '—'}</td>
                    </tr>
                  );
                })}
                {!loading && events.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-zinc-600">No fault events in this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} style={{ color: accent }} />
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-zinc-100 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}
