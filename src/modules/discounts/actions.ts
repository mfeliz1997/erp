"use server";

import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/auth";
import type { Discount } from "@/types/pos";

async function requireAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Solo administradores");
  return { supabase, user, tenantId: profile.tenant_id as string };
}

export async function getDiscountsAction(): Promise<Discount[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return [];

  const { data } = await supabase
    .from("discounts")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  return (data ?? []) as Discount[];
}

export async function createDiscountAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenantId } = await requireAdminClient();

    const name  = (formData.get("name") as string)?.trim();
    const type  = formData.get("type") as "percentage" | "fixed";
    const value = parseFloat(formData.get("value") as string);

    if (!name) throw new Error("El nombre es obligatorio");
    if (!["percentage", "fixed"].includes(type)) throw new Error("Tipo inválido");
    if (isNaN(value) || value <= 0) throw new Error("El valor debe ser mayor a 0");
    if (type === "percentage" && value > 100) throw new Error("El porcentaje no puede superar 100");

    const { error } = await supabase.from("discounts").insert({
      tenant_id: tenantId,
      name,
      type,
      value,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/discounts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleDiscountAction(id: string, is_active: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();

    const { error } = await supabase
      .from("discounts")
      .update({ is_active })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/discounts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDiscountAction(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();

    const { error } = await supabase
      .from("discounts")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/discounts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
