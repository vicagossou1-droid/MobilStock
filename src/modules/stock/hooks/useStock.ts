import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { createStockItem, deleteStockItem, fetchStockItems, updateStockItem as saveStockItem } from '@/services/stock.service';
import { queryKeys } from '@/services/queryKeys';
import type { StockItem, StockItemFormValues } from '@/modules/stock/types';
import { getErrorMessage } from '@/utils/errors';

export function useStock() {
  const { activeBoutiqueId } = useAuth();
  const queryClient = useQueryClient();
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const {
    data: items = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.stock(activeBoutiqueId),
    queryFn: () => fetchStockItems(activeBoutiqueId!),
    enabled: Boolean(activeBoutiqueId),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const error = queryError ? getErrorMessage(queryError, 'Erreur lors du chargement du stock') : null;

  const addItem = useCallback(
    async (item: StockItemFormValues) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      const createdItem = await createStockItem(activeBoutiqueId, item);
      queryClient.setQueryData(queryKeys.stock(activeBoutiqueId), (current: StockItem[] | undefined) => [createdItem, ...(current ?? [])]);
      return createdItem;
    },
    [activeBoutiqueId, queryClient],
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<StockItemFormValues>) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      const updatedItem = await saveStockItem(id, updates);
      queryClient.setQueryData(queryKeys.stock(activeBoutiqueId), (current: StockItem[] | undefined) =>
        (current ?? []).map((item) => (item.id === id ? updatedItem : item)),
      );
      return updatedItem;
    },
    [activeBoutiqueId, queryClient],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      await deleteStockItem(id);
      queryClient.setQueryData(queryKeys.stock(activeBoutiqueId), (current: StockItem[] | undefined) =>
        (current ?? []).filter((item) => item.id !== id),
      );
    },
    [activeBoutiqueId, queryClient],
  );

  const searchItems = useCallback(
    (query: string): StockItem[] => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) {
        return items;
      }

      return items.filter(
        (item) =>
          item.nom.toLowerCase().includes(normalizedQuery) ||
          item.modele.toLowerCase().includes(normalizedQuery) ||
          item.marque.toLowerCase().includes(normalizedQuery),
      );
    },
    [items],
  );

  const getLowStockItems = useCallback(
    (threshold = 5): StockItem[] => items.filter((item) => item.quantite <= threshold),
    [items],
  );

  useEffect(() => {
    if (!activeBoutiqueId) {
      return;
    }

    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`stock-${activeBoutiqueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_items',
          filter: `boutique_id=eq.${activeBoutiqueId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.stock(activeBoutiqueId) });
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [activeBoutiqueId, queryClient]);

  return {
    items,
    data: items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    getLowStockItems,
  };
}
