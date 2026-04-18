"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PaymentSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().min(1, "Monto debe ser mayor a 0"),
  payment_method: z.enum(["cash", "transfer", "card"]),
  notes: z.string().optional(),
});

export type DebtActionState = {
  success: boolean;
  error?: string;
};

export async function registerPayment(prevState: DebtActionState, formData: FormData): Promise<DebtActionState> {
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

    const validatedFields = PaymentSchema.safeParse({
      customer_id: formData.get("customer_id"),
      amount: formData.get("amount"),
      payment_method: formData.get("payment_method"),
      notes: formData.get("notes"),
    });

    if (!validatedFields.success) {
      return { success: false, error: "Datos de pago inválidos" };
    }

    const { error } = await supabase.from("payments").insert({
      tenant_id: profile.tenant_id,
      customer_id: validatedFields.data.customer_id,
      amount: validatedFields.data.amount,
      payment_method: validatedFields.data.payment_method,
      notes: validatedFields.data.notes,
      user_id: user.id
    });

    if (error) throw error;

    revalidatePath("/debts");
    revalidatePath("/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
