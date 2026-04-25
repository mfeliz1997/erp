'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { CartItem, resolvePriceForLevel } from '@/types/pos';
import { Product } from '@/types/inventory';
import { processSaleAction } from '@/modules/pos/actions';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingSale {
  id: string;
  cart: CartItem[];
  total: number;
  customerName: string;
  customerRnc: string;
  customerPhone: string;
  ncfType: 'B01' | 'none';
  paymentMethod: 'cash' | 'credit' | 'transfer' | 'card';
  customerId?: string;
  receivedAmount?: number;
  savedAt: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  /** Reprices every cart item to match the given level (1=Detal, 2=Mayorista, 3=VIP). No fetch needed. */
  updateCartPrices: (level: 1 | 2 | 3) => void;
  total: number;
  cartTotal: number;
  isOnline: boolean;
  pendingSalesCount: number;
  enqueueSale: (sale: Omit<PendingSale, 'id' | 'savedAt'>) => void;
  /** Active price level so addToCart can inherit it for new items */
  activePriceLevel: 1 | 2 | 3;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY         = 'invenza_pos_cart';
const PENDING_KEY      = 'invenza_pos_pending_sales';
const SYNC_INTERVAL_MS = 15_000;

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [isMounted, setIsMounted]           = useState(false);
  const [isOnline, setIsOnline]             = useState(true);
  const [pendingSales, setPendingSales]     = useState<PendingSale[]>([]);
  const [activePriceLevel, setActivePriceLevel] = useState<1 | 2 | 3>(1);
  const isSyncing = useRef(false);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setIsMounted(true);
    setIsOnline(navigator.onLine);

    const savedCart = localStorage.getItem(CART_KEY);
    if (savedCart) {
      try {
        const parsed: CartItem[] = JSON.parse(savedCart);
        // Backfill unit_price for carts saved before multi-tier pricing
        setCart(parsed.map((item) => ({ ...item, unit_price: item.unit_price ?? item.price })));
      } catch {}
    }

    const savedPending = localStorage.getItem(PENDING_KEY);
    if (savedPending) {
      try { setPendingSales(JSON.parse(savedPending)); } catch {}
    }

    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Persist cart ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isMounted) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, isMounted]);

  // ── Persist pending queue ────────────────────────────────────────────────────

  useEffect(() => {
    if (isMounted) localStorage.setItem(PENDING_KEY, JSON.stringify(pendingSales));
  }, [pendingSales, isMounted]);

  // ── Sync pending sales when online ──────────────────────────────────────────

  const drainQueue = useCallback(async () => {
    if (isSyncing.current) return;
    const snapshot = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') as PendingSale[];
    if (snapshot.length === 0) return;
    if (!navigator.onLine) return;

    isSyncing.current = true;
    const remaining: PendingSale[] = [];

    for (const sale of snapshot) {
      try {
        const result = await processSaleAction({
          cart: sale.cart,
          total: sale.total,
          customerName: sale.customerName,
          customerRnc: sale.customerRnc,
          customerPhone: sale.customerPhone,
          ncfType: sale.ncfType,
          paymentMethod: sale.paymentMethod,
          customerId: sale.customerId,
          receivedAmount: sale.receivedAmount,
        });

        if (!result.success) {
          remaining.push(sale);
        }
      } catch {
        remaining.push(sale);
      }
    }

    setPendingSales(remaining);

    const synced = snapshot.length - remaining.length;
    if (synced > 0) {
      toast.success(`${synced} venta${synced > 1 ? 's' : ''} sincronizada${synced > 1 ? 's' : ''} correctamente`);
    }
    if (remaining.length > 0) {
      toast.error(`${remaining.length} venta${remaining.length > 1 ? 's' : ''} no pudo${remaining.length > 1 ? 'ieron' : ''} sincronizarse`);
    }

    isSyncing.current = false;
  }, []);

  // Drain on coming back online
  useEffect(() => {
    if (isOnline && isMounted) drainQueue();
  }, [isOnline, isMounted, drainQueue]);

  // Periodic drain while online
  useEffect(() => {
    if (!isMounted) return;
    const interval = setInterval(() => {
      if (navigator.onLine) drainQueue();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isMounted, drainQueue]);

  // ── Offline enqueue ──────────────────────────────────────────────────────────

  const enqueueSale = useCallback((sale: Omit<PendingSale, 'id' | 'savedAt'>) => {
    const entry: PendingSale = {
      ...sale,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      savedAt: Date.now(),
    };
    setPendingSales((prev) => [...prev, entry]);
    toast.warning('Sin conexión — venta guardada localmente. Se sincronizará al recuperar internet.', {
      duration: 5000,
    });
  }, []);

  // ── Cart operations ──────────────────────────────────────────────────────────

  const updateCartPrices = useCallback((level: 1 | 2 | 3) => {
    setActivePriceLevel(level);
    setCart((prev) =>
      prev.map((item) => ({
        ...item,
        unit_price: resolvePriceForLevel(item, level),
      }))
    );
  }, []);

  const addToCart = (product: Product) => {
    const unit_price = resolvePriceForLevel(product, activePriceLevel);
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      return [...prev, { ...product, unit_price, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((item) => item.id !== productId));

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId);
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, cartQuantity: quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + item.unit_price * item.cartQuantity, 0);
  const total     = cartTotal;

  if (!isMounted) return null;

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQuantity, clearCart,
      updateCartPrices, activePriceLevel,
      total, cartTotal,
      isOnline,
      pendingSalesCount: pendingSales.length,
      enqueueSale,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const usePosCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('usePosCart debe usarse dentro de un CartProvider');
  return context;
};
