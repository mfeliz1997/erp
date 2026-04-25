"use server";

import { createClient } from "@/lib/supabase";
import type {
  CustomerActionResult,
  CustomerSearchResult,
  QuickCustomerResult,
} from "@/types/customer";

// ── Helper: escribe un log de auditoría sin lanzar excepción ─────────────────

async function writeActivityLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    tenant_id: string;
    user_id: string;
    action: string;
    description: string;
    metadata: Record<string, unknown>;
  },
) {
  await supabase.from("activity_logs").insert({
    tenant_id: params.tenant_id,
    user_id: params.user_id,
    action: params.action,
    description: params.description,
    metadata: params.metadata,
  });
}

// ── Búsqueda inteligente: nombre, teléfono o RNC ──────────────────────────────

export async function searchCustomerAction(
  query: string,
): Promise<CustomerActionResult> {
  const q = query.trim();
  if (q.length < 2) return { success: true, data: [] };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id)
      return { success: false, error: "Tenant no encontrado" };

    const tenantId = profile.tenant_id;

    const isRncQuery    = /^\d{9}$/.test(q.replace(/-/g, ""));
    const isCedulaQuery = /^\d{11}$/.test(q.replace(/-/g, ""));
    const isFiscalId    = isRncQuery || isCedulaQuery;
    const normalizedFiscal = q.replace(/-/g, "");

    const { data: tenantCustomers, error: searchError } = await supabase
      .from("customers")
      .select("id, name, phone, rnc:tax_id, credit_limit, current_debt, price_tier, ncf_type")
      .eq("tenant_id", tenantId)
      .or(
        `name.ilike.%${q}%,phone.ilike.%${q}%,tax_id.ilike.%${normalizedFiscal}%`,
      )
      .order("name")
      .limit(8);

    if (searchError) return { success: false, error: searchError.message };

    const results: CustomerSearchResult[] = (tenantCustomers ?? []).map(
      (c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        rnc: c.rnc ?? null,
        credit_limit: c.credit_limit ?? 0,
        current_debt: c.current_debt ?? 0,
        price_tier: c.price_tier ?? 'retail',
        ncf_type: c.ncf_type ?? null,
      }),
    );

    if (isFiscalId && results.length === 0) {
      const { data: dgiiRow } = await supabase
        .from("dgii_taxpayers")
        .select("rnc, company_name")
        .eq("rnc", normalizedFiscal)
        .maybeSingle();

      if (dgiiRow) {
        results.push({
          id: `dgii-${dgiiRow.rnc}`,
          name: dgiiRow.company_name,
          phone: null,
          rnc: dgiiRow.rnc,
          credit_limit: 0,
          current_debt: 0,
          is_new_from_dgii: true,
        });
      }
    }

    return { success: true, data: results };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: msg };
  }
}

// ── Validar PIN de admin + escribir log de auditoría ─────────────────────────

export type PinActionResult =
  | { success: true; authorizer_id: string; authorizer_name: string }
  | { success: false; error: string };

export async function validateAdminPinAction(
  pin: string,
  context?: { action: string; amount?: number; customer_id?: string },
): Promise<PinActionResult> {
  if (!pin || pin.length < 4) return { success: false, error: "PIN inválido" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id)
      return { success: false, error: "Tenant no encontrado" };

    const { data: authorizer } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("tenant_id", profile.tenant_id)
      .eq("pin_code", pin)
      .in("role", ["admin", "manager"])
      .maybeSingle();

    if (!authorizer)
      return { success: false, error: "PIN incorrecto o sin permisos" };

    // Log: quién autorizó, quién pidió, qué acción, cuándo
    await writeActivityLog(supabase, {
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: "pin_authorization",
      description: `${authorizer.full_name ?? "Supervisor"} autorizó acción "${context?.action ?? "override"}" solicitada por ${profile.full_name ?? "cajero"}`,
      metadata: {
        requested_by: user.id,
        authorized_by: authorizer.id,
        authorized_by_name: authorizer.full_name,
        action: context?.action,
        amount: context?.amount,
        customer_id: context?.customer_id,
        pin_used: true,
      },
    });

    return {
      success: true,
      authorizer_id: authorizer.id,
      authorizer_name: authorizer.full_name ?? "Supervisor",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: msg };
  }
}

