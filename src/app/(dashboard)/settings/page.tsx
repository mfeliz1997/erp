import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeForm } from "./components/EmployeeForm";
import { IntegrationsForm } from "./integrations/page";
import { EditEmployeeModal } from "./components/EditEmployeeModal";
import { WebsiteSettingsForm } from "./website/page";
import { RegisterManager } from "@/modules/settings/components/RegisterManager";
import { PrinterSettingsForm } from "./components/PrinterSettingsForm";
import { Settings, Users, Monitor, Globe, MessageSquare, Printer as PrinterIcon, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenants(*)")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Acceso Restringido</h2>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Debes ser administrador para gestionar el negocio.</p>
      </div>
    );
  }

  // 1. Empleados
  const { data: employees } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  // 2. Cajas
  const { data: registers } = await supabaseAdmin
    .from("cash_registers")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  const tenantData = Array.isArray(profile.tenants) ? profile.tenants[0] : profile.tenants;
  const tenantDomain = tenantData?.name ? tenantData.name.toLowerCase().replace(/[^a-z0-9]/g, "") : 'empresa';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-black pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-black text-white shrink-0">
                <Settings className="w-5 h-5" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Panel de Control</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">Settings</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest pl-1">Gestión de espacio de trabajo y equipo</p>
        </div>

        <div className="flex items-center">
           <div className="px-5 py-2 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] w-full md:w-auto text-center">Modo Pro Administrador</div>
        </div>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="flex overflow-x-auto no-scrollbar w-full justify-start bg-transparent border-b-2 border-black rounded-none p-0 mb-12 flex-nowrap min-h-[50px]">
          {[
            { v: 'team', l: 'Equipo', i: <Users className="w-3 h-3" /> },
            { v: 'registers', l: 'Cajas', i: <Monitor className="w-3 h-3" /> },
            { v: 'website', l: 'Catálogo', i: <Globe className="w-3 h-3" /> },
            { v: 'integrations', l: 'Canales', i: <MessageSquare className="w-3 h-3" /> },
            { v: 'printing', l: 'Impresión', i: <PrinterIcon className="w-3 h-3" /> },
            { v: 'fiscal', l: 'Fiscal', i: <ShieldCheck className="w-3 h-3" /> },
          ].map(tab => (
            <TabsTrigger 
              key={tab.v} 
              value={tab.v} 
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-black data-[state=active]:bg-black data-[state=active]:text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all gap-2 shrink-0 h-full"
            >
              {tab.i} {tab.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="team" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <EmployeeForm tenantDomain={tenantDomain} />

            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-2">
                 <div className="w-1.5 h-6 bg-black" /> Personal Activo
              </h3>
              <div className="space-y-4">
                {employees?.map((emp: any) => (
                  <div key={emp.id} className="flex justify-between items-center p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black uppercase tracking-tight text-sm">{emp.full_name}</p>
                        {emp.role === 'admin' && <span className="bg-black text-white text-[8px] font-black px-1 py-0.5 tracking-widest">OWNER</span>}
                      </div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">{emp.full_name.toLowerCase().replace(/\s+/g, '')}@{tenantDomain}.com</p>
                      <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-tight">📞 {emp.phone || 'Sin número'}</p>
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {emp.allowed_routes?.map((r: string) => (
                          <span key={r} className="text-[8px] font-black uppercase tracking-widest border border-gray-100 bg-gray-50 px-2 py-0.5">{r.replace('/', '')}</span>
                        ))}
                      </div>
                    </div>
                    <EditEmployeeModal employee={emp}>
                      <button disabled={emp.role === 'admin' && emp.id === user?.id} className="p-3 border-2 border-transparent group-hover:border-black text-black transition-all hover:bg-black hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-black">
                        <Settings className="w-5 h-5" />
                      </button>
                    </EditEmployeeModal>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="registers" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RegisterManager registers={registers || []} />
        </TabsContent>

        <TabsContent value="website" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <WebsiteSettingsForm tenant={tenantData} />
        </TabsContent>

        <TabsContent value="integrations" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <IntegrationsForm tenant={tenantData} />
        </TabsContent>

        <TabsContent value="printing" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PrinterSettingsForm />
        </TabsContent>

        <TabsContent value="fiscal" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-20 bg-white border-4 border-dashed border-gray-100 text-center flex flex-col items-center justify-center space-y-6">
            <ShieldCheck className="w-16 h-16 text-gray-100" />
            <div className="space-y-1">
              <p className="text-xl font-black uppercase tracking-tighter text-gray-300">Modulo de Cumplimiento Fiscal</p>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Funcionalidad en fase de auditoría interna</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
