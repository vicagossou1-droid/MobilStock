export type ClientType = 'simple' | 'technicien';
export type SaleMode = 'catalogue' | 'libre';
export type PaymentMethod = 'cash' | 'mobile';

export interface CartItem {
  id: string;
  nom: string;
  modele: string;
  prix: number;
  prixCatalogue: number;
  quantite: number;
  stockDisponible: number;
}

export interface SaleVendor {
  full_name?: string | null;
}

export interface SaleLineItem {
  id: string;
  stock_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  stock_item?: {
    name?: string | null;
    brand?: string | null;
    model?: string | null;
  } | null;
}

export interface SalePayment {
  id: string;
  payment_method: PaymentMethod;
  amount: number;
  operator?: string | null;
  reference_number?: string | null;
}

export interface SaleRecord {
  id: string;
  sale_type: SaleMode;
  client_type: ClientType;
  total_amount: number;
  sale_date: string;
  vendor?: SaleVendor | null;
  items?: SaleLineItem[];
  payments?: SalePayment[];
}

export interface SaleItemInput {
  stock_item_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleInput {
  sale_type: SaleMode;
  client_type: ClientType;
  items: SaleItemInput[];
  payment: {
    method: PaymentMethod;
    amount: number;
    operator?: string;
    reference_number?: string;
  };
}
