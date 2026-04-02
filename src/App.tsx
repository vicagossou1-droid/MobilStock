import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import RouteSeo from "@/components/RouteSeo";
import { AuthProvider } from "@/providers/AuthProvider";
import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { useAppStore } from "@/store/useAppStore";
import { applyTheme, getStoredTheme } from "@/utils/theme";

const queryClient = new QueryClient();
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const StockPage = lazy(() => import("@/pages/StockPage"));
const VentePage = lazy(() => import("@/pages/VentePage"));
const HistoriquePage = lazy(() => import("@/pages/HistoriquePage"));
const StatistiquesPage = lazy(() => import("@/pages/StatistiquesPage"));
const CompatibilitesPage = lazy(() => import("@/pages/CompatibilitesPage"));
const UtilisateursPage = lazy(() => import("@/pages/UtilisateursPage"));
const ParametresPage = lazy(() => import("@/pages/ParametresPage"));
const ProfilPage = lazy(() => import("@/pages/ProfilPage"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const RouteLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

const RouteContent = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteLoader />}>
    {children}
  </Suspense>
);

if (typeof window !== 'undefined') {
  applyTheme(getStoredTheme());
}

const App = () => {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteSeo />
            <RouteContent>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/app" element={<AppLayout><Dashboard /></AppLayout>} />
                <Route path="/app/stock" element={<AppLayout><StockPage /></AppLayout>} />
                <Route path="/app/vente" element={<AppLayout><VentePage /></AppLayout>} />
                <Route path="/app/historique" element={<AppLayout><HistoriquePage /></AppLayout>} />
                <Route path="/app/compatibilites" element={<AppLayout><CompatibilitesPage /></AppLayout>} />
                <Route path="/app/statistiques" element={<AppLayout><StatistiquesPage /></AppLayout>} />
                <Route path="/app/utilisateurs" element={<AppLayout><UtilisateursPage /></AppLayout>} />
                <Route path="/app/parametres" element={<AppLayout><ParametresPage /></AppLayout>} />
                <Route path="/app/profil" element={<AppLayout><ProfilPage /></AppLayout>} />
                <Route path="/stock" element={<Navigate to="/app/stock" replace />} />
                <Route path="/vente" element={<Navigate to="/app/vente" replace />} />
                <Route path="/historique" element={<Navigate to="/app/historique" replace />} />
                <Route path="/compatibilites" element={<Navigate to="/app/compatibilites" replace />} />
                <Route path="/statistiques" element={<Navigate to="/app/statistiques" replace />} />
                <Route path="/utilisateurs" element={<Navigate to="/app/utilisateurs" replace />} />
                <Route path="/parametres" element={<Navigate to="/app/parametres" replace />} />
                <Route path="/profil" element={<Navigate to="/app/profil" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteContent>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
