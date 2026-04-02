import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://stock.saeicubetech.com";
const DEFAULT_TITLE = "MobilStock — Gestion de boutique mobile";
const DEFAULT_DESCRIPTION = "Plateforme SaaS de gestion de stock, ventes, utilisateurs et activité pour boutiques de téléphonie mobile.";
const DEFAULT_IMAGE = `${SITE_URL}/favicon.ico`;

type RouteMeta = {
  title: string;
  description: string;
  path: string;
  robots: string;
  structuredData?: Record<string, unknown> | null;
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "MobilStock — Gestion de stock et ventes pour boutique mobile",
    description: "MobilStock est une plateforme de gestion dédiée aux boutiques de téléphonie pour suivre le stock, les ventes, les compatibilités et les accès utilisateurs.",
    path: "/",
    robots: "index, follow",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "MobilStock",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "fr",
      description: "Plateforme de gestion de stock, ventes, compatibilités et utilisateurs pour boutiques de téléphonie mobile.",
      publisher: {
        "@type": "Organization",
        name: "MobilStock",
        url: SITE_URL,
      },
    },
  },
  "/login": {
    title: "MobilStock — Connexion",
    description: "Accédez à MobilStock, votre solution de gestion de stock et de ventes pour boutique mobile.",
    path: "/login",
    robots: "noindex, nofollow",
  },
  "/app": {
    title: "MobilStock — Tableau de bord",
    description: "Pilotez votre boutique mobile avec un tableau de bord clair pour le stock, les ventes et les performances.",
    path: "/app",
    robots: "noindex, nofollow",
  },
  "/app/stock": {
    title: "MobilStock — Gestion du stock",
    description: "Consultez et gérez les pièces, références et niveaux de stock de votre boutique mobile.",
    path: "/app/stock",
    robots: "noindex, nofollow",
  },
  "/app/vente": {
    title: "MobilStock — Vente",
    description: "Enregistrez rapidement les ventes de votre boutique mobile avec MobilStock.",
    path: "/app/vente",
    robots: "noindex, nofollow",
  },
  "/app/historique": {
    title: "MobilStock — Historique des ventes",
    description: "Retrouvez l'historique des ventes et filtrez l'activité commerciale de votre boutique.",
    path: "/app/historique",
    robots: "noindex, nofollow",
  },
  "/app/compatibilites": {
    title: "MobilStock — Compatibilités",
    description: "Vérifiez et gérez les compatibilités entre pièces et modèles de téléphones.",
    path: "/app/compatibilites",
    robots: "noindex, nofollow",
  },
  "/app/statistiques": {
    title: "MobilStock — Statistiques",
    description: "Analysez les performances, le chiffre d'affaires et les tendances de vente de votre boutique.",
    path: "/app/statistiques",
    robots: "noindex, nofollow",
  },
  "/app/utilisateurs": {
    title: "MobilStock — Utilisateurs",
    description: "Gérez les accès, rôles et utilisateurs de votre boutique avec MobilStock.",
    path: "/app/utilisateurs",
    robots: "noindex, nofollow",
  },
  "/app/parametres": {
    title: "MobilStock — Paramètres",
    description: "Configurez votre boutique, vos comptes de paiement et vos préférences de gestion.",
    path: "/app/parametres",
    robots: "noindex, nofollow",
  },
  "/app/profil": {
    title: "MobilStock — Profil",
    description: "Consultez et mettez à jour votre profil utilisateur dans MobilStock.",
    path: "/app/profil",
    robots: "noindex, nofollow",
  },
};

function upsertMeta(selector: string, attributeName: string, attributeValue: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertLink(selector: string, rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(selector);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function upsertStructuredData(scriptId: string, data: Record<string, unknown> | null | undefined) {
  let element = document.head.querySelector<HTMLScriptElement>(`script#${scriptId}`);

  if (!data) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("script");
    element.id = scriptId;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

export default function RouteSeo() {
  const location = useLocation();

  useEffect(() => {
    const routeMeta = ROUTE_META[location.pathname] ?? {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: location.pathname,
      robots: "noindex, nofollow",
    };

    const canonicalUrl = new URL(routeMeta.path, SITE_URL).toString();

    document.title = routeMeta.title;
    upsertMeta('meta[name="description"]', "name", "description", routeMeta.description);
    upsertMeta('meta[name="author"]', "name", "author", "MobilStock");
    upsertMeta('meta[name="robots"]', "name", "robots", routeMeta.robots);
    upsertMeta('meta[name="theme-color"]', "name", "theme-color", "#22c55e");
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "MobilStock");
    upsertMeta('meta[property="og:title"]', "property", "og:title", routeMeta.title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", routeMeta.description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    upsertMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_IMAGE);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", routeMeta.title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", routeMeta.description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_IMAGE);
    upsertLink('link[rel="canonical"]', "canonical", canonicalUrl);
    upsertStructuredData("mobilstock-structured-data", routeMeta.structuredData);
  }, [location.pathname]);

  return null;
}
