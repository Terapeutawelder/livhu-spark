import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus, Play, Pause, Trash2, Zap, MessageSquare, GitBranch, Clock, Bot, CheckCircle2, Loader2,
  ArrowDown, Sparkles, Copy, ChevronUp, ChevronDown, FlaskConical, History, Rocket, AlertTriangle,
  Download, Upload, Users, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { FLOW_TEMPLATES, CATEGORY_LABEL, type FlowTemplate } from "@/lib/flow-templates";
import { runFlow, listFlowRuns, getFlowRunSteps, simulateFlowRun } from "@/lib/flows.functions";

export const Route = createFileRoute("/_authenticated/fluxos")({
  head: () => ({
    meta: [
      { title: "Fluxos de Automação — LivHub" },
      { name: "description", content: "Editor de fluxos de mensagens WhatsApp com gatilhos, ações e IA." },
      { property: "og:title", content: "Fluxos de Automação — LivHub" },
      { property: "og:description", content: "Automatize a jornada do paciente com fluxos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-muted-foreground">
      Não foi possível carregar os fluxos: {(error as Error)?.message}
    </div>
  ),
  component: FluxosPage,
});

type StepKind = "message" | "wait" | "ai" | "condition" | "notify";
type Step = { id: string; kind: StepKind; label: string; content: string };

type Flow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  trigger: string;
  steps: Step[];
  is_active: boolean;
  runs_count: number;
  success_count?: number | null;
  error_count?: number | null;
  last_run_at?: string | null;
};

const TRIGGERS = [
  { id: "contact_created", label: "Nova conversa (contato criado)" },
  { id: "first_message_received", label: "Primeira mensagem recebida" },
  { id: "appointment_scheduled", label: "Sessão agendada" },
  { id: "appointment_completed", label: "Sessão concluída" },
  { id: "no_reply_7d", label: "Sem resposta há 7 dias" },
  { id: "payment_received", label: "Pagamento recebido" },
];

const STEP_TEMPLATES: Record<StepKind, { icon: React.ReactNode; label: string; sample: string }> = {
  message: { icon: <MessageSquare className="h-4 w-4" />, label: "Enviar mensagem", sample: "Olá {{nome}}, tudo bem?" },
  wait: { icon: <Clock className="h-4 w-4" />, label: "Aguardar", sample: "10 minutos" },
  ai: { icon: <Bot className="h-4 w-4" />, label: "Agente IA", sample: "Coletar motivo e urgência" },
  condition: { icon: <GitBranch className="h-4 w-4" />, label: "Condição", sample: "Se urgência = alta" },
  notify: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Notificar terapeuta", sample: "Push + e-mail" },
};

const VARIABLES = ["nome", "nome_completo", "telefone", "email", "horario", "modalidade", "link_agendamento"];

function validateFlow(f: Flow): string[] {
  const errors: string[] = [];
  if (!f.name.trim()) errors.push("Dê um nome ao fluxo.");
  if (f.steps.length === 0) errors.push("Adicione pelo menos um passo.");
  f.steps.forEach((s, i) => {
    if (!s.content.trim()) errors.push(`Passo ${i + 1} (${s.label}) está sem conteúdo.`);
    if (s.kind === "message" && s.content.length > 1000)
      errors.push(`Passo ${i + 1}: mensagem muito longa (máx. 1000 caracteres).`);
    const unknown = [...s.content.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
      .map((m) => m[1])
      .filter((v) => !VARIABLES.includes(v));
    if (unknown.length) errors.push(`Passo ${i + 1}: variável desconhecida {{${unknown[0]}}}.`);
  });
  return errors;
}

function FluxosPage() {
  const qc = useQueryClient();
  const { data: tenant } = useCurrentTenant();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const flowsQuery = useQuery({
    queryKey: ["flows", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((f) => ({
        ...f,
        steps: Array.isArray(f.steps) ? (f.steps as unknown as Step[]) : [],
      })) as unknown as Flow[];
    },
  });

  const flows = flowsQuery.data ?? [];
  const filtered = flows.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  const selected = flows.find((f) => f.id === selectedId) ?? flows[0] ?? null;

  useEffect(() => {
    if (!selectedId && flows[0]) setSelectedId(flows[0].id);
  }, [flows, selectedId]);

  const createFlow = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error("Consultório não encontrado");
      const { data, error } = await supabase
        .from("flows")
        .insert({
          tenant_id: tenant.id,
          name: "Novo fluxo",
          description: "",
          trigger: "contact_created",
          steps: [
            { id: crypto.randomUUID(), kind: "message", label: "Boas-vindas", content: "Olá {{nome}}! 👋" },
          ],
          is_active: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Flow;
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      setSelectedId(f.id);
      toast.success("Fluxo criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const installTemplate = useMutation({
    mutationFn: async (tpl: FlowTemplate) => {
      if (!tenant) throw new Error("Consultório não encontrado");
      const { data, error } = await supabase
        .from("flows")
        .insert({
          tenant_id: tenant.id,
          name: tpl.name,
          description: tpl.description,
          trigger: tpl.trigger,
          steps: tpl.steps.map((s) => ({ id: crypto.randomUUID(), ...s })),
          is_active: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Flow;
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      setSelectedId(f.id);
      toast.success("Template instalado — ative quando estiver pronto.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importFlow = useMutation({
    mutationFn: async (payload: ImportedFlow) => {
      if (!tenant) throw new Error("Consultório não encontrado");
      const { data, error } = await supabase
        .from("flows")
        .insert({
          tenant_id: tenant.id,
          name: payload.name,
          description: payload.description ?? "",
          trigger: payload.trigger,
          steps: payload.steps.map((s) => ({ ...s, id: crypto.randomUUID() })) as never,
          is_active: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Flow;
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      setSelectedId(f.id);
      toast.success("Fluxo importado como rascunho");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const activeCount = flows.filter((f) => f.is_active).length;
  const totalRuns = flows.reduce((acc, f) => acc + (f.runs_count ?? 0), 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fluxos de Automação</h1>
          <p className="text-sm text-muted-foreground">
            {flows.length} fluxo(s) • {activeCount} ativo(s) • {totalRuns} execuções
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportFlowButton
            onImport={(payload) => importFlow.mutate(payload)}
            isPending={importFlow.isPending}
          />
          <TemplatesDialog onInstall={(t) => installTemplate.mutate(t)} isPending={installTemplate.isPending} />
          <Button size="sm" className="gap-2" onClick={() => createFlow.mutate()} disabled={createFlow.isPending}>
            {createFlow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Novo fluxo
          </Button>
        </div>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[340px_1fr]">
        <Card className="flex min-h-0 flex-col">
          <div className="border-b p-3">
            <Input placeholder="Buscar fluxo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {flowsQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Nenhum fluxo. Clique em <b className="mx-1">Novo fluxo</b> para começar.
            </div>
          ) : (
            <ul className="flex-1 divide-y overflow-y-auto">
              {filtered.map((f) => (
                <li
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`cursor-pointer p-3 transition hover:bg-muted/50 ${
                    selected?.id === f.id ? "bg-muted/60" : ""
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{f.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        f.is_active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {f.is_active ? "ativo" : "rascunho"}
                    </span>
                  </div>
                  <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" /> {TRIGGERS.find((t) => t.id === f.trigger)?.label ?? f.trigger}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.steps.length} passos • {f.runs_count} execuções
                    {f.error_count ? ` • ${f.error_count} com erro` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <FlowEditor key={selected.id} flow={selected} tenantId={tenant?.id ?? null} />
        ) : (
          <Card className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Selecione ou crie um fluxo para editar.
          </Card>
        )}
      </div>
    </div>
  );
}

function FlowEditor({ flow, tenantId }: { flow: Flow; tenantId: string | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Flow>(flow);
  const [tab, setTab] = useState("editor");
  const runFlowFn = useServerFn(runFlow);

  useEffect(() => setForm(flow), [flow]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(flow), [form, flow]);
  const errors = useMemo(() => validateFlow(form), [form]);

  const persist = async (patch: Partial<Flow>) => {
    const next = { ...form, ...patch };
    const { error } = await supabase
      .from("flows")
      .update({
        name: next.name,
        description: next.description,
        trigger: next.trigger,
        steps: next.steps as never,
        is_active: next.is_active,
      })
      .eq("id", next.id);
    if (error) throw error;
    return next;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (errors.length) throw new Error(errors[0]);
      return persist({});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Fluxo salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      const activating = !form.is_active;
      if (activating && errors.length) throw new Error(errors[0]);
      const next = await persist({ is_active: activating });
      setForm(next);
      return activating;
    },
    onSuccess: (activating) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success(activating ? "Fluxo ativado" : "Fluxo pausado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Consultório não encontrado");
      const { error } = await supabase.from("flows").insert({
        tenant_id: tenantId,
        name: `${form.name} (cópia)`,
        description: form.description,
        trigger: form.trigger,
        steps: form.steps.map((s) => ({ ...s, id: crypto.randomUUID() })) as never,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Fluxo duplicado como rascunho");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("flows").delete().eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Fluxo removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const execute = useMutation({
    mutationFn: async (vars: { contactId: string | null; isTest: boolean }) => {
      if (errors.length) throw new Error(errors[0]);
      if (dirty) await persist({});
      return runFlowFn({ data: { flowId: form.id, contactId: vars.contactId, isTest: vars.isTest } });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["flow-runs", form.id] });
      setTab("execucoes");
      if (res.status === "failed") toast.error(`Execução falhou: ${res.error}`);
      else toast.success("Execução concluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addStep = (kind: StepKind) => {
    const t = STEP_TEMPLATES[kind];
    setForm({
      ...form,
      steps: [...form.steps, { id: crypto.randomUUID(), kind, label: t.label, content: t.sample }],
    });
  };

  const updateStep = (id: string, patch: Partial<Step>) => {
    setForm({ ...form, steps: form.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };

  const removeStep = (id: string) => {
    setForm({ ...form, steps: form.steps.filter((s) => s.id !== id) });
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = form.steps.findIndex((s) => s.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= form.steps.length) return;
    const steps = [...form.steps];
    [steps[idx], steps[next]] = [steps[next], steps[idx]];
    setForm({ ...form, steps });
  };

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <div className="min-w-0 flex-1">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border-none bg-transparent p-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Gatilho:</Label>
            <select
              className="rounded-md border bg-background px-2 py-1 text-xs"
              value={form.trigger}
              onChange={(e) => setForm({ ...form, trigger: e.target.value })}
            >
              {TRIGGERS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            {dirty && <Badge variant="outline" className="text-[10px]">alterações não salvas</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TestRunDialog
            tenantId={tenantId}
            isPending={execute.isPending}
            onRun={(contactId, isTest) => execute.mutate({ contactId, isTest })}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
          >
            {form.is_active ? <><Pause className="h-3 w-3" /> Pausar</> : <><Play className="h-3 w-3" /> Ativar</>}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => duplicate.mutate()} title="Duplicar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => remove.mutate()} title="Remover">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-3 pt-2">
          <TabsList>
            <TabsTrigger value="editor" className="gap-1"><GitBranch className="h-3 w-3" /> Editor</TabsTrigger>
            <TabsTrigger value="execucoes" className="gap-1"><History className="h-3 w-3" /> Execuções</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="m-0 min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_260px]">
            <div className="relative overflow-auto bg-[radial-gradient(circle,theme(colors.border)_1px,transparent_1px)] [background-size:20px_20px] p-6">
              <div className="mx-auto flex max-w-lg flex-col items-center gap-2">
                <FlowNode
                  icon={<Zap className="h-4 w-4" />}
                  title="Gatilho"
                  subtitle={TRIGGERS.find((t) => t.id === form.trigger)?.label ?? form.trigger}
                  kind="trigger"
                />
                {form.steps.map((s, i) => (
                  <div key={s.id} className="flex w-full flex-col items-center">
                    <FlowConnector />
                    <StepCard
                      step={s}
                      index={i}
                      total={form.steps.length}
                      onChange={(p) => updateStep(s.id, p)}
                      onRemove={() => removeStep(s.id)}
                      onMove={(d) => moveStep(s.id, d)}
                    />
                  </div>
                ))}
                {form.steps.length === 0 && (
                  <p className="mt-8 text-center text-xs text-muted-foreground">
                    Adicione passos usando o painel à direita.
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-y-auto border-l bg-muted/20 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Adicionar passo
              </p>
              <div className="grid gap-2">
                {(Object.keys(STEP_TEMPLATES) as StepKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => addStep(k)}
                    className="flex items-center gap-2 rounded-md border bg-background p-2 text-left text-sm transition hover:bg-muted/40"
                  >
                    <span className="text-muted-foreground">{STEP_TEMPLATES[k].icon}</span>
                    {STEP_TEMPLATES[k].label}
                  </button>
                ))}
              </div>

              <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Variáveis
              </p>
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      navigator.clipboard?.writeText(`{{${v}}}`);
                      toast.success(`{{${v}}} copiada`);
                    }}
                    className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border hover:text-foreground"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>

              {errors.length > 0 && (
                <div className="mt-5 rounded-md border border-destructive/40 bg-destructive/5 p-2">
                  <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Pendências
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                    {errors.slice(0, 4).map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="execucoes" className="m-0 min-h-0 flex-1 overflow-auto p-3">
          <RunsPanel flowId={form.id} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
        <p className="text-xs text-muted-foreground">
          {form.steps.length} passo(s) • {form.runs_count} execuções
          {form.last_run_at ? ` • última em ${new Date(form.last_run_at).toLocaleString("pt-BR")}` : ""}
        </p>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar fluxo
        </Button>
      </div>
    </Card>
  );
}

function TestRunDialog({
  tenantId, onRun, isPending,
}: {
  tenantId: string | null;
  onRun: (contactId: string | null, isTest: boolean) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>("");

  const contacts = useQuery({
    queryKey: ["contacts-lite", tenantId],
    enabled: !!tenantId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, full_name, phone")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <FlaskConical className="h-3 w-3" /> Executar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Executar fluxo</DialogTitle>
          <DialogDescription>
            No modo <b>teste</b> nada é enviado ao paciente — você vê a prévia de cada passo.
            No modo <b>real</b> as mensagens são enviadas pelo WhatsApp conectado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs">Contato</Label>
          <select
            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Sem contato (apenas prévia)</option>
            {(contacts.data ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.phone ? ` — ${c.phone}` : " — sem telefone"}
              </option>
            ))}
          </select>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            className="gap-1"
            disabled={isPending}
            onClick={() => { onRun(contactId || null, true); setOpen(false); }}
          >
            <FlaskConical className="h-4 w-4" /> Testar (sem enviar)
          </Button>
          <Button
            className="gap-1"
            disabled={isPending || !contactId}
            onClick={() => { onRun(contactId || null, false); setOpen(false); }}
          >
            <Rocket className="h-4 w-4" /> Executar de verdade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunsPanel({ flowId }: { flowId: string }) {
  const listRuns = useServerFn(listFlowRuns);
  const getSteps = useServerFn(getFlowRunSteps);
  const [openRun, setOpenRun] = useState<string | null>(null);

  const runs = useQuery({
    queryKey: ["flow-runs", flowId],
    queryFn: () => listRuns({ data: { flowId, limit: 20 } }),
  });

  const steps = useQuery({
    queryKey: ["flow-run-steps", openRun],
    enabled: !!openRun,
    queryFn: () => getSteps({ data: { runId: openRun! } }),
  });

  if (runs.isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando execuções...
      </div>
    );
  }

  if (!runs.data?.length) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma execução ainda. Use <b>Executar</b> para testar o fluxo.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.data.map((r: any) => (
        <div key={r.id} className="rounded-lg border bg-card">
          <button
            className="flex w-full items-center justify-between gap-3 p-3 text-left"
            onClick={() => setOpenRun(openRun === r.id ? null : r.id)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {new Date(r.started_at).toLocaleString("pt-BR")}
                {r.is_test && <Badge variant="outline" className="ml-2 text-[10px]">teste</Badge>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {TRIGGERS.find((t) => t.id === r.trigger)?.label ?? r.trigger}
                {r.error ? ` • ${r.error}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                r.status === "failed"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              }`}
            >
              {r.status === "failed" ? "falhou" : "concluído"}
            </span>
          </button>

          {openRun === r.id && (
            <div className="space-y-2 border-t p-3">
              {steps.isLoading ? (
                <p className="text-xs text-muted-foreground">Carregando passos...</p>
              ) : (
                (steps.data ?? []).map((s: any) => (
                  <div key={s.id} className="rounded-md border bg-muted/20 p-2">
                    <p className="text-xs font-semibold">
                      {s.position + 1}. {s.label}{" "}
                      <span className="font-normal text-muted-foreground">({s.kind})</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {s.error ?? s.output ?? s.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StepCard({
  step, index, total, onChange, onRemove, onMove,
}: {
  step: Step;
  index: number;
  total: number;
  onChange: (p: Partial<Step>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const t = STEP_TEMPLATES[step.kind];
  const kindStyles: Record<StepKind, string> = {
    message: "border-l-blue-500",
    wait: "border-l-slate-500",
    ai: "border-l-violet-500",
    condition: "border-l-emerald-500",
    notify: "border-l-amber-500",
  };
  return (
    <div className={`w-full rounded-lg border border-l-4 bg-card p-3 shadow-sm ${kindStyles[step.kind]}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>{t.icon}</span>
          <Input
            value={step.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-6 border-none bg-transparent p-0 text-xs font-semibold uppercase tracking-wide shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <Textarea
        rows={2}
        value={step.content}
        onChange={(e) => onChange({ content: e.target.value })}
        className="min-h-0 resize-none text-sm"
      />
      {step.kind === "message" && (
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{step.content.length}/1000</p>
      )}
    </div>
  );
}

function FlowNode({
  icon, title, subtitle, kind = "action",
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  kind?: "trigger" | "action";
}) {
  const styles = {
    trigger: "border-l-amber-500 bg-amber-50 dark:bg-amber-500/10",
    action: "border-l-blue-500 bg-blue-50 dark:bg-blue-500/10",
  };
  return (
    <div className={`w-full rounded-lg border border-l-4 bg-card p-3 shadow-sm ${styles[kind]}`}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      <p className="mt-1 text-sm font-medium">{subtitle}</p>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-4 w-0.5 bg-border" />
      <ArrowDown className="h-3 w-3 text-border" />
    </div>
  );
}

function TemplatesDialog({
  onInstall,
  isPending,
}: {
  onInstall: (t: FlowTemplate) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          Templates prontos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            Automações prontas
          </DialogTitle>
          <DialogDescription>
            Instale com 1 clique. O fluxo entra como <b>rascunho</b> — revise e ative quando quiser.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {FLOW_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-lg border bg-card p-4 shadow-sm transition hover:border-gold/40 hover:shadow-gold/10"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-2xl leading-none">{t.icon}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABEL[t.category]}
                  </Badge>
                </div>
                <p className="mb-1 text-sm font-semibold leading-tight">{t.name}</p>
                <p className="mb-3 flex-1 text-xs text-muted-foreground">{t.description}</p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {t.steps.slice(0, 4).map((s, i) => (
                    <span
                      key={i}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {s.label}
                    </span>
                  ))}
                  {t.steps.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{t.steps.length - 4}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full gap-1"
                  disabled={isPending}
                  onClick={() => {
                    onInstall(t);
                    setOpen(false);
                  }}
                >
                  <Plus className="h-3 w-3" /> Instalar template
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