// ── Registrar cliente de la DGII en el tenant (silencioso) ───────────────────

export async function createCustomerFromDgiiAction(params: {
  name: string;
  rnc: string;
}): Promise<QuickCustomerResult> {
  if (!params.name || !params.rnc)
    return { success: false, error: "Nombre y RNC son requeridos" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id)
      return { success: false, error: "Tenant no encontrado" };

    // Verificar si ya existe (puede haberse creado en otra sesión)
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name, phone, tax_id, credit_limit, current_debt, price_tier, ncf_type")
      .eq("tenant_id", profile.tenant_id)
      .eq("tax_id", params.rnc)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        data: {
          id: existing.id,
          name: existing.name,
          phone: existing.phone ?? null,
          rnc: existing.tax_id ?? null,
          credit_limit: existing.credit_limit ?? 0,
          current_debt: existing.current_debt ?? 0,
          price_tier: existing.price_tier ?? 'retail',
          ncf_type: existing.ncf_type ?? null,
        },
      };
    }

    const { data: created, error: insertError } = await supabase
      .from("customers")
      .insert({
        tenant_id: profile.tenant_id,
        name: params.name.trim(),
        phone: null,
        tax_id: params.rnc,
        credit_limit: 0,
        current_debt: 0,
      })
      .select("id, name, phone, tax_id, credit_limit, current_debt, price_tier, ncf_type")
      .single();

    if (insertError) return { success: false, error: insertError.message };

    await writeActivityLog(supabase, {
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: "customer_created",
      description: `${profile.full_name ?? "Usuario"} agregó cliente de DGII "${created.name}" (RNC: ${params.rnc})`,
      metadata: {
        customer_id: created.id,
        customer_name: created.name,
        rnc: params.rnc,
        source: "dgii_lookup",
      },
    });

    return {
      success: true,
      data: {
        id: created.id,
        name: created.name,
        phone: created.phone ?? null,
        rnc: created.tax_id ?? null,
        credit_limit: created.credit_limit ?? 0,
        current_debt: created.current_debt ?? 0,
        price_tier: created.price_tier ?? 'retail',
        ncf_type: created.ncf_type ?? null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: msg };
  }
}

// ── Creación rápida de cliente desde el POS ───────────────────────────────────

export async function createQuickCustomerAction(
  inputValue: string,
): Promise<QuickCustomerResult> {
  const raw = inputValue.trim();
  if (!raw) return { success: false, error: "El valor no puede estar vacío" };
  if (raw.length > 120) return { success: false, error: "Texto demasiado largo" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id)
      return { success: false, error: "Tenant no encontrado" };

    const digitsOnly = raw.replace(/\D/g, "");
    const isPhone =
      /^\d+$/.test(raw) &&
      digitsOnly.length >= 10 &&
      digitsOnly.length <= 11;

    const insertPayload = isPhone
      ? { name: `Cliente ${digitsOnly}`, phone: digitsOnly, tax_id: null as string | null }
      : { name: raw, phone: null as string | null, tax_id: null as string | null };

    const { data: created, error: insertError } = await supabase
      .from("customers")
      .insert({
        tenant_id: profile.tenant_id,
        ...insertPayload,
        credit_limit: 0,
        current_debt: 0,
      })
      .select("id, name, phone, tax_id, credit_limit, current_debt, price_tier, ncf_type")
      .single();

    if (insertError) {
      if (insertError.code === "23505")
        return { success: false, error: "Ya existe un cliente con ese teléfono" };
      return { success: false, error: insertError.message };
    }

    // Log de auditoría
    await writeActivityLog(supabase, {
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: "customer_created",
      description: `${profile.full_name ?? "Usuario"} creó cliente rápido "${created.name}" desde el POS`,
      metadata: {
        customer_id: created.id,
        customer_name: created.name,
        customer_phone: created.phone,
        source: "pos_quick_create",
      },
    });

    const result: CustomerSearchResult = {
      id: created.id,
      name: created.name,
      phone: created.phone ?? null,
      rnc: created.tax_id ?? null,
      credit_limit: created.credit_limit ?? 0,
      current_debt: created.current_debt ?? 0,
      price_tier: created.price_tier ?? 'retail',
      ncf_type: created.ncf_type ?? null,
    };

    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: msg };
  }
}
