import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, Check, ExternalLink, Plug, Send, ShieldCheck, CreditCard, Phone, KeyRound, AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getAlibabaChannel, saveAlibabaChannel, testAlibabaChannel, sendAlibabaTestMessage,
} from "@/lib/alibaba.functions";

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Criar conta na Alibaba Cloud",
    desc: "Crie sua conta e conclua a verificação de identidade (KYC). É o único passo que precisa ser feito fora do LivHub.",
    link: { label: "Abrir cadastro Alibaba Cloud", href: "https://www.alibabacloud.com/campaign/free-trial" },
  },
  {
    icon: CreditCard,
    title: "Ativar o Chat App Message Service",
    desc: "No console da Alibaba, ative o serviço ChatApp (CAMS) e adicione uma forma de pagamento. É por ele que o WhatsApp Business API é liberado.",
    link: { label: "Console ChatApp (CAMS)", href: "https://chatapp.console.aliyun.com" },
  },
  {
    icon: Phone,
    title: "Registrar seu número de WhatsApp",
    desc: "Cadastre o WABA e o número do consultório no console. A Alibaba envia o código de verificação por SMS ou ligação. O número não pode estar ativo no app WhatsApp comum.",
    link: { label: "Registrar número", href: "https://chatapp.console.aliyun.com" },
  },
  {
    icon: KeyRound,
    title: "Gerar as credenciais de API",
    desc: "Crie um par de AccessKey (ID + Secret) para um usuário RAM com permissão no ChatApp e cole abaixo. Guardamos o Secret criptografado.",
  },
  {
    icon: Plug,
    title: "Testar a conexão",
    desc: "O LivHub consulta seus números na Alibaba e confirma se as credenciais funcionam.",
  },
  {
    icon: Send,
    title: "Enviar mensagem de teste",
    desc: "Dispare uma mensagem real para o seu próprio WhatsApp e conclua a ativação.",
  },
];

