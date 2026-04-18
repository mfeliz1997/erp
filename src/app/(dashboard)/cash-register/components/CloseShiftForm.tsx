'use client';

import { useActionState } from 'react';
import { closeShift, ActionState } from '@/modules/pos/actions/cash-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CloseShiftFormProps {
  shift: any;
  expectedAmount: number;
}

export function CloseShiftForm({ shift, expectedAmount }: CloseShiftFormProps) {
  const initialState: ActionState = { success: false, error: '' };
  const [state, action, isPending] = useActionState(closeShift, initialState);

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="border border-gray-200 rounded-xl shadow-sm rounded-xl">
        <CardHeader className="bg-red-600 text-white rounded-xl">
          <CardTitle className="flex items-center gap-2   text-lg">
            <LogOut className="w-5 h-5" />
            Cierre de Turno
          </CardTitle>
          <CardDescription className="text-red-100">
            Realice el arqueo de caja para finalizar su jornada.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Resumen del Turno */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 border border-black rounded-xl">
              <span className="text-xs  font-bold text-gray-400 block">Base Inicial</span>
              <span className="font-bold">RD$ {shift.opening_amount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-gray-50 border border-black rounded-xl">
              <span className="text-xs  font-bold text-gray-400 block">Total Esperado</span>
              <span className="font-bold text-blue-600 underline decoration-2 decoration-blue-200">
                RD$ {expectedAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <form action={action} id="close-shift-form" className="space-y-6">
            <input type="hidden" name="shift_id" value={shift.id} />
            
            <div className="space-y-2">
              <Label className=" font-bold text-xs ">Efectivo Contado en Caja</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">RD$</span>
                <Input
                  name="counted_amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="pl-12 rounded-xl border-black border-2 h-14 text-2xl font-semibold focus:ring-red-500"
                />
              </div>
              <p className="text-xs text-gray-500 ">Cuente físicamente el dinero en el cajón.</p>
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
        <CardFooter className="flex-col gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                type="button"
                disabled={isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-14 rounded-xl   transition-all active:scale-95 shadow-lg"
              >
                {isPending ? 'Procesando cierre...' : 'Finalizar y Cerrar Caja'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border border-gray-200">
              <AlertDialogHeader>
                <AlertDialogTitle className=" font-semibold tracking-tight text-2xl">¿Confirmar Arqueo?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-bold  text-gray-500">
                  Una vez cerrada la caja, no podrá registrar más ventas en este turno. Asegúrese de que el monto contado sea correcto.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl border border-gray-200  font-bold text-xs ">Revisar de nuevo</AlertDialogCancel>
                <AlertDialogAction 
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white  font-bold text-xs "
                  onClick={() => {
                    const form = document.getElementById('close-shift-form') as HTMLFormElement;
                    form?.requestSubmit();
                  }}
                >
                  Sí, Cerrar Caja
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <div className="flex items-center gap-2 text-xs text-gray-400  font-medium">
             <CheckCircle2 className="w-3 h-3 text-green-500" />
             El sistema registrará la diferencia automáticamente.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
