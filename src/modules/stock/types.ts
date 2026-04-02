export interface StockItem {
  id: string;
  marque: string;
  serie: string;
  modele: string;
  typePiece: string;
  nom: string;
  sku?: string;
  quantite: number;
  prixClient: number;
  prixTechnicien: number;
  emplacement: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StockItemFormValues = Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>;
