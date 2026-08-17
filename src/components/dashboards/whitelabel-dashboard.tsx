import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, Building2, Users, Palette, Globe, ArrowRight, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";

import { MetricCard } from "@/components/metric-card";
import { getWhitelabelDashboardData } from "@/lib/dashboard.functions";
import type { DashboardData } from "./individual-dashboard";

/** Dashboard exclusivo do plano White-label: revenda e gestão de sub-contas. */
export function WhitelabelDashboard({ data }: { data: DashboardData }) {
  const fetchWl = useServerFn(getWhitelabelDashboardData);
  const { data: wl } = useQuery({
    queryKey: ["whitelabel-dashboard"],
    queryFn: () => fetchWl(),
    staleTime: 60 * 1000,
  });

  const { profile, usage } = data;
  const firstName = (profile?.full_name ?? "Parceiro").split(" ")[0];
  const children = wl?.children ?? [];

  const kpis = [
    { label: "Sub-contas", value: `${wl?.totals.accounts ?? 0}`, icon: Boxes },
    { label: "Ativas", value: `${wl?.totals.active ?? 0}`, icon: ShieldCheck },
    { label: "Profissionais", value: `${wl?.totals.professionals ?? 0}`, icon: Users },
    { label: "Pacientes", value: `${wl?.totals.contacts ?? 0}`, icon: Building2 },
  ];

  const chart = children.slice(0, 8).map((c) => ({ name: c.name.slice(0, 10), pacientes: c.contacts_count }));

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:p-8">
      <div className="min-w-0 space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gold p-6 text-sidebar-active-foreground shadow-sm sm:p-8">
          <div className="min-w-0 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-sidebar-active-foreground/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              <Palette className="h-3.5 w-3.5" /> Painel White-label
            </span>
            <p className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Olá, {firstName}</p>
            <p className="max-w-lg text-sm/relaxed text-sidebar-active-foreground/80">
              Gerencie suas sub-contas, marca, domínio e a operação dos consultórios que você revende.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to="/sub-contas"
                className="rounded-full bg-sidebar-active-foreground px-4 py-2 text-xs font-semibold text-gold shadow-sm transition hover:opacity-90"
              >
                Gerenciar sub-contas
              </Link>
              <Link
                to="/configuracoes"
                className="rounded-full border border-sidebar-active-foreground/30 px-4 py-2 text-xs font-semibold transition hover:bg-sidebar-active-foreground/10"
              >
                Marca e domínio
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {kpis.map((k) => (
            <MetricCard key={k.label} icon={k.icon} label={k.label} value={k.value} delta="—" deltaPositive trend={[0, 0, 0]} />
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-display text-sm font-bold">Pacientes por sub-conta</h3>
            <p className="text-xs text-muted-foreground">Top 8 contas da sua rede</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={chart} barCategoryGap={18}>
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
                <Bar dataKey="pacientes" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold">Sub-contas da rede</h3>
              <p className="text-xs text-muted-foreground">Consultórios e clínicas sob sua marca</p>
            </div>
            <Link to="/sub-contas" className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-semibold">Conta</th>
                  <th className="pb-2 font-semibold">Tipo</th>
                  <th className="pb-2 font-semibold">Plano</th>
                  <th className="pb-2 font-semibold">Pacientes</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {children.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                      Nenhuma sub-conta criada ainda.{" "}
                      <Link to="/sub-contas" className="font-semibold text-gold hover:underline">
                        Criar a primeira
                      </Link>
                    </td>
                  </tr>
                )}
                {children.slice(0, 8).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">/{c.slug}</p>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {c.account_type === "clinic" ? "Clínica" : "Profissional"}
                    </td>
                    <td className="py-2.5 text-xs capitalize text-muted-foreground">{c.plan}</td>
                    <td className="py-2.5 font-semibold">{c.contacts_count}</td>
                    <td className="py-2.5">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                          (c.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-300")
                        }
                      >
                        {c.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="space-y-6 rounded-3xl bg-surface-2 p-5 lg:sticky lg:top-20 lg:h-fit">
        <h2 className="font-display text-lg font-bold">Sua marca</h2>
        <section className="space-y-2">
          <Link
            to="/configuracoes"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-gold/40"
          >
            <Palette className="h-4 w-4 text-gold" />
            <span className="flex-1 text-sm font-semibold">Logo e cores</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link
            to="/configuracoes"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-gold/40"
          >
            <Globe className="h-4 w-4 text-gold" />
            <span className="flex-1 text-sm font-semibold">Domínio próprio</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link
            to="/sub-contas"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-gold/40"
          >
            <Boxes className="h-4 w-4 text-gold" />
            <span className="flex-1 text-sm font-semibold">Sub-contas</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Plano</p>
          <div className="rounded-xl border border-border bg-surface p-3">
            <span className="text-sm font-semibold capitalize">{usage?.plan ?? "white-label"}</span>
            <p className="mt-1 text-xs text-muted-foreground">
              {wl?.totals.accounts ?? 0} sub-contas ativas na sua rede.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
