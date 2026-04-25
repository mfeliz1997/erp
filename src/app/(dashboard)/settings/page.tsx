import { createClient } from "@/lib/supabase";
import type { UserProfile } from "@/types/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeForm } from "./components/EmployeeForm";
import IntegrationsForm from "./components/IntegrationsForm";
import { EditEmployeeModal } from "./components/EditEmployeeModal";
import WebsiteSettingsForm from "./components/WebsiteSettingsForm";
import { RegisterManager } from "@/modules/settings/components/RegisterManager";
import { PrinterSettingsForm } from "./components/PrinterSettingsForm";
import { AdminPinForm } from "@/modules/settings/components/AdminPinForm";
import { Settings, Users, Monitor, Globe, MessageSquare, Printer as PrinterIcon, ShieldCheck, Lock, CreditCard, Landmark, Clock, ShoppingBag, Tag } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenants(*)")
    .eq("id", user.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-semibold  ">Acceso Restringido</h2>
        <p className="text-sm font-bold text-gray-400   text-center">Debes ser administrador para gestionar el negocio.</p>
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary text-primary-foreground shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold   text-gray-400">Panel de Control</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold    leading-none">Settings</h1>
          <p className="text-gray-400 font-bold text-xs   pl-1">Gestión de espacio de trabajo y equipo</p>
        </div>

        <div className="flex items-center">
          <div className="px-5 py-2 bg-primary text-primary-foreground text-xs font-semibold   w-full md:w-auto text-center">Modo Pro Administrador</div>
        </div>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="flex overflow-x-auto no-scrollbar w-full justify-start bg-transparent border-b border-gray-200 rounded-xl p-0 mb-12 flex-nowrap min-h-[50px]">
          {[
            { v: 'team', l: 'Equipo', i: <Users className="w-3 h-3" /> },
            { v: 'registers', l: 'Cajas', i: <Monitor className="w-3 h-3" /> },
            { v: 'website', l: 'Catálogo', i: <Globe className="w-3 h-3" /> },
            { v: 'integrations', l: 'Canales', i: <MessageSquare className="w-3 h-3" /> },
            { v: 'printing', l: 'Impresión', i: <PrinterIcon className="w-3 h-3" /> },
         
            { v: 'security', l: 'Seguridad', i: <Lock className="w-3 h-3" /> },
          ].map(tab => (
            <TabsTrigger
              key={tab.v}
              value={tab.v}
              className="rounded-xl border-b-4 border-transparent data-[state=active]:border-black data-[state=active]:bg-black data-[state=active]:text-white px-6 py-4 text-xs font-semibold   transition-all gap-2 shrink-0 h-full"
            >
              {tab.i} {tab.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="team" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <EmployeeForm tenantDomain={tenantDomain} registers={registers || []} />

            <div className="space-y-6">
              <h3 className="text-lg font-semibold    flex items-center gap-2">
                <div className="w-1.5 h-6 bg-black" /> Personal Activo
              </h3>
              <div className="space-y-4">
                {employees?.map((emp: any) => (
                  <div key={emp.id} className="flex justify-between items-center p-6 bg-white border border-gray-200 shadow-sm rounded-xl hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold  tracking-tight text-sm">{emp.full_name}</p>
                        {emp.role === 'admin' && <span className="bg-primary text-primary-foreground text-xs font-semibold px-1 py-0.5 ">OWNER</span>}
                      </div>
                      <p className="text-xs font-bold text-blue-600  mt-0.5">{(emp.full_name ?? '').toLowerCase().replace(/\s+/g, '')}@{tenantDomain}.com</p>
                      <p className="text-xs font-semibold text-gray-400 mt-2  tracking-tight">📞 {emp.phone || 'Sin número'}</p>
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {emp.allowed_routes?.map((r: string) => (
                          <span key={r} className="text-xs font-semibold border border-gray-100 bg-gray-50 px-2 py-0.5">{r.replace('/', '')}</span>
                        ))}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {emp.can_give_credit && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700">
                            <Clock className="w-2.5 h-2.5" /> Crédito
                          </span>
                        )}
                        {emp.can_use_card && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700">
                            <CreditCard className="w-2.5 h-2.5" /> Tarjeta
                          </span>
                        )}
                        {emp.can_use_transfer && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700">
                            <Landmark className="w-2.5 h-2.5" /> Transferencia
                          </span>
                        )}
                        {emp.can_sell_without_shift && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700">
                            <ShoppingBag className="w-2.5 h-2.5" /> Sin turno
                          </span>
                        )}
                        {emp.can_edit_customers && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700">
                            <Users className="w-2.5 h-2.5" /> Edit. Clientes
                          </span>
                        )}
                        {emp.can_apply_discount && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700">
                            <Tag className="w-2.5 h-2.5" /> Descuentos
                          </span>
                        )}
                        {emp.assigned_register_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-600">
                            <Monitor className="w-2.5 h-2.5" /> {registers?.find((r: any) => r.id === emp.assigned_register_id)?.name ?? 'Caja asignada'}
                          </span>
                        )}
                      </div>
                    </div>
                    <EditEmployeeModal employee={emp} registers={registers || []}>
                      <button disabled={emp.role === 'admin' && emp.id === user?.id} className="p-3 border-2 border-transparent group-hover:border-black text-black transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-black">
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
 

        <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-md mx-auto py-12">
            <AdminPinForm currentPin={tenantData?.admin_pin} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
