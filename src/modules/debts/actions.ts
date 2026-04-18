"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function registerPaymentAction(
  debtId: string,
  amountToPay: number,
  paymentMethod: "cash" | "card" | "transfer",
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id)
    return { success: false, error: "Perfil sin negocio" };

  // 1. Obtener la deuda actual
  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("*")
    .eq("id", debtId)
    .single();

  if (debtError || !debt)
    return { success: false, error: "Deuda no encontrada" };
  if (amountToPay <= 0 || amountToPay > debt.balance)
    return { success: false, error: "Monto inválido" };

  const newBalance = debt.balance - amountToPay;
  const newStatus = newBalance <= 0 ? "paid" : "open";

  // 2. Actualizar balance de la deuda
  await supabase
    .from("debts")
    .update({ balance: newBalance, status: newStatus })
    .eq("id", debtId);

  // 3. Registrar el pago en el historial
  await supabase.from("debt_payments").insert({
    tenant_id: profile.tenant_id,
    debt_id: debtId,
    user_id: user.id,
    amount: amountToPay,
    payment_method: paymentMethod,
  });

  // 4. Log de Auditoría (Trazabilidad)
  await supabase.from("activity_logs").insert({
    tenant_id: profile.tenant_id,
    user_id: user.id,
    action: "payment",
    description: `Abono de $${amountToPay} recibido a la factura conectada.`,
    metadata: { debt_id: debtId, method: paymentMethod },
  });

  // Refrescar caché de Next.js
  revalidatePath("/debts");
  revalidatePath("/overview");

  return { success: true, data: { newBalance, status: newStatus } };
}
