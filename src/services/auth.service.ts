import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Boutique, Profile, UserBoutiqueRole } from '@/lib/supabaseTypes';
import { getErrorMessage } from '@/utils/errors';

export interface UserBoutiqueRoleWithBoutique extends UserBoutiqueRole {
  boutique?: Boutique | null;
}

const STORAGE_KEY = 'mobilstock_active_boutique';

export function getStoredActiveBoutiqueId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredActiveBoutiqueId(boutiqueId: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (boutiqueId) {
    localStorage.setItem(STORAGE_KEY, boutiqueId);
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

export async function getCurrentSessionUser(): Promise<Session['user'] | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de récupérer la session utilisateur.'));
  }

  return session?.user ?? null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger le profil utilisateur.'));
  }

  return data as Profile | null;
}

export async function fetchUserBoutiqueRoles(userId: string): Promise<UserBoutiqueRoleWithBoutique[]> {
  const { data, error } = await supabase
    .from('user_boutique_roles')
    .select('*, boutique:boutiques(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger les boutiques de l’utilisateur.'));
  }

  return (data ?? []) as UserBoutiqueRoleWithBoutique[];
}

export async function signInWithPassword(email: string, password: string): Promise<Session['user'] | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(getErrorMessage(error, 'Identifiants invalides.'));
  }

  return user;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(getErrorMessage(error, 'La déconnexion a échoué.'));
  }
}
