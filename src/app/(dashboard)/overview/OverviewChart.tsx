'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  revenue: number;
  sales_count: number;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const revenue = payload.find((p) => p.name === 'revenue')?.value ?? 0;
  const sales   = payload.find((p) => p.name === 'sales_count')?.value ?? 0;
  return (
    <div className="bg-popover border border-border text-popover-foreground text-xs rounded-md px-3 py-2.5 shadow-none space-y-1">
      <p className="font-semibold mb-1.5">{label}</p>
      <p className="tabular-nums">
        <span className="text-muted-foreground mr-1.5">Ingresos</span>
        RD$ {Number(revenue).toLocaleString('en-US', { minimumFractionDigits: 0 })}
      </p>
      <p className="tabular-nums">
        <span className="text-muted-foreground mr-1.5">Ventas</span>
        {sales}
      </p>
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
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="currentColor" stopOpacity={0.10} />
            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />

        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          dy={8}
        />

        {/* Left Y-axis: revenue */}
        <YAxis
          yAxisId="revenue"
          orientation="left"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          dx={-4}
          width={44}
        />

        {/* Right Y-axis: sales count */}
        <YAxis
          yAxisId="sales"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          allowDecimals={false}
          width={28}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Sales count — bars behind the area */}
        <Bar
          yAxisId="sales"
          dataKey="sales_count"
          fill="hsl(var(--foreground))"
          fillOpacity={0.08}
          radius={[2, 2, 0, 0]}
          maxBarSize={24}
        />

        {/* Revenue — area on top */}
        <Area
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRev)"
          dot={false}
          activeDot={{ r: 3, fill: 'hsl(var(--foreground))' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
