import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  CheckCheck,
  Timer,
  DollarSign,
  ArrowUpRight,
  Video,
  Heart,
  MoreHorizontal,
  CalendarDays,
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

import { MetricCard } from "@/components/metric-card";
import type { getDashboardData } from "@/lib/dashboard.functions";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export function IndividualDashboard({ data }: { data: DashboardData }) {
  const { profile, usage, messageTotals, last7Days, upcomingSessions, monthlyRevenue } = data;

  const firstName = (profile?.full_name ?? "Psicoterapeuta").split(" ")[0];
  const initials = (profile?.full_name ?? "PS")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const totalMessages =
    messageTotals.sent + messageTotals.received;
  const deliveryData = [
    { name: "Entregue", value: messageTotals.delivered, color: "var(--chart-2)" },
    { name: "Lido", value: messageTotals.read, color: "var(--chart-1)" },
    { name: "Enviado", value: messageTotals.sent, color: "var(--chart-3)" },
    { name: "Falhou", value: messageTotals.failed, color: "var(--chart-4)" },
  ];
  const deliveryTotal = deliveryData.reduce((a, b) => a + b.value, 0);
  const readPct = deliveryTotal > 0 ? Math.round((messageTotals.read / deliveryTotal) * 100) : 0;

  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b.v, 0);
  const prevRevenue = monthlyRevenue.slice(0, -1).reduce((a, b) => a + b.v, 0);
  const revenueGrowth =
    prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

  const kpis = [
    {
      label: "Mensagens",
      value: totalMessages.toLocaleString("pt-BR"),
      delta: `${messageTotals.sent} enviadas`,
      icon: MessageCircle,
      trend: last7Days.map((d) => d.enviadas + d.recebidas),
    },
    {
      label: "% Respondidas",
      value: totalMessages > 0 ? `${Math.round((messageTotals.received / totalMessages) * 100)}%` : "0%",
      delta: `${messageTotals.received} recebidas`,
      icon: CheckCheck,
      trend: last7Days.map((d) => (d.enviadas + d.recebidas > 0 ? Math.round((d.recebidas / (d.enviadas + d.recebidas)) * 100) : 0)),
    },
    {
      label: "Tempo médio resp.",
      value: "2m 40s",
      delta: "-",
      icon: Timer,
      trend: [6, 6, 5, 5, 4, 4, 3],
    },
    {
      label: "Faturamento",
      value: `R$ ${(totalRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      delta: revenueGrowth ? `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%` : "—",
      icon: DollarSign,
      trend: monthlyRevenue.map((m) => Math.round(m.v / 100)),
    },
  ];

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:p-8">
      {/* MAIN COLUMN */}
      <div className="min-w-0 space-y-6">
        {/* Welcome card (dourado) */}
        <section className="relative overflow-hidden rounded-3xl bg-gold p-6 text-sidebar-active-foreground shadow-sm sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0 space-y-4">
              <p className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {`Bem-vindo(a), ${firstName}`}
              </p>
              <p className="max-w-lg text-sm/relaxed text-sidebar-active-foreground/80">
                Aqui está um resumo da sua prática hoje. Acompanhe mensagens, sessões e faturamento em tempo real.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  to="/mensagens"
                  className="rounded-full bg-sidebar-active-foreground px-4 py-2 text-xs font-semibold text-gold shadow-sm transition hover:opacity-90"
                >
                  Ver mensagens
                </Link>
                <Link
                  to="/agendamento"
                  className="rounded-full border border-sidebar-active-foreground/30 bg-transparent px-4 py-2 text-xs font-semibold text-sidebar-active-foreground transition hover:bg-sidebar-active-foreground/10"
                >
                  Configurar agenda
                </Link>
              </div>
            </div>
            <div className="relative hidden sm:block">
              <div className="grid h-28 w-28 place-items-center rounded-full bg-sidebar-active-foreground/10 ring-8 ring-sidebar-active-foreground/5">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-sidebar text-2xl font-bold text-gold">
                  {initials}
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        </section>

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {kpis.map((k) => {
            const positive = !String(k.delta).startsWith("-");
            const isGood = k.label.startsWith("Tempo") ? true : positive;
            return (
              <MetricCard
                key={k.label}
                icon={k.icon}
                label={k.label}
                value={k.value}
                delta={k.delta}
                deltaPositive={isGood}
                trend={k.trend}
              />
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
              <ArrowUpRight className="h-3 w-3" /> {revenueGrowth ? `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}% no período` : "Sem histórico"}
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  formatter={(v: number) => [`R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]}
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
                <BarChart data={last7Days} barCategoryGap={18}>
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
                    {readPct}%
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
          <Link to="/agendamento" className="text-xs font-semibold text-gold hover:underline">Ver tudo</Link>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Próximas sessões
            </p>
          </div>
          <ul className="space-y-2">
            {upcomingSessions.length === 0 && (
              <li className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-sm text-muted-foreground">
                <CalendarDays className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                Nenhuma sessão agendada.
                <br />
                <Link to="/agendamento" className="text-xs font-semibold text-gold hover:underline">
                  Abrir agenda
                </Link>
              </li>
            )}
            {upcomingSessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
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
            Plano atual
          </p>
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold capitalize">{usage?.plan ?? "trial"}</span>
              {usage?.is_readonly ? (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
                  Somente leitura
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                  Ativo
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {usage?.contacts_used ?? 0}/{usage?.contacts_limit ?? 50} contatos · {usage?.messages_used ?? 0}/{usage?.messages_limit ?? 100} mensagens
            </p>
          </div>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Metas da semana
          </p>
          <ul className="space-y-2">
            {[
              { name: "Responder em até 5min", note: "Meta de SLA", initials: "R" },
              { name: "Manter agenda atualizada", note: "Evite conflitos", initials: "A" },
              { name: "Acompanhar pacientes", note: "Revisar jornada", initials: "P" },
            ].map((s) => (
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

        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Próximas novidades</h3>
          <ul className="mt-2 space-y-2">
            <li className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Relatórios Avançados:</span> Exportação de dados para convênios.
            </li>
            <li className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">App Mobile:</span> Acesso rápido e notificações nativas.
            </li>
          </ul>
        </section>

      </aside>
    </div>
  );
}
