import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send, Users, CheckCircle2, XCircle, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/disparos")({
  head: () => ({
    meta: [
      { title: "Disparos — LivHub" },
      { name: "description", content: "Envie mensagens em massa segmentadas via WhatsApp com templates aprovados." },
      { property: "og:title", content: "Disparos — LivHub" },
      { property: "og:description", content: "Campanhas de disparo em massa via WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DisparosPage,
});

const campaigns = [
  { id: "1", name: "Novo horário — quintas à noite", status: "enviado", sent: 240, delivered: 232, read: 198, replied: 34, date: "Ontem, 18h", template: "novo_horario_v2" },
  { id: "2", name: "Convite retorno pós-alta", status: "enviando", sent: 62, delivered: 58, read: 21, replied: 4, date: "Agora", template: "retorno_alta" },
  { id: "3", name: "Grupo de mindfulness — inscrições", status: "agendado", sent: 0, delivered: 0, read: 0, replied: 0, date: "30/07, 09h", template: "grupo_mindfulness" },
  { id: "4", name: "Boas festas 2025", status: "enviado", sent: 412, delivered: 401, read: 380, replied: 89, date: "24/12/2025", template: "boas_festas" },
];

const statusStyle: Record<string, string> = {
  enviado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  enviando: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  agendado: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  rascunho: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};

function DisparosPage() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Disparos</h1>
          <p className="text-sm text-muted-foreground">Campanhas em massa via WhatsApp com templates aprovados.</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova campanha</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={<Send className="h-4 w-4" />} label="Enviadas (30d)" value="1.842" />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Taxa de entrega" value="96%" />
        <Stat icon={<Eye className="h-4 w-4" />} label="Taxa de leitura" value="82%" />
        <Stat icon={<Users className="h-4 w-4" />} label="Taxa de resposta" value="18%" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Campanhas
        </div>
        <div className="divide-y">
          {campaigns.map((c) => {
            const deliv = c.sent ? Math.round((c.delivered / c.sent) * 100) : 0;
            const read = c.sent ? Math.round((c.read / c.sent) * 100) : 0;
            return (
              <div key={c.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_140px] md:items-center">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[c.status]}`}>{c.status}</span>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {c.date} • template <code className="rounded bg-muted px-1">{c.template}</code>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Entregue {c.delivered}/{c.sent}</span>
                    <span className="font-medium">{deliv}%</span>
                  </div>
                  <Progress value={deliv} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Lido {c.read} • Respondido {c.replied}</span>
                    <span className="font-medium">{read}% leitura</span>
                  </div>
                  <Progress value={read} className="h-1.5" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm">Detalhes</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <XCircle className="h-4 w-4 text-amber-500" /> Boas práticas WhatsApp Business
        </h3>
        <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
          <li>• Use apenas templates aprovados pela Meta para envios fora da janela de 24h.</li>
          <li>• Segmente por consentimento (opt-in) — respeite a LGPD.</li>
          <li>• Personalize com {"{{nome}}"} para aumentar leitura e resposta.</li>
          <li>• Espalhe envios em lotes para preservar a qualidade do número.</li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
