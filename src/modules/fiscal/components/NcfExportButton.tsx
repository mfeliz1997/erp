"use client";

import { useState, useTransition } from "react";
import { getNcfUsedSequencesAction, type NcfExportRow } from "../ncf-import-actions";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Formato 606 simplificado que la DGI acepta como CSV de comprobantes usados
function buildDgiCsv(rows: NcfExportRow[]): string {
  const header = "NCF,Tipo,RNC/Cédula Cliente,Nombre Cliente,Monto,Fecha";
  const lines = rows.map((r) => {
    const date = new Date(r.used_at).toISOString().slice(0, 10).replace(/-/g, "");
    return [
      r.ncf_number,
      r.ncf_type,
      r.customer_rnc ?? "",
      (r.customer_name ?? "CONSUMIDOR FINAL").toUpperCase(),
      r.total.toFixed(2),
      date,
    ].join(",");
  });
  return [header, ...lines].join("\n");
}

function downloadCsv(content: string, filename: string) {
  const bom = "﻿"; // BOM para que Excel lo abra bien
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  from?: string;
  to?: string;
  type?: string;
}

export function NcfExportButton({ from, to, type }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      const result = await getNcfUsedSequencesAction({ from, to, type });
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Error al obtener los comprobantes");
        return;
      }
      if (result.data.length === 0) {
        toast.info("No hay comprobantes usados en el período seleccionado");
        return;
      }
      const csv = buildDgiCsv(result.data);
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `comprobantes_dgi_${today}.csv`);
      toast.success(`${result.data.length} comprobantes exportados`);
    });
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isPending} size="sm">
      {isPending
        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Exportando…</>
        : <><Download className="w-3.5 h-3.5 mr-1.5" /> Exportar para DGI</>}
    </Button>
  );
}
