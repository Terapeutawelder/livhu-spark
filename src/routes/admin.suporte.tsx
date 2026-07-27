import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { LifeBuoy, MessageSquare, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — Super Admin" },
      { name: "description", content: "Tickets e conversas de suporte com os tenants." },
      { property: "og:title", content: "Suporte — Super Admin" },
      { property: "og:description", content: "Tickets e conversas de suporte com os tenants." },
    ],
  }),
  component: SupportPage,
});

const tickets = [
  { id: "#8421", tenant: "Consultório Aurora", subject: "Não recebe áudios no WhatsApp", pri: "Alta", status: "Em análise", updated: "há 12 min" },
  { id: "#8420", tenant: "Grupo Bem-Estar", subject: "Erro ao emitir NF de recorrência", pri: "Média", status: "Aguardando cliente", updated: "há 1h" },
  { id: "#8419", tenant: "Dra. Marina Costa", subject: "Como configurar agente de triagem?", pri: "Baixa", status: "Aberto", updated: "há 2h" },
  { id: "#8418", tenant: "Instituto Serenity", subject: "Domínio custom com SSL pendente", pri: "Alta", status: "Em análise", updated: "há 3h" },
  { id: "#8417", tenant: "Espaço Reconectar", subject: "Importar contatos via CSV falhou", pri: "Média", status: "Resolvido", updated: "ontem" },
];

const priColor: Record<string, string> = {
  Alta: "bg-rose-500/10 text-rose-600",
  Média: "bg-amber-500/10 text-amber-600",
  Baixa: "bg-emerald-500/10 text-emerald-600",
};

function SupportPage() {
  return (
    <AdminShell
      title="Suporte"
      description="Central de tickets e conversas com os tenants."
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { k: "Abertos", v: "12", i: LifeBuoy },
          { k: "Em análise", v: "5", i: Clock },
          { k: "SLA em risco", v: "2", i: MessageSquare },
          { k: "Resolvidos (7d)", v: "38", i: LifeBuoy },
        ].map((c) => (
          <div key={c.k} className="rounded-2xl border border-border bg-surface p-5">
            <c.i className="h-5 w-5 text-gold" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.k}</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{c.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Tickets recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Assunto</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{t.id}</td>
                  <td className="px-4 py-3 text-foreground">{t.tenant}</td>
                  <td className="px-4 py-3 text-foreground">{t.subject}</td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + priColor[t.pri]}>
                      {t.pri}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{t.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
