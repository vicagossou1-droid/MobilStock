import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Store, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/app", { replace: true });
    }
  }, [authLoading, navigate, user]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    
    if (!email.includes("@")) {
      setError("Email invalide");
      return;
    }
    
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success(`Bienvenue, ${email.split("@")[0]}!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur d'authentification";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 shadow-elevated">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MobilStock</h1>
          <p className="text-sm text-muted-foreground mt-1">Connectez-vous à votre boutique</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="rounded-xl bg-card border p-6 shadow-card space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@boutique.com"
              disabled={isLoading || authLoading}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading || authLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || authLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={isLoading || authLoading}>
            {isLoading || authLoading ? "Connexion en cours..." : "Se connecter"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            En cas d’oubli du mot de passe, contactez l’administrateur de votre boutique.
          </p>
        </form>
      </div>
    </div>
  );
}
