'use client';

import { useState } from 'react';
import { updateWhatsappSettings } from '@/modules/settings/actions';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { MessageSquare, ShieldCheck, Key, Phone, Loader2 } from "lucide-react";

export default function IntegrationsForm({ tenant }: { tenant: any }) {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await updateWhatsappSettings(formData);
    
    if (result.success) {
      toast.success("Configuración de WhatsApp actualizada");
    } else {
      toast.error(result.error || "Error al actualizar");
    }
    setIsPending(false);
  };

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
        <div className="p-3 bg-primary text-primary-foreground shrink-0">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="space-y-1 text-left">
          <h2 className="text-3xl font-semibold    leading-none">WhatsApp API</h2>
          <p className="text-xs font-semibold text-gray-400   leading-none">Canales de comunicación automatizada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border border-gray-200 bg-white p-8 shadow-sm rounded-xl space-y-10">
        <div className="flex items-center justify-between p-6 bg-blue-50 border border-gray-200 border-solid">
          <div className="space-y-1">
            <Label className="text-xs font-semibold  tracking-tight">Envío Automático</Label>
            <p className="text-xs text-blue-600 font-bold  ">Enviar factura por WhatsApp al cobrar</p>
          </div>
          <Switch 
            name="autoSend" 
            defaultChecked={tenant?.whatsapp_auto_send} 
            className="data-[state=checked]:bg-blue-600 border border-gray-200"
          />
        </div>

        <div className="space-y-8">
          <div className="grid gap-3">
             <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                <Label htmlFor="metaToken" className=" text-xs font-semibold  text-gray-400">Meta Access Token (Opcional)</Label>
             </div>
             <input 
                id="metaToken" 
                name="metaToken" 
                defaultValue={tenant?.whatsapp_meta_token} 
                placeholder="EAAl..." 
                className="w-full h-14 px-4 border border-gray-200 rounded-xl font-semibold text-xs   focus:outline-none placeholder:text-gray-100"
             />
          </div>

          <div className="grid gap-3">
             <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <Label htmlFor="phoneId" className=" text-xs font-semibold  text-gray-400">Phone Number ID (Opcional)</Label>
             </div>
             <input 
                id="phoneId" 
                name="phoneId" 
                defaultValue={tenant?.whatsapp_phone_id} 
                placeholder="105..." 
                className="w-full h-14 px-4 border border-gray-200 rounded-xl font-semibold text-xs   focus:outline-none placeholder:text-gray-100"
             />
          </div>
        </div>

        <div className="bg-amber-50 p-4 border-l-4 border-amber-500">
           <p className="text-xs font-semibold text-amber-700   leading-relaxed">
             💡 TIP: Si dejas los campos vacíos, usaremos el número oficial de INVENZA para el envío de notificaciones.
           </p>
        </div>

        <Button type="submit" disabled={isPending} className="w-full h-16 bg-primary text-primary-foreground font-semibold   rounded-xl hover:bg-zinc-800 transition-all shadow-sm rounded-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "GUARDAR CONFIGURACIÓN"}
        </Button>
      </form>
    </div>
  );
}