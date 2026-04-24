'use client';

import { useState } from 'react';
import { updateEmployeeAction } from '@/modules/settings/actions';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound, CreditCard, Landmark, Clock, ShieldOff, Monitor, ShoppingBag, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole, UserProfile } from '@/types/auth';
import { ALL_ROUTES, ROLE_DEFAULT_ROUTES } from '@/types/auth';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'pos',     label: 'Cajero'  },
  { value: 'manager', label: 'Gerente' },
  { value: 'hr',      label: 'RRHH'    },
];

interface Register { id: string; name: string; }

type EditableEmployee = Pick<UserProfile,
  'id' | 'full_name' | 'phone' | 'role' | 'allowed_routes' |
  'can_give_credit' | 'max_credit_days' | 'can_use_card' | 'can_use_transfer' |
  'can_sell_without_shift' | 'assigned_register_id' |
  'pin_code' | 'is_owner'
> & { can_edit_customers?: boolean };

export function EditEmployeeModal({
  employee,
  registers = [],
  children,
}: {
  employee: EditableEmployee;
  registers?: Register[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(employee.role);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(employee.allowed_routes ?? []);
  const [canGiveCredit, setCanGiveCredit]             = useState(employee.can_give_credit ?? false);
  const [canUseCard, setCanUseCard]                   = useState(employee.can_use_card ?? false);
  const [canUseTransfer, setCanUseTransfer]           = useState(employee.can_use_transfer ?? false);
  const [canSellWithoutShift, setCanSellWithoutShift] = useState(employee.can_sell_without_shift ?? false);
  const [canEditCustomers, setCanEditCustomers]       = useState(employee.can_edit_customers ?? false);
  const [assignedRegisterId, setAssignedRegisterId]   = useState<string>(employee.assigned_register_id ?? 'none');

  function handleRoleChange(role: UserRole) {
    setSelectedRole(role);
    setSelectedRoutes(ROLE_DEFAULT_ROUTES[role]);
    if (role !== 'manager' && role !== 'admin') setCanGiveCredit(false);
  }

  function toggleRoute(path: string, checked: boolean) {
    setSelectedRoutes(prev =>
      checked ? [...prev, path] : prev.filter(r => r !== path)
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    formData.set('employeeId', employee.id);
    formData.set('role', selectedRole);
    selectedRoutes.forEach(r => formData.append('routes', r));
    formData.set('can_give_credit', String(canGiveCredit));
    formData.set('can_use_card', String(canUseCard));
    formData.set('can_use_transfer', String(canUseTransfer));
    formData.set('can_sell_without_shift', String(canSellWithoutShift));
    formData.set('can_edit_customers', String(canEditCustomers));
    formData.set('assigned_register_id', assignedRegisterId === 'none' ? '' : assignedRegisterId);

    const result = await updateEmployeeAction(formData);

    if (result.success) {
      toast.success('Empleado actualizado');
      setIsOpen(false);
    } else {
      toast.error(result.error ?? 'Ocurrió un error');
    }
    setIsPending(false);
  };

  if (employee.is_owner) {
    return <span className="opacity-50 cursor-not-allowed">{children}</span>;
  }

  const showPin = selectedRole === 'manager' || selectedRole === 'admin';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{employee.full_name}</DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Modifica permisos, crédito, contraseña o acceso del empleado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-400">Teléfono</Label>
              <input name="phone" defaultValue={employee.phone ?? ''} placeholder="809..."
                className="w-full h-12 px-4 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-300" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-400">Nueva contraseña</Label>
              <input name="password" type="password" minLength={6} placeholder="Dejar en blanco"
                className="w-full h-12 px-4 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-300" />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-400">Rol</Label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleRoleChange(opt.value)}
                  className={`py-3 border-2 rounded-xl text-xs font-bold transition-all ${
                    selectedRole === opt.value
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          {showPin && (
            <div className="space-y-2 p-4 border border-amber-200 bg-amber-50 rounded-xl">
              <Label className="text-xs font-semibold text-amber-700 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> PIN de Autorización (4 dígitos)
              </Label>
              <input
                name="pin_code"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder={employee.pin_code ? '••••' : '0000'}
                className="w-full h-12 px-4 border border-amber-200 bg-white rounded-xl font-semibold text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-300"
              />
            </div>
          )}

          {/* Payment permissions */}
          <div className="p-4 border border-gray-200 rounded-xl space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500">Permisos de cobro</p>
              <p className="text-xs text-gray-400 mt-0.5">Sin permiso, el cajero necesita PIN de manager para ese método.</p>
            </div>

            {/* Credit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs font-semibold">Crédito (Fiao)</p>
                  <p className="text-xs text-gray-400">Puede registrar ventas a crédito</p>
                </div>
              </div>
              <Switch checked={canGiveCredit} onCheckedChange={setCanGiveCredit} />
            </div>
            {canGiveCredit && (
              <div className="space-y-2 pl-7 pt-1">
                <Label className="text-xs font-semibold text-gray-400">Días máximos de crédito</Label>
                <input
                  name="max_credit_days"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={employee.max_credit_days ?? 30}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            )}

            {/* Card */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs font-semibold">Tarjeta sin PIN</p>
                  <p className="text-xs text-gray-400">Puede cobrar con tarjeta directamente</p>
                </div>
              </div>
              <Switch checked={canUseCard} onCheckedChange={setCanUseCard} />
            </div>

            {/* Transfer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Landmark className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs font-semibold">Transferencia sin PIN</p>
                  <p className="text-xs text-gray-400">Puede cobrar por transferencia directamente</p>
                </div>
              </div>
              <Switch checked={canUseTransfer} onCheckedChange={setCanUseTransfer} />
            </div>

            {/* Sell without shift */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs font-semibold">Vender sin caja abierta</p>
                  <p className="text-xs text-gray-400">No requiere abrir turno para vender</p>
                </div>
              </div>
              <Switch checked={canSellWithoutShift} onCheckedChange={setCanSellWithoutShift} />
            </div>

            {/* Edit customers */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs font-semibold">Editar Clientes</p>
                  <p className="text-xs text-gray-400">Puede editar datos, RNC y límite de crédito</p>
                </div>
              </div>
              <Switch checked={canEditCustomers} onCheckedChange={setCanEditCustomers} />
            </div>
          </div>

          {/* Assigned register */}
          {registers.length > 0 && (
            <div className="p-4 border border-gray-200 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs font-semibold">Caja asignada</p>
                  <p className="text-xs text-gray-400">El cajero solo podrá abrir esta caja</p>
                </div>
              </div>
              <Select value={assignedRegisterId} onValueChange={setAssignedRegisterId}>
                <SelectTrigger className="h-10 rounded-xl border-gray-200 border text-xs font-semibold">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-200">
                  <SelectItem value="none" className="rounded-xl text-xs font-semibold">Sin asignar (libre elección)</SelectItem>
                  {registers.map(r => (
                    <SelectItem key={r.id} value={r.id} className="rounded-xl text-xs font-semibold">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Routes */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-400">Módulos Autorizados</Label>
            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              {ALL_ROUTES.map((route) => (
                <div key={route.path} className="flex items-center space-x-2 group">
                  <Checkbox
                    id={`edit-${employee.id}-${route.path}`}
                    checked={selectedRoutes.includes(route.path)}
                    onCheckedChange={(checked) => toggleRoute(route.path, !!checked)}
                    className="w-4 h-4 border border-gray-200 rounded data-[state=checked]:bg-black data-[state=checked]:border-black"
                  />
                  <label htmlFor={`edit-${employee.id}-${route.path}`} className="text-xs font-semibold cursor-pointer group-hover:text-blue-600 transition-colors">
                    {route.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Deactivate */}
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <ShieldOff className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-700">Bloquear acceso al sistema</p>
              <p className="text-xs text-red-400">El empleado no podrá iniciar sesión</p>
            </div>
            <Checkbox
              id={`deactivate-${employee.id}`}
              name="deactivate"
              className="w-4 h-4 border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
            />
          </div>

          <Button type="submit" className="w-full h-14 rounded-xl font-semibold" disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
