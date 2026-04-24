'use client';

import { useState, useRef } from 'react';
import { createEmployeeAction } from '@/modules/settings/actions';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { UserPlus, ShieldCheck, Phone, Lock, User, Loader2, KeyRound, CreditCard, Landmark, Clock, Monitor, ShoppingBag, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from '@/types/auth';
import { ALL_ROUTES, ROLE_DEFAULT_ROUTES } from '@/types/auth';

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'pos',     label: 'Cajero',  description: 'Acceso básico al POS'         },
  { value: 'manager', label: 'Gerente', description: 'POS + Inventario + Historial' },
  { value: 'hr',      label: 'RRHH',    description: 'Sin accesos por defecto'       },
];

interface Register { id: string; name: string; }

export function EmployeeForm({ tenantDomain, registers }: { tenantDomain: string; registers: Register[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('pos');
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(ROLE_DEFAULT_ROUTES['pos']);
  const [canGiveCredit, setCanGiveCredit]         = useState(false);
  const [canUseCard, setCanUseCard]               = useState(false);
  const [canUseTransfer, setCanUseTransfer]       = useState(false);
  const [canSellWithoutShift, setCanSellWithoutShift] = useState(false);
  const [canEditCustomers, setCanEditCustomers]       = useState(false);
  const [assignedRegisterId, setAssignedRegisterId]   = useState<string>('none');
  const [newCredentials, setNewCredentials] = useState<{ name: string; email: string; pass: string } | null>(null);

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
    selectedRoutes.forEach(r => formData.append('routes', r));
    formData.set('role', selectedRole);
    formData.set('can_give_credit', String(canGiveCredit));
    formData.set('can_use_card', String(canUseCard));
    formData.set('can_use_transfer', String(canUseTransfer));
    formData.set('can_sell_without_shift', String(canSellWithoutShift));
    formData.set('can_edit_customers', String(canEditCustomers));
    formData.set('assigned_register_id', assignedRegisterId === 'none' ? '' : assignedRegisterId);

    const rawName = formData.get('name') as string;
    const rawPass = formData.get('password') as string;
    const generatedEmail = `${rawName.toLowerCase().replace(/\s+/g, '')}@${tenantDomain}.com`;

    const result = await createEmployeeAction(formData);

    if (result.success) {
      toast.success('Empleado creado exitosamente');
      formRef.current?.reset();
      setSelectedRole('pos');
      setSelectedRoutes(ROLE_DEFAULT_ROUTES['pos']);
      setCanGiveCredit(false);
      setCanUseCard(false);
      setCanUseTransfer(false);
      setCanSellWithoutShift(false);
      setCanEditCustomers(false);
      setAssignedRegisterId('none');
      setNewCredentials({ name: rawName, email: generatedEmail, pass: rawPass });
    } else {
      toast.error(result.error);
    }
    setIsPending(false);
  };

  if (newCredentials) {
    return (
      <div className="border border-gray-200 bg-white p-8 shadow-sm rounded-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary text-primary-foreground">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-semibold">¡USUARIO CREADO!</h2>
        </div>
        <p className="text-xs font-bold text-gray-400 leading-relaxed">
          Copia esta información y envíasela a <strong className="text-black">{newCredentials.name}</strong>.
        </p>
        <div className="bg-gray-50 p-6 border-2 border-gray-200 space-y-4">
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1 text-center">Usuario / Correo</p>
            <p className="font-semibold text-sm text-black text-center select-all bg-white border border-gray-200 p-2">{newCredentials.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1 text-center">Contraseña temporal</p>
            <p className="font-semibold text-sm text-black text-center select-all bg-white border border-gray-200 p-2">{newCredentials.pass}</p>
          </div>
        </div>
        <Button onClick={() => setNewCredentials(null)} className="w-full h-14 rounded-xl">
          + Crear otro empleado
        </Button>
      </div>
    );
  }

  const showPin = selectedRole === 'manager';

  return (
    <div className="border border-gray-200 bg-white p-8 shadow-sm rounded-xl space-y-10">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
        <div className="p-3 bg-primary text-primary-foreground">
          <UserPlus className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold leading-none">Nuevo Ingreso</h2>
          <p className="text-xs font-semibold text-gray-400">Apertura de accesos para personal activo</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        {/* Identity */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-400">Nombre Completo</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
              <input name="name" required placeholder="EJ: MARIA LOPEZ"
                className="w-full h-14 pl-12 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-200" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-400">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                <input name="phone" placeholder="809..."
                  className="w-full h-14 pl-12 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-200" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-400">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                <input name="password" type="password" required minLength={6} placeholder="******"
                  className="w-full h-14 pl-12 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Role selector */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-gray-400">Rol</Label>
          <div className="grid grid-cols-3 gap-3">
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleRoleChange(opt.value)}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  selectedRole === opt.value
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <p className="text-xs font-bold">{opt.label}</p>
                <p className={`text-xs mt-1 ${selectedRole === opt.value ? 'text-gray-300' : 'text-gray-400'}`}>
                  {opt.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* PIN for manager */}
        {showPin && (
          <div className="space-y-2 p-5 border border-amber-200 bg-amber-50 rounded-xl">
            <Label className="text-xs font-semibold text-amber-700 flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> PIN de Autorización (4 dígitos)
            </Label>
            <input
              name="pin_code"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              placeholder="0000"
              className="w-full h-14 px-4 border border-amber-200 bg-white rounded-xl font-semibold text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-300"
            />
            <p className="text-xs text-amber-600">Este PIN permite al gerente autorizar ventas a crédito desde el POS.</p>
          </div>
        )}

        {/* Payment permissions */}
        <div className="p-5 border border-gray-200 rounded-xl space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500">Permisos de cobro</p>
            <p className="text-xs text-gray-400 mt-0.5">Sin permiso, el cajero necesita PIN de manager para ese método.</p>
          </div>

          {/* Credit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs font-semibold">Crédito (Fiao)</p>
                <p className="text-xs text-gray-400">Puede registrar ventas a crédito</p>
              </div>
            </div>
            <Switch checked={canGiveCredit} onCheckedChange={setCanGiveCredit} />
          </div>
          {canGiveCredit && (
            <div className="space-y-2 pl-8 pt-1">
              <Label className="text-xs font-semibold text-gray-400">Días máximos de crédito</Label>
              <input
                name="max_credit_days"
                type="number"
                min={1}
                max={365}
                defaultValue={30}
                className="w-full h-12 px-4 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          )}

          {/* Card */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-500" />
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
              <Landmark className="w-5 h-5 text-gray-500" />
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
              <ShoppingBag className="w-5 h-5 text-gray-500" />
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
              <Users className="w-5 h-5 text-gray-500" />
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
          <div className="p-5 border border-gray-200 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs font-semibold">Caja asignada</p>
                <p className="text-xs text-gray-400">El cajero solo podrá abrir esta caja</p>
              </div>
            </div>
            <Select value={assignedRegisterId} onValueChange={setAssignedRegisterId}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200 border-2 text-sm font-semibold">
                <SelectValue placeholder="Sin asignar (libre elección)" />
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
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-gray-400">Módulos Autorizados</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6 bg-gray-50 border border-gray-200 rounded-xl">
            {ALL_ROUTES.map((route) => (
              <div key={route.path} className="flex items-center space-x-3 group">
                <Checkbox
                  id={`create-${route.path}`}
                  checked={selectedRoutes.includes(route.path)}
                  onCheckedChange={(checked) => toggleRoute(route.path, !!checked)}
                  className="w-5 h-5 border border-gray-200 rounded-md data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <label htmlFor={`create-${route.path}`} className="text-xs font-semibold cursor-pointer group-hover:text-blue-600 transition-colors">
                  {route.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full h-16 font-semibold rounded-xl" disabled={isPending}>
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'VINCULAR EMPLEADO'}
        </Button>
      </form>
    </div>
  );
}
