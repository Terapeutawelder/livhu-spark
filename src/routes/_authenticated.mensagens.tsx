import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Mic,
  Check,
  CheckCheck,
  Bot,
  User as UserIcon,
  Tag,
  Calendar,
  FileText,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/mensagens")({
  head: () => ({
    meta: [
      { title: "Inbox — LivHub" },
      { name: "description", content: "Caixa de entrada do WhatsApp com atendimento humano e agentes de IA." },
      { property: "og:title", content: "Inbox — LivHub" },
      { property: "og:description", content: "Atenda seus pacientes pelo WhatsApp com IA e humanos no LivHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxPage,
});

type Msg = {
  id: string;
  from: "me" | "them" | "bot";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
};

type Conversation = {
  id: string;
  name: string;
  phone: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  channel: "whatsapp";
  stage: "Lead" | "Triagem" | "Agendado" | "Em atendimento" | "Alta";
  assignee: "IA" | "Você";
  tags: string[];
  messages: Msg[];
};

const CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Marina Alves",
    phone: "+55 11 98765-4321",
    initials: "MA",
    lastMessage: "Perfeito, confirmo terça 15h 🙏",
    time: "09:42",
    unread: 2,
    online: true,
    channel: "whatsapp",
    stage: "Agendado",
    assignee: "IA",
    tags: ["Ansiedade", "Adulto"],
    messages: [
      { id: "m1", from: "them", text: "Oi, tudo bem? Vi seu perfil e gostaria de marcar uma primeira sessão.", time: "09:12" },
      { id: "m2", from: "bot", text: "Olá Marina! Sou a assistente da Dra. Ana 🤖 Posso te ajudar com o agendamento. Prefere online ou presencial?", time: "09:13" },
      { id: "m3", from: "them", text: "Online, por favor.", time: "09:15" },
      { id: "m4", from: "bot", text: "Ótimo! Tenho terça-feira 15h ou quinta-feira 10h. Qual funciona melhor?", time: "09:16" },
      { id: "m5", from: "them", text: "Terça 15h fica ótimo.", time: "09:38" },
      { id: "m6", from: "me", text: "Oi Marina! Confirmado terça-feira às 15h. Vou te enviar o link do Google Meet 20 min antes. 💙", time: "09:40", status: "read" },
      { id: "m7", from: "them", text: "Perfeito, confirmo terça 15h 🙏", time: "09:42" },
    ],
  },
  {
    id: "2",
    name: "João Ribeiro",
    phone: "+55 21 99123-4567",
    initials: "JR",
    lastMessage: "Consegue me passar o valor da sessão?",
    time: "09:20",
    unread: 1,
    online: false,
    channel: "whatsapp",
    stage: "Lead",
    assignee: "IA",
    tags: ["Novo lead"],
    messages: [
      { id: "m1", from: "them", text: "Boa tarde, vi um anúncio seu no Instagram.", time: "09:18" },
      { id: "m2", from: "them", text: "Consegue me passar o valor da sessão?", time: "09:20" },
    ],
  },
  {
    id: "3",
    name: "Camila Souza",
    phone: "+55 11 97777-1122",
    initials: "CS",
    lastMessage: "Obrigada pela sessão de hoje 💛",
    time: "Ontem",
    unread: 0,
    online: false,
    channel: "whatsapp",
    stage: "Em atendimento",
    assignee: "Você",
    tags: ["Depressão", "Retorno"],
    messages: [
      { id: "m1", from: "them", text: "Obrigada pela sessão de hoje 💛", time: "18:02" },
      { id: "m2", from: "me", text: "Eu que agradeço, Camila. Nos vemos semana que vem! ✨", time: "18:15", status: "read" },
    ],
  },
  {
    id: "4",
    name: "Rafael Nogueira",
    phone: "+55 11 96543-8899",
    initials: "RN",
    lastMessage: "Posso remarcar para sexta?",
    time: "Ontem",
    unread: 0,
    online: true,
    channel: "whatsapp",
    stage: "Agendado",
    assignee: "Você",
    tags: ["Casal"],
    messages: [
      { id: "m1", from: "them", text: "Posso remarcar para sexta?", time: "16:44" },
    ],
  },
  {
    id: "5",
    name: "Beatriz Lima",
    phone: "+55 31 98811-2020",
    initials: "BL",
    lastMessage: "Vou pensar e te retorno, obrigada!",
    time: "Seg",
    unread: 0,
    online: false,
    channel: "whatsapp",
    stage: "Triagem",
    assignee: "IA",
    tags: ["Adolescente"],
    messages: [
      { id: "m1", from: "them", text: "Vou pensar e te retorno, obrigada!", time: "10:11" },
    ],
  },
  {
    id: "6",
    name: "Pedro Martins",
    phone: "+55 11 95544-7788",
    initials: "PM",
    lastMessage: "Recebi o comprovante, valeu!",
    time: "Seg",
    unread: 0,
    online: false,
    channel: "whatsapp",
    stage: "Alta",
    assignee: "Você",
    tags: ["Alta"],
    messages: [
      { id: "m1", from: "me", text: "Segue o recibo do último mês 📎", time: "14:00", status: "read" },
      { id: "m2", from: "them", text: "Recebi o comprovante, valeu!", time: "14:05" },
    ],
  },
];

