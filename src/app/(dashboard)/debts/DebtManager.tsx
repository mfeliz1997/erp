"use client";

import { useState } from "react";
import { registerPaymentAction } from "@/modules/debts/actions";

export default function DebtManager({ initialDebts }: { initialDebts: any[] }) {
  const [debts, setDebts] = useState(initialDebts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  
  const [amount, setAmount] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredDebts = debts.filter(d => 
    d.invoices?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePayment = async () => {
    if (!selectedDebt || !amount || amount <= 0 || amount > selectedDebt.balance) {
      return alert("Monto inválido");
    }

    setIsProcessing(true);
    const res = await registerPaymentAction(selectedDebt.id, Number(amount), "cash");
    setIsProcessing(false);

    if (res.success) {
      alert(`Abono registrado con éxito. Nuevo balance: $${res.data?.newBalance}`);
      
      // Actualizar UI sin recargar la página
      setDebts(prev => 
        prev.map(d => d.id === selectedDebt.id ? { ...d, balance: res.data?.newBalance } : d)
        .filter(d => d.balance > 0) // Ocultar si ya se pagó todo
      );
      setSelectedDebt(null);
      setAmount("");
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  return (
    <div>
      {/* Buscador */}
      <input
        type="text"
        placeholder="🔍 Buscar cliente..."
        className="w-full p-3 mb-6 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Lista de Deudas */}
      <div className="space-y-3">
        {filteredDebts.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No hay deudas pendientes registradas.</p>
        ) : (
          filteredDebts.map(debt => (
            <div key={debt.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl hover:border-gray-300 transition-colors bg-gray-50/50">
              <div className="mb-3 sm:mb-0">
                <p className="font-bold text-gray-900 text-lg">{debt.invoices?.customer_name || 'Cliente Genérico'}</p>
                <div className="flex gap-3 text-sm text-gray-500 mt-1">
                  <span>Factura Original: ${debt.total_amount.toLocaleString()}</span>
                  <span>•</span>
                  <span>{new Date(debt.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="text-right flex-1 sm:flex-none">
                  <p className="text-xs font-semibold text-gray-400 ">Balance Pendiente</p>
                  <p className="font-bold text-red-600 text-xl">${Number(debt.balance).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => { setSelectedDebt(debt); setAmount(debt.balance); }}
                  className="bg-white border border-gray-200 text-black font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
                >
                  Abonar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Pago (Baja Fricción) */}
      {selectedDebt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-1">Registrar Abono</h3>
            <p className="text-sm text-gray-500 mb-5">Cliente: <span className="font-semibold text-black">{selectedDebt.invoices?.customer_name}</span></p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500  mb-1">Monto a Pagar (Máx: ${selectedDebt.balance})</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full p-3 text-2xl font-bold border border-gray-200 rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedDebt(null)}
                className="flex-1 py-3 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePayment}
                disabled={isProcessing || !amount || amount <= 0 || amount > selectedDebt.balance}
                className="flex-1 py-3 font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-md"
              >
                {isProcessing ? "Procesando..." : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}