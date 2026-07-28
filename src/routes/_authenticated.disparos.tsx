import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Send, Users, CheckCircle2, Eye, Calendar, Loader2, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listChannels, listTemplatesLocal, syncTemplates, listBroadcasts, createBroadcast,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/disparos")({
  head: () => ({
    meta: [
      { title: "Disparos — LivHub" },
      { name: "description", content: "Envie mensagens em massa via WhatsApp com templates HSM aprovados pela Meta." },
      { property: "og:title", content: "Disparos — LivHub" },
      { property: "og:description", content: "Campanhas de disparo em massa via WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DisparosPage,
});

const statusStyle: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  canceled: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  completed: "concluído", running: "enviando", scheduled: "agendado",
  draft: "rascunho", failed: "falha", canceled: "cancelado",
};

function DisparosPage() {
  const qc = useQueryClient();
  const bcFn = useServerFn(listBroadcasts);
  const chFn = useServerFn(listChannels);
  const tplFn = useServerFn(listTemplatesLocal);
  const syncFn = useServerFn(syncTemplates);

  const { data: broadcasts = [] } = useQuery({ queryKey: ["wa-broadcasts"], queryFn: () => bcFn() as Promise<any[]> });
  const { data: channels = [] } = useQuery({ queryKey: ["wa-channels"], queryFn: () => chFn() as Promise<any[]> });
  const { data: templates = [] } = useQuery({ queryKey: ["wa-templates"], queryFn: () => tplFn() as Promise<any[]> });

  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const totals = useMemo(() => {
    const sent = broadcasts.reduce((s: number, b: any) => s + (b.sent_count ?? 0), 0);
    const delivered = broadcasts.reduce((s: number, b: any) => s + (b.delivered_count ?? 0), 0);
    const read = broadcasts.reduce((s: number, b: any) => s + (b.read_count ?? 0), 0);
    return { sent, delivered, read, count: broadcasts.length };
  }, [broadcasts]);

  async function handleSync(channelId: string) {
    setSyncing(channelId);
    try {
      const res = (await syncFn({ data: { channelId } })) as any;
      toast.success(`${res.imported} template(s) sincronizados`);
      qc.invalidateQueries({ queryKey: ["wa-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao sincronizar templates.");
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Disparos</h1>
          <p className="text-sm text-muted-foreground">Campanhas em massa via WhatsApp com templates HSM aprovados pela Meta.</p>
        </div>
        <div className="flex gap-2">
          {channels[0] && (
            <Button variant="outline" size="sm" onClick={() => handleSync(channels[0].id)} disabled={!!syncing}>
              {syncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
              Sincronizar templates
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={!channels.length || !templates.length}>
                <Plus className="h-4 w-4" /> Nova campanha
              </Button>
            </DialogTrigger>
            <NewBroadcastDialog
              onClose={() => setOpen(false)}
              channels={channels}
              templates={templates}
            />
          </Dialog>
        </div>
      </div>

      {!channels.length && (
        <Card className="border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          Conecte um canal WhatsApp em <a href="/configuracoes?tab=whatsapp" className="font-semibold underline">Configurações → WhatsApp</a> para começar a disparar.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={<Send className="h-4 w-4" />} label="Enviadas" value={totals.sent.toLocaleString("pt-BR")} />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Entregues" value={totals.delivered.toLocaleString("pt-BR")} />
        <Stat icon={<Eye className="h-4 w-4" />} label="Lidas" value={totals.read.toLocaleString("pt-BR")} />
        <Stat icon={<Users className="h-4 w-4" />} label="Campanhas" value={String(totals.count)} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Campanhas
        </div>
        <div className="divide-y">
          {broadcasts.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha ainda.</div>
          )}
          {broadcasts.map((c: any) => {
            const total = c.total_recipients || 1;
            const deliv = Math.round(((c.delivered_count || 0) / total) * 100);
            const read = Math.round(((c.read_count || 0) / total) * 100);
            const templateName = templates.find((t) => t.id === c.template_id)?.name ?? "—";
            return (
              <div key={c.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_140px] md:items-center">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[c.status] ?? ""}`}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString("pt-BR") :
                     c.started_at ? new Date(c.started_at).toLocaleString("pt-BR") : "—"}
                    {" · "}template <code className="rounded bg-muted px-1">{templateName}</code>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Entregue {c.delivered_count}/{c.total_recipients}</span>
                    <span className="font-medium">{isFinite(deliv) ? deliv : 0}%</span>
                  </div>
                  <Progress value={isFinite(deliv) ? deliv : 0} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Lido {c.read_count} · Falhas {c.failed_count}</span>
                    <span className="font-medium">{isFinite(read) ? read : 0}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{c.total_recipients}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Templates */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Templates HSM ({templates.length})
        </div>
        <div className="divide-y">
          {templates.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sincronize os templates aprovados da Meta para começar.
            </div>
          )}
          {templates.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.name} <span className="ml-1 text-xs text-muted-foreground">· {t.language}</span></p>
                <p className="truncate text-xs text-muted-foreground">{t.body_text}</p>
              </div>
              <Badge variant={t.status === "approved" ? "default" : "outline"}>{t.status}</Badge>
              <Badge variant="outline">{t.category}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </Card>
  );
}

function NewBroadcastDialog({ onClose, channels, templates }: { onClose: () => void; channels: any[]; templates: any[] }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createBroadcast);
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState<string>(channels[0]?.id ?? "");
  const [templateId, setTemplateId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [variables, setVariables] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, full_name, phone, tags").not("phone", "is", null).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase();
    return contacts.filter((c: any) =>
      !q || c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q),
    );
  }, [contacts, contactSearch]);

  const template = templates.find((t) => t.id === templateId);
  const varCount = template?.variables_count ?? 0;

  const submit = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !channelId || !templateId) throw new Error("Preencha os campos obrigatórios.");
      if (!selectedContacts.size) throw new Error("Selecione ao menos um contato.");
      const vars = variables.split("|").map((v) => v.trim()).filter(Boolean);
      if (vars.length < varCount) throw new Error(`Este template precisa de ${varCount} variável(is). Separe por " | ".`);
      return createFn({
        data: {
          name, channelId, templateId,
          variables: vars.slice(0, varCount),
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          contactIds: Array.from(selectedContacts),
        },
      });
    },
    onSuccess: () => {
      toast.success("Campanha criada!");
      qc.invalidateQueries({ queryKey: ["wa-broadcasts"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Nova campanha WhatsApp</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Nome da campanha</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Convite grupo de mindfulness" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Canal</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {channels.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Template HSM</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.status === "approved").map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.language})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {template && (
          <Card className="p-3 text-xs">
            <p className="mb-1 font-semibold">Prévia do template</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{template.body_text}</p>
          </Card>
        )}
        {varCount > 0 && (
          <div className="grid gap-2">
            <Label>Variáveis ({varCount}) — separe por " | "</Label>
            <Input value={variables} onChange={(e) => setVariables(e.target.value)} placeholder="Valor 1 | Valor 2" />
          </div>
        )}
        <div className="grid gap-2">
          <Label>Agendar para (opcional)</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Contatos ({selectedContacts.size} selecionados)</Label>
          <Input placeholder="Buscar contato…" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
          <div className="max-h-52 overflow-auto rounded border">
            {filteredContacts.map((c: any) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={selectedContacts.has(c.id)}
                  onChange={(e) => {
                    setSelectedContacts((prev) => {
                      const s = new Set(prev);
                      if (e.target.checked) s.add(c.id); else s.delete(c.id);
                      return s;
                    });
                  }}
                />
                <span className="flex-1">{c.full_name}</span>
                <span className="text-xs text-muted-foreground">{c.phone}</span>
              </label>
            ))}
            {filteredContacts.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhum contato.</p>}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
          {submit.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {scheduledAt ? "Agendar" : "Enviar agora"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
