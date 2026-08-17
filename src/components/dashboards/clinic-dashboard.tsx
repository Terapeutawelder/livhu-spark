import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  CalendarCheck,
  DollarSign,
  MessageCircle,
  Building2,
  ShieldCheck,
  UserPlus,
  Video,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  YAxis,
} from "recharts";

import { MetricCard } from "@/components/metric-card";
import { getClinicDashboardData } from "@/lib/dashboard.functions";
import type { DashboardData } from "./individual-dashboard";

const roleLabels: Record<string, string> = {
  owner: "Titular",
  admin: "Admin da clínica",
  therapist: "Psicoterapeuta",
  assistant: "Secretaria",
};

/** Dashboard exclusivo do plano Clínica: visão consolidada da equipe. */
export function ClinicDashboard({ data }: { data: DashboardData }) {
  const fetchClinic = useServerFn(getClinicDashboardData);
  const { data: clinic } = useQuery({
    queryKey: ["clinic-dashboard"],
    queryFn: () => fetchClinic(),
    staleTime: 60 * 1000,
  });

  const { profile, usage, messageTotals, upcomingSessions, monthlyRevenue } = data;
  const clinicName = usage ? (usage as { plan?: string }).plan : null;
  const firstName = (profile?.full_name ?? "Gestor").split(" ")[0];
  const members = clinic?.members ?? [];
  const isAdmin = clinic?.myRole === "owner" || clinic?.myRole === "admin";

  const kpis = [
    {
      label: "Profissionais",
      value: `${clinic?.totals.members ?? 0}`,
      delta: usage?.contacts_limit ? `Limite do plano ${clinicName ?? ""}` : "—",
      icon: Users,
      trend: [1, 2, 2, 3, 3, 4, clinic?.totals.members ?? 1],
    },
    {
      label: "Sessões (30d)",
      value: `${clinic?.totals.sessions30d ?? 0}`,
      delta: "Equipe completa",
      icon: CalendarCheck,
      trend: (clinic?.sessionsByMember ?? []).map((s) => s.sessoes),
    },
    {
      label: "Faturamento (30d)",
      value: `R$ ${((clinic?.totals.revenue30d ?? 0) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
      delta: "Consolidado",
      icon: DollarSign,
      trend: monthlyRevenue.map((m) => Math.round(m.v / 100)),
    },
    {
      label: "Mensagens",
      value: (messageTotals.sent + messageTotals.received).toLocaleString("pt-BR"),
      delta: `${messageTotals.received} recebidas`,
      icon: MessageCircle,
      trend: data.last7Days.map((d) => d.enviadas + d.recebidas),
    },
  ];

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:p-8">
      <div className="min-w-0 space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gold p-6 text-sidebar-active-foreground shadow-sm sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0 space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-sidebar-active-foreground/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                <Building2 className="h-3.5 w-3.5" /> Painel da Clínica
              </span>
              <p className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Bem-vindo(a), {firstName}
              </p>
              <p className="max-w-lg text-sm/relaxed text-sidebar-active-foreground/80">
                Visão consolidada da clínica: desempenho da equipe, agenda coletiva e faturamento agregado.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  to="/servicos"
                  className="rounded-full bg-sidebar-active-foreground px-4 py-2 text-xs font-semibold text-gold shadow-sm transition hover:opacity-90"
                >
                  Gerenciar equipe
                </Link>
                <Link
                  to="/calendario"
                  className="rounded-full border border-sidebar-active-foreground/30 px-4 py-2 text-xs font-semibold transition hover:bg-sidebar-active-foreground/10"
                >
                  Agenda da clínica
                </Link>
              </div>
            </div>
            <div className="relative hidden sm:block">
              <div className="grid h-28 w-28 place-items-center rounded-full bg-sidebar-active-foreground/10 ring-8 ring-sidebar-active-foreground/5">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-sidebar text-2xl font-bold text-gold">
                  <Building2 className="h-9 w-9" />
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {kpis.map((k) => (
            <MetricCard
              key={k.label}
              icon={k.icon}
              label={k.label}
              value={k.value}
              delta={k.delta}
              deltaPositive
              trend={k.trend.length ? k.trend : [0, 0, 0]}
            />
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-display text-sm font-bold">Sessões por profissional</h3>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={clinic?.sessionsByMember ?? []} barCategoryGap={18}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sessoes" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-display text-sm font-bold">Faturamento consolidado</h3>
            <p className="text-xs text-muted-foreground">Últimos 11 meses · toda a clínica</p>
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
                  formatter={(v: number) => [`R$ ${(v / 100).toLocaleString("pt-BR")}`, "Faturamento"]}
                />
                <Line type="monotone" dataKey="v" stroke="var(--color-gold)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold">Equipe de profissionais</h3>
              <p className="text-xs text-muted-foreground">Desempenho individual nos últimos 30 dias</p>
            </div>
            {isAdmin && (
              <Link
                to="/servicos"
                className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-sidebar-active-foreground"
              >
                <UserPlus className="h-3.5 w-3.5" /> Convidar
              </Link>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-semibold">Profissional</th>
                  <th className="pb-2 font-semibold">Função</th>
                  <th className="pb-2 font-semibold">Sessões</th>
                  <th className="pb-2 font-semibold">Realizadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                      Nenhum profissional cadastrado ainda.
                    </td>
                  </tr>
                )}
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/15 text-[11px] font-bold text-gold">
                          {m.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{roleLabels[m.role] ?? m.role}</td>
                    <td className="py-2.5 font-semibold">{m.sessions}</td>
                    <td className="py-2.5 text-muted-foreground">{m.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="space-y-6 rounded-3xl bg-surface-2 p-5 lg:sticky lg:top-20 lg:h-fit">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Atividade da clínica</h2>
          <Link to="/calendario" className="text-xs font-semibold text-gold hover:underline">
            Ver tudo
          </Link>
        </div>

        {isAdmin && (
          <section className="rounded-xl border border-gold/30 bg-gold/5 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gold">
              <ShieldCheck className="h-3.5 w-3.5" /> Acesso administrativo
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Você é {roleLabels[clinic?.myRole ?? "admin"]}. Pode convidar profissionais, definir funções e acompanhar
              indicadores consolidados.
            </p>
          </section>
        )}

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Próximas sessões da equipe
          </p>
          <ul className="space-y-2">
            {upcomingSessions.length === 0 && (
              <li className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-sm text-muted-foreground">
                <CalendarDays className="mx-auto mb-2 h-5 w-5" />
                Nenhuma sessão agendada.
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
                <span className="shrink-0 text-[10px] text-muted-foreground">{s.time}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Plano da clínica</p>
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold capitalize">{usage?.plan ?? "trial"}</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                {usage?.is_readonly ? "Somente leitura" : "Ativo"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {clinic?.totals.members ?? 0} profissionais · {usage?.contacts_used ?? 0}/{usage?.contacts_limit ?? 0} pacientes
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
