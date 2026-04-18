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

  // 2. AÑADIDO: 'allowed_routes' a la consulta de la base de datos
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

  // 3. LA MAGIA DE LOS ROLES: Filtramos el menú antes de dibujarlo
  const filteredMenu = ALL_MENU_ITEMS.filter(item => {
    if (profile.role === 'admin') return true; // El dueño ve todo

    // Si es empleado, verificamos si la ruta está en sus permisos
    const routes = profile.allowed_routes || [];
    return Array.isArray(routes) ? routes.includes(item.path) : false;
  });

  return (
    // TU ESTRUCTURA ORIGINAL INTACTA
    <TenantProvider tenantId={profile.tenant_id as string}>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-bold text-lg truncate text-gray-900">{tenantName || 'Mi Negocio'}</h2>
            <div className="mt-1 flex flex-col">
              <span className="text-sm font-medium text-gray-700 truncate">👤 {profile.full_name || 'Usuario'}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">
                {/*   Rol: {profile.role}*/}
              </span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* 4. Usamos filteredMenu en lugar de MENU_ITEMS */}
            {filteredMenu.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <form action={logoutAction}>
              <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <span className="text-lg">🚪</span> Cerrar Sesión
              </button>
            </form>
          </div>
        </aside>

        {/* Contenido Principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* <NcfWarning /> */}
          <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
            <CartProvider>
              {children}
            </CartProvider>
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}