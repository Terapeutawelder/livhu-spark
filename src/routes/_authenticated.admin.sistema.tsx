import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Activity, Database, Cpu, CheckCircle2, AlertTriangle, Flag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sistema")({
  head: () => ({
    meta: [
      { title: "Sistema — Super Admin" },
      { name: "description", content: "Saúde, filas, logs e feature flags da plataforma." },
      { property: "og:title", content: "Sistema — Super Admin" },
      { property: "og:description", content: "Saúde, filas, logs e feature flags da plataforma." },
    ],
  }),
  component: SystemPage,
});

const services = [
  { name: "API", status: "ok", p95: "82ms", up: "99,98%" },
  { name: "SSR / Edge", status: "ok", p95: "148ms", up: "99,95%" },
  { name: "Workers", status: "warn", p95: "1,8s", up: "99,71%" },
  { name: "Postgres", status: "ok", p95: "12ms", up: "99,99%" },
  { name: "Redis", status: "ok", p95: "2ms", up: "99,99%" },
  { name: "WhatsApp Cloud", status: "ok", p95: "1,2s", up: "99,90%" },
];

const queues = [
  { name: "outbound-whatsapp", pending: 128, failed: 3 },
  { name: "ai-agent-runs", pending: 42, failed: 0 },
  { name: "webhooks-inbound", pending: 214, failed: 12 },
  { name: "billing-cron", pending: 0, failed: 0 },
];

const flags = [
  { k: "new-inbox-ui", desc: "Novo layout de inbox", on: true, rollout: "40%" },
  { k: "ai-voice-messages", desc: "Transcrição e resposta em áudio", on: false, rollout: "0%" },
  { k: "mercadopago-pix", desc: "Pix via Mercado Pago", on: true, rollout: "100%" },
  { k: "kanban-automations", desc: "Automações no Kanban", on: true, rollout: "60%" },
];

const logs = [
  { t: "12:04:22", lvl: "ERROR", msg: "webhook_signature_invalid tenant=aurora provider=whatsapp" },
  { t: "12:03:11", lvl: "WARN", msg: "queue outbound-whatsapp lag=1.8s" },
  { t: "12:01:58", lvl: "INFO", msg: "tenant provisioned id=tnt_4820 plan=pro" },
  { t: "11:58:03", lvl: "INFO", msg: "invoice.paid tenant=serenity value=1290" },
  { t: "11:52:47", lvl: "ERROR", msg: "ai_agent_timeout tenant=namaste agent=triagem" },
];

const lvlColor: Record<string, string> = {
  ERROR: "text-rose-600",
  WARN: "text-amber-600",
  INFO: "text-muted-foreground",
};

function SystemPage() {
  return (
    <AdminShell
      title="Sistema"
      description="Observabilidade, filas de background e feature flags."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Serviços</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.name} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {s.status === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="font-medium text-foreground">{s.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.up}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">p95 {s.p95}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Filas</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {queues.map((q) => (
              <li key={q.name} className="rounded-lg border border-border bg-background p-3">
                <p className="font-mono text-xs text-foreground">{q.name}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>pendentes: <span className="font-semibold text-foreground">{q.pending}</span></span>
                  <span>falhas: <span className={"font-semibold " + (q.failed > 0 ? "text-rose-600" : "text-foreground")}>{q.failed}</span></span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Feature flags</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {flags.map((f) => (
              <li key={f.k} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="font-mono text-xs text-foreground">{f.k}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Rollout: {f.rollout}</p>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-semibold " +
                    (f.on ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")
                  }
                >
                  {f.on ? "ON" : "OFF"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Logs recentes</h3>
          </div>
          <ul className="mt-4 space-y-2 font-mono text-xs">
            {logs.map((l, i) => (
              <li key={i} className="flex items-start gap-3 rounded-md bg-background/70 p-2">
                <span className="text-muted-foreground">{l.t}</span>
                <span className={"font-bold " + lvlColor[l.lvl]}>{l.lvl}</span>
                <span className="text-foreground">{l.msg}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
