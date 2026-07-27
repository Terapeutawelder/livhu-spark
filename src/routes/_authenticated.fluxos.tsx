import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Play, Pause, Copy, MoreVertical, Zap, MessageSquare, GitBranch, Clock, Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/fluxos")({
  head: () => ({
    meta: [
      { title: "Fluxos de Automação — LivHub" },
      { name: "description", content: "Editor visual de fluxos de mensagens WhatsApp com gatilhos, condições e IA." },
      { property: "og:title", content: "Fluxos de Automação — LivHub" },
      { property: "og:description", content: "Automatize a jornada do paciente com fluxos visuais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FluxosPage,
});

type Flow = {
  id: string;
  name: string;
  trigger: string;
  status: "ativo" | "pausado" | "rascunho";
  runs: number;
  conversion: number;
  updated: string;
};

const flows: Flow[] = [
  { id: "1", name: "Boas-vindas + Triagem", trigger: "Nova conversa", status: "ativo", runs: 342, conversion: 68, updated: "Hoje" },
  { id: "2", name: "Confirmação de sessão (24h antes)", trigger: "Sessão agendada", status: "ativo", runs: 128, conversion: 94, updated: "Ontem" },
  { id: "3", name: "Reengajamento — 15 dias inativo", trigger: "Inatividade", status: "ativo", runs: 47, conversion: 22, updated: "Há 3d" },
  { id: "4", name: "Pós-alta — feedback e reindicação", trigger: "Estágio: Alta", status: "pausado", runs: 12, conversion: 41, updated: "Há 1 sem" },
  { id: "5", name: "Cobrança amigável", trigger: "Fatura vencida", status: "rascunho", runs: 0, conversion: 0, updated: "Há 2 sem" },
];

const statusStyle = {
  ativo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  pausado: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  rascunho: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};

function FluxosPage() {
  const [selected, setSelected] = useState(flows[0].id);
  const sel = flows.find((f) => f.id === selected)!;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fluxos de Automação</h1>
          <p className="text-sm text-muted-foreground">Automatize mensagens, triagens e follow-ups com gatilhos e IA.</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo fluxo</Button>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[380px_1fr]">
        {/* List */}
        <Card className="flex min-h-0 flex-col">
          <div className="border-b p-3">
            <Input placeholder="Buscar fluxo..." />
          </div>
          <ul className="flex-1 divide-y overflow-y-auto">
            {flows.map((f) => (
              <li
                key={f.id}
                onClick={() => setSelected(f.id)}
                className={`cursor-pointer p-3 transition hover:bg-muted/50 ${selected === f.id ? "bg-muted/60" : ""}`}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{f.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[f.status]}`}>{f.status}</span>
                </div>
                <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" /> {f.trigger}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{f.runs} execuções</span>
                  <span>•</span>
                  <span>{f.conversion}% conversão</span>
                  <span>•</span>
                  <span>{f.updated}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Canvas */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b p-3">
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{sel.name}</h2>
              <p className="text-xs text-muted-foreground">Gatilho: {sel.trigger}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                {sel.status === "ativo" ? <><Pause className="h-3 w-3" /> Pausar</> : <><Play className="h-3 w-3" /> Ativar</>}
              </Button>
              <Button variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="relative flex-1 overflow-auto bg-[radial-gradient(circle,theme(colors.border)_1px,transparent_1px)] [background-size:20px_20px]">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-6">
              <FlowNode icon={<Zap className="h-4 w-4" />} title="Gatilho" subtitle={sel.trigger} kind="trigger" />
              <FlowConnector />
              <FlowNode icon={<MessageSquare className="h-4 w-4" />} title="Enviar mensagem" subtitle="Olá {{nome}}, sou a Liv! 👋" />
              <FlowConnector />
              <FlowNode icon={<Clock className="h-4 w-4" />} title="Aguardar" subtitle="10 minutos" />
              <FlowConnector />
              <FlowNode icon={<Bot className="h-4 w-4" />} title="Agente IA — Triagem" subtitle="Coletar motivo e urgência" kind="ai" />
              <FlowConnector />
              <FlowNode icon={<GitBranch className="h-4 w-4" />} title="Condição" subtitle="Urgência = alta?" kind="condition" />
              <div className="grid w-full grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-medium text-emerald-600">Sim</span>
                  <FlowNode icon={<CheckCircle2 className="h-4 w-4" />} title="Notificar terapeuta" subtitle="Push + e-mail" compact />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Não</span>
                  <FlowNode icon={<MessageSquare className="h-4 w-4" />} title="Oferecer horários" subtitle="Link auto-agendamento" compact />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t bg-muted/30 p-3 text-center text-xs">
            <div><p className="text-muted-foreground">Execuções</p><p className="font-semibold">{sel.runs}</p></div>
            <div><p className="text-muted-foreground">Conversão</p><p className="font-semibold">{sel.conversion}%</p></div>
            <div><p className="text-muted-foreground">Última edição</p><p className="font-semibold">{sel.updated}</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FlowNode({
  icon, title, subtitle, kind = "action", compact,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  kind?: "trigger" | "action" | "ai" | "condition"; compact?: boolean;
}) {
  const styles = {
    trigger: "border-amber-500 bg-amber-50 dark:bg-amber-500/10",
    action: "border-blue-500 bg-blue-50 dark:bg-blue-500/10",
    ai: "border-violet-500 bg-violet-50 dark:bg-violet-500/10",
    condition: "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
  };
  return (
    <div className={`w-full rounded-lg border-l-4 border bg-card p-3 shadow-sm ${styles[kind]} ${compact ? "p-2" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      <p className={`mt-1 ${compact ? "text-xs" : "text-sm"} font-medium`}>{subtitle}</p>
    </div>
  );
}

function FlowConnector() {
  return <div className="h-6 w-0.5 bg-border" />;
}
