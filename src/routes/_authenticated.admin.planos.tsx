import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Plus, Pencil, Trash2, Star, X, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Super Admin — LivHub" },
      { name: "description", content: "Configure planos, limites e preços da plataforma." },
      { property: "og:title", content: "Planos — Super Admin — LivHub" },
      { property: "og:description", content: "Configure planos, limites e preços da plataforma." },
    ],
  }),
  component: PlansPage,
});

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  contacts_limit: number;
  messages_limit: number;
  users_limit: number;
  ai_agents_limit: number;
  features: string[];
  is_active: boolean;
  is_highlighted: boolean;
  sort_order: number;
  additional_user_price_cents?: number;
  additional_channel_price_cents?: number;
};

const emptyPlan: Omit<Plan, "id"> = {
  slug: "",
  name: "",
  description: "",
  price_cents: 0,
  currency: "BRL",
  contacts_limit: 100,
  messages_limit: 500,
  users_limit: 5,
  ai_agents_limit: 1,
  features: [],
  is_active: true,
  is_highlighted: false,
  sort_order: 99,
  additional_user_price_cents: 0,
  additional_channel_price_cents: 0,
};

function PlansPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);

  const plansQuery = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        features: Array.isArray(p.features) ? (p.features as string[]) : [],
      })) as Plan[];
    },
  });

  const tenantsByPlan = useQuery({
    queryKey: ["admin", "plans", "counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("plan");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const t of data ?? []) map[t.plan] = (map[t.plan] ?? 0) + 1;
      return map;
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Partial<Plan>) => {
      const payload: any = {
        slug: p.slug!.trim().toLowerCase(),
        name: p.name!.trim(),
        description: p.description ?? "",
        price_cents: Number(p.price_cents) || 0,
        currency: p.currency ?? "BRL",
        contacts_limit: Number(p.contacts_limit) || 0,
        messages_limit: Number(p.messages_limit) || 0,
        users_limit: Number(p.users_limit) || 1,
        ai_agents_limit: Number(p.ai_agents_limit) || 0,
        features: p.features ?? [],
        is_active: p.is_active ?? true,
        is_highlighted: p.is_highlighted ?? false,
        sort_order: Number(p.sort_order) || 0,
        additional_user_price_cents: Number(p.additional_user_price_cents) || 0,
        additional_channel_price_cents: Number(p.additional_channel_price_cents) || 0,
      };
      if (p.id) {
        const { error } = await supabase.from("subscription_plans").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plano salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano removido");
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const plans = plansQuery.data ?? [];

  return (
    <AdminShell
      title="Planos de assinatura"
      description="Preços, limites e recursos disponíveis por plano."
      className="w-full max-w-7xl mx-auto"
      actions={
        <button
          onClick={() => setEditing(emptyPlan)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo plano
        </button>
      }
    >
      {plansQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando planos…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 justify-center">
          {plans.map((p) => (
            <div
              key={p.id}
              className={
                "relative rounded-2xl border p-6 " +
                (p.is_highlighted
                  ? "border-gold bg-gold/5 ring-1 ring-gold/40"
                  : "border-border bg-surface")
              }
            >
              {p.is_highlighted && (
                <span className="absolute -top-2 right-4 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                  <Star className="h-3 w-3" /> Destaque
                </span>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">{p.name}</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{p.slug}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(p)}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover o plano ${p.name}?`)) remove.mutate(p.id);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3">
                <span className="font-display text-3xl font-bold text-foreground">
                  {p.price_cents === 0
                    ? "Grátis"
                    : `R$ ${(p.price_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </span>
                {p.price_cents > 0 && <span className="ml-1 text-sm text-muted-foreground">/ mês</span>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tenantsByPlan.data?.[p.slug] ?? 0} clientes neste plano
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Contatos", p.contacts_limit],
                  ["Mensagens/mês", p.messages_limit],
                  ["Usuários Equipe", p.users_limit],
                  ["Agentes IA", p.ai_agents_limit],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-md border border-border bg-background p-2">
                    <p className="text-muted-foreground">{k}</p>
                    <p className="font-semibold text-foreground">
                      {v === 999 || v === 999999 || (v as number) >= 100000 ? "∞" : (v as number).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
                <div className="col-span-2 mt-1 border-t border-border pt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Adicional Usuário</span>
                    <span className="font-medium text-foreground">
                      R$ {((p.additional_user_price_cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Adicional Canal</span>
                    <span className="font-medium text-foreground">
                      R$ {((p.additional_channel_price_cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {!p.is_active && (
                <p className="mt-3 rounded-md bg-muted px-2 py-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                  Inativo
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PlanEditor
          value={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => upsert.mutate(editing)}
          saving={upsert.isPending}
        />
      )}
    </AdminShell>
  );
}

function PlanEditor({
  value,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  value: Partial<Plan>;
  onChange: (v: Partial<Plan>) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  function up<K extends keyof Plan>(k: K, v: Plan[K]) {
    onChange({ ...value, [k]: v });
  }
  const featuresText = (value.features ?? []).join("\n");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-foreground">
            {value.id ? "Editar plano" : "Novo plano"}
          </h3>
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Nome</span>
            <input
              value={value.name ?? ""}
              onChange={(e) => up("name", e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Slug</span>
            <input
              value={value.slug ?? ""}
              onChange={(e) => up("slug", e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono"
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">Descrição</span>
            <input
              value={value.description ?? ""}
              onChange={(e) => up("description", e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Preço (centavos)</span>
            <input
              type="number"
              value={value.price_cents ?? 0}
              onChange={(e) => up("price_cents", Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Ordem</span>
            <input
              type="number"
              value={value.sort_order ?? 0}
              onChange={(e) => up("sort_order", Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          {[
            ["contacts_limit", "Contatos"],
            ["messages_limit", "Mensagens/mês"],
            ["users_limit", "Usuários Equipe (Clínica)"],
            ["ai_agents_limit", "Agentes IA"],
          ].map(([k, label]) => (
            <div key={k} className="grid gap-1.5 text-sm">
              <label className="font-medium text-foreground">{label}</label>
              <input
                type="number"
                value={(value as any)[k] ?? 0}
                onChange={(e) => up(k as keyof Plan, Number(e.target.value) as never)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              {k === 'users_limit' && (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Define o número de profissionais incluídos no plano base da clínica.
                </p>
              )}
            </div>
          ))}
          <div className="grid gap-1.5 text-sm">
            <label className="font-medium text-foreground">Valor Adicional por Usuário (centavos)</label>
            <input
              type="number"
              value={value.additional_user_price_cents ?? 0}
              onChange={(e) => up("additional_user_price_cents", Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="0.00"
            />
            <p className="text-[10px] text-muted-foreground">Custo extra por cada usuário além do limite.</p>
          </div>
          <div className="grid gap-1.5 text-sm">
            <label className="font-medium text-foreground">Valor Adicional por Canal (centavos)</label>
            <input
              type="number"
              value={value.additional_channel_price_cents ?? 0}
              onChange={(e) => up("additional_channel_price_cents", Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="0.00"
            />
            <p className="text-[10px] text-muted-foreground">Custo extra por cada canal além do limite.</p>
          </div>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">Recursos (um por linha)</span>
            <textarea
              rows={5}
              value={featuresText}
              onChange={(e) => up("features", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!value.is_active}
              onChange={(e) => up("is_active", e.target.checked)}
            />
            Plano ativo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!value.is_highlighted}
              onChange={(e) => up("is_highlighted", e.target.checked)}
            />
            Destacar como recomendado
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving || !value.name || !value.slug}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando…" : "Salvar plano"}
          </button>
        </div>
      </div>
    </div>
  );
}
