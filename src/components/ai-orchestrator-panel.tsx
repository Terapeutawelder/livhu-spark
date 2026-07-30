import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, KeyRound, Loader2, Wand2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAiKeyStatus, saveAiKey, removeAiKey, orchestrateAgents } from "@/lib/ai-orchestrator.functions";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", help: "Chave em platform.openai.com → API keys (começa com sk-)" },
  { id: "google", label: "Google Gemini", help: "Chave em aistudio.google.com → Get API key" },
] as const;

const EXAMPLES = [
  "Crie um agente de triagem inicial que colete motivo da busca, urgência e preferência de horário.",
  "Crie um agente de confirmação de sessões que reduza faltas e reagende quando o paciente não puder.",
  "Crie um agente de resgate para pacientes que sumiram há mais de 30 dias.",
];

export function AiOrchestratorPanel() {
  const qc = useQueryClient();
  const status = useServerFn(getAiKeyStatus);
  const save = useServerFn(saveAiKey);
  const remove = useServerFn(removeAiKey);
  const orchestrate = useServerFn(orchestrateAgents);

  const [provider, setProvider] = useState<"openai" | "google">("openai");
  const [apiKey, setApiKey] = useState("");
  const [instruction, setInstruction] = useState("");
  const [count, setCount] = useState(1);
  const [summary, setSummary] = useState<string | null>(null);

  const keyQuery = useQuery({
    queryKey: ["ai_key_status"],
    queryFn: () => status({ data: undefined }),
  });

  const saveKey = useMutation({
    mutationFn: () => save({ data: { provider, apiKey: apiKey.trim() } }),
    onSuccess: () => {
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["ai_key_status"] });
      toast.success("Chave de IA salva com segurança.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeKey = useMutation({
    mutationFn: () => remove({ data: undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_key_status"] });
      toast.success("Chave removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: () => orchestrate({ data: { instruction: instruction.trim(), count } }),
    onSuccess: (res) => {
      setSummary(res.summary);
      setInstruction("");
      qc.invalidateQueries({ queryKey: ["ai_agents"] });
      toast.success(`${res.created.length} agente(s) criado(s) como rascunho.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const configured = keyQuery.data?.configured;
  const canManage = keyQuery.data?.canManage ?? false;

  return (
    <Card className="border-primary/30 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">Super IA Orquestradora</p>
            <p className="text-xs text-muted-foreground">
              Descreva o que precisa e ela projeta e cria novos agentes para você.
            </p>
          </div>
        </div>
        {configured ? (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            {keyQuery.data?.provider === "google" ? "Google Gemini" : "OpenAI"} {keyQuery.data?.hint}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">Sem chave própria</Badge>
        )}
      </div>

      <div className="mb-4 rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" /> Chave de IA do consultório
        </p>

        {!canManage ? (
          <p className="text-xs text-muted-foreground">
            Somente o responsável pelo consultório pode configurar a chave de IA.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="rounded-md border bg-background px-2 py-2 text-sm"
                value={provider}
                onChange={(e) => setProvider(e.target.value as "openai" | "google")}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <Input
                type="password"
                autoComplete="off"
                placeholder={configured ? "Digite para substituir a chave atual" : "Cole sua API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => saveKey.mutate()}
                disabled={apiKey.trim().length < 20 || saveKey.isPending}
              >
                {saveKey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar chave
              </Button>
              {configured && (
                <Button variant="ghost" size="icon" title="Remover chave" onClick={() => removeKey.mutate()}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {PROVIDERS.find((p) => p.id === provider)?.help} — a chave é cifrada e usada apenas no
              servidor; nunca é exibida novamente.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="orchestrator-instruction" className="text-xs">
          Instrução para a Super IA
        </Label>
        <Textarea
          id="orchestrator-instruction"
          rows={3}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <Button
            className="gap-2"
            onClick={() => run.mutate()}
            disabled={instruction.trim().length < 10 || run.isPending}
          >
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Criar agentes com IA
          </Button>
        </div>
      </div>

      {summary && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Plano da Super IA</p>
          {summary}
        </div>
      )}
    </Card>
  );
}
