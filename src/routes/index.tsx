import { createFileRoute } from "@tanstack/react-router";
import {
  MessageCircle,
  CheckCheck,
  Timer,
  DollarSign,
  ArrowUpRight,
  Video,
  Users,
  Heart,
  MoreHorizontal,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LivHub" },
      {
        name: "description",
        content:
          "Visão geral do atendimento no WhatsApp: taxa de resposta, tempo médio, faturamento e entregabilidade.",
      },
      { property: "og:title", content: "Dashboard — LivHub" },
      {
        property: "og:description",
        content:
          "Visão geral do atendimento no WhatsApp: taxa de resposta, tempo médio, faturamento e entregabilidade.",
      },
    ],
  }),
  component: Dashboard,
});

const kpis = [
  { label: "Mensagens", value: "1.284", delta: "+12%", icon: MessageCircle },
  { label: "% Respondidas", value: "94%", delta: "+3%", icon: CheckCheck },
  { label: "Tempo médio resp.", value: "2m 40s", delta: "-18%", icon: Timer },
  { label: "Faturamento", value: "R$ 15k", delta: "+18%", icon: DollarSign },
];

const deliveryData = [
  { name: "Entregue", value: 812, color: "var(--chart-2)" },
  { name: "Lido", value: 634, color: "var(--chart-1)" },
  { name: "Enviado", value: 96, color: "var(--chart-3)" },
  { name: "Falhou", value: 22, color: "var(--chart-4)" },
];
const deliveryTotal = deliveryData.reduce((a, b) => a + b.value, 0);

const barData = [
  { d: "Seg", enviadas: 180, recebidas: 120 },
  { d: "Ter", enviadas: 220, recebidas: 160 },
  { d: "Qua", enviadas: 260, recebidas: 200 },
  { d: "Qui", enviadas: 300, recebidas: 240 },
  { d: "Sex", enviadas: 240, recebidas: 190 },
  { d: "Sáb", enviadas: 120, recebidas: 90 },
  { d: "Dom", enviadas: 80, recebidas: 60 },
];

const revenueData = [
  { m: "Fev", v: 8200 },
  { m: "Mar", v: 9600 },
  { m: "Abr", v: 10400 },
  { m: "Mai", v: 11800 },
  { m: "Jun", v: 12600 },
  { m: "Jul", v: 13100 },
  { m: "Ago", v: 12900 },
  { m: "Set", v: 13800 },
  { m: "Out", v: 14200 },
  { m: "Nov", v: 14900 },
  { m: "Dez", v: 15000 },
];

const upcomingSessions = [
  { title: "Triagem inicial", who: "Mariana Silva", time: "Hoje · 14:00" },
  { title: "Sessão semanal", who: "Roberto Alencar", time: "Hoje · 16:30" },
  { title: "Terapia de casal", who: "Ana & Felipe", time: "Amanhã · 10:00" },
];

const upcomingTeam = [
  { title: "Supervisão clínica", who: "Equipe TCC", time: "Qua · 09:00" },
  { title: "Estudo de caso", who: "Equipe Infantil", time: "Sex · 15:00" },
];

const shoutouts = [
  { name: "Dr. Adão Reis", note: "Fechou 4 pacotes esta semana", initials: "AR" },
  { name: "Johnny Cruz", note: "Melhor tempo de resposta (2m)", initials: "JC" },
  { name: "Alice Turner", note: "Nota 5,0 em 12 sessões", initials: "AT" },
];

function Dashboard() {
  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:p-8">
      {/* MAIN COLUMN */}
      <div className="min-w-0 space-y-6">
        {/* Welcome card (dourado) */}
        <section className="relative overflow-hidden rounded-3xl bg-gold p-6 text-sidebar-active-foreground shadow-sm sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0 space-y-4">
              <p className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Bem-vinda, Dra. Helena
              </p>
              <p className="max-w-lg text-sm/relaxed text-sidebar-active-foreground/80">
                Aqui está um resumo do seu atendimento no WhatsApp hoje. Comece pelas triagens
                pendentes ou revise sua agenda da semana.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button className="rounded-full bg-sidebar-active-foreground px-4 py-2 text-xs font-semibold text-gold shadow-sm transition hover:opacity-90">
                  Ver triagens pendentes
                </button>
                <button className="rounded-full border border-sidebar-active-foreground/30 bg-transparent px-4 py-2 text-xs font-semibold text-sidebar-active-foreground transition hover:bg-sidebar-active-foreground/10">
                  Configurar agenda
                </button>
              </div>
            </div>
            <div className="relative hidden sm:block">
              <div className="grid h-28 w-28 place-items-center rounded-full bg-sidebar-active-foreground/10 ring-8 ring-sidebar-active-foreground/5">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-sidebar text-2xl font-bold text-gold">
                  HM
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        </section>

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            const positive = !k.delta.startsWith("-");
            // "Tempo médio" caindo é bom → forçar verde mesmo com sinal negativo
            const isGood = k.label.startsWith("Tempo") ? true : positive;
            return (
              <div
                key={k.label}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/15 text-gold">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={
                      isGood
                        ? "inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                        : "inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"
                    }
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    {k.delta}
                  </span>
                </div>
                <p className="mt-4 font-display text-2xl font-bold tracking-tight">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            );
          })}
        </section>

        {/* Faturamento (line) */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold">Faturamento</h3>
              <p className="text-xs text-muted-foreground">Últimos 11 meses</p>
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3 w-3" /> +82% no período
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Faturamento"]}
                />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-gold)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--color-gold)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart row */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Bar chart */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold">Fluxo de mensagens</h3>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-gold" /> Enviadas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-foreground/25" /> Recebidas
                </span>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={barData} barCategoryGap={18}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="enviadas" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="recebidas" fill="var(--color-muted-foreground)" radius={[6, 6, 0, 0]} opacity={0.35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut: entregabilidade */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold">Desempenho de entrega</h3>
                <p className="text-xs text-muted-foreground">{deliveryTotal.toLocaleString("pt-BR")} mensagens</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="relative h-40">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={deliveryData} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={3} stroke="none">
                    {deliveryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="font-display text-2xl font-bold leading-none">
                    {Math.round((deliveryData[1].value / deliveryTotal) * 100)}%
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">lidas</p>
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {deliveryData.map((d) => (
                <li key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-semibold text-muted-foreground">
                    {d.value.toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* RIGHT PANEL (My activity) */}
      <aside className="space-y-6 rounded-3xl bg-surface-2 p-5 lg:sticky lg:top-20 lg:h-fit">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Minha atividade</h2>
          <button className="text-xs font-semibold text-gold hover:underline">Ver tudo</button>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Próximas sessões
            </p>
          </div>
          <ul className="space-y-2">
            {upcomingSessions.map((s) => (
              <li key={s.who} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                  <Video className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.who}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{s.time}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Encontros de equipe
          </p>
          <ul className="space-y-2">
            {upcomingTeam.map((s) => (
              <li key={s.title} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-foreground/5 text-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.who}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{s.time}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Reconhecimentos
          </p>
          <ul className="space-y-2">
            {shoutouts.map((s) => (
              <li key={s.name} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-xs font-bold text-sidebar-active-foreground">
                  {s.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.note}</p>
                </div>
                <Heart className="h-4 w-4 shrink-0 text-gold" />
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
