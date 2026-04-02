import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { CreateSaleInput } from '@/modules/sales/types';
import { createSale as saveSale, fetchSales } from '@/services/sales.service';
import { queryKeys } from '@/services/queryKeys';
import { getErrorMessage } from '@/utils/errors';

export function useSales() {
  const { activeBoutiqueId, user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: sales = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.sales(activeBoutiqueId),
    queryFn: () => fetchSales(activeBoutiqueId!),
    enabled: Boolean(activeBoutiqueId),
    staleTime: 30000,
    gcTime: 300000,
  });

  const error = queryError ? getErrorMessage(queryError, 'Erreur lors du chargement des ventes') : null;

  const createSale = useCallback(
    async (input: CreateSaleInput) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const saleId = await saveSale(activeBoutiqueId, user.id, input);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sales(activeBoutiqueId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stock(activeBoutiqueId) }),
      ]);
      return saleId;
    },
    [activeBoutiqueId, queryClient, user?.id],
  );

  return { sales, data: sales, loading, error, createSale };
}
