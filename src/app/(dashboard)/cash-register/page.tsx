import { createClient } from "@/lib/supabase";
import { CloseShiftForm } from "./components/CloseShiftForm";
import { ShiftHistoryTable } from "./components/ShiftHistoryTable";
import { OpenShiftDialog } from "./components/OpenShiftDialog";
import { getOpenShiftSummary } from "@/modules/pos/actions/cash-actions";
import { redirect } from "next/navigation";
import {
  Wallet, TrendingUp, MonitorSmartphone, History, Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function CashRegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role, assigned_register_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Perfil no encontrado.</div>;
  }

  const isAdmin = profile.role === 'admin';

  // ── Recent closed shifts ──────────────────────────────────────────────────
  const { data: recentShifts } = await supabase
    .from("cash_shifts")
    .select(`
      id, opening_amount, closing_amount, expected_amount,
      amount_difference, has_discrepancy, payment_breakdown,
      status, opened_at, closed_at,
      profiles!cash_shifts_user_id_profiles_fkey(full_name),
      cash_registers!cash_shifts_register_id_fkey(name)
    `)
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: false })
    .limit(10);

  const processedRecentShifts = recentShifts ?? [];

  // ── Current user's open shift ─────────────────────────────────────────────
  const { data: myOpenShift } = await supabase
    .from("cash_shifts")
    .select("*, cash_registers!cash_shifts_register_id_fkey(name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("user_id", user.id)
    .eq("status", "OPEN")
    .single();

  // ── Admin-only: all open shifts + today's sales ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allOpenShifts: any[] = [];
  let stats = { totalOpening: 0, totalSales: 0 };

  if (isAdmin) {
    const { data: openShifts } = await supabase
      .from("cash_shifts")
      .select("*, profiles!cash_shifts_user_id_profiles_fkey(full_name), cash_registers!cash_shifts_register_id_fkey(name)")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "OPEN");

    allOpenShifts = openShifts ?? [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todaySales } = await supabase
      .from("invoices")
      .select("total")
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", today.toISOString());

    stats.totalSales = todaySales?.reduce((acc, inv) => acc + (inv.total || 0), 0) ?? 0;
    stats.totalOpening = allOpenShifts.reduce(
      (acc, s: { opening_amount?: number }) => acc + (s.opening_amount ?? 0), 0
    );
  }

  // ── Registers for opening form ────────────────────────────────────────────
  const { data: allRegisters } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true);

  const assignedId = profile.assigned_register_id;
  const registers = assignedId
    ? (allRegisters ?? []).filter((r: { id: string }) => r.id === assignedId)
    : (allRegisters ?? []);

  // ── Derived flags ─────────────────────────────────────────────────────────
  const noRegisters = !allRegisters || allRegisters.length === 0;
  const assignedUnavailable = !!assignedId && registers.length === 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Caja Registradora</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control de turnos y apertura de caja</p>
        </div>
      </div>

      {/* ── Hero Metrics (Admin only) ─────────────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Base en Cajas */}
          <Card className="bg-background shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Base en Cajas
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                RD$ {stats.totalOpening.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Capital inicial en tránsito</p>
            </CardContent>
          </Card>

          {/* Card 2: Ventas Hoy */}
          <Card className="bg-background shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ventas Hoy
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                RD$ {stats.totalSales.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Ventas brutas acumuladas</p>
            </CardContent>
          </Card>

          {/* Card 3: Terminales Abiertas */}
          <Card className="bg-background shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Terminales Abiertas
              </CardTitle>
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                {allOpenShifts.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Cajeros operando ahora</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Main section ─────────────────────────────────────────────────── */}
      <section>
        {/* No registers configured */}
        {noRegisters && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 border border-dashed border-border rounded-xl bg-muted/20 text-center">
            <Monitor className="w-10 h-10 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No hay terminales</p>
              <p className="text-sm text-muted-foreground">Configure cajas en Ajustes › Cajas</p>
            </div>
          </div>
        )}

        {/* Assigned register unavailable */}
        {!noRegisters && assignedUnavailable && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 border border-dashed border-border rounded-xl bg-muted/20 text-center">
            <Monitor className="w-10 h-10 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Caja asignada no disponible</p>
              <p className="text-sm text-muted-foreground">Contacta a tu administrador.</p>
            </div>
          </div>
        )}

        {/* Active shift — close form */}
        {!noRegisters && !assignedUnavailable && myOpenShift && (
          <ActiveShiftSection myOpenShift={myOpenShift} isAdmin={isAdmin} />
        )}

        {/* No open shift — Admin panel view */}
        {!noRegisters && !assignedUnavailable && !myOpenShift && isAdmin && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Panel de Control de Cajas</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {allOpenShifts.length > 0
                    ? `${allOpenShifts.length} caja${allOpenShifts.length > 1 ? 's' : ''} activa${allOpenShifts.length > 1 ? 's' : ''}`
                    : 'No hay turnos abiertos en este momento'}
                </p>
              </div>
              <OpenShiftDialog
                registers={registers}
                fixedRegister={!!assignedId}
                trigger={
                  <Button variant="outline" size="sm" className="gap-2">
                    <MonitorSmartphone className="w-4 h-4" />
                    Abrir mi turno
                  </Button>
                }
              />
            </div>

            {allOpenShifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 border border-dashed border-border rounded-xl bg-muted/20 text-center">
                <MonitorSmartphone className="w-10 h-10 text-muted-foreground/50" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">No hay turnos abiertos en este momento</p>
                  <p className="text-sm text-muted-foreground">Los cajeros pueden iniciar su turno desde sus terminales.</p>
                </div>
                <OpenShiftDialog registers={registers} fixedRegister={!!assignedId} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allOpenShifts.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 border border-border bg-background rounded-xl shadow-sm flex justify-between items-center gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.cash_registers?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.profiles?.full_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px] mb-1">Abierta</Badge>
                      <p className="text-xs font-semibold tabular-nums text-foreground">
                        RD$ {(s.opening_amount ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No open shift — POS cashier empty state */}
        {!noRegisters && !assignedUnavailable && !myOpenShift && !isAdmin && (
          <div className="flex flex-col items-center justify-center gap-5 py-20 border border-dashed border-border rounded-xl bg-muted/20 text-center">
            <MonitorSmartphone className="w-12 h-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">No hay turnos abiertos en este momento</p>
              <p className="text-sm text-muted-foreground">Inicia un turno para comenzar a registrar ventas.</p>
            </div>
            <OpenShiftDialog registers={registers} fixedRegister={!!assignedId} />
          </div>
        )}
      </section>

      {/* ── Recent closed shifts ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Cierres Recientes</h2>
        </div>
        <ShiftHistoryTable shifts={processedRecentShifts} isAdmin={isAdmin} />
      </section>

    </div>
  );
}

// ── Sub-component: active shift (needs async for getOpenShiftSummary) ────────
async function ActiveShiftSection({
  myOpenShift,
  isAdmin,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  myOpenShift: any;
  isAdmin: boolean;
}) {
  const summary = await getOpenShiftSummary(myOpenShift.id);

  if (!summary) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Error cargando datos del turno.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Turno Activo</h1>
          <Badge variant="outline" className="text-[10px] mt-1">En sesión</Badge>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          Caja: {myOpenShift.cash_registers?.name}
        </p>
      </div>
      <CloseShiftForm shift={myOpenShift} summary={summary} isAdmin={isAdmin} />
    </div>
  );
}
