import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Building2,
  CalendarCheck,
  Check,
  CreditCard,
  GraduationCap,
  KanbanSquare,
  Layers,
  Megaphone,
  MessagesSquare,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
  Workflow,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "LivHub — Consultório digital com IA para psicoterapeutas e clínicas";
const DESCRIPTION =
  "Atendimento omnichannel, agentes de IA, agenda com auto-agendamento, Kanban de pacientes, fluxos de automação, pagamentos e cursos em uma única plataforma.";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://livhub.cloud/site" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const CHANNELS = [
  "WhatsApp",
  "WhatsApp Cloud API",
  "Instagram",
  "Facebook",
  "Telegram",
  "TikTok",
  "LinkedIn",
  "X / Twitter",
  "Google Meet",
  "Zoom",
  "Stripe",
  "Mercado Pago",
  "Pix",
];

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "Caixa de entrada omnichannel",
    text: "WhatsApp (QR Code ou API oficial), Instagram, Facebook, Telegram e mais redes em um único painel de mensagens.",
  },
  {
    icon: Bot,
    title: "Agentes de IA",
    text: "Crie assistentes com personalidade, tom e limites próprios. Eles respondem, qualificam e escalam situações sensíveis para você.",
  },
  {
    icon: Workflow,
    title: "Fluxos de automação",
    text: "Editor visual com gatilhos, ações e IA. Automatize boas-vindas, lembretes e toda a jornada do paciente com templates prontos.",
  },
  {
    icon: CalendarCheck,
    title: "Agenda e auto-agendamento",
    text: "Agenda semanal, bloqueios de horário, integração com Google Calendar e links do Meet gerados automaticamente.",
  },
  {
    icon: KanbanSquare,
    title: "Kanban de pacientes",
    text: "Visualize o funil do lead ao paciente ativo. Sessões realizadas avançam o card no Kanban sem trabalho manual.",
  },
  {
    icon: Megaphone,
    title: "Remarketing e disparos",
    text: "Reative pacientes, envie campanhas segmentadas e acompanhe resultados sem sair da plataforma.",
  },
  {
    icon: CreditCard,
    title: "Pagamentos integrados",
    text: "Cobre sessões e pacotes com Stripe, Mercado Pago e Pix, com status de pagamento atualizado em tempo real.",
  },
  {
    icon: GraduationCap,
    title: "Cursos e conteúdos",
    text: "Publique cursos, e-books e trilhas para pacientes e leads — uma nova fonte de receita para sua prática.",
  },
  {
    icon: Sparkles,
    title: "Perfil público profissional",
    text: "Página própria com seus serviços, horários disponíveis e agendamento online direto pelo paciente.",
  },
];

const AUDIENCES = [
  {
    icon: User,
    title: "Profissional autônomo",
    text: "Psicoterapeutas e terapeutas que querem organizar agenda, atendimento e cobranças em um só lugar.",
  },
  {
    icon: Building2,
    title: "Clínicas e institutos",
    text: "Equipe com múltiplos profissionais, serviços e agendas, com dashboard consolidado da clínica.",
  },
  {
    icon: Palette,
    title: "White-label",
    text: "Revenda o LivHub com sua marca, domínio próprio e sub-contas para cada consultório da sua rede.",
  },
];

const STEPS = [
  { title: "Crie sua conta", text: "Cadastro em minutos, com 3 dias de teste grátis." },
  { title: "Conecte seus canais", text: "WhatsApp, redes sociais, Google Calendar e meio de pagamento." },
  { title: "Ative a IA e os fluxos", text: "Configure seu agente e instale templates de automação." },
  { title: "Atenda e cresça", text: "Foque no cuidado — o LivHub cuida da operação." },
];

const PLANS = [
  {
    name: "Solo",
    description: "Para psicoterapeutas autônomos",
    price: 89,
    features: ["1 usuário", "1 número WhatsApp", "500 conversas/mês", "1 agente IA", "Kanban básico"],
  },
  {
    name: "Pro",
    description: "Para consultórios em crescimento",
    price: 349,
    highlighted: true,
    features: [
      "Até 10 usuários",
      "3 números WhatsApp",
      "5.000 conversas/mês",
      "5 agentes IA",
      "Fluxos avançados",
      "Cursos ilimitados",
    ],
  },
  {
    name: "Enterprise",
    description: "Para clínicas e institutos",
    price: 1290,
    features: [
      "Usuários ilimitados",
      "Números ilimitados",
      "Conversas ilimitadas",
      "Agentes IA ilimitados",
      "White-label completo",
      "SLA dedicado",
      "API completa",
    ],
  },
];

