import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { createPaymentAccount, deletePaymentAccount, fetchBoutique, fetchPaymentAccounts, updateBoutique as saveBoutique } from '@/services/boutique.service';
import { queryKeys } from '@/services/queryKeys';
import type { BoutiqueUpdateInput, PaymentAccountInput } from '@/modules/boutique/types';

export function useBoutique() {
  const { activeBoutiqueId } = useAuth();
  const queryClient = useQueryClient();

  const { data: boutique = null, isLoading: boutiqueLoading } = useQuery({
    queryKey: queryKeys.boutique(activeBoutiqueId),
    queryFn: () => fetchBoutique(activeBoutiqueId!),
    enabled: Boolean(activeBoutiqueId),
    staleTime: 300000,
  });

  const { data: paymentAccounts = [], isLoading: paymentAccountsLoading } = useQuery({
    queryKey: queryKeys.paymentAccounts(activeBoutiqueId),
    queryFn: () => fetchPaymentAccounts(activeBoutiqueId!),
    enabled: Boolean(activeBoutiqueId),
    staleTime: 300000,
  });

  const updateBoutique = useCallback(
    async (updates: BoutiqueUpdateInput) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée.');
      }

      const result = await saveBoutique(activeBoutiqueId, updates);
      await queryClient.invalidateQueries({ queryKey: queryKeys.boutique(activeBoutiqueId) });
      return result;
    },
    [activeBoutiqueId, queryClient],
  );

  const addPaymentAccount = useCallback(
    async (input: PaymentAccountInput) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée.');
      }

      await createPaymentAccount(activeBoutiqueId, input);
      await queryClient.invalidateQueries({ queryKey: queryKeys.paymentAccounts(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  const removePaymentAccount = useCallback(
    async (accountId: string) => {
      await deletePaymentAccount(accountId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.paymentAccounts(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  return {
    boutique,
    paymentAccounts,
    loading: boutiqueLoading || paymentAccountsLoading,
    updateBoutique,
    addPaymentAccount,
    deletePaymentAccount: removePaymentAccount,
  };
}
