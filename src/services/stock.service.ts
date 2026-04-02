import { supabase } from '@/lib/supabase';
import type { StockItem as SupabaseStockItem } from '@/lib/supabaseTypes';
import type { StockItem, StockItemFormValues } from '@/modules/stock/types';
import { getErrorMessage } from '@/utils/errors';

export function mapStockItem(item: SupabaseStockItem): StockItem {
  return {
    id: item.id,
    marque: item.brand,
    serie: item.series ?? '',
    modele: item.model,
    typePiece: item.part_type,
    nom: item.name,
    sku: item.sku ?? undefined,
    quantite: item.quantity_on_hand,
    prixClient: item.price_client,
    prixTechnicien: item.price_technician,
    emplacement: item.location_code ?? '',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapStockItemToDatabase(item: Partial<StockItemFormValues>, boutiqueId?: string) {
  return {
    ...(boutiqueId ? { boutique_id: boutiqueId } : {}),
    ...(item.marque !== undefined ? { brand: item.marque } : {}),
    ...(item.serie !== undefined ? { series: item.serie || null } : {}),
    ...(item.modele !== undefined ? { model: item.modele } : {}),
    ...(item.typePiece !== undefined ? { part_type: item.typePiece } : {}),
    ...(item.nom !== undefined ? { name: item.nom } : {}),
    ...(item.sku !== undefined ? { sku: item.sku || null } : {}),
    ...(item.quantite !== undefined ? { quantity_on_hand: item.quantite } : {}),
    ...(item.prixClient !== undefined ? { price_client: item.prixClient } : {}),
    ...(item.prixTechnicien !== undefined ? { price_technician: item.prixTechnicien } : {}),
    ...(item.emplacement !== undefined ? { location_code: item.emplacement || null } : {}),
  };
}

export async function fetchStockItems(boutiqueId: string): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('boutique_id', boutiqueId)
    .is('deleted_at', null)
    .order('brand', { ascending: true })
    .order('model', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger le stock.'));
  }

  return (data ?? []).map((item) => mapStockItem(item as SupabaseStockItem));
}

export async function createStockItem(boutiqueId: string, item: StockItemFormValues): Promise<StockItem> {
  const { data, error } = await supabase
    .from('stock_items')
    .insert(mapStockItemToDatabase(item, boutiqueId))
    .select('*')
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible d’ajouter la pièce au stock.'));
  }

  return mapStockItem(data as SupabaseStockItem);
}

export async function updateStockItem(id: string, updates: Partial<StockItemFormValues>): Promise<StockItem> {
  const { data, error } = await supabase
    .from('stock_items')
    .update(mapStockItemToDatabase(updates))
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de mettre à jour la pièce.'));
  }

  return mapStockItem(data as SupabaseStockItem);
}

export async function deleteStockItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de supprimer la pièce.'));
  }
}
