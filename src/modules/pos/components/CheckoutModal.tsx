'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Wallet, CreditCard, Landmark, Clock, CheckCircle2, ShieldEllipsis,
  AlertCircle, AlertTriangle, TrendingUp, Loader2, Ban, FileText,
} from 'lucide-react';
import { CustomerSelector, type SelectedCustomer } from './CustomerSelector';
import { validateAdminPinAction } from '@/modules/pos/customer-actions';

// ── Types ──────────────────────────────────────────────────────────────────────

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';
// 'none' = recibo interno (consumidor final sin comprobante)
// 'B01'  = crédito fiscal (requiere RNC, consume secuencia NCF)
type NcfType = 'none' | 'B01';

export interface CheckoutPayload {
  method: PaymentMethod;
  ncfType: NcfType; // 'none' = recibo interno
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
  appliedDiscount?: import('@/types/pos').AppliedDiscount | null;
  isProcessing: boolean;
  canSellOnCredit: boolean;
  maxCreditDays: number;
  userRole: string;
  canUseCard: boolean;
  canUseTransfer: boolean;
  initialCustomer?: SelectedCustomer | null;
  onCustomerChange?: (customer: SelectedCustomer | null) => void;
}

// ── Qué tipo de bloqueo de crédito tenemos ────────────────────────────────────

type CreditBlock =
  | { kind: 'no_credit' }            // credit_limit === 0
  | { kind: 'limit_exceeded'; excess: number; newDebt: number }; // supera el límite

const PAYMENT_OPTIONS = [
  { id: 'cash',     label: 'Efectivo',   icon: Wallet     },
  { id: 'card',     label: 'Tarjeta',    icon: CreditCard },
  { id: 'transfer', label: 'Transfer.',  icon: Landmark   },
  { id: 'credit',   label: 'Crédito',    icon: Clock      },
] as const;

const NCF_OPTIONS = [
  { id: 'none', label: 'Consumidor Final' },
  { id: 'B01',  label: 'Comprobante Fiscal' },
] as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" /> {msg}
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

// ── Credit Authorization Modal ────────────────────────────────────────────────
// Cubre dos casos: sin crédito (limit=0) y límite excedido.

interface CreditAuthModalProps {
  isOpen: boolean;
  block: CreditBlock;
  customerName: string;
  cartTotal: number;
  currentDebt: number;
  creditLimit: number;
  userRole: string;
  onAuthorized: (pin: string, authorizerId: string, authorizerName: string, newCreditLimit?: number) => void;
  onCancel: () => void;
}

