"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hash, Save, HardDrive, Printer } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = 'invenza-printer-config';

interface PrinterConfig {
  width: '80mm' | '58mm';
  copies: number;
}

const DEFAULT_CONFIG: PrinterConfig = {
  width: '80mm',
  copies: 1,
};

export function PrinterSettingsForm() {
  const [config, setConfig] = useState<PrinterConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast.success("Configuración de impresión guardada");
  };

  return (
    <div className="max-w-md space-y-6">
      <Card className="rounded-xl border border-gray-200">
        <CardHeader>
          <CardTitle className="font-semibold text-2xl flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Formato del Ticket
          </CardTitle>
          <CardDescription className="text-xs font-bold">
            El ticket se imprime usando la impresora predeterminada del sistema.
            Asegúrate de que esté configurada en Windows o macOS antes de imprimir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-400">Ancho del Papel</Label>
            <Select
              value={config.width}
              onValueChange={(v) => setConfig(c => ({ ...c, width: v as PrinterConfig['width'] }))}
            >
              <SelectTrigger className="rounded-xl border border-gray-200 h-12 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-200">
                <SelectItem value="80mm">80mm (Estándar)</SelectItem>
                <SelectItem value="58mm">58mm (Pequeño)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-400">Copias por Venta</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="number"
                min={1}
                max={5}
                value={config.copies}
                onChange={(e) => setConfig(c => ({ ...c, copies: Number(e.target.value) }))}
                className="pl-10 rounded-xl border border-gray-200 h-12 font-bold"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            className="w-full bg-primary text-primary-foreground h-12 font-semibold rounded-xl hover:bg-zinc-800 transition-all"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </CardContent>
      </Card>

      <div className="p-4 border border-dashed border-gray-300 rounded-xl space-y-2">
        <p className="text-xs font-semibold text-zinc-600 flex items-center gap-2">
          <Printer className="w-3.5 h-3.5" /> ¿Cómo funciona?
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Al dar clic en "Imprimir" en el POS, el navegador abre el diálogo de impresión del sistema.
          Selecciona tu impresora térmica ahí. Si quieres que no aparezca el diálogo cada vez,
          configura esa impresora como predeterminada en tu PC o Mac.
        </p>
      </div>
    </div>
  );
}
