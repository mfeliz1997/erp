export type UserRole = 'admin' | 'manager' | 'pos' | 'hr';

export interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  allowed_routes: string[];
  can_give_credit: boolean;
  max_credit_days: number;
  can_use_card: boolean;
  can_use_transfer: boolean;
  can_sell_without_shift: boolean;
  assigned_register_id: string | null;
  pin_code: string | null;
  is_owner: boolean;
  created_at: string;
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export const ROLE_DEFAULT_ROUTES: Record<UserRole, string[]> = {
  admin:   [],
  manager: ['/pos', '/inventory', '/invoices'],
  pos:     ['/pos'],
  hr:      [],
};

export const ALL_ROUTES = [
  { path: '/overview',       label: 'Resumen'             },
  { path: '/pos',            label: 'Punto de Venta'      },
  { path: '/cash-register',  label: 'Caja'                },
  { path: '/inventory',      label: 'Inventario'          },
  { path: '/purchases',      label: 'Compras'             },
  { path: '/invoices',       label: 'Historial de Ventas' },
  { path: '/customers',      label: 'Clientes'            },
  { path: '/debts',          label: 'Cuentas por Cobrar'  },
  { path: '/reports',        label: 'Reportes'            },
  { path: '/fiscal',         label: 'Gestión Fiscal'      },
  { path: '/activity',       label: 'Auditoría'           },
  { path: '/settings',       label: 'Configuración'       },
];
