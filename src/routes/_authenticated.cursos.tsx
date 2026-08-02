import { createFileRoute } from "@tanstack/react-router";
import { Plus, PlayCircle, Users, DollarSign, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos e Conteúdos — LivHub" },
      { name: "description", content: "Publique cursos, e-books e trilhas de conteúdo para pacientes e leads." },
      { property: "og:title", content: "Cursos e Conteúdos — LivHub" },
      { property: "og:description", content: "Produtos digitais complementares ao atendimento clínico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CursosPage,
});

const courses = [
  { id: "1", title: "Mindfulness para Ansiedade — 21 dias", modules: 21, students: 128, revenue: 6400, progress: 76, price: "R$ 197", status: "publicado" },
  { id: "2", title: "Sono restaurador: guia prático", modules: 8, students: 84, revenue: 2520, progress: 62, price: "R$ 97", status: "publicado" },
  { id: "3", title: "TCC essencial para pacientes", modules: 12, students: 42, revenue: 3360, progress: 48, price: "R$ 297", status: "publicado" },
  { id: "4", title: "Autoconhecimento — jornada íntima", modules: 15, students: 0, revenue: 0, progress: 30, price: "R$ 247", status: "rascunho" },
];

function CursosPage() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cursos e Conteúdos</h1>
          <p className="text-sm text-muted-foreground">Produtos digitais que complementam sua terapia.</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo curso</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={<BookOpen className="h-4 w-4" />} label="Cursos publicados" value="3" />
        <Stat icon={<Users className="h-4 w-4" />} label="Alunos ativos" value="254" />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Receita cursos (30d)" value="R$ 12.3k" />
        <Stat icon={<PlayCircle className="h-4 w-4" />} label="Conclusão média" value="63%" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
              <BookOpen className="h-10 w-10 text-primary/60" />
              <Badge className="absolute right-2 top-2 text-[10px]" variant={c.status === "publicado" ? "default" : "secondary"}>
                {c.status}
              </Badge>
            </div>
            <div className="p-4">
              <h3 className="mb-1 line-clamp-2 font-semibold">{c.title}</h3>
              <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3" /> {c.modules} módulos</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.students}</span>
              </div>
              {c.status === "publicado" ? (
                <>
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Conclusão média</span>
                      <span className="font-medium">{c.progress}%</span>
                    </div>
                    <Progress value={c.progress} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Preço</p>
                      <p className="font-semibold">{c.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-muted-foreground">Receita</p>
                      <p className="font-semibold text-emerald-600">R$ {c.revenue.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Rascunho — {c.progress}% pronto
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">Editar</Button>
                <Button size="sm" className="flex-1">Ver alunos</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gold/25 bg-surface p-4 shadow-[0_10px_30px_-15px_color-mix(in_oklab,var(--gold)_35%,transparent)] transition hover:border-gold/50">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold">{icon}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

