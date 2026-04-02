import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { createCompatibility, deleteCompatibility as removeCompatibility, fetchCompatibilities, updateCompatibility as editCompatibility } from '@/services/compatibility.service';
import { queryKeys } from '@/services/queryKeys';

export function useCompatibilities() {
  const { activeBoutiqueId } = useAuth();
  const queryClient = useQueryClient();

  const { data: compatibilities = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.compatibilities(activeBoutiqueId),
    queryFn: () => fetchCompatibilities(activeBoutiqueId!),
    enabled: Boolean(activeBoutiqueId),
    staleTime: 60000,
  });

  const addCompatibility = useCallback(
    async (item: { piece_name: string; piece_type?: string; supported_models: string[] }) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée.');
      }

      await createCompatibility(activeBoutiqueId, item);
      await queryClient.invalidateQueries({ queryKey: queryKeys.compatibilities(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  const updateCompatibility = useCallback(
    async (id: string, updates: Partial<{ piece_name: string; supported_models: string[] }>) => {
      await editCompatibility(id, updates);
      await queryClient.invalidateQueries({ queryKey: queryKeys.compatibilities(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  const deleteCompatibility = useCallback(
    async (id: string) => {
      await removeCompatibility(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.compatibilities(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  return { compatibilities, loading, addCompatibility, updateCompatibility, deleteCompatibility };
}
