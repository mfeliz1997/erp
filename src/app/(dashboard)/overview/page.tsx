import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
 import { Activity, CreditCard, DollarSign, Package, TrendingDown, TrendingUp } from "lucide-react";
import OverviewChart from "./OverviewChart";

 export default async function OverviewPage(props: { searchParams: Promise<{ days?: string }> }) {
  const searchParams = await props.searchParams;
  const period = parseInt(searchParams.days || "7");
 
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  // 2. OBTENER USUARIO Y PERFIL
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user?.id)
    .single();

  // 3. AHORA SÍ PUEDES USAR 'supabase' PARA LAS CONSULTAS
  const { data: recentActivity } = await supabase
    .from('activity_logs')
    .select('*, profiles:user_id(full_name)') // Cambié users por profiles para traer el nombre real
    .eq('tenant_id', profile?.tenant_id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: statsData } = await supabase.rpc("get_dashboard_stats", {
    p_tenant_id: profile?.tenant_id,
    p_days: period,
  });

 


 
  const stats = statsData || { total_revenue: 0, total_sales: 0, total_products_sold: 0, top_product: null, bottom_product: null, chart_data: [] };
  const ticketPromedio = stats.total_sales > 0 ? (stats.total_revenue / stats.total_sales) : 0;

  // Estilos dinámicos para los botones de período
  const btnClass = (d: number) => `px-4 py-1.5 text-sm font-medium rounded-md transition-all ${period === d ? 'bg-black text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Estadísticas de Valor</h1>
          <p className="text-sm text-gray-500 mt-1">Análisis de rendimiento en tiempo real</p>
        </div>
        <div className="flex gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100">
          <Link href="?days=7" className={btnClass(7)}>7 Días</Link>
          <Link href="?days=30" className={btnClass(30)}>Mes</Link>
          <Link href="?days=365" className={btnClass(365)}>Año</Link>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-500">Ingresos Totales</h3>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-500">Ventas (Facturas)</h3>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total_sales}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-500">Productos Vendidos</h3>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total_products_sold}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-500">Ticket Promedio</h3>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${ticketPromedio.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Gráfica y Productos Estrella */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica (Ocupa 2 columnas) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Tendencia de Ventas</h3>
          <div className="h-[300px] w-full">
            <OverviewChart data={stats.chart_data} />
          </div>
        </div>

        {/* Insights y Productos (Ocupa 1 columna) */}
        <div className="flex flex-col gap-4">
          
          {/* Tarjeta de Resumen en texto */}
          <div className="bg-black text-white p-6 rounded-2xl shadow-md">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Resumen Ejecutivo</h3>
            <p className="text-base leading-relaxed">
              En los últimos <span className="font-bold text-white">{period} días</span>, tu negocio ha desplazado <span className="font-bold text-white">{stats.total_products_sold} artículos</span> a través de <span className="font-bold text-white">{stats.total_sales} transacciones</span>.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1">
            <h3 className="text-base font-bold text-gray-900 mb-5">Rendimiento de Inventario</h3>
            
            {stats.top_product ? (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-gray-500">MÁS VENDIDO</span>
                </div>
                <p className="text-lg font-bold text-gray-900 line-clamp-1">{stats.top_product.name}</p>
                <p className="text-sm text-gray-500 mt-1">{stats.top_product.qty} unidades • ${stats.top_product.revenue.toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-6">Sin datos suficientes.</p>
            )}

            {stats.bottom_product ? (
              <div className="pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-semibold text-gray-500">MENOS VENDIDO (Atención)</span>
                </div>
                <p className="text-base font-bold text-gray-900 line-clamp-1">{stats.bottom_product.name}</p>
                <p className="text-sm text-gray-500 mt-1">{stats.bottom_product.qty} unidades • ${stats.bottom_product.revenue.toLocaleString()}</p>
              </div>
            ) : null}
          </div>


          {/* FEED DE ACTIVIDAD EN TIEMPO REAL */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1 mt-4">
            <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Actividad Reciente
            </h3>
            
            <div className="space-y-4 pr-1">
              {!recentActivity || recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">No hay actividad reciente.</p>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className={`p-2 rounded-lg mt-1 ${log.action === 'payment' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'}`}>
                      {log.action === 'payment' ? <DollarSign className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{log.description}</p>
                      <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-400">{log.users?.email || 'Usuario'}</span>
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}