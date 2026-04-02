export interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  is_super_admin?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Boutique {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  stock_threshold: number;
  logo_url?: string | null;
  subscription_tier?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserBoutiqueRole {
  id: string;
  user_id: string;
  boutique_id: string;
  role: 'super_admin' | 'proprietaire' | 'gerant' | 'vendeur' | 'technicien';
  is_active: boolean;
  sales_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface StockItem {
  id: string;
  boutique_id: string;
  brand: string;
  series?: string | null;
  model: string;
  part_type: string;
  name: string;
  sku?: string | null;
  price_client: number;
  price_technician: number;
  quantity_on_hand: number;
  location_code?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Sale {
  id: string;
  boutique_id: string;
  sale_number?: string | null;
  sale_type: 'catalogue' | 'libre';
  client_type: 'simple' | 'technicien';
  vendor_id: string;
  total_amount: number;
  sale_date: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  stock_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Compatibility {
  id: string;
  boutique_id: string;
  piece_name: string;
  piece_type?: string | null;
  supported_models: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
