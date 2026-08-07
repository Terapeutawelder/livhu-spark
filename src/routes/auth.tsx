import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import therapistImg from "@/assets/auth-therapist.jpg";
import livhubLogo from "@/assets/livhub-logo.png.asset.json";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as {
    redirect?: string;
  };
  const redirectTo = typeof search.redirect === "string" ? search.redirect : "/";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce out
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirectTo || "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: redirectTo || "/", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo(a)!");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Confirme seu e-mail se necessário.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu e-mail.");
        setMode("login");
      }
    } catch (err: unknown) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(translateAuthError(result.error));
        setLoading(false);
      }
      // If redirected or tokens set, onAuthStateChange will navigate.
    } catch (err: unknown) {
      toast.error(translateAuthError(err));
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: "Entrar no LivHub",
    signup: "Criar sua conta",
    forgot: "Recuperar senha",
  };
  const subtitles: Record<Mode, string> = {
    login: "Acesse seu consultório digital.",
    signup: "Comece a organizar sua prática em minutos.",
    forgot: "Enviaremos um link para redefinir sua senha.",
  };

  return (
    <div className="dark flex min-h-svh items-center justify-center bg-background p-4 text-foreground sm:p-6 lg:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl lg:grid-cols-[1.5fr_1fr]">
        {/* Image panel — banner on mobile, taller sidebar on desktop */}
        <div className="relative flex aspect-[4/5] max-h-[46svh] w-full overflow-hidden bg-sidebar sm:aspect-[16/10] sm:max-h-[40svh] lg:aspect-auto lg:max-h-none lg:min-h-[560px]">
          <img
            src={therapistImg}
            alt="Psicoterapeuta usando o LivHub"
            width={1280}
            height={1600}
            className="absolute inset-0 h-full w-full object-cover object-[center_18%] lg:object-center"
          />
          {/* Subtle edge gradients for polish; no text overlay so the photo stays fully visible */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        {/* Content panel — logo, value prop and auth form */}
        <div className="flex items-center justify-center px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="w-full max-w-sm space-y-4">
            <Link to="/auth" className="inline-flex items-center">
              <img
                src={livhubLogo.url}
                alt="LivHub"
                width={1280}
                height={640}
                className="h-20 w-auto sm:h-24"
              />
            </Link>

            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                Sua prática, no ritmo dos seus pacientes.
              </h2>
              <p className="text-sm text-muted-foreground">
                WhatsApp, agenda, jornada do paciente e pagamentos em um só lugar.
              </p>
            </div>

            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">{titles[mode]}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitles[mode]}</p>
            </div>

            {mode !== "forgot" && (
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                <GoogleIcon />
                Continuar com Google
              </button>
            )}

            {mode !== "forgot" && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                ou
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Nome completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Senha</label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Esqueci a senha
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {loading
                  ? "Aguarde…"
                  : mode === "login"
                    ? "Entrar"
                    : mode === "signup"
                      ? "Criar conta"
                      : "Enviar link de recuperação"}
              </button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              {mode === "login" && (
                <>
                  Ainda não tem conta?{" "}
                  <button onClick={() => setMode("signup")} className="font-semibold text-primary hover:underline">
                    Cadastre-se
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Já tem conta?{" "}
                  <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                    Entrar
                  </button>
                </>
              )}
              {mode === "forgot" && (
                <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                  Voltar ao login
                </button>
              )}
            </div>

            <div className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} LivHub
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.5 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-4.9c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.4 39 16.1 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.2l6 4.9c-.4.4 6.7-4.9 6.7-14.1 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
