'use client';

import { useState, useMemo } from 'react';
import { Product } from '@/types/inventory';
import { usePosCart } from '@/store/CartProvider';
import { processSaleAction, searchCustomerByPhone } from '@/modules/pos/actions';
import { SaleSuccessModal } from '@/modules/pos/components/SaleSuccessModal';
import { CheckoutModal } from '@/modules/pos/components/CheckoutModal';
import { toast } from 'sonner';
import {
  ShoppingCart,
  User,
  ReceiptText,
  Trash2,
  CreditCard,
  Search,
  Plus,
  Minus,
  X,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export default function PosTerminal({ initialProducts, profile }: { initialProducts: Product[], profile: any }) {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = usePosCart();

  const cartTotal = useMemo(() =>
    cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0),
    [cart]);

  // Estados Generales
  const [searchTerm, setSearchTerm] = useState("");
  const [ncfType, setNcfType] = useState<'B02' | 'B01'>('B02');

  // Estados del Cliente
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerRnc, setCustomerRnc] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  // UX
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [suggestedCustomer, setSuggestedCustomer] = useState<any>(null);

  // Venta
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);

  // Filtrado de Productos
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return initialProducts;
    const lower = searchTerm.toLowerCase();
    return initialProducts.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      ((p as any).barcode && (p as any).barcode.includes(lower))
    );
  }, [searchTerm, initialProducts]);

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/\D/g, '');
    setCustomerPhone(phone);
    setSuggestedCustomer(null);
    setCustomerId(null);

    if (phone.length === 10) {
      setIsSearchingPhone(true);
      try {
        const found = await searchCustomerByPhone(phone);
        if (found) setSuggestedCustomer(found);
      } catch (error) {
        console.error("Error al buscar cliente");
      } finally {
        setIsSearchingPhone(false);
      }
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestedCustomer) {
      setCustomerName(suggestedCustomer.name || "");
      setCustomerCity(suggestedCustomer.city || "");
      setCustomerId(suggestedCustomer.id);
      setSuggestedCustomer(null);
    }
  };

  const handleStartCheckout = () => {
    if (ncfType === 'B01' && !customerRnc) {
      toast.error("El Crédito Fiscal (B01) requiere RNC del cliente.");
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  const handleFinalizeCheckout = async (paymentData: { method: any; receivedAmount?: number }) => {
    setIsProcessing(true);
    try {
      const result = await processSaleAction(
        cart,
        cartTotal,
        customerName,
        customerRnc,
        customerPhone,
        ncfType,
        paymentData.method,
        customerId || undefined,
        paymentData.receivedAmount
      );

      if (result.success) {
        setLastInvoiceData({
          id: result.data.id,
          total: cartTotal,
          customerPhone: customerPhone,
          customerName: customerName,
          items: cart.map(i => ({ name: i.name, price: i.price, qty: i.cartQuantity }))
        });
        setIsCheckoutModalOpen(false);
        setIsSuccessModalOpen(true);
        clearCart();
      } else {
        toast.error(result.error || "Error al procesar la venta");
      }
    } catch (err) {
      toast.error("Error crítico de conexión");
    } finally {
      setIsProcessing(false);
    }
  };

  // Componente del Resumen (Para reusar en Desktop y Mobile Sheet)

  const CartSummaryContent = () => (
    // El contenedor principal usa max-h-screen para evitar que crezca más allá de la pantalla en desktop
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      {/* Área scrolleable: flex-1 toma el espacio restante, overflow-y-auto permite el scroll interno */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 overscroll-contain">

        {/* --- SECCIÓN: PRODUCTOS --- */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            Productos Seleccionados
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
              {cart.length}
            </span>
          </h3>

          {cart.length === 0 ? (
            <div className="py-12 bg-muted/30 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart size={32} strokeWidth={1} className="mb-3 opacity-50" />
              <p className="text-sm font-medium">El carrito está vacío</p>
              <p className="text-xs opacity-70 mt-1">Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 bg-card p-3 border border-border/50 hover:border-border shadow-sm rounded-xl items-center transition-all group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs font-bold text-primary tabular-nums mt-0.5">
                      RD$ {item.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/50">
                    <button
                      onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-background shadow-sm border border-border/50 hover:bg-muted transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold tabular-nums">
                      {item.cartQuantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-background shadow-sm border border-border/50 hover:bg-muted transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors ml-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECCIÓN: FACTURACIÓN --- */}
        <div className="space-y-4 pt-6 border-t border-border/50">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Detalles de Facturación
          </h3>

          {/* Selector NCF (Estilo Segmented Control) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-lg border border-border/50">
            <button
              onClick={() => setNcfType('B02')}
              className={`py-2 px-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${ncfType === 'B02'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground hover:text-foreground/80'
                }`}
            >
              CONSUMIDOR <span className="opacity-50 font-normal">(B02)</span>
            </button>
            <button
              onClick={() => setNcfType('B01')}
              className={`py-2 px-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${ncfType === 'B01'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground hover:text-foreground/80'
                }`}
            >
              CRÉDITO FISCAL <span className="opacity-50 font-normal">(B01)</span>
            </button>
          </div>

          <div className="space-y-3">
            {/* Input Teléfono */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-muted-foreground/70" />
              </div>
              <Input
                type="tel"
                placeholder="Teléfono del cliente..."
                className="pl-9 h-11 text-sm bg-background border-border/50 focus:border-primary transition-colors"
                value={customerPhone}
                onChange={handlePhoneChange}
              />
              {isSearchingPhone && (
                <span className="absolute right-3 top-3.5 text-[10px] text-primary animate-pulse font-bold tracking-wider">
                  BUSCANDO...
                </span>
              )}
            </div>

            {/* Sugerencia de Cliente */}
            {suggestedCustomer && (
              <button
                onClick={handleAcceptSuggestion}
                className="w-full flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl text-left animate-in slide-in-from-top-2 fade-in hover:bg-primary/10 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary truncate">{suggestedCustomer.name}</p>
                  <p className="text-xs text-primary/70 font-medium uppercase mt-0.5">
                    {suggestedCustomer.city || 'Ciudad no especificada'}
                  </p>
                </div>
                <div className="bg-background rounded-full p-1.5 border border-primary/20">
                  <UserPlus size={14} className="text-primary shrink-0" />
                </div>
              </button>
            )}

            {/* Input Nombre */}
            <Input
              placeholder="Nombre del cliente"
              className="h-11 text-sm bg-background border-border/50"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />

            {/* Input RNC (Solo si es B01) */}
            {ncfType === 'B01' && (
              <Input
                placeholder="RNC / Cédula (Obligatorio)"
                className="h-11 text-sm bg-background border-primary/40 focus-visible:ring-primary shadow-[0_0_0_1px_rgba(var(--primary),0.1)]"
                value={customerRnc}
                onChange={e => setCustomerRnc(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* --- FOOTER FIJO (Siempre visible abajo) --- */}
      <div className="shrink-0 w-full px-4 pt-4 pb-12 md:pb-15 pb-[calc(env(safe-area-inset-bottom,1.5rem)+1rem)] border-t border-border/50 bg-background z-20">
        <div className="flex justify-between items-end mb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Total a Cobrar
            </span>
            <div className="text-3xl font-black tracking-tighter tabular-nums text-foreground leading-none">
              <span className="text-lg opacity-50 mr-1 font-bold tracking-normal">RD$</span>
              {cartTotal.toLocaleString()}
            </div>
          </div>

          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-destructive/80 hover:text-destructive hover:bg-destructive/10 h-8 px-3 rounded-md font-semibold text-xs"
            >
              <Trash2 size={14} className="mr-1.5" /> Limpiar
            </Button>
          )}
        </div>

        <Button
          onClick={handleStartCheckout}
          disabled={cart.length === 0 || isProcessing}
          className="w-full h-14 text-base font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] rounded-xl flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <span className="animate-pulse flex items-center gap-2">
              PROCESANDO...
            </span>
          ) : (
            <>
              COBRAR ORDEN
              <ChevronRight size={18} className="text-primary-foreground/70" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── HEADER PRINCIPAL ── */}
      <header className="flex-none p-4 pb-0 bg-background z-30">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              autoFocus
              placeholder="Escanear o buscar producto..."
              className="w-full pl-14 h-14 text-lg font-medium bg-card border-border shadow-sm rounded-xl focus-visible:ring-primary transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="flex-1 flex min-h-0 container mx-auto p-4 gap-4">

        {/* Lado Izquierdo: Catálogo */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-y-auto pb-24 lg:pb-6 custom-scrollbar pr-1">
            {filteredProducts.map(product => {
              const outOfStock = product.stock <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={outOfStock}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all text-left h-36 active:scale-[0.97] group ${outOfStock
                    ? 'bg-muted/30 border-border opacity-60 grayscale cursor-not-allowed'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-muted/10'
                    }`}
                >
                  <div className="space-y-1.5">
                    <p className={`font-semibold text-sm leading-tight line-clamp-2 ${outOfStock ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {product.name}
                    </p>
                    <Badge variant={outOfStock ? "destructive" : "outline"} className="text-[9px] px-1.5 py-0 tabular-nums">
                      {outOfStock ? 'AGOTADO' : `DISP: ${product.stock}`}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-transparent group-hover:border-border/50">
                    <span className="font-bold text-base tracking-tight tabular-nums">RD$ {product.price.toLocaleString()}</span>
                    <div className="p-1.5 bg-primary/10 text-primary rounded-lg hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lado Derecho: Resumen (Solo Desktop) */}
        <div className="hidden lg:flex w-[350px] 2xl:w-[400px] flex-col border rounded-2xl bg-card overflow-hidden sticky top-0 shadow-sm border-border">
          <div className="px-5 py-4 border-b bg-muted/20 flex justify-between items-center">
            <h2 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart size={18} /> Carrito de Venta
            </h2>
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums">
              {cart.reduce((a, b) => a + b.cartQuantity, 0)} ITEMS
            </span>
          </div>
          <CartSummaryContent />
        </div>
      </div>

      {/* ── BARRA FLOTANTE MÓVIL (Solo Mobile) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t p-4 pb-6 flex items-center justify-between gap-4 z-40">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
          <span className="text-xl font-extrabold tabular-nums tracking-tighter">RD$ {cartTotal.toLocaleString()}</span>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="flex-1 h-14 rounded-xl font-bold gap-2">
              <ShoppingCart size={18} />
              VER CARRITO ({cart.length})
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90dvh] p-0 rounded-t-3xl border-0 overflow-hidden">
            <SheetHeader className="p-4 border-b bg-muted/10">
              <SheetTitle className="flex justify-between items-center pr-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} className="text-primary" />
                  <span>RESUMEN DE VENTA</span>
                </div>
                {/* El botón de cerrar del Sheet ya existe por defecto en Shadcn */}
              </SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-hidden">
              <CartSummaryContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* MODALES TÉCNICOS (NO ALTERAR LÓGICA) */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onConfirm={handleFinalizeCheckout}
        total={cartTotal}
        isProcessing={isProcessing}
        canSellOnCredit={profile?.can_sell_on_credit || false}
        maxCreditDays={profile?.max_credit_days || 30}
      />

      {lastInvoiceData && (
        <SaleSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => {
            setIsSuccessModalOpen(false);
            setCustomerPhone("");
            setCustomerName("");
            setCustomerRnc("");
            setCustomerCity("");
            setCustomerId(null);
          }}
          invoiceData={lastInvoiceData}
        />
      )}
    </div>
  );
}