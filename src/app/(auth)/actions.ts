"use server";

import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

// 1. Acción de Logout (La que te estaba causando el error)
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// 2. Acción de Login
export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Retornamos el error estandarizado
    return { success: false, error: error.message };
  }

  // Redirigir al dashboard si es exitoso
  redirect("/overview");
}
