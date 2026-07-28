import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Search, ShieldCheck, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Super Admin — LivHub" },
      { name: "description", content: "Todos os usuários da plataforma e seus papéis." },
      { property: "og:title", content: "Usuários — Super Admin — LivHub" },
      { property: "og:description", content: "Todos os usuários da plataforma e seus papéis." },
    ],
  }),
  component: UsersPage,
});

type Role = "super_admin" | "admin" | "therapist";
type ProfileRow = { id: string; email: string | null; full_name: string | null; created_at: string };

const roleLabel: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  therapist: "Psicoterapeuta",
};
const roleColor: Record<Role, string> = {
  super_admin: "bg-gold/20 text-gold",
  admin: "bg-blue-500/10 text-blue-600",
  therapist: "bg-emerald-500/10 text-emerald-600",
};

function UsersPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const profiles = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const roles = useQuery({
    queryKey: ["admin", "user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map: Record<string, Role[]> = {};
      for (const r of data ?? []) {
        map[r.user_id] = [...(map[r.user_id] ?? []), r.role as Role];
      }
      return map;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role, on }: { userId: string; role: Role; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "user_roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const list = profiles.data ?? [];
    return list.filter((p) => {
      const userRoles = roles.data?.[p.id] ?? [];
      if (roleFilter !== "all" && !userRoles.includes(roleFilter)) return false;
      if (query) {
        const hay = `${p.email ?? ""} ${p.full_name ?? ""}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [profiles.data, roles.data, roleFilter, query]);

  const counts = useMemo(() => {
    const c: Record<Role, number> = { super_admin: 0, admin: 0, therapist: 0 };
    Object.values(roles.data ?? {}).forEach((rs) => rs.forEach((r) => (c[r] = (c[r] ?? 0) + 1)));
    return c;
  }, [roles.data]);

  return (
    <AdminShell
      title="Usuários & Papéis"
      description="Todos os usuários registrados na plataforma."
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { k: "Total", v: profiles.data?.length ?? 0, i: Shield },
          { k: "Super admins", v: counts.super_admin, i: ShieldCheck },
          { k: "Administradores", v: counts.admin, i: Shield },
          { k: "Psicoterapeutas", v: counts.therapist, i: Shield },
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
              placeholder="Buscar por nome ou email…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Todos os papéis</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Administrador</option>
            <option value="therapist">Psicoterapeuta</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Papéis</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const userRoles = new Set(roles.data?.[p.id] ?? []);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                          {(p.full_name ?? p.email ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {[...userRoles].map((r) => (
                          <span key={r} className={"rounded-full px-2 py-0.5 text-xs font-semibold " + roleColor[r]}>
                            {roleLabel[r]}
                          </span>
                        ))}
                        {userRoles.size === 0 && (
                          <span className="text-xs text-muted-foreground">Sem papel</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(["super_admin", "admin", "therapist"] as Role[]).map((r) => {
                          const on = userRoles.has(r);
                          return (
                            <button
                              key={r}
                              onClick={() => setRole.mutate({ userId: p.id, role: r, on: !on })}
                              className={
                                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors " +
                                (on
                                  ? "border-gold/40 bg-gold/10 text-gold"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted")
                              }
                              title={on ? `Remover ${roleLabel[r]}` : `Conceder ${roleLabel[r]}`}
                            >
                              {on ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                              {roleLabel[r]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!profiles.isLoading && rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
