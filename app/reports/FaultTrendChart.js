'use client';

// Isolated in its own file and next/dynamic-imported (ssr:false) from
// page.js per components/ui/chart.jsx's own guidance: recharts namespaces
// are used as JSX component types, which next/dynamic can't return, so
// the *consumer* of chart.jsx needs to be what's dynamically imported.

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  count: { label: 'Faults', color: '#f97316' },
};

export default function FaultTrendChart({ data }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={10}
          stroke="#71717a"
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={10} stroke="#71717a" width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
