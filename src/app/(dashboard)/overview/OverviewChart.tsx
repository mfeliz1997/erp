'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  revenue: number;
}

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0]?.value || 0);
  return (
    <div className="bg-popover border border-border text-popover-foreground text-xs rounded-md px-3 py-2 shadow-none">
      <p className="font-medium mb-1">{label}</p>
      <p className="tabular-nums font-semibold">RD$ {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
    </div>
  );
}

export default function OverviewChart({ data }: { data: ChartDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No hay ventas en este período.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="currentColor" stopOpacity={0.12} />
            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="hsl(var(--border))"
        />

        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          dy={8}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
          dx={-4}
          width={70}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}