import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageCircle, Mail, Send, RefreshCw, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DEFAULT_TEMPLATES,
  EVENT_DESCRIPTIONS,
  EVENT_LABELS,
  NOTIFICATION_EVENTS,
  TEMPLATE_VARIABLES,
  type NotificationChannel,
  type NotificationEvent,
} from "@/lib/notifications.templates";
import {
  getNotificationConfig,
  saveNotificationSettings,
  saveNotificationTemplate,
  sendTestNotification,
  retryNotificationJob,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — LivHub" },
      {
        name: "description",
        content:
          "Configure avisos automáticos por WhatsApp e e-mail para cadastro, agendamento, reagendamento, cancelamento, lembretes e pagamentos.",
      },
      { property: "og:title", content: "Notificações — LivHub" },
      {
        property: "og:description",
        content: "Automatize lembretes de sessão e confirmações por WhatsApp e e-mail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Notificações — LivHub" },
      { name: "twitter:description", content: "Avisos automáticos por WhatsApp e e-mail." },
    ],
  }),
  component: NotificacoesPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Na fila",
  sending: "Enviando",
  sent: "Enviada",
  failed: "Falhou",
  canceled: "Cancelada",
  skipped: "Ignorada",
};

type TemplateRow = {
  event: NotificationEvent;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  wa_template_name: string | null;
  is_active: boolean;
};

function NotificacoesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notification-config"],
    queryFn: () => getNotificationConfig(),
  });

  const settings = data?.settings;
  const [waOn, setWaOn] = useState<boolean | null>(null);
  const [mailOn, setMailOn] = useState<boolean | null>(null);
  const [eventsOverride, setEventsOverride] = useState<Record<string, boolean>>({});
  const [quiet, setQuiet] = useState<{ start: number; end: number } | null>(null);
  const [senderName, setSenderName] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<number[] | null>(null);

  const whatsappEnabled = waOn ?? settings?.whatsapp_enabled ?? true;
  const emailEnabled = mailOn ?? settings?.email_enabled ?? true;
  const quietStart = quiet?.start ?? settings?.quiet_start ?? 21;
  const quietEnd = quiet?.end ?? settings?.quiet_end ?? 8;
  const sender = senderName ?? settings?.sender_name ?? "";
  const reminderOffsets = offsets ?? settings?.reminder_offsets ?? [1440, 60, 15];
  const savedEvents = (settings?.events ?? {}) as Record<string, boolean>;
  const eventOn = (e: NotificationEvent) => eventsOverride[e] ?? savedEvents[e] ?? true;

  const templates = useMemo(() => {
    const map = new Map<string, TemplateRow>();
    for (const t of (data?.templates ?? []) as TemplateRow[]) map.set(`${t.event}:${t.channel}`, t);
    return map;
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: () =>
      saveNotificationSettings({
        data: {
          whatsapp_enabled: whatsappEnabled,
          email_enabled: emailEnabled,
          events: Object.fromEntries(NOTIFICATION_EVENTS.map((e) => [e, eventOn(e)])),
          reminder_offsets: reminderOffsets,
          quiet_start: quietStart,
          quiet_end: quietEnd,
          sender_name: sender,
          reply_to: "",
        },
      }),
    onSuccess: () => {
      toast.success("Preferências salvas.");
      qc.invalidateQueries({ queryKey: ["notification-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando notificações…</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Bell className="h-6 w-6 text-primary" /> Notificações
          </h1>
          <p className="text-sm text-muted-foreground">
            Avisos automáticos por WhatsApp e e-mail em cada etapa da jornada do paciente.
          </p>
        </div>
        <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salvar preferências
        </Button>
      </header>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Preferências</TabsTrigger>
          <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
          <TabsTrigger value="fila">Fila de envios</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-4 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Canais</h2>
              <ChannelToggle
                icon={<MessageCircle className="h-4 w-4" />}
                label="WhatsApp"
                hint="Usa o canal WhatsApp ativo do consultório."
                checked={whatsappEnabled}
                onChange={setWaOn}
              />
              <ChannelToggle
                icon={<Mail className="h-4 w-4" />}
                label="E-mail"
                hint="Enviado pelo domínio de e-mail do LivHub."
                checked={emailEnabled}
                onChange={setMailOn}
              />
              <div className="space-y-2 pt-2">
                <Label htmlFor="sender">Nome que aparece para o paciente</Label>
                <Input
                  id="sender"
                  value={sender}
                  placeholder="Ex.: Dra. Ana Ribeiro"
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" /> Lembretes e silêncio
              </h2>
              <div className="space-y-2">
                <Label>Antecedência dos lembretes</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { m: 2880, l: "48h" },
                    { m: 1440, l: "24h" },
                    { m: 180, l: "3h" },
                    { m: 60, l: "1h" },
                    { m: 30, l: "30min" },
                    { m: 15, l: "15min" },
                  ].map((o) => {
                    const on = reminderOffsets.includes(o.m);
                    return (
                      <button
                        key={o.m}
                        type="button"
                        onClick={() =>
                          setOffsets(
                            on ? reminderOffsets.filter((x) => x !== o.m) : [...reminderOffsets, o.m].sort((a, b) => b - a),
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-sm transition ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {o.l}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Vale para novas sessões e para sessões remarcadas.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qs">Silêncio a partir de</Label>
                  <Input
                    id="qs"
                    type="number"
                    min={0}
                    max={23}
                    value={quietStart}
                    onChange={(e) => setQuiet({ start: Number(e.target.value), end: quietEnd })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qe">Retomar às</Label>
                  <Input
                    id="qe"
                    type="number"
                    min={0}
                    max={23}
                    value={quietEnd}
                    onChange={(e) => setQuiet({ start: quietStart, end: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Avisos comuns esperam o horário permitido. Lembretes de 1 hora e 15 minutos sempre saem.
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Eventos</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {NOTIFICATION_EVENTS.map((e) => (
                <label
                  key={e}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <span>
                    <span className="block text-sm font-medium">{EVENT_LABELS[e]}</span>
                    <span className="block text-xs text-muted-foreground">{EVENT_DESCRIPTIONS[e]}</span>
                  </span>
                  <Switch
                    checked={eventOn(e)}
                    onCheckedChange={(v) => setEventsOverride({ ...eventsOverride, [e]: v })}
                  />
                </label>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="mensagens" className="space-y-4 pt-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis:{" "}
              {TEMPLATE_VARIABLES.map((v) => (
                <code key={v} className="mr-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  {v}
                </code>
              ))}
            </p>
          </Card>
          {NOTIFICATION_EVENTS.map((e) => (
            <TemplateEditor key={e} event={e} templates={templates} />
          ))}
        </TabsContent>

        <TabsContent value="fila" className="pt-4">
          <QueueTable jobs={(data?.jobs ?? []) as any[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelToggle(props: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="flex items-center gap-2 text-sm font-medium">
          {props.icon} {props.label}
        </span>
        <span className="block text-xs text-muted-foreground">{props.hint}</span>
      </span>
      <Switch checked={props.checked} onCheckedChange={props.onChange} />
    </div>
  );
}

function TemplateEditor({
  event,
  templates,
}: {
  event: NotificationEvent;
  templates: Map<string, TemplateRow>;
}) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<NotificationChannel>("whatsapp");
  const current = templates.get(`${event}:${channel}`);
  const defaults = DEFAULT_TEMPLATES[event];
  const [draft, setDraft] = useState<Record<string, { subject: string; body: string }>>({});
  const key = `${event}:${channel}`;
  const value = draft[key] ?? {
    subject: current?.subject ?? defaults.subject,
    body: current?.body ?? defaults.body,
  };
  const [testTo, setTestTo] = useState("");

  const save = useMutation({
    mutationFn: () =>
      saveNotificationTemplate({
        data: {
          event,
          channel,
          subject: value.subject,
          body: value.body,
          wa_template_name: current?.wa_template_name ?? "",
          is_active: true,
        },
      }),
    onSuccess: () => {
      toast.success("Mensagem salva.");
      qc.invalidateQueries({ queryKey: ["notification-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => sendTestNotification({ data: { event, channel, to: testTo } }),
    onSuccess: (r: { sent: number; skipped: number }) =>
      r.sent > 0 ? toast.success("Teste enviado.") : toast.warning("Não foi possível enviar — confira a fila."),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{EVENT_LABELS[event]}</h3>
          <p className="text-xs text-muted-foreground">{EVENT_DESCRIPTIONS[event]}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["whatsapp", "email"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`rounded-md px-3 py-1 text-xs transition ${
                channel === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {c === "whatsapp" ? "WhatsApp" : "E-mail"}
            </button>
          ))}
        </div>
      </div>

      {channel === "email" && (
        <div className="space-y-1">
          <Label className="text-xs">Assunto</Label>
          <Input
            value={value.subject}
            onChange={(e) => setDraft({ ...draft, [key]: { ...value, subject: e.target.value } })}
          />
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Mensagem</Label>
        <Textarea
          rows={5}
          value={value.body}
          onChange={(e) => setDraft({ ...draft, [key]: { ...value, body: e.target.value } })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar mensagem
        </Button>
        <Input
          className="h-9 w-56"
          placeholder={channel === "whatsapp" ? "5511999999999" : "voce@email.com"}
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={() => test.mutate()} disabled={test.isPending || testTo.length < 5}>
          <Send className="mr-2 h-4 w-4" /> Testar
        </Button>
      </div>
    </Card>
  );
}

function QueueTable({ jobs }: { jobs: any[] }) {
  const qc = useQueryClient();
  const retry = useMutation({
    mutationFn: (id: string) => retryNotificationJob({ data: { id } }),
    onSuccess: () => {
      toast.success("Reenvio disparado.");
      qc.invalidateQueries({ queryKey: ["notification-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!jobs.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Nenhum envio ainda. Assim que houver cadastros ou sessões, os avisos aparecem aqui.
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border">
      {jobs.map((j) => (
        <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {EVENT_LABELS[j.event as NotificationEvent] ?? j.event}{" "}
              <span className="text-muted-foreground">· {j.channel === "whatsapp" ? "WhatsApp" : "E-mail"}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {j.to_phone || j.to_email} ·{" "}
              {new Date(j.sent_at ?? j.send_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              {j.last_error ? ` · ${j.last_error}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={j.status === "sent" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>
              {STATUS_LABEL[j.status] ?? j.status}
            </Badge>
            {(j.status === "failed" || j.status === "skipped") && (
              <Button size="sm" variant="ghost" onClick={() => retry.mutate(j.id)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}
