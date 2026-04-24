 import { NcfSequence } from '@/types/fiscal';
import { NcfForm } from './NcfForm';
import { AlertSettingsForm } from './AlertSettingsForm';
import { createClient } from '@/lib/supabase';
import { ToggleAlertAction } from './ToggleAlertAction';
 
  
export default async function FiscalPage() {
  const supabase = await createClient();
  
  // 1. Validar Usuario y Rol (Seguridad Empresarial)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // 2. Traer Secuencias NCF
  const { data: sequences } = await supabase
    .from('ncf_sequences')
    .select('*')
    .order('type', { ascending: true });

  // 3. Traer Configuración de Alertas
  const { data: settings } = await supabase
    .from('tenant_fiscal_settings')
    .select('*')
    .single();

  // 4. Traer Empleados del mismo Tenant (RLS ya filtra automáticamente)
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, role, receive_fiscal_alerts')
    .order('role', { ascending: true });

  const data = (sequences as NcfSequence[]) || [];
  const currentThreshold = settings?.ncf_threshold || 100;
  const notifyWhatsapp = settings?.notify_whatsapp || false;
  const notifyEmail = settings?.notify_email ?? true; 

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
 
   
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comprobantes Fiscales (DGII)</h1>
          <p className="text-sm text-gray-500 mt-1">Configura las secuencias NCF y alertas preventivas para tu negocio.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            {isAdmin ? (
              <>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold mb-4">Nueva Secuencia</h3>
                  <NcfForm />
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold mb-4 text-amber-600">Alertas Preventivas ⚠️</h3>
                  <AlertSettingsForm 
                    currentThreshold={currentThreshold}
                    notifyWhatsapp={notifyWhatsapp}
                    notifyEmail={notifyEmail}
                  />
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold mb-4">Receptores de Alertas</h3>
                  <p className="text-xs text-gray-500 mb-4">Selecciona quiénes recibirán los avisos de NCF agotados.</p>
                  <div className="divide-y divide-gray-100">
                    {employees?.map((emp) => (
                      <div key={emp.id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium capitalize text-gray-900">{emp.role}</p>
                          <p className="text-xs text-gray-400">ID: {emp.id.split('-')[0]}...</p>
                        </div>
                        <ToggleAlertAction employeeId={emp.id} isActive={emp.receive_fiscal_alerts} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                Solo los administradores pueden editar la configuración fiscal y de alertas.
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-600">
                  <tr>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Prefijo</th>
                    <th className="p-4">Actual</th>
                    <th className="p-4">Límite</th>
                    <th className="p-4">Vence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay secuencias configuradas.</td></tr>
                  ) : (
                    data.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-blue-600">{s.type}</td>
                        <td className="p-4 font-mono">{s.prefix}</td>
                        <td className="p-4 font-medium">{s.current_sequence}</td>
                        <td className="p-4 text-gray-600">{s.max_limit}</td>
                        <td className="p-4 text-gray-500">{s.valid_until || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    
    </div>
  );
}