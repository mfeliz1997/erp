'use client';

import { useState, useRef } from 'react';
import { createEmployeeAction } from '@/modules/settings/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';

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
  const formRef = useRef<HTMLFormElement>(null); // SOLUCIÓN AL ERROR DEL RESET
  const [isPending, setIsPending] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(['/pos']);
  
  // NUEVO: Estado para guardar la info recién creada y mostrársela al dueño
  const [newCredentials, setNewCredentials] = useState<{name: string, email: string, pass: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    
    const formData = new FormData(e.currentTarget);
    selectedRoutes.forEach(r => formData.append('routes', r));

    // Capturamos los datos ANTES de mandarlos al servidor para mostrarlos luego
    const rawName = formData.get('name') as string;
    const rawPass = formData.get('password') as string;
    const generatedEmail = `${rawName.toLowerCase().replace(/\s+/g, '')}@${tenantDomain}.com`;

    const result = await createEmployeeAction(formData);

    if (result.success) {
      toast.success("Empleado creado exitosamente");
      formRef.current?.reset(); // Reset seguro usando useRef
      setSelectedRoutes(['/pos']);
      
      // Mostramos la pantalla de éxito con los datos
      setNewCredentials({
        name: rawName,
        email: generatedEmail,
        pass: rawPass
      });
    } else {
      toast.error(result.error);
    }
    setIsPending(false);
  };

  // Si acabamos de crear un usuario, mostramos sus credenciales
  if (newCredentials) {
    return (
      <Card className="border-green-200 shadow-sm bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-green-700 flex items-center gap-2">
            <span>✅</span> ¡Usuario Creado!
          </CardTitle>
          <CardDescription>
            Copia esta información y envíasela a <strong>{newCredentials.name}</strong> para que pueda ingresar al sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-green-100 space-y-2 relative">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Correo de Acceso (Usuario)</p>
              <p className="font-mono text-sm text-black font-semibold select-all">{newCredentials.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Contraseña</p>
              <p className="font-mono text-sm text-black font-semibold select-all">{newCredentials.pass}</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full border-green-200 text-green-700 hover:bg-green-50"
            onClick={() => setNewCredentials(null)}
          >
            + Crear otro empleado
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Formulario Normal
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo Empleado</CardTitle>
        <CardDescription>Crea un acceso interno para tu personal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Nombre del Empleado</Label>
            <Input name="name" required placeholder="Ej: Maria Lopez" />
          </div>
          <div className="grid gap-2">
            <Label>Teléfono</Label>
            <Input name="phone" placeholder="809..." />
          </div>
          <div className="grid gap-2">
            <Label>Contraseña</Label>
            <Input name="password" type="password" required minLength={6} placeholder="******" />
          </div>
          
          <div className="space-y-3">
            <Label>Permisos de acceso</Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-md border">
              {ROUTES.map((route) => (
                <div key={route.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={route.id}
                    checked={selectedRoutes.includes(route.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedRoutes([...selectedRoutes, route.id]);
                      else if (route.id !== '/pos') setSelectedRoutes(selectedRoutes.filter(r => r !== route.id));
                    }}
                  />
                  <label htmlFor={route.id} className="text-xs cursor-pointer">{route.label}</label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando..." : "Crear Cuenta de Empleado"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}