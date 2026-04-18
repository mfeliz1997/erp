"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDialog } from "./PaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface DebtTableProps {
  customers: any[];
}

export function DebtTable({ customers }: DebtTableProps) {
  const [search, setSearch] = useState("");
  
  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.tax_id?.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input 
          placeholder="Buscar deudor por nombre o cédula..." 
          className="pl-10 rounded-xl border border-gray-200 h-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50 border-b border-gray-200">
            <TableRow>
              <TableHead className=" text-xs font-semibold  text-black py-4">Cliente</TableHead>
              <TableHead className=" text-xs font-semibold  text-black py-4">Límite Crédito</TableHead>
              <TableHead className=" text-xs font-semibold  text-black py-4 text-right">Deuda Actual</TableHead>
              <TableHead className=" text-xs font-semibold  text-black py-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-zinc-400 font-bold   text-xs">
                  No se encontraron cuentas por cobrar
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-zinc-50 border-b border-zinc-100">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-zinc-100 p-2 rounded-xl border border-black">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold  tracking-tight text-sm">{customer.name}</p>
                        <p className="text-xs font-bold text-zinc-400  ">{customer.tax_id || 'SIN DOCUMENTO'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-xs  ">RD$ {customer.credit_limit.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-lg text-red-600">RD$ {customer.current_debt.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <PaymentDialog customer={customer} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
