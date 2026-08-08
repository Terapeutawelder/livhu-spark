import { createFileRoute, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Super Admin — LivHub" },
      { name: "description", content: "Console de administração da plataforma LivHub." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

async function isSuperAdmin(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}

type Mode = "login" | "forgot";

function AdminLoginPage() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as { redirect?: string };
  const redirectTo =
    typeof search.redirect === "string" && search.redirect.startsWith("/admin")
      ? search.redirect
      : "/admin";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in AND super_admin, go straight in. Otherwise stay here.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user && (await isSuperAdmin(data.user.id))) {
        navigate({ to: redirectTo, replace: true });
      }
    })();
  }, [navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        });
        if (error) throw error;
        toast.success("Link de recuperação enviado para o e-mail administrativo.");
        setMode("login");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid || !(await isSuperAdmin(uid))) {
        await supabase.auth.signOut();
        toast.error("Esta conta não tem permissão de Super Admin.");
        setLoading(false);
        return;
      }
      toast.success("Acesso concedido.");
      navigate({ to: redirectTo, replace: true });
    } catch (err: unknown) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-sidebar p-4 text-sidebar-foreground">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold text-sidebar-active-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-white">LivHub</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Super Admin Console
            </div>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight text-white">
          {mode === "login" ? "Acesso restrito" : "Recuperar senha"}
        </h1>
        <p className="mt-1 text-sm text-sidebar-muted">
          {mode === "login"
            ? "Este console é exclusivo para administradores da plataforma. Psicoterapeutas devem entrar pela página principal."
            : "Informe o e-mail administrativo. Você receberá um link seguro para redefinir a senha."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-labelledby="admin-login-title">
          <h1 id="admin-login-title" className="sr-only">
            {mode === "login" ? "Acesso restrito - Super Admin" : "Recuperar senha de Super Admin"}
          </h1>
          <div className="space-y-1">
            <label htmlFor="admin-email" className="text-xs font-medium text-sidebar-muted">E-mail administrativo</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-sidebar-muted focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
          {mode === "login" && (
            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-xs font-medium text-sidebar-muted">Senha</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gold text-sm font-semibold text-sidebar-active-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {loading
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar no console"
                : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-sidebar-muted">
          {mode === "login" ? (
            <>
              <a href="/auth" className="hover:text-white">
                ← Login de psicoterapeuta
              </a>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="font-medium text-gold hover:text-white"
              >
                Esqueci a senha
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="inline-flex items-center gap-1 hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar ao login
            </button>
          )}
          <span>© {new Date().getFullYear()} LivHub</span>
        </div>
      </div>
    </div>
  );
}
