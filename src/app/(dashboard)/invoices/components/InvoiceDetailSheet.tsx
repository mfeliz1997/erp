
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { User, Package, Receipt } from "lucide-react";
import { Invoice } from "@/types/pos";

interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailSheet({ invoice, isOpen, onClose }: InvoiceDetailSheetProps) {
  if (!invoice) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md border-l-2 border-black rounded-none p-0 overflow-y-auto">
        <SheetHeader className="p-6 bg-black text-white rounded-none">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-white uppercase font-black tracking-tighter text-2xl">
              Detalle de Venta
            </SheetTitle>
            <Badge className="bg-white text-black rounded-none uppercase text-[10px] font-bold">
              {invoice.status === 'paid' ? 'Completada' : 'Pendiente'}
            </Badge>
          </div>
          <SheetDescription className="text-gray-400 text-xs font-bold uppercase">
            ID: {invoice.id.slice(0, 8)} | {format(new Date(invoice.created_at), "dd MMM yyyy, p")}
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-6">
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
            {/* Sección 1: Datos del Cajero / Cliente */}
            <AccordionItem value="item-1" className="border-2 border-black px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Información General</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Cajero</p>
                    <p className="text-sm font-bold uppercase">{invoice.profiles?.full_name || 'Sistema'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Cliente</p>
                    <p className="text-sm font-bold uppercase">{invoice.customer_name || 'Consumidor Final'}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sección 2: Detalle de Productos */}
            <AccordionItem value="item-2" className="border-2 border-black px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Detalle de Productos</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 border-t border-gray-100 pt-4">
                <div className="space-y-3">
                  {invoice.invoice_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 pb-2 last:border-0">
                      <div>
                        <p className="font-bold uppercase text-[12px]">{item.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{item.quantity} x RD$ {item.unit_price?.toLocaleString()}</p>
                      </div>
                      <p className="font-black text-sm">RD$ {(item.quantity * item.unit_price).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sección 3: Totales */}
            <AccordionItem value="item-3" className="border-2 border-black px-4 bg-gray-50">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Receipt className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Resumen de Pago</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 border-t border-gray-300 pt-4 space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase">
                    <span className="text-gray-500">Subtotal</span>
                    <span>RD$ {invoice.total.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold uppercase">
                    <span className="text-gray-500">Impuestos (Incluidos)</span>
                    <span>RD$ 0.00</span>
                 </div>
                 <div className="flex justify-between text-lg font-black uppercase border-t-2 border-black pt-2 mt-2">
                    <span>Total</span>
                    <span>RD$ {invoice.total.toLocaleString()}</span>
                 </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="text-[10px] text-center text-gray-400 uppercase font-bold tracking-[0.2em] pt-10">
            Beral ERP - Modo Lite (Internal Use Only)
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
