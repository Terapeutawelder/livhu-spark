import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MoreHorizontal, Search, Filter, Pause, Play, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  head: () => ({
    meta: [
      { title: "Clientes — Super Admin — LivHub" },
      { name: "description", content: "Gerencie contas, planos e status dos clientes LivHub." },
      { property: "og:title", content: "Clientes — Super Admin — LivHub" },
      { property: "og:description", content: "Gerencie contas, planos e status dos clientes LivHub." },
    ],
  }),
  component: TenantsPage,
});

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  trial_ends_at: string | null;
  created_at: string;
  owner_id: string;
};

type OwnerInfo = { email: string | null; full_name: string | null };

function statusOf(t: TenantRow): "Ativo" | "Trial" | "Suspenso" {
  if (!t.is_active) return "Suspenso";
  if (t.plan === "trial") return "Trial";
  return "Ativo";
}
const statusColor: Record<string, string> = {
  Ativo: "bg-emerald-500/10 text-emerald-600",
  Trial: "bg-amber-500/10 text-amber-600",
  Suspenso: "bg-rose-500/10 text-rose-600",
};

function TenantsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, plan, is_active, trial_ends_at, created_at, owner_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantRow[];
    },
  });

  const ownersQuery = useQuery({
    queryKey: ["admin", "tenants", "owners", tenantsQuery.data?.length ?? 0],
    enabled: !!tenantsQuery.data && tenantsQuery.data.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set((tenantsQuery.data ?? []).map((t) => t.owner_id))).filter(Boolean);
      if (ids.length === 0) return {};
      const { data, error } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      if (error) throw error;
      const map: Record<string, OwnerInfo> = {};
      for (const p of data ?? []) map[p.id] = { email: p.email, full_name: p.full_name };
      return map;
    },
  });

  const plansQuery = useQuery({
    queryKey: ["admin", "plans", "min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("slug, name, price_cents")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateTenant = useMutation({
    mutationFn: async (patch: { id: string; is_active?: boolean; plan?: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("tenants").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "tenants"] });
      setOpenMenu(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const list = tenantsQuery.data ?? [];
    return list.filter((t) => {
      if (planFilter !== "all" && t.plan !== planFilter) return false;
      const st = statusOf(t);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (query) {
        const owner = ownersQuery.data?.[t.owner_id];
        const hay = `${t.name} ${t.slug} ${owner?.email ?? ""} ${owner?.full_name ?? ""}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [tenantsQuery.data, ownersQuery.data, query, planFilter, statusFilter]);

  const planPrice = (slug: string) =>
    plansQuery.data?.find((p) => p.slug === slug)?.price_cents ?? 0;

  return (
    <AdminShell
      title="Clientes"
      description="Todos os consultórios e clínicas que operam na plataforma."
      className="w-full max-w-7xl mx-auto"
    >
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, slug ou email…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
            >
              <option value="all">Todos os planos</option>
              {(plansQuery.data ?? []).map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Trial">Trial</option>
            <option value="Suspenso">Suspenso</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} clientes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tenantsQuery.isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!tenantsQuery.isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
              )}
              {rows.map((t) => {
                const owner = ownersQuery.data?.[t.owner_id];
                const st = statusOf(t);
                const mrr = t.plan === "trial" || !t.is_active ? 0 : planPrice(t.plan) / 100;
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                          {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {owner?.email ?? "—"} · <span className="font-mono">{t.slug}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold capitalize">
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + statusColor[st]}>
                        {st}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenu === t.id && (
                          <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
                            <button
                              onClick={() => updateTenant.mutate({ id: t.id, is_active: !t.is_active })}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              {t.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              {t.is_active ? "Suspender cliente" : "Reativar cliente"}
                            </button>
                            <div className="border-t border-border">
                              <p className="px-3 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">Alterar plano</p>
                              {(plansQuery.data ?? []).map((p) => (
                                <button
                                  key={p.slug}
                                  disabled={p.slug === t.plan}
                                  onClick={() => updateTenant.mutate({ id: t.id, plan: p.slug })}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-40"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
