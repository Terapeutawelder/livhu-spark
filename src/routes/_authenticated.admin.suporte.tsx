import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LifeBuoy, MessageSquare, Clock, Plus, X, Save, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — Super Admin — LivHub" },
      { name: "description", content: "Tickets e conversas de suporte com os clientes." },
      { property: "og:title", content: "Suporte — Super Admin — LivHub" },
      { property: "og:description", content: "Tickets e conversas de suporte com os clientes." },
    ],
  }),
  component: SupportPage,
});

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "open" | "analyzing" | "waiting_customer" | "resolved" | "closed";
type Ticket = {
  id: string;
  code: string;
  tenant_id: string | null;
  subject: string;
  body: string;
  priority: Priority;
  status: Status;
  created_at: string;
  updated_at: string;
};

const priLabel: Record<Priority, string> = { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" };
const priColor: Record<Priority, string> = {
  low: "bg-emerald-500/10 text-emerald-600",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-rose-500/10 text-rose-600",
  urgent: "bg-rose-600/20 text-rose-700",
};
const statusLabel: Record<Status, string> = {
  open: "Aberto",
  analyzing: "Em análise",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
};
const statusColor: Record<Status, string> = {
  open: "bg-blue-500/10 text-blue-600",
  analyzing: "bg-amber-500/10 text-amber-600",
  waiting_customer: "bg-purple-500/10 text-purple-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)}h`;
  return `há ${Math.floor(s / 86400)}d`;
}

function SupportPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const tickets = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
  });

  const tenants = useQuery({
    queryKey: ["admin", "tenants", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tenantsById = useMemo(() => {
    const m: Record<string, string> = {};
    (tenants.data ?? []).forEach((t) => (m[t.id] = t.name));
    return m;
  }, [tenants.data]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const list = tickets.data ?? [];
    return list.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (query) {
        const hay = `${t.code} ${t.subject} ${tenantsById[t.tenant_id ?? ""] ?? ""}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [tickets.data, statusFilter, query, tenantsById]);

  const counts = useMemo(() => {
    const list = tickets.data ?? [];
    const c: Record<Status, number> = { open: 0, analyzing: 0, waiting_customer: 0, resolved: 0, closed: 0 };
    list.forEach((t) => (c[t.status] += 1));
    return c;
  }, [tickets.data]);

  const resolvedLast7d = useMemo(() => {
    const cut = Date.now() - 7 * 86400 * 1000;
    return (tickets.data ?? []).filter((t) => t.status === "resolved" && new Date(t.updated_at).getTime() > cut).length;
  }, [tickets.data]);

  return (
    <AdminShell
      title="Suporte"
      description="Central de tickets e conversas com os clientes."
      actions={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo ticket
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { k: "Abertos", v: counts.open, i: LifeBuoy },
          { k: "Em análise", v: counts.analyzing, i: Clock },
          { k: "Aguardando cliente", v: counts.waiting_customer, i: MessageSquare },
          { k: "Resolvidos (7d)", v: resolvedLast7d, i: LifeBuoy },
        ].map((c) => (
          <div key={c.k} className="rounded-2xl border border-border bg-surface p-5">
            <c.i className="h-5 w-5 text-gold" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.k}</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{c.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por assunto ou código…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            {(Object.keys(statusLabel) as Status[]).map((s) => (
              <option key={s} value={s}>{statusLabel[s]}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Assunto</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!tickets.isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum ticket encontrado.</td></tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{t.code}</td>
                  <td className="px-4 py-3 text-foreground">{tenantsById[t.tenant_id ?? ""] ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">{t.subject}</td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + priColor[t.priority]}>
                      {priLabel[t.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={(e) => setStatus.mutate({ id: t.id, status: e.target.value as Status })}
                      className={"h-7 rounded-md border-0 px-2 text-xs font-semibold " + statusColor[t.status]}
                    >
                      {(Object.keys(statusLabel) as Status[]).map((s) => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{timeAgo(t.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <TicketModal
          tenants={tenants.data ?? []}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
          }}
        />
      )}
    </AdminShell>
  );
}

function TicketModal({
  tenants,
  onClose,
  onCreated,
}: {
  tenants: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_tickets").insert({
        tenant_id: tenantId || null,
        subject: subject.trim(),
        body: body.trim(),
        priority,
        status: "open",
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Ticket criado");
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-foreground">Novo ticket</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Cliente</span>
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">— Sem cliente vinculado —</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Assunto</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Descrição</span>
            <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Prioridade</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
              {(Object.keys(priLabel) as Priority[]).map((p) => <option key={p} value={p}>{priLabel[p]}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
          <button onClick={submit} disabled={saving || !subject} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? "Salvando…" : "Criar ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
