import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Plus, Sparkles, MessageSquare, Zap, Settings2, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { AiOrchestratorPanel } from "@/components/ai-orchestrator-panel";
import { chatWithAgent } from "@/lib/agents.functions";

type Agent = {
  id: string;
  tenant_id: string;
  name: string;
  role: string;
  system_prompt: string;
  model: string;
  temperature: number;
  language: string;
  tools: string[];
  handoff_rules: string[];
  is_active: boolean;
};

const AVAILABLE_TOOLS = [
  "Consultar agenda",
  "Criar agendamento",
  "Buscar contato",
  "Enviar link de pagamento",
  "Registrar nota clínica",
  "Escalar para humano",
];

const MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido, grátis)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (mais capaz)" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "openai/gpt-5", label: "GPT-5" },
];

export const Route = createFileRoute("/_authenticated/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes IA — LivHub" },
      { name: "description", content: "Configure agentes de IA para triagem, atendimento e follow-up automatizado." },
      { property: "og:title", content: "Agentes IA — LivHub" },
      { property: "og:description", content: "Agentes de IA especializados no atendimento terapêutico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentesPage,
});

function AgentesPage() {
  const qc = useQueryClient();
  const { data: tenant } = useCurrentTenant();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const agentsQuery = useQuery({
    queryKey: ["ai_agents", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });

  const agents = agentsQuery.data ?? [];
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0] ?? null;

  useEffect(() => {
    if (!selectedId && agents[0]) setSelectedId(agents[0].id);
  }, [agents, selectedId]);

  const createAgent = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error("Tenant não encontrado");
      const { data, error } = await supabase
        .from("ai_agents")
        .insert({
          tenant_id: tenant.id,
          name: "Novo agente",
          role: "Descreva a função deste agente",
          system_prompt:
            "Você é um assistente virtual empático de um psicoterapeuta. Fale em tom acolhedor, use linguagem simples e nunca faça diagnóstico.",
          model: "google/gemini-2.5-flash",
          temperature: 0.4,
          language: "pt-BR",
          tools: [],
          handoff_rules: [],
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Agent;
    },
    onSuccess: (agent) => {
      qc.invalidateQueries({ queryKey: ["ai_agents"] });
      setSelectedId(agent.id);
      toast.success("Agente criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_agents"] });
      setSelectedId(null);
      toast.success("Agente removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 overflow-y-auto p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agentes IA</h1>
          <p className="text-sm text-muted-foreground">
            Configure assistentes especializados e teste no sandbox em tempo real.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => createAgent.mutate()} disabled={createAgent.isPending}>
          {createAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Novo agente
        </Button>
      </div>

      <AiOrchestratorPanel />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Agentes ativos" value={String(agents.filter((a) => a.is_active).length)} hint={`de ${agents.length} criados`} />
        <StatCard label="Modelo padrão" value="Gemini 2.5" hint="Flash" />
        <StatCard label="Idioma" value="PT-BR" />
        <StatCard label="Handoff" value="Manual" hint="via regras" />
      </div>


      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[320px_1fr_360px]">
        <Card className="flex min-h-0 flex-col">
          <div className="border-b p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seus agentes
          </div>
          {agentsQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Nenhum agente ainda. Clique em <b className="mx-1">Novo agente</b> para começar.
            </div>
          ) : (
            <ul className="flex-1 divide-y overflow-y-auto">
              {agents.map((a) => (
                <li
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`cursor-pointer p-3 transition hover:bg-muted/50 ${
                    selected?.id === a.id ? "bg-muted/60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        a.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                          {a.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{a.role}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{a.model}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <AgentEditor key={selected.id} agent={selected} onDelete={() => deleteAgent.mutate(selected.id)} />
        ) : (
          <Card className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Selecione ou crie um agente para configurar.
          </Card>
        )}

        {selected ? <TestChatPanel agent={selected} /> : <Card className="hidden lg:block" />}
      </div>
    </div>
  );
}

function AgentEditor({ agent, onDelete }: { agent: Agent; onDelete: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Agent>(agent);

  useEffect(() => setForm(agent), [agent]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ai_agents")
        .update({
          name: form.name,
          role: form.role,
          system_prompt: form.system_prompt,
          model: form.model,
          temperature: form.temperature,
          language: form.language,
          tools: form.tools,
          handoff_rules: form.handoff_rules,
          is_active: form.is_active,
        })
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_agents"] });
      toast.success("Alterações salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newRule, setNewRule] = useState("");

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <div className="min-w-0 flex-1">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border-none bg-transparent p-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
          <Input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Função do agente"
            className="mt-1 border-none bg-transparent p-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="agent-active" className="text-xs">Ativo</Label>
            <Switch
              id="agent-active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Remover agente">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <Section title="Persona e instruções" icon={<Sparkles className="h-4 w-4" />}>
          <Textarea
            rows={7}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="Descreva a personalidade, tom e limites do agente..."
          />
        </Section>

        <Section title="Modelo e criatividade" icon={<Settings2 className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Modelo</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Idioma principal</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                <option value="pt-BR">Português (BR)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Temperatura</span>
              <span className="font-medium">{Number(form.temperature).toFixed(1)}</span>
            </div>
            <Slider
              value={[Number(form.temperature)]}
              onValueChange={(v) => setForm({ ...form, temperature: v[0] })}
              max={1}
              step={0.1}
            />
          </div>
        </Section>

        <Section title="Ferramentas disponíveis" icon={<Zap className="h-4 w-4" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            {AVAILABLE_TOOLS.map((t) => {
              const on = form.tools.includes(t);
              return (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/40"
                >
                  <Switch
                    checked={on}
                    onCheckedChange={(v) =>
                      setForm({
                        ...form,
                        tools: v ? [...form.tools, t] : form.tools.filter((x) => x !== t),
                      })
                    }
                  />
                  <span className="text-sm">{t}</span>
                </label>
              );
            })}
          </div>
        </Section>

        <Section title="Regras de handoff humano" icon={<MessageSquare className="h-4 w-4" />}>
          <div className="grid gap-2">
            {form.handoff_rules.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                <span>{r}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    setForm({ ...form, handoff_rules: form.handoff_rules.filter((_, idx) => idx !== i) })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: paciente menciona autolesão"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newRule.trim()) {
                    setForm({ ...form, handoff_rules: [...form.handoff_rules, newRule.trim()] });
                    setNewRule("");
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!newRule.trim()) return;
                  setForm({ ...form, handoff_rules: [...form.handoff_rules, newRule.trim()] });
                  setNewRule("");
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </Section>
      </div>

      <div className="flex items-center justify-end gap-2 border-t p-3">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </Card>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string };

function TestChatPanel({ agent }: { agent: Agent }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const chat = useServerFn(chatWithAgent);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const next = [...messages, { role: "user" as const, content: text }];
      setMessages(next);
      const res = await chat({ data: { agentId: agent.id, messages: next } });
      setMessages([...next, { role: "assistant" as const, content: res.reply }]);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setMessages((m) => m.slice(0, -1));
    },
  });

  useEffect(() => setMessages([]), [agent.id]);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, send.isPending]);

  const canSend = useMemo(() => input.trim().length > 0 && !send.isPending, [input, send.isPending]);

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <div className="border-b p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="h-4 w-4 text-primary" /> Sandbox — {agent.name}
        </div>
        <p className="text-xs text-muted-foreground">Teste o agente com as instruções salvas.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Envie uma mensagem para conversar com o agente.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {send.isPending && (
          <div className="flex justify-start">
            <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="inline h-3 w-3 animate-spin" /> pensando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-2">
        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem de teste..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canSend) {
              e.preventDefault();
              const t = input.trim();
              setInput("");
              send.mutate(t);
            }
          }}
          className="min-h-0 resize-none"
        />
        <Button
          size="icon"
          disabled={!canSend}
          onClick={() => {
            const t = input.trim();
            setInput("");
            send.mutate(t);
          }}
        >
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
