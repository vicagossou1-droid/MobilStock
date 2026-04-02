import type { Boutique } from '@/lib/supabaseTypes';

export interface PaymentAccount {
  id: string;
  boutique_id: string;
  operator: string;
  account_number: string;
  account_holder_name?: string | null;
  account_type?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type BoutiqueUpdateInput = Partial<
  Pick<Boutique, 'name' | 'address' | 'phone' | 'email' | 'stock_threshold' | 'logo_url'>
>;

export interface PaymentAccountInput {
  operator: string;
  account_number: string;
  account_type: string;
  account_holder_name?: string;
}
