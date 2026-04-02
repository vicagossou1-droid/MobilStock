import { ArrowRight, BarChart3, Boxes, CheckCircle2, ShieldCheck, Smartphone, Store, Users, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const featureBlocks = [
  {
    icon: Boxes,
    title: "Stock maîtrisé",
    description: "Suivez les pièces, références, quantités et emplacements pour éviter les ruptures et garder une vision claire du disponible.",
  },
  {
    icon: Smartphone,
    title: "Ventes fluides",
    description: "Enregistrez les ventes rapidement, gérez plusieurs modes de paiement et gardez un historique exploitable au quotidien.",
  },
  {
    icon: Wrench,
    title: "Compatibilités utiles",
    description: "Retrouvez plus vite les pièces compatibles avec les modèles pris en charge par votre atelier ou votre boutique.",
  },
  {
    icon: Users,
    title: "Accès structurés",
    description: "Attribuez les rôles adaptés à chaque membre de l'équipe pour conserver une gestion claire et maîtrisée.",
  },
];

const benefitPoints = [
  "Une interface pensée pour les boutiques de téléphonie et de réparation.",
  "Une vision consolidée du stock, des ventes et des utilisateurs.",
  "Un fonctionnement simple à prendre en main au quotidien.",
  "Une base saine pour piloter l'activité sans multiplier les fichiers dispersés.",
];

const workflowSteps = [
  {
    title: "Organisez votre catalogue",
    description: "Centralisez vos pièces, modèles, marques et compatibilités dans un espace unique.",
  },
  {
    title: "Enregistrez chaque opération",
    description: "Suivez les ventes et les sorties de stock au moment où elles se produisent.",
  },
  {
    title: "Pilotez avec visibilité",
    description: "Analysez l'activité, identifiez les points de vigilance et gardez le contrôle sur votre boutique.",
  },
];

const faqItems = [
  {
    question: "À qui s'adresse MobilStock ?",
    answer: "MobilStock est conçu pour les boutiques de téléphonie, de réparation mobile et les équipes qui gèrent du stock, des ventes et des accès utilisateurs au même endroit.",
  },
  {
    question: "Peut-on gérer plusieurs profils d'utilisateurs ?",
    answer: "Oui. La plateforme prévoit une gestion des rôles pour encadrer les accès selon les responsabilités de chaque membre de l'équipe.",
  },
  {
    question: "L'outil aide-t-il au suivi de l'activité ?",
    answer: "Oui. Vous disposez d'un tableau de bord, d'un historique des ventes et de statistiques pour mieux suivre la performance de la boutique.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const primaryHref = !loading && user ? "/app" : "/login";
  const primaryLabel = !loading && user ? "Ouvrir l'application" : "Accéder à la plateforme";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">MobilStock</p>
              <p className="text-xs text-muted-foreground">Gestion de boutique mobile</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#fonctionnalites" className="transition-colors hover:text-foreground">Fonctionnalités</a>
            <a href="#avantages" className="transition-colors hover:text-foreground">Avantages</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link to={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_42%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
                <ShieldCheck className="h-4 w-4" />
                Une plateforme pensée pour les boutiques de téléphonie
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Gérez votre stock, vos ventes et votre équipe depuis un espace unique.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                MobilStock vous aide à structurer l'activité de votre boutique avec une gestion claire des pièces,
                des compatibilités, des ventes et des accès utilisateurs, dans une interface simple et professionnelle.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link to={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#fonctionnalites">Découvrir les fonctionnalités</a>
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-sm font-medium">Suivi du stock</p>
                  <p className="mt-2 text-sm text-muted-foreground">Références, quantités, emplacements et alertes regroupés dans le même espace.</p>
                </div>
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-sm font-medium">Pilotage des ventes</p>
                  <p className="mt-2 text-sm text-muted-foreground">Historique exploitable et vision plus claire sur l'activité commerciale.</p>
                </div>
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-sm font-medium">Gestion d'équipe</p>
                  <p className="mt-2 text-sm text-muted-foreground">Rôles et accès adaptés pour garder une organisation propre.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-semibold">Vue d'ensemble de la boutique</p>
                    <p className="text-xs text-muted-foreground">Un espace centralisé pour piloter l'activité</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">MobilStock</div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Boxes className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Stock structuré</p>
                        <p className="text-xs text-muted-foreground">Organisation des pièces, familles et modèles compatibles.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Suivi de l'activité</p>
                        <p className="text-xs text-muted-foreground">Historique et statistiques pour mieux décider au quotidien.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Gestion centralisée des pièces et références.</p>
                        <p>Enregistrement fiable des ventes et paiements.</p>
                        <p>Accès structurés selon les rôles de l'équipe.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Fonctionnalités</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Les briques essentielles pour mieux gérer votre boutique.</h2>
              <p className="mt-4 text-muted-foreground">
                Chaque module répond à un besoin concret de terrain : gagner du temps, mieux suivre l'activité et réduire les erreurs de gestion.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featureBlocks.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="avantages">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Avantages</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Une base de gestion plus claire, plus stable et plus exploitable.</h2>
              <p className="mt-4 text-muted-foreground">
                MobilStock ne cherche pas à surcharger vos équipes. La plateforme se concentre sur l'essentiel pour garder une gestion propre et lisible.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefitPoints.map((point) => (
                <div key={point} className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">{point}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Processus</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Une gestion simple, étape par étape.</h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <article key={step.title} className="rounded-2xl border bg-card p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    0{index + 1}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="mx-auto max-w-5xl px-4 py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Questions fréquentes</h2>
            </div>

            <div className="mt-10 space-y-4">
              {faqItems.map((item) => (
                <article key={item.question} className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
            <div className="rounded-3xl border bg-card px-6 py-10 shadow-sm lg:px-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Passer à l'action</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight">Accédez à une gestion plus claire de votre boutique mobile.</h2>
                  <p className="mt-4 text-muted-foreground">
                    Ouvrez la plateforme pour retrouver votre espace de travail et piloter votre activité dans de bonnes conditions.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link to={primaryHref}>
                      {primaryLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/login">Se connecter</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
