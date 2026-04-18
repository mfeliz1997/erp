"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const RepairOrderSchema = z.object({
  customer_id: z.string().uuid("Cliente inválido"),
  brand: z.string().min(1, "Marca obligatoria"),
  model: z.string().min(1, "Modelo obligatorio"),
  issue: z.string().min(1, "Describa la falla"),
  estimated_cost: z.coerce.number().min(0, "Costo no puede ser negativo"),
});

export type ActionState = {
  success: boolean;
  error?: string;
};

export async function createRepairOrder(prevState: ActionState, formData: FormData): Promise<ActionState> {
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

    const validatedFields = RepairOrderSchema.safeParse({
      customer_id: formData.get("customer_id"),
      brand: formData.get("brand"),
      model: formData.get("model"),
      issue: formData.get("issue"),
      estimated_cost: formData.get("estimated_cost"),
    });

    if (!validatedFields.success) {
      return { success: false, error: validatedFields.error.flatten().fieldErrors.issue?.[0] || "Validación fallida" };
    }

    const { customer_id, brand, model, issue, estimated_cost } = validatedFields.data;

    const { error } = await supabase.from("repair_orders").insert({
      tenant_id: profile.tenant_id,
      customer_id,
      status: "RECEIVED",
      estimated_cost,
      device_details: { brand, model },
      issue_description: issue,
      assigned_to: user.id, // Por defecto asignado al que lo crea
    });

    if (error) throw error;

    revalidatePath("/workshop");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRepairStatus(orderId: string, newStatus: string): Promise<ActionState> {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from("repair_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) throw error;

    if (newStatus === "DELIVERED") {
        console.log(`Orden ${orderId} entregada. Disparar creación de factura aquí en el futuro.`);
    }

    revalidatePath("/workshop");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
