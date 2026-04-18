import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { Activity, CreditCard, DollarSign, Package, TrendingDown, TrendingUp, Clock, Zap } from "lucide-react";
import OverviewChart from "./OverviewChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OverviewPage(props: { searchParams: Promise<{ days?: string }> }) {
  const searchParams = await props.searchParams;
  const period = parseInt(searchParams.days || "7");
 
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  // 1. OBTENER USUARIO Y PERFIL
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user?.id)
    .single();

  // 2. CONSULTAS
  const { data: recentActivity } = await supabase
    .from('activity_logs')
    .select('*, profiles:user_id(full_name)')
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
  const btnClass = (d: number) => `px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-none transition-all ${period === d ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border-2 border-black border-l-0'}`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 p-6">
      
      {/* Header y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b-4 border-black pb-6">
        <div>
          <h1 className="text-4xl font-black text-black uppercase tracking-tighter italic">Resumen</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Análisis de rendimiento en tiempo real</p>
        </div>
        <div className="flex border-2 border-black">
          <Link href="?days=7" className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-none transition-all ${period === 7 ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border-r-2 border-black'}`}>7 Días</Link>
          <Link href="?days=30" className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-none transition-all ${period === 30 ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border-r-2 border-black'}`}>Mes</Link>
          <Link href="?days=365" className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-none transition-all ${period === 365 ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Año</Link>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ingresos Totales</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">RD$ {stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ventas Realizadas</CardTitle>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.total_sales}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Productos Salientes</CardTitle>
            <Package className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.total_products_sold}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-black text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-300">Ticket Promedio</CardTitle>
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">RD$ {ticketPromedio.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica y Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfica Trend */}
        <Card className="lg:col-span-2 border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-black" />
                <CardTitle className="text-lg font-black uppercase italic">Tendencia Comercial</CardTitle>
             </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              <OverviewChart data={stats.chart_data} />
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          
          {/* Executive Message */}
          <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-black text-white text-[8px] font-bold uppercase tracking-widest">IA Insight</div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Resumen de Operación</h3>
            <p className="text-sm font-bold leading-relaxed uppercase">
              En los últimos <span className="underline decoration-black decoration-2">{period} días</span>, se han desplazado <span className="text-blue-600">{stats.total_products_sold} artículos</span> mediante <span className="text-green-600">{stats.total_sales} facturas</span> generadas.
            </p>
          </div>

          {/* Inventory Perf */}
          <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-1">
            <CardHeader className="pb-3 border-b-2 border-black bg-gray-50">
               <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-3 h-3" /> Rendimiento de Stock
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {stats.top_product ? (
                <div>
                  <Badge className="bg-green-600 rounded-none uppercase text-[8px] mb-2 font-black tracking-widest">Top Seller</Badge>
                  <p className="text-lg font-black uppercase tracking-tighter truncate">{stats.top_product.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{stats.top_product.qty} unidades movidas</p>
                </div>
              ) : (
                <p className="text-xs font-bold text-gray-400 uppercase italic">Sin datos de rotación</p>
              )}

              {stats.bottom_product && (
                <div className="pt-4 border-t-2 border-dashed border-gray-100">
                  <Badge className="bg-red-600 rounded-none uppercase text-[8px] mb-2 font-black tracking-widest">Baja Rotación</Badge>
                  <p className="text-md font-black uppercase tracking-tighter text-gray-600 truncate">{stats.bottom_product.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{stats.bottom_product.qty} unidades movidas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-1">
            <CardHeader className="pb-3 border-b-2 border-black bg-black text-white">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" /> Movimientos en Vivo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {!recentActivity || recentActivity.length === 0 ? (
                  <p className="text-[10px] font-bold text-gray-400 uppercase italic">Esperando actividad...</p>
                ) : (
                  recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-3 items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                      <div>
                        <p className="text-[11px] font-black uppercase leading-tight italic">{log.description}</p>
                        <div className="flex gap-2 text-[9px] font-bold text-gray-400 uppercase mt-1">
                          <span>{log.profiles?.full_name?.split(' ')[0] || 'Sistema'}</span>
                          <span>•</span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}