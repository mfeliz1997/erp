'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, CreditCard, Landmark, Clock, CheckCircle2, AlertCircle, ShieldEllipsis } from 'lucide-react';
import { validateAdminPin } from '@/modules/pos/actions';
import { toast } from 'sonner';

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    method: PaymentMethod;
    receivedAmount?: number;
    creditDays?: number;
  }) => void;
  total: number;
  isProcessing: boolean;
  canSellOnCredit: boolean;
  maxCreditDays: number;
}

export function CheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  isProcessing,
  canSellOnCredit,
  maxCreditDays
}: CheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [creditDays, setCreditDays] = useState<number>(15);
  const [adminPin, setAdminPin] = useState<string>('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const change = useMemo(() => {
    const received = parseFloat(receivedAmount);
    if (isNaN(received)) return 0;
    return Math.max(0, received - total);
  }, [receivedAmount, total]);

  const canConfirm = useMemo(() => {
    if (method === 'cash') {
      return parseFloat(receivedAmount) >= total;
    }
    if (method === 'credit' && !canSellOnCredit && !isAuthorized) {
      return false;
    }
    return true;
  }, [method, receivedAmount, total, canSellOnCredit, isAuthorized]);

  const handleAdminAuth = async () => {
    setIsAuthorizing(true);
    const result = await validateAdminPin(adminPin);
    if (result.success) {
      setIsAuthorized(true);
      toast.success("Autorización concedida");
    } else {
      toast.error(result.error || "PIN incorrecto");
    }
    setIsAuthorizing(false);
  };

  const handleConfirm = () => {
    onConfirm({
      method,
      receivedAmount: method === 'cash' ? parseFloat(receivedAmount) : total,
      creditDays: method === 'credit' ? creditDays : undefined
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-2 border-black p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 bg-gray-50 border-b-2 border-black">
          <DialogTitle className="text-2xl font-semibold   flex items-center gap-3">
             <div className="p-2 bg-black text-white">
                <Wallet className="w-5 h-5" />
             </div>
             Finalizar Venta
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* Selector de Método */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'cash', label: 'Efectivo', icon: Wallet },
              { id: 'card', label: 'Tarjeta', icon: CreditCard },
              { id: 'transfer', label: 'Transferencia', icon: Landmark },
              { id: 'credit', label: 'Crédito', icon: Clock },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMethod(item.id as PaymentMethod)}
                className={`flex items-center gap-3 p-4 border-2 transition-all text-left ${
                  method === item.id 
                    ? 'border-black bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
                    : 'border-gray-200 hover:border-black'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Lógica Dinámica */}
          <div className="space-y-6">
            {method === 'cash' && (
              <div className="space-y-4 p-4 border-2 border-dashed border-gray-200 bg-gray-50/50">
                <div className="flex justify-between items-end gap-6">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-400">Monto Recibido</Label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">RD$</span>
                       <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-12 py-6 text-xl font-semibold border-2 border-black focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <Label className="text-xs font-bold uppercase text-gray-400">Cambio</Label>
                    <p className={`text-3xl font-semibold ${change > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      RD$ {change.toLocaleString()}
                    </p>
                  </div>
                </div>
                {receivedAmount && parseFloat(receivedAmount) < total && (
                  <div className="flex items-center gap-2 text-red-500 bg-red-50 p-2 border border-red-200 text-xs font-bold uppercase">
                    <AlertCircle className="w-4 h-4" />
                    Monto insuficiente
                  </div>
                )}
              </div>
            )}

            {method === 'credit' && (
              <div className="space-y-6">
                {(!canSellOnCredit && !isAuthorized) ? (
                  <div className="p-6 border-2 border-red-500 bg-red-50 space-y-4">
                    <div className="flex items-center gap-3 text-red-700">
                       <ShieldEllipsis className="w-6 h-6" />
                       <h4 className="font-semibold">Requiere Autorización</h4>
                    </div>
                    <p className="text-xs font-bold text-red-600/80">
                      Su cuenta no tiene permisos para realizar ventas a crédito. Ingrese el PIN de un administrador para continuar.
                    </p>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="PIN DE ADMINISTRADOR"
                        className="border-2 border-red-500 py-6 text-center text-2xl tracking-[1em] focus-visible:ring-0"
                        maxLength={4}
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                      />
                      <Button 
                        onClick={handleAdminAuth} 
                        disabled={isAuthorizing || adminPin.length < 4}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        {isAuthorizing ? "VALIDANDO..." : "AUTORIZAR COBRO"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-2 border-black bg-white space-y-4">
                     <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase">Venta a Crédito Autorizada</span>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-400">Plazo de Pago (Días)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[7, 15, 30].map(days => (
                            <Button
                              key={days}
                              variant="outline"
                              onClick={() => setCreditDays(days)}
                              disabled={days > maxCreditDays}
                              className={`border-2 font-semibold ${creditDays === days ? 'bg-black text-white border-black' : 'border-gray-200'}`}
                            >
                              {days} Días
                            </Button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold italic mt-2">
                          * Límite para este usuario: {maxCreditDays} días.
                        </p>
                     </div>
                  </div>
                )}
              </div>
            )}

            {(method === 'card' || method === 'transfer') && (
              <div className="p-8 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-3">
                 <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    {method === 'card' ? <CreditCard className="text-gray-400" /> : <Landmark className="text-gray-400" />}
                 </div>
                 <div>
                    <p className="font-semibold">Confirmar Recepción</p>
                    <p className="text-xs font-bold text-gray-400">Asegúrese de procesar el pago en la terminal física antes de confirmar.</p>
                 </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t-2 border-black flex-col sm:flex-row gap-4">
          <div className="flex-1 flex flex-col justify-center">
             <span className="text-xs font-bold text-gray-400 uppercase">Total a cobrar</span>
             <span className="text-2xl font-semibold">RD$ {total.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="font-semibold text-gray-400">CANCELAR</Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!canConfirm || isProcessing}
              className="px-8 py-6 bg-primary text-primary-foreground font-semibold   shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              {isProcessing ? "PROCESANDO..." : "CONFIRMAR VENTA"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
