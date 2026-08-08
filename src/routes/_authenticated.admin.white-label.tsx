import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Palette, Mail, Save, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/white-label")({
  head: () => ({
    meta: [
      { title: "White-label — Super Admin — LivHub" },
      { name: "description", content: "Configurações globais de marca, domínios e emails white-label." },
      { property: "og:title", content: "White-label — Super Admin — LivHub" },
      { property: "og:description", content: "Configurações globais de marca, domínios e emails white-label." },
    ],
  }),
  component: WhiteLabelPage,
});

type Settings = {
  brand_name: string;
  primary_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string;
  noreply_email: string;
  default_timezone: string;
};

function WhiteLabelPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);

  const settings = useQuery({
    queryKey: ["admin", "platform-settings-row"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("brand_name, primary_color, logo_url, favicon_url, support_email, noreply_email, default_timezone")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const domains = useQuery({
    queryKey: ["admin", "domain-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domain_activation_requests")
        .select("id, tenant_id, kind, value, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tenants = useQuery({
    queryKey: ["admin", "tenants", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name, custom_domain, subdomain_status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (next: Settings) => {
      const { error } = await supabase.from("platform_settings").update(next).eq("id", "global");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marca salva");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings-row"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function up<K extends keyof Settings>(k: K, v: Settings[K]) {
    if (!form) return;
    setForm({ ...form, [k]: v });
    setDirty(true);
  }

  const activeDomains = (tenants.data ?? []).filter((t) => t.custom_domain);

  return (
    <AdminShell
      title="White-label"
      description="Personalize marca, domínios e comunicação padrão da plataforma."
      actions={
        <button
          onClick={() => form && save.mutate(form)}
          disabled={!dirty || save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Salvando…" : "Salvar alterações"}
        </button>
      }
    >
      {!form ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gold" />
              <h3 className="font-display text-lg font-semibold text-foreground">Marca padrão</h3>
            </div>
            <p className="text-xs text-muted-foreground">Utilizada quando o cliente não define uma marca própria.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nome da plataforma" value={form.brand_name} onChange={(v) => up("brand_name", v)} />
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Cor primária</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => up("primary_color", e.target.value)}
                    className="h-9 w-14 rounded-lg border border-border bg-background"
                  />
                  <input
                    value={form.primary_color}
                    onChange={(e) => up("primary_color", e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
              </label>
              <Field label="URL do logo" value={form.logo_url ?? ""} onChange={(v) => up("logo_url", v || null)} hint="SVG ou PNG, fundo transparente" />
              <Field label="URL do favicon" value={form.favicon_url ?? ""} onChange={(v) => up("favicon_url", v || null)} hint=".ico ou .png (32×32)" />
              <Field label="Fuso padrão" value={form.default_timezone} onChange={(v) => up("default_timezone", v)} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gold" />
              <h3 className="font-display text-lg font-semibold text-foreground">Email transacional</h3>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Remetente noreply" value={form.noreply_email} onChange={(v) => up("noreply_email", v)} />
              <Field label="Email de suporte" value={form.support_email} onChange={(v) => up("support_email", v)} />
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gold" />
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Domínios personalizados</h3>
              <p className="text-xs text-muted-foreground">Ativos por cliente e solicitações pendentes.</p>
            </div>
          </div>
          <Link
            to="/admin/dominios"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Gerenciar <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ativos</p>
            <ul className="mt-2 space-y-2">
              {activeDomains.length === 0 && (
                <li className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Nenhum domínio custom ativo.
                </li>
              )}
              {activeDomains.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm">
                  <div>
                    <p className="font-mono text-xs text-foreground">{t.custom_domain}</p>
                    <p className="text-xs text-muted-foreground">{t.name}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                    {t.subdomain_status ?? "ativo"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitações recentes</p>
            <ul className="mt-2 space-y-2">
              {(domains.data ?? []).length === 0 && (
                <li className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Nenhuma solicitação.
                </li>
              )}
              {(domains.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm">
                  <div>
                    <p className="font-mono text-xs text-foreground">{d.value}</p>
                    <p className="text-xs text-muted-foreground">{d.kind}</p>
                  </div>
                  <span className={
                    "rounded-full px-2 py-0.5 text-xs font-semibold " +
                    (d.status === "approved" ? "bg-emerald-500/10 text-emerald-600" :
                     d.status === "rejected" ? "bg-rose-500/10 text-rose-600" :
                     "bg-amber-500/10 text-amber-600")
                  }>
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
