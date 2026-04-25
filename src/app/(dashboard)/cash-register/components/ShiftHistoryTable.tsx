import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cash_registers: any;
}

interface ShiftHistoryTableProps {
  shifts: Shift[];
  isAdmin?: boolean;
}

export function ShiftHistoryTable({ shifts, isAdmin = false }: ShiftHistoryTableProps) {
  if (!shifts || shifts.length === 0) {
    return (
      <div className="py-10 text-center border border-dashed border-border rounded-xl bg-muted/30">
        <p className="text-xs text-muted-foreground">No hay historial de turnos cerrados</p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-background rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border bg-muted/40">
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Apertura / Cierre</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cajero</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caja</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Cierre Real</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Diferencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const diff = shift.amount_difference ?? 0;
            const hasDiscrepancy = shift.has_discrepancy ?? false;
            const isSurplus = diff > 1;
            const isShortage = hasDiscrepancy;
            const isPerfect = !isShortage && !isSurplus;

            return (
              <TableRow
                key={shift.id}
                className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
              >
                <TableCell className="py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">
                      {shift.opened_at ? format(new Date(shift.opened_at), "d MMM, HH:mm", { locale: es }) : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {shift.closed_at ? format(new Date(shift.closed_at), "d MMM, HH:mm", { locale: es }) : 'En curso'}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-foreground">{shift.profiles?.full_name || 'N/A'}</span>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="text-xs font-medium">
                    {shift.cash_registers?.name ?? '—'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    RD$ {(shift.closing_amount ?? 0).toLocaleString()}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  {isPerfect && (
                    <Badge variant="outline" className="text-xs font-medium text-green-700 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
                      Cuadrado
                    </Badge>
                  )}

                  {isShortage && (
                    <Badge variant="destructive" className="text-xs font-medium tabular-nums">
                      −RD$ {Math.abs(diff).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </Badge>
                  )}

                  {isSurplus && isAdmin && (
                    <Badge variant="outline" className="text-xs font-medium tabular-nums text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400 gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +RD$ {diff.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </Badge>
                  )}

                  {isSurplus && !isAdmin && (
                    <Badge variant="outline" className="text-xs font-medium text-green-700 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
                      Cuadrado
                    </Badge>
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
