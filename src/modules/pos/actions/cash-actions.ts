"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const OpenShiftSchema = z.object({
  register_id: z.string().uuid("Seleccione una caja válida"),
  opening_amount: z.coerce.number().min(0, "El monto de apertura no puede ser negativo"),
});

const CloseShiftSchema = z.object({
  shift_id: z.string().uuid(),
  counted_amount: z.coerce.number().min(0, "El monto contado no puede ser negativo"),
});

export type ActionState = {
  success: boolean;
  error?: string;
  data?: any;
};

export async function openShift(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const validatedFields = OpenShiftSchema.safeParse({
      register_id: formData.get("register_id"),
      opening_amount: formData.get("opening_amount"),
    });

    if (!validatedFields.success) {
      return { 
        success: false, 
        error: validatedFields.error.flatten().fieldErrors.register_id?.[0] || 
               validatedFields.error.flatten().fieldErrors.opening_amount?.[0] 
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Perfil no encontrado");

    const { error } = await supabase.from("cash_shifts").insert({
      tenant_id: profile.tenant_id,
      register_id: validatedFields.data.register_id,
      user_id: user.id,
      opening_amount: validatedFields.data.opening_amount,
      status: 'OPEN',
      opened_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);

    // + AUDITORIA
    await supabase.from("activity_logs").insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: "cash_open",
      description: `Apertura de caja con RD$ ${validatedFields.data.opening_amount.toLocaleString()}`,
      metadata: { opening_amount: validatedFields.data.opening_amount },
    });

    revalidatePath("/cash-register");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function closeShift(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const validatedFields = CloseShiftSchema.safeParse({
      shift_id: formData.get("shift_id"),
      counted_amount: formData.get("counted_amount"),
    });

    if (!validatedFields.success) {
      return { success: false, error: "Datos del arqueo inválidos" };
    }

    const { error } = await supabase
      .from("cash_shifts")
      .update({
        status: 'CLOSED',
        closing_amount: validatedFields.data.counted_amount,
        closed_at: new Date().toISOString(),
      })
      .eq("id", validatedFields.data.shift_id)
      .eq("user_id", user.id); // Seguridad extra

    if (error) throw new Error(error.message);

    // + AUDITORIA
    const { data: currentShift } = await supabase
      .from("cash_shifts")
      .select("tenant_id")
      .eq("id", validatedFields.data.shift_id)
      .single();

    await supabase.from("activity_logs").insert({
      tenant_id: currentShift?.tenant_id,
      user_id: user.id,
      action: "cash_close",
      description: `Cierre de caja con RD$ ${validatedFields.data.counted_amount.toLocaleString()}`,
      metadata: { 
        shift_id: validatedFields.data.shift_id, 
        closing_amount: validatedFields.data.counted_amount 
      },
    });

    revalidatePath("/cash-register");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
