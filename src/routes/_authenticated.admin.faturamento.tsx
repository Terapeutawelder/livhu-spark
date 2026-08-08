import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, TrendingUp, AlertTriangle, CheckCircle2, Clock, Plus, X, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/faturamento")({
  head: () => ({
    meta: [
      { title: "Faturamento — Super Admin — LivHub" },
      { name: "description", content: "MRR, ARR, inadimplência e faturas por cliente." },
      { property: "og:title", content: "Faturamento — Super Admin — LivHub" },
      { property: "og:description", content: "MRR, ARR, inadimplência e faturas por cliente." },
    ],
  }),
  component: BillingPage,
});

type InvoiceStatus = "paid" | "open" | "overdue" | "void" | "refunded";
type Invoice = {
  id: string;
  tenant_id: string;
  plan_name: string;
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  external_id: string | null;
  provider: string;
};
type TenantMin = { id: string; name: string };

const statusLabel: Record<InvoiceStatus, string> = {
  paid: "Paga",
  open: "Em aberto",
  overdue: "Vencida",
  void: "Cancelada",
  refunded: "Reembolsada",
};
const statusIcon: Record<InvoiceStatus, React.ReactNode> = {
  paid: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  open: <Clock className="h-4 w-4 text-amber-500" />,
  overdue: <AlertTriangle className="h-4 w-4 text-rose-500" />,
  void: <X className="h-4 w-4 text-muted-foreground" />,
  refunded: <X className="h-4 w-4 text-muted-foreground" />,
};

function BillingPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const invoicesQuery = useQuery({
    queryKey: ["admin", "invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

  const tenantsQuery = useQuery({
    queryKey: ["admin", "tenants", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as TenantMin[];
    },
  });

  const plansQuery = useQuery({
    queryKey: ["admin", "plans", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("slug, name, price_cents").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const paid_at = status === "paid" ? new Date().toISOString() : null;
      const { error } = await supabase.from("invoices").update({ status, paid_at }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fatura atualizada");
      qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tenantsById = useMemo(() => {
    const m: Record<string, string> = {};
    (tenantsQuery.data ?? []).forEach((t) => (m[t.id] = t.name));
    return m;
  }, [tenantsQuery.data]);

  const metrics = useMemo(() => {
    const list = invoicesQuery.data ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = list.filter((i) => i.status === "paid" && new Date(i.paid_at ?? i.issued_at) >= monthStart);
    const mrr = paidThisMonth.reduce((s, i) => s + i.amount_cents, 0) / 100;
    const overdueSum = list.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount_cents, 0) / 100;
    const overdueCount = list.filter((i) => i.status === "overdue").length;
    const avg = paidThisMonth.length ? mrr / paidThisMonth.length : 0;
    return { mrr, arr: mrr * 12, avg, overdueSum, overdueCount };
  }, [invoicesQuery.data]);

  const exportCsv = () => {
    const list = invoicesQuery.data ?? [];
    const header = "id,cliente,plano,valor_brl,status,emitida_em,paga_em\n";
    const body = list
      .map((i) =>
        [
          i.id,
          JSON.stringify(tenantsById[i.tenant_id] ?? ""),
          JSON.stringify(i.plan_name),
          (i.amount_cents / 100).toFixed(2),
          statusLabel[i.status],
          i.issued_at,
          i.paid_at ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell
      title="Faturamento"
      description="Receita, cobranças e inadimplência da plataforma."
      className="w-full max-w-7xl mx-auto"
      actions={
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova fatura
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "MRR (mês atual)", v: `R$ ${metrics.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, h: `${(invoicesQuery.data ?? []).filter((i) => i.status === "paid").length} faturas pagas` },
          { k: "ARR (projeção)", v: `R$ ${metrics.arr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, h: "projeção 12 meses" },
          { k: "Ticket médio", v: `R$ ${metrics.avg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, h: "média por fatura paga" },
          { k: "Inadimplência", v: `R$ ${metrics.overdueSum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, h: `${metrics.overdueCount} faturas vencidas`, accent: metrics.overdueCount > 0 ? "text-rose-600" : "text-muted-foreground" },
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
            <h3 className="font-display text-lg font-semibold text-foreground">Faturas</h3>
            <p className="text-xs text-muted-foreground">Últimas 200</p>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Fatura</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Emissão</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {invoicesQuery.isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!invoicesQuery.isLoading && (invoicesQuery.data ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma fatura ainda. Crie a primeira em "Nova fatura".
                </td></tr>
              )}
              {(invoicesQuery.data ?? []).map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-[11px] text-foreground">{i.external_id ?? i.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-foreground">{tenantsById[i.tenant_id] ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">{i.plan_name}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    R$ {(i.amount_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(i.issued_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
                      {statusIcon[i.status]}
                      {statusLabel[i.status]}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={i.status}
                      onChange={(e) => setStatus.mutate({ id: i.id, status: e.target.value as InvoiceStatus })}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      {(Object.keys(statusLabel) as InvoiceStatus[]).map((s) => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <InvoiceModal
          tenants={tenantsQuery.data ?? []}
          plans={plansQuery.data ?? []}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
          }}
        />
      )}
    </AdminShell>
  );
}

function InvoiceModal({
  tenants,
  plans,
  onClose,
  onCreated,
}: {
  tenants: TenantMin[];
  plans: { slug: string; name: string; price_cents: number }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [planSlug, setPlanSlug] = useState(plans[0]?.slug ?? "");
  const [amount, setAmount] = useState(plans[0]?.price_cents ?? 0);
  const [status, setStatus] = useState<InvoiceStatus>("open");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const plan = plans.find((p) => p.slug === planSlug);
      const { error } = await supabase.from("invoices").insert({
        tenant_id: tenantId,
        plan_name: plan?.name ?? planSlug,
        amount_cents: amount,
        status,
        provider: "manual",
        issued_at: new Date().toISOString(),
        paid_at: status === "paid" ? new Date().toISOString() : null,
      });
      if (error) throw error;
      toast.success("Fatura criada");
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-foreground">Nova fatura</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Cliente</span>
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Plano</span>
            <select
              value={planSlug}
              onChange={(e) => {
                setPlanSlug(e.target.value);
                const p = plans.find((x) => x.slug === e.target.value);
                if (p) setAmount(p.price_cents);
              }}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {plans.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Valor (centavos)</span>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
              {(Object.keys(statusLabel) as InvoiceStatus[]).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
          <button
            onClick={submit}
            disabled={saving || !tenantId || !planSlug}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando…" : "Criar fatura"}
          </button>
        </div>
      </div>
    </div>
  );
}
