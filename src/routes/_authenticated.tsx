import { AppSidebar, SidebarProvider, useSidebar, MobileMenuButton } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrialBanner } from "@/components/trial-banner";
import { NotificationBell } from "@/components/notification-bell";
import { Search } from "lucide-react";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { SuspendedAccount } from "@/components/suspended-account";
import { provisionZernioProfile } from "@/lib/zernio.functions";


/** Garante o cadastro do consultório na Zernio (POST /v1/profiles) uma vez por sessão. */
function useZernioProvisioning(enabled: boolean) {
  const provision = useServerFn(provisionZernioProfile);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (sessionStorage.getItem("zernio-provisioned") === "1") return;
    provision()
      .then((r: any) => {
        if (r?.profileId) sessionStorage.setItem("zernio-provisioned", "1");
      })
      .catch(() => { /* silencioso: integração opcional */ });
  }, [enabled, provision]);
}


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      if (location.pathname === "/") throw redirect({ to: "/site" });
      const isAdminArea = location.pathname.startsWith("/admin");
      throw redirect({
        to: isAdminArea ? "/admin/login" : "/auth",
        search: { redirect: location.href },
      });
    }
    return { user };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  useZernioProvisioning(!isAdmin);


  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TherapistShell />
    </SidebarProvider>
  );
}

function TherapistShell() {
  const { collapsed } = useSidebar();
  const { data: tenant, isLoading: tenantLoading } = useCurrentTenant();
  const tenantName = tenant?.name ?? null;

  if (!tenantLoading && tenant && tenant.is_active === false) {
    return <SuspendedAccount name={tenant.name} />;
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className={"transition-[padding] duration-200 " + (collapsed ? "lg:pl-16" : "lg:pl-60")}>
        <AppHeader tenantName={tenantName} />
        <TrialBanner />
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AppHeader({ tenantName }: { tenantName: string | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:gap-3 sm:px-6 lg:px-8">
      <MobileMenuButton />
      <div className="flex flex-1 items-center gap-4 min-w-0">
        {tenantName && (
          <div className="hidden lg:flex items-center gap-2 border-r border-border pr-4 h-8">
            <span className="text-xs font-bold text-gold uppercase tracking-widest truncate max-w-[150px]">
              {tenantName}
            </span>
          </div>
        )}
        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar pacientes, conversas, fluxos…"
            className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}
