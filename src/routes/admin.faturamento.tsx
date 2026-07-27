import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Download, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/faturamento")({
  head: () => ({
    meta: [
      { title: "Faturamento — Super Admin" },
      { name: "description", content: "MRR, ARR, inadimplência e faturas por tenant." },
      { property: "og:title", content: "Faturamento — Super Admin" },
      { property: "og:description", content: "MRR, ARR, inadimplência e faturas por tenant." },
    ],
  }),
  component: BillingPage,
});

const invoices = [
  { id: "INV-2026-0421", tenant: "Consultório Aurora", plan: "Pro", value: 349, date: "20/07/2026", status: "Paga" },
  { id: "INV-2026-0420", tenant: "Instituto Serenity", plan: "Enterprise", value: 1290, date: "20/07/2026", status: "Paga" },
  { id: "INV-2026-0419", tenant: "Dra. Marina Costa", plan: "Solo", value: 89, date: "18/07/2026", status: "Paga" },
  { id: "INV-2026-0418", tenant: "Grupo Bem-Estar", plan: "Enterprise", value: 1990, date: "17/07/2026", status: "Em aberto" },
  { id: "INV-2026-0417", tenant: "Dr. Rafael Lima", plan: "Solo", value: 89, date: "15/07/2026", status: "Vencida" },
  { id: "INV-2026-0416", tenant: "Espaço Reconectar", plan: "Pro", value: 349, date: "14/07/2026", status: "Paga" },
];

const statusIcon: Record<string, JSX.Element> = {
  Paga: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  "Em aberto": <Clock className="h-4 w-4 text-amber-500" />,
  Vencida: <AlertTriangle className="h-4 w-4 text-rose-500" />,
};

function BillingPage() {
  return (
    <AdminShell
      title="Faturamento"
      description="Receita, cobranças e inadimplência da plataforma."
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-muted">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "MRR", v: "R$ 24.800", h: "+12,2% vs mês anterior", accent: "text-emerald-600" },
          { k: "ARR", v: "R$ 297.600", h: "projeção 12 meses" },
          { k: "Ticket médio", v: "R$ 168", h: "+R$ 12 vs jun" },
          { k: "Inadimplência", v: "R$ 2.079", h: "3 faturas em atraso", accent: "text-rose-600" },
        ].map((c) => (
          <div key={c.k} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.k}</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{c.v}</p>
            <p className={"mt-1 text-xs " + (c.accent ?? "text-muted-foreground")}>{c.h}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Faturas recentes</h3>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Fatura</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Emissão</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{i.id}</td>
                  <td className="px-4 py-3 text-foreground">{i.tenant}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                      {i.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    R$ {i.value.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{i.date}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
                      {statusIcon[i.status]}
                      {i.status}
                    </div>
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
