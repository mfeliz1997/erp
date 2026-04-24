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
          className="w-full h-14 pl-12 border border-gray-200 rounded-xl shadow-sm rounded-xl focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all font-semibold   text-xs placeholder:text-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Vista de Escritorio (Tabla) */}
      <div className="hidden lg:block bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="font-semibold  text-xs  text-black">Fecha</TableHead>
              <TableHead className="font-semibold  text-xs  text-black">Cajero</TableHead>
              <TableHead className="font-semibold  text-xs  text-black">Cliente</TableHead>
              <TableHead className="font-semibold  text-xs  text-black">Total</TableHead>
              <TableHead className="font-semibold  text-xs  text-black">Estado</TableHead>
              <TableHead className="font-semibold  text-xs  text-black text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-48 text-center text-xs font-semibold  text-gray-400 ">
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
                  <TableCell className="text-xs font-bold text-gray-500">
                    {format(new Date(inv.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="font-semibold  text-xs tracking-tight">
                    {inv.profiles?.full_name?.split(' ')[0] || '---'}
                  </TableCell>
                  <TableCell className="font-semibold  text-xs tracking-tight">
                    {inv.customer_name || 'Consumidor Final'}
                  </TableCell>
                  <TableCell className="font-semibold  text-sm">
                    RD$ {inv.total.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${inv.status === 'paid' ? 'bg-black' : 'bg-red-600'} rounded-xl  text-xs font-semibold  px-2 py-0.5`}>
                      {inv.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-3 transition-all duration-200">
                      <button
                        onClick={() => handleOpenDetail(inv)}
                        className="p-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye className="w-4 h-4 text-gray-400 hover:text-black" />
                      </button>
                      <div className="[&>button]:h-7 [&>button]:px-2 [&>button]:text-[11px] [&>button]:rounded-lg [&>button]:font-semibold">
                        <PrintTicketButton
                          invoiceData={{
                            total: inv.total,
                            items: inv.invoice_items?.map((i: any) => ({
                              name: i.product_name,
                              price: i.unit_price,
                              quantity: i.quantity,
                            })) || [],
                          }}
                        />
                      </div>
                      <div className="[&>button]:h-7 [&>button]:px-2 [&>button]:text-[11px] [&>button]:rounded-lg [&>button]:font-semibold">
                        <WhatsappShareButton
                          invoiceId={inv.id}
                          phone={""}
                          customerName={inv.customer_name ?? undefined}
                          total={inv.total}
                        />
                      </div>
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
          <div className="p-20 text-center border-4 border-solid border-gray-100 font-semibold  text-gray-300 ">
             Sin Registros
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div 
              key={inv.id} 
              onClick={() => handleOpenDetail(inv)}
              className="border border-gray-200 bg-white p-6 shadow-sm rounded-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all space-y-6"
            >
              <div className="flex justify-between items-start border-b border-gray-200 border-solid pb-4">
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      <p className="font-semibold text-xs  ">{inv.id.slice(0,8)}</p>
                   </div>
                   <p className="text-[12px] font-semibold ">{format(new Date(inv.created_at), "PPpp")}</p>
                </div>
                <Badge className={`${inv.status === 'paid' ? 'bg-black' : 'bg-red-600'} rounded-xl  text-xs font-semibold `}>
                  {inv.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-xs font-semibold  text-gray-400">Cliente</p>
                    <p className="text-xs font-semibold  truncate">{inv.customer_name || 'CONSUMIDOR FINAL'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-semibold  text-gray-400 text-right">Cajero</p>
                    <p className="text-xs font-semibold  text-right leading-none">{inv.profiles?.full_name?.split(' ')[0] || '---'}</p>
                 </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                 <div>
                    <p className="text-xs font-semibold  text-gray-400 mb-1 leading-none">Total Venta</p>
                    <p className="text-xl font-semibold ">RD$ {inv.total.toLocaleString()}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-2 w-full" onClick={(e) => e.stopPropagation()}>

                    {/* FIX APLICADO AQUÍ (Móvil) 👇 */}
                    <div className="[&>button]:w-full [&>button]:h-10 [&>button]:text-xs [&>button]:px-2">
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
                    </div>

                    <div className="[&>button]:w-full [&>button]:h-10 [&>button]:text-xs [&>button]:px-2">
                      <WhatsappShareButton
                        invoiceId={inv.id}
                        phone={""}
                        customerName={inv.customer_name ?? undefined}
                        total={inv.total}
                      />
                    </div>
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