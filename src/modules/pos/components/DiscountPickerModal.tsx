'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tag, Percent, DollarSign, ShieldEllipsis, CheckCircle2, X,
} from 'lucide-react';
import type { Discount, AppliedDiscount } from '@/types/pos';
import { validateAdminPinAction } from '@/modules/pos/customer-actions';

interface DiscountPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  discounts: Discount[];
  cartSubtotal: number;
  canApplyDiscount: boolean;
  onApply: (discount: AppliedDiscount | null) => void;
  currentDiscount: AppliedDiscount | null;
}

function calcAmount(subtotal: number, type: 'percentage' | 'fixed', value: number): number {
  if (type === 'percentage') return Math.round((subtotal * value) / 100 * 100) / 100;
  return Math.min(value, subtotal);
}

const fmt = (d: Discount) =>
  d.type === 'percentage' ? `${d.value}%` : `RD$${d.value.toLocaleString()}`;

export function DiscountPickerModal({
  isOpen, onClose, discounts, cartSubtotal,
  canApplyDiscount, onApply, currentDiscount,
}: DiscountPickerModalProps) {

  const [selected, setSelected]   = useState<Discount | 'manual' | null>(null);
  const [manualType, setManualType] = useState<'percentage' | 'fixed'>('percentage');
  const [manualValue, setManualValue] = useState('');

  // PIN flow
  const [pin, setPin]             = useState('');
  const [pinError, setPinError]   = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [isPending, startTransition] = useTransition();

  const needsPin = !canApplyDiscount && !authorized;

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setManualType('percentage');
    setManualValue('');
    setPin('');
    setPinError(null);
    setAuthorized(false);
  }, [isOpen]);

  const handleValidatePin = () => {
    startTransition(async () => {
      const res = await validateAdminPinAction(pin, { action: 'apply_discount' });
      if (res.success) {
        setAuthorized(true);
        setPinError(null);
      } else {
        setPinError(res.error ?? 'PIN incorrecto');
      }
    });
  };

  const handleApply = () => {
    if (!selected) return;

    if (selected === 'manual') {
      const v = parseFloat(manualValue);
      if (isNaN(v) || v <= 0) return;
      if (manualType === 'percentage' && v > 100) return;
      const amount = calcAmount(cartSubtotal, manualType, v);
      onApply({
        id: null,
        name: `Manual (${manualType === 'percentage' ? v + '%' : 'RD$' + v})`,
        type: manualType,
        value: v,
        amount,
      });
    } else {
      onApply({
        id: selected.id,
        name: selected.name,
        type: selected.type,
        value: selected.value,
        amount: calcAmount(cartSubtotal, selected.type, selected.value),
      });
    }
    onClose();
  };

  const handleRemove = () => {
    onApply(null);
    onClose();
  };

  const activeDiscounts = discounts.filter(d => d.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-background border border-border max-h-[85dvh] flex flex-col">

        <DialogHeader className="px-5 py-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <span className="p-1.5 bg-primary text-primary-foreground rounded-sm">
              <Tag className="w-4 h-4" />
            </span>
            Aplicar Descuento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* PIN si no tiene permiso */}
          {needsPin && (
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                <ShieldEllipsis className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  PIN de supervisor requerido
                </p>
              </div>
              <p className="text-[11px] text-amber-600">
                No tienes permiso para aplicar descuentos. Un supervisor debe autorizarlo.
              </p>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="• • • •"
                className={`text-center text-2xl tracking-[0.8em] h-12 bg-white focus-visible:ring-0 focus-visible:border-amber-400 ${pinError ? 'border-red-400' : 'border-amber-200'}`}
                maxLength={4}
                inputMode="numeric"
                value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g,'').slice(0,4)); setPinError(null); }}
                onKeyDown={e => e.key === 'Enter' && pin.length === 4 && handleValidatePin()}
              />
              {pinError && (
                <p className="text-[11px] text-red-600 font-medium">{pinError}</p>
              )}
              <Button
                onClick={handleValidatePin}
                disabled={pin.length < 4 || isPending}
                className="w-full h-10 text-xs font-semibold"
                variant="outline"
              >
                {isPending ? 'Validando...' : 'Validar PIN'}
              </Button>
            </div>
          )}

          {authorized && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold px-1">
              <CheckCircle2 className="w-4 h-4" /> Autorizado por supervisor
            </div>
          )}

          {/* Lista de descuentos — disponible si tiene permiso o ya autorizó */}
          {(!needsPin) && (
            <>
              {/* Descuentos predefinidos */}
              {activeDiscounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Descuentos disponibles
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {activeDiscounts.map(d => {
                      const isSelected = selected !== 'manual' && (selected as Discount)?.id === d.id;
                      const amount = calcAmount(cartSubtotal, d.type, d.value);
                      return (
                        <button
                          key={d.id}
                          onClick={() => setSelected(isSelected ? null : d)}
                          className={`flex items-center justify-between p-3 border rounded-xl text-left transition-all ${
                            isSelected
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-card hover:border-foreground/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-background/20' : d.type === 'percentage' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                              {d.type === 'percentage'
                                ? <Percent className={`w-3.5 h-3.5 ${isSelected ? 'text-background' : 'text-blue-600'}`} />
                                : <DollarSign className={`w-3.5 h-3.5 ${isSelected ? 'text-background' : 'text-emerald-600'}`} />}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{d.name}</p>
                              <p className={`text-[11px] ${isSelected ? 'text-background/70' : 'text-muted-foreground'}`}>
                                {fmt(d)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold tabular-nums ${isSelected ? 'text-background' : 'text-foreground'}`}>
                            −RD${amount.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Descuento Manual */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Descuento Manual
                </p>
                <button
                  onClick={() => setSelected(selected === 'manual' ? null : 'manual')}
                  className={`w-full flex items-center gap-2.5 p-3 border rounded-xl text-left transition-all ${
                    selected === 'manual'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card hover:border-foreground/40'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${selected === 'manual' ? 'bg-background/20' : 'bg-gray-100'}`}>
                    <Tag className={`w-3.5 h-3.5 ${selected === 'manual' ? 'text-background' : 'text-gray-600'}`} />
                  </div>
                  <p className="font-semibold text-sm">Manual (libre)</p>
                </button>

                {selected === 'manual' && (
                  <div className="p-3 border border-border rounded-xl bg-card space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(['percentage', 'fixed'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setManualType(t)}
                          className={`py-2 text-xs font-semibold border rounded-lg transition-all ${
                            manualType === t
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border text-muted-foreground hover:border-foreground/40'
                          }`}
                        >
                          {t === 'percentage' ? '% Porcentaje' : 'RD$ Monto fijo'}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        {manualType === 'percentage' ? '%' : 'RD$'}
                      </span>
                      <Input
                        type="number"
                        min={0.01}
                        max={manualType === 'percentage' ? 100 : undefined}
                        step={0.01}
                        value={manualValue}
                        onChange={e => setManualValue(e.target.value)}
                        placeholder={manualType === 'percentage' ? '10' : '500'}
                        className="pl-10 h-11 font-semibold tabular-nums text-base"
                        autoFocus
                      />
                    </div>
                    {manualValue && !isNaN(parseFloat(manualValue)) && (
                      <p className="text-xs text-muted-foreground text-center">
                        Descuento: <span className="font-bold text-foreground">
                          −RD${calcAmount(cartSubtotal, manualType, parseFloat(manualValue)).toLocaleString()}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-card flex gap-2 shrink-0">
          {currentDiscount && (
            <Button variant="outline" onClick={handleRemove} className="flex items-center gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
              <X className="w-4 h-4" /> Quitar descuento
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              !selected ||
              needsPin ||
              (selected === 'manual' && (!manualValue || isNaN(parseFloat(manualValue)) || parseFloat(manualValue) <= 0))
            }
            className="flex-1 font-semibold"
          >
            Aplicar descuento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
