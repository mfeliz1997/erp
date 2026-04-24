
import { createClient } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";
import { ActivityLogClient } from "./ActivityLogClient";

export default async function ActivityLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-red-900">Acceso Denegado</h2>
        <p className="max-w-xs text-red-700/60 font-medium text-sm">
          Solo los administradores tienen permiso para visualizar el historial de auditoría del sistema.
        </p>
      </div>
    );
  }

  // JOIN usando el alias explícito con la FK correcta hacia profiles
  // Ahora que existe activity_logs_user_id_profiles_fkey, PostgREST puede resolverlo
  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select("id, action, description, metadata, created_at, profiles:user_id(full_name)")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[ActivityLog] Query error:", error.message);
  }

  // Supabase devuelve profiles como array cuando hay múltiples FKs; normalizamos a objeto
  type RawLog = NonNullable<typeof logs>[number];
  const normalizedLogs = (logs ?? []).map((log: RawLog) => ({
    ...log,
    profiles: Array.isArray(log.profiles) ? (log.profiles[0] ?? null) : log.profiles,
  }));

  return (
    <ActivityLogClient
      initialLogs={normalizedLogs}
      tenantId={profile.tenant_id!}
    />
  );
}
