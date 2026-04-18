'use client';

import { useState } from 'react';
import { updateWhatsappSettings } from '@/modules/settings/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

export function IntegrationsForm({ tenant }: { tenant: any }) {
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
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Business API</CardTitle>
          <CardDescription>
            Si dejas los tokens vacíos, usaremos el número oficial de Beral para tus facturas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="space-y-0.5">
              <Label className="text-base">Envío Automático</Label>
              <p className="text-sm text-blue-600">Enviar factura al cobrar automáticamente.</p>
            </div>
            <Switch name="autoSend" defaultChecked={tenant?.whatsapp_auto_send} />
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="metaToken">Tu Meta Access Token (Opcional)</Label>
              <Input id="metaToken" name="metaToken" defaultValue={tenant?.whatsapp_meta_token} placeholder="EAAl..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phoneId">Tu Phone Number ID (Opcional)</Label>
              <Input id="phoneId" name="phoneId" defaultValue={tenant?.whatsapp_phone_id} placeholder="105..." />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}