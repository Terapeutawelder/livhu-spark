import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import livhubLogo from "@/assets/livhub-logo.png.asset.json";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  HeartPulse,
  KanbanSquare,
  CalendarDays,
  CalendarClock,
  HeartHandshake,
  Bell,
  Workflow,
  Megaphone,
  Send,
  Bot,
  GraduationCap,
  Globe,
  CreditCard,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
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
  { to: "/pacientes", label: "Pacientes", icon: HeartPulse },
  { to: "/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/agendamento", label: "Agendamento", icon: CalendarDays },
  { to: "/servicos", label: "Serviços", icon: HeartHandshake },
  { to: "/calendario", label: "Calendário", icon: CalendarClock },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
  { to: "/fluxos", label: "Fluxos", icon: Workflow },
  { to: "/remarketing", label: "Remarketing", icon: Megaphone },
  { to: "/disparos", label: "Disparos", icon: Send },
  { to: "/agentes", label: "Agentes IA", icon: Bot },
  { to: "/perfil-publico", label: "Perfil Público", icon: Globe },
  { to: "/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/creditos", label: "Créditos", icon: Coins },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];


interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}
const SidebarContext = createContext<SidebarCtx | null>(null);

const STORAGE_KEY = "livhub-sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <SidebarContext.Provider value={{ collapsed, toggle, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
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
        "hidden lg:grid h-7 w-7 place-items-center rounded-full border border-border bg-surface text-foreground shadow-sm hover:bg-muted " +
        className
      }
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function MobileMenuButton({ className = "" }: { className?: string }) {
  const { setMobileOpen } = useSidebar();
  return (
    <button
      onClick={() => setMobileOpen(true)}
      aria-label="Abrir menu"
      className={
        "grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground hover:bg-muted lg:hidden " +
        className
      }
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
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

  const desktopWidth = collapsed ? "lg:w-16" : "lg:w-60";

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 " +
          desktopWidth +
          " " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full") +
          " lg:translate-x-0"
        }
      >
        <SidebarTrigger className="absolute -right-3 top-6 z-40" />

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand */}
        <div
          className={
            "flex h-16 shrink-0 items-center " + (collapsed ? "lg:justify-center lg:px-2 px-5" : "px-5")
          }
        >
          <Link to="/" className="inline-flex items-center">
            <img
              src={livhubLogo.url}
              alt="LivHub"
              width={512}
              height={128}
              className={
                "h-auto w-auto object-contain " + (collapsed ? "lg:h-16 h-14" : "h-14")
              }
            />
          </Link>
        </div>

        {/* Nav */}
        <nav
          className={
            "min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain py-4 [scrollbar-width:thin] " +
            (collapsed ? "lg:px-2 px-3" : "px-3")
          }
        >
          {items.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            const base =
              "flex items-center rounded-lg text-sm transition-colors gap-3 px-3 py-2.5 " +
              (collapsed ? "lg:justify-center lg:gap-0 lg:px-0" : "");
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={
                  active
                    ? base + " bg-sidebar-active font-semibold text-sidebar-active-foreground shadow-sm"
                    : base + " font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}

        </nav>

        {/* User card */}
        <div className={collapsed ? "shrink-0 m-3 rounded-xl bg-sidebar-hover p-3 lg:m-2 lg:bg-transparent lg:p-0" : "shrink-0 m-3 rounded-xl bg-sidebar-hover p-3"}>
          <div className={"flex items-center gap-3 " + (collapsed ? "lg:flex-col lg:gap-2" : "")}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-xs font-bold text-sidebar-active-foreground">
              {initials}
            </div>
            <div className={"min-w-0 flex-1 " + (collapsed ? "lg:hidden" : "")}>
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {session?.name ?? "Carregando…"}
              </p>
              <p className="truncate text-[11px] text-sidebar-muted">
                {session?.email ?? "Psicoterapeuta"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sair"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
