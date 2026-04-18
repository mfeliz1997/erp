import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";

interface ShiftHistoryTableProps {
  shifts: any[];
}

export function ShiftHistoryTable({ shifts }: ShiftHistoryTableProps) {
  if (!shifts || shifts.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-none bg-gray-50/50">
        <p className="text-xs uppercase font-bold text-gray-400 tracking-widest">No hay historial de turnos cerrados</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white rounded-none overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-100 border-b-2 border-black">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-black font-black uppercase tracking-tighter text-xs">Apertura / Cierre</TableHead>
            <TableHead className="text-black font-black uppercase tracking-tighter text-xs">Cajero</TableHead>
            <TableHead className="text-black font-black uppercase tracking-tighter text-xs">Caja</TableHead>
            <TableHead className="text-black font-black uppercase tracking-tighter text-xs text-right">Resultado</TableHead>
            <TableHead className="text-black font-black uppercase tracking-tighter text-xs text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const diff = (shift.closing_amount || 0) - (shift.expected_amount || 0);
            const isPerfect = Math.abs(diff) < 0.01;

            return (
              <TableRow key={shift.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900">
                      {shift.opened_at ? format(new Date(shift.opened_at), "d MMM, HH:mm", { locale: es }) : '-'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase">
                      {shift.closed_at ? format(new Date(shift.closed_at), "d MMM, HH:mm", { locale: es }) : 'En curso'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold uppercase tracking-tight">{shift.profiles?.full_name || 'N/A'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-none border-black text-[10px] uppercase font-bold">
                    {shift.cash_registers?.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black">RD$ {shift.closing_amount?.toLocaleString()}</span>
                    {isPerfect ? (
                      <span className="text-[10px] text-green-600 font-bold uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Cuadrado
                      </span>
                    ) : diff > 0 ? (
                      <span className="text-[10px] text-blue-600 font-bold uppercase flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +{diff.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-600 font-bold uppercase flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> {diff.toLocaleString()}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                   <div className="flex justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                   </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
