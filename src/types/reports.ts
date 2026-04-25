import type { NcfType } from "./fiscal";

// ── Executive Summary ─────────────────────────────────────────────────────────

export interface ReportChartPoint {
  date: string;
  revenue: number;
  sales_count: number;
}

export interface ReportSummary {
  sales_today: number;
  revenue_today: number;
  sales_month: number;
  revenue_month: number;
  pending_credit: number;
  itbis_collected: number;
  chart_data: ReportChartPoint[];
}

// ── Fiscal / DGII ─────────────────────────────────────────────────────────────

export interface FiscalNcfRow {
  ncf_type: NcfType;
  label: string;
  total_invoices: number;
  subtotal: number;
  itbis: number;
  total: number;
}

export interface FiscalReportData {
  period_label: string;
  rows: FiscalNcfRow[];
  grand_total: number;
  grand_itbis: number;
}

/** Fila individual del Formato 607 DGII — una por factura */
export interface Fiscal607Row {
  ncf:             string;
  tipo_ncf:        NcfType;
  fecha:           string;         // YYYYMMDD
  rnc_comprador:   string;         // vacío si B02
  nombre_comprador: string;
  monto_gravado:   number;
  itbis:           number;
  total:           number;
}

// ── Performance ───────────────────────────────────────────────────────────────

export interface TopProductRow {
  product_name: string;
  qty_sold: number;
  revenue: number;
}

export interface CashierRow {
  cashier_name: string;
  total_sales: number;
  total_revenue: number;
}

export interface PerformanceReportData {
  top_products: TopProductRow[];
  cashier_summary: CashierRow[];
}
