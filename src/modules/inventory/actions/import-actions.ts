"use server";

import { createClient } from "@/lib/supabase";
import { suggestMapping } from "../services/ai-mapper";
import { revalidatePath } from "next/cache";

export async function getAiMappingSuggestion(columns: string[]) {
  try {
    const suggestion = await suggestMapping(columns);
    return { success: true, data: suggestion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function bulkCreateProductsAction(products: any[]) {
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

    // Limpieza y preparación
    const preparedProducts = products.map(p => ({
      tenant_id: profile.tenant_id,
      name: p.name,
      metadata: { description: p.description || null },
      cost_price: parseFloat(p.cost_price) || 0,
      price: parseFloat(p.price) || 0,
      stock: parseInt(p.stock) || 0,
      min_stock_alert: 10,
      barcode: p.barcode || null,
      type: p.category || "general",
    }));

    const CHUNK_SIZE = 500;
    for (let i = 0; i < preparedProducts.length; i += CHUNK_SIZE) {
      const chunk = preparedProducts.slice(i, i + CHUNK_SIZE);
      
      // UPSERT: Si el código de barras existe para este tenant, actualiza el stock.
      // Si no, crea el producto.
      const { error } = await supabase
        .from("products")
        .upsert(chunk, { 
          onConflict: 'barcode, tenant_id',
          ignoreDuplicates: false // Queremos que actualice valores si hay conflicto
        });

      if (error) throw new Error(`Error en lote ${i}: ${error.message}`);
    }

    revalidatePath("/inventory");
    return { success: true, count: preparedProducts.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
