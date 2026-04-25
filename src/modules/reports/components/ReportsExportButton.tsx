'use client';

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ReportSummary, FiscalReportData, PerformanceReportData, Fiscal607Row,
} from "@/types/reports";
import type { NcfType } from "@/types/fiscal";

const NCF_LABELS: Record<NcfType, string> = {
  B01: "Crédito Fiscal",
  B02: "Consumidor Final",
  B04: "Nota de Devolución",
  B14: "Regímenes Especiales",
  B15: "Gubernamental",
};

interface Props {
  summary:     ReportSummary;
  fiscal:      FiscalReportData;
  rows607:     Fiscal607Row[];
  perf:        PerformanceReportData;
  periodLabel: string;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function cell(...values: (string | number)[]): string {
  return values.map((v) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }).join(",");
}

function downloadCsv(filename: string, lines: string[]) {
  const bom  = "﻿"; // UTF-8 BOM — Excel lo requiere para no romper tildes
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sección 1: Resumen ejecutivo ──────────────────────────────────────────────

function buildSummaryCsv(summary: ReportSummary, periodLabel: string): string[] {
  return [
    cell("RESUMEN EJECUTIVO — " + periodLabel),
    cell(""),
    cell("Métrica", "Valor"),
    cell("Ventas de hoy (transacciones)", summary.sales_today),
    cell("Ingresos de hoy (RD$)", summary.revenue_today),
    cell("Ventas del mes (transacciones)", summary.sales_month),
    cell("Ingresos del mes (RD$)", summary.revenue_month),
    cell("Cuentas por Cobrar pendientes (RD$)", summary.pending_credit),
    cell("ITBIS recaudado este mes (RD$)", summary.itbis_collected),
    cell(""),
    cell("TENDENCIA — ÚLTIMOS 7 DÍAS"),
    cell("Fecha", "Ingresos (RD$)", "Ventas"),
    ...summary.chart_data.map((p) => cell(p.date, p.revenue, p.sales_count)),
  ];
}

// ── Sección 2a: Resumen 607 por tipo NCF ──────────────────────────────────────

function buildFiscalSummaryCsv(fiscal: FiscalReportData): string[] {
  return [
    cell("REPORTE FISCAL 607 — RESUMEN POR TIPO — " + fiscal.period_label.toUpperCase()),
    cell(""),
    cell("Tipo NCF", "Descripción", "Facturas", "Subtotal (RD$)", "ITBIS 18% (RD$)", "Total (RD$)"),
    ...fiscal.rows.map((r) =>
      cell(
        r.ncf_type,
        NCF_LABELS[r.ncf_type as NcfType] ?? r.ncf_type,
        r.total_invoices,
        r.subtotal,
        r.itbis,
        r.total,
      )
    ),
    cell(""),
    cell(
      "TOTALES", "",
      fiscal.rows.reduce((s, r) => s + r.total_invoices, 0),
      "",
      fiscal.grand_itbis,
      fiscal.grand_total,
    ),
  ];
}

// ── Sección 2b: 607 fila por fila (formato DGII) ──────────────────────────────
// Columnas según spec oficial Formato 607 DGII RD:
// NCF | Tipo NCF | Fecha (YYYYMMDD) | RNC/Cédula Comprador | Nombre Comprador |
// Monto Gravado | ITBIS | Total Factura

function buildFiscal607Csv(rows: Fiscal607Row[], periodLabel: string): string[] {
  return [
    cell("FORMATO 607 DGII — DETALLE POR COMPROBANTE — " + periodLabel.toUpperCase()),
    cell(""),
    cell(
      "No. Comprobante Fiscal",
      "Tipo de Comprobante",
      "Fecha Comprobante",
      "RNC/Cédula Comprador",
      "Nombre/Razón Social Comprador",
      "Monto Gravado (RD$)",
      "ITBIS Facturado (RD$)",
      "Total Factura (RD$)",
    ),
    ...rows.map((r) =>
      cell(
        r.ncf,
        r.tipo_ncf,
        r.fecha,           // YYYYMMDD — formato que espera la OFV/DGII
        r.rnc_comprador,   // RNC para B01, vacío para B02
        r.nombre_comprador,
        r.monto_gravado,
        r.itbis,
        r.total,
      )
    ),
    cell(""),
    cell(
      "", "", "", "", "TOTALES",
      rows.reduce((s, r) => s + r.monto_gravado, 0).toFixed(2),
      rows.reduce((s, r) => s + r.itbis, 0).toFixed(2),
      rows.reduce((s, r) => s + r.total, 0).toFixed(2),
    ),
  ];
}

// ── Sección 3: Top productos ──────────────────────────────────────────────────

function buildProductsCsv(perf: PerformanceReportData): string[] {
  return [
    cell("TOP 5 PRODUCTOS MÁS VENDIDOS — ESTE MES"),
    cell(""),
    cell("#", "Producto", "Unidades vendidas", "Ingresos (RD$)"),
    ...perf.top_products.map((p, i) => cell(i + 1, p.product_name, p.qty_sold, p.revenue)),
  ];
}

// ── Sección 4: Cajeros ────────────────────────────────────────────────────────

function buildCashiersCsv(perf: PerformanceReportData): string[] {
  return [
    cell("VENTAS POR CAJERO — ESTE MES"),
    cell(""),
    cell("Cajero", "Total ventas", "Ingresos (RD$)"),
    ...perf.cashier_summary.map((c) => cell(c.cashier_name, c.total_sales, c.total_revenue)),
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportsExportButton({ summary, fiscal, rows607, perf, periodLabel }: Props) {
  const slug = fiscal.period_label.replace(/\s+/g, "-").toLowerCase();

  function exportSummary() {
    downloadCsv(`resumen-ejecutivo-${slug}.csv`, buildSummaryCsv(summary, periodLabel));
  }

  function exportFiscalSummary() {
    downloadCsv(`fiscal-607-resumen-${slug}.csv`, buildFiscalSummaryCsv(fiscal));
  }

  function exportFiscal607() {
    downloadCsv(`fiscal-607-detalle-${slug}.csv`, buildFiscal607Csv(rows607, periodLabel));
  }

  function exportProducts() {
    downloadCsv(`top-productos-${slug}.csv`, buildProductsCsv(perf));
  }

  function exportCashiers() {
    downloadCsv(`cajeros-${slug}.csv`, buildCashiersCsv(perf));
  }

  function exportAll() {
    const sep = ["", cell("────────────────────────────────────"), ""];
    const lines = [
      ...buildSummaryCsv(summary, periodLabel),
      ...sep,
      ...buildFiscalSummaryCsv(fiscal),
      ...sep,
      ...buildFiscal607Csv(rows607, periodLabel),
      ...sep,
      ...buildProductsCsv(perf),
      ...sep,
      ...buildCashiersCsv(perf),
    ];
    downloadCsv(`reporte-completo-${slug}.csv`, lines);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" />
          Exportar
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wide">
          Por sección
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={exportSummary} className="text-xs cursor-pointer">
          Resumen Ejecutivo
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportFiscalSummary} className="text-xs cursor-pointer">
          Fiscal 607 — Resumen
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportFiscal607} className="text-xs cursor-pointer">
          Fiscal 607 — Detalle DGII
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportProducts} className="text-xs cursor-pointer">
          Top Productos
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportCashiers} className="text-xs cursor-pointer">
          Ventas por Cajero
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={exportAll} className="text-xs font-semibold cursor-pointer gap-1.5">
          <Download className="w-3 h-3" />
          Todo junto (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
