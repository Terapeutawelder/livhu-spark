import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Database, Cpu, CheckCircle2, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/sistema")({
  head: () => ({
    meta: [
      { title: "Sistema — Super Admin — LivHub" },
      { name: "description", content: "Saúde, filas e feature flags da plataforma LivHub." },
      { property: "og:title", content: "Sistema — Super Admin — LivHub" },
      { property: "og:description", content: "Saúde, filas e feature flags da plataforma LivHub." },
    ],
  }),
  component: SystemPage,
});

type Flag = {
  id: string;
  key: string;
  description: string;
  is_on: boolean;
  rollout_pct: number;
  updated_at: string;
};

function SystemPage() {
  const qc = useQueryClient();
  const [newFlag, setNewFlag] = useState<{ key: string; description: string } | null>(null);

  const flagsQuery = useQuery({
    queryKey: ["admin", "flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("*").order("key");
      if (error) throw error;
      return (data ?? []) as Flag[];
    },
  });

  const platformStats = useQuery({
    queryKey: ["admin", "platform-stats"],
    queryFn: async () => {
      const [tenants, contacts, appts, invoices, tickets] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "analyzing"]),
      ]);
      return {
        tenants: tenants.count ?? 0,
        contacts: contacts.count ?? 0,
        appts: appts.count ?? 0,
        invoices: invoices.count ?? 0,
        openTickets: tickets.count ?? 0,
      };
    },
  });

  const upsertFlag = useMutation({
    mutationFn: async (f: Partial<Flag>) => {
      if (f.id) {
        const { error } = await supabase.from("feature_flags").update({
          is_on: f.is_on,
          rollout_pct: f.rollout_pct,
          description: f.description,
        }).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("feature_flags").insert({
          key: f.key!.trim(),
          description: f.description ?? "",
          is_on: false,
          rollout_pct: 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Flag atualizada");
      setNewFlag(null);
      qc.invalidateQueries({ queryKey: ["admin", "flags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const services = [
    { name: "API TanStack Start", status: "ok", up: "99,98%" },
    { name: "Lovable Cloud (DB)", status: "ok", up: "99,99%" },
    { name: "Lovable AI Gateway", status: "ok", up: "99,95%" },
    { name: "WhatsApp Cloud", status: "warn", up: "não configurado" },
  ];

  return (
    <AdminShell title="Sistema" description="Observabilidade e configuração operacional da plataforma.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { k: "Clientes", v: platformStats.data?.tenants ?? 0 },
          { k: "Contatos totais", v: platformStats.data?.contacts ?? 0 },
          { k: "Agendamentos", v: platformStats.data?.appts ?? 0 },
          { k: "Faturas emitidas", v: platformStats.data?.invoices ?? 0 },
          { k: "Tickets abertos", v: platformStats.data?.openTickets ?? 0 },
        ].map((c) => (
          <div key={c.k} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.k}</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{c.v.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Serviços</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.name} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={"h-2.5 w-2.5 rounded-full " + (s.status === "ok" ? "bg-emerald-500" : "bg-amber-500")} />
                    <span className="font-medium text-foreground">{s.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.up}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Ambiente</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Runtime</span>
              <span className="font-mono text-foreground">Cloudflare Workers</span>
            </li>
            <li className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Framework</span>
              <span className="font-mono text-foreground">TanStack Start</span>
            </li>
            <li className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Banco</span>
              <span className="font-mono text-foreground">Postgres + RLS</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">IA</span>
              <span className="font-mono text-foreground">Lovable AI</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Roadmap & Próximos Passos</h3>
          </div>
          <div className="mt-4 space-y-4">
            {[
              { t: "Custom Domains SSL (Fase B)", d: "Automação via Cloudflare para domínios próprios dos terapeutas.", s: "in_progress" },
              { t: "SaaS Marketing Site", d: "Página inicial pública do LivHub para captação de novos profissionais.", s: "planned" },
              { t: "Analytics Consolidado", d: "Dashboard global de faturamento e volume de mensagens cross-tenant.", s: "planned" },
              { t: "Suporte a Clínicas", d: "Implemente a tela para criar e gerenciar clínicas e suas equipes dentro do meu painel administrativo. Crie um painel separado para cada profissional dentro da clínica, permitindo personalizar agenda e landing page individualmente e tudo mais.", s: "in_progress" },
              { t: "App Mobile (PWA+)", d: "Experiência otimizada com notificações push nativas em iOS/Android.", s: "planned" },
            ].map((i) => (
              <div key={i.t} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.t}</p>
                  <p className="text-xs text-muted-foreground">{i.d}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    i.s === 'in_progress' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i.s === 'in_progress' ? 'Em progresso' : 'Planejado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Manutenção & Backups</h3>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">Último backup completo</p>
              <p className="text-sm font-semibold text-foreground">Hoje · 04:12 (Diário)</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">Logs de erro (24h)</p>
              <p className="text-sm font-semibold text-emerald-500">0 erros críticos</p>
            </div>
            <Button variant="outline" size="sm" className="w-full">Exportar logs operacionais</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Feature flags</h3>
          </div>
          <button
            onClick={() => setNewFlag({ key: "", description: "" })}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova flag
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Chave</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Rollout %</th>
              <th className="px-4 py-3">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {(flagsQuery.data ?? []).map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{f.key}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.description}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={f.rollout_pct}
                    onBlur={(e) => {
                      const v = Math.max(0, Math.min(100, Number(e.target.value)));
                      if (v !== f.rollout_pct) upsertFlag.mutate({ id: f.id, rollout_pct: v, is_on: f.is_on, description: f.description });
                    }}
                    className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => upsertFlag.mutate({ id: f.id, is_on: !f.is_on, rollout_pct: f.rollout_pct, description: f.description })}
                    className={
                      "relative h-6 w-11 rounded-full transition-colors " +
                      (f.is_on ? "bg-gold" : "bg-muted")
                    }
                  >
                    <span
                      className={
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " +
                        (f.is_on ? "translate-x-5" : "translate-x-0.5")
                      }
                    />
                  </button>
                </td>
              </tr>
            ))}
            {!flagsQuery.isLoading && (flagsQuery.data ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhuma flag cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {newFlag && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setNewFlag(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-foreground">Nova feature flag</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Chave</span>
                <input
                  value={newFlag.key}
                  onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                  placeholder="ex: novo-editor-fluxos"
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Descrição</span>
                <input
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setNewFlag(null)} className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button
                onClick={() => upsertFlag.mutate({ ...newFlag })}
                disabled={!newFlag.key.trim()}
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
