import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/agendamento")({
  head: () => ({
    meta: [
      { title: "Agendamento — LivHub" },
      { name: "description", content: "Agenda semanal, disponibilidade e auto-agendamento de sessões." },
      { property: "og:title", content: "Agendamento — LivHub" },
      { property: "og:description", content: "Gestão de agenda e sessões de terapia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendamentoPage,
});

const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

type Session = { day: number; hour: number; duration: number; patient: string; type: "online" | "presencial"; color: string };

const sessions: Session[] = [
  { day: 0, hour: 1, duration: 1, patient: "Ana Beatriz Costa", type: "online", color: "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300" },
  { day: 0, hour: 5, duration: 1, patient: "Camila Nogueira", type: "presencial", color: "bg-violet-500/15 border-violet-500 text-violet-800 dark:text-violet-300" },
  { day: 1, hour: 3, duration: 1, patient: "Diego Martins", type: "online", color: "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300" },
  { day: 2, hour: 2, duration: 1, patient: "Rafael Moreira", type: "online", color: "bg-blue-500/15 border-blue-500 text-blue-800 dark:text-blue-300" },
  { day: 2, hour: 6, duration: 1, patient: "Sofia Ramos", type: "presencial", color: "bg-violet-500/15 border-violet-500 text-violet-800 dark:text-violet-300" },
  { day: 3, hour: 4, duration: 1, patient: "Ana Beatriz Costa", type: "online", color: "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300" },
  { day: 4, hour: 1, duration: 1, patient: "Triagem — Juliana P.", type: "online", color: "bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300" },
  { day: 4, hour: 7, duration: 1, patient: "Camila Nogueira", type: "presencial", color: "bg-violet-500/15 border-violet-500 text-violet-800 dark:text-violet-300" },
];

function AgendamentoPage() {
  const [view, setView] = useState<"semana" | "dia" | "mes">("semana");

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agendamento</h1>
          <p className="text-sm text-muted-foreground">Sua semana — 27 jul a 01 ago 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-none border-x">Hoje</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="dia">Dia</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova sessão</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b bg-muted/30 text-xs font-medium">
            <div className="p-2 text-muted-foreground"></div>
            {days.map((d, i) => (
              <div key={d} className="border-l p-2 text-center">
                <div className="text-muted-foreground">{d}</div>
                <div className="text-base font-semibold">{27 + i > 31 ? i - 4 : 27 + i}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            {hours.map((h, hi) => (
              <div key={h} className="grid grid-cols-[60px_repeat(6,1fr)] border-b last:border-b-0" style={{ minHeight: 52 }}>
                <div className="border-r p-2 text-right text-[11px] text-muted-foreground">{h}</div>
                {days.map((_, di) => {
                  const s = sessions.find((x) => x.day === di && x.hour === hi);
                  return (
                    <div key={di} className="relative border-l">
                      {s && (
                        <div className={`absolute inset-1 rounded-md border-l-2 p-1.5 text-[11px] ${s.color}`}>
                          <div className="truncate font-medium">{s.patient}</div>
                          <div className="mt-0.5 flex items-center gap-1 opacity-80">
                            {s.type === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            <span>50 min</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Hoje</h3>
            <p className="mb-3 text-xs text-muted-foreground">Segunda-feira, 27 de julho</p>
            <ul className="space-y-2">
              {sessions.filter((s) => s.day === 0).map((s, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border p-2">
                  <div className="flex flex-col items-center rounded bg-primary/10 px-2 py-1 text-primary">
                    <span className="text-xs font-semibold">{hours[s.hour]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.patient}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {s.type === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {s.type === "online" ? "Sessão online" : "Presencial"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Disponibilidade</h3>
            <div className="space-y-2 text-xs">
              <Row label="Sessões esta semana" value="8" />
              <Row label="Slots disponíveis" value="14" />
              <Row label="Taxa de ocupação" value="57%" />
              <Row label="Cancelamentos" value="1" />
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full">Configurar horários</Button>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold">Link de auto-agendamento</h3>
            <p className="mb-3 text-xs text-muted-foreground">Pacientes escolhem horário livre.</p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <code className="truncate">livhub.app/dr-liv</code>
              <Badge variant="secondary" className="text-[10px]">Ativo</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
