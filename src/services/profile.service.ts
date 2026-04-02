import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabaseTypes';
import { getErrorMessage } from '@/utils/errors';

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>): Promise<void> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de mettre à jour le profil.'));
  }
}
