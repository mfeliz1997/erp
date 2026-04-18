import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function SalesHistoryPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const { data: sales } = await supabase
    .from("invoices")
    .select(`
      *,
      profiles (full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial de Ventas</h1>
        <p className="text-gray-500">Consulta y audita todas las transacciones realizadas.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>NCF</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales?.map((sale) => (
              <TableRow key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="text-xs text-gray-500">
                  {new Date(sale.created_at).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                </TableCell>
                <TableCell className="font-mono font-bold text-blue-600">{sale.ncf}</TableCell>
                <TableCell className="font-medium">{sale.customer_name}</TableCell>
                <TableCell className="text-gray-500">{sale.profiles?.full_name || 'Sistema'}</TableCell>
                <TableCell>
                  <Badge className={`${sale.status === 'paid' ? 'bg-black text-white' : sale.status === 'pending' ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'} rounded-none uppercase text-[9px] font-black tracking-widest px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                    {sale.status === 'paid' ? 'Pagado' : sale.status === 'pending' ? 'Crédito' : 'Cancelado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold">
                  RD${Number(sale.total).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}