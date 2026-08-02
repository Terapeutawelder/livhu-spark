import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Ban, Trash2, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/horarios")({
  head: () => ({
    meta: [
      { title: "Horários — LivHub" },
      {
        name: "description",
        content:
          "Configure os dias e horários em que você atende, e bloqueie períodos indisponíveis na sua agenda.",
      },
      { property: "og:title", content: "Horários — LivHub" },
      {
        property: "og:description",
        content: "Disponibilidade de atendimento e bloqueios de agenda do consultório.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Horários — LivHub" },
      { name: "twitter:description", content: "Disponibilidade e bloqueios de agenda." },
    ],
  }),
  component: HorariosPage,
});

type Availability = { start_hour?: number; end_hour?: number; days?: number[] };
type TenantSettings = { availability?: Availability } & Record<string, unknown>;

type Block = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
};

const WEEK_DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEK_DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HorariosPage() {
  const { data: tenant } = useCurrentTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();
  const settings = ((tenant as unknown as { settings?: TenantSettings } | null)?.settings ??
    {}) as TenantSettings;
  const av = settings.availability ?? {};

  const [startHour, setStartHour] = useState(av.start_hour ?? 8);
  const [endHour, setEndHour] = useState(av.end_hour ?? 19);
  const [days, setDays] = useState<number[]>(av.days ?? [1, 2, 3, 4, 5]);

  useEffect(() => {
    const a = settings.availability ?? {};
    setStartHour(a.start_hour ?? 8);
    setEndHour(a.end_hour ?? 19);
    setDays(a.days ?? [1, 2, 3, 4, 5]);
  }, [settings]);

  const saveAvailability = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Consultório não encontrado");
      if (endHour <= startHour) throw new Error("O horário final deve ser maior que o inicial");
      const next = { ...settings, availability: { start_hour: startHour, end_hour: endHour, days } };
      const { error } = await supabase
        .from("tenants")
        .update({ settings: next as never })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-tenant"] });
      toast.success("Disponibilidade atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: blocks = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ["agenda-blocks", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at")
        .eq("tenant_id", tenantId!)
        .eq("kind", "block")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as Block[];
    },
  });

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000);
  defaultStart.setMinutes(0, 0, 0);
  const [blockTitle, setBlockTitle] = useState("Indisponível");
  const [blockStart, setBlockStart] = useState(toLocalInput(defaultStart));
  const [blockEnd, setBlockEnd] = useState(
    toLocalInput(new Date(defaultStart.getTime() + 60 * 60 * 1000)),
  );

  const createBlock = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Consultório não encontrado");
      const s = new Date(blockStart);
      const e = new Date(blockEnd);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
        throw new Error("Informe um período válido");
      }
      const { error } = await supabase.from("appointments").insert({
        tenant_id: tenantId,
        title: blockTitle.trim() || "Indisponível",
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        modality: "online" as const,
        status: "scheduled" as const,
        kind: "block",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-blocks", tenantId] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Período bloqueado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-blocks", tenantId] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Bloqueio removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Horários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina quando você atende e bloqueie períodos — o agendamento online só oferece horários
            livres dentro dessa janela.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 border-gold/20 bg-gold/5 p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">Disponibilidade semanal</h2>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Dias de atendimento
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS_SHORT.map((label, idx) => {
                  const active = days.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Fim</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value) || 24)}
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Resumo:</span>{" "}
              {days.length
                ? days.map((d) => WEEK_DAYS_FULL[d]).join(", ")
                : "nenhum dia selecionado"}{" "}
              · {String(startHour).padStart(2, "0")}:00 → {String(endHour).padStart(2, "0")}:00
            </div>

            <Button
              className="w-full"
              onClick={() => saveAvailability.mutate()}
              disabled={saveAvailability.isPending}
            >
              {saveAvailability.isPending ? "Salvando…" : "Salvar disponibilidade"}
            </Button>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">Bloquear período</h2>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Férias, almoço, supervisão — o horário deixa de aparecer para os pacientes.
            </p>

            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Motivo</Label>
                <Input
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="Ex: Supervisão clínica"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="datetime-local"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="datetime-local"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => createBlock.mutate()}
              disabled={createBlock.isPending}
            >
              <Plus className="h-4 w-4" />
              {createBlock.isPending ? "Bloqueando…" : "Bloquear horário"}
            </Button>
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-semibold">Bloqueios ativos</h2>
          </div>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum período bloqueado no momento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(b.starts_at)} → {fmt(b.ends_at)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeBlock.mutate(b.id)}
                    aria-label="Remover bloqueio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
