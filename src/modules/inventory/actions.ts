"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { ProductType } from "@/types/inventory";

// 1. Definimos el tipo exacto para cumplir con "Clean Actions"
export type InventoryActionState = {
  success: boolean;
  error?: string;
  data?: string;
};

// ============================================================================
// HELPER GLOBAL: Limpieza de Moneda (Escalable para todo el ERP)
// ============================================================================
const cleanCurrency = (value: FormDataEntryValue | null): number => {
  if (!value || typeof value !== "string") return 0;
  // Elimina $, comas y espacios. Mantiene números, puntos y signo negativo.
  const numericValue = parseFloat(value.replace(/[^0-9.-]+/g, ""));
  return isNaN(numericValue) ? 0 : numericValue;
};

// ============================================================================
// ACCIÓN: Crear Producto
// ============================================================================
export async function createProductAction(
  prevState: InventoryActionState | undefined,
  formData: FormData,
): Promise<InventoryActionState> {
  const supabase = await createClient();

  // Validación de sesión y obtención del perfil
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

  // Extraer datos básicos (con limpieza numérica)
  const name = formData.get("name") as string;
  const type = formData.get("type") as ProductType;
  const price = cleanCurrency(formData.get("price"));
  const cost_price = cleanCurrency(formData.get("cost_price"));
  const stock = parseInt(formData.get("stock") as string) || 0;
  const min_stock_alert =
    parseInt(formData.get("min_stock_alert") as string) || 10;

  const is_public = formData.get("is_public") === "on";

  // Lógica del Inventario Flexible (JSONB)
  const metadata: Record<string, unknown> = { is_public };
  if (type === "vehicle") {
    metadata.chasis = formData.get("chasis");
  } else if (type === "mobile") {
    metadata.imei = formData.get("imei");
  }

  // Procesar y Subir Imagen
  let image_url = null;
  const imageFile = formData.get("image") as File | null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    // Aislamos las imágenes por carpeta de tenant
    const filePath = `${profile.tenant_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("inventory")
      .upload(filePath, imageFile);

    if (uploadError) return { success: false, error: "Error subiendo imagen" };

    const { data: publicUrlData } = supabase.storage
      .from("inventory")
      .getPublicUrl(filePath);

    image_url = publicUrlData.publicUrl;
  }

  // Insertar en la base de datos
  const { error } = await supabase.from("products").insert({
    tenant_id: profile.tenant_id,
    name,
    type,
    price,
    cost_price,
    stock,
    min_stock_alert,
    metadata,
    image_url,
  });

  if (error) return { success: false, error: error.message };

  // + AUDITORIA
  await supabase.from("activity_logs").insert({
    tenant_id: profile.tenant_id,
    user_id: user.id,
    action: "inventory_create",
    description: `Producto creado: ${name} (Stock: ${stock})`,
    metadata: { product_name: name, stock },
  });

  revalidatePath("/inventory");
  return { success: true, data: "Producto creado exitosamente" };
}

// ============================================================================
// ACCIÓN: Eliminar Producto (Hard Delete)
// ============================================================================
export async function deleteProductAction(
  prevState: InventoryActionState | undefined,
  formData: FormData,
): Promise<InventoryActionState> {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "No autorizado." };
  }

  // El RLS protege la mutación
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true, data: "Producto eliminado correctamente." };
}

// ============================================================================
// ACCIÓN: Enviar a Papelera (Soft Delete)
// ============================================================================
export async function softDeleteProductAction(
  prevState: InventoryActionState | undefined,
  formData: FormData,
): Promise<InventoryActionState> {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("products")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  // + AUDITORIA
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  await supabase.from("activity_logs").insert({
    tenant_id: profile?.tenant_id,
    user_id: user.id,
    action: "inventory_delete",
    description: `Producto enviado a la papelera (ID: ${id})`,
    metadata: { product_id: id },
  });

  revalidatePath("/inventory");
  return { success: true, data: "Producto enviado a la papelera." };
}

// ============================================================================
// ACCIÓN: Actualizar Producto
// ============================================================================
export async function updateProductAction(
  prevState: InventoryActionState | undefined,
  formData: FormData,
): Promise<InventoryActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  // Validación de sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado." };

  // Obtenemos el tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id)
    return { success: false, error: "Negocio no encontrado" };

  // Extraer datos básicos (con limpieza de moneda)
  const name = formData.get("name") as string;
  const price = cleanCurrency(formData.get("price")); 
  const stock = parseInt(formData.get("stock") as string) || 0;
  const min_stock_alert =
    parseInt(formData.get("min_stock_alert") as string) || 10;
  const is_public = formData.get("is_public") === "on";

  // Primero obtener el metadata actual del producto
  const { data: currentProduct } = await supabase
    .from("products")
    .select("metadata")
    .eq("id", id)
    .single();

  const newMetadata = {
    ...(currentProduct?.metadata as Record<string, unknown> || {}),
    is_public
  };

  // 1. Armamos el payload base
  const updatePayload: Record<string, any> = {
    name,
    price,
    stock,
    min_stock_alert,
    metadata: newMetadata,
  };

  // 2. Procesar y Subir Nueva Imagen (Opcional)
  const imageFile = formData.get("image") as File | null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${profile.tenant_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("inventory")
      .upload(filePath, imageFile);

    if (uploadError)
      return { success: false, error: "Error subiendo la nueva imagen" };

    const { data: publicUrlData } = supabase.storage
      .from("inventory")
      .getPublicUrl(filePath);

    updatePayload.image_url = publicUrlData.publicUrl;
  }

  // 3. Ejecutamos el Update
  const { error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/inventory");
  return { success: true, data: "Producto actualizado correctamente." };
}
