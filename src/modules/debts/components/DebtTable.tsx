"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDialog } from "./PaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Search, User, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DebtRow {
  id: string;
  total_amount: number;
  balance: number;
  due_date: string | null;
  status: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoices: any;
}

interface DebtTableProps {
  debts: DebtRow[];
}

function isOverdue(due_date: string | null): boolean {
  if (!due_date) return false;
  return new Date(due_date) < new Date();
}

export function DebtTable({ debts }: DebtTableProps) {
  const [search, setSearch] = useState("");

  const filtered = debts.filter((d) => {
    const name = d.invoices?.customer_name ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const fmt = (n: number) =>
    `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Buscar por nombre de cliente..."
          className="pl-10 rounded-xl border border-gray-200 h-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Desktop table ───────────────────────────────────────────── */}
      <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="text-xs font-semibold text-black py-4">Cliente</TableHead>
              <TableHead className="text-xs font-semibold text-black py-4">Fecha</TableHead>
              <TableHead className="text-xs font-semibold text-black py-4 text-right">Monto Original</TableHead>
              <TableHead className="text-xs font-semibold text-black py-4 text-right">Balance Pendiente</TableHead>
              <TableHead className="text-xs font-semibold text-black py-4 text-center">Estado</TableHead>
              <TableHead className="text-xs font-semibold text-black py-4 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-bold text-xs">
                  No se encontraron cuentas por cobrar
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((debt) => {
                const overdue = isOverdue(debt.due_date);
                const customerName = debt.invoices?.customer_name ?? "Cliente sin nombre";
                return (
                  <TableRow
                    key={debt.id}
                    className={`border-b border-zinc-100 transition-colors ${overdue ? "bg-red-50/30 hover:bg-red-50/60" : "hover:bg-zinc-50"}`}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-zinc-100 p-2 rounded-xl border border-zinc-300 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold tracking-tight text-sm">{customerName}</p>
                          {overdue && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
                              <AlertTriangle className="w-3 h-3" /> Vencida
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 font-medium">
                      {format(new Date(debt.created_at), "dd MMM yyyy", { locale: es })}
                      {debt.due_date && (
                        <p className={`text-[10px] mt-0.5 ${overdue ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
                          Vence: {format(new Date(debt.due_date), "dd MMM yyyy", { locale: es })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums text-zinc-600">
                      {fmt(debt.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-lg tabular-nums text-red-600">{fmt(debt.balance)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold rounded-lg ${overdue ? "border-red-300 text-red-600 bg-red-50" : "border-amber-300 text-amber-600 bg-amber-50"}`}
                      >
                        {overdue ? "Vencida" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <PaymentDialog debt={debt} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile cards ────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3 pb-20">
        {filtered.length === 0 ? (
          <p className="text-center text-zinc-400 font-bold text-xs py-10">No se encontraron cuentas por cobrar</p>
        ) : (
          filtered.map((debt) => {
            const overdue = isOverdue(debt.due_date);
            const customerName = debt.invoices?.customer_name ?? "Cliente sin nombre";
            return (
              <div
                key={debt.id}
                className={`border rounded-xl bg-white p-4 space-y-3 ${overdue ? "border-red-200" : "border-gray-200"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-100 p-2 rounded-xl border border-zinc-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tracking-tight text-sm truncate">{customerName}</p>
                    <p className="text-xs text-zinc-400">
                      {format(new Date(debt.created_at), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold rounded-lg shrink-0 ${overdue ? "border-red-300 text-red-600 bg-red-50" : "border-amber-300 text-amber-600 bg-amber-50"}`}
                  >
                    {overdue ? "Vencida" : "Pendiente"}
                  </Badge>
                </div>

                <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase">Balance Pendiente</p>
                    <p className="font-bold text-xl tabular-nums text-red-600">{fmt(debt.balance)}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">de {fmt(debt.total_amount)}</p>
                  </div>
                  <PaymentDialog debt={debt} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
