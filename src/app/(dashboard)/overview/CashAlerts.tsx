import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CashShiftAlert {
  id: string;
  closed_at: string | null;
  amount_difference: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any;
}

export default async function CashAlerts({ tenantId }: { tenantId: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: alerts } = await supabase
    .from("cash_shifts")
    .select("id, closed_at, amount_difference, profiles:user_id(full_name)")
    .eq("tenant_id", tenantId)
    .eq("has_discrepancy", true)
    .eq("status", "CLOSED")
    .gte("closed_at", since)
    .order("closed_at", { ascending: false })
    .limit(5);

  const rows = (alerts ?? []) as CashShiftAlert[];

  if (rows.length === 0) return null;

  return (
    <Card className="border border-red-200 bg-red-50/40">
      <CardHeader className="px-4 pt-4 pb-2 border-b border-red-100">
        <CardTitle className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 uppercase tracking-wide">
          <AlertTriangle className="w-3.5 h-3.5" />
          Descuadres de Caja · últimas 24h
          <Badge variant="destructive" className="ml-auto text-[10px] h-4 px-1.5 rounded-sm">
            {rows.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <div className="space-y-2">
          {rows.map((row) => {
            const diff = Number(row.amount_difference ?? 0);
            const cajero = row.profiles?.full_name?.split(" ")[0] ?? "Cajero";
            const hora = row.closed_at
              ? new Date(row.closed_at).toLocaleTimeString("es-DO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";

            return (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-red-100 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-800 truncate">{cajero}</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-red-600 shrink-0">
                  {diff < 0 ? "−" : "+"}RD${" "}
                  {Math.abs(diff).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{hora}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
