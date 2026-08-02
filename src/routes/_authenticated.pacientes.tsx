import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  HeartPulse,
  CalendarDays,
  CalendarClock,
  Loader2,
  Phone,
  Mail,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { MetricCard } from "@/components/metric-card";

export const Route = createFileRoute("/_authenticated/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — LivHub" },
      {
        name: "description",
        content: "Prontuário dos seus pacientes: sessões realizadas, próximos atendimentos e anotações clínicas.",
      },
      { property: "og:title", content: "Pacientes — LivHub" },
      {
        property: "og:description",
        content: "Acompanhe sessões, evolução e anotações clínicas de cada paciente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PacientesPage,
});

type Contact = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  stage_id: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  contact_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  modality: string;
};

type Note = { id: string; body: string; created_at: string };

type Filter = "todos" | "ativos" | "sem-agenda";

const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Realizada",
  canceled: "Cancelada",
  no_show: "Faltou",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PacientesPage() {
  const { data: tenant, isLoading: loadingTenant } = useCurrentTenant();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["contacts", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id,full_name,phone,email,stage_id,created_at")
        .eq("tenant_id", tenant!.id)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["patient-appointments", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,contact_id,title,starts_at,ends_at,status,modality")
        .eq("tenant_id", tenant!.id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });

  const byContact = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      if (!a.contact_id) continue;
      const list = map.get(a.contact_id) ?? [];
      list.push(a);
      map.set(a.contact_id, list);
    }
    return map;
  }, [appointments]);

  const patients = useMemo(() => {
    const now = Date.now();
    return contacts
      .filter((c) => byContact.has(c.id))
      .map((c) => {
        const list = byContact.get(c.id) ?? [];
        const past = list.filter((a) => new Date(a.starts_at).getTime() <= now);
        const upcoming = [...list]
          .filter((a) => new Date(a.starts_at).getTime() > now && a.status !== "canceled")
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        return {
          contact: c,
          sessions: list,
          done: list.filter((a) => a.status === "completed").length,
          last: past[0] ?? null,
          next: upcoming[0] ?? null,
        };
      });
  }, [contacts, byContact]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return patients.filter((p) => {
      if (filter === "ativos" && !p.next) return false;
      if (filter === "sem-agenda" && p.next) return false;
      if (!term) return true;
      return (
        p.contact.full_name.toLowerCase().includes(term) ||
        (p.contact.phone ?? "").toLowerCase().includes(term) ||
        (p.contact.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [patients, q, filter]);

  const monthSessions = useMemo(() => {
    const now = new Date();
    return appointments.filter((a) => {
      const d = new Date(a.starts_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [appointments]);

  const upcomingCount = patients.filter((p) => p.next).length;

  const selected = patients.find((p) => p.contact.id === openId) ?? null;

  const { data: notes = [] } = useQuery({
    enabled: !!openId,
    queryKey: ["contact-notes", openId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_notes")
        .select("id,body,created_at")
        .eq("contact_id", openId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!openId || !tenant?.id) return;
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("contact_notes").insert({
        tenant_id: tenant.id,
        contact_id: openId,
        author_id: userRes.user?.id ?? null,
        body: noteBody.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteBody("");
      qc.invalidateQueries({ queryKey: ["contact-notes", openId] });
      toast.success("Anotação registrada");
    },
    onError: (e: unknown) =>
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : String(e) }),
  });

  if (loadingTenant) {
    return (
      <div className="grid h-[calc(100vh-4rem)] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const loading = loadingContacts || loadingAppts;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
          <header>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
              <HeartPulse className="h-6 w-6 text-primary" /> Pacientes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Contatos que já possuem sessões — acompanhe evolução, próximos atendimentos e anotações.
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={HeartPulse} label="Pacientes" value={patients.length} hint="com sessões registradas" />
            <MetricCard icon={CalendarDays} label="Sessões no mês" value={monthSessions} hint="agenda do mês atual" />
            <MetricCard icon={CalendarClock} label="Com sessão futura" value={upcomingCount} hint="em acompanhamento" />
          </div>


          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar paciente…"
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              {([
                ["todos", "Todos"],
                ["ativos", "Em acompanhamento"],
                ["sem-agenda", "Sem próxima sessão"],
              ] as [Filter, string][]).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Nenhum paciente encontrado. Agende uma sessão para um contato e ele aparecerá aqui.
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((p) => (
                <button
                  key={p.contact.id}
                  onClick={() => setOpenId(p.contact.id)}
                  className="rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(p.contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-foreground">{p.contact.full_name}</p>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {p.done} sessões
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.contact.phone ?? p.contact.email ?? "sem contato"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Última: {p.last ? fmtDate(p.last.starts_at) : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Próxima: {p.next ? fmtDate(p.next.starts_at) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <aside className="hidden w-96 shrink-0 border-l border-border bg-surface lg:block">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials(selected.contact.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-foreground">{selected.contact.full_name}</h2>
                    <p className="text-xs text-muted-foreground">
                      Paciente desde {new Date(selected.contact.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpenId(null)}
                  aria-label="Fechar prontuário"
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {selected.contact.phone ?? "—"}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {selected.contact.email ?? "—"}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Histórico de sessões</h3>
                <div className="space-y-2">
                  {selected.sessions.slice(0, 12).map((a) => (
                    <div key={a.id} className="rounded-md border border-border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm">{a.title}</p>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {statusLabel[a.status] ?? a.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {fmtDateTime(a.starts_at)} • {a.modality}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" /> Anotações clínicas
                </h3>
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={3}
                  placeholder="Evolução, hipóteses, encaminhamentos…"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!noteBody.trim() || noteMutation.isPending}
                    onClick={() => noteMutation.mutate()}
                  >
                    {noteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {notes.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma anotação ainda.</p>
                  )}
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                      <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      )}
    </div>
  );
}
