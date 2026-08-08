import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  Power,
  Search,
  MoreHorizontal,
  UserCog,
  Loader2,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Super Admin — Contas & Tenants — LivHub" },
      { name: "description", content: "Administração central das contas de usuários e tenants da plataforma LivHub." },
      { property: "og:title", content: "Super Admin — Contas & Tenants — LivHub" },
      { property: "og:description", content: "Administração central das contas de usuários e tenants da plataforma LivHub." },
    ],
  }),
  component: AdminOverview,
});

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
  owner?: { email: string | null; full_name: string | null } | null;
  member_count?: number;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role?: string;
};

import { MetricCard } from "@/components/metric-card";

function KpiCard({
  icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  hint?: string;
  trend?: number[];
}) {
  return (
    <MetricCard icon={icon} label={label} value={value} hint={hint} trend={trend} />
  );
}

function AdminOverview() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const tenantsQuery = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: async (): Promise<TenantRow[]> => {
      const { data: tenants, error } = await supabase
        .from("tenants")
        .select("id, name, slug, plan, is_active, created_at, owner_id")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ownerIds = Array.from(new Set((tenants ?? []).map((t) => t.owner_id)));
      const { data: owners } = ownerIds.length
        ? await supabase.from("profiles").select("id, email, full_name").in("id", ownerIds)
        : { data: [] as { id: string; email: string | null; full_name: string | null }[] };

      const tenantIds = (tenants ?? []).map((t) => t.id);
      const { data: members } = tenantIds.length
        ? await supabase.from("tenant_members").select("tenant_id").in("tenant_id", tenantIds)
        : { data: [] as { tenant_id: string }[] };

      const counts = new Map<string, number>();
      (members ?? []).forEach((m) => counts.set(m.tenant_id, (counts.get(m.tenant_id) ?? 0) + 1));
      const ownersMap = new Map((owners ?? []).map((o) => [o.id, o]));

      return (tenants ?? []).map((t) => ({
        ...t,
        owner: ownersMap.get(t.owner_id) ?? null,
        member_count: counts.get(t.id) ?? 0,
      }));
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "therapist" }));
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (t: TenantRow) => {
      const { error } = await supabase
        .from("tenants")
        .update({ is_active: !t.is_active })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: (_d, t) => {
      toast.success(t.is_active ? "Tenant suspenso" : "Tenant reativado");
      qc.invalidateQueries({ queryKey: ["admin", "tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const { error } = await supabase.from("tenants").update({ plan }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tenants = tenantsQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const filtered = tenants.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.owner?.email ?? "").toLowerCase().includes(q)
    );
  });

  const activeCount = tenants.filter((t) => t.is_active).length;
  const totalUsers = profiles.length;
  const superAdmins = profiles.filter((p) => p.role === "super_admin").length;

  return (
    <AdminShell
      title="Administração de contas"
      description="Gerencie tenants (consultórios e clínicas), donos, membros e papéis da plataforma LivHub."
      className="w-full flex flex-col items-center"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Building2} label="Tenants" value={tenants.length} hint={`${activeCount} ativos`} />
        <KpiCard icon={Users} label="Usuários cadastrados" value={totalUsers} hint="Contas nos últimos 50" />
        <KpiCard icon={ShieldCheck} label="Super admins" value={superAdmins} hint="Com acesso a /admin" />
        <KpiCard
          icon={Power}
          label="Suspensos"
          value={tenants.length - activeCount}
          hint="Bloqueados de acesso"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Tenants</h3>
            <p className="text-xs text-muted-foreground">
              Cada linha é um consultório/conta SaaS. Ações se aplicam à conta inteira.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, slug ou email do dono…"
              className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Dono</th>
                <th className="px-4 py-3">Membros</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenantsQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </td>
                </tr>
              )}
              {!tenantsQuery.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum tenant encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-xs font-bold text-gold">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">/{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{t.owner?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{t.owner?.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{t.member_count}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.plan}
                      onChange={(e) => changePlan.mutate({ id: t.id, plan: e.target.value })}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    >
                      <option value="trial">Trial</option>
                      <option value="solo">Solo</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-semibold " +
                        (t.is_active
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-destructive/10 text-destructive")
                      }
                    >
                      {t.is_active ? "Ativo" : "Suspenso"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleActive.mutate(t)}
                        className={
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                          (t.is_active
                            ? "border border-destructive/40 text-destructive hover:bg-destructive/10"
                            : "border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10")
                        }
                      >
                        <Power className="h-3 w-3" />
                        {t.is_active ? "Suspender" : "Reativar"}
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                        title="Mais ações"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Contas recentes</h3>
            <p className="text-xs text-muted-foreground">
              Últimos usuários registrados na plataforma.
            </p>
          </div>
          <UserCog className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Papel global</th>
                <th className="px-4 py-3">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {profiles.slice(0, 12).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                        {(p.full_name ?? p.email ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{p.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-semibold " +
                        (p.role === "super_admin"
                          ? "bg-gold/15 text-gold"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {p.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
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