function CreditAuthModal({
  isOpen, block, customerName, cartTotal, currentDebt, creditLimit,
  userRole, onAuthorized, onCancel,
}: CreditAuthModalProps) {
  const [pin, setPin]         = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [newCreditLimit, setNewCreditLimit] = useState(cartTotal);
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  useEffect(() => { 
    if (isOpen) { 
      setPin(''); 
      setPinError(null); 
      setNewCreditLimit(block.kind === 'limit_exceeded' ? block.newDebt : cartTotal);
    } 
  }, [isOpen, block, cartTotal]);

  const handleValidate = () => {
    startTransition(async () => {
      const context = block.kind === 'no_credit'
        ? { action: 'credit_sin_limite', amount: cartTotal }
        : { action: 'credit_limite_excedido', amount: block.newDebt };

      const res = await validateAdminPinAction(pin, context);
      if (res.success) {
        onAuthorized(pin, res.authorizer_id, res.authorizer_name);
      } else {
        setPinError(res.error);
      }
    });
  };

  const titleText = block.kind === 'no_credit'
    ? 'Cliente sin crédito disponible'
    : 'Límite de crédito excedido';
  const headerColor = 'bg-amber-50 dark:bg-amber-950/30';
  const titleColor  = 'text-amber-700 dark:text-amber-400';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-background border border-border">
        <DialogHeader className={`px-5 py-4 border-b border-border ${headerColor}`}>
          <DialogTitle className={`text-base font-semibold ${titleColor} flex items-center gap-2`}>
            {block.kind === 'no_credit'
              ? <Ban className="w-5 h-5" />
              : <AlertTriangle className="w-5 h-5" />}
            {titleText}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">

          {/* ── Desglose numérico ──────────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-semibold truncate max-w-[160px]">{customerName}</span>
            </div>

            {block.kind === 'no_credit' ? (
              <>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito aprobado</span>
                  <span className="font-bold text-destructive">RD$0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto a fiar</span>
                  <span className="font-semibold tabular-nums">RD${cartTotal.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deuda anterior</span>
                  <span className="font-semibold tabular-nums">RD${currentDebt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Esta venta</span>
                  <span className="font-semibold tabular-nums">+ RD${cartTotal.toLocaleString()}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold">Nueva deuda total</span>
                  <span className="font-bold text-destructive tabular-nums">
                    RD${block.newDebt.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Límite aprobado</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    RD${creditLimit.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── Pill informativo ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <TrendingUp className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs font-semibold text-destructive">
              {block.kind === 'no_credit'
                ? 'Este cliente no tiene límite de crédito asignado'
                : `Excede el límite en RD$${block.excess.toLocaleString()}`}
            </p>
          </div>

          {/* ── PIN o bypass admin ─────────────────────────────────────────── */}
          {isAdmin ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Como administrador puedes aprobar esta venta y asignar un nuevo límite de crédito.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nuevo límite de crédito (RD$)</Label>
                <Input 
                  type="number" 
                  value={newCreditLimit} 
                  onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                  className="text-center font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldEllipsis className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  PIN de supervisor requerido
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Un manager o administrador debe autorizar esta venta a crédito.
              </p>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="• • • •"
                className={`text-center text-2xl tracking-[0.8em] h-12 bg-background focus-visible:ring-0 focus-visible:border-foreground ${pinError ? 'border-destructive' : ''}`}
                maxLength={4}
                inputMode="numeric"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && handleValidate()}
              />
              <FieldError msg={pinError} />
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border bg-card flex-row gap-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1" disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={isAdmin
              ? () => onAuthorized('admin-bypass', 'self', userRole, newCreditLimit)
              : handleValidate}
            disabled={isPending || (!isAdmin && pin.length < 4)}
            className="flex-1"
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Validando…</>
              : isAdmin ? 'Aprobar venta' : 'Autorizar con PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main CheckoutModal ─────────────────────────────────────────────────────────

