import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Boxes, Plus, Building2, User, Pencil, PauseCircle, PlayCircle, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

import {
  getWhitelabelDashboardData,
  createWhitelabelSubAccount,
  updateWhitelabelSubAccount,
  setWhitelabelSubAccountActive,
  deleteWhitelabelSubAccount,
} from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/sub-contas")({
  head: () => ({
    meta: [
      { title: "Sub-contas — LivHub White-label" },
      { name: "description", content: "Crie, edite, suspenda e remova os consultórios e clínicas da sua rede." },
      { property: "og:title", content: "Sub-contas — LivHub White-label" },
      {
        property: "og:description",
        content: "Crie, edite, suspenda e remova os consultórios e clínicas da sua rede.",
      },
    ],
  }),
  component: SubAccountsPage,
});

type AccountType = "individual" | "clinic";

type Child = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  account_type: string;
  is_active: boolean;
  contacts_count: number;
  members_count: number;
};

function SubAccountsPage() {
  const qc = useQueryClient();
  const fetchWl = useServerFn(getWhitelabelDashboardData);
  const createSub = useServerFn(createWhitelabelSubAccount);
  const updateSub = useServerFn(updateWhitelabelSubAccount);
  const toggleSub = useServerFn(setWhitelabelSubAccountActive);
  const removeSub = useServerFn(deleteWhitelabelSubAccount);

  const { data, isLoading } = useQuery({
    queryKey: ["whitelabel-dashboard"],
    queryFn: () => fetchWl(),
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["whitelabel-dashboard"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: () => createSub({ data: { name, slug: slug || name, accountType } }),
    onSuccess: () => {
      toast.success("Sub-conta criada com sucesso.");
      setName("");
      setSlug("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; name: string; slug: string; accountType: AccountType }) =>
      updateSub({ data: v }),
    onSuccess: () => {
      toast.success("Sub-conta atualizada.");
      setEditingId(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => toggleSub({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.isActive ? "Sub-conta reativada." : "Sub-conta suspensa.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeSub({ data: { id } }),
    onSuccess: () => {
      toast.success("Sub-conta removida.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const children = (data?.children ?? []) as Child[];

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
            createMutation.mutate();
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
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="individual">Profissional</option>
            <option value="clinic">Clínica</option>
          </select>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-sidebar-active-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {createMutation.isPending ? "Criando…" : "Criar"}
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
          {children.map((c) =>
            editingId === c.id ? (
              <li key={c.id} className="py-3">
                <EditRow
                  child={c}
                  pending={updateMutation.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(v) => updateMutation.mutate({ id: c.id, ...v })}
                />
              </li>
            ) : (
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
                  {c.is_active ? "Ativa" : "Suspensa"}
                </span>
                <div className="flex items-center gap-1">
                  <IconButton title="Editar" onClick={() => setEditingId(c.id)}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    title={c.is_active ? "Suspender acesso" : "Reativar acesso"}
                    onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.is_active })}
                  >
                    {c.is_active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  </IconButton>
                  <IconButton
                    title="Remover"
                    danger
                    onClick={() => {
                      if (confirm(`Remover definitivamente "${c.name}"? Esta ação não pode ser desfeita.`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </li>
            ),
          )}
        </ul>
        <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Contas suspensas continuam com os dados salvos, mas a equipe não consegue acessar o painel até a
          reativação.
        </p>
      </section>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={
        "grid h-8 w-8 place-items-center rounded-md transition hover:bg-muted " +
        (danger ? "text-rose-500 hover:text-rose-600" : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function EditRow({
  child,
  pending,
  onSave,
  onCancel,
}: {
  child: Child;
  pending: boolean;
  onSave: (v: { name: string; slug: string; accountType: AccountType }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(child.name);
  const [slug, setSlug] = useState(child.slug);
  const [accountType, setAccountType] = useState<AccountType>(
    child.account_type === "clinic" ? "clinic" : "individual",
  );

  return (
    <form
      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, slug, accountType });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
      />
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
      />
      <select
        value={accountType}
        onChange={(e) => setAccountType(e.target.value as AccountType)}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
      >
        <option value="individual">Profissional</option>
        <option value="clinic">Clínica</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gold px-3 text-xs font-semibold text-sidebar-active-foreground disabled:opacity-60"
      >
        <Check className="h-3.5 w-3.5" /> Salvar
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" /> Cancelar
      </button>
    </form>
  );
}
