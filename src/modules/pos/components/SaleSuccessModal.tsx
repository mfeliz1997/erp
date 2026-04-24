"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PrintTicketButton } from "./PrintTicketButton";
import { WhatsappShareButton } from "@/lib/WhatsappShareButton";
import { CheckCircle2 } from "lucide-react";

interface InvoiceItem {
  name: string;
  price: number;
  qty: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: {
    id: string;
    ncf?: string;
    total: number;
    customerPhone: string;
    customerName: string;
    items: InvoiceItem[];
  };
}

export function SaleSuccessModal({ isOpen, onClose, invoiceData }: Props) {
  // Real Esc / Enter keybinding
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const { ncf, total, customerName, customerPhone, items } = invoiceData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-background border border-border">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 text-center border-b border-border bg-card">
          <div className="flex justify-center mb-3">
            <span className="p-3 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </span>
          </div>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Venta completada
          </DialogTitle>
          {customerName && customerName !== "Consumidor Final" && (
            <p className="text-sm text-muted-foreground mt-0.5">{customerName}</p>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">

          {/* Total */}
          <div className="text-center py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Total cobrado
            </p>
            <p className="text-4xl font-semibold tabular-nums text-foreground">
              RD${total.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
            {ncf && (
              <p className="text-[11px] font-mono text-muted-foreground mt-1">{ncf}</p>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="border border-border rounded-md divide-y divide-border bg-card">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                      {item.qty}×
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-foreground shrink-0 ml-3">
                    RD${(item.price * item.qty).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <PrintTicketButton invoiceData={invoiceData} />
            <WhatsappShareButton
              invoiceId={invoiceData.id}
              phone={customerPhone}
              customerName={customerName}
              total={total}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 pt-0">
          <Button
            onClick={onClose}
            className="w-full font-semibold"
            autoFocus
          >
            Nueva venta
            <kbd className="ml-2 text-[10px] font-mono opacity-60 bg-primary-foreground/10 px-1.5 py-0.5 rounded">
              Esc
            </kbd>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
