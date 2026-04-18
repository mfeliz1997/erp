'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '../actions';

const initialState = { success: true, error: '' };

export default function LoginPage() {
  // useActionState reemplaza a useFormState en Next.js 15
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <form action={formAction} className="p-8 bg-white rounded-xl shadow-md space-y-5 w-96">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Beral ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Inicia sesión en tu cuenta</p>
        </div>
        
        {/* Renderizado condicional del error */}
        {!state.success && state.error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {state.error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full bg-black text-white p-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 font-medium"
        >
          {isPending ? 'Iniciando...' : 'Iniciar Sesión'}
        </button>

        {/* Enlace hacia el registro */}
        <p className="text-center text-sm text-gray-600 pt-2">
          ¿No tienes una empresa registrada?{' '}
          <Link href="/register" className="font-semibold text-black hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}