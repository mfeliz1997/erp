import { createClient } from "@/lib/supabase";
import { DebtTable } from "@/modules/debts/components/DebtTable";
import { Wallet, Landmark } from "lucide-react";
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

  // Obtener clientes con deuda activa
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .gt("current_debt", 0)
    .order("current_debt", { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-red-500">
            <Landmark className="w-5 h-5" />
            <span className="text-xs font-bold   leading-none text-zinc-400">Receivables</span>
          </div>
          <h1 className="text-6xl font-semibold   leading-none">Cuentas por Cobrar</h1>
          <p className="text-zinc-500 font-medium text-sm max-w-lg">
            Monitoreo de deudas activas y registro de abonos para mantener el flujo de caja.
          </p>
        </div>
        
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-xl">
           <p className="text-xs font-semibold   text-red-600 mb-1">Total Por Cobrar</p>
           <p className="text-4xl font-semibold text-black">
              RD$ {customers?.reduce((acc, c) => acc + c.current_debt, 0).toLocaleString()}
           </p>
        </div>
      </div>

      <DebtTable customers={customers || []} />
    </div>
  );
}