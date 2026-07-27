import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Plus, Sparkles, MessageSquare, Zap, Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

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

const agents = [
  { id: "1", name: "Liv — Recepção", role: "Boas-vindas e qualificação inicial", model: "GPT-4o", active: true, msgs: 1240, satisfaction: 4.8 },
  { id: "2", name: "Liv — Triagem", role: "Coleta motivo, urgência e histórico", model: "GPT-4o", active: true, msgs: 468, satisfaction: 4.6 },
  { id: "3", name: "Liv — Agendamento", role: "Sugere horários e confirma sessões", model: "GPT-4o mini", active: true, msgs: 892, satisfaction: 4.9 },
  { id: "4", name: "Liv — Cobrança", role: "Lembretes de pagamento amigáveis", model: "GPT-4o mini", active: false, msgs: 87, satisfaction: 4.4 },
];

function AgentesPage() {
  const [selected, setSelected] = useState(agents[0].id);
  const [temp, setTemp] = useState([0.4]);
  const sel = agents.find((a) => a.id === selected)!;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agentes IA</h1>
          <p className="text-sm text-muted-foreground">Configure assistentes especializados para automatizar sua jornada.</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo agente</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Agentes ativos" value="3" hint="de 4 criados" />
        <StatCard label="Mensagens IA (7d)" value="2.687" />
        <StatCard label="Handoff humano" value="8%" hint="dentro da meta" />
        <StatCard label="Satisfação média" value="4.7" hint="⭐" />
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
        <Card className="flex min-h-0 flex-col">
          <div className="border-b p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seus agentes</div>
          <ul className="flex-1 divide-y overflow-y-auto">
            {agents.map((a) => (
              <li key={a.id} onClick={() => setSelected(a.id)}
                className={`cursor-pointer p-3 transition hover:bg-muted/50 ${selected === a.id ? "bg-muted/60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${a.active ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-muted text-muted-foreground"}`}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <Badge variant={a.active ? "default" : "secondary"} className="text-[10px]">{a.active ? "Ativo" : "Pausado"}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{a.role}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{a.model}</span>•<span>{a.msgs} msgs</span>•<span>⭐ {a.satisfaction}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">{sel.name}</h2>
              <p className="text-xs text-muted-foreground">{sel.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="agent-active" className="text-xs">Ativo</Label>
              <Switch id="agent-active" defaultChecked={sel.active} />
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <Section title="Persona e instruções" icon={<Sparkles className="h-4 w-4" />}>
              <Textarea
                rows={6}
                defaultValue={`Você é a Liv, assistente virtual empática de um psicoterapeuta. Fale em tom acolhedor, use linguagem simples e nunca faça diagnóstico. Se perceber sinais de crise, encaminhe imediatamente ao humano.`}
              />
            </Section>

            <Section title="Modelo e criatividade" icon={<Settings2 className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option>GPT-4o</option>
                    <option>GPT-4o mini</option>
                    <option>Claude Sonnet 4</option>
                    <option>Gemini 2.5 Flash</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Idioma principal</Label>
                  <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option>Português (BR)</option>
                    <option>English</option>
                    <option>Español</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Temperatura</span>
                  <span className="font-medium">{temp[0].toFixed(1)}</span>
                </div>
                <Slider value={temp} onValueChange={setTemp} max={1} step={0.1} />
              </div>
            </Section>

            <Section title="Ferramentas" icon={<Zap className="h-4 w-4" />}>
              <div className="grid gap-2 sm:grid-cols-2">
                {["Consultar agenda", "Criar agendamento", "Buscar contato", "Enviar link de pagamento", "Registrar nota clínica", "Escalar para humano"].map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/40">
                    <Switch defaultChecked />
                    <span className="text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Handoff humano" icon={<MessageSquare className="h-4 w-4" />}>
              <div className="grid gap-2">
                {["Palavra-chave: crise, socorro, suicídio", "Sentimento negativo persistente (3 msgs)", "Pedido explícito por humano"].map((r) => (
                  <div key={r} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600" /> {r}
                  </div>
                ))}
                <Input placeholder="+ adicionar regra..." />
              </div>
            </Section>
          </div>

          <div className="flex items-center justify-end gap-2 border-t p-3">
            <Button variant="outline" size="sm">Testar no sandbox</Button>
            <Button size="sm">Salvar alterações</Button>
          </div>
        </Card>
      </div>
    </div>
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
