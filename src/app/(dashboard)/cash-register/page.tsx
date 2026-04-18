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
    expected_amount: (s.opening_amount || 0) + (s.invoices?.reduce((acc: number, inv: any) => acc + (inv.total || 0), 0) || 0)
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
  let allOpenShifts = [];
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
    stats.totalOpening = allOpenShifts.reduce((acc, s) => acc + (s.opening_amount || 0), 0);
  }

  const renderStats = () => {
    if (!isAdmin) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border border-gray-200 rounded-xl shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold  ">Base en Cajas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">RD$ {stats.totalOpening.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground  font-bold mt-1">
              Capital inicial en transito
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 rounded-xl shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold  ">Ventas Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">RD$ {stats.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground  font-bold mt-1">
              Ventas brutas acumuladas
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 rounded-xl shadow-sm rounded-xl bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold  ">Terminales Abiertas</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{allOpenShifts.length}</div>
            <p className="text-xs text-gray-400  font-bold mt-1">
              Cajeros operando ahora
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMainSection = async () => {
    // Si es ADMIN y no tiene caja propia abierta, mostramos panel de control
    if (isAdmin && !myOpenShift) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-black"></div>
            <h2 className="text-2xl font-semibold  ">Panel de Control de Cajas</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lista de Cajas Abiertas */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold   text-gray-500">Cajas actualmente activas</h3>
              {allOpenShifts.length === 0 ? (
                 <div className="p-10 border-2 border-solid border-gray-200 rounded-xl text-center bg-white">
                    <p className="text-xs font-bold text-gray-400 ">No hay turnos abiertos en este momento</p>
                 </div>
              ) : (
                allOpenShifts.map((s) => (
                  <div key={s.id} className="p-4 border border-gray-200 shadow-sm rounded-xl flex justify-between items-center bg-white">
                    <div>
                      <p className="text-sm font-semibold ">{s.cash_registers.name}</p>
                      <p className="text-xs text-gray-500 font-bold ">Cajero: {s.profiles.full_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-600 rounded-xl  text-xs mb-1">Abierta</Badge>
                      <p className="text-xs font-bold">RD$ {s.opening_amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Opción de abrir caja propia si se necesita */}
            <div className="p-6 bg-gray-50 border-2 border-solid border-gray-300 rounded-xl">
               <h3 className="text-xs font-semibold   text-gray-500 mb-4">Abrir mi propio turno</h3>
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
                <h1 className="text-2xl font-semibold  ">Mi Turno Activo</h1>
                <Badge className="bg-green-600 rounded-xl  text-xs mt-1 ">En sesión</Badge>
             </div>
             <p className="text-xs text-gray-500 font-bold  text-right">Caja: {myOpenShift.cash_registers?.name}</p>
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
        <div className="p-8 border-2 border-solid border-zinc-200 text-center space-y-4 bg-white">
           <Monitor className="w-8 h-8 text-zinc-300 mx-auto" />
           <h2 className="text-xl font-semibold  ">No hay terminales</h2>
           <p className="text-xs text-gray-500 font-bold ">Configure cajas en Ajustes &gt; Cajas</p>
        </div>
      );
    }

    return <OpenShiftForm registers={registers} />;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-12">
      {/* 🚀 ESTADÍSTICAS (Solo Admin) */}
      {renderStats()}

      {/* 🛠️ SECCIÓN PRINCIPAL (Admin Dashboard o Mi Caja) */}
      <section>
        {await renderMainSection()}
      </section>

      {/* 📜 HISTORIAL */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <History className="h-5 w-5" />
          <h2 className="text-xl font-semibold  ">Cierres Recientes</h2>
        </div>
        <ShiftHistoryTable shifts={processedRecentShifts} />
      </section>
    </div>
  );
}
