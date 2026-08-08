import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/admin/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha — Super Admin LivHub" },
      { name: "description", content: "Redefina a senha de Super Admin do LivHub." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminResetPassword,
});

function AdminResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error));
      return;
    }
    toast.success("Senha atualizada! Redirecionando para o console…");
    setTimeout(() => navigate({ to: "/admin", replace: true }), 1200);
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
          Nova senha
        </h1>
        <p className="mt-1 text-sm text-sidebar-muted">
          Defina uma nova senha de acesso ao console de Super Admin.
        </p>

        {!ready ? (
          <p className="mt-6 text-sm text-sidebar-muted">
            Abra este link a partir do e-mail de recuperação que você recebeu.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-labelledby="admin-reset-title">
            <h1 id="admin-reset-title" className="sr-only">Nova senha de Super Admin</h1>
            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-xs font-medium text-sidebar-muted">Nova senha</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="admin-confirm" className="text-xs font-medium text-sidebar-muted">Confirmar senha</label>
              <input
                id="admin-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gold text-sm font-semibold text-sidebar-active-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {loading ? "Salvando…" : "Atualizar senha"}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between text-xs text-sidebar-muted">
          <a href="/admin/login" className="hover:text-white">
            ← Voltar ao login
          </a>
          <span>© {new Date().getFullYear()} LivHub</span>
        </div>
      </div>
    </div>
  );
}
