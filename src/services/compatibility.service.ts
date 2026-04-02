import { supabase } from '@/lib/supabase';
import type { CompatibilityItem } from '@/modules/compatibility/types';
import { getErrorMessage } from '@/utils/errors';

export async function fetchCompatibilities(boutiqueId: string): Promise<CompatibilityItem[]> {
  const { data, error } = await supabase
    .from('compatibilities')
    .select('*')
    .eq('boutique_id', boutiqueId)
    .is('deleted_at', null)
    .order('piece_name', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger les compatibilités.'));
  }

  return (data ?? []) as CompatibilityItem[];
}

export async function createCompatibility(
  boutiqueId: string,
  item: Pick<CompatibilityItem, 'piece_name' | 'piece_type' | 'supported_models'>,
): Promise<void> {
  const { error } = await supabase.from('compatibilities').insert({ ...item, boutique_id: boutiqueId });

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible d’ajouter la compatibilité.'));
  }
}

export async function updateCompatibility(
  id: string,
  updates: Partial<Pick<CompatibilityItem, 'piece_name' | 'piece_type' | 'supported_models'>>,
): Promise<void> {
  const { error } = await supabase.from('compatibilities').update(updates).eq('id', id);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de mettre à jour la compatibilité.'));
  }
}

export async function deleteCompatibility(id: string): Promise<void> {
  const { error } = await supabase
    .from('compatibilities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de supprimer la compatibilité.'));
  }
}
