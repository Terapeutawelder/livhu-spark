import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Plus, MoreHorizontal, Search, Filter } from "lucide-react";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — Super Admin" },
      { name: "description", content: "Gerencie contas, planos e status dos tenants LivHub." },
      { property: "og:title", content: "Tenants — Super Admin" },
      { property: "og:description", content: "Gerencie contas, planos e status dos tenants LivHub." },
    ],
  }),
  component: TenantsPage,
});

const tenants = [
  { n: "Consultório Aurora", email: "contato@aurora.com.br", plan: "Pro", users: 8, mrr: 349, status: "Ativo", created: "12/10/2026" },
  { n: "Dra. Marina Costa", email: "marina@drmarina.com", plan: "Solo", users: 1, mrr: 89, status: "Ativo", created: "22/11/2026" },
  { n: "Instituto Serenity", email: "adm@serenity.com.br", plan: "Enterprise", users: 42, mrr: 1290, status: "Ativo", created: "03/03/2026" },
  { n: "Espaço Reconectar", email: "hello@reconectar.psi.br", plan: "Pro", users: 12, mrr: 349, status: "Ativo", created: "18/05/2026" },
  { n: "Clínica Namastê", email: "ola@namaste.com.br", plan: "Pro", users: 6, mrr: 349, status: "Trial", created: "10/07/2026" },
  { n: "Dr. Rafael Lima", email: "rafael@lima.psi", plan: "Solo", users: 1, mrr: 0, status: "Suspenso", created: "01/02/2026" },
  { n: "Grupo Bem-Estar", email: "financeiro@bemestar.com", plan: "Enterprise", users: 68, mrr: 1990, status: "Ativo", created: "14/09/2025" },
];

const statusColor: Record<string, string> = {
  Ativo: "bg-emerald-500/10 text-emerald-600",
  Trial: "bg-amber-500/10 text-amber-600",
  Suspenso: "bg-rose-500/10 text-rose-600",
};

function TenantsPage() {
  return (
    <AdminShell
      title="Tenants"
      description="Todos os consultórios e clínicas que operam na plataforma."
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Novo tenant
        </button>
      }
    >
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar por nome ou email…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium">
            <Filter className="h-4 w-4" /> Plano
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium">
            <Filter className="h-4 w-4" /> Status
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Usuários</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.n} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                        {t.n.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{t.n}</p>
                        <p className="text-xs text-muted-foreground">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{t.users}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    R$ {t.mrr.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-semibold " + statusColor[t.status]
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.created}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
