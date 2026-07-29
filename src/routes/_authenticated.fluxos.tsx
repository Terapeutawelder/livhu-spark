import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Play, Pause, Trash2, Zap, MessageSquare, GitBranch, Clock, Bot, CheckCircle2, Loader2, ArrowDown, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { FLOW_TEMPLATES, CATEGORY_LABEL, type FlowTemplate } from "@/lib/flow-templates";

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
      if (!tenant) throw new Error("Tenant não encontrado");
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fluxos de Automação</h1>
          <p className="text-sm text-muted-foreground">
            Gatilhos, mensagens automáticas e agentes IA para automatizar a jornada.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => createFlow.mutate()} disabled={createFlow.isPending}>
          {createFlow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Novo fluxo
        </Button>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
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
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <FlowEditor key={selected.id} flow={selected} />
        ) : (
          <Card className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Selecione ou crie um fluxo para editar.
          </Card>
        )}
      </div>
    </div>
  );
}

function FlowEditor({ flow }: { flow: Flow }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Flow>(flow);

  useEffect(() => setForm(flow), [flow]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("flows")
        .update({
          name: form.name,
          description: form.description,
          trigger: form.trigger,
          steps: form.steps,
          is_active: form.is_active,
        })
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Fluxo salvo");
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

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <div className="min-w-0 flex-1">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border-none bg-transparent p-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
          <div className="mt-1 flex items-center gap-2">
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
          >
            {form.is_active ? <><Pause className="h-3 w-3" /> Pausar</> : <><Play className="h-3 w-3" /> Ativar</>}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => remove.mutate()} title="Remover">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_260px]">
        <div className="relative overflow-auto bg-[radial-gradient(circle,theme(colors.border)_1px,transparent_1px)] [background-size:20px_20px] p-6">
          <div className="mx-auto flex max-w-lg flex-col items-center gap-2">
            <FlowNode
              icon={<Zap className="h-4 w-4" />}
              title="Gatilho"
              subtitle={TRIGGERS.find((t) => t.id === form.trigger)?.label ?? form.trigger}
              kind="trigger"
            />
            {form.steps.map((s) => (
              <div key={s.id} className="flex w-full flex-col items-center">
                <FlowConnector />
                <StepCard step={s} onChange={(p) => updateStep(s.id, p)} onRemove={() => removeStep(s.id)} />
              </div>
            ))}
            {form.steps.length === 0 && (
              <p className="mt-8 text-center text-xs text-muted-foreground">
                Adicione passos usando o painel à direita.
              </p>
            )}
          </div>
        </div>

        <div className="border-l bg-muted/20 p-3">
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
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t p-3">
        <p className="text-xs text-muted-foreground">
          {form.steps.length} passo(s) • {form.runs_count} execuções
        </p>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar fluxo
        </Button>
      </div>
    </Card>
  );
}

function StepCard({
  step, onChange, onRemove,
}: {
  step: Step;
  onChange: (p: Partial<Step>) => void;
  onRemove: () => void;
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
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>{t.icon}</span>
          <Input
            value={step.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-6 border-none bg-transparent p-0 text-xs font-semibold uppercase tracking-wide shadow-none focus-visible:ring-0"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Textarea
        rows={2}
        value={step.content}
        onChange={(e) => onChange({ content: e.target.value })}
        className="min-h-0 resize-none text-sm"
      />
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
