import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/services/queryKeys';
import {
  deactivateUserInBoutique,
  fetchBoutiqueUsers,
  inviteUserToBoutique,
  reactivateUserInBoutique,
  updateUserRole as saveUserRole,
} from '@/services/users.service';
import type { UserRole } from '@/types';
import { getErrorMessage } from '@/utils/errors';

export function useUsers() {
  const { activeBoutiqueId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.users(activeBoutiqueId),
    queryFn: () => fetchBoutiqueUsers(activeBoutiqueId!),
    enabled: Boolean(activeBoutiqueId),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const error = queryError ? getErrorMessage(queryError, 'Erreur lors du chargement des utilisateurs') : null;

  const inviteUser = useCallback(
    async (email: string, role: UserRole, fullName: string) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      await inviteUserToBoutique();
      await queryClient.invalidateQueries({ queryKey: queryKeys.users(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  const updateUserRole = useCallback(
    async (userId: string, role: UserRole) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      await saveUserRole(activeBoutiqueId, userId, role);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  const deactivateUser = useCallback(
    async (userId: string) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      await deactivateUserInBoutique(activeBoutiqueId, userId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  const reactivateUser = useCallback(
    async (userId: string) => {
      if (!activeBoutiqueId) {
        throw new Error('Aucune boutique sélectionnée');
      }

      await reactivateUserInBoutique(activeBoutiqueId, userId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users(activeBoutiqueId) });
    },
    [activeBoutiqueId, queryClient],
  );

  const getUserSalesCount = useCallback(
    (userId: string) => users.find((user) => user.user_id === userId)?.sales_count ?? 0,
    [users],
  );

  return {
    users,
    loading,
    error,
    inviteUser,
    updateUserRole,
    deactivateUser,
    reactivateUser,
    getUserSalesCount,
  };
}
