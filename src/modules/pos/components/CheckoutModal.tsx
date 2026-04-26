'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Wallet, CreditCard, Landmark, Clock, FileText,
} from 'lucide-react';
import type { SelectedCustomer } from './CustomerSelector';
import type { AppliedDiscount } from '@/types/pos';

// ── Types ──────────────────────────────────────────────────────────────────────

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';
type NcfType = 'none' | 'B01';

export type { NcfType };

export interface CheckoutPayload {
  method: PaymentMethod;
  ncfType: NcfType;
  customerName: string;
  customerPhone: string;
  customerRnc: string;
  customerId?: string;
  receivedAmount?: number;
  creditDays?: number;
  authPin?: string;
  creditAuthorizerId?: string;
  newCreditLimit?: number;
  priceTier?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: CheckoutPayload) => void;
  total: number;
  subtotal?: number;
  appliedDiscount?: AppliedDiscount | null;
  isProcessing: boolean;
  // All payment state already decided in the cart panel
  method: PaymentMethod;
  ncfType: NcfType;
  customer: SelectedCustomer | null;
  receivedAmount: number;
  change: number;
  creditDays?: number;
  authPin?: string;
  creditAuthorizerId?: string;
  approvedNewCreditLimit?: number;
}

const METHOD_LABEL: Record<PaymentMethod, { label: string; icon: React.ElementType }> = {
  cash:     { label: 'Efectivo',      icon: Wallet     },
  card:     { label: 'Tarjeta',       icon: CreditCard },
  transfer: { label: 'Transferencia', icon: Landmark   },
  credit:   { label: 'Crédito',       icon: Clock      },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function CheckoutModal({
  isOpen, onClose, onConfirm, total, subtotal, appliedDiscount, isProcessing,
  method, ncfType, customer, receivedAmount, change, creditDays,
  authPin, creditAuthorizerId, approvedNewCreditLimit,
}: CheckoutModalProps) {

  const { label: methodLabel, icon: MethodIcon } = METHOD_LABEL[method];

  const handleConfirm = () => {
    onConfirm({
      method,
      ncfType,
      customerName:  customer?.name?.trim()  || 'Consumidor Final',
      customerPhone: customer?.phone?.trim() || '',
      customerRnc:   customer?.rnc?.trim()   || '',
      customerId:    customer?.id,
      receivedAmount: method === 'cash' ? receivedAmount : total,
      creditDays:    method === 'credit' ? creditDays : undefined,
      authPin,
      creditAuthorizerId: creditAuthorizerId || undefined,
      newCreditLimit: approvedNewCreditLimit,
      priceTier:     customer?.price_tier || 'retail',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-background border border-border">

        <DialogHeader className="px-6 py-4 border-b border-border bg-card">
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-3">
            <span className="p-1.5 bg-primary text-primary-foreground rounded-sm">
              <Wallet className="w-4 h-4" />
            </span>
            Confirmar venta
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">

          {/* Resumen de totales */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
            {subtotal !== undefined && appliedDiscount && (
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">RD${subtotal.toLocaleString()}</span>
              </div>
            )}
            {appliedDiscount && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>{appliedDiscount.name}</span>
                <span className="tabular-nums">−RD${appliedDiscount.amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums">RD${total.toLocaleString()}</span>
            </div>
          </div>

          {/* Cliente y comprobante */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {ncfType === 'B01' ? 'Comprobante Fiscal' : 'Consumidor Final'}
              </p>
              <p className="text-sm font-semibold truncate">
                {customer?.name?.trim() || 'Sin nombre'}
              </p>
              {customer?.rnc && (
                <p className="text-xs text-muted-foreground">RNC: {customer.rnc}</p>
              )}
            </div>
          </div>

          {/* Método de pago */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <MethodIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Método de pago</p>
              <p className="text-sm font-semibold">{methodLabel}</p>
            </div>
            {method === 'cash' && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Cambio</p>
                <p className={`text-sm font-bold tabular-nums ${change > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                  RD${change.toLocaleString()}
                </p>
              </div>
            )}
            {method === 'credit' && creditDays && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Plazo</p>
                <p className="text-sm font-bold">{creditDays}d</p>
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="px-6 pt-4 pb-8 border-t border-border bg-card flex-row gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="flex-1 text-muted-foreground">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing} className="flex-1 font-semibold">
            {isProcessing ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
