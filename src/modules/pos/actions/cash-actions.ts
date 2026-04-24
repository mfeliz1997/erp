"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

const OpenShiftSchema = z.object({
  register_id: z.string().uuid("Seleccione una caja válida"),
  opening_amount: z.coerce.number().min(0, "El monto de apertura no puede ser negativo"),
});

const CloseShiftSchema = z.object({
  shift_id: z.string().uuid(),
  counted_amount: z.coerce.number().min(0, "El monto contado no puede ser negativo"),
  force_close: z.coerce.boolean().optional().default(false),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentBreakdown {
  cash: number;
  card: number;
  transfer: number;
  credit: number; // ventas a crédito — no entran al cajón físico
}

export interface ShiftSummary {
  opening_amount: number;
  total_sales: number;       // todas las ventas (cash + card + transfer + credit)
  cash_sales: number;        // solo efectivo — lo que debería estar en el cajón
  card_sales: number;
  transfer_sales: number;
  credit_sales: number;      // cuentas por cobrar generadas en este turno
  expected_amount: number;   // opening_amount + cash_sales (físico esperado)
  payment_breakdown: PaymentBreakdown;
}

export interface CashClosingResult extends ShiftSummary {
  shift_id: string;
  counted_amount: number;
  amount_difference: number; // negative = shortage, positive = surplus
  has_discrepancy: boolean;  // true only when shortage > RD$1
}

export type ActionState = {
  success: boolean;
  status?: "OK" | "WARNING_DISCREPANCY";
  error?: string;
  data?: any;
  closing_result?: CashClosingResult;
};

// ── Pure aggregation — no side effects ───────────────────────────────────────

function buildShiftSummary(
  opening_amount: number,
  invoices: Array<{ total: number | null; payment_method: string | null; status: string | null }>,
): ShiftSummary {
  const breakdown: PaymentBreakdown = { cash: 0, card: 0, transfer: 0, credit: 0 };

  for (const inv of invoices) {
    const total = Number(inv.total) || 0;
    const method = (inv.payment_method ?? "CASH").toUpperCase();
    const status = (inv.status ?? "paid").toLowerCase();

    if (status === "pending") {
      // Venta a crédito — no entra al cajón físico
      breakdown.credit += total;
      continue;
    }

    // Venta pagada — clasificar por método
    if (method === "CASH")          breakdown.cash     += total;
    else if (method === "CARD")     breakdown.card     += total;
    else if (method === "TRANSFER") breakdown.transfer += total;
    else                            breakdown.cash     += total; // fallback
  }

  const total_sales    = breakdown.cash + breakdown.card + breakdown.transfer + breakdown.credit;
  const expected_amount = opening_amount + breakdown.cash;

  return {
    opening_amount,
    total_sales,
    cash_sales:     breakdown.cash,
    card_sales:     breakdown.card,
    transfer_sales: breakdown.transfer,
    credit_sales:   breakdown.credit,
    expected_amount,
    payment_breakdown: breakdown,
  };
}

// ── Server Actions ────────────────────────────────────────────────────────────

export async function openShift(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const parsed = OpenShiftSchema.safeParse({
      register_id:    formData.get("register_id"),
      opening_amount: formData.get("opening_amount"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.flatten().fieldErrors.register_id?.[0] ||
               parsed.error.flatten().fieldErrors.opening_amount?.[0],
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Perfil no encontrado");

    const { error } = await supabase.from("cash_shifts").insert({
      tenant_id:      profile.tenant_id,
      register_id:    parsed.data.register_id,
      user_id:        user.id,
      opening_amount: parsed.data.opening_amount,
      status:         "OPEN",
      opened_at:      new Date().toISOString(),
    });

    if (error) throw new Error(error.message);

    await supabase.from("activity_logs").insert({
      tenant_id:   profile.tenant_id,
      user_id:     user.id,
      action:      "cash_open",
      description: `Apertura de caja con RD$ ${parsed.data.opening_amount.toLocaleString()}`,
      metadata:    { opening_amount: parsed.data.opening_amount },
    });

    revalidatePath("/cash-register");
    return { success: true, status: "OK" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function closeShift(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const parsed = CloseShiftSchema.safeParse({
      shift_id:       formData.get("shift_id"),
      counted_amount: formData.get("counted_amount"),
      force_close:    formData.get("force_close"),
    });

    if (!parsed.success) {
      return { success: false, error: "Datos del arqueo inválidos" };
    }

    const { shift_id, counted_amount, force_close } = parsed.data;

    // ── 1. Fetch shift ────────────────────────────────────────────────────────
    const { data: shift, error: shiftError } = await supabase
      .from("cash_shifts")
      .select("tenant_id, opening_amount")
      .eq("id", shift_id)
      .eq("user_id", user.id)
      .single();

    if (shiftError || !shift) throw new Error("Turno no encontrado o sin permisos");

    // ── 2. Fetch all invoices for this shift (paid + pending/credit) ──────────
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total, payment_method, status")
      .eq("shift_id", shift_id)
      .in("status", ["paid", "pending"]);

    // ── 3. Pure aggregation ───────────────────────────────────────────────────
    const summary = buildShiftSummary(
      Number(shift.opening_amount),
      invoices ?? [],
    );

    const amount_difference = counted_amount - summary.expected_amount;
    const has_discrepancy   = amount_difference < -1; // flag only for shortage

    const closing_result: CashClosingResult = {
      shift_id,
      ...summary,
      counted_amount,
      amount_difference,
      has_discrepancy,
    };

    // ── 4. Return WARNING if shortage and not forced ──────────────────────────
    if (has_discrepancy && !force_close) {
      return { success: false, status: "WARNING_DISCREPANCY", closing_result };
    }

    // ── 5. Persist closing ────────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("cash_shifts")
      .update({
        status:           "CLOSED",
        closing_amount:   counted_amount,
        closed_at:        new Date().toISOString(),
        expected_amount:  summary.expected_amount,
        amount_difference,
        has_discrepancy,
        payment_breakdown: summary.payment_breakdown,
      })
      .eq("id", shift_id)
      .eq("user_id", user.id);

    if (updateError) throw new Error(updateError.message);

    // ── 6. Audit log ──────────────────────────────────────────────────────────
    const shortageNote = has_discrepancy
      ? ` — faltante RD$ ${Math.abs(amount_difference).toLocaleString()}`
      : "";

    await supabase.from("activity_logs").insert({
      tenant_id:   shift.tenant_id,
      user_id:     user.id,
      action:      "cash_close",
      description: `Cierre de caja RD$ ${counted_amount.toLocaleString()}${shortageNote}`,
      metadata: {
        shift_id,
        opening_amount:    summary.opening_amount,
        total_sales:       summary.total_sales,
        closing_amount:    counted_amount,
        expected_amount:   summary.expected_amount,
        amount_difference,
        has_discrepancy,
        payment_breakdown: summary.payment_breakdown,
      },
    });

    revalidatePath("/cash-register");
    revalidatePath("/overview");
    return { success: true, status: "OK", closing_result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Read-only helper used by page.tsx to preview shift before closing ─────────
export async function getOpenShiftSummary(shift_id: string): Promise<ShiftSummary | null> {
  const supabase = await createClient();

  const { data: shift } = await supabase
    .from("cash_shifts")
    .select("opening_amount")
    .eq("id", shift_id)
    .single();

  if (!shift) return null;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("total, payment_method, status")
    .eq("shift_id", shift_id)
    .in("status", ["paid", "pending"]);

  return buildShiftSummary(Number(shift.opening_amount), invoices ?? []);
}
