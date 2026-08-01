import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Usage = {
  tenant_id: string;
  plan: string;
  trial_ends_at: string | null;
  contacts_limit: number;
  contacts_used: number;
  messages_limit: number;
  messages_used: number;
  is_readonly: boolean;
  is_owner: boolean;
};

export function TrialBanner() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.rpc("get_tenant_usage").then(({ data }) => {
      if (mounted && data && data.length > 0) setUsage(data[0] as Usage);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!usage || usage.plan !== "trial") return null;

  const now = Date.now();
  const trialEnd = usage.trial_ends_at ? new Date(usage.trial_ends_at).getTime() : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : null;
  const contactsPct = (usage.contacts_used / Math.max(1, usage.contacts_limit)) * 100;
  const messagesPct = (usage.messages_used / Math.max(1, usage.messages_limit)) * 100;
  const nearLimit = contactsPct >= 80 || messagesPct >= 80;

  if (usage.is_readonly) {
    // Bloqueado — banner sempre visível, não dá pra fechar
    return (
      <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold">
              {trialEnd && trialEnd < now
                ? "Seu período de teste terminou."
                : "Você atingiu o limite do plano de teste."}
            </p>
            <p className="text-xs opacity-90">
              Sua conta está em modo somente leitura. Assine um plano para voltar a criar contatos, sessões e enviar mensagens.
            </p>
          </div>
          <Link
            to="/planos"
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  if (dismissed || (!nearLimit && (daysLeft ?? 99) > 2)) return null;

  return (
    <div className="border-b border-gold/40 bg-gold/10 px-4 py-2.5 text-sm text-foreground sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="h-4 w-4 shrink-0 text-gold" />
        <div className="flex-1 min-w-[200px]">
          <span className="font-semibold">Você está no plano de teste.</span>{" "}
          <span className="text-muted-foreground">
            {daysLeft !== null && daysLeft <= 2
              ? `Restam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}. `
              : ""}
            {usage.contacts_used}/{usage.contacts_limit} contatos · {usage.messages_used}/
            {usage.messages_limit} mensagens no mês.
          </span>
        </div>
        <Link
          to="/planos"
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Fazer upgrade
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar aviso"
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
