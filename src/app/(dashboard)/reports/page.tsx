import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  DollarSign, Receipt, AlertCircle, TrendingUp,
  Package, Users, FileText, ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportsSalesChart from "@/modules/reports/components/ReportsSalesChart";
import ReportsExportButton from "@/modules/reports/components/ReportsExportButton";
import type {
  ReportSummary, FiscalReportData, FiscalNcfRow,
  PerformanceReportData, Fiscal607Row,
} from "@/types/reports";
import type { NcfType } from "@/types/fiscal";

// ── NCF label map ─────────────────────────────────────────────────────────────

const NCF_LABELS: Record<NcfType, string> = {
  B01: "Crédito Fiscal",
  B02: "Consumidor Final",
  B04: "Nota de Devolución",
  B14: "Regímenes Especiales",
  B15: "Gubernamental",
};

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `RD$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `RD$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `RD$${(n / 1_000).toFixed(1)}k`;
  return `RD$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Card className={`border border-border ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
        <CardTitle className={`text-[11px] font-medium uppercase tracking-wide ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {title}
        </CardTitle>
        <Icon className={`w-3.5 h-3.5 ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-base md:text-2xl font-semibold tabular-nums leading-tight truncate">
          {value}
        </div>
        {sub && (
          <p className={`text-[11px] mt-1 ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReportsPage() {
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
    .eq("id", user?.id ?? "")
    .single();

  const tenantId = profile?.tenant_id ?? null;

  const now    = new Date();
  const year   = now.getFullYear();
  const month  = now.getMonth() + 1;

  const [summaryRes, fiscalRes, rows607Res, perfRes] = await Promise.all([
    tenantId ? supabase.rpc("get_report_summary",      { p_tenant_id: tenantId }) : Promise.resolve({ data: null }),
    tenantId ? supabase.rpc("get_fiscal_report",       { p_tenant_id: tenantId, p_year: year, p_month: month }) : Promise.resolve({ data: null }),
    tenantId ? supabase.rpc("get_fiscal_607_rows",     { p_tenant_id: tenantId, p_year: year, p_month: month }) : Promise.resolve({ data: null }),
    tenantId ? supabase.rpc("get_performance_report",  { p_tenant_id: tenantId, p_year: year, p_month: month }) : Promise.resolve({ data: null }),
  ]);

  const summary: ReportSummary = {
    sales_today:    0,
    revenue_today:  0,
    sales_month:    0,
    revenue_month:  0,
    pending_credit: 0,
    itbis_collected: 0,
    chart_data:     [],
    ...(summaryRes.data ?? {}),
  };

  const fiscal: FiscalReportData = {
    period_label: new Date(year, month - 1).toLocaleString("es-DO", { month: "long", year: "numeric" }),
    rows: (fiscalRes.data as { rows: FiscalNcfRow[] | null } | null)?.rows ?? [],
    grand_total: (fiscalRes.data as { grand_total?: number } | null)?.grand_total ?? 0,
    grand_itbis: (fiscalRes.data as { grand_itbis?: number } | null)?.grand_itbis ?? 0,
  };

  const rows607: Fiscal607Row[] = (rows607Res.data as Fiscal607Row[] | null) ?? [];

  const perf: PerformanceReportData = {
    top_products:    (perfRes.data as PerformanceReportData | null)?.top_products    ?? [],
    cashier_summary: (perfRes.data as PerformanceReportData | null)?.cashier_summary ?? [],
  };

  const maxQty     = perf.top_products[0]?.qty_sold ?? 1;
  const maxRevenue = perf.cashier_summary[0]?.total_revenue ?? 1;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inteligencia de negocios · Fiscal DGII · Rendimiento
          </p>
        </div>
        <ReportsExportButton
          summary={summary}
          fiscal={fiscal}
          rows607={rows607}
          perf={perf}
          periodLabel={fiscal.period_label}
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="resumen">
        <TabsList className="h-9 bg-muted/40 border border-border p-0.5 rounded-lg">
          <TabsTrigger value="resumen"    className="text-xs px-4 h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Resumen Ejecutivo
          </TabsTrigger>
          <TabsTrigger value="fiscal"     className="text-xs px-4 h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Fiscal (DGII)
          </TabsTrigger>
          <TabsTrigger value="rendimiento" className="text-xs px-4 h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Rendimiento
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1 — RESUMEN EJECUTIVO
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="resumen" className="mt-5 space-y-5">

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Ventas de hoy"
              value={fmtShort(summary.revenue_today)}
              sub={`${summary.sales_today} transacciones`}
              icon={ShoppingCart}
            />
            <KpiCard
              title="Ventas del mes"
              value={fmtShort(summary.revenue_month)}
              sub={`${summary.sales_month} transacciones`}
              icon={TrendingUp}
            />
            <KpiCard
              title="C×C pendientes"
              value={fmtShort(summary.pending_credit)}
              sub="Crédito abierto"
              icon={AlertCircle}
            />
            <KpiCard
              title="ITBIS recaudado"
              value={fmtShort(summary.itbis_collected)}
              sub="Este mes (18%)"
              icon={Receipt}
              accent
            />
          </div>

          {/* 7-day Chart */}
          <Card className="border border-border bg-card">
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Tendencia — últimos 7 días
              </CardTitle>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-foreground rounded-full inline-block" />
                  Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 bg-foreground/10 rounded-sm inline-block" />
                  Ventas
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[260px] w-full pt-1">
                <ReportsSalesChart data={summary.chart_data} />
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 2 — FISCAL / DGII
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="fiscal" className="mt-5 space-y-5">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Reporte 607 — Resumen mensual</h2>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{fiscal.period_label}</p>
            </div>
            <span className="text-[11px] bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
              {fiscal.rows.length} tipo{fiscal.rows.length !== 1 ? "s" : ""} de NCF
            </span>
          </div>

          {fiscal.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Sin comprobantes este mes</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Las facturas emitidas aparecerán aquí.</p>
            </div>
          ) : (
            <Card className="border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Tipo NCF</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Facturas</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Subtotal</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">ITBIS 18%</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiscal.rows.map((row: FiscalNcfRow) => (
                      <tr key={row.ncf_type} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-semibold">
                              {row.ncf_type}
                            </span>
                            <span className="text-foreground font-medium">
                              {NCF_LABELS[row.ncf_type as NcfType] ?? row.ncf_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {row.total_invoices.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {fmt(row.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {fmt(row.itbis)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                          {fmt(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/20">
                      <td className="px-4 py-3 text-[11px] font-semibold text-foreground uppercase tracking-wide" colSpan={3}>
                        Totales del mes
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                        {fmt(fiscal.grand_itbis)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground text-sm">
                        {fmt(fiscal.grand_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* ITBIS summary callout */}
          {fiscal.grand_itbis > 0 && (
            <div className="flex items-center gap-3 rounded-md bg-muted/40 border border-border px-4 py-3">
              <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                ITBIS total a declarar este mes:{" "}
                <span className="font-semibold text-foreground tabular-nums">{fmt(fiscal.grand_itbis)}</span>
              </p>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 3 — RENDIMIENTO
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="rendimiento" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Top 5 Products */}
            <Card className="border border-border bg-card">
              <CardHeader className="px-4 pt-4 pb-3 border-b border-border flex flex-row items-center gap-2">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Top 5 Productos — este mes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4">
                {perf.top_products.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Sin ventas registradas este mes.</p>
                ) : (
                  <div className="space-y-4">
                    {perf.top_products.map((p, i) => {
                      const barPct = Math.round((p.qty_sold / maxQty) * 100);
                      return (
                        <div key={p.product_name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="flex items-center gap-2 text-xs font-medium text-foreground truncate max-w-[65%]">
                              <span className="text-[10px] text-muted-foreground tabular-nums w-3 shrink-0">{i + 1}</span>
                              {p.product_name}
                            </span>
                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                                {p.qty_sold.toLocaleString()} u.
                              </span>
                              <span className="text-[10px] text-muted-foreground block tabular-nums">
                                {fmtShort(p.revenue)}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground/60 rounded-full transition-all"
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

            {/* Cashier Summary */}
            <Card className="border border-border bg-card">
              <CardHeader className="px-4 pt-4 pb-3 border-b border-border flex flex-row items-center gap-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Ventas por cajero — este mes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4">
                {perf.cashier_summary.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Sin datos de cajeros este mes.</p>
                ) : (
                  <div className="space-y-4">
                    {perf.cashier_summary.map((c) => {
                      const barPct = Math.round((c.total_revenue / maxRevenue) * 100);
                      return (
                        <div key={c.cashier_name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-foreground truncate max-w-[65%]">
                              {c.cashier_name}
                            </span>
                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                                {fmtShort(c.total_revenue)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block tabular-nums">
                                {c.total_sales} ventas
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground/40 rounded-full transition-all"
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

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
