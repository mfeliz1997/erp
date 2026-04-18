"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CartItem } from "@/types/pos";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";

export type PosActionState = {
  success: boolean;
  error?: string;
  data?: any;
};

// ------------------------------------------------------------------

// ------------------------------------------------------------------
export async function processSaleAction(
  cart: CartItem[],
  total: number,
  customerName: string,
  customerRnc: string,
  customerPhone: string,
  ncfType: "B01" | "B02",
  paymentMethod: "cash" | "credit",
  customerId?: string,
): Promise<PosActionState> {
  try {
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
    if (!user) return { success: false, error: "Usuario no autenticado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id)
      return { success: false, error: "Perfil sin negocio asignado" };

    /* 
    // 1. Validar regla DGII
    if (ncfType === "B01" && (!customerRnc || !customerName)) {
      return {
        success: false,
        error: "El B01 exige RNC y Nombre obligatoriamente.",
      };
    }
    */

    /* 
    // 2. Obtener NCF Atómico (Motor Fiscal)
    const { data: ncf, error: ncfError } = await supabase.rpc("get_next_ncf", {
      p_tenant_id: profile.tenant_id,
      p_ncf_type: ncfType,
    });

    if (ncfError) return { success: false, error: ncfError.message };
    */
    const ncf = "RECIBO-GENERICO"; // Fallback para MVP Lite

    // 3. Crear Factura
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        customer_id: customerId || null,
        customer_name: customerName || "Consumidor Final",
        // customer_rnc: customerRnc || null,
        // customer_phone: customerPhone || null,
        // ncf_type: ncfType,
        // ncf: ncf,
        total: total,
        status: paymentMethod === "cash" ? "paid" : "pending",
      })
      .select()
      .single();

    if (invoiceError)
      return {
        success: false,
        error: `Error factura: ${invoiceError.message}`,
      };

    // 4. Descontar Inventario Seguro
    for (const item of cart) {
      const { data: success, error: stockError } = await supabase.rpc(
        "decrement_stock_safe",
        { p_product_id: item.id, p_qty: item.cartQuantity },
      );

      if (!success || stockError) {
        await supabase
          .from("invoices")
          .update({ status: "cancelled" })
          .eq("id", invoice.id);
        return {
          success: false,
          error: `Stock insuficiente para ${item.name}. Venta cancelada.`,
        };
      }
    }

    // 5. Generar Detalle de Factura
    const invoiceItems = cart.map((item) => ({
      tenant_id: profile.tenant_id,
      invoice_id: invoice.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.cartQuantity,
      unit_price: item.price,
      total: item.price * item.cartQuantity,
    }));
    await supabase.from("invoice_items").insert(invoiceItems);

    // 6. Si es A CRÉDITO, requerir cliente e incrementar deuda
    if (paymentMethod === "credit") {
      if (!customerId) {
        // Cancelar factura si no hay cliente (Rollback manual simple)
        await supabase.from("invoices").delete().eq("id", invoice.id);
        return { success: false, error: "Ventas a crédito requieren un cliente registrado." };
      }

      // Incrementar deuda del cliente vía RPC
      await supabase.rpc('increment_customer_debt', { 
        p_customer_id: customerId, 
        p_amount: total 
      });

      const { error: debtError } = await supabase.from("debts").insert({
        tenant_id: profile.tenant_id,
        customer_id: customerId,
        invoice_id: invoice.id,
        total_amount: total,
        balance: total,
        status: "open",
      });

      if (debtError) console.error("Error creando deuda:", debtError.message);
    }

    // 7. Auditoría Final (Log de Actividad)
    await supabase.from("activity_logs").insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: "sale",
      description: `Venta ${paymentMethod === "cash" ? "al contado" : "a crédito"} - NCF ${ncf}`,
      metadata: { invoice_id: invoice.id, total, ncf },
    });

    // ------------------------------------------------------------------
    // FASE 4: WHATSAPP AUTOMÁTICO (FIRE AND FORGET)
    // ------------------------------------------------------------------
    // No usamos await aquí para no bloquear la pantalla del cajero.
    // El servidor lo procesa en segundo plano.
    if (customerPhone) {
      sendAutomaticWhatsapp(invoice.id, customerPhone, profile.tenant_id).catch(
        (err) => console.error("Fallo envío background WS:", err),
      );
    }

    // Revalidar Caché
    revalidatePath("/overview");
    revalidatePath("/debts");
    revalidatePath("/invoices");

    return { success: true, data: invoice };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error procesando la venta",
    };
  }
}

