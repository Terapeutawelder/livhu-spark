import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Filter, Search, MoreVertical, MessageCircle, Calendar, Tag, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";

export const Route = createFileRoute("/_authenticated/kanban")({
  head: () => ({
    meta: [
      { title: "Jornada do Paciente — LivHub" },
      { name: "description", content: "Kanban visual da jornada terapêutica com avanço automático por eventos." },
      { property: "og:title", content: "Jornada do Paciente — LivHub" },
      { property: "og:description", content: "Kanban da jornada com avanço automático." },
    ],
  }),
  component: KanbanPage,
  errorComponent: KanbanError,
  notFoundComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">Jornada não encontrada.</div>
  ),
});

function KanbanError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">Não foi possível carregar a jornada</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  );
}


type Stage = {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
  auto_advance_on: string[];
};

type Contact = {
  id: string;
  tenant_id: string;
  stage_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  tags: string[];
  value_cents: number;
  last_interaction_at: string | null;
  created_at: string;
};

function KanbanPage() {
  const { data: tenant, isLoading: loadingTenant, error: tenantError } = useCurrentTenant();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [dragging, setDragging] = useState<{ id: string; from: string | null } | null>(null);
  const [newOpen, setNewOpen] = useState<string | null>(null); // stage_id ou null
  const [creating, setCreating] = useState({ name: "", phone: "", source: "" });

  const {
    data: stages = [],
    isLoading: loadingStages,
    error: stagesError,
  } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["kanban-stages", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kanban_stages")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        auto_advance_on: s.auto_advance_on ?? [],
      })) as Stage[];
    },
  });

  const {
    data: contacts = [],
    isLoading: loadingContacts,
    error: contactsError,
  } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["contacts", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c) => ({
        ...c,
        tags: c.tags ?? [],
        value_cents: c.value_cents ?? 0,
        full_name: c.full_name ?? "Sem nome",
      })) as Contact[];
    },
  });


  // Realtime: mantém o board sincronizado quando outro evento move um card
  useEffect(() => {
    if (!tenant?.id) return;
    const ch = supabase
      .channel(`kanban-${tenant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts", filter: `tenant_id=eq.${tenant.id}` },
        () => qc.invalidateQueries({ queryKey: ["contacts", tenant.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tenant?.id, qc]);

  const moveMutation = useMutation({
    mutationFn: async ({ contactId, toStageId }: { contactId: string; toStageId: string }) => {
      const { error } = await supabase.from("contacts").update({ stage_id: toStageId }).eq("id", contactId);
      if (error) throw error;
    },
    onMutate: async ({ contactId, toStageId }) => {
      await qc.cancelQueries({ queryKey: ["contacts", tenant?.id] });
      const prev = qc.getQueryData<Contact[]>(["contacts", tenant?.id]);
      qc.setQueryData<Contact[]>(["contacts", tenant?.id], (old) =>
        (old ?? []).map((c) => (c.id === contactId ? { ...c, stage_id: toStageId } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["contacts", tenant?.id], ctx.prev);
      toast.error("Não foi possível mover o card");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !newOpen) throw new Error("faltando tenant/coluna");
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("contacts").insert({
        tenant_id: tenant.id,
        stage_id: newOpen,
        full_name: creating.name.trim(),
        phone: creating.phone.trim() || null,
        source: creating.source.trim() || null,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato criado");
      setNewOpen(null);
      setCreating({ name: "", phone: "", source: "" });
      qc.invalidateQueries({ queryKey: ["contacts", tenant?.id] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro ao criar", { description: msg });
    },
  });

  const byStage = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const c of contacts) {
      const key = c.stage_id ?? stages[0]?.id;
      if (key && map[key]) map[key].push(c);
    }
    return map;
  }, [stages, contacts]);

  function moveCard(toStageId: string) {
    if (!dragging) return;
    if (dragging.from === toStageId) return setDragging(null);
    moveMutation.mutate({ contactId: dragging.id, toStageId });
    setDragging(null);
  }

  if (loadingTenant || loadingStages || loadingContacts) {
    return (
      <div className="grid h-[calc(100vh-4rem)] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const loadError = tenantError ?? stagesError ?? contactsError;
  if (loadError) {
    const msg = loadError instanceof Error ? loadError.message : String(loadError);
    return (
      <div className="grid min-h-[60vh] place-items-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Não foi possível carregar a jornada</h1>
          <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
          <Button
            className="mt-4"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["current-tenant"] });
              qc.invalidateQueries({ queryKey: ["kanban-stages"] });
              qc.invalidateQueries({ queryKey: ["contacts"] });
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Consultório ainda não configurado.</div>
    );
  }


  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jornada do Paciente</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cards para atualizar manualmente. Ícone{" "}
            <Zap className="inline h-3.5 w-3.5 text-gold" /> indica avanço automático (agenda, mensagem, pagamento).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente..." className="pl-8 w-56" />
          </div>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          <Button size="sm" className="gap-2" onClick={() => setNewOpen(stages[0]?.id ?? null)}>
            <Plus className="h-4 w-4" /> Novo contato
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const items = (byStage[stage.id] ?? []).filter(
            (c) => !q || c.full_name.toLowerCase().includes(q.toLowerCase()),
          );
          const total = items.reduce((a, c) => a + c.value_cents, 0);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => moveCard(stage.id)}
              className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
            >
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                  <span className="text-sm font-semibold">{stage.name}</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">{items.length}</Badge>
                  {stage.auto_advance_on.length > 0 && (
                    <Zap className="h-3.5 w-3.5 text-gold" aria-label="Avança automaticamente" />
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewOpen(stage.id)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                LTV coluna: R$ {(total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {items.map((card) => (
                  <Card
                    key={card.id}
                    draggable
                    onDragStart={() => setDragging({ id: card.id, from: card.stage_id })}
                    className={`cursor-grab p-3 shadow-sm transition ${dragging?.id === card.id ? "opacity-40" : "hover:shadow-md"}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                            {card.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <p className="truncate text-sm font-medium">{card.full_name}</p>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {card.tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {card.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {card.source ?? "—"}</span>
                      <span>
                        {card.last_interaction_at
                          ? new Date(card.last_interaction_at).toLocaleDateString("pt-BR")
                          : "sem interação"}
                      </span>
                    </div>
                    {card.value_cents > 0 && (
                      <div className="mt-2 border-t pt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        R$ {(card.value_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="mt-2 flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 flex-1 gap-1 text-xs">
                        <MessageCircle className="h-3 w-3" /> Chat
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 flex-1 gap-1 text-xs">
                        <Calendar className="h-3 w-3" /> Agendar
                      </Button>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="rounded-md border-2 border-dashed p-6 text-center text-xs text-muted-foreground">
                    Solte cards aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!newOpen} onOpenChange={(o) => !o && setNewOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
            <DialogDescription>Adiciona um paciente/lead ao consultório e à coluna selecionada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input value={creating.name} onChange={(e) => setCreating((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={creating.phone} onChange={(e) => setCreating((s) => ({ ...s, phone: e.target.value }))} placeholder="+55 11 9..." />
            </div>
            <div>
              <Label>Origem</Label>
              <Input value={creating.source} onChange={(e) => setCreating((s) => ({ ...s, source: e.target.value }))} placeholder="Instagram, indicação, Google..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(null)}>Cancelar</Button>
            <Button
              disabled={!creating.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
