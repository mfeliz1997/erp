export type UserRole = 'admin' | 'pos' | 'hr';

export interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  role: UserRole;
  can_sell_on_credit: boolean;
  max_credit_days: number;
  created_at: string;
}
