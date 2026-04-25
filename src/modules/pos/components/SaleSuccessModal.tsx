"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const { ncf, total, customerName, customerPhone, items } = invoiceData;
  const showCustomer = customerName && customerName !== "Consumidor Final";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm sm:max-w-md p-0 overflow-hidden bg-background border border-border gap-0">

        {/* Header */}
        <div className="flex flex-col items-center px-6 pt-8 pb-6 border-b border-border bg-card">
          <span className="mb-4 p-3 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </span>

          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            Venta completada
          </DialogTitle>

          {showCustomer && (
            <p className="text-sm text-muted-foreground mt-1">{customerName}</p>
          )}
        </div>

        {/* Total */}
        <div className="flex flex-col items-center px-6 py-6 border-b border-border">
          <p className="ap-label mb-2">Total cobrado</p>
          <p className="ap-metric-hero text-4xl sm:text-5xl text-foreground">
            RD${total.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </p>
          {ncf && (
            <p className="ap-mono text-muted-foreground mt-2">{ncf}</p>
          )}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-b border-border">
            <div className="ap-card overflow-hidden">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2.5 ${
                    i < items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="ap-label w-6 text-right shrink-0 tabular-nums">
                      {item.qty}×
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-foreground shrink-0 ml-4">
                    RD${(item.price * item.qty).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <PrintTicketButton invoiceData={invoiceData} />
            <WhatsappShareButton
              invoiceId={invoiceData.id}
              phone={customerPhone}
              customerName={customerName}
              total={total}
            />
          </div>

          <button
            onClick={onClose}
            autoFocus
            className="ap-btn-primary w-full h-10 text-sm"
          >
            Nueva venta
            <kbd className="ml-2 text-[10px] font-mono opacity-50 bg-primary-foreground/10 px-1.5 py-0.5 rounded">
              Esc
            </kbd>
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
