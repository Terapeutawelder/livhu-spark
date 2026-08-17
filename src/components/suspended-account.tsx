import { Ban } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tela exibida quando a conta foi suspensa pelo administrador da rede
 * white-label ou pela plataforma. Nenhum módulo fica acessível.
 */
export function SuspendedAccount({ name }: { name?: string | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="grid min-h-svh place-items-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
          <Ban className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold">Conta suspensa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O acesso {name ? `de "${name}" ` : ""}está temporariamente bloqueado. Fale com o administrador
          responsável pela sua conta para reativá-la. Seus dados continuam salvos.
        </p>
        <button
          onClick={signOut}
          className="mt-6 h-10 w-full rounded-lg bg-gold text-sm font-semibold text-sidebar-active-foreground"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
