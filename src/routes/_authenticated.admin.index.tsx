import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Super Admin — LivHub" },
      { name: "description", content: "Painel de controle SaaS: tenants, MRR, uso e saúde do sistema." },
      { property: "og:title", content: "Super Admin — LivHub" },
      { property: "og:description", content: "Painel de controle SaaS: tenants, MRR, uso e saúde do sistema." },
    ],
  }),
  component: AdminOverview,
});

const mrrData = [
  { m: "Jan", mrr: 8200 }, { m: "Fev", mrr: 9100 }, { m: "Mar", mrr: 10400 },
  { m: "Abr", mrr: 11800 }, { m: "Mai", mrr: 13200 }, { m: "Jun", mrr: 14100 },
  { m: "Jul", mrr: 15600 }, { m: "Ago", mrr: 17200 }, { m: "Set", mrr: 18900 },
  { m: "Out", mrr: 20400 }, { m: "Nov", mrr: 22100 }, { m: "Dez", mrr: 24800 },
];

const usageData = [
  { d: "Seg", msg: 12400 }, { d: "Ter", msg: 15200 }, { d: "Qua", msg: 14100 },
  { d: "Qui", msg: 16800 }, { d: "Sex", msg: 18200 }, { d: "Sáb", msg: 9400 },
  { d: "Dom", msg: 6100 },
];

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  hint?: string;
  trend?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold">
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AdminOverview() {
  return (
    <AdminShell
      title="Visão geral"
      description="Métricas globais da plataforma LivHub."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Building2} label="Tenants ativos" value="147" hint="+12 este mês" trend="+8,9%" />
        <KpiCard icon={Users} label="Usuários totais" value="2.318" hint="média 15,7 / tenant" trend="+11,2%" />
        <KpiCard icon={DollarSign} label="MRR" value="R$ 24.800" hint="ARR R$ 297,6k" trend="+12,2%" />
        <KpiCard icon={TrendingUp} label="Churn (30d)" value="1,8%" hint="Meta < 3%" trend="-0,4pp" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Receita recorrente (MRR)</h3>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-gold, #c9a24a)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-gold, #c9a24a)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="mrr" stroke="var(--color-gold, #c9a24a)" fill="url(#mrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-lg font-semibold text-foreground">Saúde do sistema</h3>
          <p className="text-xs text-muted-foreground">Últimas 24h</p>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { name: "API Gateway", status: "ok", detail: "99,98% uptime" },
              { name: "WhatsApp Cloud", status: "ok", detail: "1,2s p95" },
              { name: "Workers (fila)", status: "warn", detail: "342 jobs em atraso" },
              { name: "Banco de dados", status: "ok", detail: "12ms p95" },
              { name: "Pagamentos", status: "ok", detail: "Stripe + MP OK" },
            ].map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {s.status === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-foreground">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Uso da plataforma</h3>
              <p className="text-xs text-muted-foreground">Mensagens processadas / dia</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="d" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="msg" fill="var(--color-gold, #c9a24a)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-lg font-semibold text-foreground">Últimos tenants</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {[
              { n: "Consultório Aurora", plan: "Pro", d: "há 2h" },
              { n: "Dra. Marina Costa", plan: "Solo", d: "há 5h" },
              { n: "Instituto Serenity", plan: "Enterprise", d: "ontem" },
              { n: "Espaço Reconectar", plan: "Pro", d: "há 2 dias" },
            ].map((t) => (
              <li key={t.n} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{t.n}</p>
                  <p className="text-xs text-muted-foreground">{t.d}</p>
                </div>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                  {t.plan}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
