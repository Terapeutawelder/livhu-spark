import { createFileRoute } from "@tanstack/react-router";
import { WhatsappCloudPanel } from "@/components/whatsapp-cloud-panel";
import { OmnichannelChannelsPanel } from "@/components/omnichannel-channels-panel";

import { ZernioChannelsPanel } from "@/components/zernio-channels-panel";
import { EvolutionWhatsappPanel } from "@/components/evolution-whatsapp-panel";

import { useEffect, useState, useCallback } from "react";
import {
  User, Bell, MessageCircle, Cloud, Palette, Shield, KeyRound, Link2, Building2, Check, Copy, Globe, Loader2, ExternalLink, Radio, Zap,
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
import {
  getSettings,
  saveProfileSettings,
  saveClinicSettings,
  saveBrandingSettings,
  saveNotificationSettings,
} from "@/lib/settings.functions";
import {
  getMyTenantDomain,
  updateMyTenantSlug,
  requestSubdomainActivation,
  requestCustomDomainActivation,
  listMyDomainRequests,
} from "@/lib/tenant-domain.functions";


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
  { id: "whatsapp-evo", label: "WhatsApp Direto (Novo)", icon: Zap },
  { id: "zernio", label: "Conectar canais", icon: Zap },
  { id: "canais", label: "Canais Omnichannel", icon: Radio },
  { id: "whatsapp", label: "WhatsApp (Meta) — avançado", icon: MessageCircle },
  
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "marca", label: "Marca", icon: Palette },
  { id: "integracoes", label: "Integrações", icon: Link2 },
  { id: "seguranca", label: "Segurança", icon: Shield },
  { id: "api", label: "API & Webhooks", icon: KeyRound },
];



function ConfiguracoesPage() {
  const initialTab = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("tab") || "perfil"
    : "perfil";
  const [tab, setTab] = useState(initialTab);

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
          {tab === "dominio" && <DominioPanel />}
          {tab === "whatsapp-evo" && <EvolutionWhatsappPanel />}
          {tab === "zernio" && <ZernioChannelsPanel />}
          {tab === "canais" && <OmnichannelChannelsPanel onOpenWhatsapp={() => setTab("whatsapp")} />}
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

function useSettings() {
  const fetchSettings = useServerFn(getSettings);
  return useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 30 * 1000,
  });
}

function PerfilPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useSettings();
  const save = useServerFn(saveProfileSettings);
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: () => {
      toast.success("Perfil salvo!");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [crp, setCrp] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!data) return;
    setFullName(data.profile?.full_name ?? "");
    setTitle(String(data.settings?.profile?.title ?? ""));
    setCrp(String(data.settings?.profile?.crp ?? ""));
    setPhone(String(data.settings?.profile?.phone ?? ""));
    setBio(String(data.settings?.profile?.bio ?? ""));
  }, [data]);

  const initials = (fullName || "PS")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ data: { full_name: fullName, title, crp, phone, bio } });
  }

  return (
    <Card className="p-6">
      <PanelHeader title="Perfil" desc="Suas informações pessoais e profissionais." />
      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <Button type="button" variant="outline" size="sm" disabled>
              Alterar foto
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">JPG ou PNG, até 2MB. (em breve)</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" value={fullName} onChange={setFullName} />
          <Field label="Título profissional" value={title} onChange={setTitle} />
          <Field label="CRP" value={crp} onChange={setCrp} />
          <Field label="E-mail" value={data?.profile?.email ?? ""} disabled />
          <Field label="Telefone" value={phone} onChange={setPhone} />
          <Field label="Fuso horário" value={data?.tenant?.timezone ?? "America/Sao_Paulo"} disabled />
        </div>
        <div>
          <Label className="mb-1.5 mt-4 block text-xs">Bio pública</Label>
          <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <SaveBar loading={mutation.isPending || isLoading} disabled={isLoading} />
      </form>
    </Card>
  );
}

function ConsultorioPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useSettings();
  const save = useServerFn(saveClinicSettings);
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: () => {
      toast.success("Consultório salvo!");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [duration, setDuration] = useState(50);
  const [price, setPrice] = useState(0);
  const [minHours, setMinHours] = useState(24);
  const [online, setOnline] = useState(true);
  const [inPerson, setInPerson] = useState(true);
  const [insurance, setInsurance] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.tenant?.name ?? "");
    const clinic = data.settings?.clinic ?? {};
    setAddress(String(clinic.address ?? ""));
    setDuration(Number(clinic.session_duration_minutes ?? 50));
    setPrice(Number(clinic.session_price_cents ?? 0));
    setMinHours(Number(clinic.min_booking_hours ?? 24));
    setOnline(Boolean(clinic.accepts_online ?? true));
    setInPerson(Boolean(clinic.accepts_in_person ?? true));
    setInsurance(Boolean(clinic.accepts_insurance ?? false));
  }, [data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      data: {
        name,
        address,
        session_duration_minutes: duration,
        session_price_cents: price,
        min_booking_hours: minHours,
        accepts_online: online,
        accepts_in_person: inPerson,
        accepts_insurance: insurance,
      },
    });
  }

  return (
    <Card className="p-6">
      <PanelHeader title="Consultório" desc="Endereço, modalidades e políticas de atendimento." />
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do consultório" value={name} onChange={setName} />
          <Field label="CNPJ (opcional)" value="" disabled />
          <Field label="Endereço" value={address} onChange={setAddress} />
          <Field label="Duração padrão da sessão (min)" value={String(duration)} onChange={(v) => setDuration(Number(v.replace(/\D/g, "")) || 0)} />
          <Field label="Valor padrão (centavos)" value={String(price)} onChange={(v) => setPrice(Number(v.replace(/\D/g, "")) || 0)} />
          <Field label="Antecedência mínima (horas)" value={String(minHours)} onChange={(v) => setMinHours(Number(v.replace(/\D/g, "")) || 0)} />
        </div>
        <Separator className="my-4" />
        <div className="space-y-3">
          <ToggleRow title="Aceita atendimento online" desc="Sessões via link seguro." checked={online} onCheckedChange={setOnline} />
          <ToggleRow title="Aceita atendimento presencial" desc="No endereço cadastrado." checked={inPerson} onCheckedChange={setInPerson} />
          <ToggleRow title="Convênios" desc="Exibe convênios aceitos no perfil público." checked={insurance} onCheckedChange={setInsurance} />
        </div>
        <SaveBar loading={mutation.isPending || isLoading} disabled={isLoading} />
      </form>
    </Card>
  );
}

function WhatsappPanel() {
  return <WhatsappCloudPanel />;
}

function NotificacoesPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useSettings();
  const save = useServerFn(saveNotificationSettings);
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: () => {
      toast.success("Preferências salvas!");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const [newConversation, setNewConversation] = useState(true);
  const [sessionScheduled, setSessionScheduled] = useState(true);
  const [handoff, setHandoff] = useState(true);
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  useEffect(() => {
    if (!data) return;
    const n = data.settings?.notifications ?? {};
    setNewConversation(Boolean(n.new_conversation ?? true));
    setSessionScheduled(Boolean(n.session_scheduled ?? true));
    setHandoff(Boolean(n.handoff ?? true));
    setPaymentReceived(Boolean(n.payment_received ?? true));
    setWeeklySummary(Boolean(n.weekly_summary ?? false));
  }, [data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      data: {
        new_conversation: newConversation,
        session_scheduled: sessionScheduled,
        handoff: handoff,
        payment_received: paymentReceived,
        weekly_summary: weeklySummary,
      },
    });
  }

  return (
    <Card className="p-6">
      <PanelHeader title="Notificações" desc="Escolha quando e como quer ser avisada." />
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <ToggleRow title="Nova conversa" desc="Push + e-mail." checked={newConversation} onCheckedChange={setNewConversation} />
          <ToggleRow title="Sessão agendada" desc="Push imediato." checked={sessionScheduled} onCheckedChange={setSessionScheduled} />
          <ToggleRow title="Handoff pedido pelo paciente" desc="Prioridade máxima." checked={handoff} onCheckedChange={setHandoff} />
          <ToggleRow title="Pagamento recebido" desc="Push + resumo diário." checked={paymentReceived} onCheckedChange={setPaymentReceived} />
          <ToggleRow title="Resumo semanal por e-mail" desc="Todo domingo à noite." checked={weeklySummary} onCheckedChange={setWeeklySummary} />
        </div>
        <SaveBar loading={mutation.isPending || isLoading} disabled={isLoading} />
      </form>
    </Card>
  );
}

function MarcaPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useSettings();
  const save = useServerFn(saveBrandingSettings);
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: () => {
      toast.success("Marca salva!");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const [publicName, setPublicName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");

  useEffect(() => {
    if (!data) return;
    setPublicName(String(data.settings?.branding?.public_name ?? ""));
    setPrimaryColor(data.tenant?.primary_color ?? "#c9a24a");
  }, [data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ data: { public_name: publicName, primary_color: primaryColor } });
  }

  return (
    <Card className="p-6">
      <PanelHeader title="Marca (White-label)" desc="Personalize cores, logo e domínio do seu portal." />
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome público" value={publicName} onChange={setPublicName} />
          <Field label="Domínio personalizado" value={data?.tenant?.slug ? `${data.tenant.slug}.psi.livhub.cloud` : ""} disabled />
          <div>
            <Label className="mb-1.5 block text-xs">Cor primária</Label>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded border" style={{ background: primaryColor }} />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-32" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Logo</Label>
            <Button type="button" variant="outline" size="sm" disabled>
              Fazer upload
            </Button>
          </div>
        </div>
        <SaveBar loading={mutation.isPending || isLoading} disabled={isLoading} />
      </form>
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [autoLogout, setAutoLogout] = useState(false);
  const [auditLog, setAuditLog] = useState(false);

  return (
    <Card className="p-6">
      <PanelHeader title="Segurança" desc="Senha, 2FA e sessões ativas." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha atual" type="password" value={currentPassword} onChange={setCurrentPassword} />
        <Field label="Nova senha" type="password" value={newPassword} onChange={setNewPassword} />
      </div>
      <Separator className="my-4" />
      <ToggleRow title="Autenticação de dois fatores (2FA)" desc="Recomendado para dados clínicos." checked={twoFactor} onCheckedChange={setTwoFactor} />
      <ToggleRow title="Encerrar sessões automaticamente após 30 min inativo" desc="Compliance LGPD." checked={autoLogout} onCheckedChange={setAutoLogout} />
      <ToggleRow title="Log de auditoria completo" desc="Registra acesso a prontuários." checked={auditLog} onCheckedChange={setAuditLog} />
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

function Field({
  label,
  value,
  type = "text",
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  disabled?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={disabled ? "bg-muted/50" : undefined}
      />
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SaveBar({ loading, disabled }: { loading?: boolean; disabled?: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
      <Button type="submit" variant="outline" size="sm" disabled={loading || disabled}>
        Cancelar
      </Button>
      <Button type="submit" size="sm" disabled={loading || disabled}>
        {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Salvar alterações
      </Button>
    </div>
  );
}

const ROOT_DOMAIN = "psi.livhub.cloud";
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function DominioPanel() {
  const qc = useQueryClient();
  const fetchDomain = useServerFn(getMyTenantDomain);
  const saveSlug = useServerFn(updateMyTenantSlug);
  const reqSubdomain = useServerFn(requestSubdomainActivation);
  const reqCustom = useServerFn(requestCustomDomainActivation);
  const listReqs = useServerFn(listMyDomainRequests);

  const { data, isLoading } = useQuery({
    queryKey: ["my-tenant-domain"],
    queryFn: () => fetchDomain(),
  });

  const { data: requests } = useQuery({
    queryKey: ["my-domain-requests"],
    queryFn: () => listReqs(),
  });

  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  useEffect(() => {
    if (data?.slug) setSlug(data.slug);
  }, [data?.slug]);

  const valid = SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 40;
  const dirty = data && slug !== data.slug;

  const mutation = useMutation({
    mutationFn: (newSlug: string) => saveSlug({ data: { slug: newSlug } }),
    onSuccess: () => {
      toast.success("Subdomínio atualizado!");
      qc.invalidateQueries({ queryKey: ["my-tenant-domain"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const activateMut = useMutation({
    mutationFn: () => reqSubdomain(),
    onSuccess: () => {
      toast.success("Solicitação enviada! O admin vai ativar seu subdomínio em breve.");
      qc.invalidateQueries({ queryKey: ["my-domain-requests"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const customMut = useMutation({
    mutationFn: (domain: string) => reqCustom({ data: { domain } }),
    onSuccess: () => {
      toast.success("Domínio próprio solicitado! Aguarde a análise do admin.");
      setCustomDomain("");
      qc.invalidateQueries({ queryKey: ["my-domain-requests"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const previewUrl = `https://${slug || "seu-slug"}.${ROOT_DOMAIN}`;
  const subdomainLive = data?.subdomain_status === "live";
  const openRequest = requests?.find(
    (r) => r.kind === "subdomain" && (r.status === "pending" || r.status === "in_progress"),
  );

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <PanelHeader
          title="Meu subdomínio"
          desc="Escolha o endereço público do seu consultório no LivHub."
        />

        <div className="grid gap-2">
          <Label className="text-xs">Subdomínio</Label>
          <div className="flex items-stretch overflow-hidden rounded-md border">
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="dr-liv"
              className="rounded-none border-0 focus-visible:ring-0"
            />
            <div className="flex items-center bg-muted px-3 text-sm text-muted-foreground">
              .{ROOT_DOMAIN}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use apenas letras minúsculas, números e hífens. Entre 3 e 40 caracteres.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Seu endereço público</p>
            <p className="truncate font-mono text-sm">{previewUrl}</p>
            <div className="mt-1 flex items-center gap-2">
              {subdomainLive ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  Ativo
                </Badge>
              ) : openRequest ? (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  Aguardando ativação
                </Badge>
              ) : (
                <Badge variant="outline">Ainda não ativado</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copy(previewUrl)}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
            </Button>
            <Button variant="outline" size="sm" asChild disabled={!valid || !subdomainLive}>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Abrir
              </a>
            </Button>
          </div>
        </div>

        {!subdomainLive && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Seu subdomínio precisa ser ativado pelo administrador.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cada novo endereço público precisa receber um certificado SSL antes de funcionar.
              Isso é feito manualmente pela equipe do LivHub e leva até 24h.
            </p>
            <Button
              size="sm"
              className="mt-3"
              disabled={activateMut.isPending || !!openRequest}
              onClick={() => activateMut.mutate()}
            >
              {activateMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {openRequest ? "Solicitação enviada" : "Solicitar ativação"}
            </Button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" disabled={!dirty} onClick={() => setSlug(data?.slug ?? "")}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!valid || !dirty || mutation.isPending || isLoading}
            onClick={() => mutation.mutate(slug)}
          >
            {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Salvar subdomínio
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <PanelHeader
          title="Domínio próprio"
          desc="Use seu próprio domínio (ex.: consultorio.seudominio.com) com SSL automático via Cloudflare."
        />

        {data?.custom_domain ? (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{data.custom_domain}</p>
                <Badge className="mt-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {data.custom_domain_status ?? "pendente"}
                </Badge>
              </div>
            </div>
            {data.custom_domain_status !== "active" && (
              <VerificationHelp verification={data.custom_domain_verification as Record<string, unknown> | null} />
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label className="text-xs">Seu domínio</Label>
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="consultorio.seudominio.com"
              />
              <p className="text-xs text-muted-foreground">
                Após solicitar, você receberá 2 registros DNS (TXT + CNAME) para adicionar no seu provedor
                de domínio. Assim que propagados, o admin ativa e o SSL é emitido automaticamente.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                disabled={customMut.isPending || customDomain.length < 4}
                onClick={() => customMut.mutate(customDomain)}
              >
                {customMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Solicitar domínio próprio
              </Button>
            </div>
          </>
        )}
      </Card>

      {!!requests?.length && (
        <Card className="p-6">
          <PanelHeader title="Suas solicitações" desc="Histórico de pedidos de ativação de domínio." />
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-mono">{r.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.kind === "subdomain" ? "Subdomínio" : "Domínio próprio"} ·{" "}
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge
                  className={
                    r.status === "active"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : r.status === "pending" || r.status === "in_progress"
                      ? "bg-amber-500/10 text-amber-700"
                      : "bg-rose-500/10 text-rose-700"
                  }
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function VerificationHelp({ verification }: { verification: Record<string, unknown> | null }) {
  if (!verification) return null;
  const ownership = verification.ownership as { name?: string; type?: string; value?: string } | null;
  const ssl = verification.ssl as Array<{ txt_name?: string; txt_value?: string }> | null;
  return (
    <div className="mt-3 space-y-2 rounded-md bg-muted/40 p-3 text-xs">
      <p className="font-medium">Adicione estes registros DNS no seu provedor:</p>
      {ownership?.name && (
        <div className="rounded bg-background p-2 font-mono">
          <div>Tipo: {ownership.type}</div>
          <div>Nome: {ownership.name}</div>
          <div>Valor: {ownership.value}</div>
        </div>
      )}
      {ssl?.map((r, i) =>
        r.txt_name ? (
          <div key={i} className="rounded bg-background p-2 font-mono">
            <div>Tipo: TXT</div>
            <div>Nome: {r.txt_name}</div>
            <div>Valor: {r.txt_value}</div>
          </div>
        ) : null,
      )}
      <div className="rounded bg-background p-2 font-mono">
        <div>Tipo: CNAME</div>
        <div>Nome: (seu domínio)</div>
        <div>Valor: psi.livhub.cloud</div>
      </div>
    </div>
  );
}

