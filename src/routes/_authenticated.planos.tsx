import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Planos e assinatura — LivHub" },
      {
        name: "description",
        content:
          "Escolha o plano LivHub ideal para o seu consultório e libere contatos, mensagens e agentes de IA ilimitados.",
      },
      { property: "og:title", content: "Planos e assinatura — LivHub" },
      {
        property: "og:description",
        content:
          "Escolha o plano LivHub ideal para o seu consultório e libere contatos, mensagens e agentes de IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Planos e assinatura — LivHub" },
      {
        name: "twitter:description",
        content: "Escolha o plano LivHub ideal para o seu consultório.",
      },
    ],
  }),
  component: PlanosPage,
});

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_period: string;
  contacts_limit: number;
  messages_limit: number;
  ai_agents_limit: number;
  users_limit: number;
  features: unknown;
  is_highlighted: boolean;
};

const fmtLimit = (n: number) => (n < 0 ? "Ilimitado" : n.toLocaleString("pt-BR"));

function PlanosPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao dashboard
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
            Planos e assinatura
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o plano ideal para o seu consultório e volte a criar contatos, sessões e enviar
            mensagens.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-muted" />
            ))}
          </div>
        ) : !plans || plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            Nenhum plano disponível no momento. Fale com o suporte para liberar sua conta.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
              return (
                <article
                  key={plan.id}
                  className={
                    "flex flex-col rounded-2xl border bg-surface p-6 shadow-sm " +
                    (plan.is_highlighted ? "border-gold ring-1 ring-gold/40" : "border-border")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold">{plan.name}</h2>
                    {plan.is_highlighted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                        <Sparkles className="h-3 w-3" /> Recomendado
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  )}

                  <p className="mt-4 font-display text-3xl font-bold">
                    {(plan.price_cents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: plan.currency || "BRL",
                    })}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">
                      /{plan.billing_period === "yearly" ? "ano" : "mês"}
                    </span>
                  </p>

                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold" /> {fmtLimit(plan.contacts_limit)} contatos
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold" /> {fmtLimit(plan.messages_limit)} mensagens/mês
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold" /> {fmtLimit(plan.ai_agents_limit)} agentes de IA
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold" /> {fmtLimit(plan.users_limit)} usuários
                    </li>
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-gold" /> {f}
                      </li>
                    ))}
                  </ul>

                  <button className="mt-6 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    Assinar {plan.name}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Precisa de ajuda para escolher? Fale com o suporte pelo e-mail contato@livhub.cloud.
        </p>
      </div>
    </div>
  );
}
