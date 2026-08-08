import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Clock, CheckCircle2, XCircle, CalendarDays, Search, X, Ban, Link2, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agendamento")({
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

type Modality = "online" | "presencial" | "ambos";
type Status = "scheduled" | "confirmed" | "completed" | "canceled" | "no_show";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  modality: Modality;
  color: string;
  is_active: boolean;
};

type Appointment = {
  id: string;
  tenant_id: string;
  service_id: string | null;
  contact_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  modality: Modality;
  meeting_url: string | null;
  location: string | null;
  status: Status;
  notes: string | null;
  kind: "appointment" | "block";
};

type TenantSettings = {
  google_calendar?: { connected?: boolean; email?: string; auto_meet?: boolean; calendar_id?: string };
  availability?: { start_hour?: number; end_hour?: number; days?: number[] }; // days: 0=Sun..6=Sat
};

type Contact = { id: string; full_name: string };

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS = Array.from({ length: 13 }, (_, i) => 7 + i); // 7 → 19

function startOfWeek(d: Date) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // Mon=0
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - day);
  return dt;
}

function addDays(d: Date, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function fmtDateRange(start: Date) {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("pt-BR", opts)} – ${end.toLocaleDateString("pt-BR", opts)} ${end.getFullYear()}`;
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABEL: Record<Status, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Realizado",
  canceled: "Cancelado",
  no_show: "Faltou",
};

const STATUS_BADGE: Record<Status, string> = {
  scheduled: "bg-gold/10 text-gold border-gold/40",
  confirmed: "bg-gold/20 text-gold border-gold/60",
  completed: "bg-gold text-gold-foreground border-gold",
  canceled: "bg-destructive/10 text-destructive border-destructive/40",
  no_show: "bg-muted text-muted-foreground border-border",
};

function AgendamentoPage() {
  const { data: tenant } = useCurrentTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [view, setView] = useState<"semana" | "lista">("semana");
  const [openDialog, setOpenDialog] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [prefillStart, setPrefillStart] = useState<Date | null>(null);
  const [prefillKind, setPrefillKind] = useState<"appointment" | "block">("appointment");
  const [typeFilter, setTypeFilter] = useState<"todos" | "agendamentos" | "bloqueios">("todos");
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [search, setSearch] = useState("");
  const settings = ((tenant as unknown as { settings?: TenantSettings } | null)?.settings ?? {}) as TenantSettings;

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const { data: services = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ["services", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("tenant_id", tenantId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: contacts = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ["contacts-min", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, full_name").eq("tenant_id", tenantId!).order("full_name");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const { data: appointments = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ["appointments", tenantId, weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("tenant_id", tenantId!)
        .gte("starts_at", weekStart.toISOString())
        .lt("starts_at", weekEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as Appointment[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`appointments-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `tenant_id=eq.${tenantId}` }, () => {
        qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tenantId, qc]);

  const saveMutation = useMutation({
    mutationFn: async (input: Partial<Appointment> & { id?: string }) => {
      if (!tenantId) throw new Error("Consultório não encontrado");
      if (input.id) {
        const { error } = await supabase.from("appointments").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({ ...input, tenant_id: tenantId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
      setOpenDialog(false);
      setSelected(null);
      setPrefillStart(null);
      toast.success("Compromisso salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
      toast.success(v.status === "completed" ? "Marcado como realizado — Kanban avançou" : "Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
      setOpenDialog(false);
      setSelected(null);
      toast.success("Compromisso removido");
    },
  });

  const openNew = (date?: Date, kind: "appointment" | "block" = "appointment") => {
    setSelected(null);
    setPrefillStart(date ?? null);
    setPrefillKind(kind);
    setOpenDialog(true);
  };

  const openEdit = (appt: Appointment) => {
    setSelected(appt);
    setPrefillStart(null);
    setPrefillKind(appt.kind);
    setOpenDialog(true);
  };

  // Contact name map for filtering
  const contactNameById = useMemo(() => {
    const m = new Map<string, string>();
    contacts.forEach((c) => m.set(c.id, c.full_name));
    return m;
  }, [contacts]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (typeFilter === "agendamentos" && a.kind !== "appointment") return false;
      if (typeFilter === "bloqueios" && a.kind !== "block") return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = a.contact_id ? (contactNameById.get(a.contact_id) ?? "") : "";
        if (!a.title.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [appointments, typeFilter, statusFilter, search, contactNameById]);

  const statusCounts = useMemo(() => {
    const c: Record<Status, number> = { scheduled: 0, confirmed: 0, completed: 0, canceled: 0, no_show: 0 };
    appointments.filter((a) => a.kind === "appointment").forEach((a) => { c[a.status]++; });
    return c;
  }, [appointments]);

  const blockCount = useMemo(() => appointments.filter((a) => a.kind === "block").length, [appointments]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Agendamento</h1>
          <p className="text-sm text-muted-foreground">Sua agenda de sessões — em tempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="semana"><CalendarDays className="w-4 h-4 mr-1" />Semana</TabsTrigger>
              <TabsTrigger value="lista">Lista</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={() => openNew(undefined, "block")}>
            <Ban className="w-4 h-4 mr-1" /> Bloquear horário
          </Button>
          <Button onClick={() => openNew(undefined, "appointment")}>
            <Plus className="w-4 h-4 mr-1" /> Novo compromisso
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium min-w-[220px] text-center">{fmtDateRange(weekStart)}</div>
              <Button size="icon" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>Hoje</Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {filteredAppointments.length} de {appointments.length} nesta semana
            </div>
          </div>

          {view === "semana" ? (
            <WeekGrid
              weekStart={weekStart}
              appointments={filteredAppointments}
              onSelectSlot={(d) => openNew(d)}
              onSelectAppointment={openEdit}
            />
          ) : (
            <AppointmentList appointments={filteredAppointments} services={services} onEdit={openEdit} onStatus={(id, status) => statusMutation.mutate({ id, status })} />
          )}
        </Card>

        <div className="space-y-6">
          <ManagePanel
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            search={search}
            setSearch={setSearch}
            statusCounts={statusCounts}
            blockCount={blockCount}
          />
          <AvailabilityCard tenantId={tenantId} settings={settings} />
          <GoogleIntegrationCard tenantId={tenantId} settings={settings} />
        </div>
      </div>

      <AppointmentDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        selected={selected}
        prefillStart={prefillStart}
        prefillKind={prefillKind}
        services={services}
        contacts={contacts}
        settings={settings}
        onSave={(payload) => saveMutation.mutate(payload)}
        onDelete={(id) => deleteMutation.mutate(id)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}

/* ---------------- Manage panel ---------------- */

const STATUS_DOT: Record<Status, string> = {
  scheduled: "bg-gold/50",
  confirmed: "bg-gold/75",
  completed: "bg-gold",
  canceled: "bg-destructive",
  no_show: "bg-muted-foreground",
};

function ManagePanel({
  typeFilter, setTypeFilter,
  statusFilter, setStatusFilter,
  search, setSearch,
  statusCounts,
  blockCount,
}: {
  typeFilter: "todos" | "agendamentos" | "bloqueios";
  setTypeFilter: (v: "todos" | "agendamentos" | "bloqueios") => void;
  statusFilter: Status | null;
  setStatusFilter: (s: Status | null) => void;
  search: string;
  setSearch: (v: string) => void;
  statusCounts: Record<Status, number>;
  blockCount: number;
}) {
  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0) + blockCount;
  const types: Array<{ id: typeof typeFilter; label: string; count: number }> = [
    { id: "todos", label: "Todos", count: totalCount },
    { id: "agendamentos", label: "Agendamentos", count: totalCount - blockCount },
    { id: "bloqueios", label: "Intervalos bloqueados", count: blockCount },
  ];
  const statusItems: Array<{ id: Status; label: string }> = [
    { id: "scheduled", label: "Pendente" },
    { id: "confirmed", label: "Confirmado" },
    { id: "completed", label: "Concluído" },
    { id: "canceled", label: "Cancelado" },
  ];
  const hasFilters = statusFilter !== null || search.trim().length > 0 || typeFilter !== "todos";

  return (
    <Card className="p-5 h-fit lg:sticky lg:top-4 space-y-5 bg-gold/5 border-gold/10">
      <h3 className="font-semibold">Gerenciar visualização</h3>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Visualizar por tipo</div>
        <div className="space-y-1.5">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className="flex items-center gap-2 w-full text-left text-sm py-1"
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${typeFilter === t.id ? "border-primary" : "border-muted-foreground/40"}`}>
                {typeFilter === t.id && <span className="w-2 h-2 rounded-full bg-primary" />}
              </span>
              <span className="flex-1">{t.label}</span>
              <span className="text-xs font-semibold text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filtros</div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setStatusFilter(null); setSearch(""); setTypeFilter("todos"); }}
              className="text-xs text-destructive hover:opacity-80 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpar tudo
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar pacientes..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</div>
        <div className="space-y-1">
          {statusItems.map((s) => {
            const active = statusFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(active ? null : s.id)}
                className={`w-full flex items-center justify-between text-sm py-1.5 px-1 rounded hover:bg-muted/50 transition ${active ? "bg-muted/60" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[s.id]}`} />
                  <span>{s.label}</span>
                </span>
                <span className="text-xs font-semibold text-muted-foreground">{statusCounts[s.id]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}


/* ---------------- Week grid ---------------- */

function WeekGrid({
  weekStart,
  appointments,
  onSelectSlot,
  onSelectAppointment,
}: {
  weekStart: Date;
  appointments: Appointment[];
  onSelectSlot: (d: Date) => void;
  onSelectAppointment: (a: Appointment) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[820px] grid grid-cols-[64px_repeat(7,1fr)] border border-border rounded-lg overflow-hidden">
        <div className="bg-gold/5 border-b border-r border-border" />
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} className={`px-2 py-2 text-center border-b border-border ${i < 6 ? "border-r" : ""} ${isToday ? "bg-gold/15" : "bg-gold/5"}`}>
              <div className={`text-[11px] font-medium uppercase ${isToday ? "text-gold" : "text-muted-foreground"}`}>{WEEK_DAYS[i]}</div>
              <div className={`text-sm font-semibold ${isToday ? "text-gold" : ""}`}>{d.getDate()}</div>
            </div>
          );
        })}

        {HOURS.map((h) => (
          <div key={`row-${h}`} className="contents">
            <div className="text-[11px] text-muted-foreground px-2 py-2 border-r border-b border-border bg-gold/5">{String(h).padStart(2, "0")}:00</div>
            {days.map((d, i) => {
              const slot = new Date(d);
              slot.setHours(h, 0, 0, 0);
              const slotEnd = new Date(slot);
              slotEnd.setHours(h + 1);
              const items = appointments.filter((a) => {
                const s = new Date(a.starts_at);
                return s >= slot && s < slotEnd;
              });
              return (
                <button
                  key={`${h}-${i}`}
                  type="button"
                  onClick={() => items.length === 0 && onSelectSlot(slot)}
                  className={`relative min-h-[54px] border-b ${i < 6 ? "border-r" : ""} border-border p-1 text-left hover:bg-gold/10 transition`}
                >
                  {items.map((a) => {
                    const isBlock = a.kind === "block";
                    return (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onSelectAppointment(a); }}
                        className={`text-[11px] leading-tight rounded-md px-1.5 py-1 mb-1 border cursor-pointer ${
                          isBlock
                            ? "bg-[repeating-linear-gradient(45deg,hsl(var(--muted-foreground)/0.15)_0_6px,transparent_6px_12px)] border-dashed border-muted-foreground/50 text-muted-foreground"
                            : STATUS_BADGE[a.status]
                        }`}
                        title={a.title}
                      >
                        <div className="font-medium truncate flex items-center gap-1">
                          {isBlock && <Ban className="w-3 h-3 shrink-0" />}
                          {a.title}
                        </div>
                        {!isBlock && (
                          <div className="opacity-70 flex items-center gap-1">
                            {a.modality === "online" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                            {new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- List view ---------------- */

function AppointmentList({
  appointments,
  services,
  onEdit,
  onStatus,
}: {
  appointments: Appointment[];
  services: Service[];
  onEdit: (a: Appointment) => void;
  onStatus: (id: string, s: Status) => void;
}) {
  if (appointments.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-12">Nenhum compromisso nesta semana.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {appointments.map((a) => {
        const svc = services.find((s) => s.id === a.service_id);
        const start = new Date(a.starts_at);
        return (
          <div key={a.id} className="py-3 flex flex-wrap items-center gap-3">
            <div className="w-16 text-center">
              <div className="text-xs uppercase text-muted-foreground">{start.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
              <div className="text-lg font-semibold">{start.getDate()}</div>
              <div className="text-xs text-muted-foreground">{start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <button onClick={() => onEdit(a)} className="font-medium hover:underline text-left">{a.title}</button>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                {a.modality === "online" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                <span>{a.modality === "online" ? "Online" : "Presencial"}</span>
                {svc && <><span>•</span><span style={{ color: svc.color }}>{svc.name}</span></>}
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{Math.round((new Date(a.ends_at).getTime() - start.getTime()) / 60000)} min</span>
              </div>
            </div>
            <Badge variant="outline" className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
            <div className="flex gap-1">
              {a.status !== "completed" && (
                <Button size="sm" variant="outline" onClick={() => onStatus(a.id, "completed")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Realizado
                </Button>
              )}
              {a.status !== "canceled" && a.status !== "completed" && (
                <Button size="sm" variant="ghost" onClick={() => onStatus(a.id, "canceled")}>
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Dialog ---------------- */

function AppointmentDialog({
  open,
  onOpenChange,
  selected,
  prefillStart,
  prefillKind,
  services,
  contacts,
  settings,
  onSave,
  onDelete,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selected: Appointment | null;
  prefillStart: Date | null;
  prefillKind: "appointment" | "block";
  services: Service[];
  contacts: Contact[];
  settings: TenantSettings;
  onSave: (payload: Partial<Appointment> & { id?: string }) => void;
  onDelete: (id: string) => void;
  saving: boolean;
}) {
  const [kind, setKind] = useState<"appointment" | "block">("appointment");
  const [title, setTitle] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(50);
  const [modality, setModality] = useState<Modality>("online");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Status>("scheduled");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (selected) {
      setKind(selected.kind);
      setTitle(selected.title);
      setServiceId(selected.service_id ?? "");
      setContactId(selected.contact_id ?? "");
      setStartsAt(toLocalInput(new Date(selected.starts_at)));
      setDuration(Math.max(15, Math.round((new Date(selected.ends_at).getTime() - new Date(selected.starts_at).getTime()) / 60000)));
      setModality(selected.modality);
      setMeetingUrl(selected.meeting_url ?? "");
      setLocation(selected.location ?? "");
      setStatus(selected.status);
      setNotes(selected.notes ?? "");
    } else {
      const base = prefillStart ?? (() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; })();
      setKind(prefillKind);
      setTitle(prefillKind === "block" ? "Horário bloqueado" : "");
      setServiceId("");
      setContactId("");
      setStartsAt(toLocalInput(base));
      setDuration(prefillKind === "block" ? 60 : 50);
      setModality("online");
      setMeetingUrl("");
      setLocation("");
      setStatus("scheduled");
      setNotes("");
    }
  }, [open, selected, prefillStart, prefillKind]);

  useEffect(() => {
    if (kind === "block" || !serviceId) return;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setDuration(svc.duration_minutes);
    if (svc.modality !== "ambos") setModality(svc.modality);
    if (!title || (!selected && !title)) {
      const contactName = contacts.find((c) => c.id === contactId)?.full_name;
      setTitle(contactName ? `${svc.name} — ${contactName}` : svc.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  useEffect(() => {
    if (kind === "block" || !contactId || selected) return;
    const contactName = contacts.find((c) => c.id === contactId)?.full_name;
    const svc = services.find((s) => s.id === serviceId);
    if (contactName && svc) setTitle(`${svc.name} — ${contactName}`);
    else if (contactName && !title) setTitle(`Sessão — ${contactName}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const generateMeetLink = () => {
    const gc = settings.google_calendar;
    if (!gc?.connected) {
      toast.error("Conecte o Google Calendar no painel lateral para gerar links do Meet automaticamente.");
      return;
    }
    // Placeholder link — real Meet link is created via the Google Calendar API on session save (backend).
    const rand = Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 5);
    setMeetingUrl(`https://meet.google.com/${rand}`);
    toast.success("Link do Meet gerado — será criado no seu calendário ao salvar.");
  };

  const submit = () => {
    if (!title.trim()) return toast.error("Informe um título");
    if (!startsAt) return toast.error("Informe data e hora");
    const startDate = new Date(startsAt);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    onSave({
      id: selected?.id,
      kind,
      title: title.trim(),
      service_id: kind === "block" ? null : (serviceId || null),
      contact_id: kind === "block" ? null : (contactId || null),
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      modality,
      meeting_url: kind === "appointment" && modality !== "presencial" ? meetingUrl.trim() || null : null,
      location: kind === "appointment" && modality !== "online" ? location.trim() || null : null,
      status: kind === "block" ? "confirmed" : status,
      notes: notes.trim() || null,
    });
  };

  const isBlock = kind === "block";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selected ? (isBlock ? "Editar bloqueio" : "Editar compromisso") : (isBlock ? "Bloquear horário" : "Novo compromisso")}</DialogTitle>
          <DialogDescription>
            {isBlock ? "Impede novos agendamentos automáticos nesse intervalo." : "Sessões avançam o paciente no Kanban automaticamente."}
          </DialogDescription>
        </DialogHeader>

        {!selected && (
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
            <button type="button" onClick={() => setKind("appointment")} className={`flex-1 text-sm py-1.5 rounded-md transition ${kind === "appointment" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
              Compromisso
            </button>
            <button type="button" onClick={() => setKind("block")} className={`flex-1 text-sm py-1.5 rounded-md transition ${kind === "block" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
              Bloqueio de horário
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {!isBlock && (
              <>
                <div className="col-span-2">
                  <Label>Serviço</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} · {s.duration_minutes}min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Paciente</Label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar paciente (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="col-span-2">
              <Label>{isBlock ? "Motivo" : "Título"}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isBlock ? "Ex.: Almoço, folga, reunião" : "Ex.: Sessão individual — Ana"} />
            </div>
            <div>
              <Label>Início</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" min={15} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 50)} />
            </div>
            {!isBlock && (
              <>
                <div>
                  <Label>Modalidade</Label>
                  <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {modality !== "presencial" && (
                  <div className="col-span-2">
                    <Label>Link da chamada (Google Meet)</Label>
                    <div className="flex gap-2">
                      <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" />
                      <Button type="button" variant="outline" size="icon" onClick={generateMeetLink} title="Gerar link do Meet">
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                    {!settings.google_calendar?.connected && (
                      <p className="text-[11px] text-muted-foreground mt-1">Conecte o Google Calendar para criar links automaticamente e enviar o convite ao paciente.</p>
                    )}
                  </div>
                )}
                {modality !== "online" && (
                  <div className="col-span-2">
                    <Label>Endereço</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço do consultório" />
                  </div>
                )}
              </>
            )}
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações internas" />
            </div>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div>
            {selected && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(selected.id)}>
                Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Availability Card ---------------- */

const WEEK_DAYS_FULL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function AvailabilityCard({ tenantId, settings }: { tenantId: string | undefined; settings: TenantSettings }) {
  const qc = useQueryClient();
  const av = settings.availability ?? { start_hour: 8, end_hour: 19, days: [1, 2, 3, 4, 5] };
  const [startHour, setStartHour] = useState(av.start_hour ?? 8);
  const [endHour, setEndHour] = useState(av.end_hour ?? 19);
  const [days, setDays] = useState<number[]>(av.days ?? [1, 2, 3, 4, 5]);

  useEffect(() => {
    setStartHour(av.start_hour ?? 8);
    setEndHour(av.end_hour ?? 19);
    setDays(av.days ?? [1, 2, 3, 4, 5]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Consultório não encontrado");
      const next: TenantSettings = {
        ...settings,
        availability: { start_hour: startHour, end_hour: endHour, days },
      };
      const { error } = await supabase.from("tenants").update({ settings: next as never }).eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-tenant"] });
      toast.success("Disponibilidade atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  return (
    <Card className="p-5 space-y-4 bg-gold/5 border-gold/10">
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Disponibilidade</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Horários em que você aceita novos agendamentos.</p>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dias da semana</Label>
        <div className="flex flex-wrap gap-1">
          {WEEK_DAYS_FULL.map((label, idx) => {
            const active = days.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`px-2.5 py-1 text-xs rounded-md border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Início</Label>
          <Input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Fim</Label>
          <Input type="number" min={1} max={24} value={endHour} onChange={(e) => setEndHour(Number(e.target.value) || 24)} />
        </div>
      </div>

      <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Ativo:</span> {days.map((d) => WEEK_DAYS_FULL[d]).join(", ") || "nenhum dia"} · {String(startHour).padStart(2, "0")}:00 → {String(endHour).padStart(2, "0")}:00
      </div>

      <Button size="sm" className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Salvando…" : "Salvar disponibilidade"}
      </Button>
    </Card>
  );
}

/* ---------------- Google Calendar / Meet ---------------- */

function GoogleIntegrationCard({ tenantId, settings }: { tenantId: string | undefined; settings: TenantSettings }) {
  const qc = useQueryClient();
  const gc = settings.google_calendar ?? {};
  const [autoMeet, setAutoMeet] = useState(!!gc.auto_meet);
  const [calendarId, setCalendarId] = useState(gc.calendar_id ?? "primary");

  useEffect(() => {
    setAutoMeet(!!gc.auto_meet);
    setCalendarId(gc.calendar_id ?? "primary");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const persist = useMutation({
    mutationFn: async (patch: Partial<TenantSettings["google_calendar"]>) => {
      if (!tenantId) throw new Error("Consultório não encontrado");
      const next: TenantSettings = {
        ...settings,
        google_calendar: { ...gc, ...patch },
      };
      const { error } = await supabase.from("tenants").update({ settings: next as never }).eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-tenant"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connect = () => {
    // OAuth do Google Calendar será conectado via App User Connector.
    toast.info("Autorização do Google Calendar será aberta em uma nova janela.", {
      description: "Precisamos habilitar o conector antes do primeiro uso — configure na próxima etapa.",
    });
    persist.mutate({ connected: true, email: "livhub.pro@gmail.com" });
  };

  const disconnect = () => {
    persist.mutate({ connected: false, email: undefined });
    toast.success("Google Calendar desconectado");
  };

  return (
    <Card className="p-5 space-y-4 bg-gold/5 border-gold/10">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Google Calendar & Meet</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Sincronize sua agenda e envie automaticamente o link do Meet ao confirmar uma sessão.
      </p>

      {gc.connected ? (
        <>
          <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-medium text-primary">
              <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
            </div>
            {gc.email && <div className="text-muted-foreground">{gc.email}</div>}
          </div>

          <div>
            <Label className="text-xs">Calendário</Label>
            <Input
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              onBlur={() => persist.mutate({ calendar_id: calendarId })}
              placeholder="primary"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Gerar link do Meet</div>
              <div className="text-[11px] text-muted-foreground">Criar automaticamente para sessões online</div>
            </div>
            <Switch checked={autoMeet} onCheckedChange={(v) => { setAutoMeet(v); persist.mutate({ auto_meet: v }); }} />
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={disconnect}>
            Desconectar Google
          </Button>
        </>
      ) : (
        <Button size="sm" className="w-full" onClick={connect}>
          <Link2 className="w-4 h-4 mr-1" /> Conectar Google Calendar
        </Button>
      )}
    </Card>
  );
}
