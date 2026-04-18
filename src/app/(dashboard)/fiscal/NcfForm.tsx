'use client';

import { useActionState } from 'react';
import { upsertNcfAction, FiscalActionState } from '@/modules/fiscal/actions';

const initialState: FiscalActionState = { success: false };

export function NcfForm() {
  const [state, formAction, isPending] = useActionState(upsertNcfAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="p-2 text-xs bg-red-50 text-red-600 rounded">{state.error}</div>}
      {state.success && state.data && <div className="p-2 text-xs bg-green-50 text-green-600 rounded">{state.data}</div>}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tipo de Comprobante</label>
        <select name="type" required className="w-full p-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-black">
          <option value="B01">B01 - Crédito Fiscal</option>
          <option value="B02">B02 - Consumo</option>
          <option value="B04">B04 - Nota de Crédito</option>
          <option value="B14">B14 - Regímenes Especiales</option>
          <option value="B15">B15 - Gubernamentales</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Prefijo (Ej: B01000000)</label>
        <input name="prefix" type="text" required maxLength={11} className="w-full p-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-black" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Núm. Actual</label>
          <input name="current" type="number" defaultValue="0" required className="w-full p-2 border rounded-md text-sm outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Límite Máximo</label>
          <input name="max" type="number" required className="w-full p-2 border rounded-md text-sm outline-none" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Fecha Vencimiento (Opcional)</label>
        <input name="expiry" type="date" className="w-full p-2 border rounded-md text-sm outline-none" />
      </div>

      <button disabled={isPending} type="submit" className="w-full bg-primary text-primary-foreground p-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
        {isPending ? 'Guardando...' : 'Guardar Secuencia'}
      </button>
    </form>
  );
}