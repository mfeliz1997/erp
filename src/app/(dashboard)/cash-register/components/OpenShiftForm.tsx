'use client';

import { useActionState } from 'react';
import { openShift, ActionState } from '@/modules/pos/actions/cash-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Wallet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OpenShiftFormProps {
  registers: any[];
  fixedRegister?: boolean;
}

export function OpenShiftForm({ registers, fixedRegister = false }: OpenShiftFormProps) {
  const initialState: ActionState = { success: false, error: '' };
  const [state, action, isPending] = useActionState(openShift, initialState);

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="border border-gray-200 rounded-xl shadow-sm rounded-xl">
        <CardHeader className="bg-primary text-primary-foreground rounded-xl">
          <CardTitle className="flex items-center gap-2   text-lg">
            <Wallet className="w-5 h-5" />
            Apertura de Caja
          </CardTitle>
          <CardDescription className="text-gray-400">
            Inicie un nuevo turno para comenzar a vender.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={action} id="open-shift-form" className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-xs flex items-center gap-1.5">
                Caja
                {fixedRegister && (
                  <span className="text-[10px] font-semibold bg-gray-100 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                    Asignada
                  </span>
                )}
              </Label>
              {fixedRegister ? (
                <>
                  <input type="hidden" name="register_id" value={registers[0]?.id} />
                  <div className="h-12 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 flex items-center text-sm font-semibold text-gray-700">
                    {registers[0]?.name}
                  </div>
                  <p className="text-xs text-gray-400">Tu administrador asignó esta caja.</p>
                </>
              ) : (
                <Select name="register_id" required>
                  <SelectTrigger className="rounded-xl border-black border-2 h-12">
                    <SelectValue placeholder="Busque una caja..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-200">
                    {registers.map((reg) => (
                      <SelectItem key={reg.id} value={reg.id} className="rounded-xl">
                        {reg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className=" font-bold text-xs ">Monto de Apertura (Base)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">RD$</span>
                <Input
                  name="opening_amount"
                  type="number"
                  step="0.01"
                  required
                  defaultValue="0.00"
                  className="pl-12 rounded-xl border-black border-2 h-12 text-lg font-bold"
                />
              </div>
              <p className="text-xs text-gray-500">Dinero disponible en caja al iniciar el turno.</p>
            </div>

            {state?.error && (
              <Alert variant="destructive" className="rounded-xl border-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            form="open-shift-form"
            type="submit" 
            disabled={isPending}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold h-12 rounded-xl   transition-all active:scale-95"
          >
            {isPending ? 'Abriendo turno...' : 'Iniciar Turno'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
