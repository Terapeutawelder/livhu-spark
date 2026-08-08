import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  FileText,
  Users,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";

export const Route = createFileRoute("/_authenticated/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos — LivHub" },
      { name: "description", content: "CRM de pacientes: fichas, notas e histórico de jornada." },
      { property: "og:title", content: "Contatos — LivHub" },
      { property: "og:description", content: "CRM de pacientes." },
    ],
  }),
  component: ContatosPage,
});

type Stage = { id: string; name: string; color: string; position: number };
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
type Note = { id: string; contact_id: string; body: string; created_at: string; author_id: string | null };

function ContatosPage() {
  const { data: tenant, isLoading: loadingTenant } = useCurrentTenant();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState({ name: "", phone: "", email: "", source: "" });
  const [noteBody, setNoteBody] = useState("");

  const { data: stages = [] } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["kanban-stages", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kanban_stages")
        .select("id,name,color,position")
        .eq("tenant_id", tenant!.id)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Stage[];
    },
  });
  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["contacts", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  useEffect(() => {
    if (!tenant?.id) return;
    const ch = supabase
      .channel(`contacts-${tenant.id}`)
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

  useEffect(() => {
    if (!selectedId && contacts[0]) setSelectedId(contacts[0].id);
  }, [contacts, selectedId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return contacts;
    return contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(t) ||
        (c.phone ?? "").toLowerCase().includes(t) ||
        (c.email ?? "").toLowerCase().includes(t),
    );
  }, [contacts, q]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const { data: notes = [] } = useQuery({
    enabled: !!selectedId,
    queryKey: ["contact-notes", selectedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", selectedId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem consultório");
      const { data: userRes } = await supabase.auth.getUser();
      const firstStage = stages[0]?.id ?? null;
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          tenant_id: tenant.id,
          stage_id: firstStage,
          full_name: creating.name.trim(),
          phone: creating.phone.trim() || null,
          email: creating.email.trim() || null,
          source: creating.source.trim() || null,
          created_by: userRes.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    },
    onSuccess: (id) => {
      toast.success("Contato criado");
      setNewOpen(false);
      setCreating({ name: "", phone: "", email: "", source: "" });
      setSelectedId(id);
      qc.invalidateQueries({ queryKey: ["contacts", tenant?.id] });
    },
    onError: (e: unknown) => toast.error("Erro ao criar", { description: e instanceof Error ? e.message : String(e) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato removido");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["contacts", tenant?.id] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !tenant?.id) return;
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("contact_notes").insert({
        tenant_id: tenant.id,
        contact_id: selected.id,
        author_id: userRes.user?.id ?? null,
        body: noteBody.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteBody("");
      qc.invalidateQueries({ queryKey: ["contact-notes", selectedId] });
    },
    onError: (e: unknown) => toast.error("Erro", { description: e instanceof Error ? e.message : String(e) }),
  });

  if (loadingTenant) {
    return (
      <div className="grid h-[calc(100vh-4rem)] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full">
      {/* Lista */}
      <div className="flex w-96 shrink-0 flex-col border-r">
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5" /> Contatos
              <Badge variant="secondary" className="ml-1">{contacts.length}</Badge>
            </h1>
            <Button size="sm" className="gap-1" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, telefone, e-mail…" className="pl-8" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingContacts && (
            <div className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}
          {!loadingContacts && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum contato ainda.</div>
          )}
          {filtered.map((c) => {
            const stage = c.stage_id ? stageById[c.stage_id] : null;
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-start gap-3 border-b p-3 text-left transition hover:bg-muted/50 ${active ? "bg-muted" : ""}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                    {c.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{c.full_name}</p>
                    {stage && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: stage.color }}>
                        {stage.name}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.phone ?? c.email ?? "sem contato"}</p>
                  {c.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* Detalhe */}
      <div className="flex flex-1 flex-col">
        {!selected ? (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Selecione um contato à esquerda.
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-3xl space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                      {selected.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-semibold">{selected.full_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Criado em {new Date(selected.created_at).toLocaleDateString("pt-BR")}
                      {selected.source && <> • Origem: {selected.source}</>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><MessageCircle className="mr-1 h-4 w-4" /> WhatsApp</Button>
                  <Button variant="outline" size="sm"><Calendar className="mr-1 h-4 w-4" /> Agendar</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remover ${selected.full_name}?`)) deleteMutation.mutate(selected.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Telefone</p>
                  <p className="mt-1 flex items-center gap-2 text-sm"><Phone className="h-4 w-4" /> {selected.phone ?? "—"}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">E-mail</p>
                  <p className="mt-1 flex items-center gap-2 text-sm"><Mail className="h-4 w-4" /> {selected.email ?? "—"}</p>
                </Card>
              </div>

              <Separator />

              <Card className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" /> Anotações clínicas
                </h3>
                <div className="space-y-2">
                  <Textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    rows={3}
                    placeholder="Registre observações da sessão, hipóteses, encaminhamentos…"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!noteBody.trim() || noteMutation.isPending}
                      onClick={() => noteMutation.mutate()}
                    >
                      {noteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Adicionar anotação
                    </Button>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-3">
                  {notes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma anotação ainda.</p>}
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-md border bg-muted/30 p-3">
                      <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </ScrollArea>
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
            <DialogDescription>Cadastra um paciente/lead. Ele entra na primeira coluna do kanban.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome completo</Label><Input value={creating.name} onChange={(e) => setCreating((s) => ({ ...s, name: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>WhatsApp</Label><Input value={creating.phone} onChange={(e) => setCreating((s) => ({ ...s, phone: e.target.value }))} placeholder="+55 11 9..." /></div>
              <div><Label>E-mail</Label><Input value={creating.email} onChange={(e) => setCreating((s) => ({ ...s, email: e.target.value }))} /></div>
            </div>
            <div><Label>Origem</Label><Input value={creating.source} onChange={(e) => setCreating((s) => ({ ...s, source: e.target.value }))} placeholder="Instagram, indicação, Google..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button disabled={!creating.name.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
