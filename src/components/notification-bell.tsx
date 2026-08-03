import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, CalendarPlus, CalendarClock, CalendarX2, Check, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export type AlertKind = "created" | "rescheduled" | "canceled";

export type AlertItem = {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  at: string;
  read: boolean;
};

const STORAGE_KEY = "livhub:appointment-alerts";
const SOUND_KEY = "livhub:appointment-alerts:sound";

const KIND_META: Record<AlertKind, { label: string; icon: typeof CalendarPlus; tone: number[] }> = {
  created: { label: "Nova sessão agendada", icon: CalendarPlus, tone: [660, 880] },
  rescheduled: { label: "Sessão remarcada", icon: CalendarClock, tone: [740, 620] },
  canceled: { label: "Sessão cancelada", icon: CalendarX2, tone: [420, 300] },
};

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function playChime(tones: number[]) {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* som é opcional */
  }
}

export function NotificationBell() {
  const { data: tenant } = useCurrentTenant();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const soundRef = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as AlertItem[]);
      const s = localStorage.getItem(SOUND_KEY);
      if (s !== null) {
        setSoundOn(s === "1");
        soundRef.current = s === "1";
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    soundRef.current = soundOn;
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [soundOn]);

  const push = useCallback((kind: AlertKind, title: string, detail: string) => {
    const meta = KIND_META[kind];
    const item: AlertItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      title,
      detail,
      at: new Date().toISOString(),
      read: false,
    };
    setItems((prev) => {
      const next = [item, ...prev].slice(0, 40);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setPulse(true);
    window.setTimeout(() => setPulse(false), 2600);
    const show = kind === "canceled" ? toast.error : kind === "rescheduled" ? toast.warning : toast.success;
    show(`${meta.label}: ${title}`, { description: detail, duration: 8000 });
    if (soundRef.current) playChime(meta.tone);
  }, []);

  useEffect(() => {
    if (!tenant?.id) return;
    const channel = supabase
      .channel(`appointment-alerts-${tenant.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments", filter: `tenant_id=eq.${tenant.id}` },
        (payload) => {
          const row = payload.new as any;
          push("created", row.title ?? "Sessão", `Início em ${formatWhen(row.starts_at)}`);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments", filter: `tenant_id=eq.${tenant.id}` },
        (payload) => {
          const row = payload.new as any;
          const old = payload.old as any;
          if (row.status === "canceled" && old?.status !== "canceled") {
            push("canceled", row.title ?? "Sessão", `Estava marcada para ${formatWhen(row.starts_at)}`);
            return;
          }
          if (old?.starts_at && row.starts_at && old.starts_at !== row.starts_at) {
            push(
              "rescheduled",
              row.title ?? "Sessão",
              `De ${formatWhen(old.starts_at)} para ${formatWhen(row.starts_at)}`,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, push]);

  const unread = items.filter((i) => !i.read).length;

  const persist = (next: AlertItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && unread) persist(items.map((i) => ({ ...i, read: true })));
      }}
    >
      <PopoverTrigger asChild>
        <button
          aria-label={unread ? `Notificações (${unread} novas)` : "Notificações"}
          className={`relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:bg-muted ${
            pulse ? "animate-pulse ring-2 ring-gold/70" : ""
          }`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold text-black">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Alertas da agenda</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={soundOn ? "Desativar som" : "Ativar som"}
              title={soundOn ? "Som ativado" : "Som desativado"}
              onClick={() => setSoundOn((s) => !s)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => persist([])}>
                <Check className="mr-1 h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <BellOff className="h-5 w-5" />
            Nenhum alerta ainda. Agendamentos, remarcações e cancelamentos aparecem aqui na hora.
          </div>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.map((i) => {
              const meta = KIND_META[i.kind];
              const Icon = meta.icon;
              return (
                <li key={i.id} className="flex gap-3 px-3 py-2.5">
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      i.kind === "canceled"
                        ? "bg-destructive/15 text-destructive"
                        : i.kind === "rescheduled"
                          ? "bg-gold/20 text-gold"
                          : "bg-primary/15 text-primary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{meta.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{i.detail}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">{formatWhen(i.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
