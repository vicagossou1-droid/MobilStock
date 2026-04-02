import { useAuth } from "@/hooks/useAuth";
import { ROLE_HIERARCHY, type UserRole } from "@/types";

const PAGE_MIN_ROLE: Record<string, UserRole> = {
  "/app": "technicien",
  "/app/stock": "vendeur",
  "/app/vente": "vendeur",
  "/app/historique": "vendeur",
  "/app/compatibilites": "technicien",
  "/app/statistiques": "gerant",
  "/app/utilisateurs": "gerant",
  "/app/parametres": "proprietaire",
  "/app/profil": "technicien",
};

export function useAccessControl() {
  const { activeRole } = useAuth();
  const role = activeRole ?? "technicien";

  const hasMinRole = (minRole: UserRole) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];

  const canAccessPage = (path: string) => {
    const minRole = PAGE_MIN_ROLE[path];
    if (!minRole) {
      return true;
    }
    return hasMinRole(minRole);
  };

  const canManageUsers = hasMinRole("gerant");
  const canManageAllUsers = role === "proprietaire" || role === "super_admin";
  const canManageSettings = role === "proprietaire" || role === "super_admin";
  const canViewStats = hasMinRole("gerant");
  const canSell = hasMinRole("vendeur");

  return { role, hasMinRole, canAccessPage, canManageUsers, canManageAllUsers, canManageSettings, canViewStats, canSell };
}
