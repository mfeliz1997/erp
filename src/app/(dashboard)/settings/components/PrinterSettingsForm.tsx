"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Printer, Wifi, Hash, Save, HardDrive, Bluetooth, Usb } from "lucide-react";
import { toast } from "sonner";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";

export function PrinterSettingsForm() {
  const { connectBluetooth, connectUSB } = useThermalPrinter();
  
  const handleSave = () => {
    toast.success("Configuración de impresión guardada localmente");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-gray-200">
          <CardHeader>
            <CardTitle className="  font-semibold text-2xl flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Terminal de Impresión
            </CardTitle>
            <CardDescription className="text-xs font-bold  ">Hardware de Punto de Venta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className=" text-xs font-bold  text-zinc-400">Método de Conexión Primario</Label>
              <Select defaultValue="network">
                <SelectTrigger className="rounded-xl border border-gray-200 h-12 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-200 font-bold">
                  <SelectItem value="network">🛜 Red / WiFi (Sistema)</SelectItem>
                  <SelectItem value="usb">🔌 USB Directo (Serial)</SelectItem>
                  <SelectItem value="bluetooth">🔵 Bluetooth (Inalámbrico)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Button variant="outline" size="sm" onClick={connectUSB} className="rounded-xl border border-gray-200 font-semibold  text-xs  h-10 bg-yellow-50">
                 <Usb className="w-4 h-4 mr-2" /> Detectar USB / BT Serial
               </Button>
               <Button variant="outline" size="sm" onClick={connectBluetooth} className="rounded-xl border border-gray-200 font-semibold  text-xs  h-10">
                 <Bluetooth className="w-4 h-4 mr-2" /> Bluetooth Directo
               </Button>
            </div>

            <div className="space-y-2">
              <Label className=" text-xs font-bold  text-zinc-400">Endpoint / IP Host</Label>
              <div className="relative">
                <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input placeholder="192.168.1.100" className="pl-10 rounded-xl border border-gray-200 h-12 font-bold" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 border border-gray-200 border-solid">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold  tracking-tight">Impresión Automática</Label>
                <p className="text-xs text-zinc-500 font-medium">Imprimir ticket al cerrar la venta</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200">
          <CardHeader>
            <CardTitle className="  font-semibold text-2xl flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Diseño de Salida
            </CardTitle>
            <CardDescription className="text-xs font-bold  ">Personalización del Formato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className=" text-xs font-bold  text-zinc-400">Ancho del Papel</Label>
              <Select defaultValue="80mm">
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
              <Label className=" text-xs font-bold  text-zinc-400">Copias por Venta</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input type="number" defaultValue="1" className="pl-10 rounded-xl border border-gray-200 h-12 font-bold" />
              </div>
            </div>
            
            <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground h-12 font-semibold   rounded-xl hover:bg-zinc-800 transition-all">
              <Save className="w-4 h-4 mr-2" />
              Guardar Perfil de Impresión
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 space-y-2">
        <p className="text-xs font-semibold text-amber-800  tracking-tight">
          ⚠️ Notas de Hardware:
        </p>
        <ul className="text-xs text-amber-700 font-bold  list-disc list-inside space-y-1">
          <li>Bluetooth y USB requieren navegadores basados en Chromium (Chrome, Edge).</li>
          <li>Asegúrate de que el sitio use HTTPS (excepto en localhost).</li>
          <li>Si el error persiste, verifica que "Web Bluetooth" esté habilitado en chrome://flags.</li>
        </ul>
      </div>
    </div>
  );
}
