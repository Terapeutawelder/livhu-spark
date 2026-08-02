import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, KeyRound, Loader2, Wand2, ShieldCheck, Trash2, Plus, Database,
  Users, MessageSquare, CalendarDays, CreditCard, Workflow, Megaphone, BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";

type Provider = "openai" | "google" | "anthropic" | "custom";

const PROVIDERS: { id: Provider; label: string; help: string }[] = [
  { id: "openai", label: "OpenAI", help: "Chave em platform.openai.com → API keys (começa com sk-)" },
  { id: "google", label: "Google Gemini", help: "Chave em aistudio.google.com → Get API key" },
  { id: "anthropic", label: "Anthropic Claude", help: "Chave em console.anthropic.com → API keys" },
  { id: "custom", label: "Outro LLM (compatível com OpenAI)", help: "Informe a base URL do endpoint, ex.: https://api.groq.com/openai/v1" },
];

const MODULES = [
  { key: "crm", label: "CRM e pacientes", table: "contacts", icon: Users },
  { key: "conversas", label: "Conversas omnichannel", table: "messages", icon: MessageSquare },
  { key: "agenda", label: "Agenda e serviços", table: "appointments", icon: CalendarDays },
  { key: "financeiro", label: "Financeiro e checkout", table: "invoices", icon: CreditCard },
  { key: "fluxos", label: "Fluxos e automações", table: "flows", icon: Workflow },
  { key: "marketing", label: "Marketing e campanhas", table: "broadcasts", icon: Megaphone },
] as const;

const EXAMPLES = [
  "Crie um agente de triagem inicial que colete motivo da busca, urgência e preferência de horário.",
  "Crie um agente de confirmação de sessões que reduza faltas e reagende quando o paciente não puder.",
  "Crie um agente de resgate para pacientes que sumiram há mais de 30 dias.",
];

