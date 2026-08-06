import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Check, ShieldCheck, Copy, Video, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { getPaymentSettings, savePaymentSettings, listPaymentOrders } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — LivHub" },
      {
        name: "description",
        content:
          "Configure o checkout com Stripe ou Mercado Pago, a sala de vídeo das sessões e acompanhe as cobranças dos pacientes.",
      },
      { property: "og:title", content: "Pagamentos — LivHub" },
      {
        property: "og:description",
        content: "Checkout com Stripe ou Mercado Pago e confirmação automática da sessão no WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PagamentosPage,
});

type Provider = "stripe" | "mercadopago";

function PagamentosPage() {
  const load = useServerFn(getPaymentSettings);
  const save = useServerFn(savePaymentSettings);
  const loadOrders = useServerFn(listPaymentOrders);

  const settingsQuery = useQuery({ queryKey: ["payment-settings"], queryFn: () => load() });
  const ordersQuery = useQuery({ queryKey: ["payment-orders"], queryFn: () => loadOrders() });

  const [provider, setProvider] = useState<Provider>("stripe");
  const [isActive, setIsActive] = useState(false);
  const [currency, setCurrency] = useState("BRL");
  const [meetingMode, setMeetingMode] = useState<"virtual" | "fixed" | "none">("virtual");
  const [fixedMeetingUrl, setFixedMeetingUrl] = useState("");
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [stripePublishable, setStripePublishable] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const s = settingsQuery.data;
  useEffect(() => {
    if (!s) return;
    setProvider(s.provider === "mercadopago" ? "mercadopago" : "stripe");
    setIsActive(s.isActive);
    setCurrency(s.currency || "BRL");
    setMeetingMode(s.meetingMode);
    setFixedMeetingUrl(s.fixedMeetingUrl || "");
    setMpPublicKey(s.mpPublicKey || "");
    setStripePublishable(s.stripePublishable || "");
  }, [s]);

  const isStripe = provider === "stripe";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${origin}/api/public/hooks/payments/${provider}`;

  const handleSave = async () => {
    setSaving(true);
    const res = await save({
      data: {
        provider,
        isActive,
        currency,
        meetingMode,
        fixedMeetingUrl: fixedMeetingUrl || undefined,
        mpPublicKey: mpPublicKey || undefined,
        mpAccessToken: mpAccessToken || undefined,
        stripePublishable: stripePublishable || undefined,
        stripeSecret: stripeSecret || undefined,
        stripeWebhookSecret: stripeWebhookSecret || undefined,
      },
    });
    setSaving(false);
    if (res.ok) {
      setMpAccessToken("");
      setStripeSecret("");
      setStripeWebhookSecret("");
      settingsQuery.refetch();
      toast.success("Configurações de pagamento salvas.");
    } else {
      toast.error(res.error ?? "Não foi possível salvar.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Pagamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ao agendar pela sua landing page, o paciente é enviado direto ao checkout. Confirmado o pagamento, a
            sessão é confirmada e o link da sala vai automaticamente no WhatsApp.{" "}
            <Link to="/servicos" className="font-semibold text-gold hover:underline">
              Gerencie seus serviços e preços
            </Link>
            .
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">Gateway de pagamento</h2>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-[var(--gold)]"
              />
              Cobrança ativa no agendamento
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ProviderCard
              title="Stripe"
              subtitle="Cartão internacional, Apple/Google Pay"
              accent="#635bff"
              selected={isStripe}
              onSelect={() => setProvider("stripe")}
            />
            <ProviderCard
              title="Mercado Pago"
              subtitle="Pix, boleto e cartão nacional (Brasil)"
              accent="#00b1ea"
              selected={!isStripe}
              onSelect={() => setProvider("mercadopago")}
            />
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-border bg-background p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              Credenciais {isStripe ? "Stripe" : "Mercado Pago"}
              {(isStripe ? s?.hasStripeSecret : s?.hasMpToken) && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                  chave salva {s?.credentialHint}
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {isStripe ? (
                <>
                  <Field
                    label="Publishable key"
                    placeholder="pk_live_..."
                    value={stripePublishable}
                    onChange={setStripePublishable}
                  />
                  <Field
                    label="Secret key"
                    placeholder={s?.hasStripeSecret ? "•••• (deixe vazio para manter)" : "sk_live_..."}
                    type="password"
                    value={stripeSecret}
                    onChange={setStripeSecret}
                  />
                  <Field
                    label="Webhook signing secret (opcional)"
                    placeholder="whsec_..."
                    type="password"
                    value={stripeWebhookSecret}
                    onChange={setStripeWebhookSecret}
                  />
                </>
              ) : (
                <>
                  <Field label="Public Key" placeholder="APP_USR-..." value={mpPublicKey} onChange={setMpPublicKey} />
                  <Field
                    label="Access Token"
                    placeholder={s?.hasMpToken ? "•••• (deixe vazio para manter)" : "APP_USR-..."}
                    type="password"
                    value={mpAccessToken}
                    onChange={setMpAccessToken}
                  />
                </>
              )}
              <SelectField
                label="Moeda"
                value={currency}
                onChange={setCurrency}
                options={isStripe ? ["BRL", "USD", "EUR"] : ["BRL", "ARS", "MXN"]}
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground">Webhook URL (cole no painel do gateway)</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-xs">{webhookUrl}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("URL copiada.");
                  }}
                  className="text-gold hover:opacity-80"
                  aria-label="Copiar webhook"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              As chaves ficam guardadas com criptografia — nunca aparecem no app nem no navegador.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-semibold">Sala da sessão online</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Como gerar o link"
              value={meetingMode}
              onChange={(v) => setMeetingMode(v as typeof meetingMode)}
              options={["virtual", "fixed", "none"]}
              labels={{ virtual: "Sala gerada automaticamente", fixed: "Sempre o mesmo link", none: "Sem link" }}
            />
            {meetingMode === "fixed" && (
              <Field
                label="Link fixo (Google Meet, Zoom…)"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={fixedMeetingUrl}
                onChange={setFixedMeetingUrl}
              />
            )}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            O link é enviado ao paciente no WhatsApp junto da confirmação, logo após o pagamento.
          </p>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-sidebar-active-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salvar configurações
          </button>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-semibold">Cobranças recentes</h2>
          </div>
          {ordersQuery.data?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Data</th>
                    <th className="py-2">Valor</th>
                    <th className="py-2">Gateway</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.data.map((o: any) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="py-2">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2 font-medium">
                        {(o.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: o.currency || "BRL" })}
                      </td>
                      <td className="py-2 capitalize">{o.provider}</td>
                      <td className="py-2">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                            (o.status === "paid"
                              ? "bg-gold/15 text-gold"
                              : o.status === "failed"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground")
                          }
                        >
                          {o.status === "paid" ? "Pago" : o.status === "failed" ? "Falhou" : "Aguardando"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma cobrança gerada ainda.</p>
          )}
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
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all " +
        (selected ? "border-gold bg-gold/5 shadow-sm" : "border-border bg-background hover:border-gold/40 hover:bg-muted")
      }
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: accent }}>
        <CreditCard className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">{title}</p>
          {selected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
              <Check className="h-3 w-3" /> Selecionado
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-gold"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}
