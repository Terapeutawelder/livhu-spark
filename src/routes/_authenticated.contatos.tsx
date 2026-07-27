import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Tag as TagIcon,
  FileText,
  MoreVertical,
  ChevronRight,
  Download,
  Users,
  UserPlus,
  Star,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos — LivHub" },
      {
        name: "description",
        content:
          "Base completa de pacientes e leads com tags, jornada, valor gerado e histórico de interações.",
      },
      { property: "og:title", content: "Contatos — LivHub" },
      {
        property: "og:description",
        content:
          "CRM de pacientes: filtros por estágio, tags, valor gerado e ficha detalhada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContatosPage,
});

type Stage =
  | "Lead"
  | "Triagem"
  | "Agendado"
  | "Em atendimento"
  | "Alta"
  | "Inativo";

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  stage: Stage;
  tags: string[];
  source: string;
  lastInteraction: string;
  sessions: number;
  ltv: number;
  createdAt: string;
  notes: string;
  starred?: boolean;
};

const STAGES: Stage[] = [
  "Lead",
  "Triagem",
  "Agendado",
  "Em atendimento",
  "Alta",
  "Inativo",
];

const stageColor: Record<Stage, string> = {
  Lead: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Triagem: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  Agendado:
    "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  "Em atendimento":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Alta: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  Inativo: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const CONTACTS: Contact[] = [
  {
    id: "1",
    name: "Ana Beatriz Costa",
    phone: "+55 11 98765-4321",
    email: "ana.costa@email.com",
    stage: "Em atendimento",
    tags: ["ansiedade", "TCC", "semanal"],
    source: "Instagram Ads",
    lastInteraction: "Há 12 min",
    sessions: 14,
    ltv: 4200,
    createdAt: "12/03/2026",
    notes: "Paciente em processo de TCC. Boa adesão. Próxima sessão terça 15h.",
    starred: true,
  },
  {
    id: "2",
    name: "Rafael Moreira",
    phone: "+55 21 99876-1122",
    email: "rafa.m@email.com",
    stage: "Agendado",
    tags: ["burnout", "empresarial"],
    source: "Indicação",
    lastInteraction: "Há 1 h",
    sessions: 3,
    ltv: 900,
    createdAt: "05/07/2026",
    notes: "Primeira sessão marcada para quinta 19h. Convênio empresarial.",
  },
  {
    id: "3",
    name: "Juliana Prado",
    phone: "+55 31 98123-4567",
    email: "juliana.prado@email.com",
    stage: "Triagem",
    tags: ["luto", "urgente"],
    source: "Google",
    lastInteraction: "Há 3 h",
    sessions: 0,
    ltv: 0,
    createdAt: "24/07/2026",
    notes: "Aguardando retorno da triagem inicial.",
  },
  {
    id: "4",
    name: "Marcos Vinícius",
    phone: "+55 11 91234-5678",
    email: "mvinicius@email.com",
    stage: "Lead",
    tags: ["ansiedade"],
    source: "Landing page",
    lastInteraction: "Há 6 h",
    sessions: 0,
    ltv: 0,
    createdAt: "26/07/2026",
    notes: "Baixou material sobre ansiedade. Não respondeu WhatsApp inicial.",
  },
  {
    id: "5",
    name: "Camila Nogueira",
    phone: "+55 47 99988-7766",
    email: "cah.nog@email.com",
    stage: "Em atendimento",
    tags: ["relacionamento", "casal"],
    source: "Indicação",
    lastInteraction: "Ontem",
    sessions: 22,
    ltv: 6600,
    createdAt: "10/11/2025",
    notes: "Terapia de casal. Sessões quinzenais.",
    starred: true,
  },
  {
    id: "6",
    name: "Pedro Henrique Alves",
    phone: "+55 61 98877-2211",
    email: "phalves@email.com",
    stage: "Alta",
    tags: ["ansiedade", "concluído"],
    source: "Instagram Ads",
    lastInteraction: "Há 2 sem",
    sessions: 30,
    ltv: 9000,
    createdAt: "02/01/2025",
    notes: "Processo concluído com sucesso. Feedback muito positivo.",
  },
  {
    id: "7",
    name: "Larissa Fontes",
    phone: "+55 85 99123-8877",
    email: "lari.fontes@email.com",
    stage: "Inativo",
    tags: ["depressão"],
    source: "Google",
    lastInteraction: "Há 45 dias",
    sessions: 2,
    ltv: 600,
    createdAt: "12/05/2026",
    notes: "Parou de responder após segunda sessão. Reengajar via disparo.",
  },
  {
    id: "8",
    name: "Fernando Lima",
    phone: "+55 11 97788-3344",
    email: "flima@email.com",
    stage: "Lead",
    tags: ["autoestima"],
    source: "Indicação",
    lastInteraction: "Há 2 dias",
    sessions: 0,
    ltv: 0,
    createdAt: "25/07/2026",
    notes: "Indicado por Camila N. Aguardando primeira resposta.",
  },
];

