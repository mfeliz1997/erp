'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from './actions';
import { BUSINESS_TYPES } from '@/types/inventory';

const initialState = { success: true, error: '' };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Crear Negocio</h1>
          <p className="text-gray-500 mt-2">Prueba Beral gratis por 14 días.</p>
        </div>

        {/* Aquí se mostrarán los errores correctamente ahora */}
        {!state.success && state.error && (
          <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200 font-medium">
            ⚠️ {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="owner_name" className="block text-sm font-medium text-gray-700 mb-1">
              Tu Nombre (Dueño)
            </label>
            <input
              id="owner_name"
              name="owner_name" 
              type="text"
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Negocio
            </label>
            {/* CORREGIDO: company_name */}
            <input
              id="company_name"
              name="company_name" 
              type="text"
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              placeholder="Ej: Mi Tienda SRL"
            />
          </div>

          <div>
            <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Negocio
            </label>
            {/* CORREGIDO: business_type */}
            <select
              id="business_type"
              name="business_type" 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
              defaultValue=""
              required
            >
              <option value="" disabled>Selecciona una categoría...</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono / WhatsApp (Opcional)
            </label>
            {/* NUEVO: Campo phone que esperaba el backend */}
            <input
              id="phone"
              name="phone"
              type="tel"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              placeholder="809-000-0000"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico Administrador
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              placeholder="admin@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña Segura
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-black text-white p-3 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-4 shadow-md"
          >
            {isPending ? 'Configurando tu ERP...' : 'Registrar Mi Negocio'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-black font-bold hover:underline">
            Inicia Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}