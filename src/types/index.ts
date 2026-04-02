export type UserRole = "super_admin" | "proprietaire" | "gerant" | "vendeur" | "technicien";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super admin",
  proprietaire: "Propriétaire",
  gerant: "Gérant",
  vendeur: "Vendeur",
  technicien: "Technicien",
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 5,
  proprietaire: 4,
  gerant: 3,
  vendeur: 2,
  technicien: 1,
};

export const MARQUES = ["Apple", "Samsung", "Xiaomi", "Huawei", "Infinix", "Tecno", "Itel", "Oppo", "Vivo", "Realme", "Nokia", "Motorola"];
export const TYPES_PIECE = ["Écran", "Batterie", "Nappe", "Connecteur", "Caméra", "Haut-parleur", "Vitre", "Bouton", "Châssis", "Autre"];
