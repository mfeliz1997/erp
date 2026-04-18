export type UserRole = 'admin' | 'pos' | 'hr';

export interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}
