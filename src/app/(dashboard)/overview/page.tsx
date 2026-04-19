import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { Activity, CreditCard, DollarSign, Package, TrendingDown, TrendingUp, Clock, Zap } from "lucide-react";
import OverviewChart from "./OverviewChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OverviewPage(props: { searchParams: Promise<{ days?: string }> }) {
  const searchParams = await props.searchParams;
  const period = parseInt(searchParams.days || "7");
 
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  // 1. OBTENER USUARIO Y PERFIL
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user?.id)
    .single();

  // 2. CONSULTAS
  const { data: recentActivity } = await supabase
    .from('activity_logs')
    .select('*, profiles:user_id(full_name)')
    .eq('tenant_id', profile?.tenant_id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: statsData } = await supabase.rpc("get_dashboard_stats", {
    p_tenant_id: profile?.tenant_id,
    p_days: period,
  });

  const stats = statsData || { total_revenue: 0, total_sales: 0, total_products_sold: 0, top_product: null, bottom_product: null, chart_data: [] };
  const ticketPromedio = stats.total_sales > 0 ? (stats.total_revenue / stats.total_sales) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Resumen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Análisis de rendimiento en tiempo real</p>
        </div>

        {/* Selector de período — Regla F: acción a la derecha */}
        <div className="flex border border-border rounded-md overflow-hidden text-sm">
          {([7, 30, 365] as const).map((d, i) => (
            <Link
              key={d}
              href={`?days=${d}`}
              className={`px-4 py-1.5 font-medium transition-colors ${
                period === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              } ${i > 0 ? 'border-l border-border' : ''}`}
            >
              {d === 7 ? '7 Días' : d === 30 ? 'Mes' : 'Año'}
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ingresos Totales</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              RD$ {stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas Realizadas</CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold tabular-nums text-foreground">{stats.total_sales}</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Productos Salientes</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold tabular-nums text-foreground">{stats.total_products_sold}</div>
          </CardContent>
        </Card>

        {/* KPI highlighted — primary bg */}
        <Card className="border border-border bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wide">Ticket Promedio</CardTitle>
            <Zap className="w-4 h-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold tabular-nums">
              RD$ {ticketPromedio.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Gráfica + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfica */}
        <Card className="lg:col-span-2 border border-border bg-card">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Tendencia Comercial</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[300px] w-full pt-2">
              <OverviewChart data={stats.chart_data} />
            </div>
          </CardContent>
        </Card>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* IA Insight */}
          <div className="relative border border-border bg-card p-4 overflow-hidden">
            <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide">
              IA Insight
            </span>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Resumen de Operación</p>
            <p className="text-sm text-foreground leading-relaxed">
              En los últimos{' '}
              <span className="font-semibold">{period} días</span>, se han desplazado{' '}
              <span className="font-semibold tabular-nums">{stats.total_products_sold} artículos</span> mediante{' '}
              <span className="font-semibold tabular-nums">{stats.total_sales} facturas</span> generadas.
            </p>
          </div>

          {/* Rendimiento de Stock */}
          <Card className="border border-border bg-card">
            <CardHeader className="px-4 pt-4 pb-2 border-b border-border">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Package className="w-3 h-3" /> Rendimiento de Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4 space-y-4">
              {stats.top_product ? (
                <div>
                  <Badge variant="outline" className="text-[10px] mb-2 border-border text-muted-foreground font-medium">
                    Top Seller
                  </Badge>
                  <p className="text-sm font-semibold text-foreground truncate">{stats.top_product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{stats.top_product.qty} unidades</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin datos de rotación</p>
              )}

              {stats.bottom_product && (
                <div className="pt-4 border-t border-border">
                  <Badge variant="outline" className="text-[10px] mb-2 border-border text-muted-foreground font-medium">
                    Baja Rotación
                  </Badge>
                  <p className="text-sm font-semibold text-foreground truncate">{stats.bottom_product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{stats.bottom_product.qty} unidades</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Movimientos en Vivo */}
          <Card className="border border-border bg-card">
            <CardHeader className="px-4 pt-4 pb-2 border-b border-border">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-3 h-3" /> Movimientos en Vivo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <div className="space-y-3">
                {!recentActivity || recentActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Esperando actividad...</p>
                ) : (
                  recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-3 items-start border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground leading-snug">{log.description}</p>
                        <div className="flex gap-2 text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                          <span>{log.profiles?.full_name?.split(' ')[0] || 'Sistema'}</span>
                          <span>·</span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}