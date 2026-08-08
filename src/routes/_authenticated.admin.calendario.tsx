import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarDays, CircleDollarSign, RefreshCw, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Super Admin — LivHub" },
      { name: "description", content: "Renovações de assinatura, trials expirando e eventos operacionais da plataforma." },
      { property: "og:title", content: "Calendário — Super Admin — LivHub" },
      { property: "og:description", content: "Renovações de assinatura, trials expirando e eventos operacionais da plataforma." },
    ],
  }),
  component: AdminCalendar,
});

type TenantRow = {
  id: string;
  name: string;
  plan: string;
  is_active: boolean;
  created_at: string;
};

type CalendarEvent = {
  date: Date;
  kind: "renewal" | "trial_end" | "onboarding";
  label: string;
  tenant: string;
  plan: string;
};

const kindMeta: Record<CalendarEvent["kind"], { color: string; bg: string; icon: typeof CircleDollarSign; text: string }> = {
  renewal:    { color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30", icon: RefreshCw,        text: "Renovação" },
  trial_end:  { color: "text-amber-600",   bg: "bg-amber-500/10 border-amber-500/30",     icon: AlertTriangle,    text: "Fim de trial" },
  onboarding: { color: "text-gold",        bg: "bg-gold/10 border-gold/30",               icon: CircleDollarSign, text: "Onboarding" },
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function AdminCalendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const tenantsQuery = useQuery({
    queryKey: ["admin", "calendar", "tenants"],
    queryFn: async (): Promise<TenantRow[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, plan, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const events = useMemo<CalendarEvent[]>(() => {
    const tenants = tenantsQuery.data ?? [];
    const out: CalendarEvent[] = [];
    for (const t of tenants) {
      const created = new Date(t.created_at);
      if (t.plan === "trial") {
        out.push({
          date: addDays(created, 14),
          kind: "trial_end",
          label: `Trial expira`,
          tenant: t.name,
          plan: t.plan,
        });
      } else {
        // recorrência mensal na mesma data do dia de criação
        const target = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(created.getDate(), 28));
        out.push({
          date: target,
          kind: "renewal",
          label: `Renovação ${t.plan}`,
          tenant: t.name,
          plan: t.plan,
        });
      }
      // onboarding no primeiro dia
      if (created.getMonth() === cursor.getMonth() && created.getFullYear() === cursor.getFullYear()) {
        out.push({
          date: created,
          kind: "onboarding",
          label: "Novo cliente ativado",
          tenant: t.name,
          plan: t.plan,
        });
      }
    }
    return out;
  }, [tenantsQuery.data, cursor]);

  const monthStart = startOfMonth(cursor);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const upcoming = [...events]
    .filter((e) => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  return (
    <AdminShell
      title="Calendário da operação"
      description="Renovações de assinatura, fim de trials e ativações de novos clientes."
      className="w-full"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold capitalize text-foreground">
            {monthLabel}
          </span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Hoje
          </button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border">
            {cells.map((day, i) => {
              const dayEvents = day ? events.filter((e) => sameDay(e.date, day)) : [];
              const isToday = day && sameDay(day, new Date());
              return (
                <div
                  key={i}
                  className={
                    "min-h-[92px] bg-background p-1.5 text-left " +
                    (isToday ? "ring-2 ring-gold" : "")
                  }
                >
                  {day && (
                    <>
                      <div className={"text-xs font-semibold " + (isToday ? "text-gold" : "text-foreground")}>
                        {day.getDate()}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((e, k) => {
                          const meta = kindMeta[e.kind];
                          const Icon = meta.icon;
                          return (
                            <div
                              key={k}
                              className={"flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium " + meta.bg + " " + meta.color}
                              title={`${meta.text}: ${e.tenant}`}
                            >
                              <Icon className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{e.tenant}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {(Object.keys(kindMeta) as CalendarEvent["kind"][]).map((k) => {
              const m = kindMeta[k];
              return (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={"h-2.5 w-2.5 rounded-full border " + m.bg} />
                  {m.text}
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Próximos eventos</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {upcoming.length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum evento agendado.</li>
            )}
            {upcoming.map((e, i) => {
              const meta = kindMeta[e.kind];
              const Icon = meta.icon;
              return (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                  <div className={"grid h-8 w-8 place-items-center rounded-lg border " + meta.bg + " " + meta.color}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{e.tenant}</p>
                    <p className="text-xs text-muted-foreground">{meta.text} · Plano {e.plan}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {e.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
