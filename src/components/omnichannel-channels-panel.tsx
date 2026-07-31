import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Globe,
  Mail,
  Check,
  Copy,
  ArrowRight,
  Loader2,
  Settings2,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { listMyChannels, saveMyChannel, disconnectMyChannel } from "@/lib/channels.functions";
import { channelSaveSchema, type ChannelKind } from "@/lib/channels.schema";

type ChannelId = ChannelKind | "whatsapp";

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  help?: string;
  optional?: boolean;
};

type ChannelDef = {
  id: ChannelId;
  name: string;
  icon: LucideIcon;
  desc: string;
  requirement: string;
  fields?: FieldDef[];
};

const CHANNELS: ChannelDef[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    desc: "Conversas do WhatsApp Cloud API (número de coexistência) direto na caixa de entrada.",
    requirement: "Configure na aba WhatsApp: Phone Number ID, WABA e token de acesso.",
  },
  {
    id: "instagram",
    name: "Instagram Direct",
    icon: Instagram,
    desc: "Mensagens do Direct e respostas a stories do perfil profissional.",
    requirement: "Conta Instagram profissional vinculada a uma Página do Facebook.",
    fields: [
      { key: "display_name", label: "Perfil (@)", placeholder: "@dra.liv" },
      { key: "ig_business_account_id", label: "ID da conta Instagram", placeholder: "17841400000000000" },
      { key: "page_id", label: "ID da Página do Facebook", placeholder: "1234567890" },
      {
        key: "access_token",
        label: "Token de acesso",
        secret: true,
        help: "Token de página com permissões instagram_manage_messages. Guardado cifrado.",
      },
    ],
  },
  {
    id: "messenger",
    name: "Messenger",
    icon: Facebook,
    desc: "Conversas da sua Página do Facebook em um só lugar.",
    requirement: "Página do Facebook com permissões de mensagens no app Meta.",
    fields: [
      { key: "display_name", label: "Nome da Página", placeholder: "Consultório Liv Rocha" },
      { key: "page_id", label: "ID da Página", placeholder: "1234567890" },
      { key: "access_token", label: "Token da Página", secret: true, help: "Guardado cifrado no servidor." },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: Music2,
    desc: "Mensagens e leads vindos do seu perfil TikTok Business.",
    requirement: "Conta TikTok Business autorizada.",
    fields: [
      { key: "display_name", label: "Perfil (@)", placeholder: "@dra.liv" },
      { key: "advertiser_id", label: "ID da conta TikTok Business", placeholder: "7000000000000000000" },
      { key: "access_token", label: "Token de acesso", secret: true },
    ],
  },
  {
    id: "site",
    name: "Chat do site",
    icon: Globe,
    desc: "Widget de chat no seu site ou landing page, com histórico unificado.",
    requirement: "Informe o domínio autorizado e copie o script para o seu site.",
    fields: [
      { key: "display_name", label: "Nome exibido no widget", placeholder: "Atendimento Liv" },
      { key: "site_domain", label: "Domínio autorizado", placeholder: "meusite.com.br" },
      { key: "welcome_message", label: "Mensagem de boas-vindas", optional: true, placeholder: "Olá! Como posso ajudar?" },
    ],
  },
  {
    id: "email",
    name: "E-mail",
    icon: Mail,
    desc: "Receba e responda e-mails de pacientes como conversas.",
    requirement: "Encaminhe seu e-mail de atendimento para o endereço de entrada abaixo.",
    fields: [
      { key: "display_name", label: "Nome do remetente", placeholder: "Dra. Liv Rocha" },
      { key: "from_email", label: "E-mail de atendimento", placeholder: "contato@seudominio.com" },
      { key: "reply_to", label: "Responder para", optional: true, placeholder: "secretaria@seudominio.com" },
    ],
  },
];

const STATUS_LABEL: Record<string, string> = {
  active: "Conectado",
  pending: "Pendente",
  error: "Erro",
  disconnected: "Não conectado",
};

