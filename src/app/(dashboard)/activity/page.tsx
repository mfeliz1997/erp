
import { createClient } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Package, 
  ShoppingCart, 
  Wallet, 
  User as UserIcon, 
  AlertCircle,
  Clock
} from "lucide-react";

const getActionIcon = (action: string) => {
  switch (action) {
    case 'sale': return <ShoppingCart className="w-4 h-4" />;
    case 'cash_open':
    case 'cash_close': return <Wallet className="w-4 h-4" />;
    case 'inventory_create':
    case 'inventory_delete': return <Package className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'sale': return 'bg-blue-500';
    case 'cash_open': return 'bg-green-500';
    case 'cash_close': return 'bg-red-500';
    case 'inventory_create': return 'bg-orange-500';
    case 'inventory_delete': return 'bg-gray-700';
    default: return 'bg-slate-400';
  }
};

export default async function ActivityLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Validar perfil y rol
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
        <h2 className="text-2xl font-semibold   text-red-900">Acceso Denegado</h2>
        <p className="max-w-xs text-red-700/60 font-medium text-sm">
          Solo los administradores tienen permiso para visualizar el historial de auditoría del sistema.
        </p>
      </div>
    );
  }

  // 2. Obtener Logs con JOIN de perfiles
  const { data: logs } = await supabase
    .from("activity_logs")
    .select(`
      *,
      profiles:user_id (full_name)
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      {/* Header Estético */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-4xl font-semibold   ">Auditoría del Sistema</h1>
        <p className="text-xs font-bold  text-gray-400 mt-2 ">Línea de tiempo de actividades en tiempo real</p>
      </div>

      {/* Timeline UI */}
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
        {logs?.length === 0 ? (
          <div className="text-center p-20 border-2 border-solid border-gray-200  font-semibold text-gray-300">
             No se han registrado actividades aún
          </div>
        ) : (
          logs?.map((log, index) => (
            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Icon / Dot */}
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${getActionColor(log.action)} text-white`}>
                {getActionIcon(log.action)}
              </div>

              {/* Card / Content */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 bg-white border border-gray-200 shadow-sm rounded-xl rounded-xl">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-semibold text-black  text-xs ">
                    {log.profiles?.full_name || 'Sistema'}
                  </div>
                  <time className="font-mono text-xs text-gray-400 ">
                    {format(new Date(log.created_at), "HH:mm · dd MMM", { locale: es })}
                  </time>
                </div>
                <div className="text-sm font-bold text-gray-800 leading-tight">
                  {log.description}
                </div>
                <div className="mt-3 flex gap-2">
                   <Badge variant="outline" className="rounded-xl border-gray-200 text-xs  font-semibold text-gray-400">
                      {log.action}
                   </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-10 text-center">
         <p className="text-xs  font-semibold text-gray-300 ">Fin del Historial Reciente</p>
      </div>
    </div>
  );
}