"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Phone, AlertTriangle } from "lucide-react";

interface CustomerTableProps {
  customers: any[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  return (
    <div className="border border-gray-100 bg-white rounded-none shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50 border-b border-gray-100">
          <TableRow>
            <TableHead className="uppercase text-[10px] font-bold tracking-widest py-4">Cliente</TableHead>
            <TableHead className="uppercase text-[10px] font-bold tracking-widest">Documento / RNC</TableHead>
            <TableHead className="uppercase text-[10px] font-bold tracking-widest text-right">Crédito / Deuda</TableHead>
            <TableHead className="uppercase text-[10px] font-bold tracking-widest text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                No hay clientes registrados en el directorio.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => {
              const isOverLimit = customer.current_debt > customer.credit_limit;
              
              return (
                <TableRow key={customer.id} className="group transition-colors hover:bg-zinc-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-100 rounded-none group-hover:bg-black group-hover:text-white transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold uppercase tracking-tight text-sm text-zinc-900">{customer.name}</p>
                        <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone || 'Sin teléfono'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-zinc-500">
                    {customer.tax_id}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${isOverLimit ? 'text-red-600 animate-pulse' : 'text-zinc-900'}`}>
                          RD$ {customer.current_debt?.toLocaleString()}
                        </span>
                        {isOverLimit && <AlertTriangle className="w-4 h-4 text-red-600" />}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                        Límite: RD$ {customer.credit_limit?.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                        variant={isOverLimit ? "destructive" : "outline"} 
                        className={`rounded-none uppercase text-[9px] font-black px-2 py-0.5 ${!isOverLimit ? 'border-zinc-200 text-zinc-500' : ''}`}
                    >
                      {isOverLimit ? "Excedido" : "Al día"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
