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
      <div className="flex items-center gap-4 border-b-2 border-black pb-6">
        <div className="p-3 bg-black text-white shrink-0">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="space-y-1 text-left">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">WhatsApp API</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Canales de comunicación automatizada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-10">
        <div className="flex items-center justify-between p-6 bg-blue-50 border-2 border-black border-dashed">
          <div className="space-y-1">
            <Label className="text-xs font-black uppercase tracking-tight">Envío Automático</Label>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Enviar factura por WhatsApp al cobrar</p>
          </div>
          <Switch 
            name="autoSend" 
            defaultChecked={tenant?.whatsapp_auto_send} 
            className="data-[state=checked]:bg-blue-600 border-2 border-black"
          />
        </div>

        <div className="space-y-8">
          <div className="grid gap-3">
             <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                <Label htmlFor="metaToken" className="uppercase text-[10px] font-black tracking-widest text-gray-400">Meta Access Token (Opcional)</Label>
             </div>
             <input 
                id="metaToken" 
                name="metaToken" 
                defaultValue={tenant?.whatsapp_meta_token} 
                placeholder="EAAl..." 
                className="w-full h-14 px-4 border-2 border-black rounded-none font-black text-xs uppercase tracking-widest focus:outline-none placeholder:text-gray-100"
             />
          </div>

          <div className="grid gap-3">
             <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <Label htmlFor="phoneId" className="uppercase text-[10px] font-black tracking-widest text-gray-400">Phone Number ID (Opcional)</Label>
             </div>
             <input 
                id="phoneId" 
                name="phoneId" 
                defaultValue={tenant?.whatsapp_phone_id} 
                placeholder="105..." 
                className="w-full h-14 px-4 border-2 border-black rounded-none font-black text-xs uppercase tracking-widest focus:outline-none placeholder:text-gray-100"
             />
          </div>
        </div>

        <div className="bg-amber-50 p-4 border-l-4 border-amber-500">
           <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
             💡 TIP: Si dejas los campos vacíos, usaremos el número oficial de BERAL para el envío de notificaciones.
           </p>
        </div>

        <Button type="submit" disabled={isPending} className="w-full h-16 bg-black text-white font-black uppercase tracking-[0.2em] rounded-none hover:bg-zinc-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "GUARDAR CONFIGURACIÓN"}
        </Button>
      </form>
    </div>
  );
}