import { createClient } from "@/lib/supabase";
import { OpenShiftForm } from "./components/OpenShiftForm";
import { CloseShiftForm } from "./components/CloseShiftForm";
import { ShiftHistoryTable } from "./components/ShiftHistoryTable";
import { redirect } from "next/navigation";
import { Monitor, Wallet, TrendingUp, History, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CashRegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Obtener perfil con ROL
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div className="p-10 text-center">Perfil no encontrado.</div>;
  }

  const isAdmin = profile.role === 'admin';

  // 2. Fetch de datos según Rol
  // Turnos recientes para el historial (Incluimos invoices para calcular monto esperado)
  const { data: recentShifts } = await supabase
    .from("cash_shifts")
    .select(`
      *,
      profiles(full_name),
      cash_registers(name),
      invoices(total)
    `)
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: false })
    .limit(10);

  // Mapeamos para calcular el monto esperado
  const processedRecentShifts = recentShifts?.map(s => ({
    ...s,
    expected_amount: (s.opening_amount || 0) + (s.invoices?.reduce((acc: number, inv: { total?: number }) => acc + (inv.total || 0), 0) || 0)
  })) || [];

  // Turno abierto del usuario actual
  const { data: myOpenShift } = await supabase
    .from("cash_shifts")
    .select("*, cash_registers(name)")
    .eq("tenant_id", profile.tenant_id)
    .eq("user_id", user.id)
    .eq("status", "OPEN")
    .single();

  // Si es ADMIN, buscamos todas las cajas abiertas y estadísticas globales
  let allOpenShifts: typeof processedRecentShifts = [];
  let stats = { totalOpening: 0, totalSales: 0 };

  if (isAdmin) {
    const { data: openShifts } = await supabase
      .from("cash_shifts")
      .select("*, profiles(full_name), cash_registers(name)")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "OPEN");
    
    allOpenShifts = openShifts || [];

    // Estadísticas del día (Ventas totales hoy)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todaySales } = await supabase
      .from("invoices")
      .select("total")
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", today.toISOString());
    
    stats.totalSales = todaySales?.reduce((acc, inv) => acc + (inv.total || 0), 0) || 0;
    stats.totalOpening = allOpenShifts.reduce((acc, s: { opening_amount?: number }) => acc + (s.opening_amount || 0), 0);
  }

  const renderStats = () => {
    if (!isAdmin) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Base en Cajas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold tabular-nums text-foreground">RD$ {stats.totalOpening.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Capital inicial en tránsito</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold tabular-nums text-foreground">RD$ {stats.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Ventas brutas acumuladas</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wide">Terminales Abiertas</CardTitle>
            <Users className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold tabular-nums">{allOpenShifts.length}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">Cajeros operando ahora</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMainSection = async () => {
    // Si es ADMIN y no tiene caja propia abierta, mostramos panel de control
    if (isAdmin && !myOpenShift) {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Panel de Control de Cajas</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Cajas Abiertas */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Cajas actualmente activas</p>
              {allOpenShifts.length === 0 ? (
                 <div className="p-8 border border-border bg-card text-center">
                    <p className="text-sm text-muted-foreground">No hay turnos abiertos en este momento</p>
                 </div>
              ) : (
                allOpenShifts.map((s) => (
                  <div key={s.id} className="p-4 border border-border bg-card flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.cash_registers.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cajero: {s.profiles.full_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px] mb-1 border-border text-muted-foreground">Abierta</Badge>
                      <p className="text-xs font-semibold tabular-nums text-foreground">RD$ {s.opening_amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Opción de abrir caja propia si se necesita */}
            <div className="p-4 border border-border bg-card">
               <p className="text-sm text-muted-foreground mb-4">Abrir mi propio turno</p>
               {await renderOpenForm()}
            </div>
          </div>
        </div>
      );
    }

    // Si tiene caja abierta (sea Admin o POS)
    if (myOpenShift) {
      const { data: shiftInvoices } = await supabase
        .from("invoices")
        .select("total")
        .eq("shift_id", myOpenShift.id);

      const totalInvoices = shiftInvoices?.reduce((acc, inv) => acc + (inv.total || 0), 0) || 0;
      const totalExpected = myOpenShift.opening_amount + totalInvoices;

      return (
        <div className="max-w-md mx-auto">
          <div className="mb-6 flex justify-between items-center">
             <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mi Turno Activo</h1>
                <Badge variant="outline" className="text-[10px] mt-1 border-border text-muted-foreground">En sesión</Badge>
             </div>
             <p className="text-xs text-muted-foreground text-right">Caja: {myOpenShift.cash_registers?.name}</p>
          </div>
          <CloseShiftForm 
            shift={myOpenShift} 
            expectedAmount={totalExpected} 
          />
        </div>
      );
    }

    // Si ningún turno está abierto y es POS
    return (
      <div className="max-w-md mx-auto">
        {await renderOpenForm()}
      </div>
    );
  };

  const renderOpenForm = async () => {
    const { data: registers } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true);

    if (!registers || registers.length === 0) {
      return (
        <div className="p-8 border border-border bg-card text-center space-y-3">
           <Monitor className="w-8 h-8 text-muted-foreground mx-auto" />
           <h2 className="text-base font-semibold text-foreground">No hay terminales</h2>
           <p className="text-sm text-muted-foreground">Configure cajas en Ajustes &gt; Cajas</p>
        </div>
      );
    }

    return <OpenShiftForm registers={registers} />;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex justify-between items-center pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Caja Registradora</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control de turnos y apertura de caja</p>
        </div>
      </div>

      {/* ── Estadísticas (Solo Admin) ── */}
      {renderStats()}

      {/* ── Sección Principal ── */}
      <section>
        {await renderMainSection()}
      </section>

      {/* ── Historial ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Cierres Recientes</h2>
        </div>
        <ShiftHistoryTable shifts={processedRecentShifts} />
      </section>

    </div>
  );
}