export function OmnichannelChannelsPanel({ onOpenWhatsapp }: { onOpenWhatsapp: () => void }) {
  const qc = useQueryClient();
  const { data: tenant, isLoading } = useCurrentTenant();
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChannelDef | null>(null);

  const fetchChannels = useServerFn(listMyChannels);
  const removeChannel = useServerFn(disconnectMyChannel);

  const { data: channels } = useQuery({
    queryKey: ["tenant-channels"],
    queryFn: () => fetchChannels(),
  });

  const { data: waChannel, isLoading: loadingWa } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["wa-channel-status", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_channels")
        .select("id,status,display_name,phone_number,is_coexistence")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const disconnectMut = useMutation({
    mutationFn: (channel: ChannelKind) => removeChannel({ data: { channel } }),
    onSuccess: () => {
      toast.success("Canal desconectado");
      qc.invalidateQueries({ queryKey: ["tenant-channels"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao desconectar"),
  });

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success("Copiado");
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  }

  const slug = tenant?.slug ?? "seu-consultorio";
  const inboundEmail = `${slug}@inbox.livhub.cloud`;
  const widgetSnippet = `<script src="https://cdn.livhub.cloud/widget.js" data-livhub-id="${slug}" async></script>`;

  if (isLoading || loadingWa) {
    return (
      <Card className="grid place-items-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const waConnected = waChannel?.status === "active";
  const byChannel = new Map((channels ?? []).map((c) => [c.channel as ChannelKind, c]));

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Canais Omnichannel</h2>
          <p className="text-sm text-muted-foreground">
            Conecte os lugares por onde as conversas entram. Tudo chega em uma única caixa de entrada, com histórico
            unificado por paciente.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const saved = ch.id === "whatsapp" ? null : byChannel.get(ch.id as ChannelKind);
            const status =
              ch.id === "whatsapp"
                ? waConnected
                  ? "active"
                  : waChannel
                  ? "pending"
                  : "disconnected"
                : saved?.status ?? "disconnected";
            const connected = status === "active";

            return (
              <div
                key={ch.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background/40 p-4 transition hover:border-gold/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ch.name}</p>
                      {ch.id === "whatsapp" && waChannel?.phone_number && (
                        <p className="text-[11px] text-muted-foreground">{waChannel.phone_number}</p>
                      )}
                      {saved && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {saved.display_name}
                          {saved.credential_hint ? ` · token ${saved.credential_hint}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={connected ? "default" : "secondary"}
                    className="shrink-0 text-[10px] font-medium"
                  >
                    {STATUS_LABEL[status]}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">{ch.desc}</p>
                <p className="text-[11px] text-muted-foreground/80">{ch.requirement}</p>
                {saved?.last_error && <p className="text-[11px] text-destructive">{saved.last_error}</p>}

                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {ch.id === "whatsapp" ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpenWhatsapp}>
                      {connected ? "Gerenciar" : "Conectar"} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(ch)}>
                        <Settings2 className="h-3.5 w-3.5" />
                        {saved ? "Editar" : "Conectar"}
                      </Button>
                      {saved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-destructive"
                          disabled={disconnectMut.isPending}
                          onClick={() => disconnectMut.mutate(ch.id as ChannelKind)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Desconectar
                        </Button>
                      )}
                      {ch.id === "site" && (
                        <Button size="sm" variant="ghost" onClick={() => copy(widgetSnippet, "widget")}>
                          {copied === "widget" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Detalhes de conexão</h2>
          <p className="text-sm text-muted-foreground">Dados usados pelo chat do site e pelo canal de e-mail.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Script do widget de chat</Label>
            <div className="mt-1.5 flex gap-2">
              <Input readOnly value={widgetSnippet} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(widgetSnippet, "widget-2")}>
                {copied === "widget-2" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cole antes do fechamento da tag body do seu site.</p>
          </div>

          <Separator />

          <div>
            <Label>E-mail de entrada</Label>
            <div className="mt-1.5 flex gap-2">
              <Input readOnly value={inboundEmail} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(inboundEmail, "email-2")}>
                {copied === "email-2" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure o encaminhamento automático do seu e-mail de atendimento para este endereço.
            </p>
          </div>
        </div>
      </Card>

      <ChannelDialog
        channel={editing}
        saved={editing && editing.id !== "whatsapp" ? byChannel.get(editing.id as ChannelKind) ?? null : null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function ChannelDialog({
  channel,
  saved,
  onClose,
}: {
  channel: ChannelDef | null;
  saved: { display_name: string; account_id: string | null; settings: Record<string, string> } | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const save = useServerFn(saveMyChannel);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const open = !!channel && channel.id !== "whatsapp";

  if (open && initializedFor !== channel!.id) {
    const init: Record<string, string> = {};
    for (const f of channel!.fields ?? []) init[f.key] = "";
    if (saved) {
      init.display_name = saved.display_name ?? "";
      const idKey = (channel!.fields ?? [])[1]?.key;
      if (idKey) init[idKey] = saved.account_id ?? "";
      for (const [k, v] of Object.entries(saved.settings ?? {})) {
        if (k in init) init[k] = String(v ?? "");
      }
    }
    setValues(init);
    setErrors({});
    setInitializedFor(channel!.id);
  }

  const mutation = useMutation({
    mutationFn: (payload: unknown) => save({ data: payload as never }),
    onSuccess: () => {
      toast.success("Canal salvo com segurança");
      qc.invalidateQueries({ queryKey: ["tenant-channels"] });
      close();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar canal"),
  });

  function close() {
    setInitializedFor(null);
    onClose();
  }

  function submit() {
    if (!channel) return;
    const parsed = channelSaveSchema.safeParse({ channel: channel.id, ...values });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar {channel?.name}</DialogTitle>
          <DialogDescription>
            As credenciais ficam cifradas no servidor do LivHub e nunca são expostas no navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(channel?.fields ?? []).map((f) => (
            <div key={f.key}>
              <Label className="mb-1.5 block text-xs">
                {f.label}
                {f.optional && <span className="text-muted-foreground"> (opcional)</span>}
              </Label>
              <Input
                type={f.secret ? "password" : "text"}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                autoComplete="off"
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
              {f.help && <p className="mt-1 text-[11px] text-muted-foreground">{f.help}</p>}
              {errors[f.key] && <p className="mt-1 text-[11px] text-destructive">{errors[f.key]}</p>}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={close}>
            Cancelar
          </Button>
          <Button size="sm" disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Salvar credenciais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
