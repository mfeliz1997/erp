import { createClient } from "@/lib/supabase";
import { PurchaseForm } from "@/modules/purchases/components/PurchaseForm";
import { ShoppingBag, Truck } from "lucide-react";
import { redirect } from "next/navigation";

export default async function PurchasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Obtener productos para el selector de la compra
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price")
    .eq("tenant_id", profile.tenant_id)
    .order("name", { ascending: true });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-zinc-400">
            <Truck className="w-5 h-5" />
            <span className="text-xs font-bold   leading-none">Inbound Logistics</span>
          </div>
          <h1 className="text-6xl font-semibold   leading-none">Compras</h1>
          <p className="text-zinc-500 font-medium text-sm max-w-lg">
            Registre la mercancía recibida de suplidores para incrementar su stock y actualizar costos.
          </p>
        </div>
      </div>

      <PurchaseForm products={products || []} />
    </div>
  );
}
