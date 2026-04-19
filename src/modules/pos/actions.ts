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
export async function validateAdminPin(pin: string): Promise<PosActionState> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return { success: false, error: "Tenant no encontrado" };

    const { data: tenant } = await supabase
      .from("tenants")
      .select("admin_pin")
      .eq("id", profile.tenant_id)
      .single();

    if (tenant?.admin_pin === pin) {
      return { success: true };
    }

    return { success: false, error: "PIN de administrador incorrecto" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processSaleAction(
  cart: CartItem[],
  total: number,
  customerName: string,
  customerRnc: string,
  customerPhone: string,
  ncfType: "B01" | "B02",
  paymentMethod: "cash" | "credit" | "transfer" | "card",
  customerId?: string,
  receivedAmount?: number,
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
      .select("tenant_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id)
      return { success: false, error: "Perfil sin negocio asignado" };

    // 1. Validar regla DGII
    if (ncfType === "B01" && !customerRnc) {
      return {
        success: false,
        error: "El Crédito Fiscal (B01) exige el RNC del cliente obligatoriamente.",
      };
    }

    // 2. Obtener NCF Atómico (Motor Fiscal)
    let ncf = "RECIBO-INTERNO";
    if (ncfType) {
        const { data: nextNcf, error: ncfError } = await supabase.rpc("generate_next_ncf", {
          p_tenant_id: profile.tenant_id,
          p_type: ncfType,
        });
        
        if (ncfError) {
            console.error("Error generating NCF:", ncfError);
            // Fallback or handle error
        } else if (nextNcf) {
            ncf = nextNcf;
        }
    }

    // 3. Crear Factura
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        customer_id: customerId || null,
        customer_name: customerName || "Consumidor Final",
        customer_rnc: customerRnc || null,
        customer_phone: customerPhone || null,
        ncf_type: ncfType,
        ncf: ncf,
        total: total,
        payment_method: paymentMethod,
        received_amount: receivedAmount || total,
        status: paymentMethod === "credit" ? "pending" : "paid",
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
        // En este flujo avanzado, podríamos crear un cliente al vuelo o requerir selección previa
      }

      const { error: debtError } = await supabase.from("debts").insert({
        tenant_id: profile.tenant_id,
        customer_id: customerId || null,
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
      description: `Usuario ${profile.full_name || 'Sistema'} realizó venta #${invoice.id.split('-')[0].toUpperCase()} por RD$${total.toLocaleString()}`,
      metadata: { invoice_id: invoice.id, total, ncf, method: paymentMethod },
    });

    // ------------------------------------------------------------------
    // FASE 4: WHATSAPP AUTOMÁTICO
    // ------------------------------------------------------------------
    if (customerPhone) {
      sendAutomaticWhatsapp(invoice.id, customerPhone, profile.tenant_id).catch(
        (err) => console.error("Fallo envío background WS:", err),
      );
    }

    // Revalidar Caché (Rutas solicitadas)
    revalidatePath("/pos");
    revalidatePath("/cash-register");
    revalidatePath("/inventory");
    revalidatePath("/invoices");
    revalidatePath("/activity");
    if (paymentMethod === "credit") {
      revalidatePath("/accounts-receivable");
      revalidatePath("/debts");
    }

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

    // 2. Definir Credenciales (Fallback a las genéricas de Invenza si el cliente no tiene propias)
    const INVENZA_DEFAULT_TOKEN = process.env.INVENZA_META_TOKEN;
    const INVENZA_DEFAULT_PHONE_ID = process.env.INVENZA_META_PHONE_ID;

    const token = tenant.whatsapp_meta_token || INVENZA_DEFAULT_TOKEN;
    const phoneId = tenant.whatsapp_phone_id || INVENZA_DEFAULT_PHONE_ID;

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
          name: "invenza_invoice_delivery", // IMPORTANTE: Este nombre debe coincidir con tu plantilla aprobada en Meta
          language: { code: "es_LA" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: tenant.name }, // Variable {{1}}: Nombre del negocio
                { type: "text", text: `https://invenza.do/view/${invoiceId}` }, // Variable {{2}}: Link
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
