"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
 
// Si usas shadcn, importa el Button. Si no, usa una etiqueta <button> normal.
import { Button } from "@/components/ui/button"; 
import { logManualWhatsappShare } from "@/modules/pos/actions";

interface Props {
  invoiceId: string;
  phone: string;
  customerName?: string;
  total: number;
}

export function WhatsappShareButton({ invoiceId, phone, customerName, total }: Props) {
  const [isSending, setIsSending] = useState(false);

  const handleShare = async () => {
    if (!phone) {
      alert("El cliente no tiene un número registrado.");
      return;
    }

    setIsSending(true);
    
    // 1. Log en background (no bloqueamos al usuario si falla)
    await logManualWhatsappShare(invoiceId);
    
    // 2. Formatear mensaje y URL
    const message = `Hola ${customerName || 'Cliente'}, gracias por tu compra en Invenza.\n\nTotal: RD$ ${total.toLocaleString()}\nTu factura digital: https://invenza.do/view/${invoiceId}`;
    const cleanPhone = phone.replace(/\D/g, ''); // Quita guiones o espacios
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // 3. Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
    setIsSending(false);
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleShare}
      disabled={isSending}
      className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
    >
      <MessageCircle className="h-4 w-4" />
      {isSending ? "Abriendo..." : "WhatsApp"}
    </Button>
  );
}