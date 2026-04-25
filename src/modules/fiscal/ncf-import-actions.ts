"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type NcfImportActionState = {
  success: boolean;
  error?: string;
  count?: number;
};

export type NcfExportRow = {
  ncf_number: string;
  ncf_type: string;
  customer_name: string;
  customer_rnc: string | null;
  total: number;
  used_at: string;
};

// Tipos NCF válidos según la DGII RD
const VALID_NCF_TYPES = new Set(["B01", "B02", "B03", "B04", "B11", "B12", "B13", "B14", "B15", "B16"]);

// Formato esperado por fila del CSV de importación de comprobantes
export interface NcfImportRow {
  type: string;       // B01, B02, etc.
  prefix: string;     // Ej: B01000000
  current: string;    // número inicial
  max: string;        // límite máximo
  expiry?: string;    // fecha vencimiento YYYY-MM-DD opcional
}

function validateNcfRow(row: NcfImportRow, index: number): string | null {
  if (!VALID_NCF_TYPES.has(row.type?.trim?.()))
    return `Fila ${index + 1}: tipo "${row.type}" no es un NCF válido (B01-B16)`;
  if (!row.prefix?.trim())
    return `Fila ${index + 1}: el prefijo es obligatorio`;
  if (isNaN(parseInt(row.current)) || parseInt(row.current) < 0)
    return `Fila ${index + 1}: número actual inválido`;
  if (isNaN(parseInt(row.max)) || parseInt(row.max) <= 0)
    return `Fila ${index + 1}: límite máximo inválido`;
  if (parseInt(row.current) > parseInt(row.max))
    return `Fila ${index + 1}: el número actual no puede superar el límite`;
  if (row.expiry && isNaN(Date.parse(row.expiry)))
    return `Fila ${index + 1}: fecha de vencimiento inválida (use YYYY-MM-DD)`;
  return null;
}

export async function importNcfSequencesAction(
  rows: NcfImportRow[],
): Promise<NcfImportActionState> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return { success: false, error: "Negocio no encontrado" };
    if (profile.role !== "admin")
      return { success: false, error: "Solo los administradores pueden importar comprobantes" };

    if (!rows || rows.length === 0)
      return { success: false, error: "El archivo está vacío" };

    // Validar todas las filas antes de insertar
    for (let i = 0; i < rows.length; i++) {
      const err = validateNcfRow(rows[i], i);
      if (err) return { success: false, error: err };
    }

    const records = rows.map((r) => ({
      tenant_id: profile.tenant_id,
      type: r.type.trim().toUpperCase(),
      prefix: r.prefix.trim(),
      current_sequence: parseInt(r.current),
      max_limit: parseInt(r.max),
      valid_until: r.expiry?.trim() || null,
      is_active: true,
    }));

    const { error } = await supabase
      .from("ncf_sequences")
      .upsert(records, { onConflict: "tenant_id, type" });

    if (error) return { success: false, error: error.message };

    revalidatePath("/fiscal");
    return { success: true, count: records.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getNcfUsedSequencesAction(params?: {
  from?: string;
  to?: string;
  type?: string;
}): Promise<{ success: boolean; data?: NcfExportRow[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    let query = supabase
      .from("ncf_used_sequences")
      .select("ncf_number, ncf_type, customer_name, customer_rnc, total, used_at")
      .order("used_at", { ascending: true });

    if (params?.from) query = query.gte("used_at", params.from);
    if (params?.to)   query = query.lte("used_at", params.to);
    if (params?.type) query = query.eq("ncf_type", params.type);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []) as NcfExportRow[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
