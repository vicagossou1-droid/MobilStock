import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Boutique, Profile } from '@/lib/supabaseTypes';
import {
  fetchProfile,
  fetchUserBoutiqueRoles,
  getCurrentSessionUser,
  getStoredActiveBoutiqueId,
  setStoredActiveBoutiqueId,
  signInWithPassword,
  signOutUser,
  type UserBoutiqueRoleWithBoutique,
} from '@/services/auth.service';
import { queryKeys } from '@/services/queryKeys';
import { getErrorMessage, logDevError } from '@/utils/errors';
import type { UserRole } from '@/types';

interface AuthContextValue {
  user: Awaited<ReturnType<typeof getCurrentSessionUser>>;
  profile: Profile | null;
  userBoutiqueRoles: UserBoutiqueRoleWithBoutique[];
  activeBoutiqueId: string | null;
  activeBoutique: Boutique | null;
  activeRole: UserRole | null;
  setActiveBoutiqueId: (boutiqueId: string | null) => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBoutiques: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function resolveActiveBoutiqueId(
  requestedBoutiqueId: string | null,
  roles: UserBoutiqueRoleWithBoutique[],
): string | null {
  if (!roles.length) {
    return null;
  }

  if (requestedBoutiqueId && roles.some((role) => role.boutique_id === requestedBoutiqueId)) {
    return requestedBoutiqueId;
  }

  return roles[0].boutique_id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentSessionUser>>>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userBoutiqueRoles, setUserBoutiqueRoles] = useState<UserBoutiqueRoleWithBoutique[]>([]);
  const [activeBoutiqueId, setActiveBoutiqueIdState] = useState<string | null>(() => getStoredActiveBoutiqueId());
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setUserBoutiqueRoles([]);
    setActiveBoutiqueIdState(null);
    setStoredActiveBoutiqueId(null);
  }, []);

  const applyAuthState = useCallback(
    async (nextUser: Awaited<ReturnType<typeof getCurrentSessionUser>>) => {
      if (!nextUser) {
        resetAuthState();
        return;
      }

      const [nextProfile, nextRoles] = await Promise.all([
        fetchProfile(nextUser.id),
        fetchUserBoutiqueRoles(nextUser.id),
      ]);

      const resolvedBoutiqueId = resolveActiveBoutiqueId(getStoredActiveBoutiqueId(), nextRoles);

      setUser(nextUser);
      setProfile(nextProfile);
      setUserBoutiqueRoles(nextRoles);
      setActiveBoutiqueIdState(resolvedBoutiqueId);
      setStoredActiveBoutiqueId(resolvedBoutiqueId);
    },
    [resetAuthState],
  );

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setLoading(true);

      try {
        const currentUser = await getCurrentSessionUser();

        if (!isMounted) {
          return;
        }

        await applyAuthState(currentUser);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        logDevError('auth.initialize', error);
        resetAuthState();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const isSameUser = nextUserId !== null && nextUserId === currentUserIdRef.current;

      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        resetAuthState();
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      if (isSameUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setUser(nextUser);
        return;
      }

      void applyAuthState(nextUser)
        .catch((error) => {
          logDevError('auth.state_change', error);
          resetAuthState();
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applyAuthState, queryClient, resetAuthState]);

  const setActiveBoutiqueId = useCallback(
    (boutiqueId: string | null) => {
      const resolvedBoutiqueId = resolveActiveBoutiqueId(boutiqueId, userBoutiqueRoles);
      setActiveBoutiqueIdState(resolvedBoutiqueId);
      setStoredActiveBoutiqueId(resolvedBoutiqueId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.boutique(resolvedBoutiqueId) });
    },
    [queryClient, userBoutiqueRoles],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);

    try {
      const nextUser = await signInWithPassword(email, password);
      await applyAuthState(nextUser);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'La connexion a échoué.'));
    } finally {
      setLoading(false);
    }
  }, [applyAuthState]);

  const signOut = useCallback(async () => {
    setLoading(true);

    try {
      await signOutUser();
      queryClient.clear();
      setUser(null);
      setProfile(null);
      setUserBoutiqueRoles([]);
      setActiveBoutiqueIdState(null);
      setStoredActiveBoutiqueId(null);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'La déconnexion a échoué.'));
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    const nextProfile = await fetchProfile(user.id);
    setProfile(nextProfile);
  }, [user]);

  const refreshBoutiques = useCallback(async () => {
    if (!user) {
      return;
    }

    const roles = await fetchUserBoutiqueRoles(user.id);
    const resolvedBoutiqueId = resolveActiveBoutiqueId(activeBoutiqueId, roles);
    setUserBoutiqueRoles(roles);
    setActiveBoutiqueIdState(resolvedBoutiqueId);
    setStoredActiveBoutiqueId(resolvedBoutiqueId);
  }, [activeBoutiqueId, user]);

  const activeBoutique = useMemo(
    () => userBoutiqueRoles.find((role) => role.boutique_id === activeBoutiqueId)?.boutique ?? null,
    [activeBoutiqueId, userBoutiqueRoles],
  );

  const activeRole = useMemo<UserRole | null>(
    () => userBoutiqueRoles.find((role) => role.boutique_id === activeBoutiqueId)?.role ?? null,
    [activeBoutiqueId, userBoutiqueRoles],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      userBoutiqueRoles,
      activeBoutiqueId,
      activeBoutique,
      activeRole,
      setActiveBoutiqueId,
      loading,
      signIn,
      signOut,
      refreshProfile,
      refreshBoutiques,
    }),
    [
      activeBoutique,
      activeBoutiqueId,
      activeRole,
      loading,
      profile,
      refreshBoutiques,
      refreshProfile,
      setActiveBoutiqueId,
      signIn,
      signOut,
      user,
      userBoutiqueRoles,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
