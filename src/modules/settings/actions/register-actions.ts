"use server";

import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50),
});

export type ActionState = {
  success: boolean;
  error?: string;
  data?: any;
};

export async function createRegister(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const validatedFields = RegisterSchema.safeParse({
      name: formData.get("name"),
    });

    if (!validatedFields.success) {
      return { success: false, error: validatedFields.error.flatten().fieldErrors.name?.[0] };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Perfil no encontrado");

    const { error } = await supabase.from("cash_registers").insert({
      tenant_id: profile.tenant_id,
      name: validatedFields.data.name,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') throw new Error("Ya existe una caja con este nombre");
      throw new Error(error.message);
    }

    revalidatePath("/settings/cash-registers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleRegisterStatus(id: string, currentStatus: boolean): Promise<ActionState> {
  // Nota: Al ser un toggle rápido, no necesitamos useActionState en la UI necesariamente,
  // pero lo exponemos como action.
  try {
    const { error } = await supabaseAdmin
      .from("cash_registers")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/settings/cash-registers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
