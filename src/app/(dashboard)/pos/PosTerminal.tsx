'use client';

import { useState, useMemo } from 'react';
import { Product } from '@/types/inventory';
import { usePosCart } from '@/store/CartProvider';
import { processSaleAction, searchCustomerByPhone } from '@/modules/pos/actions';
import { SaleSuccessModal } from '@/modules/pos/components/SaleSuccessModal';
import { toast } from 'sonner';

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
    /* 
    if (ncfType === 'B01' && (!customerName || !customerRnc)) {
      toast.error("El Comprobante Fiscal (B01) exige RNC y Razón Social.");
      return;
    }
    */

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
          // ncf: result.data.ncf,
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
    <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-4rem)] bg-gray-50/50">
      
      {/* --- LADO IZQUIERDO: Catálogo --- */}
      <div className="w-full lg:w-[65%] flex flex-col p-4 md:p-6 bg-white border-r border-gray-100 overflow-hidden">
        <div className="sticky top-0 bg-white z-10 pb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Buscar producto por nombre o código..."
              className="w-full pl-12 pr-4 py-3 md:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-base transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 overflow-y-auto pr-1 pb-6 flex-1">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOutOfStock}
                className={`text-left p-4 border rounded-xl flex flex-col justify-between h-32 transition-all ${isOutOfStock ? 'bg-gray-50 opacity-60' : 'bg-white hover:border-black hover:shadow-md'}`}
              >
                <span className={`font-medium line-clamp-2 text-sm ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'}`}>
                  {product.name}
                </span>
                <div className="flex justify-between items-end w-full mt-2">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${isOutOfStock ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    {isOutOfStock ? 'Agotado' : `Stock: ${product.stock}`}
                  </span>
                  <span className="font-bold text-base">${product.price.toLocaleString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- LADO DERECHO: Resumen y CRM --- */}
      <div className="w-full lg:w-[35%] flex flex-col bg-white lg:bg-gray-50 p-4 md:p-6 overflow-hidden">
        
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-lg font-bold">Resumen</h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-600 font-medium">Vaciar</button>
          )}
        </div>

        {/* 1. SELECCIÓN FISCAL Y MÉTODO DE PAGO */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* 
          <div className="flex bg-gray-200/50 p-1 rounded-lg">
            {[{v: 'B02', l: 'Consumidor'}, {v: 'B01', l: 'Fiscal'}].map(t => (
              <button key={t.v} onClick={() => setNcfType(t.v as any)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${ncfType === t.v ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
                {t.l}
              </button>
            ))}
          </div>
          */}
          <div className="flex bg-gray-200/50 p-1 rounded-lg">
            {[{v: 'cash', l: 'Contado'}, {v: 'credit', l: 'Crédito'}].map(t => (
              <button key={t.v} onClick={() => setPaymentMethod(t.v as any)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${paymentMethod === t.v ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* 2. CRM MINIMALISTA */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4 space-y-3">
          <div className="relative">
            <input 
              type="tel" 
              placeholder="Teléfono (Opcional)" 
              maxLength={10}
              value={customerPhone}
              onChange={handlePhoneChange}
              className={`w-full p-2.5 text-sm border rounded-lg outline-none focus:border-black ${paymentMethod === 'credit' ? 'border-red-300 placeholder-red-300' : 'border-gray-200'}`}
            />
            {isSearchingPhone && <span className="absolute right-3 top-3 text-[10px] text-gray-400">Buscando...</span>}
          </div>

          {/* Sugerencia Flotante */}
          {suggestedCustomer && (
            <div className="flex items-center justify-between bg-blue-50/50 p-2 rounded-lg border border-blue-100 animate-in fade-in">
              <div className="flex items-center gap-2">
                <UserIcon />
                <div className="text-xs">
                  <p className="font-semibold text-blue-900">{suggestedCustomer.name}</p>
                  <p className="text-blue-700/70">{suggestedCustomer.city || 'Sin ciudad'}</p>
                </div>
              </div>
              <button onClick={handleAcceptSuggestion} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 font-medium">
                Cargar
              </button>
            </div>
          )}

          {/* Campos Extendidos (Aparecen si se escribe algo o si es Crédito/B01) */}
          {(customerPhone.length > 0 || ncfType === 'B01' || paymentMethod === 'credit') && !suggestedCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in">
              <input 
                placeholder={ncfType === 'B01' ? "Razón Social *" : "Nombre del Cliente"} 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className={`w-full p-2.5 text-sm border rounded-lg outline-none focus:border-black ${(paymentMethod === 'credit' || ncfType === 'B01') ? 'border-red-300' : 'border-gray-200'}`}
              />
              {/* 
              {ncfType === 'B01' ? (
                <input 
                  placeholder="RNC Obligatorio *" 
                  value={customerRnc}
                  onChange={e => setCustomerRnc(e.target.value)}
                  className="w-full p-2.5 text-sm border border-red-300 rounded-lg outline-none focus:border-black"
                />
              ) : (
                <input 
                  placeholder="Ciudad" 
                  value={customerCity}
                  onChange={e => setCustomerCity(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-black"
                />
              )}
              */}
              <input 
                placeholder="Ciudad" 
                value={customerCity}
                onChange={e => setCustomerCity(e.target.value)}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-black"
              />
            </div>
          )}
        </div>

        {/* 3. CARRITO */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[100px]">
          {cart.length === 0 ? (
             <div className="h-full flex items-center justify-center text-gray-400 text-sm">Carrito vacío</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100">
                <div className="flex-1 pr-2">
                  <p className="font-semibold text-xs text-gray-900 truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-500">${item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-100 rounded-md">
                    <button onClick={() => updateQuantity(item.id, item.cartQuantity - 1)} className="w-6 h-6 flex items-center justify-center text-gray-600">-</button>
                    <span className="w-6 text-center text-xs font-bold">{item.cartQuantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.cartQuantity + 1)} className="w-6 h-6 flex items-center justify-center text-gray-600">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 p-1"><XIcon /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 4. FOOTER COBRO */}
        <div className="pt-4 border-t mt-4 bg-white lg:bg-gray-50">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-sm font-medium text-gray-500">Total a pagar</span>
            <span className="text-3xl font-black text-black">
              RD$ {cartTotal.toLocaleString()}
            </span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className={`w-full py-4 rounded-xl text-sm font-bold shadow transition-all ${isProcessing || cart.length === 0 ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800'}`}
          >
            {isProcessing ? 'Procesando...' : (paymentMethod === 'credit' ? 'Registrar Crédito' : 'Cobrar e Imprimir')}
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