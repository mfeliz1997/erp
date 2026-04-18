import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from "@/lib/supabase";
import { logoutAction } from '../(auth)/actions';
import NcfWarning from './NcfWarning';
import { TenantProvider } from '@/providers/tenant-provider';
import { CartProvider } from '@/store/CartProvider';

export const ALL_MENU_ITEMS = [
  // 🟢 OPERACIONES DIARIAS
  { name: 'Resumen', path: '/overview', icon: '📊' },
  { name: 'Punto de Venta', path: '/pos', icon: '🛒' },
  { name: 'Caja', path: '/cash-register', icon: '💵' },
  { name: 'Taller', path: '/workshop', icon: '🔧' },

  // 📦 MERCANCÍA Y TRANSACCIONES
  { name: 'Inventario', path: '/inventory', icon: '📦' },
  { name: 'Compras', path: '/purchases', icon: '📥' },
  { name: 'Historial de Ventas', path: '/invoices', icon: '📜' },

  // 👥 FINANZAS Y RELACIONES
  { name: 'Clientes', path: '/customers', icon: '👥' },
  { name: 'Cuentas por Cobrar', path: '/debts', icon: '💸' },

  // ⚙️ ADMINISTRACIÓN Y AUDITORÍA
  // { name: 'Reportes (En proceso)', path: '/reports', icon: '📈' },
  // { name: 'Gestión Fiscal', path: '/fiscal', icon: '⚖️' },
  { name: 'Auditoría', path: '/activity', icon: '👁️' },
  { name: 'Configuración', path: '/settings', icon: '⚙️' },
];

import { Sidebar } from '@/components/dashboard/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, allowed_routes, full_name, tenants(name, plan)')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600 font-bold">Error crítico: Perfil sin negocio asignado.</p>
      </div>
    );
  }

  const tenantName = (profile?.tenants as any)?.name;

  const filteredMenu = ALL_MENU_ITEMS.filter(item => {
    if (profile.role === 'admin') return true;
    const routes = profile.allowed_routes || [];
    return Array.isArray(routes) ? routes.includes(item.path) : false;
  });

  return (
    <TenantProvider tenantId={profile.tenant_id as string}>
      <div className="flex min-h-screen bg-gray-50 text-gray-900">
        <Sidebar 
          tenantName={tenantName}
          userName={profile.full_name || 'Usuario'}
          menuItems={filteredMenu}
        />

        {/* Contenido Principal */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
            <CartProvider>
              {children}
            </CartProvider>
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}