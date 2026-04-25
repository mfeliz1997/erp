'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { openShift, ActionState } from '@/modules/pos/actions/cash-actions';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, MonitorSmartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OpenShiftDialogProps {
  registers: any[];
  fixedRegister?: boolean;
  trigger?: React.ReactNode;
}

export function OpenShiftDialog({ registers, fixedRegister = false, trigger }: OpenShiftDialogProps) {
  const initialState: ActionState = { success: false, error: '' };
  const [state, action, isPending] = useActionState(openShift, initialState);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Small delay so the dialog animation completes before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="gap-2">
            <MonitorSmartphone className="w-4 h-4" />
            Abrir mi propio turno
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Apertura de Caja</DialogTitle>
          <DialogDescription>
            Inicie un nuevo turno para comenzar a vender.
          </DialogDescription>
        </DialogHeader>

        <form action={action} id="open-shift-dialog-form" className="space-y-5 py-1">
          {/* Register selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Caja
              {fixedRegister && (
                <span className="ml-1.5 text-[10px] font-semibold bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded">
                  Asignada
                </span>
              )}
            </Label>
            {fixedRegister ? (
              <>
                <input type="hidden" name="register_id" value={registers[0]?.id} />
                <div className="h-11 rounded-lg border border-border bg-muted/50 px-4 flex items-center text-sm font-medium text-foreground">
                  {registers[0]?.name}
                </div>
                <p className="text-xs text-muted-foreground">Tu administrador asignó esta caja.</p>
              </>
            ) : (
              <Select name="register_id" required>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona una caja…" />
                </SelectTrigger>
                <SelectContent>
                  {registers.map((reg) => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Big amount input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Monto de Apertura (Base)</Label>
            <div className="flex h-14 rounded-lg border border-border overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 transition-shadow">
              <span className="flex items-center px-4 bg-muted text-muted-foreground text-sm font-medium select-none border-r border-border">
                RD$
              </span>
              <input
                ref={inputRef}
                name="opening_amount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue="0.00"
                className="flex-1 px-4 text-2xl font-bold tabular-nums bg-background text-foreground outline-none w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">Dinero disponible en caja al iniciar el turno.</p>
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter>
          <Button
            form="open-shift-dialog-form"
            type="submit"
            disabled={isPending}
            className="w-full h-11 font-semibold"
          >
            {isPending ? 'Abriendo turno…' : 'Iniciar Turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
