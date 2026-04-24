
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
  // El alias profiles:user_id usa la FK hacia public.profiles (no auth.users)
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, tenant_id, user_id, customer_name, customer_rnc, total, status,
      created_at, ncf, ncf_type, payment_method, amount_received, change_amount,
      profiles:user_id(full_name),
      invoice_items(id, product_name, quantity, unit_price, total)
    `)
    .eq("tenant_id", profile?.tenant_id)
    .order("created_at", { ascending: false });

  // Supabase devuelve profiles como array cuando hay múltiples FKs; normalizamos a objeto
  type RawInvoice = NonNullable<typeof invoices>[number];
  const normalizedInvoices = (invoices ?? []).map((inv: RawInvoice) => ({
    ...inv,
    profiles: Array.isArray(inv.profiles) ? (inv.profiles[0] ?? null) : inv.profiles,
  }));

  return (
    <div className="p-6 pt-16 lg:pt-6 max-w-7xl mx-auto space-y-8">
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
      <InvoicesTable invoices={normalizedInvoices} />
    </div>
  );
}