export function CheckoutModal({
  isOpen, onClose, onConfirm, total, subtotal, appliedDiscount, isProcessing,
  canSellOnCredit, maxCreditDays, userRole, canUseCard, canUseTransfer,
  initialCustomer, onCustomerChange,
}: CheckoutModalProps) {
  const [method, setMethod]   = useState<PaymentMethod>('cash');
  const [ncfType, setNcfType] = useState<NcfType>('none');
  const [customer, setCustomer] = useState<SelectedCustomer | null>(initialCustomer ?? null);

  // Cart total already reflects the active price tier via CartProvider.updateCartPrices
  const dynamicTotal = total;


  const [receivedAmount, setReceivedAmount] = useState('');
  const [creditDays, setCreditDays]         = useState(15);

  // PIN para métodos restringidos (pos-role)
  const [authPin, setAuthPin]             = useState('');
  const [pinAuthorized, setPinAuthorized] = useState(false);

  // Override de crédito (sin crédito o límite excedido)
  const [creditBlock, setCreditBlock]               = useState<CreditBlock | null>(null);
  const [creditOverridePin, setCreditOverridePin]   = useState('');
  const [creditAuthorizerId, setCreditAuthorizerId] = useState('');
  const [creditAuthorized, setCreditAuthorized]     = useState(false);
  const [approvedNewCreditLimit, setApprovedNewCreditLimit] = useState<number | undefined>();
  const [inlineCreditLimit, setInlineCreditLimit]   = useState('');
  const [showCreditModal, setShowCreditModal]       = useState(false);

  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const isPosRole       = userRole === 'pos';
  const isAdminOrMgr    = userRole === 'admin' || userRole === 'manager';

  const effectiveRnc = customer?.rnc?.trim() ?? '';

  // ── Bloqueo de crédito ─────────────────────────────────────────────────────
  const computedCreditBlock = useMemo((): CreditBlock | null => {
    if (method !== 'credit' || !customer) return null;
    if (customer.credit_limit === 0) return { kind: 'no_credit' };
    const newDebt = customer.current_debt + dynamicTotal;
    if (newDebt > customer.credit_limit)
      return {
        kind: 'limit_exceeded',
        newDebt,
        excess: newDebt - customer.credit_limit,
      };
    return null;
  }, [method, customer, dynamicTotal]);

  // ── PIN de método restringido — solo aplica a cajeros (pos) ──────────────────
  const needsMethodPin = useMemo(() => {
    if (!isPosRole) return false; // admin/manager nunca necesitan PIN
    if (method === 'card')     return !canUseCard;
    if (method === 'transfer') return !canUseTransfer;
    return false; // crédito se maneja por creditBlock, no por PIN de método
  }, [isPosRole, method, canUseCard, canUseTransfer]);

  const requiresCustomerData = ncfType === 'B01' || method === 'credit';
  const requiresRnc = ncfType === 'B01';

  // ── Reset completo cuando el modal abre ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const c = initialCustomer ?? null;
    setCustomer(c);
    setMethod('cash');
    setNcfType(c?.ncf_type === 'B01' ? 'B01' : 'none');
    setReceivedAmount(''); setCreditDays(15);
    setAuthPin(''); setPinAuthorized(false);
    setCreditBlock(null); setCreditOverridePin(''); setCreditAuthorizerId('');
    setCreditAuthorized(false); setShowCreditModal(false); setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    setAuthPin(''); setPinAuthorized(false);
    setCreditOverridePin(''); setCreditAuthorizerId('');
    setCreditAuthorized(false); setShowCreditModal(false);
    setApprovedNewCreditLimit(undefined);
    setInlineCreditLimit('');
    setReceivedAmount('');
  }, [method, dynamicTotal]);

  // ── Cash change ────────────────────────────────────────────────────────────
  const change = useMemo(() => {
    const n = parseFloat(receivedAmount);
    return isNaN(n) ? 0 : Math.max(0, n - dynamicTotal);
  }, [receivedAmount, dynamicTotal]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: Record<string, string | null> = {};

    if (requiresCustomerData) {
      if (!customer?.name?.trim())  next.customerName  = 'El nombre es obligatorio';
      if (!customer?.phone?.trim()) next.customerPhone = 'El teléfono es obligatorio';
    }
    if (requiresRnc && !effectiveRnc)
      next.customerRnc = 'El RNC/Cédula es obligatorio para Crédito Fiscal';
    if (method === 'cash') {
      if (!receivedAmount || parseFloat(receivedAmount) < total)
        next.receivedAmount = 'El monto recibido es insuficiente';
    }

    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  // ── Can confirm ────────────────────────────────────────────────────────────
  const canConfirm = useMemo(() => {
    if (isProcessing) return false;
    if (needsMethodPin && !pinAuthorized) return false;
    // Admins/managers pueden confirmar sin pre-autorizar el bloqueo de crédito
    // (el modal de crédito se omite y se loguea automáticamente al confirmar)
    if (computedCreditBlock && !creditAuthorized && !isAdminOrMgr) return false;
    if (method === 'cash') {
      const n = parseFloat(receivedAmount);
      if (isNaN(n) || n < dynamicTotal) return false;
    }
    if (requiresCustomerData) {
      if (!customer?.name?.trim()) return false;
      if (method === 'credit' && !customer?.phone?.trim()) return false;
    }
    if (requiresRnc && !effectiveRnc) return false;
    return true;
  }, [
    isProcessing, needsMethodPin, pinAuthorized, computedCreditBlock,
    creditAuthorized, isAdminOrMgr, method, receivedAmount, dynamicTotal,
    requiresCustomerData, requiresRnc, customer, ncfType, effectiveRnc,
  ]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMethodPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setAuthPin(val);
    if (val.length === 4) setPinAuthorized(true);
  };

  const handleConfirm = () => {
    if (!validate()) return;
    if (computedCreditBlock && !creditAuthorized) {
      if (isAdminOrMgr) {
        // Admin confirma directamente — se registra como auto-aprobación
        setCreditAuthorized(true);
        const limitToSet = inlineCreditLimit ? parseFloat(inlineCreditLimit) : undefined;
        submit('admin-bypass', 'self', limitToSet);
        return;
      }
      setCreditBlock(computedCreditBlock);
      setShowCreditModal(true);
      return;
    }
    submit();
  };

  const submit = (overridePin?: string, authId?: string, forceCreditLimit?: number) => {
    const pin = overridePin ?? creditOverridePin;
    const effectivePin = pin || (needsMethodPin ? authPin : undefined);
    const limitToApply = forceCreditLimit ?? approvedNewCreditLimit;

    onConfirm({
      method,
      ncfType,
      customerName:  customer?.name?.trim()  || 'Consumidor Final',
      customerPhone: customer?.phone?.trim() || '',
      customerRnc:   effectiveRnc,
      customerId:    customer?.id,
      receivedAmount: method === 'cash' ? parseFloat(receivedAmount) : dynamicTotal,
      creditDays:    method === 'credit' ? creditDays : undefined,
      authPin:       effectivePin,
      creditAuthorizerId: (authId ?? creditAuthorizerId) || undefined,
      newCreditLimit: limitToApply,
      priceTier:     customer?.price_tier || 'retail',
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
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

            {/* ── NCF ──────────────────────────────────────────────────────── */}
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

            {/* ── Cliente ───────────────────────────────────────────────────── */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Cliente{' '}
                {!requiresCustomerData
                  ? <span className="normal-case font-normal">(opcional)</span>
                  : <RequiredBadge />}
              </p>

              <CustomerSelector
                value={customer}
                onChange={(c) => {
                  setCustomer(c);
                  onCustomerChange?.(c);
                  // B01 = comprobante fiscal; cualquier otro valor (B02, null) = recibo interno
                  setNcfType(c?.ncf_type === 'B01' ? 'B01' : 'none');
                }}
                showDebtBadge
              />

              {/* Barra de crédito disponible */}
              {customer && method === 'credit' && customer.credit_limit > 0 && (
                <div className={`flex items-center justify-between p-2 rounded-md text-xs font-semibold ${
                  computedCreditBlock
                    ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                }`}>
                  <span>Crédito disponible</span>
                  <span className="tabular-nums">
                    RD${Math.max(0, customer.credit_limit - customer.current_debt).toLocaleString()}
                    {' / '}RD${customer.credit_limit.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Sin crédito asignado o límite excedido — aviso inline */}
              {customer && method === 'credit' && computedCreditBlock && (
                <div className="flex flex-col gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <p className="text-[11px] font-semibold text-destructive">
                      {isAdminOrMgr
                        ? computedCreditBlock.kind === 'no_credit' 
                          ? 'Este cliente no tiene límite de crédito. Como admin, asígnale uno:'
                          : `El cliente excede su límite por RD$${computedCreditBlock.excess.toLocaleString()}. Puedes actualizar su límite:`
                        : computedCreditBlock.kind === 'no_credit'
                          ? 'Este cliente no tiene crédito asignado — se requerirá autorización de supervisor.'
                          : `Excede el límite en RD$${computedCreditBlock.excess.toLocaleString()} — requerirá supervisor.`}
                    </p>
                  </div>
                  {isAdminOrMgr && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                       <Label className="text-[11px] font-semibold text-destructive/80">Nuevo límite (RD$):</Label>
                       <Input 
                         type="number" 
                         className="h-8 text-xs font-bold w-32 bg-background border-destructive/30 focus-visible:ring-destructive/20 text-destructive"
                         placeholder={dynamicTotal.toString()}
                         value={inlineCreditLimit}
                         onChange={(e) => setInlineCreditLimit(e.target.value)}
                       />
                    </div>
                  )}
                </div>
              )}

              {/* Override autorizado */}
              {creditAuthorized && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-1">
                  <CheckCircle2 className="w-4 h-4" /> Crédito autorizado por supervisor
                </div>
              )}
            </section>

            {/* ── Método de Pago ────────────────────────────────────────────── */}
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

            {/* ── Efectivo ──────────────────────────────────────────────────── */}
            {method === 'cash' && (
              <div className="p-4 border border-border rounded-md bg-card space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Cobro en efectivo</span>
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Monto Recibido
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">RD$</span>
                      <Input
                        type="number"
                        placeholder="0"
                        autoFocus
                        className={`pl-11 h-12 text-xl font-semibold tabular-nums bg-background focus-visible:ring-0 focus-visible:border-foreground ${errors.receivedAmount ? 'border-destructive' : ''}`}
                        value={receivedAmount}
                        onChange={(e) => { setReceivedAmount(e.target.value); setErrors((p) => ({ ...p, receivedAmount: null })); }}
                      />
                    </div>
                    <FieldError msg={errors.receivedAmount ?? null} />
                  </div>
                  <div className="text-right pb-1 min-w-[90px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cambio</p>
                    <p className={`text-2xl font-semibold tabular-nums ${change > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                      RD${change.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tarjeta / Transferencia ────────────────────────────────────── */}
            {(method === 'card' || method === 'transfer') && (
              <div className="p-4 border border-border rounded-md bg-card space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {method === 'card' ? <CreditCard className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {method === 'card' ? 'Cobro con tarjeta' : 'Cobro por transferencia'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Procesa el pago en la terminal física antes de confirmar.</p>
              </div>
            )}

            {/* ── Crédito ───────────────────────────────────────────────────── */}
            {method === 'credit' && (
              <div className="p-4 border border-border rounded-md bg-card space-y-3">
                <div className="flex items-center gap-2 text-amber-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Venta a crédito</span>
                  {customer && customer.current_debt > 0 && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 ml-auto">
                      Deuda prev.: RD${customer.current_debt.toLocaleString()}
                    </Badge>
                  )}
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

            {/* ── PIN de método restringido (pos-role) ─────────────────────── */}
            {needsMethodPin && !pinAuthorized && (
              <div className="p-4 border border-border rounded-md bg-card space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldEllipsis className="w-4 h-4" />
                  <p className="text-xs font-semibold uppercase tracking-wide">PIN de autorización</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {method === 'credit'
                    ? 'Las ventas a crédito requieren el PIN de un supervisor.'
                    : `El método "${method === 'card' ? 'Tarjeta' : 'Transferencia'}" requiere el PIN de un supervisor.`}
                </p>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="• • • •"
                  className={`text-center text-2xl tracking-[0.8em] h-12 bg-background focus-visible:ring-0 focus-visible:border-foreground ${authPin.length === 4 ? 'border-emerald-500' : ''}`}
                  maxLength={4}
                  inputMode="numeric"
                  value={authPin}
                  onChange={handleMethodPinChange}
                />
              </div>
            )}
            {needsMethodPin && pinAuthorized && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-1">
                <CheckCircle2 className="w-4 h-4" /> PIN válido — autorizado
              </div>
            )}

          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border bg-card flex-row items-center gap-3 shrink-0">
            <div className="flex-1 px-2 space-y-0.5">
              {subtotal !== undefined && appliedDiscount && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">RD${subtotal.toLocaleString()}</span>
                </div>
              )}
              {appliedDiscount && (
                <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                  <span>{appliedDiscount.name}</span>
                  <span className="tabular-nums">−RD${appliedDiscount.amount.toLocaleString()}</span>
                </div>
              )}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-0.5">Total</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">
                RD${dynamicTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="text-muted-foreground">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm || isProcessing} className="px-6 font-semibold">
              {isProcessing ? 'Procesando...' : 'Confirmar venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de autorización de crédito ────────────────────────────────── */}
      {creditBlock && (
        <CreditAuthModal
          isOpen={showCreditModal}
          block={creditBlock}
          customerName={customer?.name ?? ''}
          cartTotal={dynamicTotal}
          currentDebt={customer?.current_debt ?? 0}
          creditLimit={customer?.credit_limit ?? 0}
          userRole={userRole}
          onAuthorized={(pin, authId, authName, newCreditLimit) => {
            setCreditOverridePin(pin);
            setCreditAuthorizerId(authId);
            setCreditAuthorized(true);
            setApprovedNewCreditLimit(newCreditLimit);
            setShowCreditModal(false);
            // Admin/manager: auto-submit inmediato
            if (isAdminOrMgr) {
              submit(pin, authId, newCreditLimit);
            }
            // Cajero: canConfirm ahora es true, el usuario debe pulsar "Confirmar"
          }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}
    </>
  );
}
