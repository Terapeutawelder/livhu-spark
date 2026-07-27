import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Filter, Search, MoreVertical, MessageCircle, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/kanban")({
  head: () => ({
    meta: [
      { title: "Jornada do Paciente — LivHub" },
      { name: "description", content: "Kanban visual da jornada: Lead, Triagem, Agendado, Em atendimento e Alta." },
      { property: "og:title", content: "Jornada do Paciente — LivHub" },
      { property: "og:description", content: "Kanban visual da jornada terapêutica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KanbanPage,
});

type Stage = "Lead" | "Triagem" | "Agendado" | "Em atendimento" | "Alta";
type Card = {
  id: string;
  name: string;
  tags: string[];
  value: number;
  lastMsg: string;
  source: string;
};

const stageMeta: Record<Stage, { color: string; dot: string }> = {
  Lead: { color: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  Triagem: { color: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  Agendado: { color: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  "Em atendimento": { color: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  Alta: { color: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
};

const initialData: Record<Stage, Card[]> = {
  Lead: [
    { id: "l1", name: "Marcos Vinícius", tags: ["ansiedade"], value: 0, lastMsg: "Há 6h", source: "Landing" },
    { id: "l2", name: "Fernando Lima", tags: ["autoestima"], value: 0, lastMsg: "Há 2d", source: "Indicação" },
    { id: "l3", name: "Bianca Souza", tags: ["urgente"], value: 0, lastMsg: "Há 20min", source: "Instagram" },
  ],
  Triagem: [
    { id: "t1", name: "Juliana Prado", tags: ["luto"], value: 0, lastMsg: "Há 3h", source: "Google" },
    { id: "t2", name: "Ricardo Barros", tags: ["burnout"], value: 0, lastMsg: "Ontem", source: "Indicação" },
  ],
  Agendado: [
    { id: "a1", name: "Rafael Moreira", tags: ["burnout"], value: 300, lastMsg: "Há 1h", source: "Indicação" },
    { id: "a2", name: "Sofia Ramos", tags: ["ansiedade", "TCC"], value: 300, lastMsg: "Ontem", source: "Instagram" },
  ],
  "Em atendimento": [
    { id: "e1", name: "Ana Beatriz Costa", tags: ["ansiedade", "TCC"], value: 4200, lastMsg: "Há 12min", source: "Instagram" },
    { id: "e2", name: "Camila Nogueira", tags: ["casal"], value: 6600, lastMsg: "Ontem", source: "Indicação" },
    { id: "e3", name: "Diego Martins", tags: ["depressão"], value: 1800, lastMsg: "Há 2d", source: "Google" },
  ],
  Alta: [
    { id: "al1", name: "Pedro Henrique Alves", tags: ["concluído"], value: 9000, lastMsg: "Há 2 sem", source: "Instagram" },
  ],
};

function KanbanPage() {
  const [columns, setColumns] = useState(initialData);
  const [q, setQ] = useState("");
  const [dragging, setDragging] = useState<{ id: string; from: Stage } | null>(null);

  const stages = Object.keys(columns) as Stage[];

  const totals = useMemo(() => {
    return stages.reduce((acc, s) => {
      acc[s] = { count: columns[s].length, value: columns[s].reduce((a, c) => a + c.value, 0) };
      return acc;
    }, {} as Record<Stage, { count: number; value: number }>);
  }, [columns]);

  function moveCard(to: Stage) {
    if (!dragging) return;
    if (dragging.from === to) return setDragging(null);
    setColumns((cur) => {
      const card = cur[dragging.from].find((c) => c.id === dragging.id);
      if (!card) return cur;
      return {
        ...cur,
        [dragging.from]: cur[dragging.from].filter((c) => c.id !== dragging.id),
        [to]: [card, ...cur[to]],
      };
    });
    setDragging(null);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jornada do Paciente</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cards entre as colunas para atualizar o estágio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente..." className="pl-8 w-56" />
          </div>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo card</Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <div
            key={stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => moveCard(stage)}
            className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
          >
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stageMeta[stage].dot}`} />
                <span className={`text-sm font-semibold ${stageMeta[stage].color}`}>{stage}</span>
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">{totals[stage].count}</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
              LTV coluna: R$ {totals[stage].value.toLocaleString("pt-BR")}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {columns[stage]
                .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
                .map((card) => (
                  <Card
                    key={card.id}
                    draggable
                    onDragStart={() => setDragging({ id: card.id, from: stage })}
                    className={`cursor-grab p-3 shadow-sm transition ${dragging?.id === card.id ? "opacity-40" : "hover:shadow-md"}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                            {card.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <p className="truncate text-sm font-medium">{card.name}</p>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {card.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {card.source}</span>
                      <span>{card.lastMsg}</span>
                    </div>
                    {card.value > 0 && (
                      <div className="mt-2 border-t pt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        R$ {card.value.toLocaleString("pt-BR")}
                      </div>
                    )}
                    <div className="mt-2 flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 flex-1 gap-1 text-xs">
                        <MessageCircle className="h-3 w-3" /> Chat
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 flex-1 gap-1 text-xs">
                        <Calendar className="h-3 w-3" /> Agendar
                      </Button>
                    </div>
                  </Card>
                ))}
              {columns[stage].length === 0 && (
                <div className="rounded-md border-2 border-dashed p-6 text-center text-xs text-muted-foreground">
                  Solte cards aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