function ContatosPage() {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"Todos" | Stage>("Todos");
  const [selectedId, setSelectedId] = useState<string>(CONTACTS[0].id);
  const [openNew, setOpenNew] = useState(false);

  const filtered = useMemo(() => {
    return CONTACTS.filter((c) => {
      const matchesStage = stageFilter === "Todos" || c.stage === stageFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      return matchesStage && matchesQuery;
    });
  }, [query, stageFilter]);

  const selected =
    CONTACTS.find((c) => c.id === selectedId) ?? filtered[0] ?? CONTACTS[0];

  const totals = useMemo(() => {
    const active = CONTACTS.filter((c) => c.stage === "Em atendimento").length;
    const leads = CONTACTS.filter((c) => c.stage === "Lead").length;
    const ltv = CONTACTS.reduce((s, c) => s + c.ltv, 0);
    return { active, leads, ltv, total: CONTACTS.length };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            Base completa de pacientes e leads com jornada, tags e valor gerado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Novo contato
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo contato</DialogTitle>
                <DialogDescription>
                  Cadastre manualmente um paciente ou lead na sua base.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="n-name">Nome completo</Label>
                  <Input id="n-name" placeholder="Ex.: Ana Beatriz Costa" />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="n-phone">WhatsApp</Label>
                    <Input id="n-phone" placeholder="+55 11 ..." />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="n-email">E-mail</Label>
                    <Input id="n-email" placeholder="email@dominio.com" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="n-tags">Tags (separadas por vírgula)</Label>
                  <Input id="n-tags" placeholder="ansiedade, TCC, semanal" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="n-notes">Notas</Label>
                  <Textarea
                    id="n-notes"
                    rows={3}
                    placeholder="Contexto inicial do paciente..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNew(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setOpenNew(false)}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total de contatos"
          value={totals.total.toString()}
        />
        <StatCard
          icon={<UserPlus className="h-4 w-4" />}
          label="Novos leads"
          value={totals.leads.toString()}
          hint="a converter"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Em atendimento"
          value={totals.active.toString()}
        />
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="LTV acumulado"
          value={`R$ ${totals.ltv.toLocaleString("pt-BR")}`}
        />
      </div>

      {/* Content */}
      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* List */}
        <Card className="flex min-h-0 flex-col">
          <div className="border-b p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome, telefone, e-mail ou tag..."
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="icon" title="Filtros">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <Tabs
              value={stageFilter}
              onValueChange={(v) => setStageFilter(v as typeof stageFilter)}
              className="mt-3"
            >
              <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                {(["Todos", ...STAGES] as const).map((s) => (
                  <TabsTrigger
                    key={s}
                    value={s}
                    className="rounded-full border border-border bg-transparent px-3 py-1 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={stageFilter} className="mt-0" />
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_100px_120px_36px] items-center gap-3 border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <div>Contato</div>
              <div>Tags</div>
              <div>Estágio</div>
              <div>Sessões</div>
              <div>Última interação</div>
              <div />
            </div>
            <ul className="divide-y">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`grid cursor-pointer grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-muted/50 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_100px_120px_36px] md:items-center md:gap-3 ${
                    selected.id === c.id ? "bg-muted/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">
                          {c.name}
                        </p>
                        {c.starred && (
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${stageColor[c.stage]}`}
                    >
                      {c.stage}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.sessions}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.lastInteraction}
                  </div>
                  <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum contato encontrado.
                </li>
              )}
            </ul>
          </ScrollArea>
        </Card>

        {/* Detail panel */}
        <Card className="hidden min-h-0 flex-col lg:flex">
          <div className="flex items-start justify-between gap-3 border-b p-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {initials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{selected.name}</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${stageColor[selected.stage]}`}
                >
                  {selected.stage}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-5 p-4">
              <div className="grid grid-cols-3 gap-2">
                <QuickAction icon={<MessageCircle className="h-4 w-4" />} label="Mensagem" />
                <QuickAction icon={<Calendar className="h-4 w-4" />} label="Agendar" />
                <QuickAction icon={<FileText className="h-4 w-4" />} label="Nota" />
              </div>

              <Section title="Contato">
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label={selected.phone} />
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label={selected.email} />
                <InfoRow
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label={`Cliente desde ${selected.createdAt}`}
                />
              </Section>

              <Separator />

              <Section
                title="Tags"
                action={
                  <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
                    <TagIcon className="h-3 w-3" /> Editar
                  </Button>
                }
              >
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Separator />

              <Section title="Métricas">
                <div className="grid grid-cols-3 gap-2">
                  <MetricPill label="Sessões" value={selected.sessions.toString()} />
                  <MetricPill
                    label="LTV"
                    value={`R$ ${selected.ltv.toLocaleString("pt-BR")}`}
                  />
                  <MetricPill label="Origem" value={selected.source} />
                </div>
              </Section>

              <Separator />

              <Section title="Notas">
                <p className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                  {selected.notes}
                </p>
              </Section>

              <Section title="Histórico recente">
                <ul className="space-y-2 text-sm">
                  <TimelineItem
                    time={selected.lastInteraction}
                    text="Mensagem enviada via WhatsApp"
                  />
                  <TimelineItem time="Há 2 dias" text="Sessão realizada (50 min)" />
                  <TimelineItem time="Há 1 semana" text="Pagamento confirmado" />
                </ul>
              </Section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex h-auto flex-col gap-1 py-2 text-xs"
    >
      {icon}
      {label}
    </Button>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function TimelineItem({ time, text }: { time: string; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <div className="flex-1">
        <p className="text-sm">{text}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </li>
  );
}
