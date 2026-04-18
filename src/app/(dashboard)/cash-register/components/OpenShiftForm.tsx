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
}

export function OpenShiftForm({ registers }: OpenShiftFormProps) {
  const initialState: ActionState = { success: false, error: '' };
  const [state, action, isPending] = useActionState(openShift, initialState);

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader className="bg-black text-white rounded-none">
          <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-lg">
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
              <Label className="uppercase font-bold text-xs tracking-widest">Seleccionar Caja</Label>
              <Select name="register_id" required>
                <SelectTrigger className="rounded-none border-black border-2 h-12">
                  <SelectValue placeholder="Busque una caja..." />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-black">
                  {registers.map((reg) => (
                    <SelectItem key={reg.id} value={reg.id} className="rounded-none">
                      {reg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="uppercase font-bold text-xs tracking-widest">Monto de Apertura (Base)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">RD$</span>
                <Input
                  name="opening_amount"
                  type="number"
                  step="0.01"
                  required
                  defaultValue="0.00"
                  className="pl-12 rounded-none border-black border-2 h-12 text-lg font-bold"
                />
              </div>
              <p className="text-[10px] text-gray-500">Dinero disponible en caja al iniciar el turno.</p>
            </div>

            {state?.error && (
              <Alert variant="destructive" className="rounded-none border-2">
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
            className="w-full bg-black hover:bg-gray-800 text-white font-bold h-12 rounded-none uppercase tracking-[0.2em] transition-all active:scale-95"
          >
            {isPending ? 'Abriendo turno...' : 'Iniciar Turno'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
