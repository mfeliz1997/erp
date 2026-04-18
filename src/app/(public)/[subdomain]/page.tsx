import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import { ShopClient } from "./components/ShopClient";

export default async function Page({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  console.log(`[ShopPage] Rendering for subdomain: ${subdomain}`);
  const supabase = await createClient();

  // 1. Buscar el tenant por subdominio (usamos supabaseAdmin para ignorar RLS en public)
  const { data: tenants, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("subdomain", subdomain);
  
  const tenant = tenants?.[0]; // Tomamos el primero que encuentre
  
  console.log(`[ShopPage] Tenant lookup result:`, { count: tenants?.length, found: !!tenant, error: tenantError?.message });

  if (tenantError || !tenant) {
    // Si hay múltiples, tenantError no debería ser nulo si usamos .single() sin limit 1
    // Pero con limit 1 .single() debería funcionar si hay al menos uno.
    return (
      <div className="p-10 font-mono">
        <h1 className="text-red-500 font-bold uppercase tracking-tighter">Tenant Error</h1>
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
          <p><strong>Subdomain:</strong> {subdomain}</p>
          <p><strong>Error:</strong> {tenantError?.message || "No tenant found with this subdomain."}</p>
        </div>
        <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest">
            Please ensure the subdomain '{subdomain}' is unique and assigned in the database.
        </p>
      </div>
    );
  }

  // 2. Buscar productos activos (no borrados) de este tenant (bypassing RLS for public catalog)
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (productsError) {
    console.error("Error fetching products:", productsError);
  }

  return (
    <ShopClient 
      products={products || []} 
      tenant={tenant} 
    />
  );
}
