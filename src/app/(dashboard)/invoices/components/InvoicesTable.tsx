
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
import { Eye, Search } from "lucide-react";
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
    <div className="space-y-4">
      {/* Barra de Búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Buscar por cliente o ID..." 
          className="pl-10 rounded-none border-2 border-black focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 font-bold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
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
                 <TableCell colSpan={6} className="h-32 text-center text-xs font-bold uppercase text-gray-400">
                    No se encontraron facturas
                 </TableCell>
               </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow 
                  key={inv.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                  onClick={() => handleOpenDetail(inv)}
                >
                  <TableCell className="text-[10px] font-bold text-gray-500">
                    {format(new Date(inv.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="font-bold uppercase text-xs">
                    {inv.profiles?.full_name?.split(' ')[0] || '---'}
                  </TableCell>
                  <TableCell className="font-bold uppercase text-xs">
                    {inv.customer_name || 'Consumidor Final'}
                  </TableCell>
                  <TableCell className="font-black">
                    RD$ {inv.total.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${inv.status === 'paid' ? 'bg-black' : 'bg-red-600'} rounded-none uppercase text-[9px] tracking-tighter`}>
                      {inv.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleOpenDetail(inv)}
                      className="p-2 hover:bg-gray-100 transition-colors"
                      title="Ver Detalle"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    <PrintTicketButton 
                      invoiceData={{
                        total: inv.total,
                        items: inv.invoice_items.map((i: any) => ({ 
                          name: i.product_name, 
                          price: i.unit_price,
                          quantity: i.quantity 
                        }))
                      }} 
                    />
                    <WhatsappShareButton 
                      invoiceId={inv.id}
                      phone={""}
                      customerName={inv.customer_name}
                      total={inv.total}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceDetailSheet 
        invoice={selectedInvoice} 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
      />
    </div>
  );
}
