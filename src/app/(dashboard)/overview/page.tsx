import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Activity, CreditCard, DollarSign, Package,
  TrendingDown, TrendingUp, AlertTriangle, Zap, ArrowRight,
} from "lucide-react";
import OverviewChart from "./OverviewChart";
import CashAlerts from "./CashAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface TopProduct    { name: string; qty: number }
interface LowStockItem  { name: string; stock: number; min: number }
interface ChartPoint    { date: string; revenue: number; sales_count: number }

interface DashboardStats {
  total_revenue:       number;
  total_sales:         number;
  total_products_sold: number;
  prev_revenue:        number;
  prev_sales:          number;
  prev_products_sold:  number;
  payment_stats:       Record<string, number> | null;
  chart_data:          ChartPoint[];
  top_products:        TopProduct[];
  low_stock_products:  LowStockItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function delta(current: number, prev: number): { pct: number; up: boolean } | null {
  if (prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  return { pct: Math.abs(pct), up: pct >= 0 };
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const d = delta(current, prev);
  if (!d) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${d.up ? 'text-emerald-500' : 'text-red-500'}`}>
      {d.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {d.pct.toFixed(1)}%
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function OverviewPage(props: { searchParams: Promise<{ days?: string }> }) {
  const searchParams = await props.searchParams;
  const period = parseInt(searchParams.days || "7");

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name, role")
    .eq("id", user?.id)
    .single();

  const [{ data: statsData }, { data: recentActivity }] = await Promise.all([
    supabase.rpc("get_dashboard_stats", {
      p_tenant_id: profile?.tenant_id,
      p_days: period,
    }),
    supabase
      .from("activity_logs")
      .select("*, profiles:user_id(full_name)")
      .eq("tenant_id", profile?.tenant_id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const stats: DashboardStats = {
    total_revenue:       0,
    total_sales:         0,
    total_products_sold: 0,
    prev_revenue:        0,
    prev_sales:          0,
    prev_products_sold:  0,
    payment_stats:       null,
    chart_data:          [],
    top_products:        [],
    low_stock_products:  [],
    ...(statsData || {}),
  };

  const ticketPromedio = stats.total_sales > 0 ? stats.total_revenue / stats.total_sales : 0;
  const periodLabel = period === 7 ? "7 días" : period === 30 ? "este mes" : "este año";

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Resumen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rendimiento {periodLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex border border-border rounded-md overflow-hidden text-sm">
            {([7, 30, 365] as const).map((d, i) => (
              <Link
                key={d}
                href={`?days=${d}`}
                className={`px-4 py-1.5 font-medium transition-colors ${
                  period === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                } ${i > 0 ? "border-l border-border" : ""}`}
              >
                {d === 7 ? "7d" : d === 30 ? "Mes" : "Año"}
              </Link>
            ))}
          </div>

          {/* Quick action */}
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
          >
            Nueva venta <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ingresos</CardTitle>
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-base md:text-2xl font-semibold tabular-nums text-foreground leading-tight truncate">
              RD${stats.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <div className="mt-1">
              <DeltaBadge current={stats.total_revenue} prev={stats.prev_revenue} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ventas</CardTitle>
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg md:text-2xl font-semibold tabular-nums text-foreground leading-tight">
              {stats.total_sales}
            </div>
            <div className="mt-1">
              <DeltaBadge current={stats.total_sales} prev={stats.prev_sales} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Artículos</CardTitle>
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg md:text-2xl font-semibold tabular-nums text-foreground leading-tight">
              {stats.total_products_sold}
            </div>
            <div className="mt-1">
              <DeltaBadge current={stats.total_products_sold} prev={stats.prev_products_sold} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-[11px] font-medium text-primary-foreground/70 uppercase tracking-wide">Ticket Prom.</CardTitle>
            <Zap className="w-3.5 h-3.5 text-primary-foreground/70" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-base md:text-2xl font-semibold tabular-nums leading-tight truncate">
              RD${ticketPromedio.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <div className="mt-1 h-4" />
          </CardContent>
        </Card>
      </div>

      {/* ── Stock alert banner ─────────────────────────────────────────── */}
      {stats.low_stock_products.length > 0 && (
        <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/5 rounded-md p-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1.5">
              Stock bajo mínimo — {stats.low_stock_products.length} producto{stats.low_stock_products.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.low_stock_products.map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded px-2 py-0.5"
                >
                  {p.name}
                  <span className="font-semibold tabular-nums">{p.stock}</span>
                  <span className="text-amber-500/60">/ {p.min}</span>
                </span>
              ))}
            </div>
          </div>
          <Link href="/inventory" className="text-[11px] text-amber-500 hover:underline shrink-0 font-medium">
            Ver inventario →
          </Link>
        </div>
      )}

      {/* ── Cash discrepancy alerts (admin-only) ──────────────────────── */}
      {profile?.role === "admin" && profile?.tenant_id && (
        <Suspense
          fallback={
            <div className="h-20 rounded-lg border border-red-100 bg-red-50/30 animate-pulse" />
          }
        >
          <CashAlerts tenantId={profile.tenant_id} />
        </Suspense>
      )}

      {/* ── Main grid: chart + right sidebar ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Chart */}
        <Card className="lg:col-span-2 border border-border bg-card">
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Tendencia Comercial</CardTitle>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-foreground rounded-full inline-block" />
                Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-foreground/30 rounded-full inline-block border-dashed border-b border-foreground/40" />
                Ventas
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[280px] w-full pt-1">
              <OverviewChart data={stats.chart_data} />
            </div>
          </CardContent>
        </Card>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Top products */}
          <Card className="border border-border bg-card">
            <CardHeader className="px-4 pt-4 pb-2 border-b border-border">
              <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Activity className="w-3 h-3" /> Top Productos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {stats.top_products.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">Sin datos en este período</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.top_products.map((p, i) => {
                    const maxQty = stats.top_products[0]?.qty ?? 1;
                    const barPct = Math.round((p.qty / maxQty) * 100);
                    return (
                      <div key={p.name}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-foreground font-medium truncate max-w-[70%] flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground tabular-nums w-3">{i + 1}</span>
                            {p.name}
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{p.qty} u.</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground/70 rounded-full"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live activity */}
          <Card className="border border-border bg-card">
            <CardHeader className="px-4 pt-4 pb-2 border-b border-border">
              <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {!recentActivity || recentActivity.length === 0 ? (
                <p className="text-xs text-muted-foreground">Esperando actividad...</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-2.5 items-start border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground leading-snug">{log.description}</p>
                        <div className="flex gap-2 text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                          <span>{(log.profiles as { full_name?: string } | null)?.full_name?.split(" ")[0] || "Sistema"}</span>
                          <span>·</span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
