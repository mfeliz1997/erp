"use client";

import { useActionState, useState, useEffect } from "react";
import { createRepairOrder, ActionState } from "../actions/repair-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NewRepairDialogProps {
  customers: any[];
}

export function NewRepairDialog({ customers }: NewRepairDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: ActionState = { success: false, error: "" };
  const [state, action, isPending] = useActionState(createRepairOrder, initialState);

  useEffect(() => {
    if (state.success) {
      setIsOpen(false);
      toast.success("Orden de reparación creada");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black text-white rounded-none font-bold uppercase tracking-widest text-xs h-12 px-6">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ingreso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-none border-2 border-black">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-tighter font-black text-3xl">Orden de Taller</DialogTitle>
          <DialogDescription className="text-xs font-medium">Registro de equipo para diagnóstico o reparación.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Cliente</Label>
            <Select name="customer_id" required>
              <SelectTrigger className="rounded-none border-2 border-black h-12 font-bold">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent className="rounded-none border-2 border-black">
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Marca</Label>
              <Input name="brand" placeholder="Ej: Apple, Samsung" required className="rounded-none border-2 border-black h-12 font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Modelo</Label>
              <Input name="model" placeholder="Ej: iPhone 15 Pro" required className="rounded-none border-2 border-black h-12 font-bold" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Falla Reportada</Label>
            <Textarea name="issue" placeholder="Describa el problema detalladamente" required className="rounded-none border-2 border-black min-h-[100px] font-medium" />
          </div>

          <div className="space-y-2">
            <Label className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Costo Estimado (RD$)</Label>
            <Input name="estimated_cost" type="number" defaultValue="0" className="rounded-none border-2 border-black h-12 font-black text-xl text-blue-600" />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={isPending} className="w-full h-14 bg-black text-white font-black uppercase tracking-widest rounded-none hover:bg-zinc-800">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Registrar Equipo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
