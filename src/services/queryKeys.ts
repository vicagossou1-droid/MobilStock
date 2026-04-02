export const queryKeys = {
  auth: ['auth'] as const,
  boutique: (boutiqueId: string | null) => ['boutique', boutiqueId] as const,
  paymentAccounts: (boutiqueId: string | null) => ['payment_accounts', boutiqueId] as const,
  stock: (boutiqueId: string | null) => ['stock', boutiqueId] as const,
  sales: (boutiqueId: string | null) => ['sales', boutiqueId] as const,
  users: (boutiqueId: string | null) => ['users', boutiqueId] as const,
  compatibilities: (boutiqueId: string | null) => ['compatibilities', boutiqueId] as const,
} as const;
