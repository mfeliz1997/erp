import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase";
import { TenantProvider } from '@/providers/tenant-provider';
import NcfWarning from './NcfWarning';
import { CartProvider } from '@/store/CartProvider';
import { Sidebar } from '@/components/dashboard/Sidebar';
import type { MenuItem, SubMenuItem } from '@/components/dashboard/Sidebar';
import type { UserRole } from '@/types/auth';
import {
  Package, ShoppingBag, ScrollText,
  Users, Landmark, Tag,
  BarChart2, ShieldCheck, Activity, Settings,
} from 'lucide-react';

export const ALL_MENU_ITEMS: MenuItem[] = [
  // Operaciones diarias
  { name: 'Resumen',         path: '/overview',       icon: '📊' },
  { name: 'Punto de Venta',  path: '/pos',            icon: '🛒' },
  { name: 'Caja',            path: '/cash-register',  icon: '💵' },
  { name: 'Taller',          path: '/workshop',       icon: '🔧' },

  // Mercancía y transacciones
  {
    name: 'Mercancía',
    icon: '📦',
    subItems: [
      { name: 'Inventario',          path: '/inventory', icon: <Package    className="w-3.5 h-3.5" /> },
      { name: 'Compras',             path: '/purchases', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
      { name: 'Historial de Ventas', path: '/invoices',  icon: <ScrollText  className="w-3.5 h-3.5" /> },
    ],
  },

  // Finanzas y relaciones
  {
    name: 'Finanzas',
    icon: '💸',
    subItems: [
      { name: 'Clientes',            path: '/customers',  icon: <Users    className="w-3.5 h-3.5" /> },
      { name: 'Cuentas por Cobrar',  path: '/debts',      icon: <Landmark className="w-3.5 h-3.5" /> },
      { name: 'Descuentos',          path: '/discounts',  icon: <Tag      className="w-3.5 h-3.5" /> },
    ],
  },

  // Administración y auditoría
  {
    name: 'Administración',
    icon: '⚙️',
    subItems: [
      { name: 'Reportes',       path: '/reports',   icon: <BarChart2   className="w-3.5 h-3.5" /> },
      { name: 'Gestión Fiscal', path: '/fiscal',    icon: <ShieldCheck className="w-3.5 h-3.5" /> },
      { name: 'Auditoría',      path: '/activity',  icon: <Activity    className="w-3.5 h-3.5" /> },
      { name: 'Configuración',  path: '/settings',  icon: <Settings    className="w-3.5 h-3.5" /> },
    ],
  },
];

function filterMenu(items: MenuItem[], role: UserRole, allowedRoutes: string[]): MenuItem[] {
  if (role === 'admin') return items;

  return items.reduce<MenuItem[]>((acc, item) => {
    if (item.subItems) {
      const visibleChildren = item.subItems.filter((sub: SubMenuItem) => allowedRoutes.includes(sub.path));
      if (visibleChildren.length > 0) {
        acc.push({ ...item, subItems: visibleChildren });
      }
    } else if (item.path && allowedRoutes.includes(item.path)) {
      acc.push(item);
    }
    return acc;
  }, []);
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

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

  const role = (profile.role as UserRole) ?? 'pos';
  const allowedRoutes: string[] = Array.isArray(profile.allowed_routes) ? profile.allowed_routes : [];
  const tenantName = (profile?.tenants as any)?.name;

  const filteredMenu = filterMenu(ALL_MENU_ITEMS, role, allowedRoutes);

  return (
    <TenantProvider tenantId={profile.tenant_id as string}>
      <div className="flex min-h-screen bg-gray-50 text-gray-900">
        <Sidebar
          tenantName={tenantName}
          userName={profile.full_name || 'Usuario'}
          menuItems={filteredMenu}
        />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <NcfWarning />
          <main className="flex-1 overflow-y-auto p-4 pt-16 md:pt-8 md:p-8 bg-gray-50/50">
            <CartProvider>
              {children}
            </CartProvider>
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
