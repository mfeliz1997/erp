'use client';

import { useState } from 'react';
import { updateEmployeeAction } from '@/modules/settings/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Employee = {
  id: string;
  full_name: string;
  phone: string;
  is_owner: boolean;
};

export function EditEmployeeModal({ employee, children }: { employee: Employee, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append('employeeId', employee.id);

    const result = await updateEmployeeAction(formData);

    if (result.success) {
      toast.success("Empleado actualizado");
      setIsOpen(false);
    } else {
      toast.error(result.error || "Ocurrió un error");
    }
    setIsPending(false);
  };

  if (employee.is_owner) {
    return <span className="opacity-50 cursor-not-allowed">{children}</span>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar a {employee.full_name}</DialogTitle>
          <DialogDescription>
            Modifica la contraseña o el número. Para que el usuario no pueda entrar más, selecciona "Desactivar empleado".
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Nuevo Teléfono (Opcional)</Label>
            <Input name="phone" defaultValue={employee.phone || ''} placeholder="809..." />
          </div>
          <div className="grid gap-2">
            <Label>Nueva Contraseña (Opcional)</Label>
            <Input name="password" type="password" minLength={6} placeholder="Dejar en blanco para no cambiar" />
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-md border border-red-100">
            <Checkbox id={`deactivate-${employee.id}`} name="deactivate" />
            <label htmlFor={`deactivate-${employee.id}`} className="text-sm font-medium text-red-700 leading-none cursor-pointer">
              Desactivar empleado (Bloquear acceso)
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
