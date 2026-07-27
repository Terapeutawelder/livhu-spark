import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Globe, Palette, Mail, Image as ImageIcon, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/white-label")({
  head: () => ({
    meta: [
      { title: "White-label — Super Admin" },
      { name: "description", content: "Configurações globais de marca, domínios e emails white-label." },
      { property: "og:title", content: "White-label — Super Admin" },
      { property: "og:description", content: "Configurações globais de marca, domínios e emails white-label." },
    ],
  }),
  component: WhiteLabelPage,
});

const domains = [
  { d: "app.aurora.com.br", tenant: "Consultório Aurora", ssl: "Ativo" },
  { d: "crm.serenity.com.br", tenant: "Instituto Serenity", ssl: "Ativo" },
  { d: "portal.bemestar.com", tenant: "Grupo Bem-Estar", ssl: "Provisionando" },
];

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <input
        defaultValue={value}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function WhiteLabelPage() {
  return (
    <AdminShell
      title="White-label"
      description="Personalize marca, domínios e comunicação da plataforma para cada revenda."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Marca padrão</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Utilizada quando o tenant não define uma marca própria.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nome da plataforma" value="LivHub" />
            <Field label="Cor primária" value="#c9a24a" hint="Aceita hex ou HSL" />
            <Field label="Cor de sidebar" value="#0d1117" />
            <Field label="Fonte principal" value="Plus Jakarta Sans" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-dashed border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4" /> Logo (SVG/PNG)
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Recomendado 512×128, fundo transparente</p>
              <button className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                Enviar arquivo
              </button>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4" /> Favicon
              </div>
              <p className="mt-1 text-xs text-muted-foreground">32×32 ou 64×64, .ico ou .png</p>
              <button className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                Enviar arquivo
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Email transacional</h3>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Remetente padrão" value="no-reply@livhub.app" />
            <Field label="Nome de exibição" value="LivHub" />
            <Field label="Domínio DKIM/SPF" value="livhub.app" hint="Verificado ✓" />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gold" />
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Domínios personalizados</h3>
              <p className="text-xs text-muted-foreground">CNAMEs apontando para *.livhub.app</p>
            </div>
          </div>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            + Novo domínio
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Domínio</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">SSL</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.d} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{d.d}</td>
                <td className="px-4 py-3 text-foreground">{d.tenant}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> {d.ssl}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
