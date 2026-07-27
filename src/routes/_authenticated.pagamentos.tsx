import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CreditCard,
  Plus,
  Check,
  Pencil,
  Trash2,
  Video,
  Users,
  Heart,
  Link2,
  ShieldCheck,
  Copy,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — LivHub" },
      {
        name: "description",
        content:
          "Configure serviços de terapia, preços e checkout com Stripe e Mercado Pago para receber pagamentos pelo WhatsApp.",
      },
      { property: "og:title", content: "Pagamentos — LivHub" },
      {
        property: "og:description",
        content:
          "Configure serviços de terapia, preços e checkout com Stripe e Mercado Pago para receber pagamentos pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pagamentos — LivHub" },
      {
        name: "twitter:description",
        content:
          "Configure serviços de terapia, preços e checkout com Stripe e Mercado Pago para receber pagamentos pelo WhatsApp.",
      },
    ],
  }),
  component: PagamentosPage,
});

type Provider = "stripe" | "mercadopago";

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  modality: "online" | "presencial" | "ambos";
  icon: typeof Video;
  active: boolean;
}

const initialServices: Service[] = [
  {
    id: "s1",
    name: "Sessão Individual",
    description: "Psicoterapia individual — 50 minutos",
    duration: 50,
    price: 250,
    modality: "ambos",
    icon: Video,
    active: true,
  },
  {
    id: "s2",
    name: "Terapia de Casal",
    description: "Atendimento para casais — 80 minutos",
    duration: 80,
    price: 380,
    modality: "presencial",
    icon: Heart,
    active: true,
  },
  {
    id: "s3",
    name: "Pacote Mensal (4 sessões)",
    description: "4 sessões individuais com desconto",
    duration: 50,
    price: 900,
    modality: "online",
    icon: Users,
    active: true,
  },
];

function PagamentosPage() {
  const [provider, setProvider] = useState<Provider>("stripe");
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showForm, setShowForm] = useState(false);

  const toggleActive = (id: string) =>
    setServices((s) => s.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
  const remove = (id: string) => setServices((s) => s.filter((x) => x.id !== id));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Pagamentos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure seus serviços e o gateway de checkout usado nos links enviados pelo WhatsApp.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-sidebar-active-foreground shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo serviço
          </button>
        </div>

        {/* Providers */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-semibold">Gateway de pagamento</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProviderCard
              id="stripe"
              title="Stripe"
              subtitle="Cartão internacional, Apple/Google Pay, assinaturas"
              accent="#635bff"
              selected={provider === "stripe"}
              onSelect={() => setProvider("stripe")}
            />
            <ProviderCard
              id="mercadopago"
              title="Mercado Pago"
              subtitle="Pix, boleto e cartão nacional (Brasil)"
              accent="#00b1ea"
              selected={provider === "mercadopago"}
              onSelect={() => setProvider("mercadopago")}
            />
          </div>

          <ProviderConfig provider={provider} />
        </section>

        {/* Novo serviço (mock) */}
        {showForm && (
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Novo serviço</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre uma modalidade de terapia — o link de checkout é gerado automaticamente.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Nome" placeholder="Ex: Sessão Individual" />
              <Field label="Duração (min)" placeholder="50" />
              <Field label="Preço (R$)" placeholder="250,00" />
              <SelectField label="Modalidade" options={["Online", "Presencial", "Ambos"]} />
              <div className="sm:col-span-2">
                <Field label="Descrição" placeholder="Descreva o serviço para o paciente" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
              >
                Salvar serviço
              </button>
            </div>
          </section>
        )}

        {/* Services */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Serviços de terapia</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {services.map((svc) => (
              <ServiceCard
                key={svc.id}
                service={svc}
                provider={provider}
                onToggle={() => toggleActive(svc.id)}
                onRemove={() => remove(svc.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProviderCard({
  title,
  subtitle,
  accent,
  selected,
  onSelect,
}: {
  id: Provider;
  title: string;
  subtitle: string;
  accent: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={
        "group flex items-start gap-3 rounded-xl border p-4 text-left transition-all " +
        (selected
          ? "border-gold bg-gold/5 shadow-sm"
          : "border-border bg-background hover:border-gold/40 hover:bg-muted")
      }
    >
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white"
        style={{ backgroundColor: accent }}
      >
        <CreditCard className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">{title}</p>
          {selected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
              <Check className="h-3 w-3" /> Ativo
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}

function ProviderConfig({ provider }: { provider: Provider }) {
  const isStripe = provider === "stripe";
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-gold" />
        Credenciais {isStripe ? "Stripe" : "Mercado Pago"}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field
          label={isStripe ? "Publishable key" : "Public Key"}
          placeholder={isStripe ? "pk_live_..." : "APP_USR-..."}
        />
        <Field
          label={isStripe ? "Secret key" : "Access Token"}
          placeholder={isStripe ? "sk_live_..." : "APP_USR-..."}
          type="password"
        />
        <Field
          label="Webhook URL"
          value={`https://livhub.app/api/webhooks/${provider}`}
          readOnly
        />
        <SelectField
          label="Moeda"
          options={isStripe ? ["BRL", "USD", "EUR"] : ["BRL", "ARS", "MXN"]}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>As chaves ficam guardadas com criptografia — nunca aparecem no app.</span>
        <button className="inline-flex items-center gap-1 font-semibold text-gold hover:underline">
          Salvar credenciais <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  provider,
  onToggle,
  onRemove,
}: {
  service: Service;
  provider: Provider;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const Icon = service.icon;
  const link = `https://pay.livhub.app/${provider}/${service.id}`;
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{service.name}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {service.duration} min · {service.modality}
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={service.active}
            onChange={onToggle}
          />
          <span className="relative h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-gold">
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{service.description}</p>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Preço</p>
          <p className="font-display text-2xl font-bold text-foreground">
            R$ {service.price.toLocaleString("pt-BR")}
          </p>
        </div>
        <span className="rounded-full bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          via {provider === "stripe" ? "Stripe" : "Mercado Pago"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-background p-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-[11px] text-muted-foreground">{link}</span>
        <button
          onClick={() => navigator.clipboard?.writeText(link)}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Copiar link"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 flex justify-end gap-1">
        <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  readOnly,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        readOnly={readOnly}
        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
