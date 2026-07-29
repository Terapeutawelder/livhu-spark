import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Check, Copy, Trash2, Plug, Send, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  listChannels, upsertChannel, deleteChannel, testChannelConnection, checkChannelWabaConflict,
} from "@/lib/whatsapp.functions";


export function WhatsappCloudPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listChannels);
  const upsertFn = useServerFn(upsertChannel);
  const deleteFn = useServerFn(deleteChannel);
  const testFn = useServerFn(testChannelConnection);
  const conflictFn = useServerFn(checkChannelWabaConflict);


  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["wa-channels"],
    queryFn: () => listFn() as Promise<any[]>,
  });



  const emptyForm = {
    id: undefined as string | undefined,
    display_name: "",
    phone_number: "",
    phone_number_id: "",
    waba_id: "",
    business_id: "",
    access_token: "",
    app_secret: "",
    is_coexistence: true,
  };
  const [form, setForm] = useState(emptyForm);
  const active = channels[0];

  const { data: conflict } = useQuery({
    queryKey: ["wa-channel-conflict", active?.id],
    queryFn: async () => {
      if (!active?.id || !active.waba_id) return null;
      return conflictFn({ data: { id: active.id } }) as Promise<any>;
    },
    enabled: !!active?.id && !!active.waba_id,
    staleTime: 2 * 60 * 1000,
  });


  useEffect(() => {
    if (active && !form.id) {
      setForm({
        id: active.id,
        display_name: active.display_name ?? "",
        phone_number: active.phone_number ?? "",
        phone_number_id: active.phone_number_id ?? "",
        waba_id: active.waba_id ?? "",
        business_id: active.business_id ?? "",
        access_token: "",
        app_secret: "",
        is_coexistence: active.is_coexistence ?? true,
      });
    }
  }, [active, form.id]);

  const save = useMutation({
    mutationFn: async () => upsertFn({ data: form }),
    onSuccess: () => {
      toast.success("Canal salvo");
      qc.invalidateQueries({ queryKey: ["wa-channels"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const remove = useMutation({
    mutationFn: async () => deleteFn({ data: { id: form.id! } }),
    onSuccess: () => {
      toast.success("Canal removido");
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["wa-channels"] });
    },
  });
  const test = useMutation({
    mutationFn: async () => testFn({ data: { id: active!.id } }),
    onSuccess: (r: any) => toast.success(`Conectado: ${r?.verified_name ?? r?.display_phone_number ?? "OK"}`),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao conectar"),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = active ? `${origin}/api/public/whatsapp/webhook?channel=${active.id}` : "";
  const verifyToken = active?.webhook_verify_token ?? "";

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">WhatsApp Business Cloud API</h2>
          <p className="text-sm text-muted-foreground">
            Conecte seu número aprovado pela Meta. O modo <strong>Coexistência</strong> permite manter o WhatsApp comum no celular usando o mesmo número.
          </p>
        </div>

        {active && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <Check className="h-4 w-4" /> {active.display_name} — {active.phone_number}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                Status: <Badge variant="outline">{active.status}</Badge>
                {active.last_error && <span className="ml-2 text-red-600">· {active.last_error}</span>}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
              {test.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plug className="mr-1 h-4 w-4" />}
              Testar conexão
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nome exibido">
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Dra. Liv — Psicoterapeuta" />
          </FormField>
          <FormField label="Número (E.164, sem +)">
            <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="5511987650000" />
          </FormField>
          <FormField label="Phone Number ID">
            <Input value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} placeholder="123456789012345" />
          </FormField>
          <FormField label="WABA ID">
            <Input value={form.waba_id} onChange={(e) => setForm({ ...form, waba_id: e.target.value })} placeholder="987654321098765" />
          </FormField>
          <FormField label="Business ID (opcional)">
            <Input value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })} />
          </FormField>
          <FormField label="Access Token (permanente)">
            <Input type="password" value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} placeholder="EAAG..." />
          </FormField>
          <FormField label="App Secret (para validar webhook)">
            <Input type="password" value={form.app_secret} onChange={(e) => setForm({ ...form, app_secret: e.target.value })} placeholder="opcional, recomendado" />
          </FormField>
          <FormField label="&nbsp;">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Modo Coexistência</p>
                <p className="text-xs text-muted-foreground">Mantém o app WhatsApp no celular ativo.</p>
              </div>
              <Switch checked={form.is_coexistence} onCheckedChange={(v) => setForm({ ...form, is_coexistence: v })} />
            </div>
          </FormField>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {form.id && (
            <Button variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>
              <Trash2 className="mr-1 h-4 w-4" /> Remover
            </Button>
          )}
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Salvar canal
          </Button>
        </div>
      </Card>

      {active && (
        <Card className="p-6">
          <h3 className="text-base font-semibold">Webhook para a Meta</h3>
          <p className="text-sm text-muted-foreground">Cole estes valores em <em>App → WhatsApp → Configuration</em>.</p>
          <Separator className="my-3" />
          <div className="grid gap-3">
            <CopyRow label="Callback URL" value={webhookUrl} />
            <CopyRow label="Verify Token" value={verifyToken} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Marque os campos: <code>messages</code>, <code>message_status</code>, <code>message_template_status_update</code>.
          </p>
          <a
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks"
            target="_blank" rel="noreferrer"
          >
            Documentação oficial <ExternalLink className="h-3 w-3" />
          </a>
        </Card>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs" dangerouslySetInnerHTML={{ __html: label }} />
      {children}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
