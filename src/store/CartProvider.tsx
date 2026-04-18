'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { CartItem } from '@/types/pos';
import { Product } from '@/types/inventory';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

 

  // Baja Fricción: Cargar carrito guardado al montar la app
  useEffect(() => {
    setIsMounted(true);
    const savedCart = localStorage.getItem('invenza_pos_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  // Guardar automáticamente en LocalStorage cada vez que cambie el carrito
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('invenza_pos_cart', JSON.stringify(cart));
    }
  }, [cart, isMounted]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId);
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, cartQuantity: quantity } : item))
    );
  };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);


  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  // Prevenir error de hidratación en Next.js (SSR mismatch)
  if (!isMounted) return null;

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total,cartTotal }}>
      {children}
    </CartContext.Provider>
    
  );
}

// Hook personalizado
export const usePosCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('usePosCart debe usarse dentro de un CartProvider');
  return context;
};