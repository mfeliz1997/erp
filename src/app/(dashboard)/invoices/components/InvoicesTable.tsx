"use client";

import { useState } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PrintTicketButton } from "@/modules/pos/components/PrintTicketButton";
import { WhatsappShareButton } from "@/lib/WhatsappShareButton";
import { format } from "date-fns";
import { InvoiceDetailSheet } from "./InvoiceDetailSheet";
import { Eye, Search, Receipt, User, Clock, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Invoice } from "@/types/pos";

interface InvoicesTableProps {
  invoices: Invoice[];
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvoices = invoices.filter(inv => 
    inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDetail = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda Neobrutalista */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black" />
        <input 
          placeholder="BUSCAR VENTA POR CLIENTE O ID..." 
          className="w-full h-14 pl-12 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Vista de Escritorio (Tabla) */}
      <div className="hidden lg:block bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 border-b-2 border-black">
            <TableRow>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-black">Fecha</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-black">Cajero</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-black">Cliente</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-black">Total</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-black">Estado</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-black text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-48 text-center text-xs font-black uppercase text-gray-400 italic">
                   Sin registros de venta encontrados
                 </TableCell>
               </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow 
                  key={inv.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0 group"
                  onClick={() => handleOpenDetail(inv)}
                >
                  <TableCell className="text-[10px] font-bold text-gray-500">
                    {format(new Date(inv.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="font-black uppercase text-[10px] tracking-tight">
                    {inv.profiles?.full_name?.split(' ')[0] || '---'}
                  </TableCell>
                  <TableCell className="font-black uppercase text-[10px] tracking-tight">
                    {inv.customer_name || 'Consumidor Final'}
                  </TableCell>
                  <TableCell className="font-black italic text-sm">
                    RD$ {inv.total.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${inv.status === 'paid' ? 'bg-black' : 'bg-red-600'} rounded-none uppercase text-[9px] font-black tracking-widest px-2 py-0.5`}>
                      {inv.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <button 
                        onClick={() => handleOpenDetail(inv)}
                        className="p-2 border border-transparent hover:border-black transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye className="w-5 h-5 text-gray-400 hover:text-black" />
                      </button>
                      
                      {/* FIX APLICADO AQUÍ (Desktop) 👇 */}
                      <PrintTicketButton 
                        invoiceData={{
                          total: inv.total,
                          items: inv.invoice_items?.map((i: any) => ({ 
                            name: i.product_name, 
                            price: i.unit_price,
                            quantity: i.quantity 
                          })) || []
                        }} 
                      />
                      
                      <WhatsappShareButton 
                        invoiceId={inv.id}
                        phone={""}
                        customerName={inv.customer_name ?? undefined}
                        total={inv.total}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista de Móvil (Tarjetas) */}
      <div className="lg:hidden space-y-4 pb-20">
        {filteredInvoices.length === 0 ? (
          <div className="p-20 text-center border-4 border-dashed border-gray-100 font-black uppercase text-gray-300 tracking-[0.3em]">
             Sin Registros
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div 
              key={inv.id} 
              onClick={() => handleOpenDetail(inv)}
              className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all space-y-6"
            >
              <div className="flex justify-between items-start border-b-2 border-black border-dashed pb-4">
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      <p className="font-black text-[10px] uppercase tracking-widest">{inv.id.slice(0,8)}</p>
                   </div>
                   <p className="text-[12px] font-black italic">{format(new Date(inv.created_at), "PPpp")}</p>
                </div>
                <Badge className={`${inv.status === 'paid' ? 'bg-black' : 'bg-red-600'} rounded-none uppercase text-[8px] font-black tracking-[0.2em]`}>
                  {inv.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-400">Cliente</p>
                    <p className="text-xs font-black uppercase truncate">{inv.customer_name || 'CONSUMIDOR FINAL'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-400 text-right">Cajero</p>
                    <p className="text-xs font-black uppercase text-right leading-none">{inv.profiles?.full_name?.split(' ')[0] || '---'}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                 <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1 leading-none">Total Venta</p>
                    <p className="text-2xl font-black italic">RD$ {inv.total.toLocaleString()}</p>
                 </div>
                 
                 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    
                    {/* FIX APLICADO AQUÍ (Móvil) 👇 */}
                    <PrintTicketButton 
                      invoiceData={{
                        total: inv.total,
                        items: inv.invoice_items?.map((i: any) => ({ 
                          name: i.product_name, 
                          price: i.unit_price,
                          quantity: i.quantity 
                        })) || []
                      }} 
                    />

                    <WhatsappShareButton 
                      invoiceId={inv.id}
                      phone={""}
                      customerName={inv.customer_name ?? undefined}
                      total={inv.total}
                    />
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      <InvoiceDetailSheet 
        invoice={selectedInvoice} 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
      />
    </div>
  );
}