import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Check, Plus, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Super Admin" },
      { name: "description", content: "Configure planos, limites e preços da plataforma." },
      { property: "og:title", content: "Planos — Super Admin" },
      { property: "og:description", content: "Configure planos, limites e preços da plataforma." },
    ],
  }),
  component: PlansPage,
});

const plans = [
  {
    name: "Solo",
    price: 89,
    tenants: 87,
    features: ["1 usuário", "1 número WhatsApp", "500 conversas/mês", "1 agente IA", "Kanban básico"],
    highlight: false,
  },
  {
    name: "Pro",
    price: 349,
    tenants: 48,
    features: ["Até 10 usuários", "3 números WhatsApp", "5.000 conversas/mês", "5 agentes IA", "Fluxos avançados", "Cursos ilimitados"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: 1290,
    tenants: 12,
    features: ["Usuários ilimitados", "Números ilimitados", "Conversas ilimitadas", "Agentes IA ilimitados", "White-label completo", "SLA dedicado", "API completa"],
    highlight: false,
  },
];

function PlansPage() {
  return (
    <AdminShell
      title="Planos"
      description="Preços, limites e recursos disponíveis por plano."
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Novo plano
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={
              "rounded-2xl border p-6 " +
              (p.highlight
                ? "border-gold bg-gold/5 ring-1 ring-gold/40"
                : "border-border bg-surface")
            }
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-foreground">{p.name}</h3>
              <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3">
              <span className="font-display text-3xl font-bold text-foreground">
                R$ {p.price}
              </span>
              <span className="ml-1 text-sm text-muted-foreground">/ mês</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.tenants} tenants neste plano
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Limites globais (fair use)</h3>
        <p className="text-xs text-muted-foreground">
          Aplicados como teto adicional independente do plano.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {[
            { k: "Tokens IA / mês", v: "10.000.000" },
            { k: "Anexos (GB) / tenant", v: "50 GB" },
            { k: "Webhooks / min", v: "600" },
            { k: "Disparos / hora", v: "2.000" },
          ].map((l) => (
            <div key={l.k} className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">{l.k}</p>
              <p className="mt-1 font-semibold text-foreground">{l.v}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
