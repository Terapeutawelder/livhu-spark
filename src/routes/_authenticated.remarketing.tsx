import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target, TrendingUp, RefreshCw, Users, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/remarketing")({
  head: () => ({
    meta: [
      { title: "Remarketing — LivHub" },
      { name: "description", content: "Reengaje leads frios e pacientes inativos com sequências automáticas." },
      { property: "og:title", content: "Remarketing — LivHub" },
      { property: "og:description", content: "Sequências de reengajamento e recuperação de leads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemarketingPage,
});

const audiences = [
  { id: "1", name: "Leads não convertidos (14d+)", size: 87, running: true, converted: 12, reached: 62 },
  { id: "2", name: "Pacientes inativos (30d+)", size: 34, running: true, converted: 6, reached: 28 },
  { id: "3", name: "Sessão faltada — sem retorno", size: 9, running: false, converted: 0, reached: 0 },
  { id: "4", name: "Alta há 90d — reengajar", size: 22, running: true, converted: 4, reached: 18 },
];

function RemarketingPage() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Remarketing</h1>
          <p className="text-sm text-muted-foreground">Recupere leads e pacientes com sequências inteligentes.</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova sequência</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={<Users className="h-4 w-4" />} label="Público total" value="152" />
        <Stat icon={<RefreshCw className="h-4 w-4" />} label="Reengajados (30d)" value="108" />
        <Stat icon={<Target className="h-4 w-4" />} label="Convertidos" value="22" hint="14% conversão" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Receita recuperada" value="R$ 8.4k" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {audiences.map((a) => {
          const reach = a.size ? Math.round((a.reached / a.size) * 100) : 0;
          const conv = a.reached ? Math.round((a.converted / a.reached) * 100) : 0;
          return (
            <Card key={a.id} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{a.name}</h3>
                    <Badge variant={a.running ? "default" : "secondary"} className="text-[10px]">
                      {a.running ? "Ativa" : "Pausada"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.size} contatos no público</p>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  {a.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-muted-foreground">Alcançados</span>
                    <span className="font-medium">{a.reached}/{a.size} ({reach}%)</span>
                  </div>
                  <Progress value={reach} className="h-1.5" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-muted-foreground">Conversão</span>
                    <span className="font-medium">{a.converted} ({conv}%)</span>
                  </div>
                  <Progress value={conv} className="h-1.5" />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                <Badge variant="outline" className="text-[10px]">Dia 1: mensagem inicial</Badge>
                <Badge variant="outline" className="text-[10px]">Dia 3: oferta</Badge>
                <Badge variant="outline" className="text-[10px]">Dia 7: prova social</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
