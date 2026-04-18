"use client";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
 import { PrintTicketButton } from "./PrintTicketButton";
import { Button } from "@/components/ui/button";
import { WhatsappShareButton } from "@/lib/WhatsappShareButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: {
    id: string;
    ncf?: string;
    total: number;
    customerPhone: string;
    customerName: string;
    items: any[];
  };
}

export function SaleSuccessModal({ isOpen, onClose, invoiceData }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-green-600">
            ¡Venta Completada!
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Monto Total</p>
            <h2 className="text-3xl font-bold">RD$ {invoiceData.total.toLocaleString()}</h2>
            {/* <p className="text-xs font-mono mt-1 text-slate-500">{invoiceData.ncf}</p> */}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Botón de Impresión Física */}
            <PrintTicketButton invoiceData={invoiceData} />
            
            {/* Botón de WhatsApp Manual */}
            <WhatsappShareButton 
              invoiceId={invoiceData.id}
              phone={""} // invoiceData.customerPhone (Oculto en Lite)
              customerName={invoiceData.customerName}
              total={invoiceData.total}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Nueva Venta (Esc)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}