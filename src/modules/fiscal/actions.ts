"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// Estándar de Invenza para respuestas de acciones
export type FiscalActionState = {
  success: boolean;
  error?: string;
  data?: string;
};

/**
 * Registra o actualiza secuencias NCF (B01, B02, etc.)
 */
export async function upsertNcfAction(
  prevState: FiscalActionState,
  formData: FormData,
): Promise<FiscalActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id)
    return { success: false, error: "Negocio no encontrado" };

  const type = formData.get("type") as string;
  const prefix = formData.get("prefix") as string;
  const current = parseInt(formData.get("current") as string);
  const max = parseInt(formData.get("max") as string);
  const expiry = (formData.get("expiry") as string) || null;

  const { error } = await supabase.from("ncf_sequences").upsert(
    {
      tenant_id: profile.tenant_id,
      type,
      prefix,
      current_sequence: current,
      max_limit: max,
      valid_until: expiry,
    },
    { onConflict: "tenant_id, type" },
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/fiscal");
  return { success: true, data: "Secuencia configurada correctamente" };
}

/**
 * Actualiza umbrales de alerta y canales de notificación
 */
export async function updateAlertSettingsAction(
  prevState: FiscalActionState, // Eliminado 'any' [cite: 12]
  formData: FormData,
): Promise<FiscalActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sesión expirada" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return { success: false, error: "Perfil huérfano" };

  const threshold = parseInt(formData.get("threshold") as string);
  const whatsapp = formData.get("whatsapp") === "on";
  const email = formData.get("email") === "on";

  const { error } = await supabase.from("tenant_fiscal_settings").upsert({
    tenant_id: profile.tenant_id,
    ncf_threshold: threshold,
    notify_whatsapp: whatsapp,
    notify_email: email,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/fiscal");
  return { success: true, data: "Configuración de alertas actualizada" };
}

/**
 * Activa/Desactiva alertas para empleados específicos
 */
export async function toggleEmployeeAlertAction(
  employeeId: string,
  currentStatus: boolean,
) {
  const supabase = await createClient();

  // El RLS asegura que solo puedes actualizar si perteneces al mismo tenant [cite: 6, 55]
  const { error } = await supabase
    .from("profiles")
    .update({ receive_fiscal_alerts: !currentStatus })
    .eq("id", employeeId);

  if (!error) revalidatePath("/fiscal");
}
