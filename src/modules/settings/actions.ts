"use server";

import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import type { ActionResult, UserRole } from "@/types/auth";

// ─── Auth guard helper ────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Acceso denegado");
  return { user, profile };
}

// ─── Employee creation ────────────────────────────────────────────────────────

export async function createEmployeeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { profile: adminProfile } = await requireAdmin();

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", adminProfile.tenant_id)
      .single();

    const name           = formData.get("name") as string;
    const cleanName      = name.toLowerCase().replace(/\s+/g, "");
    const domain         = tenant?.name
      ? tenant.name.toLowerCase().replace(/[^a-z0-9]/g, "")
      : "empresa";
    const email          = `${cleanName}@${domain}.com`;
    const password       = formData.get("password") as string;
    const phone          = formData.get("phone") as string;
    const role           = (formData.get("role") as UserRole) ?? "pos";
    const allowedRoutes  = formData.getAll("routes") as string[];
    const canGiveCredit  = formData.get("can_give_credit") === "true";
    const maxCreditDays  = canGiveCredit
      ? parseInt(formData.get("max_credit_days") as string) || 30
      : 0;
    const canUseCard           = formData.get("can_use_card") === "true";
    const canUseTransfer       = formData.get("can_use_transfer") === "true";
    const canSellWithoutShift  = formData.get("can_sell_without_shift") === "true";
    const canEditCustomers     = formData.get("can_edit_customers") === "true";
    const canApplyDiscount     = formData.get("can_apply_discount") === "true";
    const assignedRegisterRaw  = (formData.get("assigned_register_id") as string)?.trim();
    const assignedRegisterId   = assignedRegisterRaw || null;
    const pinCodeRaw           = (formData.get("pin_code") as string)?.trim();
    const pinCode              = /^\d{4}$/.test(pinCodeRaw ?? "") ? pinCodeRaw : null;

    const { data: newAuthUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

    if (authError) {
      if (authError.message.includes("already registered")) {
        throw new Error(
          "Este usuario ya existe. Intenta añadiendo un número al nombre (ej: maria2)."
        );
      }
      throw new Error(authError.message);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id:              newAuthUser.user.id,
      tenant_id:       adminProfile.tenant_id,
      full_name:       name,
      role,
      phone,
      allowed_routes:  allowedRoutes,
      can_give_credit:        canGiveCredit,
      max_credit_days:        maxCreditDays,
      can_use_card:           canUseCard,
      can_use_transfer:       canUseTransfer,
      can_sell_without_shift: canSellWithoutShift,
      can_edit_customers:     canEditCustomers,
      can_apply_discount:     canApplyDiscount,
      assigned_register_id:   assignedRegisterId,
      pin_code:               pinCode,
    });

    if (profileError) throw new Error(profileError.message);

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Employee update ──────────────────────────────────────────────────────────

export async function updateEmployeeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { profile: adminProfile } = await requireAdmin();

    const employeeId    = formData.get("employeeId") as string;
    const phone         = formData.get("phone") as string;
    const password      = formData.get("password") as string;
    const isDeactivated = formData.get("deactivate") === "on";
    const role          = (formData.get("role") as UserRole) ?? "pos";
    const allowedRoutes = isDeactivated ? [] : (formData.getAll("routes") as string[]);
    const canGiveCredit  = formData.get("can_give_credit") === "true";
    const maxCreditDays  = canGiveCredit
      ? parseInt(formData.get("max_credit_days") as string) || 30
      : 0;
    const canUseCard           = formData.get("can_use_card") === "true";
    const canUseTransfer       = formData.get("can_use_transfer") === "true";
    const canSellWithoutShift  = formData.get("can_sell_without_shift") === "true";
    const canEditCustomers     = formData.get("can_edit_customers") === "true";
    const canApplyDiscount     = formData.get("can_apply_discount") === "true";
    const assignedRegisterRaw  = (formData.get("assigned_register_id") as string)?.trim();
    const assignedRegisterId   = assignedRegisterRaw || null;
    const pinCodeRaw           = (formData.get("pin_code") as string)?.trim();
    const pinCode              = /^\d{4}$/.test(pinCodeRaw ?? "") ? pinCodeRaw : undefined;

    // Verify employee belongs to this tenant
    const { data: target, error: verifyError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", employeeId)
      .eq("tenant_id", adminProfile.tenant_id)
      .single();

    if (verifyError || !target) throw new Error("Empleado no encontrado o acceso denegado");

    const profileUpdates: Record<string, unknown> = {
      phone,
      role,
      allowed_routes:         allowedRoutes,
      can_give_credit:        canGiveCredit,
      max_credit_days:        maxCreditDays,
      can_use_card:           canUseCard,
      can_use_transfer:       canUseTransfer,
      can_sell_without_shift: canSellWithoutShift,
      can_edit_customers:     canEditCustomers,
      can_apply_discount:     canApplyDiscount,
      assigned_register_id:   assignedRegisterId,
    };
    if (pinCode !== undefined) profileUpdates.pin_code = pinCode;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", employeeId);

    if (profileError) throw new Error(profileError.message);

    const authUpdates: Record<string, unknown> = {
      ban_duration: isDeactivated ? "87600h" : "none",
    };
    if (password) authUpdates.password = password;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      employeeId,
      authUpdates
    );
    if (authError) throw new Error(authError.message);

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── WhatsApp settings ────────────────────────────────────────────────────────

export async function updateWhatsappSettings(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    const { error } = await supabase
      .from("tenants")
      .update({
        whatsapp_auto_send:  formData.get("autoSend") === "on",
        whatsapp_meta_token: formData.get("metaToken") as string,
        whatsapp_phone_id:   formData.get("phoneId") as string,
      })
      .eq("id", profile?.tenant_id);

    if (error) throw new Error(error.message);

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Website settings ─────────────────────────────────────────────────────────

export async function updateWebsiteSettings(formData: FormData): Promise<ActionResult> {
  try {
    const { profile } = await requireAdmin();

    const subdomain = (formData.get("subdomain") as string)
      ?.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (!subdomain) throw new Error("Subdominio inválido");

    const { error: baseError } = await supabaseAdmin
      .from("tenants")
      .update({
        subdomain,
        logo_url: (formData.get("logo_url") as string) || null,
      })
      .eq("id", profile.tenant_id);

    if (baseError) throw new Error(baseError.message);

    const { data: currentTenant } = await supabaseAdmin
      .from("tenants")
      .select("settings")
      .eq("id", profile.tenant_id)
      .single();

    if (currentTenant) {
      await supabaseAdmin
        .from("tenants")
        .update({
          settings: {
            ...(currentTenant.settings || {}),
            whatsapp_number: formData.get("whatsapp_number") as string,
            public_color:    formData.get("public_color") as string,
          },
        })
        .eq("id", profile.tenant_id);
    }

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Admin PIN ────────────────────────────────────────────────────────────────

export async function updateAdminPinAction(pin: string): Promise<ActionResult> {
  try {
    const { profile } = await requireAdmin();
    if (!/^\d{4}$/.test(pin)) throw new Error("El PIN debe ser de 4 dígitos numéricos");

    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ admin_pin: pin })
      .eq("id", profile.tenant_id);

    if (error) throw new Error(error.message);

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
