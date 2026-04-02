import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, History, BarChart3,
  Settings, Users, Puzzle, Store, LogOut, Menu, X, UserCircle, Loader2,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/types";

const navigation = [
  { name: "Tableau de bord", href: "/app", icon: LayoutDashboard, minRole: "technicien" as const },
  { name: "Stock", href: "/app/stock", icon: Package, minRole: "vendeur" as const },
  { name: "Vente", href: "/app/vente", icon: ShoppingCart, minRole: "vendeur" as const },
  { name: "Historique", href: "/app/historique", icon: History, minRole: "vendeur" as const },
  { name: "Compatibilités", href: "/app/compatibilites", icon: Puzzle, minRole: "technicien" as const },
  { name: "Statistiques", href: "/app/statistiques", icon: BarChart3, minRole: "gerant" as const },
  { name: "Utilisateurs", href: "/app/utilisateurs", icon: Users, minRole: "gerant" as const },
  { name: "Paramètres", href: "/app/parametres", icon: Settings, minRole: "proprietaire" as const },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { hasMinRole, canAccessPage, role } = useAccessControl();
  const { user, profile, loading, signOut, activeBoutique } = useAuth();

  // Rediriger vers la connexion si l'utilisateur n'est pas authentifié
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // Mettre à jour l'icône du navigateur avec le logo de la boutique
  useEffect(() => {
    let isCancelled = false;

    const updateFavicon = async () => {
      let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }

      if (!activeBoutique?.logo_url) {
        return;
      }

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";

      image.onload = () => {
        if (isCancelled || !favicon) {
          return;
        }

        const size = 64;
        const radius = 14;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");

        if (!context) {
          favicon.href = activeBoutique.logo_url;
          return;
        }

        context.clearRect(0, 0, size, size);
        context.beginPath();
        context.moveTo(radius, 0);
        context.arcTo(size, 0, size, size, radius);
        context.arcTo(size, size, 0, size, radius);
        context.arcTo(0, size, 0, 0, radius);
        context.arcTo(0, 0, size, 0, radius);
        context.closePath();
        context.clip();
        context.drawImage(image, 0, 0, size, size);

        try {
          favicon.type = "image/png";
          favicon.href = canvas.toDataURL("image/png");
        } catch {
          favicon.href = activeBoutique.logo_url;
        }
      };

      image.onerror = () => {
        if (!isCancelled && favicon) {
          favicon.href = activeBoutique.logo_url;
        }
      };

      image.src = activeBoutique.logo_url;
    };

    void updateFavicon();

    return () => {
      isCancelled = true;
    };
  }, [activeBoutique?.logo_url]);

  useEffect(() => {
    if (!loading && user && !canAccessPage(location.pathname)) {
      navigate("/app", { replace: true });
    }
  }, [location.pathname, canAccessPage, loading, navigate, user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const visibleNav = navigation.filter((item) => hasMinRole(item.minRole));
  const displayName = profile?.full_name || user.email?.split("@")[0] || "Utilisateur";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar transition-transform duration-300 md:static md:translate-x-0 xl:w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden">
            {activeBoutique?.logo_url ? (
              <img src={activeBoutique.logo_url} alt="Logo boutique" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-sidebar-primary-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">{activeBoutique?.name || "MobilStock"}</h1>
            <p className="text-[11px] text-sidebar-foreground">MobilStock</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink key={item.name} to={item.href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button onClick={() => { navigate("/app/profil"); setSidebarOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <UserCircle className="h-[18px] w-[18px]" />
            )}
            Mon profil
          </button>
          <button onClick={() => signOut().then(() => navigate("/login", { replace: true }))}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            <LogOut className="h-[18px] w-[18px]" /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:px-6 xl:px-8">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            </div>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full object-cover border border-primary/20" />
            ) : activeBoutique?.logo_url ? (
              <img src={activeBoutique.logo_url} alt="Logo boutique" className="h-9 w-9 rounded-full object-cover border border-primary/20" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
