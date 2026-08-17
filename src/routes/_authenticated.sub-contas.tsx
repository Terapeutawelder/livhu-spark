import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Boxes, Plus, Building2, User } from "lucide-react";
import { toast } from "sonner";

import { getWhitelabelDashboardData, createWhitelabelSubAccount } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/sub-contas")({
  head: () => ({
    meta: [
      { title: "Sub-contas — LivHub White-label" },
      { name: "description", content: "Gerencie os consultórios e clínicas da sua rede white-label." },
      { property: "og:title", content: "Sub-contas — LivHub White-label" },
      { property: "og:description", content: "Gerencie os consultórios e clínicas da sua rede white-label." },
    ],
  }),
  component: SubAccountsPage,
});

function SubAccountsPage() {
  const qc = useQueryClient();
  const fetchWl = useServerFn(getWhitelabelDashboardData);
  const createSub = useServerFn(createWhitelabelSubAccount);

  const { data, isLoading } = useQuery({
    queryKey: ["whitelabel-dashboard"],
    queryFn: () => fetchWl(),
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "clinic">("individual");

  const mutation = useMutation({
    mutationFn: () => createSub({ data: { name, slug: slug || name, accountType } }),
    onSuccess: () => {
      toast.success("Sub-conta criada com sucesso.");
      setName("");
      setSlug("");
      qc.invalidateQueries({ queryKey: ["whitelabel-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const children = data?.children ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Sub-contas</h1>
          <p className="text-sm text-muted-foreground">Consultórios e clínicas operando sob a sua marca.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold">
          <Boxes className="h-3.5 w-3.5" /> {children.length} contas
        </span>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-display text-sm font-bold">Nova sub-conta</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          A conta é criada em período de teste e herda a sua marca white-label.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return toast.error("Informe o nome da conta.");
            mutation.mutate();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do consultório"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="identificador (ex: clinica-luz)"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as "individual" | "clinic")}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="individual">Profissional</option>
            <option value="clinic">Clínica</option>
          </select>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-sidebar-active-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {mutation.isPending ? "Criando…" : "Criar"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 font-display text-sm font-bold">Rede</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && children.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma sub-conta criada ainda.</p>
        )}
        <ul className="divide-y divide-border">
          {children.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold">
                {c.account_type === "clinic" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  /{c.slug} · {c.members_count} profissionais · {c.contacts_count} pacientes
                </p>
              </div>
              <span className="text-xs capitalize text-muted-foreground">{c.plan}</span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                  (c.is_active
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-300")
                }
              >
                {c.is_active ? "Ativa" : "Inativa"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
