'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@/types/inventory';
import { usePosCart } from '@/store/CartProvider';
import { processSaleAction } from '@/modules/pos/actions';
import { SaleSuccessModal } from '@/modules/pos/components/SaleSuccessModal';
import { CheckoutModal, CheckoutPayload, type NcfType } from '@/modules/pos/components/CheckoutModal';
import { DiscountPickerModal } from '@/modules/pos/components/DiscountPickerModal';
import { CustomerSelector, type SelectedCustomer } from '@/modules/pos/components/CustomerSelector';
import { validateAdminPinAction } from '@/modules/pos/customer-actions';
import { toast } from 'sonner';
import { PRICE_TIER_LEVEL, type PriceTier, type Discount, type AppliedDiscount, resolvePriceForLevel } from '@/types/pos';
import {
  ShoppingCart, Trash2, Search,
  Plus, Minus, X, ChevronRight, WifiOff, Clock, Monitor, Tag, User,
  Wallet, CreditCard, Landmark, CheckCircle2, ShieldEllipsis, Ban, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

// ── Constants ──────────────────────────────────────────────────────────────────

const NCF_OPTIONS = [
  { id: 'none', label: 'Consumidor Final' },
  { id: 'B01',  label: 'Comprobante Fiscal' },
] as const;

const NCF_LABEL: Record<string, string> = {
  B01: 'Crédito Fiscal',
  B02: 'Consumidor Final',
  B14: 'Regímenes Especiales',
  B15: 'Gubernamental',
};
function ncfLabel(type: string | null | undefined): string {
  if (!type || type === 'none') return 'Consumidor Final';
  return NCF_LABEL[type] ?? type;
}

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'cash',     label: 'Efectivo',   icon: Wallet     },
  { id: 'card',     label: 'Tarjeta',    icon: CreditCard },
  { id: 'transfer', label: 'Transfer.',  icon: Landmark   },
  { id: 'credit',   label: 'Crédito',    icon: Clock      },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PosTerminalProps {
  initialProducts: Product[];
  profile: {
    role?: string;
    can_give_credit?: boolean;
    max_credit_days?: number;
    can_use_card?: boolean;
    can_use_transfer?: boolean;
    can_apply_discount?: boolean;
  } | null;
  openShiftName?: string | null;
  discounts: Discount[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PosTerminal({ initialProducts, profile, openShiftName, discounts }: PosTerminalProps) {
  const {
    cart, addToCart, removeFromCart, updateQuantity, clearCart,
    updateCartPrices, activePriceLevel,
    cartTotal, isOnline, pendingSalesCount, enqueueSale,
  } = usePosCart();

  const [searchTerm, setSearchTerm]           = useState('');
  const [isProcessing, setIsProcessing]       = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen]   = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  // ── Carrito: estado del pago ───────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [ncfType, setNcfType]                   = useState<NcfType>('none');
  const [appliedDiscount, setAppliedDiscount]   = useState<AppliedDiscount | null>(null);
  const [paymentMethod, setPaymentMethod]       = useState<PaymentMethod>('cash');
  const [receivedAmount, setReceivedAmount]     = useState('');
  const [creditDays, setCreditDays]             = useState(15);

  // PIN de método restringido (cajeros)
  const [authPin, setAuthPin]             = useState('');
  const [pinAuthorized, setPinAuthorized] = useState(false);

  // Autorización de crédito
  const [creditAuthorizerId, setCreditAuthorizerId] = useState('');
  const [creditAuthorized, setCreditAuthorized]     = useState(false);
  const [approvedNewCreditLimit, setApprovedNewCreditLimit] = useState<number | undefined>();
  const [inlineCreditLimit, setInlineCreditLimit]   = useState('');

  // ── Totales ────────────────────────────────────────────────────────────────
  const subtotal      = cartTotal;
  const discountAmount = appliedDiscount?.amount ?? 0;
  const finalTotal    = Math.max(0, subtotal - discountAmount);

  const change = useMemo(() => {
    const n = parseFloat(receivedAmount);
    return isNaN(n) ? 0 : Math.max(0, n - finalTotal);
  }, [receivedAmount, finalTotal]);

  // ── Roles ──────────────────────────────────────────────────────────────────
  const userRole      = profile?.role || 'pos';
  const isPosRole     = userRole === 'pos';
  const isAdminOrMgr  = userRole === 'admin' || userRole === 'manager';

  const canUseCard     = profile?.can_use_card     || false;
  const canUseTransfer = profile?.can_use_transfer  || false;
  const maxCreditDays  = profile?.max_credit_days   || 30;

  // ── Credit block ───────────────────────────────────────────────────────────
  const computedCreditBlock = useMemo(() => {
    if (paymentMethod !== 'credit' || !selectedCustomer) return null;
    if (selectedCustomer.credit_limit === 0) return { kind: 'no_credit' as const };
    const newDebt = selectedCustomer.current_debt + finalTotal;
    if (newDebt > selectedCustomer.credit_limit)
      return { kind: 'limit_exceeded' as const, newDebt, excess: newDebt - selectedCustomer.credit_limit };
    return null;
  }, [paymentMethod, selectedCustomer, finalTotal]);

  // ── PIN de método restringido ──────────────────────────────────────────────
  const needsMethodPin = useMemo(() => {
    if (!isPosRole) return false;
    if (paymentMethod === 'card')     return !canUseCard;
    if (paymentMethod === 'transfer') return !canUseTransfer;
    return false;
  }, [isPosRole, paymentMethod, canUseCard, canUseTransfer]);

  // ── Reset pin/auth cuando cambia método ───────────────────────────────────
  useEffect(() => {
    setAuthPin(''); setPinAuthorized(false);
    setCreditAuthorizerId(''); setCreditAuthorized(false);
    setApprovedNewCreditLimit(undefined); setInlineCreditLimit('');
    setReceivedAmount('');
  }, [paymentMethod, finalTotal]);

  // ── Reprice cart when customer changes ────────────────────────────────────
  useEffect(() => {
    const tier  = selectedCustomer?.price_tier as PriceTier | undefined;
    const level = tier ? (PRICE_TIER_LEVEL[tier] ?? 1) : 1;
    updateCartPrices(level);
  }, [selectedCustomer, updateCartPrices]);

  // ── Recalculate discount when subtotal changes ────────────────────────────
  useEffect(() => {
    if (!appliedDiscount) return;
    if (appliedDiscount.type === 'percentage') {
      const newAmount = Math.round((subtotal * appliedDiscount.value) / 100 * 100) / 100;
      setAppliedDiscount(prev => prev ? { ...prev, amount: newAmount } : null);
    } else {
      const newAmount = Math.min(appliedDiscount.value, subtotal);
      setAppliedDiscount(prev => prev ? { ...prev, amount: newAmount } : null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  // ── canConfirm ─────────────────────────────────────────────────────────────
  const canConfirm = useMemo(() => {
    if (cart.length === 0 || isProcessing) return false;
    if (needsMethodPin && !pinAuthorized) return false;
    if (computedCreditBlock && !creditAuthorized && !isAdminOrMgr) return false;
    if (paymentMethod === 'cash') {
      const n = parseFloat(receivedAmount);
      if (isNaN(n) || n < finalTotal) return false;
    }
    if (paymentMethod === 'credit' || ncfType === 'B01') {
      if (!selectedCustomer?.name?.trim()) return false;
    }
    if (ncfType === 'B01' && !selectedCustomer?.rnc?.trim()) return false;
    return true;
  }, [
    cart.length, isProcessing, needsMethodPin, pinAuthorized,
    computedCreditBlock, creditAuthorized, isAdminOrMgr,
    paymentMethod, receivedAmount, finalTotal,
    ncfType, selectedCustomer,
  ]);

  // ── Filtered products ──────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return initialProducts;
    const lower = searchTerm.toLowerCase();
    return initialProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        ((p as any).barcode && (p as any).barcode.includes(lower))
    );
  }, [searchTerm, initialProducts]);

  // ── Checkout ───────────────────────────────────────────────────────────────

  const handleOpenCheckout = () => {
    if (paymentMethod === 'cash') {
      const n = parseFloat(receivedAmount);
      if (isNaN(n) || n < finalTotal) {
        toast.error('Ingresa el monto recibido antes de confirmar');
        return;
      }
    }
    if (computedCreditBlock && !creditAuthorized && isAdminOrMgr) {
      const limitToSet = inlineCreditLimit ? parseFloat(inlineCreditLimit) : undefined;
      setApprovedNewCreditLimit(limitToSet);
      setCreditAuthorized(true);
    }
    setIsCheckoutModalOpen(true);
  };

  const handleFinalizeCheckout = async (payload: CheckoutPayload) => {
    setIsProcessing(true);

    if (!isOnline) {
      enqueueSale({
        cart,
        total: finalTotal,
        customerName: payload.customerName,
        customerRnc: payload.customerRnc,
        customerPhone: payload.customerPhone,
        ncfType: payload.ncfType,
        paymentMethod: payload.method,
        customerId: payload.customerId,
        receivedAmount: payload.receivedAmount,
      });
      setLastInvoiceData({
        id: `offline-${Date.now()}`,
        total: finalTotal,
        customerPhone: payload.customerPhone,
        customerName: payload.customerName,
        items: cart.map((i) => ({ name: i.name, price: i.unit_price, qty: i.cartQuantity })),
      });
      resetCart();
      setIsCheckoutModalOpen(false);
      setIsSuccessModalOpen(true);
      setIsProcessing(false);
      return;
    }

    try {
      const result = await processSaleAction({
        cart,
        total: finalTotal,
        subtotal,
        customerName: payload.customerName,
        customerRnc: payload.customerRnc,
        customerPhone: payload.customerPhone,
        ncfType: payload.ncfType,
        paymentMethod: payload.method,
        customerId: payload.customerId,
        receivedAmount: payload.receivedAmount,
        creditDays: payload.creditDays,
        authPin: payload.authPin,
        userRole,
        creditAuthorizerId: payload.creditAuthorizerId,
        discountId: appliedDiscount?.id ?? undefined,
        discountName: appliedDiscount?.name ?? undefined,
        discountAmount: appliedDiscount?.amount ?? undefined,
      });

      if (result.success) {
        setLastInvoiceData({
          id: result.data.id,
          ncf: result.data.ncf,
          total: finalTotal,
          customerPhone: payload.customerPhone,
          customerName: payload.customerName,
          items: cart.map((i) => ({ name: i.name, price: i.unit_price, qty: i.cartQuantity })),
        });
        resetCart();
        setIsCheckoutModalOpen(false);
        setIsSuccessModalOpen(true);
      } else {
        toast.error(result.error || 'Error al procesar la venta');
      }
    } catch {
      toast.error('Error de conexión — intenta de nuevo');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCart = () => {
    clearCart();
    setSelectedCustomer(null);
    setNcfType('none');
    setAppliedDiscount(null);
    setPaymentMethod('cash');
    setReceivedAmount('');
    setCreditDays(15);
    setAuthPin(''); setPinAuthorized(false);
    setCreditAuthorizerId(''); setCreditAuthorized(false);
    setApprovedNewCreditLimit(undefined); setInlineCreditLimit('');
  };

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    setLastInvoiceData(null);
  };

  // ── Credit auth via PIN (cajero) ───────────────────────────────────────────

  const handleCreditPinAuth = async (pin: string) => {
    const res = await validateAdminPinAction(pin, { action: 'credit_override', amount: finalTotal });
    if (res.success) {
      setCreditAuthorizerId(res.authorizer_id);
      setCreditAuthorized(true);
    } else {
      toast.error(res.error || 'PIN inválido');
    }
  };

  // ── Cart panel (shared desktop + mobile sheet) ─────────────────────────────

  const cartSummaryContent = () => (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 overscroll-contain">

        {/* ── Cliente ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <User size={11} /> Cliente
          </h3>
          <CustomerSelector
            value={selectedCustomer}
            onChange={(c) => {
              setSelectedCustomer(c);
              if (c?.ncf_type === 'B01') setNcfType('B01');
              else if (!c) setNcfType('none');
            }}
            showDebtBadge
          />
        </div>

        {/* ── Tipo de Comprobante ──────────────────────────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Comprobante
          </h3>
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-md border border-border/50">
            {NCF_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setNcfType(opt.id as NcfType)}
                className={`py-1.5 text-[11px] font-semibold rounded transition-all ${
                  ncfType === opt.id
                    ? 'bg-background shadow-sm text-foreground border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Tipo de comprobante registrado en el perfil del cliente */}
          {selectedCustomer?.ncf_type && (
            <p className="text-[11px] text-muted-foreground px-0.5">
              <span className="font-semibold text-foreground">{selectedCustomer.name.split(' ')[0]}</span>
              {' '}factura con{' '}
              <span className="font-semibold text-foreground">{ncfLabel(selectedCustomer.ncf_type)}</span>
              {' '}({selectedCustomer.ncf_type})
            </p>
          )}
        </div>

        {/* ── Método de Pago ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Método de pago
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => {
              const active = paymentMethod === id;
              return (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 border rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Crédito sin cliente: aviso ────────────────────────────────── */}
          {paymentMethod === 'credit' && !selectedCustomer && (
            <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <User size={12} className="text-amber-600 shrink-0" />
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                Selecciona un cliente para vender a crédito
              </p>
            </div>
          )}

          {/* ── Efectivo: monto recibido + cambio ─────────────────────────── */}
          {paymentMethod === 'cash' && (
            <div className="mt-2 space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Monto recibido
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">RD$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-10 h-10 text-base font-semibold tabular-nums bg-background focus-visible:ring-0 focus-visible:border-foreground"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-right pb-0.5 min-w-[72px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Cambio</p>
                  <p className={`text-lg font-bold tabular-nums ${change > 0 ? 'text-emerald-500' : 'text-foreground/40'}`}>
                    RD${change.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Crédito: plazo (solo si hay cliente seleccionado) ─────────── */}
          {paymentMethod === 'credit' && selectedCustomer && (
            <div className="mt-2 space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Plazo de pago
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setCreditDays(d)}
                    disabled={d > maxCreditDays}
                    className={`py-1.5 text-xs font-semibold rounded-md border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      creditDays === d
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card text-foreground border-border hover:border-foreground/40'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Límite: {maxCreditDays} días</p>

              {/* Bloqueo de crédito */}
              {selectedCustomer && computedCreditBlock && !creditAuthorized && (
                <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 space-y-2">
                  <div className="flex items-start gap-1.5">
                    <Ban size={12} className="text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {computedCreditBlock.kind === 'no_credit' ? (
                        <>
                          <p className="text-[11px] font-semibold text-destructive">
                            {selectedCustomer.name.split(' ')[0]} no tiene crédito asignado
                          </p>
                          {isAdminOrMgr && (
                            <p className="text-[10px] text-destructive/70">Puedes asignarle un límite para autorizar esta venta:</p>
                          )}
                          {!isAdminOrMgr && (
                            <p className="text-[10px] text-destructive/70">Se requiere PIN de supervisor para continuar.</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] font-semibold text-destructive">
                            {selectedCustomer.name.split(' ')[0]} ha sobrepasado su límite de crédito
                          </p>
                          <p className="text-[10px] text-destructive/70">
                            Deuda actual: RD${selectedCustomer.current_debt.toLocaleString()} · Límite: RD${selectedCustomer.credit_limit.toLocaleString()} · Excede en RD${computedCreditBlock.excess.toLocaleString()}
                          </p>
                          {isAdminOrMgr && (
                            <p className="text-[10px] text-destructive/70 mt-0.5">Puedes ampliar su límite para continuar:</p>
                          )}
                          {!isAdminOrMgr && (
                            <p className="text-[10px] text-destructive/70">Se requiere PIN de supervisor para continuar.</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {isAdminOrMgr && (
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] text-destructive/80 shrink-0">
                        {computedCreditBlock.kind === 'no_credit' ? 'Asignar límite:' : 'Nuevo límite:'}
                      </Label>
                      <Input
                        type="number"
                        className="h-7 text-xs font-bold w-full bg-background border-destructive/30"
                        placeholder={finalTotal.toString()}
                        value={inlineCreditLimit}
                        onChange={(e) => setInlineCreditLimit(e.target.value)}
                      />
                    </div>
                  )}
                  {!isAdminOrMgr && (
                    <CreditPinInput onAuthorized={handleCreditPinAuth} />
                  )}
                </div>
              )}
              {creditAuthorized && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 size={13} /> Crédito autorizado
                </div>
              )}
            </div>
          )}

          {/* ── PIN método restringido ────────────────────────────────────── */}
          {needsMethodPin && !pinAuthorized && (
            <div className="mt-2 p-2.5 rounded-md bg-card border border-border space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldEllipsis size={13} />
                <p className="text-[11px] font-semibold uppercase tracking-wide">PIN de autorización</p>
              </div>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="• • • •"
                className={`text-center text-xl tracking-[0.8em] h-10 bg-background focus-visible:ring-0 focus-visible:border-foreground ${authPin.length === 4 ? 'border-emerald-500' : ''}`}
                maxLength={4}
                inputMode="numeric"
                value={authPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setAuthPin(val);
                  if (val.length === 4) setPinAuthorized(true);
                }}
              />
            </div>
          )}
          {needsMethodPin && pinAuthorized && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mt-1">
              <CheckCircle2 size={13} /> PIN válido — autorizado
            </div>
          )}
        </div>

        {/* ── Productos ───────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            Productos
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
              {cart.length}
            </span>
          </h3>

          {cart.length === 0 ? (
            <div className="py-10 border border-dashed border-border rounded-xl flex flex-col items-center text-muted-foreground">
              <ShoppingCart size={28} strokeWidth={1} className="mb-2 opacity-40" />
              <p className="text-xs font-medium">Carrito vacío</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {cart.map((item) => {
                const maxStock = initialProducts.find((p) => p.id === item.id)?.stock ?? Infinity;
                const atMax = item.cartQuantity >= maxStock;
                return (
                  <div key={item.id} className="flex gap-2 bg-card p-3 border border-border rounded-lg items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs tabular-nums text-muted-foreground mt-0.5">
                        RD${item.unit_price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5 border border-border/50">
                      <button
                        onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-semibold tabular-nums">
                        {item.cartQuantity}
                      </span>
                      <button
                        onClick={() => {
                          if (atMax) { toast.error(`Stock máximo: ${maxStock}`); return; }
                          updateQuantity(item.id, item.cartQuantity + 1);
                        }}
                        disabled={atMax}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-muted-foreground/40 hover:text-destructive p-1.5 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed footer ────────────────────────────────────────────────────── */}
      <div className="shrink-0 w-full px-3 pt-3 pb-15 border-t border-border bg-background space-y-2">

        {/* Descuento */}
        {cart.length > 0 && (
          <button
            onClick={() => setIsDiscountModalOpen(true)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
              appliedDiscount
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Tag size={12} />
              {appliedDiscount ? appliedDiscount.name : 'Agregar descuento'}
            </span>
            {appliedDiscount
              ? <span className="font-bold">−RD${appliedDiscount.amount.toLocaleString()}</span>
              : <ChevronRight size={12} className="opacity-40" />}
          </button>
        )}

        {/* Subtotal si hay descuento */}
        {appliedDiscount && (
          <div className="flex justify-between items-center px-1 text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium">RD${subtotal.toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Total a cobrar
            </span>
            <div className="text-xl md:text-3xl font-black tracking-tighter tabular-nums text-foreground leading-none mt-0.5 truncate">
              <span className="text-sm md:text-base opacity-40 mr-1 font-semibold">RD$</span>
              {finalTotal.toLocaleString()}
            </div>
          </div>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clearCart(); setAppliedDiscount(null); }}
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
            >
              <Trash2 size={13} className="mr-1" /> Limpiar
            </Button>
          )}
        </div>

        <Button
          onClick={handleOpenCheckout}
          disabled={!canConfirm}
          className="w-full h-13 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
        >
          FINALIZAR VENTA <ChevronRight size={16} className="opacity-60" />
        </Button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-none px-4 pt-16 md:pt-3 pb-0 bg-background z-30">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3">

          {!isOnline && (
            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-md shrink-0">
              <WifiOff size={14} />
              <span className="text-[11px] font-semibold">Sin conexión</span>
            </div>
          )}
          {isOnline && pendingSalesCount > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-md shrink-0">
              <Clock size={14} />
              <span className="text-[11px] font-semibold">Sincronizando {pendingSalesCount}…</span>
            </div>
          )}
          {openShiftName && (
            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 border border-border px-2.5 py-1.5 rounded-md shrink-0">
              <Monitor size={13} />
              <span className="text-[11px] font-semibold">{openShiftName}</span>
            </div>
          )}

          <div className="relative flex-1 group">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input
              type="text"
              autoFocus
              placeholder="Escanear o buscar producto..."
              className="w-full pl-12 h-13 text-base font-medium bg-card border-border shadow-sm rounded-xl focus-visible:ring-0 focus-visible:border-foreground transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 max-w-[1600px] w-full mx-auto p-4 gap-4 overflow-hidden">

        {/* Product grid */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-y-auto pb-24 md:pb-4 pr-1">
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center text-muted-foreground">
                <Search size={32} strokeWidth={1} className="mb-2 opacity-30" />
                <p className="text-sm">Sin resultados para "{searchTerm}"</p>
              </div>
            )}
            {filteredProducts.map((product) => {
              const inCart     = cart.find((i) => i.id === product.id)?.cartQuantity ?? 0;
              const outOfStock = product.stock <= 0;
              const atLimit    = inCart >= product.stock;
              const disabled   = outOfStock || atLimit;
              const hasImage   = !!product.image_url;
              const displayPrice = resolvePriceForLevel(product, activePriceLevel);

              return (
                <button
                  key={product.id}
                  onClick={() => {
                    if (atLimit) { toast.error(`Stock máximo alcanzado (${product.stock})`); return; }
                    addToCart(product);
                  }}
                  disabled={disabled}
                  className={`relative flex flex-col justify-between rounded-xl border transition-all text-left active:scale-[0.97] group overflow-hidden ${
                    disabled
                      ? 'bg-muted/30 border-border opacity-50 cursor-not-allowed'
                      : 'bg-card border-border hover:border-foreground/30 hover:bg-muted/10'
                  } ${hasImage ? 'h-48 sm:h-52' : 'h-36 p-4'}`}
                >
                  {/* Product image */}
                  {hasImage && (
                    <div className="relative w-full h-24 sm:h-28 bg-muted/20 overflow-hidden shrink-0">
                      <Image
                        src={product.image_url!}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {inCart > 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {inCart}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product info */}
                  <div className={`flex flex-col justify-between flex-1 ${hasImage ? 'p-3 pt-2' : 'space-y-1'}`}>
                    <div className="space-y-1">
                      <p className={`font-semibold text-sm leading-tight line-clamp-2 ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {product.name}
                      </p>
                      <Badge
                        variant={outOfStock ? 'destructive' : atLimit ? 'secondary' : 'outline'}
                        className="text-[9px] px-1.5 py-0 tabular-nums"
                      >
                        {outOfStock ? 'AGOTADO' : atLimit ? `MÁX: ${product.stock}` : `DISP: ${product.stock - inCart}`}
                      </Badge>
                    </div>
                    <div className={`flex items-center justify-between mt-auto pt-2 ${!hasImage ? 'border-t border-transparent group-hover:border-border/40' : ''}`}>
                      <span className="font-bold text-sm tabular-nums">RD${displayPrice.toLocaleString()}</span>
                      {!hasImage && (
                        <div className="p-1.5 bg-primary/10 text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
                          <Plus size={14} />
                        </div>
                      )}
                      {hasImage && inCart === 0 && (
                        <div className="p-1 bg-primary/10 text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
                          <Plus size={13} />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop cart */}
        <div className="hidden md:flex w-[320px] 2xl:w-[360px] flex-col border rounded-xl bg-card overflow-hidden shadow-sm border-border self-stretch max-h-full">
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="font-semibold text-xs uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart size={15} /> Carrito de venta
            </h2>
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums">
              {cart.reduce((a, b) => a + b.cartQuantity, 0)} items
            </span>
          </div>
          {cartSummaryContent()}
        </div>
      </div>

      {/* ── Mobile Sheet (controlled, opens on load) ───────────────────────── */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {/* Trigger oculto — solo para reabrir cuando el sheet se cierra */}
        <SheetTrigger asChild>
          <button className="md:hidden fixed bottom-4 right-4 z-40 bg-primary text-primary-foreground rounded-full shadow-lg w-14 h-14 flex items-center justify-center"
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((a, b) => a + b.cartQuantity, 0)}
              </span>
            )}
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="md:hidden h-[90dvh] p-0 rounded-t-2xl border-0 overflow-hidden flex flex-col">
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart size={15} className="text-primary" /> Resumen de venta
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">

            {/* ── Cliente ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <User size={11} /> Cliente
              </h3>
              <CustomerSelector
                value={selectedCustomer}
                onChange={(c) => {
                  setSelectedCustomer(c);
                  if (c?.ncf_type === 'B01') setNcfType('B01');
                  else if (!c) setNcfType('none');
                }}
                showDebtBadge
              />
            </div>

            {/* ── Comprobante ──────────────────────────────────────────────── */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Comprobante</h3>
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-md border border-border/50">
                {NCF_OPTIONS.map((opt) => (
                  <button key={opt.id} onClick={() => setNcfType(opt.id as NcfType)}
                    className={`py-1.5 text-[11px] font-semibold rounded transition-all ${
                      ncfType === opt.id ? 'bg-background shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {selectedCustomer?.ncf_type && (
                <p className="text-[11px] text-muted-foreground px-0.5">
                  <span className="font-semibold text-foreground">{selectedCustomer.name.split(' ')[0]}</span>
                  {' '}factura con{' '}
                  <span className="font-semibold text-foreground">{ncfLabel(selectedCustomer.ncf_type)}</span>
                  {' '}({selectedCustomer.ncf_type})
                </p>
              )}
            </div>

            {/* ── Método de pago ───────────────────────────────────────────── */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Método de pago
              </h3>
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 border rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${
                      paymentMethod === id
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Efectivo */}
              {paymentMethod === 'cash' && cart.length > 0 && (
                <div className="flex items-end gap-2 mt-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Monto recibido</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">RD$</span>
                      <Input
                        type="number"
                        placeholder="0"
                        className="pl-10 h-10 text-base font-semibold tabular-nums bg-background focus-visible:ring-0 focus-visible:border-foreground"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="text-right pb-0.5 min-w-[72px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Cambio</p>
                    <p className={`text-lg font-bold tabular-nums ${change > 0 ? 'text-emerald-500' : 'text-foreground/40'}`}>
                      RD${change.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Crédito sin cliente: aviso */}
              {paymentMethod === 'credit' && !selectedCustomer && (
                <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <User size={12} className="text-amber-600 shrink-0" />
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Selecciona un cliente para vender a crédito
                  </p>
                </div>
              )}

              {/* Crédito */}
              {paymentMethod === 'credit' && selectedCustomer && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[7, 15, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => setCreditDays(d)}
                        disabled={d > maxCreditDays}
                        className={`py-1.5 text-xs font-semibold rounded-md border transition-all disabled:opacity-30 ${
                          creditDays === d ? 'bg-foreground text-background border-foreground' : 'bg-card text-foreground border-border'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                  {computedCreditBlock && !creditAuthorized && (
                    <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 space-y-2">
                      <div className="flex items-start gap-1.5">
                        <Ban size={12} className="text-destructive shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          {computedCreditBlock.kind === 'no_credit' ? (
                            <>
                              <p className="text-[11px] font-semibold text-destructive">
                                {selectedCustomer!.name.split(' ')[0]} no tiene crédito asignado
                              </p>
                              <p className="text-[10px] text-destructive/70">
                                {isAdminOrMgr ? 'Puedes asignarle un límite para autorizar esta venta:' : 'Se requiere PIN de supervisor para continuar.'}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-[11px] font-semibold text-destructive">
                                {selectedCustomer!.name.split(' ')[0]} ha sobrepasado su límite de crédito
                              </p>
                              <p className="text-[10px] text-destructive/70">
                                Deuda: RD${selectedCustomer!.current_debt.toLocaleString()} · Límite: RD${selectedCustomer!.credit_limit.toLocaleString()} · Excede RD${computedCreditBlock.excess.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-destructive/70">
                                {isAdminOrMgr ? 'Puedes ampliar su límite para continuar:' : 'Se requiere PIN de supervisor para continuar.'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {isAdminOrMgr && (
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px] text-destructive/80 shrink-0">
                            {computedCreditBlock.kind === 'no_credit' ? 'Asignar límite:' : 'Nuevo límite:'}
                          </Label>
                          <Input type="number" className="h-7 text-xs font-bold w-full bg-background border-destructive/30"
                            placeholder={finalTotal.toString()} value={inlineCreditLimit}
                            onChange={(e) => setInlineCreditLimit(e.target.value)} />
                        </div>
                      )}
                      {!isAdminOrMgr && <CreditPinInput onAuthorized={handleCreditPinAuth} />}
                    </div>
                  )}
                  {creditAuthorized && (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                      <CheckCircle2 size={13} /> Crédito autorizado
                    </div>
                  )}
                </div>
              )}

              {/* PIN método restringido */}
              {needsMethodPin && !pinAuthorized && (
                <div className="mt-2 p-2.5 rounded-md bg-card border border-border space-y-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldEllipsis size={13} />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">PIN de autorización</p>
                  </div>
                  <Input type="password" autoComplete="new-password" placeholder="• • • •"
                    className={`text-center text-xl tracking-[0.8em] h-10 bg-background focus-visible:ring-0 focus-visible:border-foreground ${authPin.length === 4 ? 'border-emerald-500' : ''}`}
                    maxLength={4} inputMode="numeric" value={authPin}
                    onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setAuthPin(val); if (val.length === 4) setPinAuthorized(true); }} />
                </div>
              )}
              {needsMethodPin && pinAuthorized && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mt-1">
                  <CheckCircle2 size={13} /> PIN válido — autorizado
                </div>
              )}
            </div>

            {/* ── Sección progresiva: solo cuando hay productos ─────────────── */}
            {cart.length > 0 && (
              <>
                {/* Productos */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Productos
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]">{cart.length}</span>
                  </h3>
                  <div className="space-y-1.5">
                    {cart.map((item) => {
                      const maxStock = initialProducts.find((p) => p.id === item.id)?.stock ?? Infinity;
                      const atMax = item.cartQuantity >= maxStock;
                      return (
                        <div key={item.id} className="flex gap-2 bg-card p-3 border border-border rounded-lg items-center">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs tabular-nums text-muted-foreground mt-0.5">RD${item.unit_price.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5 border border-border/50">
                            <button onClick={() => updateQuantity(item.id, item.cartQuantity - 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors">
                              <Minus size={12} />
                            </button>
                            <span className="w-5 text-center text-xs font-semibold tabular-nums">{item.cartQuantity}</span>
                            <button
                              onClick={() => { if (atMax) { toast.error(`Stock máximo: ${maxStock}`); return; } updateQuantity(item.id, item.cartQuantity + 1); }}
                              disabled={atMax}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground/40 hover:text-destructive p-1.5 rounded transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Descuento */}
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
                    appliedDiscount ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Tag size={12} />{appliedDiscount ? appliedDiscount.name : 'Agregar descuento'}</span>
                  {appliedDiscount ? <span className="font-bold">−RD${appliedDiscount.amount.toLocaleString()}</span> : <ChevronRight size={12} className="opacity-40" />}
                </button>

                {/* Total */}
                {appliedDiscount && (
                  <div className="flex justify-between items-center px-1 text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-medium">RD${subtotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total a cobrar</span>
                    <div className="text-3xl font-black tracking-tighter tabular-nums text-foreground leading-none mt-0.5">
                      <span className="text-base opacity-40 mr-1 font-semibold">RD$</span>{finalTotal.toLocaleString()}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { clearCart(); setAppliedDiscount(null); }}
                    className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs">
                    <Trash2 size={13} className="mr-1" /> Limpiar
                  </Button>
                </div>
              </>
            )}

            {/* ── Venta rápida (cuando no hay productos ni cliente) ────────── */}
            {cart.length === 0 && !selectedCustomer && (
              <div className="py-4 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center">
                  <ShoppingCart size={20} strokeWidth={1.5} className="text-muted-foreground opacity-60" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Agrega productos desde el catálogo</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">o inicia una venta rápida sin datos del cliente</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 font-semibold text-xs h-9 px-4 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setNcfType('none');
                    setPaymentMethod('cash');
                    setMobileSheetOpen(false);
                  }}
                >
                  <Zap size={13} /> Venta rápida
                </Button>
              </div>
            )}
          </div>

          {/* Footer con botón confirmar — solo cuando hay productos */}
          {cart.length > 0 && (
            <div className="shrink-0 px-4 pt-3 pb-8 border-t border-border bg-background space-y-2">
              <Button
                onClick={handleOpenCheckout}
                disabled={!canConfirm}
                className="w-full h-13 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
              >
                FINALIZAR VENTA <ChevronRight size={16} className="opacity-60" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <DiscountPickerModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        discounts={discounts}
        cartSubtotal={subtotal}
        canApplyDiscount={!!(profile?.can_apply_discount || profile?.role === 'admin')}
        onApply={setAppliedDiscount}
        currentDiscount={appliedDiscount}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onConfirm={handleFinalizeCheckout}
        total={finalTotal}
        subtotal={subtotal}
        appliedDiscount={appliedDiscount}
        isProcessing={isProcessing}
        method={paymentMethod}
        ncfType={ncfType}
        customer={selectedCustomer}
        receivedAmount={parseFloat(receivedAmount) || 0}
        change={change}
        creditDays={creditDays}
        authPin={authPin || undefined}
        creditAuthorizerId={creditAuthorizerId || undefined}
        approvedNewCreditLimit={approvedNewCreditLimit}
      />

      {lastInvoiceData && (
        <SaleSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={handleSuccessClose}
          invoiceData={lastInvoiceData}
        />
      )}
    </div>
  );
}

// ── CreditPinInput (inline para cajero) ───────────────────────────────────────

function CreditPinInput({ onAuthorized }: { onAuthorized: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <ShieldEllipsis size={12} />
        <p className="text-[11px] font-semibold uppercase tracking-wide">PIN de supervisor</p>
      </div>
      <Input
        type="password"
        autoComplete="new-password"
        placeholder="• • • •"
        className={`text-center text-xl tracking-[0.8em] h-10 bg-background focus-visible:ring-0 focus-visible:border-foreground ${pin.length === 4 ? 'border-emerald-500' : ''}`}
        maxLength={4}
        inputMode="numeric"
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setPin(val);
          if (val.length === 4) onAuthorized(val);
        }}
      />
    </div>
  );
}
