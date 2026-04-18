"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PurchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().min(1),
  unit_cost: z.coerce.number().min(0),
});

const PurchaseSchema = z.object({
  supplier_name: z.string().min(1, "Nombre del suplidor es requerido"),
  invoice_number: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, "Debe añadir al menos un producto"),
  total_cost: z.coerce.number(),
});

export type PurchaseActionState = {
  success: boolean;
  error?: string;
};

export async function createPurchaseAction(data: z.infer<typeof PurchaseSchema>): Promise<PurchaseActionState> {
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

    // 1. Insertar la Compra (Purchase Order)
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        supplier_name: data.supplier_name,
        invoice_number: data.invoice_number,
        total_amount: data.total_cost,
        status: 'completed'
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. Insertar Items e Incrementar Stock
    for (const item of data.items) {
      // Insertar item de compra
      await supabase.from("purchase_items").insert({
        tenant_id: profile.tenant_id,
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total: item.quantity * item.unit_cost
      });

      // Incrementar Stock vía RPC (usamos la misma lógica inversa de decrement_stock_safe si existe)
      // O simplemente una actualización directa si no hay stock negativo en compras
      const { error: stockError } = await supabase.rpc('increment_product_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });

      if (stockError) console.error(`Error actualizando stock para ${item.product_id}:`, stockError.message);
    }

    revalidatePath("/inventory");
    revalidatePath("/purchases");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
