
import { createClient } from "@/lib/supabase";
import { InvoicesTable } from "./components/InvoicesTable";
import { ReceiptText } from "lucide-react";

export default async function InvoicesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Obtener perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user?.id)
    .single();

  // 2. Obtener facturas filtradas por tenant
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      *,
      profiles(full_name),
      invoice_items(*)
    `)
    .eq("tenant_id", profile?.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Estético */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary text-primary-foreground rounded-xl shadow-sm rounded-xl">
            <ReceiptText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold  ">Historial de Ventas</h1>
            <p className="text-xs font-bold  text-gray-400">Control total de transacciones por cajero</p>
          </div>
        </div>
      </div>

      {/* Tabla Interactiva (Client Component) */}
      <InvoicesTable invoices={invoices || []} />
    </div>
  );
}