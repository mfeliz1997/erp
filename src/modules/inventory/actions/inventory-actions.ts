"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function bulkCreateProducts(products: any[]) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Perfil no encontrado");

    // Inyectar tenant_id y limpiar datos
    const preparedProducts = products.map(p => ({
      ...p,
      tenant_id: profile.tenant_id,
      cost_price: parseFloat(p.cost_price) || 0,
      price: parseFloat(p.price) || 0,
      stock: parseInt(p.stock) || 0,
    }));

    // Procesar por lotes (Chunks) de 500 para evitar saturar el body/limites de DB
    const CHUNK_SIZE = 500;
    const results = [];

    for (let i = 0; i < preparedProducts.length; i += CHUNK_SIZE) {
      const chunk = preparedProducts.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from("products").insert(chunk);
      
      if (error) {
        console.error(`Error en lote ${i / CHUNK_SIZE}:`, error.message);
        throw new Error(`Error al insertar lote: ${error.message}`);
      }
      results.push(`Lote ${Math.floor(i / CHUNK_SIZE) + 1} procesado`);
    }

    revalidatePath("/inventory");
    return { success: true, count: preparedProducts.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
