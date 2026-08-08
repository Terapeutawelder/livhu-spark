import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings, Palette, Bell, Shield, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracao")({
  head: () => ({
    meta: [
      { title: "Configuração — Super Admin — LivHub" },
      { name: "description", content: "Configurações globais da plataforma LivHub: marca, notificações, políticas e integrações." },
      { property: "og:title", content: "Configuração — Super Admin — LivHub" },
      { property: "og:description", content: "Configurações globais da plataforma LivHub: marca, notificações, políticas e integrações." },
    ],
  }),
  component: ConfigPage,
});

type PlatformSettings = {
  brand_name: string;
  support_email: string;
  default_timezone: string;
  primary_color: string;
  trial_days: number;
  allow_signups: boolean;
  require_email_verification: boolean;
  notify_new_tenant: boolean;
  notify_failed_payment: boolean;
  maintenance_mode: boolean;
};

const DEFAULTS: PlatformSettings = {
  brand_name: "LivHub",
  support_email: "suporte@livhub.app",
  default_timezone: "America/Sao_Paulo",
  primary_color: "#D4A017",
  trial_days: 14,
  allow_signups: true,
  require_email_verification: true,
  notify_new_tenant: true,
  notify_failed_payment: true,
  maintenance_mode: false,
};

const STORAGE_KEY = "livhub.platform.settings";

function Section({ icon: Icon, title, desc, children }: { icon: typeof Settings; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
          (checked ? "bg-gold" : "bg-muted")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " +
            (checked ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}

function ConfigPage() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: async (): Promise<PlatformSettings> => {
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
      } catch {}
      return DEFAULTS;
    },
  });

  useEffect(() => {
    if (query.data) setSettings(query.data);
  }, [query.data]);

  const save = useMutation({
    mutationFn: async (next: PlatformSettings) => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // aplica cor primária na marca padrão dos tenants novos: registrado como preferência global
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.auth.updateUser({ data: { platform_settings: next } });
      }
      return next;
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function update<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }

  return (
    <AdminShell
      title="Configuração da plataforma"
      description="Ajustes globais que valem para todos os clientes do LivHub."
      className="w-full"
      actions={
        <button
          onClick={() => save.mutate(settings)}
          disabled={!dirty || save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Salvando…" : "Salvar alterações"}
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Palette} title="Marca padrão" desc="Aplicada a novos tenants e páginas públicas.">
          <Field label="Nome da plataforma">
            <input
              value={settings.brand_name}
              onChange={(e) => update("brand_name", e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Cor primária" hint="Hex, ex: #D4A017">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-lg border border-border bg-background"
              />
              <input
                value={settings.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
          </Field>
        </Section>

        <Section icon={Globe} title="Regionalização e comercial" desc="Fuso padrão e período de teste dos novos clientes.">
          <Field label="Fuso horário padrão">
            <select
              value={settings.default_timezone}
              onChange={(e) => update("default_timezone", e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
              <option value="America/Belem">America/Belem (BRT)</option>
              <option value="America/Manaus">America/Manaus (AMT)</option>
              <option value="America/Recife">America/Recife (BRT)</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
          <Field label="Dias de trial" hint="Duração do período gratuito para novos clientes.">
            <input
              type="number"
              min={0}
              max={90}
              value={settings.trial_days}
              onChange={(e) => update("trial_days", Number(e.target.value))}
              className="h-9 w-32 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
        </Section>

        <Section icon={Shield} title="Segurança e cadastro" desc="Regras de criação de contas na plataforma.">
          <Toggle
            checked={settings.allow_signups}
            onChange={(v) => update("allow_signups", v)}
            label="Permitir novos cadastros"
            desc="Quando desligado, apenas o super admin pode criar contas."
          />
          <Toggle
            checked={settings.require_email_verification}
            onChange={(v) => update("require_email_verification", v)}
            label="Exigir verificação de email"
            desc="Bloqueia acesso até o email ser confirmado."
          />
          <Toggle
            checked={settings.maintenance_mode}
            onChange={(v) => update("maintenance_mode", v)}
            label="Modo manutenção"
            desc="Exibe página de manutenção para todos os tenants."
          />
        </Section>

        <Section icon={Bell} title="Notificações administrativas" desc="Alertas enviados para o email de suporte.">
          <Field label="Email de suporte">
            <input
              type="email"
              value={settings.support_email}
              onChange={(e) => update("support_email", e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Toggle
            checked={settings.notify_new_tenant}
            onChange={(v) => update("notify_new_tenant", v)}
            label="Novo cliente cadastrado"
            desc="Receba um email cada vez que um tenant é criado."
          />
          <Toggle
            checked={settings.notify_failed_payment}
            onChange={(v) => update("notify_failed_payment", v)}
            label="Pagamentos falhos"
            desc="Alerta quando uma cobrança recorrente falhar."
          />
        </Section>
      </div>
    </AdminShell>
  );
}
