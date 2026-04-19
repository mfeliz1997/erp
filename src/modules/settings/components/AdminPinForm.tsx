'use client';

import { useState } from 'react';
import { updateAdminPinAction } from '../actions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function AdminPinForm({ currentPin }: { currentPin?: string }) {
  const [pin, setPin] = useState(currentPin || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error("El PIN debe ser de exactamente 4 números");
      return;
    }

    setIsSaving(true);
    const result = await updateAdminPinAction(pin);
    if (result.success) {
      toast.success("PIN de administrador actualizado");
    } else {
      toast.error(result.error || "Error al actualizar el PIN");
    }
    setIsSaving(false);
  };

  return (
    <Card className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader className="bg-gray-50 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl">PIN de Autorizaciones</CardTitle>
            <CardDescription>Código maestro para aprobar ventas a crédito y operaciones críticas.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase text-gray-400">Nuevo PIN (4 dígitos)</label>
              {pin.length === 4 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <Input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="pl-12 py-6 text-2xl tracking-[1em] font-bold border-2 border-black focus-visible:ring-0"
                placeholder="****"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isSaving || pin.length !== 4}
            className="w-full py-6 bg-primary text-primary-foreground font-bold   shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            {isSaving ? "GUARDANDO..." : "ACTUALIZAR PIN MAESTRO"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
