import { createClient } from "@/lib/supabase";
import { RepairKanban } from "@/modules/workshop/components/RepairKanban";
import { NewRepairDialog } from "@/modules/workshop/components/NewRepairDialog";
import { Wrench, LayoutGrid } from "lucide-react";
import { redirect } from "next/navigation";

export default async function WorkshopPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Obtener Ordenes de Reparación
  const { data: orders } = await supabase
    .from("repair_orders")
    .select(`
      *,
      customers (id, name),
      assigned_to_profile:profiles!repair_orders_assigned_to_fkey (id, name)
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  // Obtener Clientes para el Dialog
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-zinc-400">
            <Wrench className="w-5 h-5" />
            <span className="text-xs font-bold   leading-none">Workshop Service</span>
          </div>
          <h1 className="text-6xl font-semibold   leading-none">Taller</h1>
          <p className="text-zinc-500 font-medium text-sm max-w-lg">
            Gestión de equipos, diagnósticos y flujo de reparaciones en tiempo real.
          </p>
        </div>
        
        <NewRepairDialog customers={customers || []} />
      </div>

      <RepairKanban orders={orders || []} />
    </div>
  );
}
