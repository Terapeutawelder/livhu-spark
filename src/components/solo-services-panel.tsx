import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Modality = "online" | "presencial" | "ambos";
type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  modality: Modality;
  is_active: boolean;
};

const modalityLabels: Record<Modality, string> = {
  online: "Online",
  presencial: "Presencial",
  ambos: "Online e presencial",
};

/** Serviços de terapia do profissional autônomo (sem qualquer gestão de equipe). */
export function SoloServicesPanel() {
  const { data: tenant } = useCurrentTenant();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(50);
  const [price, setPrice] = useState(200);
  const [modality, setModality] = useState<Modality>("online");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["solo-services", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, duration_minutes, price_cents, modality, is_active")
        .eq("tenant_id", tenant!.id)
        .order("price_cents");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["solo-services"] });
    qc.invalidateQueries({ queryKey: ["public-profile-services"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Consultório não encontrado");
      const { error } = await supabase.from("services").insert({
        tenant_id: tenant.id,
        name: name.trim(),
        duration_minutes: duration,
        price_cents: Math.round(price * 100),
        modality,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço criado.");
      setName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço removido.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold">
          <Briefcase className="h-4 w-4" /> Meus serviços
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Serviços de terapia</h1>
        <p className="text-sm text-muted-foreground">
          Defina as sessões que aparecem na sua página pública e no checkout.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo serviço</CardTitle>
          <CardDescription>Nome, duração, valor e modalidade de atendimento.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sessão individual" />
          </div>
          <div className="space-y-1.5">
            <Label>Duração (min)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Modalidade</Label>
            <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(modalityLabels) as Modality[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {modalityLabels[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button
              onClick={() => create.mutate()}
              disabled={!name.trim() || create.isPending}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar serviço
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Serviços cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && services.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
          )}
          {services.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.duration_minutes} min · R$ {(s.price_cents / 100).toLocaleString("pt-BR")} ·{" "}
                  {modalityLabels[s.modality]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.is_active}
                  onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })}
                  aria-label="Ativar serviço"
                />
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