const STAGE_COLORS: Record<Conversation["stage"], string> = {
  Lead: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Triagem: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Agendado: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  "Em atendimento": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Alta: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

function InboxPage() {
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "ia" | "voce">("all");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return CONVERSATIONS.filter((c) => {
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === "unread") return c.unread > 0;
      if (filter === "ia") return c.assignee === "IA";
      if (filter === "voce") return c.assignee === "Você";
      return true;
    });
  }, [query, filter]);

  const active = CONVERSATIONS.find((c) => c.id === selectedId) ?? CONVERSATIONS[0];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [selectedId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Conversation list */}
      <aside className="flex w-[340px] shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Inbox</h1>
            <Badge variant="secondary" className="gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              WhatsApp conectado
            </Badge>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar conversas..."
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mt-3">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Tudo</TabsTrigger>
              <TabsTrigger value="unread">Novas</TabsTrigger>
              <TabsTrigger value="ia">IA</TabsTrigger>
              <TabsTrigger value="voce">Você</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex-1">
          <ul>
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition hover:bg-muted/50",
                    c.id === selectedId && "bg-muted",
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/15 text-primary">{c.initials}</AvatarFallback>
                    </Avatar>
                    {c.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {c.assignee === "IA" && <Bot className="h-3 w-3 shrink-0 text-primary" />}
                      <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", STAGE_COLORS[c.stage])}>
                        {c.stage}
                      </span>
                      {c.unread > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada</li>
            )}
          </ul>
        </ScrollArea>
      </aside>

      {/* Thread */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/15 text-primary">{active.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{active.name}</p>
              <p className="text-xs text-muted-foreground">
                {active.online ? "online" : active.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Video className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/30 px-6 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            <div className="mb-2 flex justify-center">
              <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
                Hoje
              </span>
            </div>
            {active.messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-card px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Button variant="ghost" size="icon"><Paperclip className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><Smile className="h-5 w-5" /></Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1"
            />
            <Button variant="outline" size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Sugerir com IA
            </Button>
            {draft.trim() ? (
              <Button size="icon" onClick={() => setDraft("")}><Send className="h-4 w-4" /></Button>
            ) : (
              <Button variant="ghost" size="icon"><Mic className="h-5 w-5" /></Button>
            )}
          </div>
        </div>
      </section>

      {/* Contact panel */}
      <aside className="hidden w-[320px] shrink-0 flex-col border-l border-border bg-card xl:flex">
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center px-5 py-6 text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/15 text-lg text-primary">{active.initials}</AvatarFallback>
            </Avatar>
            <p className="mt-3 text-base font-semibold">{active.name}</p>
            <p className="text-xs text-muted-foreground">{active.phone}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {active.tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{t}</Badge>
              ))}
            </div>
          </div>
          <Separator />
          <PanelSection title="Jornada">
            <div className="space-y-2 text-sm">
              <Row icon={<ChevronRight className="h-4 w-4 text-muted-foreground" />} label="Etapa" value={
                <span className={cn("rounded border px-2 py-0.5 text-xs", STAGE_COLORS[active.stage])}>
                  {active.stage}
                </span>
              } />
              <Row icon={active.assignee === "IA" ? <Bot className="h-4 w-4 text-primary" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />} label="Responsável" value={<span className="text-sm">{active.assignee}</span>} />
            </div>
          </PanelSection>
          <Separator />
          <PanelSection title="Ações rápidas">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2"><Calendar className="h-4 w-4" />Agendar</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2"><FileText className="h-4 w-4" />Nota</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2"><UserIcon className="h-4 w-4" />Assumir</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2"><Tag className="h-4 w-4" />Tag</Button>
            </div>
          </PanelSection>
          <Separator />
          <PanelSection title="Últimas notas">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="rounded-md border border-border bg-background p-2">
                Paciente relatou melhora no sono após 3 sessões. Continuar com CBT.
              </p>
              <p className="rounded-md border border-border bg-background p-2">
                Preferência por horários no fim da tarde.
              </p>
            </div>
          </PanelSection>
        </ScrollArea>
      </aside>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.from === "me") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{msg.text}</p>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
            <span>{msg.time}</span>
            {msg.status === "read" ? <CheckCheck className="h-3 w-3" /> : msg.status === "delivered" ? <CheckCheck className="h-3 w-3 opacity-60" /> : <Check className="h-3 w-3" />}
          </div>
        </div>
      </div>
    );
  }
  if (msg.from === "bot") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm border border-primary/20 bg-primary/5 px-3.5 py-2 text-sm shadow-sm">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-primary">
            <Bot className="h-3 w-3" /> Assistente IA
          </div>
          <p className="whitespace-pre-wrap">{msg.text}</p>
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{msg.time}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-card px-3.5 py-2 text-sm shadow-sm">
        <p className="whitespace-pre-wrap">{msg.text}</p>
        <div className="mt-1 text-right text-[10px] text-muted-foreground">{msg.time}</div>
      </div>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}<span className="text-xs">{label}</span>
      </div>
      {value}
    </div>
  );
}
