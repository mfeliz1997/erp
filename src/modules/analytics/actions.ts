import { createClient } from "@/lib/supabase";

export async function getDashboardStats() {
  const supabase = await createClient();

  // 1. Ventas de hoy
  const { data: salesToday } = await supabase.rpc("get_daily_sales"); // O un simple query con filter de fecha

  // 2. Total por cobrar (Cuentas por Cobrar)
  const { data: totalPending } = await supabase
    .from("debts")
    .select("balance")
    .eq("status", "open");

  const totalCxC =
    totalPending?.reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;

  // 3. Últimas 5 actividades (Logs)
  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  return { salesToday, totalCxC, recentActivity };
}
