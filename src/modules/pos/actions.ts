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

export interface ProcessSaleInput {
  cart: CartItem[];
  total: number;
  subtotal?: number;
  customerName: string;
  customerRnc: string;
  customerPhone: string;
  ncfType: "B01" | "none";
  paymentMethod: "cash" | "credit" | "transfer" | "card";
  customerId?: string;
  receivedAmount?: number;
  creditDays?: number;
  authPin?: string;
  userRole?: string;
  creditAuthorizerId?: string;
  newCreditLimit?: number;
  priceTier?: string;
  discountId?: string;
  discountName?: string;
  discountAmount?: number;
}

const REQUIRES_PIN_ROLES = ["pos"];
const REQUIRES_PIN_METHODS = ["credit", "transfer", "card"];

export async function processSaleAction(
  input: ProcessSaleInput,
): Promise<PosActionState> {
  const {
    cart, total, customerName, customerRnc, customerPhone,
    ncfType, paymentMethod, receivedAmount,
    authPin, userRole, creditAuthorizerId,
  } = input;

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Usuario no autenticado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id)
      return { success: false, error: "Perfil sin negocio asignado" };

    // 1. Validar PIN para cajeros en métodos no-efectivo
    const effectiveRole = userRole || profile.role;
    if (
      REQUIRES_PIN_ROLES.includes(effectiveRole) &&
      REQUIRES_PIN_METHODS.includes(paymentMethod)
    ) {
      if (!authPin) {
        return { success: false, error: "Se requiere PIN de autorización." };
      }
      const { data: authorizer } = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("pin_code", authPin)
        .in("role", ["manager", "admin"])
        .maybeSingle();

      if (!authorizer) {
        return { success: false, error: "PIN incorrecto o sin permisos de autorización." };
      }
    }

    // 2. Validar regla DGII — B01 exige RNC; 'none' es recibo interno (sin secuencia)
    if (ncfType === "B01" && !customerRnc) {
      return {
        success: false,
        error: "El Crédito Fiscal (B01) exige el RNC del cliente obligatoriamente.",
      };
    }

    // 3. Descontar Inventario Seguro (Early Return con Rollback manual)
    const successfulDeductions: { id: string; qty: number }[] = [];
    for (const item of cart) {
      const { data: success, error: stockError } = await supabase.rpc(
        "decrement_stock_safe",
        { p_product_id: item.id, p_qty: item.cartQuantity },
      );

      if (!success || stockError) {
        // Rollback previous stock deductions
        for (const ded of successfulDeductions) {
          await supabase.rpc("decrement_stock_safe", {
            p_product_id: ded.id,
            p_qty: -ded.qty,
          });
        }
        return {
          success: false,
          error: `Stock insuficiente para ${item.name}. Venta cancelada.`,
        };
      }
      successfulDeductions.push({ id: item.id, qty: item.cartQuantity });
    }

    // Helper for rolling back stock on fatal errors
    const rollbackStock = async () => {
      for (const ded of successfulDeductions) {
        await supabase.rpc("decrement_stock_safe", {
          p_product_id: ded.id,
          p_qty: -ded.qty,
        });
      }
    };

    // 4. Upsert del cliente por teléfono (y aplicar nuevo límite de crédito si aplica)
    let resolvedCustomerId = input.customerId;
    const canSetCredit = effectiveRole === "admin" || effectiveRole === "manager";
    const updatePayload: any = {
      ...(customerName && { name: customerName }),
      ...(customerRnc && { tax_id: customerRnc }),
    };
    if (canSetCredit && input.newCreditLimit !== undefined) {
      updatePayload.credit_limit = input.newCreditLimit;
    }

    if (customerPhone) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("phone", customerPhone)
        .maybeSingle();

      if (existing) {
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from("customers").update(updatePayload).eq("id", existing.id);
        }
        resolvedCustomerId = existing.id;
      } else if (customerName) {
        const { data: created } = await supabase
          .from("customers")
          .insert({
            tenant_id: profile.tenant_id,
            name: customerName.trim(),
            phone: customerPhone,
            tax_id: customerRnc || null,
            ...(canSetCredit && input.newCreditLimit !== undefined ? { credit_limit: input.newCreditLimit } : {}),
          })
          .select("id")
          .single();
        if (created) resolvedCustomerId = created.id;
      }
    }

    // 5. Obtener NCF Atómico — solo si es B01 (comprobante fiscal real)
    let ncf = "RECIBO-INTERNO";
    let usedSequenceNum: number | null = null;
    if (ncfType && ncfType !== "none") {
      let attempts = 0;
      let ncfGenerated = false;
      while (attempts < 5) {
        const { data: seq } = await supabase
          .from("ncf_sequences")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .eq("type", ncfType)
          .eq("is_active", true)
          .maybeSingle();

        if (!seq) {
          await rollbackStock();
          return { success: false, error: `No hay secuencia NCF activa para ${ncfType}` };
        }

        if (seq.current_sequence >= seq.max_limit) {
          await rollbackStock();
          return { success: false, error: `Secuencia NCF agotada para ${ncfType}` };
        }

        const nextSeq = seq.current_sequence + 1;
        const { data: updated } = await supabase
          .from("ncf_sequences")
          .update({ current_sequence: nextSeq })
          .eq("id", seq.id)
          .eq("current_sequence", seq.current_sequence)
          .select()
          .maybeSingle();

        if (updated) {
          ncf = `${seq.prefix}${String(nextSeq).padStart(8, "0")}`;
          usedSequenceNum = nextSeq;
          ncfGenerated = true;
          break;
        }
        attempts++;
      }

      if (!ncfGenerated) {
        await rollbackStock();
        return { success: false, error: "Alta concurrencia: No se pudo asignar NCF. Intente nuevamente." };
      }
    }

    // 6. Crear Factura
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        customer_id: resolvedCustomerId || null,
        customer_name: customerName || "Consumidor Final",
        customer_rnc: customerRnc || null,
        rnc_customer: customerRnc || null,
        ncf_type: ncfType,
        ncf: ncf,
        subtotal: input.subtotal ?? total,
        discount_id: input.discountId ?? null,
        discount_name: input.discountName ?? null,
        discount_amount: input.discountAmount ?? 0,
        total: total,
        payment_method: paymentMethod,
        amount_received: receivedAmount || total,
        status: paymentMethod === "credit" ? "pending" : "paid",
      })
      .select()
      .single();

    if (invoiceError) {
      await rollbackStock();
      return {
        success: false,
        error: `Error factura: ${invoiceError.message}`,
      };
    }

    // 7. Generar Detalle de Factura — unit_price already resolved by CartProvider
    const invoiceItems = cart.map((item) => ({
      tenant_id: profile.tenant_id,
      invoice_id: invoice.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.cartQuantity,
      unit_price: item.unit_price,
      total: item.unit_price * item.cartQuantity,
    }));
    await supabase.from("invoice_items").insert(invoiceItems);

    // 8. Registro de NCF usado (Auditoría Fiscal)
    if (ncf !== "RECIBO-INTERNO" && usedSequenceNum !== null) {
      await supabase.from("ncf_used_sequences").insert({
        tenant_id: profile.tenant_id,
        invoice_id: invoice.id,
        ncf_type: ncfType,
        ncf_number: ncf,
        sequence_num: usedSequenceNum,
        customer_name: customerName || "Consumidor Final",
        customer_rnc: customerRnc || null,
        total,
      });
    }

    // 9. Si es A CRÉDITO, registrar deuda y actualizar current_debt del cliente
    if (paymentMethod === "credit") {
      const { error: debtError } = await supabase.from("debts").insert({
        tenant_id: profile.tenant_id,
        invoice_id: invoice.id,
        total_amount: total,
        balance: total,
        status: "open",
      });

      if (debtError) {
        console.error("Error creando deuda:", debtError.message);
      } else if (resolvedCustomerId) {
        await supabase.rpc("increment_customer_debt", {
          p_customer_id: resolvedCustomerId,
          p_amount: total,
        });
      }
    }

    // 10. Auditoría Final (Log de Actividad)
    await supabase.from("activity_logs").insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: "sale",
      description: `${profile.full_name || 'Sistema'} realizó venta #${invoice.id.split('-')[0].toUpperCase()} por RD$${total.toLocaleString()} (${paymentMethod})${input.discountName ? ` [descuento: ${input.discountName}]` : ''}`,
      metadata: {
        invoice_id: invoice.id,
        ncf,
        total,
        method: paymentMethod,
        customer_id: resolvedCustomerId ?? null,
        customer_name: customerName || "Consumidor Final",
        ncf_type: ncfType,
        credit_authorized_by: creditAuthorizerId ?? null,
      },
    });

    // 10b. Si hubo override de crédito, log específico de autorización
    if (paymentMethod === "credit" && creditAuthorizerId) {
      await supabase.from("activity_logs").insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        action: "credit_override",
        description: `Venta a crédito #${invoice.id.split('-')[0].toUpperCase()} por RD$${total.toLocaleString()} fue autorizada (override de límite/sin crédito)`,
        metadata: {
          invoice_id: invoice.id,
          total,
          customer_id: resolvedCustomerId ?? null,
          customer_name: customerName || "Consumidor Final",
          authorized_by: creditAuthorizerId,
          requested_by: user.id,
          requested_by_name: profile.full_name,
        },
      });
    }

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
    revalidatePath("/fiscal");
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
      phone_number: "manual",
      notification_type: "INVOICE_WHATSAPP",
      status: "SENT",
      meta_message_id: invoiceId,
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
      phone_number: customerPhone,
      notification_type: "INVOICE_WHATSAPP",
      status: response.ok ? "DELIVERED" : "FAILED",
      meta_message_id: result?.messages?.[0]?.id || null,
      error_details: response.ok ? null : (result?.error?.message || "Error desconocido"),
    });
  } catch (error) {
    console.error("Excepción en sendAutomaticWhatsapp:", error);
  }
}

export async function searchCustomerByPhone(phone: string) {
  if (!phone || phone.length < 10) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return null;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, city, phone")
    .eq("tenant_id", profile.tenant_id)
    .eq("phone", phone)
    .single();

  return customer;
}

export async function createCustomerAction(params: {
  name: string;
  phone: string;
  city?: string;
}): Promise<PosActionState> {
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

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        tenant_id: profile.tenant_id,
        name: params.name.trim(),
        phone: params.phone,
        city: params.city?.trim() || null,
      })
      .select("id, name, city, phone")
      .single();

    if (error) {
      if (error.code === "23505") return { success: false, error: "Ya existe un cliente con ese teléfono" };
      return { success: false, error: error.message };
    }

    return { success: true, data: customer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
