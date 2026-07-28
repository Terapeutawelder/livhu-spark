import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User, Bell, MessageCircle, Palette, Shield, KeyRound, Link2, Building2, Check, Copy, Globe, Loader2, ExternalLink,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getMyTenantDomain, updateMyTenantSlug } from "@/lib/tenant-domain.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — LivHub" },
      { name: "description", content: "Ajustes de perfil, WhatsApp, notificações, marca e segurança do seu consultório." },
      { property: "og:title", content: "Configurações — LivHub" },
      { property: "og:description", content: "Configurações do LivHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracoesPage,
});

const tabs = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "consultorio", label: "Consultório", icon: Building2 },
  { id: "dominio", label: "Meu domínio", icon: Globe },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "marca", label: "Marca", icon: Palette },
  { id: "integracoes", label: "Integrações", icon: Link2 },
  { id: "seguranca", label: "Segurança", icon: Shield },
  { id: "api", label: "API & Webhooks", icon: KeyRound },
];

function ConfiguracoesPage() {
  const [tab, setTab] = useState("perfil");

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajuste seu consultório, marca, integrações e segurança.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="p-2">
          <nav className="flex flex-col">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </nav>
        </Card>

        <div className="space-y-4">
          {tab === "perfil" && <PerfilPanel />}
          {tab === "consultorio" && <ConsultorioPanel />}
          {tab === "whatsapp" && <WhatsappPanel />}
          {tab === "notificacoes" && <NotificacoesPanel />}
          {tab === "marca" && <MarcaPanel />}
          {tab === "integracoes" && <IntegracoesPanel />}
          {tab === "seguranca" && <SegurancaPanel />}
          {tab === "api" && <ApiPanel />}
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function PerfilPanel() {
  return (
    <Card className="p-6">
      <PanelHeader title="Perfil" desc="Suas informações pessoais e profissionais." />
      <div className="mb-6 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">DL</AvatarFallback>
        </Avatar>
        <div>
          <Button variant="outline" size="sm">Alterar foto</Button>
          <p className="mt-1 text-xs text-muted-foreground">JPG ou PNG, até 2MB.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" defaultValue="Dra. Liv Rocha" />
        <Field label="Título profissional" defaultValue="Psicoterapeuta" />
        <Field label="CRP" defaultValue="06/123456" />
        <Field label="E-mail" defaultValue="liv@livhub.app" />
        <Field label="Telefone" defaultValue="+55 11 98765-0000" />
        <Field label="Fuso horário" defaultValue="America/Sao_Paulo" />
      </div>
      <div>
        <Label className="mb-1.5 mt-4 block text-xs">Bio pública</Label>
        <Textarea rows={3} defaultValue="Psicoterapeuta com atuação em TCC, especialista em ansiedade e burnout." />
      </div>
      <SaveBar />
    </Card>
  );
}

function ConsultorioPanel() {
  return (
    <Card className="p-6">
      <PanelHeader title="Consultório" desc="Endereço, modalidades e políticas de atendimento." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do consultório" defaultValue="LivHub — Consultório Liv Rocha" />
        <Field label="CNPJ (opcional)" defaultValue="" />
        <Field label="Endereço" defaultValue="Rua das Palmeiras, 123 — Vila Madalena, SP" />
        <Field label="Duração padrão da sessão" defaultValue="50 min" />
        <Field label="Valor padrão" defaultValue="R$ 300,00" />
        <Field label="Antecedência mínima" defaultValue="24h" />
      </div>
      <Separator className="my-4" />
      <div className="space-y-3">
        <ToggleRow title="Aceita atendimento online" desc="Sessões via link seguro." defaultChecked />
        <ToggleRow title="Aceita atendimento presencial" desc="No endereço cadastrado." defaultChecked />
        <ToggleRow title="Convênios" desc="Exibe convênios aceitos no perfil público." />
      </div>
      <SaveBar />
    </Card>
  );
}

function WhatsappPanel() {
  return (
    <Card className="p-6">
      <PanelHeader title="WhatsApp Business" desc="Conecte seu número oficial via API da Meta." />
      <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <Check className="h-4 w-4" /> Conectado — +55 11 98765-0000
        </p>
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Qualidade do número: Alta</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone Number ID" defaultValue="123456789012345" />
        <Field label="WABA ID" defaultValue="987654321098765" />
        <Field label="Nome exibido" defaultValue="Dra. Liv — Psicoterapeuta" />
        <Field label="Categoria" defaultValue="Saúde" />
      </div>
      <Separator className="my-4" />
      <ToggleRow title="Assistente IA responde fora do expediente" desc="Das 20h às 8h e finais de semana." defaultChecked />
      <ToggleRow title="Confirmação automática de sessões" desc="24h antes via template aprovado." defaultChecked />
      <SaveBar />
    </Card>
  );
}

function NotificacoesPanel() {
  return (
    <Card className="p-6">
      <PanelHeader title="Notificações" desc="Escolha quando e como quer ser avisada." />
      <div className="space-y-3">
        <ToggleRow title="Nova conversa" desc="Push + e-mail." defaultChecked />
        <ToggleRow title="Sessão agendada" desc="Push imediato." defaultChecked />
        <ToggleRow title="Handoff pedido pelo paciente" desc="Prioridade máxima." defaultChecked />
        <ToggleRow title="Pagamento recebido" desc="Push + resumo diário." defaultChecked />
        <ToggleRow title="Resumo semanal por e-mail" desc="Todo domingo à noite." />
      </div>
      <SaveBar />
    </Card>
  );
}

function MarcaPanel() {
  return (
    <Card className="p-6">
      <PanelHeader title="Marca (White-label)" desc="Personalize cores, logo e domínio do seu portal." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome público" defaultValue="Liv — Psicoterapia" />
        <Field label="Domínio personalizado" defaultValue="dr-liv.livhub.app" />
        <div>
          <Label className="mb-1.5 block text-xs">Cor primária</Label>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded border bg-primary" />
            <Input defaultValue="#c9a24a" className="w-32" />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Logo</Label>
          <Button variant="outline" size="sm">Fazer upload</Button>
        </div>
      </div>
      <SaveBar />
    </Card>
  );
}

function IntegracoesPanel() {
  const items = [
    { name: "Google Calendar", desc: "Sincronize sua agenda", connected: true },
    { name: "Zoom", desc: "Salas para sessões online", connected: true },
    { name: "Stripe", desc: "Pagamentos internacionais", connected: true },
    { name: "Mercado Pago", desc: "Pix, boleto e cartão nacional", connected: false },
    { name: "Doctoralia", desc: "Import de pacientes", connected: false },
    { name: "iClinic", desc: "Prontuário eletrônico", connected: false },
  ];
  return (
    <Card className="p-6">
      <PanelHeader title="Integrações" desc="Conecte ferramentas ao LivHub." />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <div key={i.name} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{i.name}</p>
                {i.connected && <Badge className="text-[10px]">Conectado</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{i.desc}</p>
            </div>
            <Button variant={i.connected ? "outline" : "default"} size="sm">
              {i.connected ? "Gerenciar" : "Conectar"}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SegurancaPanel() {
  return (
    <Card className="p-6">
      <PanelHeader title="Segurança" desc="Senha, 2FA e sessões ativas." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha atual" type="password" defaultValue="********" />
        <Field label="Nova senha" type="password" defaultValue="" />
      </div>
      <Separator className="my-4" />
      <ToggleRow title="Autenticação de dois fatores (2FA)" desc="Recomendado para dados clínicos." defaultChecked />
      <ToggleRow title="Encerrar sessões automaticamente após 30 min inativo" desc="Compliance LGPD." defaultChecked />
      <ToggleRow title="Log de auditoria completo" desc="Registra acesso a prontuários." defaultChecked />
      <SaveBar />
    </Card>
  );
}

function ApiPanel() {
  return (
    <Card className="p-6">
      <PanelHeader title="API & Webhooks" desc="Integre o LivHub com seus sistemas." />
      <div>
        <Label className="mb-1.5 block text-xs">Chave de API</Label>
        <div className="flex items-center gap-2">
          <Input readOnly defaultValue="livhub_sk_••••••••••••••••••••abcd" className="font-mono text-xs" />
          <Button variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm">Regenerar</Button>
        </div>
      </div>
      <Separator className="my-4" />
      <div>
        <Label className="mb-1.5 block text-xs">Webhook URL</Label>
        <Input placeholder="https://seuservidor.com/webhooks/livhub" />
        <p className="mt-1 text-xs text-muted-foreground">Recebe eventos de novas conversas, agendamentos e pagamentos.</p>
      </div>
      <SaveBar />
    </Card>
  );
}

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue: string; type?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Input type={type} defaultValue={defaultValue} />
    </div>
  );
}

function ToggleRow({ title, desc, defaultChecked }: { title: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function SaveBar() {
  return (
    <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
      <Button variant="outline" size="sm">Cancelar</Button>
      <Button size="sm">Salvar alterações</Button>
    </div>
  );
}
