"use client";

import { useActionState, useState, useEffect } from "react";
import { registerPayment, DebtActionState } from "../actions/debt-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";

interface PaymentDialogProps {
  customer: any;
}

export function PaymentDialog({ customer }: PaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: DebtActionState = { success: false, error: "" };
  const [state, action, isPending] = useActionState(registerPayment, initialState);

  useEffect(() => {
    if (state.success) {
      setIsOpen(false);
      toast.success("Pago registrado con éxito");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-8 rounded-xl border-2 border-green-600 text-green-700 font-semibold  text-xs  hover:bg-green-50">
          Abonar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-xl border border-gray-200">
        <DialogHeader>
          <DialogTitle className="  font-semibold text-3xl">Registrar Pago</DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Registrando abono para <span className="text-black font-bold ">{customer.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4 py-4">
          <input type="hidden" name="customer_id" value={customer.id} />
          
          <div className="bg-zinc-50 p-4 border border-gray-200 border-solid mb-4">
             <p className="text-xs font-bold   text-zinc-400">Deuda Actual</p>
             <p className="text-3xl font-semibold text-red-600">RD$ {customer.current_debt.toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <Label className=" text-xs font-bold  text-zinc-400">Monto del Pago (RD$)</Label>
            <Input name="amount" type="number" max={customer.current_debt} required className="rounded-xl border border-gray-200 h-12 font-semibold text-2xl text-green-600" />
          </div>

          <div className="space-y-2">
            <Label className=" text-xs font-bold  text-zinc-400">Método de Pago</Label>
            <Select name="payment_method" defaultValue="cash">
              <SelectTrigger className="rounded-xl border border-gray-200 h-12 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-200">
                <SelectItem value="cash">💵 Efectivo</SelectItem>
                <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                <SelectItem value="card">💳 Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className=" text-xs font-bold  text-zinc-400">Notas / Referencia</Label>
            <Input name="notes" placeholder="Ej: Pago parcial, Transf 1234" className="rounded-xl border border-gray-200 h-12 font-bold" />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={isPending} className="w-full h-14 bg-green-600 text-white font-semibold   rounded-xl hover:bg-green-700 border border-gray-200 shadow-sm rounded-xl">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Abono"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