// ------------------------------------------------------------------
// ACCIÓN: LOG DE WHATSAPP MANUAL (BOTÓN UI)
// ------------------------------------------------------------------
export async function logManualWhatsappShare(
  invoiceId: string,
): Promise<PosActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("Tenant no encontrado");

    await supabase.from("notifications_log").insert({
      tenant_id: profile.tenant_id,
      invoice_id: invoiceId,
      type: "whatsapp_manual",
      status: "sent_manual",
    });

    return { success: true, data: "Log registrado exitosamente" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// ACCIÓN: ENVÍO AUTOMÁTICO META CLOUD API (BACKGROUND)
// ------------------------------------------------------------------
async function sendAutomaticWhatsapp(
  invoiceId: string,
  customerPhone: string,
  tenantId: string,
) {
  try {
    // Usamos el cliente del servidor para tareas en background
    const supabase = await createClient();

    // 1. Buscar configuración del negocio
    const { data: tenant } = await supabase
      .from("tenants")
      .select(
        "whatsapp_auto_send, whatsapp_meta_token, whatsapp_phone_id, name",
      )
      .eq("id", tenantId)
      .single();

    // Si el negocio no activó el toggle automático, cancelamos silenciosamente
    if (!tenant?.whatsapp_auto_send) return;

    // 2. Definir Credenciales (Fallback a las genéricas de Beral si el cliente no tiene propias)
    const BERAL_DEFAULT_TOKEN = process.env.BERAL_META_TOKEN;
    const BERAL_DEFAULT_PHONE_ID = process.env.BERAL_META_PHONE_ID;

    const token = tenant.whatsapp_meta_token || BERAL_DEFAULT_TOKEN;
    const phoneId = tenant.whatsapp_phone_id || BERAL_DEFAULT_PHONE_ID;

    if (!token || !phoneId) {
      console.warn(
        `No hay tokens de WS configurados para el tenant ${tenantId}`,
      );
      return;
    }

    // 3. Llamada a la API Oficial de Meta (Plantilla)
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: customerPhone.replace(/\D/g, ""), // Asegurar formato limpio sin guiones
        type: "template",
        template: {
          name: "beral_invoice_delivery", // IMPORTANTE: Este nombre debe coincidir con tu plantilla aprobada en Meta
          language: { code: "es_LA" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: tenant.name }, // Variable {{1}}: Nombre del negocio
                { type: "text", text: `https://beral.do/view/${invoiceId}` }, // Variable {{2}}: Link
              ],
            },
          ],
        },
      }),
    });

    const result = await response.json();

    // 4. Log de Auditoría de la API
    await supabase.from("notifications_log").insert({
      tenant_id: tenantId,
      invoice_id: invoiceId,
      type: "whatsapp_api",
      status: response.ok
        ? "success"
        : `failed: ${result.error?.message || "Error desconocido"}`,
    });
  } catch (error) {
    console.error("Excepción en sendAutomaticWhatsapp:", error);
  }
}

export async function searchCustomerByPhone(phone: string) {
  if (!phone || phone.length < 10) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return null;

  // Busca al cliente estrictamente en SU tienda
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, city")
    .eq("tenant_id", profile.tenant_id)
    .eq("phone", phone)
    .single();

  return customer;
}
