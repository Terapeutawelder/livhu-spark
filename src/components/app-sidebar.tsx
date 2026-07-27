import { Link, useRouterState } from "@tanstack/react-router";
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
  Settings,
  LogOut,
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
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];


export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-sidebar-active-foreground">
          <span className="font-display text-sm font-bold">L</span>
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-white">LivHub</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                active
                  ? "flex items-center gap-3 rounded-lg bg-sidebar-active px-3 py-2.5 text-sm font-semibold text-sidebar-active-foreground shadow-sm"
                  : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="m-3 rounded-xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gold text-xs font-bold text-sidebar-active-foreground">
            HM
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Dra. Helena</p>
            <p className="truncate text-[11px] text-sidebar-muted">Clínica MenteSã</p>
          </div>
          <button
            aria-label="Sair"
            className="grid h-8 w-8 place-items-center rounded-md text-sidebar-muted hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