const MEMORY_LIMIT_BYTES = 10 * 1024 * 1024;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function AiOrchestratorPanel() {
  const qc = useQueryClient();
  const { data: tenant } = useCurrentTenant();
  const tenantId = tenant?.id;

  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [instruction, setInstruction] = useState("");
  const [count, setCount] = useState(1);
  const [summary, setSummary] = useState<string | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [instructOpen, setInstructOpen] = useState(false);

  const keyQuery = useQuery({
    queryKey: ["ai_key_status"],
    queryFn: async () => {
      const { getAiKeyStatus } = await import("@/lib/ai-orchestrator.functions");
      return getAiKeyStatus({ data: undefined });
    },
  });

  const agentsQuery = useQuery({
    queryKey: ["ai_agents", tenantId, "all"],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const orchestratorRow = (agentsQuery.data ?? []).find((a: any) => a.is_orchestrator) ?? null;
  const supervised = (agentsQuery.data ?? []).filter((a: any) => !a.is_orchestrator);

  // Cria o registro do Orquestrador Master na primeira visita.
  const ensureOrchestrator = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_agents").insert({
        tenant_id: tenantId!,
        name: "Orquestrador Master",
        role: "Agente superior — governa todos os agentes do consultório",
        system_prompt:
          "Você é o Orquestrador Master do LivHub. Coordena os agentes especializados, consulta apenas os módulos liberados e nunca faz diagnóstico clínico.",
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        language: "pt-BR",
        tools: [],
        handoff_rules: [],
        is_active: true,
        is_orchestrator: true,
        module_access: MODULES.map((m) => m.key),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
  });

  useEffect(() => {
    if (tenantId && agentsQuery.isSuccess && !orchestratorRow && !ensureOrchestrator.isPending) {
      ensureOrchestrator.mutate();
    }
  }, [tenantId, agentsQuery.isSuccess, orchestratorRow]);

  const moduleAccess: string[] = Array.isArray(orchestratorRow?.module_access)
    ? (orchestratorRow!.module_access as string[])
    : [];

  const toggleModule = useMutation({
    mutationFn: async ({ key, on }: { key: string; on: boolean }) => {
      if (!orchestratorRow) throw new Error("Orquestrador ainda não inicializado.");
      const next = on ? [...new Set([...moduleAccess, key])] : moduleAccess.filter((k) => k !== key);
      const { error } = await supabase
        .from("ai_agents")
        .update({ module_access: next })
        .eq("id", orchestratorRow.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const countsQuery = useQuery({
    queryKey: ["orchestrator_module_counts", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const entries = await Promise.all(
        MODULES.map(async (m) => {
          const { count: c } = await supabase
            .from(m.table as any)
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId!);
          return [m.key, c ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  const memoryQuery = useQuery({
    queryKey: ["ai_memory_sources", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_memory_sources")
        .select("id, title, kind, content, size_bytes, is_active, updated_at")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const memory = memoryQuery.data ?? [];
  const memoryUsed = memory.reduce((acc, m: any) => acc + (m.size_bytes ?? 0), 0);

  const saveKey = useMutation({
    mutationFn: async () => {
      const { saveAiKey } = await import("@/lib/ai-orchestrator.functions");
      return saveAiKey({
        data: {
          provider,
          apiKey: apiKey.trim(),
          baseUrl: provider === "custom" ? baseUrl.trim() : null,
        },
      });
    },
    onSuccess: () => {
      setApiKey("");
      setKeyOpen(false);
      qc.invalidateQueries({ queryKey: ["ai_key_status"] });
      toast.success("Conexão de IA salva com segurança.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeKey = useMutation({
    mutationFn: async () => {
      const { removeAiKey } = await import("@/lib/ai-orchestrator.functions");
      return removeAiKey({ data: undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_key_status"] });
      toast.success("Conexão removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: async () => {
      const { orchestrateAgents } = await import("@/lib/ai-orchestrator.functions");
      return orchestrateAgents({ data: { instruction: instruction.trim(), count } });
    },
    onSuccess: (res) => {
      setSummary(res.summary);
      setInstruction("");
      setInstructOpen(false);
      qc.invalidateQueries({ queryKey: ["ai_agents"] });
      toast.success(`${res.created.length} agente(s) criado(s) como rascunho.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const configured = keyQuery.data?.configured;
  const canManage = keyQuery.data?.canManage ?? false;
  const providerLabel = PROVIDERS.find((p) => p.id === keyQuery.data?.provider)?.label ?? "Sem conexão";

  const health = useMemo(() => {
    const total = supervised.length || 1;
    const active = supervised.filter((a: any) => a.is_active).length;
    return Math.round((active / total) * 1000) / 10;
  }, [supervised]);

  return (
    <div className="grid gap-4">
      {/* Hero — Orquestrador Master */}
      <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-foreground via-foreground to-primary/40 p-5 text-background dark:from-card dark:via-card dark:to-primary/20 dark:text-foreground">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/25 ring-1 ring-primary/50">
              <Sparkles className="h-7 w-7 text-primary" />
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Agente superior
                </span>
                <Badge variant="outline" className="border-emerald-400/50 text-[10px] text-emerald-400">
                  ● Operacional
                </Badge>
              </div>
              <h2 className="text-xl font-semibold lg:text-2xl">Orquestrador Master</h2>
              <p className="mt-1 max-w-xl text-xs opacity-80">
                Coordena todos os agentes, compreende o funcionamento do sistema e cria novas
                inteligências especializadas a partir das suas instruções.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                {["Memória expansível", "Acesso controlado aos módulos", "Criação autônoma de agentes", "Governança e auditoria"].map((t) => (
                  <span key={t} className="rounded-md bg-background/10 px-2 py-1 ring-1 ring-background/20 dark:bg-foreground/5 dark:ring-foreground/10">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="grid grid-cols-3 gap-4 rounded-xl bg-background/10 p-3 text-center ring-1 ring-background/20 dark:bg-foreground/5 dark:ring-foreground/10">
              <div>
                <p className="text-[10px] opacity-70">Agentes supervisionados</p>
                <p className="text-lg font-semibold">{supervised.length}</p>
              </div>
              <div>
                <p className="text-[10px] opacity-70">Módulos liberados</p>
                <p className="text-lg font-semibold">{moduleAccess.length}</p>
              </div>
              <div>
                <p className="text-[10px] opacity-70">Saúde global</p>
                <p className="text-lg font-semibold text-primary">{health}%</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => setMemoryOpen(true)}>
                <Database className="h-4 w-4" /> Gerenciar memória
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setInstructOpen(true)}>
                <Wand2 className="h-4 w-4" /> Instruir Orquestrador
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Conhecimento do sistema */}
        <Card className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Conhecimento do sistema</p>
              <p className="text-xs text-muted-foreground">
                Módulos que o Orquestrador pode consultar.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-500">● Sincronizado</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODULES.map((m) => {
              const on = moduleAccess.includes(m.key);
              const Icon = m.icon;
              return (
                <div key={m.key} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {countsQuery.data?.[m.key] ?? 0} registros
                    </p>
                  </div>
                  <Switch
                    checked={on}
                    disabled={!orchestratorRow || toggleModule.isPending}
                    onCheckedChange={(v) => toggleModule.mutate({ key: m.key, on: v })}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Memória expansível */}
        <Card className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Memória expansível</p>
              <p className="text-xs text-muted-foreground">
                Contexto persistente indexado — o agente consulta resumos em vez de reler todo o histórico.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setMemoryOpen(true)}>
              <Plus className="h-4 w-4" /> Adicionar fonte
            </Button>
          </div>

          <div className="mb-3 rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Memória operacional</span>
              <span className="font-medium">
                {formatBytes(memoryUsed)} de {formatBytes(MEMORY_LIMIT_BYTES)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (memoryUsed / MEMORY_LIMIT_BYTES) * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2">
            {memoryQuery.isLoading && (
              <p className="text-xs text-muted-foreground">
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Carregando memória…
              </p>
            )}
            {!memoryQuery.isLoading && memory.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nenhuma fonte de memória ainda. Adicione documentos, políticas de atendimento ou
                aprendizados para o Orquestrador consultar.
              </p>
            )}
            {memory.slice(0, 6).map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <BrainCircuit className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{m.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {m.is_active ? "Ativa" : "Desconectada"} · {m.kind}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatBytes(m.size_bytes ?? 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Conexão segura com o LLM */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">Conexão segura com o modelo de IA</p>
            <p className="text-xs text-muted-foreground">
              OpenAI, Google Gemini, Anthropic Claude ou qualquer endpoint compatível — chave cifrada e usada só no servidor.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {configured ? (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              {providerLabel} {keyQuery.data?.hint}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Sem chave própria</Badge>
          )}
          {canManage && (
            <>
              <Button size="sm" variant="outline" onClick={() => setKeyOpen(true)}>
                {configured ? "Alterar conexão" : "Conectar LLM"}
              </Button>
              {configured && (
                <Button variant="ghost" size="icon" title="Remover chave" onClick={() => removeKey.mutate()}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      {summary && (
        <Card className="border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
          <p className="mb-1 text-sm font-semibold text-foreground">Plano do Orquestrador</p>
          {summary}
        </Card>
      )}

      {/* Dialog — conexão LLM */}
      <Dialog open={keyOpen} onOpenChange={setKeyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar provedor de IA</DialogTitle>
            <DialogDescription>
              A chave é cifrada em repouso e nunca é exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Provedor</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {PROVIDERS.find((p) => p.id === provider)?.help}
              </p>
            </div>
            {provider === "custom" && (
              <div>
                <Label className="text-xs">Base URL do endpoint</Label>
                <Input
                  className="mt-1"
                  placeholder="https://api.seuprovedor.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label className="text-xs">API key</Label>
              <Input
                className="mt-1"
                type="password"
                autoComplete="off"
                placeholder={configured ? "Digite para substituir a chave atual" : "Cole sua API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveKey.mutate()}
              disabled={apiKey.trim().length < 20 || saveKey.isPending}
            >
              {saveKey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar conexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — memória */}
      <MemoryDialog
        open={memoryOpen}
        onOpenChange={setMemoryOpen}
        tenantId={tenantId}
        memory={memory}
        used={memoryUsed}
      />

      {/* Dialog — instruir */}
      <Dialog open={instructOpen} onOpenChange={setInstructOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instruir o Orquestrador Master</DialogTitle>
            <DialogDescription>
              Descreva o que precisa; ele analisa os agentes existentes e cria novos especialistas como rascunho.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Textarea
              rows={4}
              maxLength={2000}
              placeholder="Ex.: crie um agente de triagem e outro de confirmação de sessões que conversem entre si."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInstruction(ex)}
                  className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {ex.slice(0, 48)}…
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Quantidade:</Label>
              <select
                className="rounded-md border bg-background px-2 py-1 text-xs"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n} agente(s)</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="gap-2"
              onClick={() => run.mutate()}
              disabled={instruction.trim().length < 10 || run.isPending}
            >
              {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Criar agentes com IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemoryDialog({
  open, onOpenChange, tenantId, memory, used,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  memory: any[];
  used: number;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("nota");
  const [content, setContent] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Consultório não encontrado.");
      const body = content.trim();
      const { error } = await supabase.from("ai_memory_sources").insert({
        tenant_id: tenantId,
        title: title.trim().slice(0, 120),
        kind,
        content: body.slice(0, 20000),
        size_bytes: new TextEncoder().encode(body).length,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      qc.invalidateQueries({ queryKey: ["ai_memory_sources"] });
      toast.success("Fonte adicionada à memória.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const { error } = await supabase.from("ai_memory_sources").update({ is_active: on }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_memory_sources"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_memory_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_memory_sources"] });
      toast.success("Fonte removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Memória expansível</DialogTitle>
          <DialogDescription>
            Fontes indexadas que o Orquestrador consulta sob demanda ({formatBytes(used)} em uso).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2 rounded-lg border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
              <Input placeholder="Título da fonte" value={title} onChange={(e) => setTitle(e.target.value)} />
              <select
                className="rounded-md border bg-background px-2 py-2 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="nota">Nota</option>
                <option value="documento">Documento</option>
                <option value="politica">Política de atendimento</option>
                <option value="faq">FAQ</option>
                <option value="aprendizado">Aprendizado</option>
              </select>
            </div>
            <Textarea
              rows={4}
              maxLength={20000}
              placeholder="Cole o conteúdo que o Orquestrador deve lembrar (resumos, regras, FAQ...)."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => add.mutate()}
                disabled={title.trim().length < 3 || content.trim().length < 10 || add.isPending}
              >
                {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar fonte
              </Button>
            </div>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {memory.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma fonte cadastrada.</p>
            )}
            {memory.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <BrainCircuit className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{m.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {m.kind} · {formatBytes(m.size_bytes ?? 0)}
                  </p>
                </div>
                <Switch checked={m.is_active} onCheckedChange={(v) => toggle.mutate({ id: m.id, on: v })} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(m.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
