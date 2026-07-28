import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar, SidebarProvider, useSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrialBanner } from "@/components/trial-banner";
import { Bell, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const isAdminArea = location.pathname.startsWith("/admin");
      throw redirect({
        to: isAdminArea ? "/admin/login" : "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className={"transition-[padding] duration-200 " + (collapsed ? "lg:pl-16" : "lg:pl-60")}>
        <AppHeader />
        <TrialBanner />
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-2">
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
        <button
          aria-label="Notificações"
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground hover:bg-muted"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold" />
        </button>
      </div>
    </header>
  );
}
