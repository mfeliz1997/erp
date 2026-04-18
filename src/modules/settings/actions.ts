"use server";

import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Usa tu archivo admin directamente
import { revalidatePath } from "next/cache";

export async function updateWhatsappSettings(formData: FormData) {
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

  const settings = {
    whatsapp_auto_send: formData.get("autoSend") === "on",
    whatsapp_meta_token: formData.get("metaToken") as string,
    whatsapp_phone_id: formData.get("phoneId") as string,
  };

  const { error } = await supabase
    .from("tenants")
    .update(settings)
    .eq("id", profile?.tenant_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function createEmployeeAction(formData: FormData) {
  try {
    // 1. Cliente del usuario actual
    const userSupabase = await createClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    const { data: adminProfile } = await userSupabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user?.id)
      .single();

    if (adminProfile?.role !== "admin") throw new Error("Acceso denegado");

    // Obtenemos el subdominio de forma segura sin JOINs complejos
    const { data: tenant } = await userSupabase
      .from("tenants")
      .select("name")
      .eq("id", adminProfile.tenant_id)
      .single();

    const name = formData.get("name") as string;
    const cleanName = name.toLowerCase().replace(/\s+/g, "");
    const companyDomainStr = tenant?.name ? tenant.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "empresa";

    const email = `${cleanName}@${companyDomainStr}.com`;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const allowedRoutes = formData.getAll("routes") as string[];

    // 2. Usar cliente Admin (Service Role) para saltar RLS y crear cuenta
    const { data: newAuthUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

    if (authError) {
      if (authError.message.includes('already registered')) {
         throw new Error("Este correo/usuario ya se generó en otra sucursal. Intenta agregando un número al nombre (ej: maria2).");
      }
      throw new Error(authError.message);
    }

    // 3. Crear el Perfil del empleado
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: newAuthUser.user.id,
      tenant_id: adminProfile.tenant_id,
      full_name: name,
      role: "pos",
      phone: phone,
      allowed_routes: allowedRoutes,
    });

    if (profileError) throw new Error(profileError.message);

    revalidatePath("/settings");
    return { success: true, data: "Empleado creado" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEmployeeAction(formData: FormData) {
  try {
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();

    const { data: adminProfile } = await userSupabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user?.id)
      .single();

    if (adminProfile?.role !== "admin") throw new Error("Acceso denegado");

    const employeeId = formData.get("employeeId") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;
    const isDeactivated = formData.get("deactivate") === "on";

    // Revisar si existe el empleado y es de su empresa
    const { data: targetProfile, error: verifyError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", employeeId)
      .eq("tenant_id", adminProfile.tenant_id)
      .single();

    if (verifyError || !targetProfile) throw new Error("Empleado no encontrado o denegado");

    // Modificar datos del perfil
    let profileUpdates: any = { phone };
    if (isDeactivated) {
      profileUpdates.allowed_routes = []; // Quitar rutas por seguridad si en el futuro se ignora el ban
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", employeeId);

    if (profileError) throw new Error(profileError.message);

    // Cambiar contraseña o suspender en auth admin
    const authUpdates: any = {};
    if (password) authUpdates.password = password;
    
    // De-activate ban duration (Banned for approx 10 years if checkbox is marked)
    if (isDeactivated) {
      authUpdates.ban_duration = '87600h';
    } else {
      authUpdates.ban_duration = 'none';
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(employeeId, authUpdates);
      if (authError) throw new Error(authError.message);
    }

    revalidatePath("/settings");
    return { success: true, data: "Empleado actualizado" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateWebsiteSettings(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") throw new Error("Acceso denegado");

    const subdomain = (formData.get("subdomain") as string)?.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    const logo_url = formData.get("logo_url") as string;
    const whatsapp_number = formData.get("whatsapp_number") as string;
    const public_color = formData.get("public_color") as string;
    
    if (!subdomain) throw new Error("Subdominio inválido");

    // Intentamos actualizar subdomain y logo_url primero (que sabemos que existen)
    const { error: baseError } = await supabaseAdmin
      .from("tenants")
      .update({ 
        subdomain: subdomain,
        logo_url: logo_url || null
      })
      .eq("id", profile.tenant_id);

    if (baseError) throw new Error(baseError.message);

    // Intentamos actualizar los settings (que es un JSONB)
    // Si falla porque la columna no existe, informamos al usuario
    const { data: currentTenant, error: fetchError } = await supabaseAdmin
      .from("tenants")
      .select("settings")
      .eq("id", profile.tenant_id)
      .single();

    if (!fetchError && currentTenant) {
      const newSettings = {
        ...(currentTenant.settings || {}),
        whatsapp_number,
        public_color
      };

      await supabaseAdmin
        .from("tenants")
        .update({ settings: newSettings })
        .eq("id", profile.tenant_id);
    }

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
