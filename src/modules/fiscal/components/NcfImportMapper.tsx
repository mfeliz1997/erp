"use client";

import { useState } from "react";
import Papa from "papaparse";
import { importNcfSequencesAction, type NcfImportRow } from "../ncf-import-actions";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, Loader2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Columnas que esperamos en el CSV (case-insensitive)
const COLUMN_MAP: Record<string, keyof NcfImportRow> = {
  tipo: "type",
  type: "type",
  prefijo: "prefix",
  prefix: "prefix",
  actual: "current",
  current: "current",
  inicio: "current",
  limite: "max",
  "límite": "max",
  max: "max",
  maximo: "max",
  vencimiento: "expiry",
  expiry: "expiry",
  "fecha vencimiento": "expiry",
};

const REQUIRED_FIELDS: (keyof NcfImportRow)[] = ["type", "prefix", "current", "max"];

const EXAMPLE_ROWS = [
  { Tipo: "B01", Prefijo: "B010000000", Actual: "0", Limite: "1000", Vencimiento: "2026-12-31" },
  { Tipo: "B02", Prefijo: "B020000000", Actual: "0", Limite: "500", Vencimiento: "" },
];

function downloadExampleCsv() {
  const header = "Tipo,Prefijo,Actual,Limite,Vencimiento";
  const rows = EXAMPLE_ROWS.map((r) =>
    `${r.Tipo},${r.Prefijo},${r.Actual},${r.Limite},${r.Vencimiento}`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_comprobantes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function NcfImportMapper() {
  const [status, setStatus] = useState<"idle" | "preview" | "importing" | "success">("idle");
  const [rows, setRows] = useState<NcfImportRow[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data.length) {
          setValidationError("El archivo está vacío.");
          return;
        }

        const rawHeaders = Object.keys(results.data[0]).map((h) => h.trim().toLowerCase());
        const missing = REQUIRED_FIELDS.filter(
          (f) => !rawHeaders.some((h) => COLUMN_MAP[h] === f)
        );
        if (missing.length > 0) {
          setValidationError(
            `Faltan columnas obligatorias: ${missing.join(", ")}. Descarga la plantilla como referencia.`
          );
          return;
        }

        const parsed: NcfImportRow[] = results.data.map((row) => {
          const mapped: Partial<NcfImportRow> = {};
          for (const [rawKey, value] of Object.entries(row)) {
            const field = COLUMN_MAP[rawKey.trim().toLowerCase()];
            if (field) (mapped as any)[field] = value?.trim() ?? "";
          }
          return mapped as NcfImportRow;
        });

        setRows(parsed);
        setStatus("preview");
      },
      error: () => setValidationError("No se pudo leer el archivo CSV."),
    });
  };

  const handleImport = async () => {
    setStatus("importing");
    const result = await importNcfSequencesAction(rows);
    if (result.success) {
      setStatus("success");
      toast.success(`${result.count} secuencias importadas`);
    } else {
      setValidationError(result.error ?? "Error desconocido");
      setStatus("preview");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="bg-emerald-100 p-4 rounded-full">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <p className="text-lg font-semibold">Secuencias importadas correctamente</p>
        <Button onClick={() => { setStatus("idle"); setRows([]); router.refresh(); }}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Encabezado con plantilla */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          El CSV debe tener las columnas: <span className="font-mono font-semibold">Tipo, Prefijo, Actual, Limite</span> (Vencimiento es opcional).
        </p>
        <Button variant="outline" size="sm" onClick={downloadExampleCsv} className="shrink-0">
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Plantilla
        </Button>
      </div>

      {/* Upload zone */}
      {status === "idle" && (
        <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-black hover:bg-gray-50 transition-all">
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <Upload className="w-10 h-10 text-gray-300" />
          <span className="text-sm font-semibold text-gray-500">Seleccionar archivo CSV</span>
        </label>
      )}

      {/* Error de validación */}
      {validationError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Preview */}
      {(status === "preview" || status === "importing") && rows.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Prefijo</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Límite</th>
                  <th className="px-4 py-3">Vence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-bold text-blue-600">{r.type}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.prefix}</td>
                    <td className="px-4 py-2.5">{r.current}</td>
                    <td className="px-4 py-2.5">{r.max}</td>
                    <td className="px-4 py-2.5 text-gray-400">{r.expiry || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStatus("idle"); setRows([]); setValidationError(null); }} disabled={status === "importing"}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={status === "importing"} className="flex-1">
              {status === "importing"
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...</>
                : `Importar ${rows.length} secuencia${rows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
