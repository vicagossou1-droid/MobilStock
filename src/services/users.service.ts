import { supabase } from '@/lib/supabase';
import type { UserWithRole } from '@/modules/users/types';
import type { UserRole } from '@/types';
import { getErrorMessage } from '@/utils/errors';

interface RawUserRoleRow {
  id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  sales_count: number;
  created_at?: string;
  updated_at?: string;
  profile?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  } | null;
}

function mapUser(row: RawUserRoleRow): UserWithRole {
  const displayName = row.profile?.full_name?.trim() || 'Utilisateur';

  return {
    id: row.profile?.id ?? row.user_id,
    email: null,
    full_name: displayName,
    avatar_url: row.profile?.avatar_url ?? null,
    is_active: row.is_active,
    created_at: row.profile?.created_at ?? row.created_at ?? new Date().toISOString(),
    updated_at: row.profile?.updated_at ?? row.updated_at ?? new Date().toISOString(),
    role: row.role,
    sales_count: row.sales_count ?? 0,
    user_id: row.user_id,
    user_boutique_role_id: row.id,
  };
}

export async function fetchBoutiqueUsers(boutiqueId: string): Promise<UserWithRole[]> {
  const { data, error } = await supabase
    .from('user_boutique_roles')
    .select('id, user_id, role, is_active, sales_count, created_at, updated_at, profile:profiles(id, full_name, avatar_url, is_active, created_at, updated_at)')
    .eq('boutique_id', boutiqueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger les utilisateurs de la boutique.'));
  }

  return ((data ?? []) as RawUserRoleRow[]).map(mapUser);
}

export async function inviteUserToBoutique(): Promise<never> {
  throw new Error('L’invitation nécessite une API serveur sécurisée, absente de ce projet.');
}

export async function updateUserRole(boutiqueId: string, userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('user_boutique_roles')
    .update({ role })
    .eq('user_id', userId)
    .eq('boutique_id', boutiqueId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de mettre à jour le rôle utilisateur.'));
  }
}

export async function deactivateUserInBoutique(boutiqueId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_boutique_roles')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('boutique_id', boutiqueId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de désactiver cet utilisateur.'));
  }
}

export async function reactivateUserInBoutique(boutiqueId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_boutique_roles')
    .update({ is_active: true })
    .eq('user_id', userId)
    .eq('boutique_id', boutiqueId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de réactiver cet utilisateur.'));
  }
}
