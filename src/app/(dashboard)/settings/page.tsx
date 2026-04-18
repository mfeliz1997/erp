import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeForm } from "./components/EmployeeForm";
import { IntegrationsForm } from "./integrations/page";
import { EditEmployeeModal } from "./components/EditEmployeeModal";
import { WebsiteSettingsForm } from "./website/page";
import { RegisterManager } from "@/modules/settings/components/RegisterManager";
import { PrinterSettingsForm } from "./components/PrinterSettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenants(*)")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== 'admin') {
    return <div className="p-6 text-red-500 font-bold">Acceso Denegado. Solo administradores.</div>;
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

  // Extracción segura del tenant y dominio
  const tenantData = Array.isArray(profile.tenants) ? profile.tenants[0] : profile.tenants;
  const tenantDomain = tenantData?.name ? tenantData.name.toLowerCase().replace(/[^a-z0-9]/g, "") : 'empresa';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Settings</h1>
          <p className="text-slate-400 font-medium mt-2 text-sm uppercase tracking-widest">Workspace & Team Management</p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-none">Admin Mode</div>
        </div>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="flex w-full justify-start gap-8 bg-transparent border-b border-gray-100 rounded-none h-12 p-0 mb-10 overflow-x-auto">
          <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest transition-all">👥 Equipo</TabsTrigger>
          <TabsTrigger value="registers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest transition-all">🖥️ Cajas</TabsTrigger>
          <TabsTrigger value="website" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest transition-all">🌐 Web</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest transition-all">🔌 WhatsApp</TabsTrigger>
          <TabsTrigger value="printing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest transition-all">🖨️ Impresión</TabsTrigger>
          <TabsTrigger value="fiscal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest transition-all">⚖️ Fiscal</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmployeeForm tenantDomain={tenantDomain} />

            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-bold text-lg">Personal Activo</h3>
              {employees?.map((emp: any) => (
                <div key={emp.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-bold">{emp.full_name} {emp.is_owner && '👑'}</p>
                    {!emp.is_owner && (
                      <p className="text-xs text-blue-600 font-mono mb-0.5">{emp.full_name.toLowerCase().replace(/\s+/g, '')}@{tenantDomain}.com</p>
                    )}
                    <p className="text-xs text-slate-500">{emp.phone || 'Sin número'}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {emp.allowed_routes?.map((r: string) => (
                        <span key={r} className="text-[10px] bg-slate-100 border px-2 py-0.5 rounded">{r}</span>
                      ))}
                    </div>
                  </div>
                  <EditEmployeeModal employee={emp}>
                    <button disabled={emp.is_owner} className="text-xs text-blue-600 hover:underline disabled:text-slate-300">
                      Editar
                    </button>
                  </EditEmployeeModal>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="registers">
          <RegisterManager registers={registers || []} />
        </TabsContent>

        <TabsContent value="website">
          <WebsiteSettingsForm tenant={tenantData} />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsForm tenant={tenantData} />
        </TabsContent>

        <TabsContent value="printing">
          <PrinterSettingsForm />
        </TabsContent>

        <TabsContent value="fiscal">
          <div className="p-8 bg-white border-2 border-dashed rounded-none text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sección Fiscal en construcción...</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
