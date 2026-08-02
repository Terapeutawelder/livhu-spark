import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { ProfileContent, ProfileTheme } from "@/lib/public-profile.types";

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  modality: string;
};

type Props = {
  template: string;
  theme: ProfileTheme;
  content: ProfileContent;
  services: PublicService[];
  slug: string;
  /** No editor o agendamento é apenas ilustrativo. */
  interactive?: boolean;
};

const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#d9d2c7"/><circle cx="300" cy="290" r="110" fill="#bfb4a5"/><rect x="130" y="430" width="340" height="260" rx="140" fill="#bfb4a5"/></svg>`,
  );

export function PublicLanding({ template, theme, content, services, slug, interactive = true }: Props) {
  const dark = template === "aurora";
  const s: CSSProperties = {
    background: theme.bg,
    color: theme.text,
    fontFamily: theme.bodyFont,
  };
  const h: CSSProperties = { fontFamily: theme.headingFont };
  const card: CSSProperties = {
    background: theme.surface,
    borderRadius: theme.radius,
    border: `1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}`,
  };
  const btn: CSSProperties = {
    background: theme.accent,
    color: theme.accentText,
    borderRadius: 999,
  };

  return (
    <div style={s}>
      {/* Nav */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          background: dark ? "rgba(13,21,36,.85)" : `${theme.bg}dd`,
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}`,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="text-lg font-semibold tracking-tight" style={h}>
            {content.name}
          </span>
          <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: theme.muted }}>
            {content.sections.topics && <a href="#servicos">Como ajudo</a>}
            {content.sections.about && <a href="#sobre">Sobre</a>}
            {content.sections.booking && <a href="#agendar">Agenda</a>}
          </nav>
          <a href="#agendar" className="px-4 py-2 text-sm font-semibold" style={btn}>
            {content.ctaLabel}
          </a>
        </div>
      </header>

      {/* Hero */}
      {content.sections.hero && (
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
          <div className={template === "bosque" ? "md:order-1" : ""}>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.accent }}>
              {content.eyebrow}
            </p>
            <h1 className="text-4xl leading-tight md:text-5xl" style={h}>
              {content.headline}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed" style={{ color: theme.muted }}>
              {content.subheadline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#agendar" className="px-6 py-3 text-sm font-semibold" style={btn}>
                {content.ctaLabel}
              </a>
              {content.whatsapp && (
                <a
                  href={`https://wa.me/${content.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 text-sm font-semibold"
                  style={{ borderRadius: 999, border: `1px solid ${theme.accent}`, color: theme.accent }}
                >
                  Falar no WhatsApp
                </a>
              )}
            </div>
            <p className="mt-6 text-xs" style={{ color: theme.muted }}>
              {content.credential} · {content.city}
            </p>
          </div>
          <div className="relative">
            <div
              className="absolute -inset-3 -z-10 opacity-40"
              style={{ background: theme.band, borderRadius: theme.radius + 12 }}
            />
            <img
              src={content.heroImage || PLACEHOLDER}
              alt={`Retrato de ${content.name}`}
              className="h-[420px] w-full object-cover md:h-[520px]"
              style={{ borderRadius: theme.radius + 6 }}
              loading="eager"
            />
          </div>
        </section>
      )}

      {/* Tópicos */}
      {content.sections.topics && (
        <section id="servicos" className="py-14 md:py-20" style={{ background: theme.band, color: theme.bandText }}>
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-3xl md:text-4xl" style={h}>
              {content.topicsTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm" style={{ opacity: 0.75 }}>
              {content.topicsIntro}
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.topics.map((t, i) => (
                <div key={i} className="p-6" style={card}>
                  <div
                    className="mb-4 grid h-9 w-9 place-items-center text-sm font-bold"
                    style={{ background: theme.accent, color: theme.accentText, borderRadius: 999 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-lg font-semibold" style={{ ...h, color: theme.text }}>
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.muted }}>
                    {t.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sobre */}
      {content.sections.about && (
        <section id="sobre" className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-[0.9fr_1.1fr] md:py-20">
          <img
            src={content.aboutImage || content.heroImage || PLACEHOLDER}
            alt={`${content.name} no consultório`}
            className="h-[360px] w-full object-cover md:h-[460px]"
            style={{ borderRadius: theme.radius + 6 }}
            loading="lazy"
          />
          <div>
            <h2 className="text-3xl md:text-4xl" style={h}>
              {content.aboutTitle}
            </h2>
            <p className="mt-5 whitespace-pre-line text-sm leading-7" style={{ color: theme.muted }}>
              {content.aboutText}
            </p>
            <p className="mt-6 text-sm font-semibold">{content.name}</p>
            <p className="text-xs" style={{ color: theme.muted }}>
              {content.credential}
            </p>
          </div>
        </section>
      )}

      {/* Agendamento */}
      {content.sections.booking && (
        <section id="agendar" className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <h2 className="text-3xl md:text-4xl" style={h}>
            {content.bookingTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm" style={{ color: theme.muted }}>
            {content.bookingIntro}
          </p>
          <BookingWidget
            slug={slug}
            services={services}
            theme={theme}
            card={card}
            btn={btn}
            heading={h}
            interactive={interactive}
          />
        </section>
      )}

      {/* Depoimentos */}
      {content.sections.testimonials && content.testimonials.length > 0 && (
        <section className="py-14" style={{ background: theme.band, color: theme.bandText }}>
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-3xl" style={h}>
              {content.testimonialsTitle}
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {content.testimonials.map((t, i) => (
                <blockquote key={i} className="p-6" style={card}>
                  <p className="text-sm leading-relaxed" style={{ color: theme.text }}>
                    “{t.text}”
                  </p>
                  <footer className="mt-4 text-xs font-semibold" style={{ color: theme.accent }}>
                    {t.name}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <div
          className="flex flex-col items-center gap-4 px-6 py-10 text-center md:flex-row md:justify-between md:text-left"
          style={card}
        >
          <div>
            <h3 className="text-2xl" style={{ ...h, color: theme.text }}>
              Pronto para dar o primeiro passo?
            </h3>
            <p className="mt-2 text-sm" style={{ color: theme.muted }}>
              Escolha o plano de terapia que combina com você e reserve seu horário.
            </p>
          </div>
          <a href="#agendar" className="px-6 py-3 text-sm font-semibold" style={btn}>
            {content.ctaLabel}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ background: theme.band, color: theme.bandText }}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-lg font-semibold" style={h}>
                {content.name}
              </p>
              <p className="mt-2 text-xs" style={{ opacity: 0.75 }}>
                {content.credential}
                {content.city ? ` · ${content.city}` : ""}
              </p>
            </div>
            <div className="text-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ opacity: 0.7 }}>
                Navegação
              </p>
              <ul className="space-y-2" style={{ opacity: 0.85 }}>
                {content.sections.topics && (
                  <li>
                    <a href="#servicos">Como ajudo</a>
                  </li>
                )}
                {content.sections.about && (
                  <li>
                    <a href="#sobre">Sobre</a>
                  </li>
                )}
                {content.sections.booking && (
                  <li>
                    <a href="#agendar">Agendar sessão</a>
                  </li>
                )}
              </ul>
            </div>
            <div className="text-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ opacity: 0.7 }}>
                Contato
              </p>
              <ul className="space-y-2" style={{ opacity: 0.85 }}>
                {content.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${content.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp {content.whatsapp}
                    </a>
                  </li>
                )}
                {content.email && (
                  <li>
                    <a href={`mailto:${content.email}`}>{content.email}</a>
                  </li>
                )}
                {content.instagram && (
                  <li>
                    <a
                      href={`https://instagram.com/${content.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      @{content.instagram.replace("@", "")}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div
            className="mt-10 flex flex-wrap items-center justify-between gap-3 pt-6 text-[11px]"
            style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.1)"}`, opacity: 0.75 }}
          >
            <span>
              © {new Date().getFullYear()} {content.name} · {content.footerNote}
            </span>
            <span>Atendimento psicológico com sigilo e ética profissional.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ------------------------- Agendamento + checkout ------------------------- */

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type TherapyPlan = {
  id: string;
  name: string;
  sessions: number;
  discount: number;
  note: string;
};

const THERAPY_PLANS: TherapyPlan[] = [
  { id: "single", name: "Sessão avulsa", sessions: 1, discount: 0, note: "Sem compromisso — ideal para começar" },
  { id: "monthly", name: "Plano mensal", sessions: 4, discount: 0.05, note: "4 sessões · 5% de desconto" },
  { id: "quarterly", name: "Plano trimestral", sessions: 12, discount: 0.12, note: "12 sessões · 12% de desconto" },
];


function BookingWidget({
  slug,
  services,
  theme,
  card,
  btn,
  heading,
  interactive,
}: {
  slug: string;
  services: PublicService[];
  theme: ProfileTheme;
  card: CSSProperties;
  btn: CSSProperties;
  heading: CSSProperties;
  interactive: boolean;
}) {
  const [serviceId, setServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [planId, setPlanId] = useState<string>("single");
  const [date, setDate] = useState<string>(toDateKey(new Date()));
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ startsAt: string; checkoutUrl: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((x) => x.id === serviceId) ?? null;
  const duration = service?.duration_minutes ?? 50;
  const plan = THERAPY_PLANS.find((p) => p.id === planId) ?? THERAPY_PLANS[0];
  const total = service ? Math.round(service.price_cents * plan.sessions * (1 - plan.discount)) : 0;


  const days = useMemo(() => {
    const out: Date[] = [];
    const base = new Date();
    for (let i = 0; i < 21; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(d);
    }
    return out;
  }, []);

  useEffect(() => {
    if (!interactive) {
      setSlots(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].map((t) => `mock-${t}`));
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSlot(null);
    fetch(`/api/public/perfil/slots?slug=${encodeURIComponent(slug)}&date=${date}&duration=${duration}`)
      .then((r) => r.json())
      .then((d: { slots?: string[] }) => {
        if (!cancelled) setSlots(d.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, date, duration, interactive]);

  async function submit() {
    if (!interactive) return;
    setError(null);
    if (!slot || !form.name.trim() || form.phone.replace(/\D/g, "").length < 8) {
      setError("Preencha nome, WhatsApp e escolha um horário.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/public/perfil/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId,
          startsAt: slot,
          name: form.name.trim(),
          phone: form.phone,
          email: form.email || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; checkoutUrl?: string | null; startsAt?: string };
      if (!data.ok) {
        setError(data.error ?? "Não foi possível concluir o agendamento.");
        return;
      }
      setDone({ startsAt: data.startsAt ?? slot, checkoutUrl: data.checkoutUrl ?? null });
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 p-8 text-center" style={card}>
        <h3 className="text-2xl" style={{ ...heading, color: theme.text }}>
          Sessão reservada!
        </h3>
        <p className="mt-3 text-sm" style={{ color: theme.muted }}>
          {new Date(done.startsAt).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
        </p>
        {done.checkoutUrl ? (
          <a href={done.checkoutUrl} className="mt-6 inline-block px-6 py-3 text-sm font-semibold" style={btn}>
            Ir para o pagamento
          </a>
        ) : (
          <p className="mt-4 text-sm" style={{ color: theme.muted }}>
            Você receberá a confirmação e as orientações pelo WhatsApp.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="p-6" style={card}>
        {/* Serviços */}
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>
          Serviço
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {services.length === 0 && (
            <p className="text-sm" style={{ color: theme.muted }}>
              Nenhum serviço publicado ainda.
            </p>
          )}
          {services.map((sv) => {
            const active = sv.id === serviceId;
            return (
              <button
                key={sv.id}
                type="button"
                onClick={() => setServiceId(sv.id)}
                className="p-4 text-left transition"
                style={{
                  borderRadius: theme.radius,
                  border: `1.5px solid ${active ? theme.accent : "rgba(125,125,125,.25)"}`,
                  background: active ? `${theme.accent}14` : "transparent",
                }}
              >
                <span className="block text-sm font-semibold" style={{ color: theme.text }}>
                  {sv.name}
                </span>
                <span className="mt-1 block text-xs" style={{ color: theme.muted }}>
                  {sv.duration_minutes} min · {sv.price_cents > 0 ? money(sv.price_cents) : "Valor a combinar"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Calendário */}
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>
          Data
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const key = toDateKey(d);
            const active = key === date;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDate(key)}
                className="min-w-[62px] px-2 py-3 text-center transition"
                style={{
                  borderRadius: theme.radius,
                  border: `1.5px solid ${active ? theme.accent : "rgba(125,125,125,.22)"}`,
                  background: active ? theme.accent : "transparent",
                  color: active ? theme.accentText : theme.text,
                }}
              >
                <span className="block text-[10px] uppercase tracking-wide opacity-70">
                  {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </span>
                <span className="block text-base font-semibold">{d.getDate()}</span>
                <span className="block text-[10px] opacity-70">
                  {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Horários */}
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>
          Horários disponíveis
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {loading && (
            <span className="text-sm" style={{ color: theme.muted }}>
              Carregando horários…
            </span>
          )}
          {!loading && slots.length === 0 && (
            <span className="text-sm" style={{ color: theme.muted }}>
              Sem horários livres neste dia. Escolha outra data.
            </span>
          )}
          {!loading &&
            slots.map((iso) => {
              const label = interactive
                ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : iso.replace("mock-", "");
              const active = slot === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSlot(iso)}
                  className="px-4 py-2 text-sm font-medium transition"
                  style={{
                    borderRadius: 999,
                    border: `1.5px solid ${active ? theme.accent : "rgba(125,125,125,.25)"}`,
                    background: active ? theme.accent : "transparent",
                    color: active ? theme.accentText : theme.text,
                  }}
                >
                  {label}
                </button>
              );
            })}
        </div>
      </div>

      {/* Dados + checkout */}
      <div className="p-6" style={card}>
        <h3 className="text-lg font-semibold" style={{ ...heading, color: theme.text }}>
          Seus dados
        </h3>
        <div className="mt-4 space-y-3">
          {(
            [
              ["name", "Nome completo", "text"],
              ["phone", "WhatsApp com DDD", "tel"],
              ["email", "E-mail (opcional)", "email"],
            ] as const
          ).map(([field, placeholder, type]) => (
            <input
              key={field}
              type={type}
              placeholder={placeholder}
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              className="w-full px-4 py-3 text-sm outline-none"
              style={{
                borderRadius: theme.radius,
                border: "1px solid rgba(125,125,125,.25)",
                background: "transparent",
                color: theme.text,
              }}
            />
          ))}
          <textarea
            rows={3}
            placeholder="Conte brevemente o que te traz à terapia (opcional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full px-4 py-3 text-sm outline-none"
            style={{
              borderRadius: theme.radius,
              border: "1px solid rgba(125,125,125,.25)",
              background: "transparent",
              color: theme.text,
            }}
          />
        </div>

        <div className="mt-5 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span style={{ color: theme.muted }}>{plan.name}</span>
            <span style={{ color: theme.muted }}>
              {plan.sessions} {plan.sessions > 1 ? "sessões" : "sessão"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: theme.muted }}>Total</span>
            <span className="font-semibold">{service ? money(total) : "—"}</span>
          </div>
        </div>


        {error && (
          <p className="mt-3 text-xs" style={{ color: "#c0392b" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={sending || !interactive}
          className="mt-4 w-full px-6 py-3 text-sm font-semibold disabled:opacity-60"
          style={btn}
        >
          {sending ? "Confirmando…" : service && service.price_cents > 0 ? "Confirmar e pagar" : "Confirmar agendamento"}
        </button>
        <p className="mt-3 text-center text-[11px]" style={{ color: theme.muted }}>
          {interactive
            ? "Pagamento seguro via Stripe ou Mercado Pago após a confirmação."
            : "Pré-visualização — o agendamento funciona na página publicada."}
        </p>
      </div>
    </div>
  );
}
