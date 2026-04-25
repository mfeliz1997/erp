'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@/types/inventory';
import { usePosCart } from '@/store/CartProvider';
import { processSaleAction } from '@/modules/pos/actions';
import { SaleSuccessModal } from '@/modules/pos/components/SaleSuccessModal';
import { CheckoutModal, CheckoutPayload } from '@/modules/pos/components/CheckoutModal';
import { DiscountPickerModal } from '@/modules/pos/components/DiscountPickerModal';
import { toast } from 'sonner';
import type { SelectedCustomer } from '@/modules/pos/components/CustomerSelector';
import { PRICE_TIER_LEVEL, type PriceTier, type Discount, type AppliedDiscount } from '@/types/pos';
import {
  ShoppingCart, Trash2, Search,
  Plus, Minus, X, ChevronRight, WifiOff, Clock, Monitor, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

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
    updateCartPrices,
    cartTotal, isOnline, pendingSalesCount, enqueueSale,
  } = usePosCart();

  const [searchTerm, setSearchTerm]           = useState('');
  const [isProcessing, setIsProcessing]       = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen]   = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [appliedDiscount, setAppliedDiscount]   = useState<AppliedDiscount | null>(null);

  // Subtotal antes de descuento
  const subtotal = cartTotal;
  // Total final con descuento
  const discountAmount = appliedDiscount?.amount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Reprice cart instantly when customer changes
  useEffect(() => {
    const tier = selectedCustomer?.price_tier as PriceTier | undefined;
    const level = tier ? (PRICE_TIER_LEVEL[tier] ?? 1) : 1;
    updateCartPrices(level);
  }, [selectedCustomer, updateCartPrices]);

  // Recalculate discount amount when subtotal changes
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
      clearCart();
      setSelectedCustomer(null);
      setAppliedDiscount(null);
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
        userRole: profile?.role,
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
        clearCart();
        setSelectedCustomer(null);
        setAppliedDiscount(null);
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

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    setLastInvoiceData(null);
  };

  // ── Cart panel (shared desktop + mobile sheet) ─────────────────────────────

  const cartSummaryContent = () => (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 overscroll-contain">
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

      {/* Fixed footer */}
      <div className="shrink-0 w-full px-3 pt-3 pb-15 border-t border-border bg-background space-y-2">

        {/* Botón de descuento */}
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
          onClick={() => setIsCheckoutModalOpen(true)}
          disabled={cart.length === 0 || isProcessing}
          className="w-full h-13 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <span className="animate-pulse">Procesando...</span>
          ) : (
            <>
              COBRAR ORDEN <ChevronRight size={16} className="opacity-60" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-none px-4 pt-16 lg:pt-3 pb-0 bg-background z-30">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-y-auto pb-24 lg:pb-4 pr-1">
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center text-muted-foreground">
                <Search size={32} strokeWidth={1} className="mb-2 opacity-30" />
                <p className="text-sm">Sin resultados para "{searchTerm}"</p>
              </div>
            )}
            {filteredProducts.map((product) => {
              const inCart    = cart.find((i) => i.id === product.id)?.cartQuantity ?? 0;
              const outOfStock = product.stock <= 0;
              const atLimit   = inCart >= product.stock;
              const disabled  = outOfStock || atLimit;
              const hasImage  = !!product.image_url;

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
                      <span className="font-bold text-sm tabular-nums">RD${product.price.toLocaleString()}</span>
                      {!hasImage && (
                        <div className="p-1.5 bg-primary/10 text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
                          <Plus size={14} />
                        </div>
                      )}
                      {/* Cart badge for image cards */}
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
        <div className="hidden lg:flex w-[300px] 2xl:w-[340px] flex-col border rounded-xl bg-card overflow-hidden shadow-sm border-border self-stretch max-h-full">
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

      {/* ── Mobile bottom bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 pb-5 flex items-center gap-3 z-40">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Total</span>
          <span className="text-xl font-extrabold tabular-nums">RD${finalTotal.toLocaleString()}</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="flex-1 h-12 rounded-xl font-bold gap-2">
              <ShoppingCart size={16} />
              Ver carrito ({cart.length})
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90dvh] p-0 rounded-t-2xl border-0 overflow-hidden">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart size={16} className="text-primary" /> Resumen de venta
              </SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-hidden">
              {cartSummaryContent()}
            </div>
          </SheetContent>
        </Sheet>
      </div>

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
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setSelectedCustomer(null);
        }}
        onConfirm={handleFinalizeCheckout}
        total={finalTotal}
        subtotal={subtotal}
        appliedDiscount={appliedDiscount}
        isProcessing={isProcessing}
        canSellOnCredit={profile?.can_give_credit || false}
        maxCreditDays={profile?.max_credit_days || 30}
        userRole={profile?.role || 'pos'}
        canUseCard={profile?.can_use_card || false}
        canUseTransfer={profile?.can_use_transfer || false}
        initialCustomer={selectedCustomer}
        onCustomerChange={setSelectedCustomer}
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
