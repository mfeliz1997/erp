'use client';

import { useActionState, useRef, useState } from 'react';
import { closeShift, ActionState, ShiftSummary } from '@/modules/pos/actions/cash-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle, AlertTriangle, LogOut, CheckCircle2,
  Banknote, CreditCard, ArrowLeftRight, Clock,
} from 'lucide-react';

// ── Payment method card config ────────────────────────────────────────────────
const METHOD_CONFIG = [
  {
    key: "cash_sales" as keyof ShiftSummary,
    label: "Efectivo",
    sublabel: "Físico en cajón",
    icon: Banknote,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    key: "card_sales" as keyof ShiftSummary,
    label: "Tarjeta",
    sublabel: "Débito / Crédito",
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    key: "transfer_sales" as keyof ShiftSummary,
    label: "Transferencia",
    sublabel: "Pago digital",
    icon: ArrowLeftRight,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    key: "credit_sales" as keyof ShiftSummary,
    label: "Crédito",
    sublabel: "Cuentas por cobrar",
    icon: Clock,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
];

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

// ── Component ─────────────────────────────────────────────────────────────────

interface CloseShiftFormProps {
  shift: { id: string; opening_amount: number; cash_registers?: { name: string } | null };
  summary: ShiftSummary;
}

export function CloseShiftForm({ shift, summary }: CloseShiftFormProps) {
  const initialState: ActionState = { success: false, error: '' };
  const [state, action, isPending] = useActionState(closeShift, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [showShortageDialog, setShowShortageDialog] = useState(false);
  const [shortage, setShortage] = useState(0);

  const isDiscrepancyWarning = state?.status === 'WARNING_DISCREPANCY';

  function handleCloseAttempt() {
    const countedInput = formRef.current?.elements.namedItem('counted_amount') as HTMLInputElement;
    const counted = parseFloat(countedInput?.value || '0');
    const diff = counted - summary.expected_amount;

    if (diff < -1) {
      setShortage(Math.abs(diff));
      setShowShortageDialog(true);
    } else {
      formRef.current?.requestSubmit();
    }
  }

  function handleForceClose() {
    setShowShortageDialog(false);
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'force_close';
    input.value = 'true';
    formRef.current?.appendChild(input);
    formRef.current?.requestSubmit();
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">

      {/* ── Header summary: opening + expected ───────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Base Inicial</p>
          <p className="text-xl font-bold tabular-nums text-gray-900">{fmt(summary.opening_amount)}</p>
        </div>
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
          <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Efectivo Esperado</p>
          <p className="text-xl font-bold tabular-nums text-blue-700">{fmt(summary.expected_amount)}</p>
          <p className="text-[10px] text-blue-400 mt-0.5">Base + ventas en efectivo</p>
        </div>
      </div>

      {/* ── Total sold banner ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Vendido (todos los métodos)</span>
        <span className="text-base font-bold tabular-nums text-gray-900">{fmt(summary.total_sales)}</span>
      </div>

      {/* ── Payment method breakdown: 1 col mobile / 2 col sm / 4 col lg ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {METHOD_CONFIG.map(({ key, label, sublabel, icon: Icon, color, bg, border }) => {
          const value = summary[key] as number;
          return (
            <div
              key={key}
              className={`p-3 rounded-xl border ${border} ${bg} flex flex-col gap-1.5`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                <span className={`text-[11px] font-semibold ${color} uppercase tracking-wide`}>{label}</span>
              </div>
              <p className={`text-base font-bold tabular-nums ${color}`}>{fmt(value)}</p>
              <p className="text-[10px] text-gray-400">{sublabel}</p>
            </div>
          );
        })}
      </div>

      {/* ── Arqueo form ───────────────────────────────────────────────── */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="bg-gray-900 text-white rounded-t-xl px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="w-4 h-4" />
            Arqueo de Caja
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs">
            Cuente físicamente el efectivo e ingrese el total.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5 px-5 space-y-4">
          <form ref={formRef} action={action} id="close-shift-form">
            <input type="hidden" name="shift_id" value={shift.id} />

            <div className="space-y-2">
              <Label className="font-semibold text-xs text-gray-600 uppercase tracking-wide">
                Efectivo Contado en Caja
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">RD$</span>
                <Input
                  name="counted_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  className="pl-14 rounded-xl border-gray-300 border-2 h-14 text-2xl font-bold focus-visible:ring-gray-900"
                />
              </div>
              <p className="text-xs text-gray-400">
                Solo el efectivo físico. Tarjeta, transferencia y crédito no aplican aquí.
              </p>
            </div>

            {state?.error && !isDiscrepancyWarning && (
              <Alert variant="destructive" className="rounded-xl border-2 mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {isDiscrepancyWarning && state.closing_result && (
              <Alert className="rounded-xl border-2 border-red-300 bg-red-50 mt-4">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-700 font-bold">Falta dinero en caja</AlertTitle>
                <AlertDescription className="text-red-600 text-xs space-y-1">
                  <p>Esperado: <strong>{fmt(state.closing_result.expected_amount)}</strong>
                    {' · '}Contado: <strong>{fmt(state.closing_result.counted_amount)}</strong></p>
                  <p>Diferencia: <strong>−{fmt(Math.abs(state.closing_result.amount_difference))}</strong></p>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-3 px-5 pb-5">
          <Button
            type="button"
            disabled={isPending}
            onClick={handleCloseAttempt}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold h-12 rounded-xl transition-all active:scale-95"
          >
            {isPending ? 'Procesando cierre...' : 'Finalizar y Cerrar Caja'}
          </Button>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Sobrantes y faltantes quedan registrados automáticamente.
          </div>
        </CardFooter>
      </Card>

      {/* ── Shortage confirmation dialog ──────────────────────────────── */}
      <AlertDialog open={showShortageDialog} onOpenChange={setShowShortageDialog}>
        <AlertDialogContent className="rounded-xl border border-gray-200 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-xl flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Falta dinero en caja
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p className="text-gray-600">
                  El conteo es{' '}
                  <strong className="text-red-700">{fmt(shortage)}</strong>{' '}
                  menos de lo esperado.
                </p>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  El descuadre quedará registrado y visible solo para el administrador.
                </div>
                <p className="text-gray-400 text-xs">¿Desea cerrar la caja de todas formas?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-semibold text-xs">
              Revisar de nuevo
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              onClick={handleForceClose}
            >
              Sí, cerrar con descuadre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
