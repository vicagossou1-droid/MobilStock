import type { UserRole } from '@/types';

export interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role: UserRole;
  sales_count: number;
  user_id: string;
  user_boutique_role_id: string;
}
