import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import livhubLogo from "@/assets/livhub-logo.png.asset.json";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  KanbanSquare,
  CalendarDays,
  Workflow,
  Megaphone,
  Send,
  Bot,
  GraduationCap,
  CreditCard,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,

} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/contatos", label: "Contatos", icon: Users },
  { to: "/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/agendamento", label: "Agendamento", icon: CalendarDays },
  { to: "/fluxos", label: "Fluxos", icon: Workflow },
  { to: "/remarketing", label: "Remarketing", icon: Megaphone },
  { to: "/disparos", label: "Disparos", icon: Send },
  { to: "/agentes", label: "Agentes IA", icon: Bot },
  { to: "/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];


interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}
const SidebarContext = createContext<SidebarCtx | null>(null);

const STORAGE_KEY = "livhub-sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarTrigger({ className = "" }: { className?: string }) {
  const { collapsed, toggle } = useSidebar();
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      onClick={toggle}
      aria-label={collapsed ? "Expandir menu" : "Encolher menu"}
      className={
        "grid h-7 w-7 place-items-center rounded-full border border-border bg-surface text-foreground shadow-sm hover:bg-muted " +
        className
      }
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { collapsed } = useSidebar();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const [{ data: userRes }, { data: rolesRes }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("user_roles").select("role"),
      ]);
      const user = userRes.user;
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle();
      return {
        email: user.email ?? profile?.email ?? "",
        name: profile?.full_name || user.email?.split("@")[0] || "Usuário",
        avatar: profile?.avatar_url ?? null,
        isSuperAdmin: (rolesRes ?? []).some((r) => r.role === "super_admin"),
      };
    },
  });

  const initials = (session?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <aside
      className={
        "fixed inset-y-0 left-0 z-30 hidden flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex " +
        (collapsed ? "w-16" : "w-60")
      }
    >
      <SidebarTrigger className="absolute -right-3 top-6 z-40" />
      {/* Brand */}
      <div
        className={
          "flex h-16 items-center " + (collapsed ? "justify-center px-2" : "px-5")
        }
      >
        <Link to="/" className="inline-flex items-center">
          <img
            src={livhubLogo.url}
            alt="LivHub"
            width={512}
            height={128}
            className={
              "h-auto w-auto object-contain " + (collapsed ? "h-9" : "h-8")
            }
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className={"flex-1 space-y-1 py-4 " + (collapsed ? "px-2" : "px-3")}>
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          const base =
            "flex items-center rounded-lg text-sm transition-colors " +
            (collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5");
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={
                active
                  ? base + " bg-sidebar-active font-semibold text-sidebar-active-foreground shadow-sm"
                  : base + " font-medium text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {session?.isSuperAdmin && (
          <Link
            to="/admin"
            title={collapsed ? "Super Admin" : undefined}
            className={
              "mt-2 flex items-center rounded-lg border border-gold/30 bg-gold/10 text-sm text-gold transition-colors hover:bg-gold/20 " +
              (collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5 font-semibold")
            }
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Super Admin</span>}
          </Link>
        )}
      </nav>

      {/* User card */}
      <div className={collapsed ? "m-2" : "m-3 rounded-xl bg-white/5 p-3"}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gold text-xs font-bold text-sidebar-active-foreground">
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sair"
              className="grid h-8 w-8 place-items-center rounded-md text-sidebar-muted hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gold text-xs font-bold text-sidebar-active-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {session?.name ?? "Carregando…"}
              </p>
              <p className="truncate text-[11px] text-sidebar-muted">
                {session?.email ?? "Psicoterapeuta"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sair"
              className="grid h-8 w-8 place-items-center rounded-md text-sidebar-muted hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
