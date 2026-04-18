'use client';

import { useState, useMemo } from 'react';
import { Product } from '@/types/inventory';
import { usePosCart } from '@/store/CartProvider';
import { processSaleAction, searchCustomerByPhone } from '@/modules/pos/actions';
import { SaleSuccessModal } from '@/modules/pos/components/SaleSuccessModal';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';

// --- Iconos SVG Minimalistas ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

export default function PosTerminal({ initialProducts }: { initialProducts: Product[] }) {

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = usePosCart();

  const cartTotal = useMemo(() => 
    cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0), 
  [cart]);

  // Estados Generales
  const [searchTerm, setSearchTerm] = useState("");
  const [ncfType, setNcfType] = useState<'B02' | 'B01'>('B02');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');

  // Estados del Cliente (CRM)
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerRnc, setCustomerRnc] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Estados de Búsqueda y UX
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [suggestedCustomer, setSuggestedCustomer] = useState<any>(null);
  
  // Estados de Venta
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);

  // 1. Filtrado Rápido de Productos
const filteredProducts = useMemo(() => {
    if (!searchTerm) return initialProducts;
    const lower = searchTerm.toLowerCase();
    return initialProducts.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      ((p as any).barcode && (p as any).barcode.includes(lower))  
    );
  }, [searchTerm, initialProducts]);

  // 2. Lógica de Búsqueda de Teléfono (Sugerencia Opcional)
  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/\D/g, ''); // Solo números
    setCustomerPhone(phone);
    setSuggestedCustomer(null); // Ocultar sugerencia previa
    setCustomerId(null); // Desvincular si cambia el número

    if (phone.length === 10) {
      setIsSearchingPhone(true);
      try {
        const found = await searchCustomerByPhone(phone);
        if (found) {
          setSuggestedCustomer(found); // Mostramos la alerta, no lo autocompletamos
        }
      } catch (error) {
        console.error("Error al buscar cliente");
      } finally {
        setIsSearchingPhone(false);
      }
    }
  };

  // 3. Aceptar la sugerencia del CRM
  const handleAcceptSuggestion = () => {
    if (suggestedCustomer) {
      setCustomerName(suggestedCustomer.name || "");
      setCustomerCity(suggestedCustomer.city || "");
      setCustomerId(suggestedCustomer.id);
      setSuggestedCustomer(null); // Ocultar el mensaje
    }
  };

  // 4. Cobrar y Validar
  const handleCheckout = async () => {
    // Validaciones estrictas
    if (paymentMethod === 'credit' && (!customerName || customerPhone.length < 10)) {
      toast.error("Venta a crédito exige Nombre y Teléfono válido.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processSaleAction(
        cart,
        cartTotal,
        customerName,
        customerRnc,
        customerPhone,
        ncfType,
        paymentMethod
      );

      if (result.success) {
        setLastInvoiceData({
          id: result.data.id,
          total: cartTotal,
          customerPhone: customerPhone,
          customerName: customerName,
          items: cart.map(i => ({ name: i.name, price: i.price, qty: i.cartQuantity }))
        });
        
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

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-gray-50/50">
      
      {/* --- LADO IZQUIERDO: Catálogo --- */}
      <div className="w-full lg:w-[60%] flex flex-col flex-1 p-4 md:p-6 bg-white border-r border-gray-100 min-h-0">
        <div className="sticky top-0 bg-white z-10 pb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Buscar producto..."
              className="w-full pl-12 pr-4 py-3 md:py-4 border border-gray-200 rounded-xl focus:ring-0 outline-none text-base transition-all font-bold placeholder:font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 overflow-y-auto pr-1 pb-6 flex-1 min-h-0">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOutOfStock}
                className={`text-left p-3 md:p-4 border-2 rounded-xl flex flex-col justify-between h-28 md:h-32 transition-all ${
                  isOutOfStock 
                    ? 'bg-gray-50 border-gray-200 opacity-60' 
                    : 'bg-white border-black hover:bg-gray-50 shadow-sm rounded-xl hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
                }`}
              >
                <span className={`font-semibold   line-clamp-2 text-xs md:text-sm ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'}`}>
                  {product.name}
                </span>
                <div className="flex justify-between items-end w-full mt-2">
                  <span className={`text-xs md:text-xs font-semibold  px-2 py-0.5 border ${isOutOfStock ? 'border-red-200 text-red-600' : 'border-black bg-gray-100 text-gray-500'}`}>
                    {isOutOfStock ? 'Agotado' : `Stock: ${product.stock}`}
                  </span>
                  <span className="font-semibold text-xs md:text-base ">${product.price.toLocaleString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- LADO DERECHO: Resumen y CRM --- */}
      <div className="w-full lg:w-[40%] flex flex-col bg-white lg:bg-gray-50 p-4 md:p-6 border-t-2 lg:border-t-0 border-black min-h-[400px] lg:min-h-0 lg:max-h-full">
        
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
          <h2 className="text-xl font-semibold   ">Resumen de Venta</h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs font-semibold  text-red-600 underline decoration-red-200 underline-offset-4">Vaciar Carrito</button>
          )}
        </div>

        {/* 1. SELECCIÓN MÉTODO DE PAGO */}
        <div className="grid grid-cols-1 gap-2 mb-4">
          <div className="flex border border-gray-200 p-1 bg-white">
            {[{v: 'cash', l: 'PAGO AL CONTADO'}, {v: 'credit', l: 'VENTA A CRÉDITO'}].map(t => (
              <button key={t.v} onClick={() => setPaymentMethod(t.v as any)} className={`flex-1 py-1.5 text-xs font-semibold   transition-all ${paymentMethod === t.v ? 'bg-primary text-primary-foreground' : 'text-gray-400 hover:text-black'}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* 2. CRM MINIMALISTA */}
        <div className="bg-white p-4 border border-gray-200 shadow-sm rounded-xl mb-6 space-y-4">
          <div className="relative">
            <input 
              type="tel" 
              placeholder="TELÉFONO DEL CLIENTE..." 
              maxLength={10}
              value={customerPhone}
              onChange={handlePhoneChange}
              className={`w-full p-2.5 text-xs font-bold border-2 rounded-xl outline-none transition-all ${paymentMethod === 'credit' ? 'border-red-300 placeholder:text-red-200' : 'border-gray-200 focus:border-black'}`}
            />
            {isSearchingPhone && <span className="absolute right-3 top-3 text-xs font-semibold text-blue-500 animate-pulse">BUSCANDO...</span>}
          </div>

          {/* Sugerencia Flotante */}
          {suggestedCustomer && (
            <div className="flex items-center justify-between bg-primary text-primary-foreground p-3 rounded-xl animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 text-black">
                   <UserIcon />
                </div>
                <div className="text-xs">
                  <p className="font-semibold  ">{suggestedCustomer.name}</p>
                  <p className="text-gray-400 font-bold ">{suggestedCustomer.city || 'SIN CIUDAD'}</p>
                </div>
              </div>
              <button onClick={handleAcceptSuggestion} className="text-xs bg-white text-black px-4 py-2 font-semibold  hover:bg-gray-200 transition-colors">
                CARGAR
              </button>
            </div>
          )}

          {/* Campos Extendidos */}
          {(customerPhone.length > 0 || paymentMethod === 'credit') && !suggestedCustomer && (
            <div className="grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-bottom-2">
              <input 
                placeholder="NOMBRE O RAZÓN SOCIAL *" 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className={`w-full p-2.5 text-xs font-bold border-2 rounded-xl outline-none focus:border-black placeholder:font-semibold ${paymentMethod === 'credit' ? 'border-red-300' : 'border-gray-200'}`}
              />
              <input 
                placeholder="CIUDAD / UBICACIÓN" 
                value={customerCity}
                onChange={e => setCustomerCity(e.target.value)}
                className="w-full p-2.5 text-xs font-bold border-2 border-gray-200 rounded-xl outline-none focus:border-black"
              />
            </div>
          )}
        </div>

        {/* 3. CARRITO */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <ShoppingCart size={32} className="opacity-20" />
                <span className="text-xs font-semibold  ">Carrito de venta vacío</span>
             </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-3 border border-gray-200">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-[11px]   truncate leading-tight">{item.name}</p>
                  <p className="text-xs font-bold text-gray-500 mt-0.5">RD$ {item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 bg-gray-50">
                    <button onClick={() => updateQuantity(item.id, item.cartQuantity - 1)} className="w-8 h-8 flex items-center justify-center font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">-</button>
                    <span className="w-8 text-center text-xs font-semibold">{item.cartQuantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.cartQuantity + 1)} className="w-8 h-8 flex items-center justify-center font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors"><XIcon /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 4. FOOTER COBRO */}
        <div className="pt-6 border-t border-gray-200 mt-6 bg-white lg:bg-transparent">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold   text-gray-400">Total a Pagar</span>
            <span className="text-4xl font-semibold  ">
              RD$ {cartTotal.toLocaleString()}
            </span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className={`w-full py-5 text-sm font-semibold   transition-all relative overflow-hidden ${
              isProcessing || cart.length === 0 
                ? 'bg-gray-100 text-gray-400 border-2 border-gray-200' 
                : 'bg-primary text-primary-foreground shadow-sm rounded-xl hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            }`}
          >
            {isProcessing ? 'PROCESANDO TRANSACCION...' : (paymentMethod === 'credit' ? 'REGISTRAR CRÉDITO' : 'COBRAR E IMPRIMIR')}
          </button>
        </div>

      </div>

      {/* MODAL FASE 4 */}
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