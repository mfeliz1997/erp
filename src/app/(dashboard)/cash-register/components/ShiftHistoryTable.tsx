import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";

interface Shift {
  id: string;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  amount_difference: number | null;
  has_discrepancy: boolean | null;
  payment_breakdown: { cash: number; card: number; transfer: number } | null;
  opened_at: string | null;
  closed_at: string | null;
  profiles: { full_name: string | null } | null;
  cash_registers: { name: string } | null;
}

interface ShiftHistoryTableProps {
  shifts: Shift[];
  isAdmin?: boolean;
}

export function ShiftHistoryTable({ shifts, isAdmin = false }: ShiftHistoryTableProps) {
  if (!shifts || shifts.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-solid border-gray-200 rounded-xl bg-gray-50/50">
        <p className="text-xs font-bold text-gray-400">No hay historial de turnos cerrados</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-white rounded-xl overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-100 border-b border-gray-200">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-black font-semibold text-xs">Apertura / Cierre</TableHead>
            <TableHead className="text-black font-semibold text-xs">Cajero</TableHead>
            <TableHead className="text-black font-semibold text-xs">Caja</TableHead>
            <TableHead className="text-black font-semibold text-xs text-right">Cierre Real</TableHead>
            <TableHead className="text-black font-semibold text-xs text-right">Diferencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const diff = shift.amount_difference ?? 0;
            const hasDiscrepancy = shift.has_discrepancy ?? false;
            // Surplus: diff > 1 (more cash than expected) — only admin sees label
            const isSurplus = diff > 1;
            const isShortage = hasDiscrepancy; // diff < -1
            const isPerfect = !isShortage && !isSurplus;

            return (
              <TableRow
                key={shift.id}
                className={`border-b border-gray-100 transition-colors ${
                  isShortage ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-gray-50/50"
                }`}
              >
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900">
                      {shift.opened_at ? format(new Date(shift.opened_at), "d MMM, HH:mm", { locale: es }) : '-'}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {shift.closed_at ? format(new Date(shift.closed_at), "d MMM, HH:mm", { locale: es }) : 'En curso'}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-bold tracking-tight">{shift.profiles?.full_name || 'N/A'}</span>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="rounded-xl border-black text-xs font-bold">
                    {shift.cash_registers?.name ?? '—'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <span className="text-xs font-semibold tabular-nums">
                    RD$ {(shift.closing_amount ?? 0).toLocaleString()}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  {isPerfect && (
                    <span className="text-xs text-green-600 font-bold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Cuadrado
                    </span>
                  )}

                  {isShortage && (
                    <span className="text-xs text-red-600 font-bold flex items-center justify-end gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      −RD$ {Math.abs(diff).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  )}

                  {/* Surplus: visible only for admins */}
                  {isSurplus && isAdmin && (
                    <span className="text-xs text-blue-600 font-bold flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +RD$ {diff.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  )}

                  {isSurplus && !isAdmin && (
                    <span className="text-xs text-green-600 font-bold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Cuadrado
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
