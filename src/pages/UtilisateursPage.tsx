import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Shield, ShoppingCart, Eye, Trash2, Building2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { useAccessControl } from "@/hooks/useAccessControl";
import { ROLE_LABELS } from "@/types";
import type { UserRole } from "@/types";

const roleIcons: Record<string, ReactNode> = {
  super_admin: <Shield className="h-3.5 w-3.5" />,
  proprietaire: <Shield className="h-3.5 w-3.5" />,
  gerant: <Building2 className="h-3.5 w-3.5" />,
  vendeur: <ShoppingCart className="h-3.5 w-3.5" />,
  technicien: <Eye className="h-3.5 w-3.5" />,
};

const roleColors: Record<string, string> = {
  super_admin: "bg-primary/10 text-primary",
  proprietaire: "bg-primary/10 text-primary",
  gerant: "bg-info/10 text-info",
  vendeur: "bg-muted text-muted-foreground",
  technicien: "bg-warning/10 text-warning",
};

export default function UtilisateursPage() {
  const { users, loading, error, inviteUser, updateUserRole, deactivateUser } = useUsers();
  const { user: currentSessionUser } = useAuth();
  const { canManageUsers, canManageAllUsers, role } = useAccessControl();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", role: "vendeur" as UserRole });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Un gérant ne peut gérer que les vendeurs, tandis qu'un propriétaire peut gérer tous les utilisateurs.
  const availableRoles: UserRole[] = canManageAllUsers
    ? ["super_admin", "proprietaire", "gerant", "vendeur", "technicien"]
    : ["vendeur"];

  const canEditUser = (userRole: UserRole) => {
    if (role === "super_admin" || role === "proprietaire") return true;
    if (role === "gerant" && userRole === "vendeur") return true;
    return false;
  };

  const canDeleteUser = (userRole: UserRole) => canEditUser(userRole);

  const resetForm = () => {
    setForm({ fullName: "", email: "", role: "vendeur" });
    setEditingUserId(null);
    setEditMode(false);
    setIsSubmitting(false);
  };

  const handleInviteOrUpdate = async () => {
    if (!form.fullName || !form.email) return;
    if (!canManageUsers) return;

    setIsSubmitting(true);
    try {
      if (editMode && editingUserId) {
        // Mettre à jour uniquement le rôle (le nom complet et l'email ne sont pas modifiables).
        await updateUserRole(editingUserId, form.role);
        toast.success("Rôle mis à jour", { description: `${form.fullName} (${ROLE_LABELS[form.role]})` });
      } else {
        // Inviter un nouvel utilisateur.
        await inviteUser(form.email, form.role, form.fullName);
        toast.success("Invitation envoyée", { description: `${form.fullName} en tant que ${ROLE_LABELS[form.role]}` });
      }
      resetForm();
      setInviteOpen(false);
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : "Une erreur est survenue" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    const user = users.find((u) => u.user_id === userId);
    if (!user || userId === currentSessionUser?.id) return;
    if (!canDeleteUser(user.role)) {
      toast.error("Droits insuffisants pour désactiver cet utilisateur");
      return;
    }
    if (!window.confirm(`Confirmer la désactivation de ${userName} ?`)) return;

    try {
      await deactivateUser(userId);
      toast.success("Utilisateur désactivé", { description: userName });
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : "Une erreur est survenue" });
    }
  };

  const onEditUser = (user: (typeof users)[0]) => {
    if (!canEditUser(user.role)) {
      toast.error("Droits insuffisants pour modifier cet utilisateur");
      return;
    }
    setEditMode(true);
    setEditingUserId(user.user_id);
    setForm({ fullName: user.full_name, email: user.email ?? "", role: user.role });
    setInviteOpen(true);
  };

  return (
    <div>
      {loading && users.length === 0 && (
        <div>
          <PageHeader title="Utilisateurs" description="Chargement des utilisateurs...">
            <Button disabled><Plus className="h-4 w-4 mr-2" /> Inviter</Button>
          </PageHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border p-5 animate-pulse">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!(loading && users.length === 0) && (
        <>
          <PageHeader title="Utilisateurs" description="Gérez les accès à votre boutique">
            {canManageUsers ? (
              <Button onClick={() => { resetForm(); setInviteOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Inviter</Button>
            ) : (
              <span className="text-xs text-muted-foreground">(Accès lecture seule)</span>
            )}
          </PageHeader>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun utilisateur pour cette boutique</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up delay-1">
              {users.map((user) => (
                <div key={user.user_id} className="rounded-xl bg-card border p-5 hover:shadow-card-hover transition-all duration-200 hover:border-primary/30">
                  <div className="flex items-start gap-3 mb-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="h-11 w-11 rounded-full object-cover border border-primary/20 shrink-0" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                        {(user.full_name || 'U').split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email ?? "Email non disponible"}</p>
                    </div>
                    {!user.is_active && (
                      <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground shrink-0">
                        Inactif
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", roleColors[user.role] || "bg-muted text-muted-foreground")}>
                        {roleIcons[user.role]} 
                        <span className="hidden sm:inline">{ROLE_LABELS[user.role]}</span>
                      </span>
                      {user.sales_count > 0 && (
                        <span className="text-xs text-muted-foreground font-medium bg-muted/30 px-2 py-1 rounded">
                          {user.sales_count}v
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {canEditUser(user.role) && user.user_id !== currentSessionUser?.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 shrink-0" onClick={() => onEditUser(user)}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDeleteUser(user.role) && user.user_id !== currentSessionUser?.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDeactivate(user.user_id, user.full_name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Modifier le rôle" : "Inviter un utilisateur"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium">Nom complet *</Label>
              <Input 
                id="fullName" 
                value={form.fullName} 
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} 
                placeholder="Ex. : Jean Dupont" 
                className="mt-1.5"
                disabled={editMode || isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                placeholder="nom@boutique.com" 
                className="mt-1.5"
                disabled={editMode || isSubmitting}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Rôle</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    disabled={isSubmitting}
                    className={cn(
                      "flex items-center justify-center px-3 py-2.5 rounded-lg border-2 font-medium text-sm transition-all duration-150",
                      form.role === r
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <Button 
              onClick={handleInviteOrUpdate} 
              disabled={!form.fullName || !form.email || !canManageUsers || isSubmitting}
              size="lg"
              className="w-full mt-2"
            >
              {isSubmitting ? "En cours..." : editMode ? "Mettre à jour le rôle" : "Envoyer l'invitation"}
            </Button>
            {!canManageUsers && <p className="text-xs text-muted-foreground text-center">Vous n'êtes pas autorisé à modifier les utilisateurs.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
