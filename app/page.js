'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Zap,
  Activity,
  Power,
  Cpu,
  Box,
  Factory,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Search,
  CircuitBoard,
  Gauge,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  X,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BUILDINGS, INITIAL_NODES } from '@/lib/network-data';
import { computeNetworkStatus, downstreamOf, TYPE_LABEL } from '@/lib/network-utils';

const TYPE_ICON = {
  transformer: Zap,
  switchgear: CircuitBoard,
  distribution: Cpu,
  cabinet: Box,
};

// =====================================================================
// Node marker — physical component on the top-down map
// =====================================================================
function NodeMarker({ node, onSelect, isSelected }) {
  const Icon = TYPE_ICON[node.type] || Box;
  const isFault = node.status === 'fault';
  const isAffected = node.status === 'affected';

  // Sizing per type — transformers larger, cabinets smaller
  const size =
    node.type === 'transformer' ? 64 : node.type === 'switchgear' ? 58 : node.type === 'distribution' ? 50 : 44;

  const baseRing = isFault
    ? 'ring-red-500'
    : isAffected
    ? 'ring-amber-500/70'
    : 'ring-emerald-500/40';

  const baseBg = isFault
    ? 'bg-red-950/80'
    : isAffected
    ? 'bg-amber-950/60'
    : 'bg-zinc-900/80';

  const iconColor = isFault
    ? 'text-red-400'
    : isAffected
    ? 'text-amber-400'
    : 'text-emerald-400';

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(node)}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: isAffected ? 0.92 : 1, scale: 1 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`group absolute -translate-x-1/2 -translate-y-1/2 ${baseBg} ${baseRing} ring-2 rounded-xl backdrop-blur-sm border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col items-center justify-center gap-1 select-none transition-colors`}
      style={{
        left: node.coordinates.x,
        top: node.coordinates.y,
        width: size,
        height: size,
      }}
    >
      {/* Aggressive red pulse for actual fault root cause */}
      {isFault && (
        <>
          <motion.span
            className="absolute inset-0 rounded-xl bg-red-500/20"
            animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.18, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="absolute inset-0 rounded-xl shadow-[0_0_40px_8px_rgba(239,68,68,0.55)]"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="absolute -inset-3 rounded-2xl border-2 border-red-500/60"
            animate={{ scale: [1, 1.4, 1.8], opacity: [0.8, 0.3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        </>
      )}

      {/* Ambient amber glow for affected nodes */}
      {isAffected && (
        <motion.span
          className="absolute inset-0 rounded-xl shadow-[0_0_22px_2px_rgba(245,158,11,0.35)]"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <Icon className={`relative z-10 ${iconColor}`} size={node.type === 'cabinet' ? 18 : 22} />
      <span className="relative z-10 text-[9px] font-semibold text-zinc-300 leading-none tracking-wide">
        {node.id}
      </span>

      {/* Status indicator dot */}
      <span
        className={`absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full border border-zinc-950 ${
          isFault ? 'bg-red-500' : isAffected ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />

      {/* Hover label */}
      <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-zinc-300 bg-zinc-950/90 border border-white/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {node.name}
      </span>

      {isSelected && (
        <span className="absolute -inset-1.5 rounded-2xl border-2 border-orange-400 pointer-events-none" />
      )}
    </motion.button>
  );
}

// =====================================================================
// Building zone — visual block (rooms) on the blueprint
// =====================================================================
function BuildingZone({ building, hasFault, hasAffected }) {
  const { bounds } = building;
  return (
    <div
      className="absolute rounded-2xl pointer-events-none"
      style={{ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }}
    >
      {/* base shell */}
      <div
        className={`absolute inset-0 rounded-2xl border-2 ${
          hasFault
            ? 'border-red-500/50'
            : hasAffected
            ? 'border-amber-500/40'
            : 'border-zinc-700/60'
        } bg-zinc-900/30 backdrop-blur-[2px]`}
      />
      {/* endangered area overlay */}
      <AnimatePresence>
        {(hasFault || hasAffected) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 rounded-2xl ${
              hasFault
                ? 'bg-red-500/[0.06]'
                : 'bg-amber-500/[0.06]'
            }`}
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-30"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${
                  hasFault ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.14)'
                } 0 8px, transparent 8px 22px)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* corner brackets */}
      {['top-2 left-2', 'top-2 right-2 rotate-90', 'bottom-2 left-2 -rotate-90', 'bottom-2 right-2 rotate-180'].map(
        (pos) => (
          <div
            key={pos}
            className={`absolute ${pos} h-4 w-4 border-t-2 border-l-2 ${
              hasFault ? 'border-red-400/70' : hasAffected ? 'border-amber-400/70' : 'border-zinc-500/70'
            }`}
          />
        )
      )}

      {/* Label */}
      <div className="absolute top-3 left-4 flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: building.accent, boxShadow: `0 0 10px ${building.accent}` }}
        />
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-300">
          {building.name}
        </span>
        <span className="text-[10px] font-mono text-zinc-500">{building.code}</span>
      </div>
    </div>
  );
}

