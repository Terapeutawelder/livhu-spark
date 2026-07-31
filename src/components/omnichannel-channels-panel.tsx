import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";

type ChannelId = "whatsapp" | "instagram" | "messenger" | "tiktok" | "site" | "email";

type ChannelDef = {
  id: ChannelId;
  name: string;
  icon: LucideIcon;
  desc: string;
  requirement: string;
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
    requirement: "Requer conta Instagram profissional vinculada a uma Página do Facebook e app Meta aprovado.",
  },
  {
    id: "messenger",
    name: "Messenger",
    icon: Facebook,
    desc: "Conversas da sua Página do Facebook em um só lugar.",
    requirement: "Requer Página do Facebook e permissões de mensagens no app Meta.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: Music2,
    desc: "Mensagens e leads vindos do seu perfil TikTok Business.",
    requirement: "Requer conta TikTok Business autorizada.",
  },
  {
    id: "site",
    name: "Chat do site",
    icon: Globe,
    desc: "Widget de chat no seu site ou landing page, com histórico unificado.",
    requirement: "Basta copiar o script abaixo e colar antes do </body> do seu site.",
  },
  {
    id: "email",
    name: "E-mail",
    icon: Mail,
    desc: "Receba e responda e-mails de pacientes como conversas.",
    requirement: "Encaminhe seu e-mail de atendimento para o endereço de entrada abaixo.",
  },
];

export function OmnichannelChannelsPanel({ onOpenWhatsapp }: { onOpenWhatsapp: () => void }) {
  const { data: tenant, isLoading } = useCurrentTenant();
  const [copied, setCopied] = useState<string | null>(null);

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
            const connected = ch.id === "whatsapp" && waConnected;
            const pending = ch.id === "whatsapp" && !!waChannel && !waConnected;
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
                    <div>
                      <p className="text-sm font-semibold">{ch.name}</p>
                      {ch.id === "whatsapp" && waChannel?.phone_number && (
                        <p className="text-[11px] text-muted-foreground">{waChannel.phone_number}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={connected ? "default" : "secondary"}
                    className="shrink-0 text-[10px] font-medium"
                  >
                    {connected ? "Conectado" : pending ? "Pendente" : "Não conectado"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">{ch.desc}</p>
                <p className="text-[11px] text-muted-foreground/80">{ch.requirement}</p>

                <div className="mt-auto pt-1">
                  {ch.id === "whatsapp" ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpenWhatsapp}>
                      {connected ? "Gerenciar" : "Conectar"} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : ch.id === "site" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copy(widgetSnippet, "widget")}
                    >
                      {copied === "widget" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copiar script
                    </Button>
                  ) : ch.id === "email" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copy(inboundEmail, "email")}
                    >
                      {copied === "email" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copiar endereço
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      title="Disponível assim que o app Meta/TikTok for aprovado"
                    >
                      Conectar
                    </Button>
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
    </div>
  );
}
