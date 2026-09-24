import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../components/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";
import { HostTenantProvider, useHostTenant } from "@/components/host-tenant-provider";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|Failed to fetch/i.test(
    message,
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    // Após um novo deploy os chunks antigos deixam de existir e a navegação
    // (import dinâmico da rota) falha. Recarrega uma única vez para pegar a versão nova.
    if (isChunkLoadError(error) && typeof window !== "undefined") {
      const key = "livhub:chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return;
      }
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LivHub — WhatsApp CRM para Psicoterapeutas" },
      {
        name: "description",
        content:
          "LivHub organiza WhatsApp, agenda, jornada dos pacientes e pagamentos em um só lugar para psicoterapeutas.",
      },
      { name: "author", content: "LivHub" },
      { property: "og:title", content: "LivHub — WhatsApp CRM para Psicoterapeutas" },
      {
        property: "og:description",
        content:
          "LivHub organiza WhatsApp, agenda, jornada dos pacientes e pagamentos em um só lugar para psicoterapeutas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "LivHub — WhatsApp CRM para Psicoterapeutas" },
      { name: "twitter:description", content: "LivHub organiza WhatsApp, agenda, jornada dos pacientes e pagamentos em um só lugar para psicoterapeutas." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg?v=2", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico?v=2", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSubscriber() {
  const router = useRouter();
  useEffect(() => {
    sessionStorage.removeItem("livhub:chunk-reload");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {

      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  return null;
}

function TenantNotFound() {
  const { host } = useHostTenant();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">Consultório não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum consultório está associado ao domínio <span className="font-mono">{host.hostname}</span>.
        </p>
        <a
          href="https://livhub.cloud"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ir para o site principal
        </a>
      </div>
    </div>
  );
}

function TenantGate({ children }: { children: ReactNode }) {
  const { notFound, isLoading, host } = useHostTenant();
  if (host.slug && isLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (notFound) return <TenantNotFound />;
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HostTenantProvider>
          <AuthSubscriber />
          <TenantGate>
            <Outlet />
          </TenantGate>
          <Toaster richColors position="top-right" />
        </HostTenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