// =====================================================================
// Fault simulator panel
// =====================================================================
function FaultPanel({ nodes, faultedIds, onInject, onClear, onSelect, selectedId, collapsed, onToggle }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter(
      (n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || n.type.includes(q)
    );
  }, [nodes, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const b of BUILDINGS) map.set(b.id, []);
    for (const n of filtered) {
      if (map.has(n.building)) map.get(n.building).push(n);
    }
    return map;
  }, [filtered]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 360 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="relative shrink-0 h-full bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col"
    >
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center gap-4 pt-6">
          <ShieldAlert className="text-orange-400" size={20} />
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 [writing-mode:vertical-rl] rotate-180">
            FAULT SIMULATOR
          </span>
          {faultedIds.size > 0 && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      ) : (
        <>
          <div className="px-5 pt-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="text-orange-400" size={16} />
              <h2 className="text-sm font-bold tracking-[0.18em] uppercase text-zinc-100">
                Fault Simulator
              </h2>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Inject a fault into any node. Downstream impact (obszar zagrożony) is calculated automatically.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={faultedIds.size === 0}
                onClick={onClear}
                className="flex-1 h-8 text-xs"
              >
                <RotateCcw size={13} className="mr-1.5" /> Clear All Faults
              </Button>
            </div>
            <div className="mt-3 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search node by id, name or type"
                className="pl-8 h-8 text-xs bg-zinc-900/70 border-white/10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 scrollbar-thin">
            <div className="px-3 py-3 space-y-4">
              {BUILDINGS.map((b) => {
                const items = grouped.get(b.id) || [];
                if (!items.length) return null;
                return (
                  <div key={b.id}>
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: b.accent }}
                      />
                      <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-zinc-400">
                        {b.name}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono">{items.length}</span>
                    </div>
                    <div className="space-y-1">
                      {items.map((n) => {
                        const Icon = TYPE_ICON[n.type] || Box;
                        const isFaulted = faultedIds.has(n.id);
                        const isAffected = n.status === 'affected';
                        return (
                          <div
                            key={n.id}
                            className={`group flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-colors ${
                              selectedId === n.id
                                ? 'bg-orange-500/10 border-orange-500/40'
                                : isFaulted
                                ? 'bg-red-500/10 border-red-500/40'
                                : isAffected
                                ? 'bg-amber-500/[0.06] border-amber-500/25'
                                : 'border-transparent hover:bg-white/[0.03] hover:border-white/5'
                            }`}
                            onClick={() => onSelect(n)}
                          >
                            <Icon
                              size={13}
                              className={
                                isFaulted
                                  ? 'text-red-400'
                                  : isAffected
                                  ? 'text-amber-400'
                                  : 'text-zinc-400'
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium text-zinc-200 truncate">
                                {n.name}
                              </div>
                              <div className="text-[9px] text-zinc-500 font-mono">
                                {n.id} · {TYPE_LABEL[n.type]}
                              </div>
                            </div>
                            <Button
                              variant={isFaulted ? 'destructive' : 'outline'}
                              size="sm"
                              className="h-6 px-2 text-[10px] font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInject(n.id);
                              }}
                            >
                              {isFaulted ? (
                                <>
                                  <X size={10} className="mr-1" /> CLEAR
                                </>
                              ) : (
                                <>
                                  <Zap size={10} className="mr-1" /> INJECT
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </motion.aside>
  );
}

// =====================================================================
// Node detail drawer
// =====================================================================
function NodeDrawer({ node, allNodes, faultedIds, onInject, onClear, onOpenChange }) {
  if (!node) return null;
  const current = allNodes.find((n) => n.id === node.id) || node;
  const Icon = TYPE_ICON[current.type] || Box;
  const parents = (current.dependsOn || []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const downstreamIds = downstreamOf(allNodes, current.id);
  const downstream = downstreamIds.map((id) => allNodes.find((n) => n.id === id)).filter(Boolean);
  const isFaulted = faultedIds.has(current.id);

  const statusColor =
    current.status === 'fault'
      ? 'text-red-400'
      : current.status === 'affected'
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <Sheet open={!!node} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[460px] bg-zinc-950/95 border-l border-white/5 text-zinc-100 backdrop-blur-xl p-0"
      >
        <SheetHeader className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`h-11 w-11 rounded-lg flex items-center justify-center border ${
                current.status === 'fault'
                  ? 'bg-red-500/10 border-red-500/30'
                  : current.status === 'affected'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <Icon className={statusColor} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-zinc-100 text-base leading-tight">{current.name}</SheetTitle>
              <SheetDescription className="font-mono text-[11px] text-zinc-500">
                {current.id} · {TYPE_LABEL[current.type]}
              </SheetDescription>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge
              className={`uppercase tracking-widest text-[10px] font-bold ${
                current.status === 'fault'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/20'
                  : current.status === 'affected'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {current.status === 'fault' && <Radio size={10} className="mr-1 animate-pulse" />}
              {current.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
              {BUILDINGS.find((b) => b.id === current.building)?.name}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
              {current.floor}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] scrollbar-thin">
          <div className="p-6 space-y-5">
            {/* Action */}
            <div className="flex gap-2">
              {isFaulted ? (
                <Button onClick={() => onClear(current.id)} variant="outline" className="flex-1 border-white/10">
                  <CheckCircle2 size={14} className="mr-2" /> Clear Fault
                </Button>
              ) : (
                <Button onClick={() => onInject(current.id)} variant="destructive" className="flex-1">
                  <Zap size={14} className="mr-2" /> Inject Fault Here
                </Button>
              )}
            </div>

            {/* Specs */}
            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Gauge size={11} /> Specifications
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <SpecBox label="Rating" value={current.rating || '—'} />
                <SpecBox label="Voltage" value={current.voltage || '—'} />
                <SpecBox label="Type" value={TYPE_LABEL[current.type]} />
                <SpecBox label="Installed" value={current.installed || '—'} />
              </div>
            </section>

            {/* Upstream */}
            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Power size={11} /> Upstream Power Source
              </h3>
              {parents.length === 0 ? (
                <div className="text-[11px] text-zinc-500 italic">Grid feed / root node</div>
              ) : (
                <div className="space-y-1.5">
                  {parents.map((p) => (
                    <DependencyRow key={p.id} node={p} />
                  ))}
                </div>
              )}
            </section>

            {/* Downstream impact */}
            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Activity size={11} /> Downstream Impact ({downstream.length})
              </h3>
              {downstream.length === 0 ? (
                <div className="text-[11px] text-zinc-500 italic">No dependent nodes — leaf component.</div>
              ) : (
                <div className="space-y-1.5">
                  {downstream.map((p) => (
                    <DependencyRow key={p.id} node={p} highlight={isFaulted || current.status === 'fault'} />
                  ))}
                </div>
              )}
            </section>

            {/* Troubleshooting */}
            <section>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Wrench size={11} /> Troubleshooting Steps
              </h3>
              <ol className="space-y-2 text-[12px] text-zinc-300">
                {TROUBLESHOOT_STEPS[current.type].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 h-5 w-5 rounded bg-orange-500/15 text-orange-300 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function SpecBox({ label, value }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{label}</div>
      <div className="text-[12px] text-zinc-200 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function DependencyRow({ node, highlight }) {
  const Icon = TYPE_ICON[node.type] || Box;
  const tone =
    node.status === 'fault'
      ? 'border-red-500/30 bg-red-500/[0.06] text-red-200'
      : node.status === 'affected'
      ? 'border-amber-500/30 bg-amber-500/[0.06] text-amber-200'
      : highlight
      ? 'border-amber-500/20 bg-amber-500/[0.04] text-zinc-200'
      : 'border-white/5 bg-white/[0.02] text-zinc-300';
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${tone}`}>
      <Icon size={13} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate">{node.name}</div>
        <div className="text-[9px] text-zinc-500 font-mono">{node.id} · {TYPE_LABEL[node.type]}</div>
      </div>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          node.status === 'fault'
            ? 'bg-red-500'
            : node.status === 'affected'
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}
      />
    </div>
  );
}

const TROUBLESHOOT_STEPS = {
  transformer: [
    'Verify primary and secondary voltage with calibrated meter.',
    'Inspect cooling system (oil level / fans) and temperature sensors.',
    'Check Buchholz / sudden pressure relay status.',
    'Review insulation resistance (IR) and dissolved gas analysis (DGA) trend.',
    'Confirm protection relay trip history and reset breaker if safe.',
  ],
  switchgear: [
    'Confirm SCADA / HMI alarm log and breaker position.',
    'Verify trip unit / protection relay settings and target.',
    'Inspect bus voltage and current readings against nominal.',
    'Perform thermal scan on busbar connections and lugs.',
    'Coordinate lock-out / tag-out before manual reset.',
  ],
  distribution: [
    'Identify which feeder breaker tripped or shows alarm.',
    'Measure incoming and outgoing voltage at the busbar.',
    'Inspect MCBs / MCCBs for visible signs of overload or arc.',
    'Verify neutral and earth bonding integrity.',
    'Reset breakers sequentially while monitoring load currents.',
  ],
  cabinet: [
    'Check local indicator lights and emergency stop status.',
    'Inspect MCB / contactor status inside the cabinet.',
    'Measure control voltage (24V / 230V) at PLC input.',
    'Verify drive / soft-starter fault codes if present.',
    'Test interlocks with upstream feeder before energising.',
  ],
};

// =====================================================================
// Top status bar
// =====================================================================
function StatusBar({ stats }) {
  return (
    <div className="h-14 shrink-0 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 gap-6">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
          <Factory size={16} className="text-white" />
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-100 leading-none">
            Plant Electrical
          </div>
          <div className="text-[9px] text-zinc-500 font-mono leading-none mt-1">
            TROUBLESHOOT · v1.0
          </div>
        </div>
      </div>
      <Separator orientation="vertical" className="h-8 bg-white/5" />

      <StatPill
        label="Operational"
        value={stats.operational}
        color="emerald"
        icon={<CheckCircle2 size={12} />}
      />
      <StatPill
        label="Affected"
        value={stats.affected}
        color="amber"
        icon={<AlertTriangle size={12} />}
      />
      <StatPill
        label="Fault"
        value={stats.fault}
        color="red"
        icon={<Radio size={12} className={stats.fault > 0 ? 'animate-pulse' : ''} />}
      />

      <div className="flex-1" />

      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
        <span
          className={`h-2 w-2 rounded-full ${
            stats.fault > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
          }`}
        />
        {stats.fault > 0 ? 'NETWORK COMPROMISED' : 'ALL SYSTEMS NOMINAL'}
      </div>
    </div>
  );
}

function StatPill({ label, value, color, icon }) {
  const colorMap = {
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/[0.06]',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-500/[0.06]',
    red: 'text-red-300 border-red-500/20 bg-red-500/[0.06]',
  };
  return (
    <div
      className={`flex items-center gap-2 h-8 px-3 rounded-md border ${colorMap[color]} text-[11px] font-semibold`}
    >
      {icon}
      <span className="tracking-widest uppercase text-[10px] text-zinc-400 font-bold">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// =====================================================================
// Legend (overlay on canvas)
// =====================================================================
function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-20 bg-zinc-950/85 backdrop-blur-xl border border-white/10 rounded-lg p-3 text-[10px] text-zinc-400 space-y-1.5 shadow-2xl">
      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-500 mb-1.5">
        Legend
      </div>
      <LegendRow color="bg-emerald-500" label="Operational" />
      <LegendRow color="bg-amber-500" label="Affected (obszar zagrożony)" />
      <LegendRow color="bg-red-500" label="Fault — root cause" pulse />
      <Separator className="my-2 bg-white/5" />
      <div className="flex items-center gap-2">
        <Zap size={10} className="text-emerald-400" /> Transformer
      </div>
      <div className="flex items-center gap-2">
        <CircuitBoard size={10} className="text-emerald-400" /> Switchgear
      </div>
      <div className="flex items-center gap-2">
        <Cpu size={10} className="text-emerald-400" /> Distribution Board
      </div>
      <div className="flex items-center gap-2">
        <Box size={10} className="text-emerald-400" /> Cabinet
      </div>
    </div>
  );
}
function LegendRow({ color, label, pulse }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
    </div>
  );
}

// =====================================================================
// Main page
// =====================================================================
export default function HomePage() {
  const [faultedIds, setFaultedIds] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const computed = useMemo(
    () => computeNetworkStatus(INITIAL_NODES, faultedIds),
    [faultedIds]
  );

  const inject = useCallback((id) => {
    setFaultedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearOne = useCallback((id) => {
    setFaultedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleFault = useCallback(
    (id) => {
      setFaultedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    []
  );

  const clearAll = useCallback(() => setFaultedIds(new Set()), []);

  const stats = useMemo(() => {
    const s = { operational: 0, affected: 0, fault: 0 };
    for (const n of computed) s[n.status] += 1;
    return s;
  }, [computed]);

  // Buildings status — which ones contain fault/affected nodes
  const buildingStatus = useMemo(() => {
    const map = {};
    for (const b of BUILDINGS) map[b.id] = { hasFault: false, hasAffected: false };
    for (const n of computed) {
      if (n.status === 'fault') map[n.building].hasFault = true;
      else if (n.status === 'affected') map[n.building].hasAffected = true;
    }
    return map;
  }, [computed]);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <StatusBar stats={stats} />

        <div className="flex-1 flex overflow-hidden">
          <FaultPanel
            nodes={computed}
            faultedIds={faultedIds}
            onInject={toggleFault}
            onClear={clearAll}
            onSelect={(n) => setSelected(n)}
            selectedId={selected?.id}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />

          {/* Canvas */}
          <main className="relative flex-1 overflow-auto">
            <div
              className="relative blueprint-grid industrial-noise"
              style={{ width: 1360, height: 720, minWidth: '100%', minHeight: '100%' }}
            >
              {/* Buildings */}
              {BUILDINGS.map((b) => (
                <BuildingZone
                  key={b.id}
                  building={b}
                  hasFault={buildingStatus[b.id].hasFault}
                  hasAffected={buildingStatus[b.id].hasAffected}
                />
              ))}

              {/* Connector hint (purely decorative — NOT logical cables) between
                  utility and batch house since they are physically separate */}
              <div
                className="absolute h-[2px] bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent pointer-events-none"
                style={{ left: 940, top: 350, width: 50 }}
              />

              {/* Nodes */}
              {computed.map((node) => (
                <NodeMarker
                  key={node.id}
                  node={node}
                  onSelect={(n) => setSelected(n)}
                  isSelected={selected?.id === node.id}
                />
              ))}

              <Legend />

              {/* Watermark */}
              <div className="absolute top-4 right-6 text-right pointer-events-none">
                <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-600">
                  Plant Blueprint · Sector A
                </div>
                <div className="text-[9px] font-mono text-zinc-700 mt-0.5">
                  Top-down view · 1:200
                </div>
              </div>
            </div>
          </main>
        </div>

        <NodeDrawer
          node={selected}
          allNodes={computed}
          faultedIds={faultedIds}
          onInject={inject}
          onClear={clearOne}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      </div>
    </TooltipProvider>
  );
}