export function AlibabaOnboardingPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getAlibabaChannel);
  const saveFn = useServerFn(saveAlibabaChannel);
  const testFn = useServerFn(testAlibabaChannel);
  const sendFn = useServerFn(sendAlibabaTestMessage);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["alibaba-channel"],
    queryFn: () => getFn() as Promise<any>,
  });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    display_name: "",
    phone_number: "",
    alibaba_region: "ap-southeast-1",
    alibaba_access_key_id: "",
    alibaba_access_key_secret: "",
    alibaba_cust_space_id: "",
  });
  const [testTo, setTestTo] = useState("");
  const [numbers, setNumbers] = useState<{ phone: string | null; status: string | null; name: string | null }[]>([]);

  useEffect(() => {
    if (!channel) return;
    setForm((f) => ({
      ...f,
      display_name: channel.display_name ?? "",
      phone_number: channel.phone_number ?? "",
      alibaba_region: channel.alibaba_region ?? "ap-southeast-1",
      alibaba_access_key_id: channel.alibaba_access_key_id ?? "",
      alibaba_cust_space_id: channel.alibaba_cust_space_id ?? "",
    }));
    setStep(Math.min(channel.onboarding_step ?? 0, STEPS.length - 1));
    setTestTo((t) => t || (channel.phone_number ?? ""));
  }, [channel]);

  const save = useMutation({
    mutationFn: (nextStep: number) =>
      saveFn({
        data: {
          id: channel?.id,
          display_name: form.display_name || "WhatsApp Alibaba",
          phone_number: form.phone_number,
          alibaba_region: form.alibaba_region,
          alibaba_access_key_id: form.alibaba_access_key_id,
          alibaba_access_key_secret: form.alibaba_access_key_secret,
          alibaba_cust_space_id: form.alibaba_cust_space_id,
          onboarding_step: nextStep,
        },
      }) as Promise<any>,
    onSuccess: (_d, nextStep) => {
      toast.success("Credenciais salvas com segurança.");
      setForm((f) => ({ ...f, alibaba_access_key_secret: "" }));
      setStep(nextStep);
      qc.invalidateQueries({ queryKey: ["alibaba-channel"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar."),
  });

  const test = useMutation({
    mutationFn: () => testFn({ data: { id: channel!.id } }) as Promise<any>,
    onSuccess: (res) => {
      if (res?.ok) {
        setNumbers(res.numbers ?? []);
        toast.success("Conexão com a Alibaba Cloud confirmada.");
        setStep(5);
      } else {
        toast.error(res?.error ?? "Falha na conexão.");
      }
      qc.invalidateQueries({ queryKey: ["alibaba-channel"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no teste."),
  });

  const sendTest = useMutation({
    mutationFn: () =>
      sendFn({ data: { id: channel!.id, to: testTo, text: "Olá! Esta é uma mensagem de teste enviada pelo LivHub." } }) as Promise<any>,
    onSuccess: (res) => {
      if (res?.ok) toast.success("Mensagem de teste enviada.");
      else toast.error(res?.error ?? "Falha no envio.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no envio."),
  });

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const statusBadge = channel?.status === "active"
    ? <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Conectado</Badge>
    : channel?.status === "error"
      ? <Badge variant="destructive">Erro</Badge>
      : <Badge variant="secondary">Não conectado</Badge>;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">WhatsApp via Alibaba Cloud</h2>
            <p className="text-sm text-muted-foreground">
              Ative o WhatsApp Business API pela Alibaba Cloud (parceira oficial da Meta) sem precisar criar um app no Meta for Developers.
            </p>
          </div>
          {statusBadge}
        </div>

        {channel?.last_error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{channel.last_error}</span>
          </div>
        )}

        <Separator className="my-5" />

        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const current = i === step;
            return (
              <li
                key={s.title}
                className={`rounded-lg border p-4 transition ${current ? "border-primary/60 bg-primary/5" : "border-border/60"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      done ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="font-medium">{s.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>

                    {s.link && (
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <a href={s.link.href} target="_blank" rel="noopener noreferrer">
                          {s.link.label} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}

                    {i === 3 && current && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <FormField label="Nome do canal" value={form.display_name}
                          onChange={(v) => setForm({ ...form, display_name: v })} placeholder="WhatsApp do consultório" />
                        <FormField label="Número (E.164)" value={form.phone_number}
                          onChange={(v) => setForm({ ...form, phone_number: v })} placeholder="+55 11 98765-4321" />
                        <FormField label="Região Alibaba" value={form.alibaba_region}
                          onChange={(v) => setForm({ ...form, alibaba_region: v })} placeholder="ap-southeast-1" />
                        <FormField label="CustSpaceId (ISV, opcional)" value={form.alibaba_cust_space_id}
                          onChange={(v) => setForm({ ...form, alibaba_cust_space_id: v })} placeholder="deixe em branco se não usar ISV" />
                        <FormField label="AccessKey ID" value={form.alibaba_access_key_id}
                          onChange={(v) => setForm({ ...form, alibaba_access_key_id: v })} placeholder="LTAI..." />
                        <FormField label="AccessKey Secret" value={form.alibaba_access_key_secret} type="password"
                          onChange={(v) => setForm({ ...form, alibaba_access_key_secret: v })}
                          placeholder={channel ? "•••••••• (deixe vazio para manter)" : "cole o secret"} />
                        <div className="sm:col-span-2">
                          <Button
                            onClick={() => save.mutate(4)}
                            disabled={save.isPending || !form.phone_number || !form.alibaba_access_key_id}
                          >
                            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar credenciais
                          </Button>
                        </div>
                      </div>
                    )}

                    {i === 4 && current && (
                      <div className="mt-4 space-y-3">
                        <Button onClick={() => test.mutate()} disabled={!channel?.id || test.isPending}>
                          {test.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
                          Testar conexão automaticamente
                        </Button>
                        {numbers.length > 0 && (
                          <div className="rounded-md border p-3 text-sm">
                            <p className="mb-2 font-medium">Números encontrados na sua conta:</p>
                            <ul className="space-y-1 text-muted-foreground">
                              {numbers.map((n, idx) => (
                                <li key={idx}>{n.phone ?? "—"} {n.name ? `• ${n.name}` : ""} {n.status ? `• ${n.status}` : ""}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {i === 5 && current && (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <Label className="mb-1.5 block text-xs">Enviar teste para</Label>
                          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+55 11 98765-4321" />
                        </div>
                        <Button onClick={() => sendTest.mutate()} disabled={!channel?.id || !testTo || sendTest.isPending}>
                          {sendTest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Enviar mensagem de teste
                        </Button>
                      </div>
                    )}

                    {current && i < 3 && (
                      <div className="mt-3">
                        <Button variant="secondary" size="sm" onClick={() => setStep(i + 1)}>
                          Já fiz este passo
                        </Button>
                      </div>
                    )}
                    {!current && i > 0 && (
                      <button
                        className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => setStep(i)}
                      >
                        Voltar para este passo
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          Prefere conectar direto pela Meta (custo por mensagem menor, mas exige criar um app no Meta for Developers)?
          Use a aba <strong>WhatsApp</strong> para o modo avançado. Você pode manter os dois e escolher qual canal usar.
        </p>
      </Card>
    </div>
  );
}

function FormField({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
