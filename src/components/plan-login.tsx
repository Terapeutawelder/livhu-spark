import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import livhubLogo from "@/assets/livhub-logo.png.asset.json";

type Mode = "login" | "forgot";

async function currentAccountType(): Promise<string | null> {
  const { data } = await supabase.rpc("current_account_type");
  return (data as string | null) ?? null;
}

/**
 * Tela de login dedicada a um tipo de plano (Clínica, White-label).
 * Valida o tipo de conta após autenticar e recusa acessos de outro plano.
 */
export function PlanLogin({
  accountType,
  icon: Icon,
  badge,
  title,
  subtitle,
  wrongTypeMessage,
}: {
  accountType: "clinic" | "whitelabel";
  icon: LucideIcon;
  badge: string;
  title: string;
  subtitle: string;
  wrongTypeMessage: string;
}) {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as { redirect?: string };
  const redirectTo = typeof search.redirect === "string" ? search.redirect : "/";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      if ((await currentAccountType()) === accountType) {
        navigate({ to: redirectTo || "/", replace: true });
      }
    })();
  }, [accountType, navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu e-mail.");
        setMode("login");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const type = await currentAccountType();
      if (type !== accountType) {
        await supabase.auth.signOut();
        toast.error(wrongTypeMessage);
        return;
      }
      toast.success("Acesso liberado.");
      navigate({ to: redirectTo || "/", replace: true });
    } catch (err: unknown) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark grid min-h-svh place-items-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src={livhubLogo.src} alt="LivHub" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold">
            <Icon className="h-3.5 w-3.5" /> {badge}
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "forgot" ? "Enviaremos um link para redefinir sua senha." : subtitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          {mode === "login" && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold text-sm font-semibold text-sidebar-active-foreground disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Enviar link"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button
            onClick={() => setMode(mode === "login" ? "forgot" : "login")}
            className="font-semibold text-gold hover:underline"
          >
            {mode === "login" ? "Esqueci minha senha" : "Voltar ao login"}
          </button>
          <Link to="/auth" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Sou profissional individual
          </Link>
        </div>

        <p className="mt-6 border-t border-border pt-4 text-[11px] text-muted-foreground">
          Cada plano tem o seu painel: <Link to="/auth" className="text-gold hover:underline">Profissional</Link> ·{" "}
          <Link to="/clinica/login" className="text-gold hover:underline">Clínica</Link> ·{" "}
          <Link to="/white-label/login" className="text-gold hover:underline">White-label</Link> ·{" "}
          <Link to="/admin/login" className="text-gold hover:underline">Super Admin</Link>
        </p>
      </div>
    </div>
  );
}
