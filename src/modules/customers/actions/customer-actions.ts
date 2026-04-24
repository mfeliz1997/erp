"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CustomerSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  tax_type: z.enum(["CEDULA", "RNC", "PASAPORTE"]),
  tax_id: z.string().min(1, "Documento es obligatorio"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  credit_limit: z.coerce.number().min(0, "Monto inválido").default(0),
  company_name: z.string().optional(),
});

const UpdateCustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "El nombre es obligatorio"),
  tax_type: z.enum(["CEDULA", "RNC", "PASAPORTE"]),
  tax_id: z.string().min(1, "Documento es obligatorio"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  credit_limit: z.coerce.number().min(0, "Monto inválido").default(0),
  company_name: z.string().optional(),
});

export type ActionState = {
  success: boolean;
  error?: string;
  data?: any;
};

export async function createCustomer(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const validatedFields = CustomerSchema.safeParse({
      name: formData.get("name"),
      tax_type: formData.get("tax_type"),
      tax_id: formData.get("tax_id"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      credit_limit: formData.get("credit_limit"),
    });

    if (!validatedFields.success) {
      return { 
        success: false, 
        error: Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0] 
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Perfil no encontrado");

    const { data: newCustomer, error } = await supabase
      .from("customers")
      .insert({
        tenant_id: profile.tenant_id,
        ...validatedFields.data,
        current_debt: 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error("Este RNC/Cédula ya está registrado");
      throw new Error(error.message);
    }

    revalidatePath("/customers");
    return { success: true, data: newCustomer };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCustomer(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role, can_edit_customers")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Perfil no encontrado");

    const canEdit = profile.role === "admin" || profile.can_edit_customers;
    if (!canEdit) throw new Error("Sin permiso para editar clientes");

    const parsed = UpdateCustomerSchema.safeParse({
      id:           formData.get("id"),
      name:         formData.get("name"),
      tax_type:     formData.get("tax_type"),
      tax_id:       formData.get("tax_id"),
      phone:        formData.get("phone"),
      email:        formData.get("email"),
      credit_limit: formData.get("credit_limit"),
      company_name: formData.get("company_name"),
    });

    if (!parsed.success) {
      return { success: false, error: Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] };
    }

    const { id, ...fields } = parsed.data;

    const { data: updated, error } = await supabase
      .from("customers")
      .update(fields)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("Ese RNC/Cédula ya está registrado en otro cliente");
      throw new Error(error.message);
    }

    revalidatePath("/customers");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
