"use client";

import { useActionState, useEffect, useState } from "react";
import { createCustomer, ActionState } from "../actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, UserPlus, Plus } from "lucide-react";
import { toast } from "sonner";

interface CustomerFormDialogProps {
  onSuccess?: (customer: any) => void;
  trigger?: React.ReactNode;
}

export function CustomerFormDialog({ onSuccess, trigger }: CustomerFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: ActionState = { success: false, error: "" };
  
  const [state, action, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createCustomer(prev, formData);
    if (result.success && result.data) {
      setIsOpen(false);
      toast.success("Cliente guardado correctamente");
      if (onSuccess) {
        onSuccess(result.data);
      }
    }
    return result;
  }, initialState);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-black text-white rounded-none hover:bg-zinc-800 font-bold uppercase tracking-widest text-[10px] px-6 h-10">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-none border-2 border-black sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-tighter font-black text-3xl">Expediente de Cliente</DialogTitle>
          <DialogDescription className="font-medium text-xs">
            Complete los datos para habilitar facturación con comprobante o crédito.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Nombre Completo / Razón Social</Label>
              <Input id="name" name="name" required placeholder="Ej. Juan Perez Solis" className="rounded-none border-black border-2 h-11 font-black" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_type" className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Tipo Documento</Label>
                <Select name="tax_type" defaultValue="CEDULA">
                  <SelectTrigger className="rounded-none border-black border-2 h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-black">
                    <SelectItem value="CEDULA">CEDULA</SelectItem>
                    <SelectItem value="RNC">RNC</SelectItem>
                    <SelectItem value="PASAPORTE">PASAPORTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id" className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Número Documento</Label>
                <Input id="tax_id" name="tax_id" required placeholder="101000000" className="rounded-none border-black border-2 h-11 font-bold font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Teléfono</Label>
                <Input id="phone" name="phone" placeholder="8091234567" className="rounded-none border-black border-2 h-11 font-bold" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit_limit" className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Límite Crédito</Label>
                <Input id="credit_limit" name="credit_limit" type="number" defaultValue="0" className="rounded-none border-black border-2 h-11 font-black text-blue-600" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Correo Electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="cliente@ejemplo.com" className="rounded-none border-black border-2 h-11 font-bold" />
            </div>
          </div>

          {state?.error && (
            <div className="bg-red-50 border-l-4 border-red-600 p-3">
               <p className="text-[10px] text-red-600 font-black uppercase tracking-tight">
                 Error: {state.error}
               </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={isPending} className="w-full h-14 bg-black text-white font-black uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-all shadow-lg active:scale-95">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Guardar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
