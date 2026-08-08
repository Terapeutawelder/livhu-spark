import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  LayoutDashboard, 
  CreditCard, 
  Settings, 
  LogOut, 
  ChevronRight,
  Shield,
  Building2,
  Calendar,
  Globe,
  Palette,
  UserCheck,
  Zap,
  HelpCircle
} from "lucide-react";
import livhubLogo from "@/assets/livhub-logo.png.asset.json";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location, context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) {
      throw redirect({ to: "/admin/login", search: { redirect: location.href } });
    }
    const isSuperAdmin = await context.queryClient.ensureQueryData({
      queryKey: ["is-super-admin", user.id],
      staleTime: 5 * 60 * 1000,
      queryFn: async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();
        return !!data;
      },
    });
    if (!isSuperAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const menuItems = [
    { to: "/admin", label: "Visão Geral", icon: LayoutDashboard },
    { to: "/admin/tenants", label: "Clientes (Tenants)", icon: Building2 },
    { to: "/admin/planos", label: "Planos de Assinatura", icon: CreditCard },
    { to: "/admin/faturamento", label: "Faturamento", icon: DollarSignIcon },
    { to: "/admin/calendario", label: "Calendário", icon: Calendar },
    { to: "/admin/white-label", label: "White-label", icon: Palette },
    { to: "/admin/dominios", label: "Domínios", icon: Globe },
    { to: "/admin/usuarios", label: "Usuários & Roles", icon: UserCheck },
    { to: "/admin/sistema", label: "Sistema & Roadmap", icon: Zap },
    { to: "/admin/configuracao", label: "Configuração", icon: Settings },
    { to: "/admin/suporte", label: "Suporte", icon: HelpCircle },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Admin */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar transition-transform lg:translate-x-0">
        <div className="flex h-16 items-center px-6">
          <Link to="/admin" className="flex items-center gap-2">
            <img src={livhubLogo.url} alt="LivHub Admin" className="h-10 w-auto" />
            <span className="text-[10px] font-bold text-gold uppercase tracking-tighter bg-gold/10 px-1.5 py-0.5 rounded">Super Admin</span>
          </Link>
        </div>
        
        <nav className="mt-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  active 
                    ? "bg-gold/10 text-gold shadow-[inset_0_0_0_1px_rgba(212,175,55,0.2)]" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-gold" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 w-full px-3">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Shield className="h-4 w-4" />
            Voltar ao Sistema
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Super Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">
              {menuItems.find(i => i.to === "/admin" ? pathname === "/admin" : pathname.startsWith(i.to))?.label || "Painel"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">SA</div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center w-full p-4 md:p-8 overflow-auto">
          <div className="w-full max-w-[1400px] mx-auto flex flex-col items-center">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function DollarSignIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
