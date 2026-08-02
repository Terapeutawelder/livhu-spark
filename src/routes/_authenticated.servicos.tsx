import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Video, MapPin, Clock, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — LivHub" },
      {
        name: "description",
        content:
          "Cadastre e gerencie os serviços de terapia: duração, preço, modalidade e cor usada na agenda e na página pública.",
      },
      { property: "og:title", content: "Serviços — LivHub" },
      {
        property: "og:description",
        content: "Gestão dos serviços de terapia usados na agenda e no agendamento online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Serviços — LivHub" },
      { name: "twitter:description", content: "Gestão dos serviços de terapia do seu consultório." },
    ],
  }),
  component: ServicosPage,
});

type Modality = "online" | "presencial" | "ambos";

type Service = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  modality: Modality;
  color: string;
  is_active: boolean;
};

const MODALITY_LABEL: Record<Modality, string> = {
  online: "Online",
  presencial: "Presencial",
  ambos: "Online e presencial",
};

const COLORS = ["#c9a227", "#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#64748b"];

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Draft = {
  id?: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: string;
  modality: Modality;
  color: string;
  is_active: boolean;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  duration_minutes: 50,
  price: "",
  modality: "online",
  color: COLORS[0],
  is_active: true,
};

function ServicosPage() {
  const { data: tenant } = useCurrentTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const { data: services = [], isLoading } = useQuery({
    enabled: !!tenantId,
    queryKey: ["services-all", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (!tenantId) throw new Error("Consultório não encontrado");
      if (!d.name.trim()) throw new Error("Informe o nome do serviço");
      const priceCents = Math.round(Number(d.price.replace(/\./g, "").replace(",", ".") || "0") * 100);
      const payload = {
        tenant_id: tenantId,
        name: d.name.trim(),
        description: d.description.trim() || null,
        duration_minutes: Math.max(10, d.duration_minutes || 50),
        price_cents: Math.max(0, priceCents),
        modality: d.modality,
        color: d.color,
        is_active: d.is_active,
      };
      if (d.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-all", tenantId] });
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
      setOpen(false);
      toast.success("Serviço salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (s: Service) => {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !s.is_active })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-all", tenantId] });
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-all", tenantId] });
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
      toast.success("Serviço removido");
    },
    onError: () =>
      toast.error("Não foi possível excluir — o serviço já tem sessões vinculadas. Desative-o."),
  });

  const openNew = () => {
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (s: Service) => {
    setDraft({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      duration_minutes: s.duration_minutes,
      price: (s.price_cents / 100).toFixed(2).replace(".", ","),
      modality: s.modality,
      color: s.color || COLORS[0],
      is_active: s.is_active,
    });
    setOpen(true);
  };

  const activeCount = services.filter((s) => s.is_active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Serviços</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Os serviços aqui cadastrados aparecem na agenda, no agendamento online e no checkout.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo serviço
          </Button>
        </div>

        <Card className="flex flex-wrap items-center gap-6 border-gold/20 bg-gold/5 p-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-gold" />
            <span className="text-sm">
              <strong>{services.length}</strong> serviços · <strong>{activeCount}</strong> ativos
            </span>
          </div>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando serviços…</p>
        ) : services.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum serviço cadastrado ainda. Crie o primeiro para liberar o agendamento.
            </p>
            <Button onClick={openNew} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Novo serviço
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {services.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-lg text-white"
                      style={{ backgroundColor: s.color || COLORS[0] }}
                    >
                      {s.modality === "presencial" ? (
                        <MapPin className="h-5 w-5" />
                      ) : (
                        <Video className="h-5 w-5" />
                      )}
                    </span>
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <Clock className="h-3 w-3" /> {s.duration_minutes} min · {MODALITY_LABEL[s.modality]}
                      </p>
                    </div>
                  </div>
                  <Switch checked={s.is_active} onCheckedChange={() => toggle.mutate(s)} />
                </div>

                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}

                <div className="mt-auto flex items-end justify-between pt-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Preço</p>
                    <p className="font-display text-2xl font-bold">
                      {s.price_cents > 0 ? brl(s.price_cents) : "Gratuito"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!s.is_active && <Badge variant="outline">Inativo</Badge>}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove.mutate(s.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>
              Defina duração, preço e modalidade — usados na agenda e no agendamento online.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Sessão individual online"
              />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input
                type="number"
                min={10}
                step={5}
                value={draft.duration_minutes}
                onChange={(e) => setDraft({ ...draft, duration_minutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="250,00"
              />
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select
                value={draft.modality}
                onValueChange={(v) => setDraft({ ...draft, modality: v as Modality })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="ambos">Online e presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cor na agenda</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    onClick={() => setDraft({ ...draft, color: c })}
                    className={`h-7 w-7 rounded-full border-2 transition ${draft.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Explique brevemente o serviço para o paciente"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
              <span className="text-sm text-muted-foreground">Disponível para agendamento</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
