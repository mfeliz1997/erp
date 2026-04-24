"use client";

import { useActionState, useState, useEffect } from "react";
import { registerPayment, DebtActionState } from "../actions/debt-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DebtRow {
  id: string;
  total_amount: number;
  balance: number;
  invoices: { customer_name: string | null; customer_id: string | null } | null;
}

interface PaymentDialogProps {
  debt: DebtRow;
}

export function PaymentDialog({ debt }: PaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: DebtActionState = { success: false, error: "" };
  const [state, action, isPending] = useActionState(registerPayment, initialState);

  const customerName = debt.invoices?.customer_name ?? "Cliente";
  const customerId   = debt.invoices?.customer_id ?? "";

  const fmt = (n: number) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

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
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-xl border-2 border-green-600 text-green-700 font-semibold text-xs hover:bg-green-50"
        >
          Abonar
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px] rounded-xl border border-gray-200">
        <DialogHeader>
          <DialogTitle className="font-semibold text-2xl">Registrar Pago</DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Abono para <span className="text-black font-bold">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4 py-2">
          <input type="hidden" name="debt_id"     value={debt.id} />
          <input type="hidden" name="customer_id" value={customerId} />

          {/* Balance summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 p-3 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Original</p>
              <p className="text-sm font-bold tabular-nums">{fmt(debt.total_amount)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-200">
              <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Pendiente</p>
              <p className="text-sm font-bold tabular-nums text-red-600">{fmt(debt.balance)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Monto a pagar (máx. {fmt(debt.balance)})
            </Label>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={debt.balance}
              required
              autoFocus
              className="rounded-xl border border-gray-200 h-12 font-bold text-2xl text-green-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Método de Pago
            </Label>
            <Select name="payment_method" defaultValue="cash">
              <SelectTrigger className="rounded-xl border border-gray-200 h-11 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-200">
                <SelectItem value="cash">💵 Efectivo</SelectItem>
                <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                <SelectItem value="card">💳 Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Abono"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
