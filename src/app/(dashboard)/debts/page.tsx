import { createClient } from "@/lib/supabase";
import { DebtTable } from "@/modules/debts/components/DebtTable";
import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DebtsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Deudas abiertas: JOIN a invoices para obtener customer_name y customer_id
  const { data: debts } = await supabase
    .from("debts")
    .select(`
      id, total_amount, balance, due_date, status, created_at,
      invoices(id, customer_name, customer_id, payment_method)
    `)
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const totalBalance = (debts ?? []).reduce((acc, d) => acc + Number(d.balance), 0);

  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-6 md:pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Landmark className="w-5 h-5 text-red-500" />
            <span className="text-xs font-bold leading-none text-zinc-400">Receivables</span>
          </div>
          <h1 className="text-3xl md:text-6xl font-semibold leading-none">Cuentas por Cobrar</h1>
          <p className="text-zinc-500 font-medium text-sm max-w-lg">
            Monitoreo de deudas activas y registro de abonos para mantener el flujo de caja.
          </p>
        </div>

        <div className="bg-red-50 border-2 border-red-200 p-4 md:p-6 rounded-xl">
          <p className="text-xs font-semibold text-red-600 mb-1">Total Por Cobrar</p>
          <p className="text-2xl md:text-4xl font-semibold text-black">
            RD$ {totalBalance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <DebtTable debts={debts ?? []} />
    </div>
  );
}