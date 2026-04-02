import { supabase } from '@/lib/supabase';
import type { Boutique } from '@/lib/supabaseTypes';
import type { BoutiqueUpdateInput, PaymentAccount, PaymentAccountInput } from '@/modules/boutique/types';
import { getErrorMessage } from '@/utils/errors';

export async function fetchBoutique(boutiqueId: string): Promise<Boutique | null> {
  const { data, error } = await supabase.from('boutiques').select('*').eq('id', boutiqueId).maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger la boutique active.'));
  }

  return data as Boutique | null;
}

export async function updateBoutique(boutiqueId: string, updates: BoutiqueUpdateInput): Promise<Boutique> {
  const { data, error } = await supabase
    .from('boutiques')
    .update(updates)
    .eq('id', boutiqueId)
    .select('*')
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de mettre à jour les paramètres de la boutique.'));
  }

  return data as Boutique;
}

export async function fetchPaymentAccounts(boutiqueId: string): Promise<PaymentAccount[]> {
  const { data, error } = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('boutique_id', boutiqueId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('operator', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de charger les comptes de paiement.'));
  }

  return (data ?? []) as PaymentAccount[];
}

export async function createPaymentAccount(boutiqueId: string, input: PaymentAccountInput): Promise<PaymentAccount> {
  const { data, error } = await supabase
    .from('payment_accounts')
    .insert({
      boutique_id: boutiqueId,
      operator: input.operator,
      account_number: input.account_number,
      account_type: input.account_type,
      account_holder_name: input.account_holder_name,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible d’ajouter le compte de paiement.'));
  }

  return data as PaymentAccount;
}

export async function deletePaymentAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('payment_accounts')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', accountId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Impossible de supprimer le compte de paiement.'));
  }
}
