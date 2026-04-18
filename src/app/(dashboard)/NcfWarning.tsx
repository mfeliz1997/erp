import { createClient } from '@/lib/supabase';

export default async function NcfWarning() {
  const supabase = await createClient();

  // 1. Obtener ajustes del negocio y secuencias
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: settings } = await supabase
    .from('tenant_fiscal_settings')
    .select('ncf_threshold')
    .single();

  const { data: sequences } = await supabase
    .from('ncf_sequences')
    .select('type, current_sequence, max_limit');

  // 2. Filtrar secuencias críticas
  const threshold = settings?.ncf_threshold || 100;
  const criticalSequences = sequences?.filter(s => 
    (s.max_limit - s.current_sequence) <= threshold
  );

  if (!criticalSequences || criticalSequences.length === 0) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 p-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
          <span>⚠️</span>
          <span>
            {criticalSequences.length === 1 
              ? `Atención: Te quedan menos de ${threshold} comprobantes para el tipo ${criticalSequences[0].type}.`
              : `Atención: Varias secuencias NCF están por agotarse (menos de ${threshold} disponibles).`}
          </span>
        </div>
        <a href="/fiscal" className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded-md transition-colors font-bold uppercase">
          Resolver ahora
        </a>
      </div>
    </div>
  );
}