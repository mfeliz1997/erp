"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Phone, AlertTriangle } from "lucide-react";

interface CustomerTableProps {
  customers: any[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50 border-b border-gray-200">
          <TableRow>
            <TableHead className=" text-xs font-semibold  py-4 text-black">Cliente</TableHead>
            <TableHead className=" text-xs font-semibold  text-black hidden md:table-cell">Documento / RNC</TableHead>
            <TableHead className=" text-xs font-semibold  text-right text-black">Crédito / Deuda</TableHead>
            <TableHead className=" text-xs font-semibold  text-center text-black">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-24 text-xs font-semibold  text-gray-400 ">
                No hay clientes registrados en el directorio.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => {
              const isOverLimit = customer.current_debt > customer.credit_limit;
              
              return (
                <TableRow key={customer.id} className="group transition-colors hover:bg-gray-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 border border-gray-200 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold   text-xs text-black truncate">{customer.name}</p>
                        <p className="text-xs text-gray-400 font-bold  flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone || 'SIN TELÉFONO'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-gray-400 hidden md:table-cell">
                    {customer.tax_id || 'SIN RNC'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold  ${isOverLimit ? 'text-red-600 animate-pulse' : 'text-black'}`}>
                          RD$ {customer.current_debt?.toLocaleString()}
                        </span>
                        {isOverLimit && <AlertTriangle className="w-4 h-4 text-red-600" />}
                      </div>
                      <span className="text-xs text-gray-400 font-bold  ">
                        Límite: RD$ {customer.credit_limit?.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span 
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold   border-2 
                          ${isOverLimit ? 'bg-red-600 text-white border-black' : 'bg-gray-100 text-gray-400 border-transparent'}`}
                    >
                      {isOverLimit ? "Excedido" : "Al día"}
                    </span>
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
