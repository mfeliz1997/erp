"use client";

import { useState } from "react";
import Papa from "papaparse";
import { getAiMappingSuggestion, bulkCreateProductsAction } from "../actions/import-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Sparkles, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const INVENZA_FIELDS = [
  { key: "name", label: "Nombre", required: true },
  { key: "description", label: "Descripción", required: false },
  { key: "cost_price", label: "Costo", required: false },
  { key: "price", label: "Precio Venta", required: true },
  { key: "stock", label: "Stock Inicial", required: false },
  { key: "barcode", label: "Código de Barras", required: false },
  { key: "category", label: "Categoría", required: false },
];

export function ImportMapper() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "mapping_ai" | "ready" | "importing" | "success">("idle");
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.data.length > 0) {
          const cols = Object.keys(results.data[0] as Record<string, unknown>);
          setFileData(results.data);
          setHeaders(cols);
          setStatus("mapping_ai");
          
          // Consultar a la IA
          toast.info("Escaneando encabezados con IA...");
          const aiResult = await getAiMappingSuggestion(cols);
          
          if (aiResult.success && aiResult.data) {
            setMapping(aiResult.data);
            toast.success("Mapeo sugerido por IA aplicado");
          } else {
            toast.error("La IA no pudo sugerir un mapeo, por favor hazlo manualmente.");
          }
          
          setStatus("ready");
        }
      }
    });
  };

  const handleImport = async () => {
    const missing = INVENZA_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      toast.error(`Mapea los campos obligatorios: ${missing.map(m => m.label).join(", ")}`);
      return;
    }

    setStatus("importing");
    
    const transformed = fileData.map(row => {
      const p: any = {};
      INVENZA_FIELDS.forEach(f => {
        p[f.key] = mapping[f.key] ? row[mapping[f.key]] : null;
      });
      return p;
    });

    const result = await bulkCreateProductsAction(transformed);
    
    if (result.success) {
      setStatus("success");
      toast.success(`${result.count} productos importados con éxito`);
    } else {
      toast.error(result.error);
      setStatus("ready");
    }
  };

  if (status === "success") {
    return (
      <Card className="rounded-none border-2 border-black text-center p-20 shadow-2xl animate-in zoom-in duration-300">
        <div className="flex flex-col items-center gap-6">
           <div className="bg-black p-6 rounded-full">
              <CheckCircle2 className="w-16 h-16 text-white" />
           </div>
           <h2 className="text-4xl font-black uppercase tracking-tighter">¡Importación Exitosa!</h2>
           <Button onClick={() => router.push("/inventory")} className="bg-black text-white px-10 h-14 font-black uppercase tracking-widest rounded-none">
             Ir al Inventario
           </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {status === "idle" ? (
        <label className="group border-4 border-dashed border-zinc-200 p-24 flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-zinc-50 transition-all rounded-none">
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          <Upload className="w-20 h-20 text-zinc-300 group-hover:text-black mb-6 transition-colors" />
          <h3 className="text-3xl font-black uppercase tracking-tighter">Arrastrar Archivo</h3>
          <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-2">Compatible con CSV (Soporte Excel próximamente)</p>
          <div className="mt-8 bg-black text-white px-8 py-3 font-black uppercase text-[10px] tracking-[0.2em]">Seleccionar Inventario</div>
        </label>
      ) : (
        <Card className="rounded-none border-2 border-black overflow-hidden shadow-2xl">
          <CardHeader className="bg-black text-white p-8 border-b-2 border-black">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
                  Configurar Mapeo
                  {status === "mapping_ai" && <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />}
                </CardTitle>
                <CardDescription className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-2 items-center flex gap-2">
                   {status === "mapping_ai" ? "IA analizando columnas..." : "La IA ha pre-seleccionado las columnas por ti"}
                </CardDescription>
              </div>
              <div className="text-right">
                 <p className="text-4xl font-black leading-none">{fileData.length}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filas cargadas</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-zinc-50 border-b-2 border-zinc-100">
                <TableRow>
                  <TableHead className="px-8 py-6 uppercase text-[10px] font-black tracking-widest text-black">Campo Invenza</TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="px-8 py-6 uppercase text-[10px] font-black tracking-widest text-black">Columna de tu Archivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INVENZA_FIELDS.map((field) => (
                  <TableRow key={field.key} className="hover:bg-zinc-50/50 transition-colors">
                    <TableCell className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xl font-black uppercase tracking-tighter text-zinc-800">{field.label}</span>
                        {field.required && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">Obligatorio</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-200">
                      <ArrowRight className="w-6 h-6" />
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <Select 
                        value={mapping[field.key] || ""}
                        onValueChange={(v) => setMapping(prev => ({ ...prev, [field.key]: v }))}
                        disabled={status === "mapping_ai"}
                      >
                        <SelectTrigger className="rounded-none border-2 border-black h-12 font-bold focus:ring-0">
                          <SelectValue placeholder="Omitir este campo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 border-black font-bold">
                          <SelectItem value="none" className="italic text-zinc-400">Omitir</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h} className="uppercase tracking-tight">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-10 bg-zinc-50 border-t-2 border-black flex flex-col md:flex-row gap-6 justify-between items-center">
               <div className="flex gap-4 items-center">
                  <div className="bg-amber-100 p-2 rounded-none border border-amber-200">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 max-w-xs leading-relaxed">
                    Hemos mapeado los campos automáticamente usando IA para ahorrarte tiempo. Por favor verifica antes de procesar.
                  </p>
               </div>

               <div className="flex gap-4 w-full md:w-auto">
                 <Button variant="outline" onClick={() => setStatus("idle")} className="rounded-none border-2 border-zinc-200 font-black uppercase tracking-widest text-[10px] px-8 h-14">
                   Cambiar Archivo
                 </Button>
                 <Button 
                    onClick={handleImport}
                    disabled={status === "importing" || status === "mapping_ai"}
                    className="bg-black text-white rounded-none font-black uppercase tracking-[0.2em] text-[10px] px-12 h-14 shadow-2xl hover:bg-zinc-800 transition-all flex-1 md:flex-none"
                 >
                   {status === "importing" ? (
                     <span className="flex items-center gap-3">
                       <Loader2 className="w-4 h-4 animate-spin" />
                       Importando...
                     </span>
                   ) : "Procesar Inventario"}
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
