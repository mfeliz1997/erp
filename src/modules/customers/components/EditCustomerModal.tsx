"use client";

import { useActionState, useState, useEffect } from "react";
import { updateCustomer, ActionState } from "../actions/customer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  tax_type: string;
  tax_id: string;
  phone?: string | null;
  email?: string | null;
  credit_limit: number;
  company_name?: string | null;
}

interface EditCustomerModalProps {
  customer: Customer;
}

export function EditCustomerModal({ customer }: EditCustomerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: ActionState = { success: false };

  const [state, action, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await updateCustomer(prev, formData);
      if (result.success) {
        setIsOpen(false);
        toast.success("Cliente actualizado");
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
        >
          <Pencil className="w-3.5 h-3.5 text-gray-500" />
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-xl border border-gray-200 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-semibold text-2xl">Editar Cliente</DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Modifica los datos del expediente del cliente.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-5 py-2">
          <input type="hidden" name="id" value={customer.id} />

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-400">Nombre Completo / Razón Social</Label>
            <Input
              name="name"
              required
              defaultValue={customer.name}
              className="rounded-xl border-black border-2 h-11 font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-400">Empresa (opcional)</Label>
            <Input
              name="company_name"
              defaultValue={customer.company_name ?? ""}
              placeholder="Ej. Distribuidora Pérez SRL"
              className="rounded-xl border-gray-200 border h-11 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">Tipo Documento</Label>
              <Select name="tax_type" defaultValue={customer.tax_type ?? "CEDULA"}>
                <SelectTrigger className="rounded-xl border-black border-2 h-11 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-200">
                  <SelectItem value="CEDULA">CEDULA</SelectItem>
                  <SelectItem value="RNC">RNC</SelectItem>
                  <SelectItem value="PASAPORTE">PASAPORTE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">Número Documento</Label>
              <Input
                name="tax_id"
                required
                defaultValue={customer.tax_id ?? ""}
                placeholder="101000000"
                className="rounded-xl border-black border-2 h-11 font-bold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">Teléfono</Label>
              <Input
                name="phone"
                defaultValue={customer.phone ?? ""}
                placeholder="8091234567"
                className="rounded-xl border-black border-2 h-11 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">Límite Crédito (RD$)</Label>
              <Input
                name="credit_limit"
                type="number"
                min={0}
                defaultValue={customer.credit_limit ?? 0}
                className="rounded-xl border-black border-2 h-11 font-semibold text-blue-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-400">Correo Electrónico</Label>
            <Input
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
              placeholder="cliente@ejemplo.com"
              className="rounded-xl border-gray-200 border h-11 font-bold"
            />
          </div>

          {state?.error && (
            <div className="bg-red-50 border-l-4 border-red-600 p-3">
              <p className="text-xs text-red-600 font-semibold tracking-tight">
                Error: {state.error}
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-zinc-800 transition-all"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
