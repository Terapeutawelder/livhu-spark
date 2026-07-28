import { type ReactNode } from "react";
import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Package,
  Receipt,
  Palette,
  ShieldCheck,
  Activity,
  LifeBuoy,
  Search,
  Bell,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const items: NavItem[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/tenants", label: "Clientes", icon: Building2 },
  { to: "/admin/planos", label: "Planos de assinatura", icon: Package },
  { to: "/admin/faturamento", label: "Faturamento", icon: Receipt },
  { to: "/admin/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/admin/white-label", label: "White-label", icon: Palette },
  { to: "/admin/usuarios", label: "Usuários & Roles", icon: ShieldCheck },
  { to: "/admin/sistema", label: "Sistema", icon: Activity },
  { to: "/admin/configuracao", label: "Configuração", icon: Settings },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy },
];

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/admin/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-sidebar-active-foreground">
            <span className="font-display text-sm font-bold">L</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold tracking-tight text-white">
              LivHub
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">
              Super Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active =
              item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
            const Icon = item.icon;
            const base = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? base + " bg-sidebar-active font-semibold text-sidebar-active-foreground shadow-sm"
                    : base + " font-medium text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="m-3 space-y-2 rounded-xl bg-white/5 p-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-medium text-sidebar-muted hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao app do tenant
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair da conta
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar tenants, usuários, faturas…"
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
            <div className="ml-1 flex items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gold text-xs font-bold text-sidebar-active-foreground">
                SA
              </div>
              <button
                onClick={handleSignOut}
                aria-label="Sair"
                title="Sair"
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
