import { NcfSequence } from '@/types/fiscal';
import { NcfForm } from './NcfForm';
import { AlertSettingsForm } from './AlertSettingsForm';
import { createClient } from '@/lib/supabase';
import { ToggleAlertAction } from './ToggleAlertAction';
import { NcfImportMapper } from '@/modules/fiscal/components/NcfImportMapper';
import { NcfExportButton } from '@/modules/fiscal/components/NcfExportButton';

export default async function FiscalPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  const [
    { data: sequences },
    { data: settings },
    { data: employees },
    { data: usedSequences },
  ] = await Promise.all([
    supabase.from('ncf_sequences').select('*').order('type', { ascending: true }),
    supabase.from('tenant_fiscal_settings').select('*').single(),
    supabase.from('profiles').select('id, role, receive_fiscal_alerts').order('role', { ascending: true }),
    supabase
      .from('ncf_used_sequences')
      .select('id, ncf_number, ncf_type, customer_name, customer_rnc, total, used_at')
      .order('used_at', { ascending: false })
      .limit(50),
  ]);

  const data = (sequences as NcfSequence[]) || [];
  const currentThreshold = settings?.ncf_threshold || 100;
  const notifyWhatsapp = settings?.notify_whatsapp || false;
  const notifyEmail = settings?.notify_email ?? true;
  const used = usedSequences ?? [];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comprobantes Fiscales (DGII)</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tus secuencias NCF, importa comprobantes y exporta para la DGI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Columna izquierda: configuración (solo admin) ── */}
        <div className="lg:col-span-1 space-y-6">
          {isAdmin ? (
            <>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold mb-4">Nueva Secuencia</h3>
                <NcfForm />
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold mb-1">Importar Comprobantes</h3>
                <p className="text-xs text-gray-500 mb-4">Sube un CSV con tus secuencias NCF autorizadas por la DGII.</p>
                <NcfImportMapper />
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

        {/* ── Columna derecha: tablas de secuencias y comprobantes usados ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Secuencias configuradas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Secuencias Configuradas</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-600">
                <tr>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Prefijo</th>
                  <th className="p-4">Actual</th>
                  <th className="p-4">Límite</th>
                  <th className="p-4">Disponibles</th>
                  <th className="p-4">Vence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No hay secuencias configuradas. Añade una o importa desde CSV.
                    </td>
                  </tr>
                ) : (
                  data.map((s) => {
                    const remaining = s.max_limit - s.current_sequence;
                    const isLow = remaining <= currentThreshold;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-blue-600">{s.type}</td>
                        <td className="p-4 font-mono text-xs">{s.prefix}</td>
                        <td className="p-4 font-medium">{s.current_sequence}</td>
                        <td className="p-4 text-gray-600">{s.max_limit}</td>
                        <td className="p-4">
                          <span className={`font-semibold tabular-nums ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {remaining.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">{s.valid_until || 'N/A'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Comprobantes usados */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Comprobantes Usados</h3>
                <p className="text-xs text-gray-400 mt-0.5">Últimos 50 — exporta el historial completo para la DGI</p>
              </div>
              <NcfExportButton />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-600">
                  <tr>
                    <th className="p-4">NCF</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">RNC/Cédula</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {used.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">
                        Aún no se han usado comprobantes. Se registran automáticamente al procesar ventas.
                      </td>
                    </tr>
                  ) : (
                    used.map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono text-xs font-semibold">{u.ncf_number}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                            {u.ncf_type}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700">{u.customer_name || 'Consumidor Final'}</td>
                        <td className="p-4 font-mono text-xs text-gray-500">{u.customer_rnc || '—'}</td>
                        <td className="p-4 font-semibold tabular-nums">
                          RD${Number(u.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-gray-500 text-xs">
                          {new Date(u.used_at).toLocaleString('es-DO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
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
