import { createClient } from "@/lib/supabase";
import { RegisterManager } from "@/modules/settings/components/RegisterManager";
import { redirect } from "next/navigation";

export default async function CashRegistersSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Obtener perfil para tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return <div className="p-10 text-red-500 font-bold   text-sm">Acceso Denegado. Solo administradores.</div>;
  }

  // Obtener las cajas del tenant
  const { data: registers } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold  ">Configuración de Cajas</h1>
        <p className="text-slate-500 text-sm">Controle los puntos de venta físicos autorizados para este negocio.</p>
      </div>

      <RegisterManager registers={registers || []} />
    </div>
  );
}
