'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Wallet, CreditCard, Landmark, Clock, CheckCircle2,
  ShieldEllipsis, User, Phone, FileText, AlertCircle,
} from 'lucide-react';
import { searchCustomerByPhone } from '@/modules/pos/actions';

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';
type NcfType = 'B02' | 'B01';

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
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: CheckoutPayload) => void;
  total: number;
  isProcessing: boolean;
  canSellOnCredit: boolean;
  maxCreditDays: number;
  userRole: string;
  canUseCard: boolean;
  canUseTransfer: boolean;
}

const PAYMENT_OPTIONS = [
  { id: 'cash',     label: 'Efectivo',     icon: Wallet    },
  { id: 'card',     label: 'Tarjeta',      icon: CreditCard },
  { id: 'transfer', label: 'Transferencia', icon: Landmark  },
  { id: 'credit',   label: 'Crédito',      icon: Clock     },
] as const;

const NCF_OPTIONS = [
  { id: 'B02', label: 'Consumidor Final' },
  { id: 'B01', label: 'Crédito Fiscal'   },
] as const;

// RD area codes
const RD_AREA_CODES = ['809', '829', '849'];

// ── Small field-level error ───────────────────────────────────────────────────

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  );
}

function RequiredBadge() {
  return (
    <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-destructive/70 bg-destructive/10 px-1 py-0.5 rounded">
      obligatorio
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  isProcessing,
  canSellOnCredit,
  maxCreditDays,
  userRole,
  canUseCard,
  canUseTransfer,
}: CheckoutModalProps) {
  // Payment + NCF
  const [method, setMethod]   = useState<PaymentMethod>('cash');
  const [ncfType, setNcfType] = useState<NcfType>('B02');

  // Customer
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [customerRnc, setCustomerRnc]     = useState('');
  const [customerId, setCustomerId]       = useState<string | undefined>();
  const [isLookingUp, setIsLookingUp]     = useState(false);
  const [phoneNotFound, setPhoneNotFound] = useState(false);

  // Cash
  const [receivedAmount, setReceivedAmount] = useState('');

  // Credit days
  const [creditDays, setCreditDays] = useState(15);

  // PIN auth
  const [authPin, setAuthPin]           = useState('');
  const [pinError, setPinError]         = useState<string | null>(null);
  const [pinAuthorized, setPinAuthorized] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPosRole = userRole === 'pos';

  // A pos-role user needs PIN if they don't have the explicit permission for that method
  const needsPin = useMemo(() => {
    if (!isPosRole) return false;
    if (method === 'credit')   return true;
    if (method === 'card')     return !canUseCard;
    if (method === 'transfer') return !canUseTransfer;
    return false;
  }, [isPosRole, method, canUseCard, canUseTransfer]);

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) return;
    setMethod('cash');
    setNcfType('B02');
    setCustomerPhone('');
    setCustomerName('');
    setCustomerRnc('');
    setCustomerId(undefined);
    setIsLookingUp(false);
    setPhoneNotFound(false);
    setReceivedAmount('');
    setCreditDays(15);
    setAuthPin('');
    setPinError(null);
    setPinAuthorized(false);
    setErrors({});
  }, [isOpen]);

  // Reset pin state when method changes
  useEffect(() => {
    setAuthPin('');
    setPinError(null);
    setPinAuthorized(false);
  }, [method]);

  // ── Phone lookup ────────────────────────────────────────────────────────────

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomerPhone(raw);
    setCustomerId(undefined);
    setPhoneNotFound(false);
    setErrors((prev) => ({ ...prev, customerPhone: null }));

    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    if (raw.length !== 10) return;

    phoneDebounceRef.current = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const found = await searchCustomerByPhone(raw);
        if (found) {
          setCustomerName(found.name || '');
          setCustomerRnc((found as any).rnc || '');
          setCustomerId(found.id);
          setPhoneNotFound(false);
        } else {
          setPhoneNotFound(true);
        }
      } catch {
        // silent
      } finally {
        setIsLookingUp(false);
      }
    }, 400);
  };

  // ── Cash change ─────────────────────────────────────────────────────────────

  const change = useMemo(() => {
    const n = parseFloat(receivedAmount);
    return isNaN(n) ? 0 : Math.max(0, n - total);
  }, [receivedAmount, total]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const requiresCustomerData =
    ncfType === 'B01' || method === 'credit';

  const validate = (): boolean => {
    const next: Record<string, string | null> = {};

    if (requiresCustomerData) {
      if (!customerName.trim())  next.customerName  = 'El nombre es obligatorio';
      if (!customerPhone.trim()) next.customerPhone = 'El teléfono es obligatorio';
      if (ncfType === 'B01' && !customerRnc.trim())
        next.customerRnc = 'El RNC/Cédula es obligatorio para Crédito Fiscal';
    }

    if (method === 'cash') {
      if (!receivedAmount || parseFloat(receivedAmount) < total)
        next.receivedAmount = 'El monto recibido es insuficiente';
    }

    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const canConfirm = useMemo(() => {
    if (isProcessing) return false;
    if (needsPin && !pinAuthorized) return false;
    if (method === 'cash') {
      const n = parseFloat(receivedAmount);
      if (isNaN(n) || n < total) return false;
    }
    if (requiresCustomerData) {
      if (!customerName.trim() || !customerPhone.trim()) return false;
      if (ncfType === 'B01' && !customerRnc.trim()) return false;
    }
    return true;
  }, [
    isProcessing, needsPin, pinAuthorized, method, receivedAmount,
    total, requiresCustomerData, customerName, customerPhone, customerRnc, ncfType,
  ]);

  // ── PIN auto-submit ─────────────────────────────────────────────────────────

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setAuthPin(val);
    setPinError(null);
    if (val.length === 4) {
      setPinAuthorized(true);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm({
      method,
      ncfType,
      customerName: customerName.trim() || 'Consumidor Final',
      customerPhone: customerPhone.trim(),
      customerRnc: customerRnc.trim(),
      customerId,
      receivedAmount: method === 'cash' ? parseFloat(receivedAmount) : total,
      creditDays: method === 'credit' ? creditDays : undefined,
      authPin: needsPin ? authPin : undefined,
    });
  };

  // ── Phone area code hint ─────────────────────────────────────────────────────

  const phoneAreaCode = customerPhone.slice(0, 3);
  const phoneAreaValid = customerPhone.length === 0 || RD_AREA_CODES.includes(phoneAreaCode);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border border-border max-h-[92dvh] flex flex-col">

        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-3">
            <span className="p-1.5 bg-primary text-primary-foreground rounded-sm">
              <Wallet className="w-4 h-4" />
            </span>
            Finalizar Venta
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── NCF ─────────────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tipo de Comprobante
            </p>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/50 rounded-md border border-border/50">
              {NCF_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setNcfType(opt.id as NcfType)}
                  className={`py-2 text-[11px] font-semibold rounded transition-all ${
                    ncfType === opt.id
                      ? 'bg-background shadow-sm text-foreground border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Customer ────────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Datos del Cliente {!requiresCustomerData && <span className="normal-case font-normal">(opcional)</span>}
            </p>

            {/* Phone */}
            <div>
              {requiresCustomerData && (
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center">
                  Teléfono <RequiredBadge />
                </Label>
              )}
              <div className="relative flex items-center">
                {/* RD prefix selector */}
                <div className="flex items-center gap-1 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-xs font-semibold text-muted-foreground/70 select-none">+1</span>
                  <span className="text-muted-foreground/30 text-xs select-none">|</span>
                </div>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="809 000 0000"
                  className={`pl-16 h-10 text-sm bg-background border-border ${errors.customerPhone ? 'border-destructive' : ''} ${!phoneAreaValid && customerPhone.length >= 3 ? 'border-amber-400' : ''}`}
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                />
                {isLookingUp && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary animate-pulse font-semibold">
                    Buscando...
                  </span>
                )}
              </div>
              {!phoneAreaValid && customerPhone.length >= 3 && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-amber-600 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Código de área RD: 809, 829 o 849
                </p>
              )}
              <FieldError msg={errors.customerPhone ?? null} />
              {customerId && !isLookingUp && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Cliente encontrado
                </p>
              )}
              {phoneNotFound && !isLookingUp && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cliente nuevo — completa los datos abajo.
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              {requiresCustomerData && (
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center">
                  Nombre <RequiredBadge />
                </Label>
              )}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                <Input
                  placeholder={requiresCustomerData ? 'Nombre completo' : 'Nombre (opcional)'}
                  className={`pl-8 h-10 text-sm bg-background border-border ${errors.customerName ? 'border-destructive' : ''}`}
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setErrors((prev) => ({ ...prev, customerName: null }));
                  }}
                />
              </div>
              <FieldError msg={errors.customerName ?? null} />
            </div>

            {/* RNC — always shown for B01 */}
            {ncfType === 'B01' && (
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center">
                  RNC / Cédula <RequiredBadge />
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <Input
                    placeholder="RNC o Cédula"
                    className={`pl-8 h-10 text-sm bg-background ${errors.customerRnc ? 'border-destructive' : 'border-primary/40'}`}
                    value={customerRnc}
                    onChange={(e) => {
                      setCustomerRnc(e.target.value);
                      setErrors((prev) => ({ ...prev, customerRnc: null }));
                    }}
                  />
                </div>
                <FieldError msg={errors.customerRnc ?? null} />
              </div>
            )}
          </section>

          {/* ── Payment method ──────────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Método de Pago
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const Icon   = opt.icon;
                const active = method === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setMethod(opt.id as PaymentMethod)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 border rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all ${
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Dynamic section ─────────────────────────────────────────────── */}

          {(method === 'cash' || method === 'card' || method === 'transfer') && (
            <div className="p-4 border border-border rounded-md bg-card space-y-4">
              {/* Icon + label row */}
              <div className="flex items-center gap-2 text-muted-foreground">
                {method === 'cash'     && <Wallet   className="w-4 h-4" />}
                {method === 'card'     && <CreditCard className="w-4 h-4" />}
                {method === 'transfer' && <Landmark  className="w-4 h-4" />}
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {method === 'cash'     && 'Cobro en efectivo'}
                  {method === 'card'     && 'Cobro con tarjeta'}
                  {method === 'transfer' && 'Cobro por transferencia'}
                </span>
              </div>

              {method === 'cash' ? (
                <>
                  <div className="flex items-end gap-4 ">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Monto Recibido
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                          RD$
                        </span>
                        <Input
                          type="number"
                          placeholder="0"
                          autoFocus
                          className={`pl-11 h-12 text-xl font-semibold tabular-nums bg-background border-border focus-visible:ring-0 focus-visible:border-foreground ${errors.receivedAmount ? 'border-destructive' : ''}`}
                          value={receivedAmount}
                          onChange={(e) => {
                            setReceivedAmount(e.target.value);
                            setErrors((prev) => ({ ...prev, receivedAmount: null }));
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right pb-1 min-w-[90px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Cambio
                      </p>
                      <p className={`text-2xl font-semibold tabular-nums ${change > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                        RD${change.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                  <FieldError msg={errors.receivedAmount ?? null} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Procesa el pago en la terminal física antes de confirmar.
                </p>
              )}
            </div>
          )}

          {method === 'credit' && (
            <div className="p-4 border border-border rounded-md bg-card space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Venta a crédito</span>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Plazo de pago
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setCreditDays(d)}
                      disabled={d > maxCreditDays}
                      className={`py-2 text-sm font-semibold rounded-md border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        creditDays === d
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card text-foreground border-border hover:border-foreground/40'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Límite asignado: {maxCreditDays} días</p>
              </div>
            </div>
          )}

          {/* ── PIN authorization ────────────────────────────────────────────── */}
          {needsPin && !pinAuthorized && (
            <div className="p-4 border border-border rounded-md bg-card space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldEllipsis className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">PIN de autorización</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {method === 'credit'
                  ? 'Las ventas a crédito requieren el PIN de un manager o administrador.'
                  : `El método "${method === 'card' ? 'Tarjeta' : 'Transferencia'}" requiere el PIN de un manager o administrador.`}
              </p>
              <div>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="• • • •"
                  className={`text-center text-2xl tracking-[0.8em] h-12 bg-background border-border focus-visible:ring-0 focus-visible:border-foreground ${pinError ? 'border-destructive' : ''}`}
                  maxLength={4}
                  inputMode="numeric"
                  value={authPin}
                  onChange={handlePinChange}
                />
                <FieldError msg={pinError} />
              </div>
            </div>
          )}

          {needsPin && pinAuthorized && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> PIN válido — autorizado
            </div>
          )}

        </div>

        {/* Footer */}
        <DialogFooter className="px-6   py-4 border-t border-border bg-card flex-row items-center gap-3 shrink-0">
          <div className="flex-1  pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              RD${total.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="text-muted-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isProcessing}
            className="px-6 font-semibold"
          >
            {isProcessing ? 'Procesando...' : 'Confirmar venta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
