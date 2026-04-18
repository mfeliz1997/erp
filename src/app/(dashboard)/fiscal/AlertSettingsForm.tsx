'use client';

import { useActionState } from 'react';
import { updateAlertSettingsAction, FiscalActionState } from '@/modules/fiscal/actions';

const initialState: FiscalActionState = { success: false };

interface AlertSettingsProps {
  currentThreshold: number;
  notifyWhatsapp: boolean;
  notifyEmail: boolean;
}

export function AlertSettingsForm({ currentThreshold, notifyWhatsapp, notifyEmail }: AlertSettingsProps) {
  const [state, formAction, isPending] = useActionState(updateAlertSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="p-2 text-xs bg-red-50 text-red-600 rounded">{state.error}</div>}
      {state.success && state.data && <div className="p-2 text-xs bg-green-50 text-green-600 rounded">{state.data}</div>}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Avisarme cuando queden menos de:</label>
        <input 
          name="threshold" 
          type="number" 
          defaultValue={currentThreshold} 
          required 
          className="w-full p-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-black" 
        />
        <p className="text-xs text-gray-400">Ej. 100, 500, 1000 comprobantes.</p>
      </div>

      <div className="space-y-2 pt-2">
        <label className="text-xs font-medium text-gray-500">Canales de Notificación:</label>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="whatsapp" name="whatsapp" defaultChecked={notifyWhatsapp} className="rounded text-black focus:ring-black" />
          <label htmlFor="whatsapp" className="text-sm text-gray-700">WhatsApp</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="email" name="email" defaultChecked={notifyEmail} className="rounded text-black focus:ring-black" />
          <label htmlFor="email" className="text-sm text-gray-700">Correo Electrónico</label>
        </div>
      </div>

      {/* Dentro de tu formulario de configuración fiscal */}
<div className="space-y-4 border-t pt-4 mt-4">
{/* Sección de WhatsApp en el formulario fiscal */}
<div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
  <h4 className="font-bold text-gray-700 flex items-center gap-2">
    📱 Configuración de WhatsApp
  </h4>
  
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="text-sm">
      <p className="font-medium">Envío Automático</p>
      <p className="text-xs text-gray-500">Enviar factura al cobrar sin preguntar.</p>
    </div>
    <input 
      type="checkbox" 
      name="auto_send_whatsapp" 
      defaultChecked={notifyWhatsapp} // Usando la prop que ya tienes
      className="w-5 h-5 accent-green-600"
    />
  </div>

  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-500 ">Proveedor de Servicio</label>
    <select 
      name="whatsapp_provider" 
      className="w-full p-2 border rounded-md text-sm"
    >
      <option value="invenza">Usar WhatsApp de Invenza (Por defecto)</option>
      <option value="custom">Usar mi propia API Key (Meta Cloud)</option>
    </select>
  </div>
</div>
  
  {/* Solo se muestra si elige custom */}
  <input 
    type="text" 
    name="custom_whatsapp_key" 
    placeholder="Meta Access Token" 
    className="w-full border p-2 rounded"
  />
</div>

      <button disabled={isPending} type="submit" className="w-full bg-white border border-gray-300 text-gray-700 p-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
        {isPending ? 'Guardando...' : 'Guardar Alertas'}
      </button>
    </form>
  );
}