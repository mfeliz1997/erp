'use client';

import { usePosCart } from "@/store/CartProvider";
import { X, Minus, Plus, ShoppingBag, Send } from "lucide-react";
import { useEffect, useState } from "react";

export function CartDrawer({ isOpen, onClose, tenant }: { isOpen: boolean, onClose: () => void, tenant: any }) {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = usePosCart();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSendOrder = () => {
    const phone = tenant.settings?.whatsapp_number || "18090000000";
    
    let message = `🛒 *NUEVO PEDIDO - ${tenant.name}*\n`;
    message += `--------------------------------\n\n`;
    
    cart.forEach(item => {
      message += `📦 *${item.name}*\n`;
      message += `   ${item.cartQuantity} x RD$ ${item.price.toLocaleString()} = *RD$ ${(item.price * item.cartQuantity).toLocaleString()}*\n\n`;
    });
    
    message += `--------------------------------\n`;
    message += `💰 *TOTAL A PAGAR: RD$ ${total.toLocaleString()}*\n\n`;
    message += `🙌 ¡Hola! Me gustaría hacer este pedido. ¿Cómo procedemos con el pago y envío?`;

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(url, "_blank");
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div 
        className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-black text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest text-sm">Tu Carrito</span>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
              <ShoppingBag className="w-16 h-16 stroke-1 text-black" />
              <div>
                <p className="font-bold uppercase tracking-[.2em] text-sm">Tu carrito está vacío</p>
                <p className="text-xs mt-2 font-medium">Agrega algunos productos para comenzar tu pedido.</p>
              </div>
              <button 
                onClick={handleClose}
                className="mt-4 px-8 py-3 bg-white border border-black font-bold text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all rounded-none"
              >
                Volver al catálogo
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-6 group">
                <div className="w-20 h-20 bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 rounded-none">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🛍️</div>
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold uppercase text-sm tracking-tight leading-tight">{item.name}</h4>
                    <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">RD$ {item.price.toLocaleString()}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center border border-black rounded-none">
                      <button 
                        onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3 h-3 text-black" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{item.cartQuantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-3 h-3 text-black" />
                      </button>
                    </div>
                    <p className="font-bold text-sm tracking-tight text-black">RD$ {(item.price * item.cartQuantity).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-100 space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-end">
              <span className="text-gray-500 uppercase font-bold text-[10px] tracking-widest">Subtotal</span>
              <span className="text-2xl font-black">RD$ {total.toLocaleString()}</span>
            </div>
            
            <button 
              onClick={handleSendOrder}
              className="w-full py-4 bg-black text-white font-bold uppercase tracking-[.2em] text-sm flex items-center justify-center gap-3 hover:bg-gray-900 transition-all active:scale-[0.98]"
            >
              Hacer pedido por WhatsApp
              <Send className="w-4 h-4" />
            </button>
            <button 
              onClick={clearCart}
              className="w-full text-[10px] uppercase font-bold text-gray-400 hover:text-gray-600 transition-colors tracking-widest"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
