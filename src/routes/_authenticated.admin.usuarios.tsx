import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Shield, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários & Roles — Super Admin" },
      { name: "description", content: "Equipe interna com acesso ao painel super admin." },
      { property: "og:title", content: "Usuários & Roles — Super Admin" },
      { property: "og:description", content: "Equipe interna com acesso ao painel super admin." },
    ],
  }),
  component: UsersPage,
});

const users = [
  { n: "Lucas Andrade", email: "lucas@livhub.app", role: "Super Admin", last: "há 2 min" },
  { n: "Bruna Reis", email: "bruna@livhub.app", role: "Financeiro", last: "há 1h" },
  { n: "Igor Menezes", email: "igor@livhub.app", role: "Suporte N2", last: "há 3h" },
  { n: "Camila Duarte", email: "camila@livhub.app", role: "Suporte N1", last: "ontem" },
  { n: "Thiago Rocha", email: "thiago@livhub.app", role: "Engenharia", last: "há 5 dias" },
];

const roles = [
  { name: "Super Admin", desc: "Acesso completo a todos os tenants e configurações.", perms: 24 },
  { name: "Financeiro", desc: "Faturas, MRR, planos e inadimplência.", perms: 8 },
  { name: "Suporte N1", desc: "Visualização de tenants + reset de senha.", perms: 5 },
  { name: "Suporte N2", desc: "N1 + impersonate + reprocessar filas.", perms: 12 },
  { name: "Engenharia", desc: "Logs, filas, saúde do sistema e feature flags.", perms: 15 },
];

function UsersPage() {
  return (
    <AdminShell
      title="Usuários & Roles"
      description="Equipe interna que administra a plataforma."
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <UserPlus className="h-4 w-4" /> Convidar admin
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface lg:col-span-2">
          <div className="border-b border-border p-4">
            <h3 className="font-display text-lg font-semibold text-foreground">Administradores</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                        {u.n.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.n}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Papéis</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {roles.map((r) => (
              <li key={r.name} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{r.name}</p>
                  <span className="text-xs text-muted-foreground">{r.perms} permissões</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
