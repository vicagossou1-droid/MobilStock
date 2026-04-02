export interface CompatibilityItem {
  id: string;
  boutique_id: string;
  piece_name: string;
  piece_type?: string | null;
  supported_models: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
