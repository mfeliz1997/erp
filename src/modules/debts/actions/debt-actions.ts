"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PaymentSchema = z.object({
  debt_id:        z.string().uuid(),
  customer_id:    z.string().uuid(),
  amount:         z.coerce.number().min(0.01, "Monto debe ser mayor a 0"),
  payment_method: z.enum(["cash", "transfer", "card"]),
});

export type DebtActionState = {
  success: boolean;
  error?: string;
};

export async function registerPayment(
  prevState: DebtActionState,
  formData: FormData,
): Promise<DebtActionState> {
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

    const parsed = PaymentSchema.safeParse({
      debt_id:        formData.get("debt_id"),
      customer_id:    formData.get("customer_id"),
      amount:         formData.get("amount"),
      payment_method: formData.get("payment_method"),
    });

    if (!parsed.success) {
      return { success: false, error: "Datos de pago inválidos" };
    }

    const { debt_id, customer_id, amount, payment_method } = parsed.data;

    // 1. Verify debt belongs to this tenant and get current balance
    const { data: debt, error: debtError } = await supabase
      .from("debts")
      .select("balance, status")
      .eq("id", debt_id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (debtError || !debt) throw new Error("Deuda no encontrada");
    if (debt.status !== "open") throw new Error("Esta deuda ya está cerrada");
    if (amount > Number(debt.balance)) throw new Error("El monto supera el balance pendiente");

    const newBalance = Number(debt.balance) - amount;
    const newStatus  = newBalance <= 0 ? "paid" : "open";

    // 2. Insert payment record — matches debt_payments schema exactly
    const { error: payError } = await supabase.from("debt_payments").insert({
      tenant_id:      profile.tenant_id,
      debt_id,
      user_id:        user.id,
      amount,
      payment_method,
    });

    if (payError) throw new Error(payError.message);

    // 3. Update debt balance + status
    const { error: updateError } = await supabase
      .from("debts")
      .update({ balance: newBalance, status: newStatus })
      .eq("id", debt_id);

    if (updateError) throw new Error(updateError.message);

    // 4. Update customer current_debt if column exists (best-effort)
    await supabase.rpc("increment_customer_debt", {
      p_customer_id: customer_id,
      p_amount: -amount,
    });

    revalidatePath("/debts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
