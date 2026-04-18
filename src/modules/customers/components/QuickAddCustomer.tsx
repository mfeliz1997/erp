"use client";

import { useActionState, useEffect, useState } from "react";
import { createCustomer, ActionState } from "../actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface QuickAddCustomerProps {
  onCustomerAdded?: (customer: any) => void;
}

export function QuickAddCustomer({ onCustomerAdded }: QuickAddCustomerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: ActionState = { success: false, error: "" };
  
  const [state, action, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createCustomer(prev, formData);
    if (result.success && result.data) {
      setIsOpen(false);
      toast.success("Cliente registrado y seleccionado");
      if (onCustomerAdded) {
        onCustomerAdded(result.data);
      }
    }
    return result;
  }, initialState);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 rounded-none border-dashed border-2 font-bold uppercase tracking-widest text-[9px] gap-2 hover:bg-zinc-50 transition-colors">
          <UserPlus className="w-3.5 h-3.5" />
          Registrar Cliente Rápido
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-2 border-black sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-tighter font-black text-3xl">Alta de Cliente</DialogTitle>
          <DialogDescription className="font-medium text-xs">
            Registre al cliente para facturación con crédito o NCF.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2 col-span-2">
                <Label htmlFor="name" className="uppercase text-[9px] font-bold tracking-widest text-zinc-400">Nombre / Razón Social</Label>
                <Input id="name" name="name" required placeholder="Ej. Juan Perez" className="rounded-none border-black border-2 h-10 font-bold" />
             </div>
             
             <div className="space-y-2">
                <Label htmlFor="tax_id" className="uppercase text-[9px] font-bold tracking-widest text-zinc-400">RNC / Cédula</Label>
                <Input id="tax_id" name="tax_id" required placeholder="00100000000" className="rounded-none border-black border-2 h-10 font-bold font-mono" />
             </div>

             <div className="space-y-2">
                <Label htmlFor="credit_limit" className="uppercase text-[9px] font-bold tracking-widest text-zinc-400">Límite Crédito</Label>
                <Input id="credit_limit" name="credit_limit" type="number" defaultValue="0" className="rounded-none border-black border-2 h-10 font-bold" />
             </div>
             
             <div className="space-y-2 col-span-2">
                <Label htmlFor="phone" className="uppercase text-[9px] font-bold tracking-widest text-zinc-400">Teléfono (WhatsApp)</Label>
                <Input id="phone" name="phone" placeholder="8090000000" className="rounded-none border-black border-2 h-10 font-bold" />
             </div>
          </div>

          {state?.error && (
            <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight bg-red-50 p-2 border border-red-100">
               ⚠️ {state.error}
            </p>
          )}

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={isPending} className="w-full h-12 bg-black text-white font-black uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-colors">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar y Seleccionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
