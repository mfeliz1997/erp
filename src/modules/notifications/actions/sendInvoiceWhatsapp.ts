"use server";

import { createClient } from "@/lib/supabase";
import { z } from "zod";

// Esquema de validación para escalabilidad
const messageSchema = z.object({
  tenantId: z.string().uuid(),
  phoneNumber: z.string().min(10), // Formato 1809XXXXXXX
  customerName: z.string(),
  invoiceId: z.string(),
  pdfUrl: z.string().url(),
});

export async function sendInvoiceWhatsapp(
  formData: z.infer<typeof messageSchema>,
) {
  const supabase = await createClient();

  // 1. Validar datos
  const validation = messageSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: "Datos de envío inválidos." };
  }

  // 2. Crear el registro inicial en el Log (Estado PENDING)
  const { data: logEntry, error: logError } = await supabase
    .from("notifications_log")
    .insert({
      tenant_id: validation.data.tenantId,
      phone_number: validation.data.phoneNumber,
      notification_type: "INVOICE_WHATSAPP",
      status: "PENDING",
    })
    .select()
    .single();

  if (logError)
    return { success: false, error: "Error al registrar auditoría." };

  try {
    // 3. Llamada a Meta API (WhatsApp Business)
    // NOTA: Estas variables deben estar en tu .env
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: validation.data.phoneNumber,
          type: "template",
          template: {
            name: "invoice_confirmation", // Template aprobado en Meta
            language: { code: "es" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: validation.data.customerName },
                  { type: "text", text: validation.data.invoiceId },
                ],
              },
              {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      link: validation.data.pdfUrl,
                      filename: `Factura_${validation.data.invoiceId}.pdf`,
                    },
                  },
                ],
              },
            ],
          },
        }),
      },
    );

    const metaResult = await response.json();

    if (!response.ok) throw new Error(JSON.stringify(metaResult));

    // 4. Actualizar Log a SENT
    await supabase
      .from("notifications_log")
      .update({
        status: "SENT",
        meta_message_id: metaResult.messages[0].id,
      })
      .eq("id", logEntry.id);

    return { success: true, data: metaResult.messages[0].id };
  } catch (error: any) {
    // 5. Registrar fallo para soporte técnico
    await supabase
      .from("notifications_log")
      .update({
        status: "FAILED",
        error_details: error.message,
      })
      .eq("id", logEntry.id);

    return { success: false, error: "Error en la conexión con WhatsApp." };
  }
}
