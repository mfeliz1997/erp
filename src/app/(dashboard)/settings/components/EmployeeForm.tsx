'use client';

import { useState, useRef } from 'react';
import { createEmployeeAction } from '@/modules/settings/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { UserPlus, ShieldCheck, Phone, Lock, User, Loader2 } from "lucide-react";

const ROUTES = [
  { id: '/overview', label: 'Resumen' },
  { id: '/pos', label: 'Punto de Venta' },
  { id: '/invoices', label: 'Historial' },
  { id: '/inventory', label: 'Inventario' },
  { id: '/debts', label: 'Cuentas por Cobrar' },
  { id: '/fiscal', label: 'Fiscal' },
  { id: '/activity', label: 'Auditoría' },
];

export function EmployeeForm({ tenantDomain }: { tenantDomain: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(['/pos']);
  const [newCredentials, setNewCredentials] = useState<{ name: string, email: string, pass: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    selectedRoutes.forEach(r => formData.append('routes', r));

    const rawName = formData.get('name') as string;
    const rawPass = formData.get('password') as string;
    const generatedEmail = `${rawName.toLowerCase().replace(/\s+/g, '')}@${tenantDomain}.com`;

    const result = await createEmployeeAction(formData);

    if (result.success) {
      toast.success("Empleado creado exitosamente");
      formRef.current?.reset();
      setSelectedRoutes(['/pos']);
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
          <h2 className="text-3xl font-semibold   ">¡USUARIO CREADO!</h2>
        </div>

        <p className="text-xs font-bold text-gray-400   leading-relaxed">
          Copia esta información y envíasela a <strong className="text-black">{newCredentials.name}</strong> para que pueda ingresar al sistema.
        </p>

        <div className="bg-gray-50 p-6 border-2 border-solid border-gray-200 space-y-4">
          <div>
            <p className="text-xs text-gray-500  font-semibold  mb-1 text-center">Usuario / Correo</p>
            <p className="font-semibold text-sm text-black text-center select-all bg-white border border-gray-200 p-2">{newCredentials.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500  font-semibold  mb-1 text-center">Contraseña temporal</p>
            <p className="font-semibold text-sm text-black text-center select-all bg-white border border-gray-200 p-2">{newCredentials.pass}</p>
          </div>
        </div>

        <Button
          onClick={() => setNewCredentials(null)}
          className="w-full h-14 bg-primary text-primary-foreground font-semibold   rounded-xl hover:bg-zinc-800 transition-all"
        >
          + Crear otro empleado
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-white p-8 shadow-sm rounded-xl space-y-10">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
        <div className="p-3 bg-primary text-primary-foreground">
          <UserPlus className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold    leading-none">Nuevo Ingreso</h2>
          <p className="text-xs font-semibold text-gray-400  ">Apertura de accesos para personal activo</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className=" text-xs font-semibold  text-gray-400">Nombre Completo</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
              <input name="name" required placeholder="EJ: MARIA LOPEZ" className="w-full h-14 pl-12 border border-gray-200 rounded-xl font-semibold text-sm   focus:outline-none placeholder:text-gray-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className=" text-xs font-semibold  text-gray-400">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                <input name="phone" placeholder="809..." className="w-full h-14 pl-12 border border-gray-200 rounded-xl font-semibold text-sm   focus:outline-none placeholder:text-gray-100" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className=" text-xs font-semibold  text-gray-400">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                <input name="password" type="password" required minLength={6} placeholder="******" className="w-full h-14 pl-12 border border-gray-200 rounded-xl font-semibold text-sm   focus:outline-none placeholder:text-gray-100" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className=" text-xs font-semibold  text-gray-400 ">Módulos Autorizados</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6 bg-gray-50 border border-gray-200 border-solid">
            {ROUTES.map((route) => (
              <div key={route.id} className="flex items-center space-x-3 group">
                <Checkbox
                  id={route.id}
                  checked={selectedRoutes.includes(route.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedRoutes([...selectedRoutes, route.id]);
                    else if (route.id !== '/pos') setSelectedRoutes(selectedRoutes.filter(r => r !== route.id));
                  }}
                  className="w-5 h-5 border border-gray-200 rounded-xl data-[state=checked]:bg-black"
                />
                <label htmlFor={route.id} className="text-xs font-semibold   cursor-pointer group-hover:text-blue-600 transition-colors">{route.label}</label>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full h-16 bg-primary text-primary-foreground font-semibold   rounded-xl hover:bg-zinc-800 transition-all shadow-sm rounded-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" disabled={isPending}>
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "VINCULAR EMPLEADO"}
        </Button>
      </form>
    </div>
  );
}