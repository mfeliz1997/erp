// src/app/(auth)/register/actions.ts
"use server";

import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // <--- Importa el admin
import { redirect } from "next/navigation";

export async function registerAction(prevState: any, formData: FormData) {
  const supabase = await createClient(); // Para el auth

  const companyName = formData.get("company_name") as string;
  const ownerName = formData.get("owner_name") as string || companyName;
  const businessType = formData.get("business_type") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string;

  if (!businessType)
    return { success: false, error: "Selecciona un tipo de negocio." };

  // 1. Crear Usuario (Cliente normal)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { phone } },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || "Error al crear cuenta.",
    };
  }

  // 2. Crear el Tenant (Usamos Admin para evitar RLS)
  // Generar un subdomain único basado en el nombre de la compañía
  const baseSubdomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const subdomain = `${baseSubdomain}-${Math.random().toString(36).substring(2, 6)}`;

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert([
      {
        name: companyName,
        business_type: businessType,
        plan: "free",
        subdomain,
      },
    ])
    .select()
    .single();

  if (tenantError) {
    console.error("🔥 Error Admin Tenant:", tenantError);
    return { success: false, error: "Error de sistema al crear el negocio." };
  }

  // 3. Crear el Perfil (Usamos Admin)
  const { error: profileError } = await supabaseAdmin.from("profiles").insert([
    {
      id: authData.user.id,
      tenant_id: tenant.id,
      role: "admin",
      full_name: ownerName,
      is_owner: true,
      phone: phone,
    },
  ]);

  if (profileError) {
    return { success: false, error: "Error de sistema al crear el perfil." };
  }

  redirect("/overview");
}