const FAQ = [
  {
    q: "Preciso de cartão para testar?",
    a: "Não. Você cria a conta e usa o LivHub gratuitamente por 3 dias para conhecer a plataforma.",
  },
  {
    q: "Posso usar meu número de WhatsApp atual?",
    a: "Sim. Conecte via QR Code em segundos ou utilize a API oficial do WhatsApp Cloud para operações maiores.",
  },
  {
    q: "A IA substitui o atendimento do terapeuta?",
    a: "Não. Os agentes cuidam de recepção, dúvidas frequentes e agendamento, e você define regras para escalar situações sensíveis a um humano.",
  },
  {
    q: "Os dados dos pacientes ficam seguros?",
    a: "Sim. Os tokens de integração são criptografados em repouso, o acesso é isolado por consultório e seguimos a LGPD, com canal próprio de exclusão de dados.",
  },
  {
    q: "Posso vender o LivHub com a minha marca?",
    a: "Sim. No modelo white-label você tem domínio próprio, identidade visual e gestão de sub-contas para sua rede.",
  },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function LandingPage() {
  return (
    <div className="dark min-h-svh bg-background font-sans text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#topo" className="font-display text-xl font-bold tracking-tight">
            Liv<span className="text-primary">Hub</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#para-quem" className="hover:text-foreground">Para quem</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted">
              Entrar
            </Link>
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Teste grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="topo" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)_0%,transparent_60%)] opacity-15" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Consultório digital com inteligência artificial
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Atendimento, agenda e crescimento da sua prática{" "}
            <span className="text-primary">em um só lugar</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            O LivHub une WhatsApp e redes sociais, agentes de IA, agenda online, Kanban de pacientes,
            automações, pagamentos e cursos — feito para psicoterapeutas e clínicas.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
            >
              <Rocket className="h-4 w-4" /> Começar 3 dias grátis
            </Link>
            <a
              href="#recursos"
              className="rounded-xl border border-border px-7 py-3.5 font-medium hover:bg-muted"
            >
              Conhecer recursos
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </section>

      {/* Integrações */}
      <section className="border-y border-border/60 bg-surface-2/30 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-5 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Integrado com as ferramentas que você já usa
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
            {CHANNELS.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionTitle
          eyebrow="Recursos"
          title="Tudo que seu consultório precisa"
          text="Substitua planilhas, agendas de papel e vários aplicativos por uma plataforma integrada."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/40"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para quem */}
      <section id="para-quem" className="border-y border-border/60 bg-surface-2/30 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle
            eyebrow="Para quem"
            title="Do consultório individual à rede de clínicas"
            text="Um painel sob medida para cada modelo de operação."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-border bg-surface p-8 text-center">
                <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionTitle eyebrow="Como funciona" title="Comece a atender em minutos" />
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="font-display text-4xl font-bold text-primary/60">0{i + 1}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="border-y border-border/60 bg-surface-2/30 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle
            eyebrow="Planos"
            title="Escolha o plano ideal"
            text="Todos os planos começam com 3 dias de teste grátis."
          />
          <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border bg-surface p-8 ${
                  p.highlighted ? "border-primary shadow-xl shadow-primary/10" : "border-border"
                }`}
              >
                {p.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Mais escolhido
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{brl(p.price)}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className={`mt-8 rounded-xl px-5 py-3 text-center font-semibold ${
                    p.highlighted
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  Começar teste grátis
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 rounded-3xl border border-border bg-surface p-8 sm:p-12 md:grid-cols-[auto_1fr] md:items-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold">Privacidade levada a sério</h3>
            <p className="mt-2 text-muted-foreground">
              Dados isolados por consultório, credenciais criptografadas em repouso e conformidade com a
              LGPD. Informações clínicas exigem cuidado — e o LivHub foi construído com isso em mente.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <SectionTitle eyebrow="FAQ" title="Perguntas frequentes" />
        <Accordion type="single" collapsible className="mt-10">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground">
          <Layers className="mx-auto h-10 w-10" />
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Pronto para transformar seu consultório?
          </h2>
          <p className="mx-auto mt-4 max-w-xl opacity-80">
            Teste o LivHub gratuitamente por 3 dias e veja quanto tempo você ganha.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-8 py-3.5 font-semibold text-primary hover:opacity-90"
          >
            <Rocket className="h-4 w-4" /> Criar conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>
            © {new Date().getFullYear()} Liv<span className="text-primary">Hub</span>. Todos os direitos reservados.
          </span>
          <div className="flex gap-6">
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/exclusao-de-dados" className="hover:text-foreground">Exclusão de dados</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</span>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-muted-foreground">{text}</p>}
    </div>
  );
}
