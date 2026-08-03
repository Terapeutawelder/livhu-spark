import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Check, X, Plus } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/creditos")({
  head: () => ({
    meta: [
      { title: "Créditos de mensagem — Super Admin LivHub" },
      {
        name: "description",
        content:
          "Console do super admin para aprovar pedidos, lançar créditos de mensagem e definir o modo de cobrança de cada consultório.",
      },
      { property: "og:title", content: "Créditos de mensagem — Super Admin LivHub" },
      { property: "og:description", content: "Aprovação de pedidos e gestão de créditos pré-pagos por consultório." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Créditos de mensagem — Super Admin LivHub" },
      { name: "twitter:description", content: "Gestão de créditos pré-pagos dos consultórios." },
    ],
  }),
  component: AdminCreditosPage,
});

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminCreditosPage() {
  const qc = useQueryClient();
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantTenant, setGrantTenant] = useState("");
  const [grantAmount, setGrantAmount] = useState("500");
  const [grantReason, setGrantReason] = useState("Recarga manual");

  const tenants = useQuery({
    queryKey: ["admin-tenants-credits"],
    queryFn: async () => {
      const [{ data: list, error }, { data: wallets }] = await Promise.all([
        supabase.from("tenants").select("id, name, slug, plan").order("name"),
        supabase.from("message_credit_wallets").select("*"),
      ]);
      if (error) throw error;
      const byId = new Map((wallets ?? []).map((w) => [w.tenant_id, w]));
      return (list ?? []).map((t) => ({ ...t, wallet: byId.get(t.id) ?? null }));
    },
  });

  const orders = useQuery({
    queryKey: ["admin-credit-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_credit_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-credit-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-tenants-credits"] });
  };

  const grant = useMutation({
    mutationFn: async (input: { tenantId: string; amount: number; reason: string }) => {
      const { error } = await supabase.rpc("grant_message_credits", {
        _tenant_id: input.tenantId,
        _amount: input.amount,
        _reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Créditos lançados.");
      setGrantOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setMode = useMutation({
    mutationFn: async (input: { tenantId: string; mode: "own" | "managed" }) => {
      const { error } = await supabase
        .from("message_credit_wallets")
        .upsert({ tenant_id: input.tenantId, billing_mode: input.mode }, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modo de cobrança atualizado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async (input: { id: string; tenantId: string; credits: number; approve: boolean }) => {
      if (input.approve) {
        const { error: rpcErr } = await supabase.rpc("grant_message_credits", {
          _tenant_id: input.tenantId,
          _amount: input.credits,
          _reason: "Compra de pacote confirmada",
        });
        if (rpcErr) throw rpcErr;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("message_credit_orders")
        .update({
          status: input.approve ? "paid" : "canceled",
          handled_by: userRes.user?.id ?? null,
          handled_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tenantName = (id: string) => tenants.data?.find((t) => t.id === id)?.name ?? id.slice(0, 8);

  return (
    <AdminShell
      title="Créditos de mensagem"
      description="Pedidos, saldos e modo de cobrança de cada consultório."
      actions={
        <Button onClick={() => setGrantOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Lançar créditos
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Pedidos de compra</h2>
          <div className="space-y-2">
            {(orders.data ?? []).map((o) => (
              <div
                key={o.id}
                className="flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {tenantName(o.tenant_id)} · {o.credits.toLocaleString("pt-BR")} créditos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")} · {brl(o.amount_cents)} · {o.note ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={o.status === "paid" ? "default" : o.status === "canceled" ? "destructive" : "secondary"}
                  >
                    {o.status === "paid" ? "Pago" : o.status === "canceled" ? "Cancelado" : "Aguardando"}
                  </Badge>
                  {o.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        disabled={decide.isPending}
                        onClick={() =>
                          decide.mutate({ id: o.id, tenantId: o.tenant_id, credits: o.credits, approve: true })
                        }
                      >
                        <Check className="mr-1 h-4 w-4" /> Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decide.isPending}
                        onClick={() =>
                          decide.mutate({ id: o.id, tenantId: o.tenant_id, credits: o.credits, approve: false })
                        }
                      >
                        <X className="mr-1 h-4 w-4" /> Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {orders.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Saldos por consultório</h2>
          <div className="space-y-2">
            {(tenants.data ?? []).map((t) => {
              const mode = (t.wallet?.billing_mode ?? "own") as "own" | "managed";
              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">/{t.slug} · plano {t.plan}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-gold">
                      <Coins className="h-4 w-4" />
                      {(t.wallet?.balance ?? 0).toLocaleString("pt-BR")}
                    </span>
                    <Select
                      value={mode}
                      onValueChange={(v) => setMode.mutate({ tenantId: t.id, mode: v as "own" | "managed" })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Conta própria (Meta)</SelectItem>
                        <SelectItem value="managed">Gerenciado (pré-pago)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGrantTenant(t.id);
                        setGrantOpen(true);
                      }}
                    >
                      Recarregar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar créditos</DialogTitle>
            <DialogDescription>
              Use valores negativos para estornar. O lançamento fica registrado no histórico do consultório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Consultório</Label>
              <Select value={grantTenant} onValueChange={setGrantTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(tenants.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade de créditos</Label>
              <Input value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={grantReason} onChange={(e) => setGrantReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!grantTenant || grant.isPending}
              onClick={() =>
                grant.mutate({
                  tenantId: grantTenant,
                  amount: Number.parseInt(grantAmount || "0", 10),
                  reason: grantReason || "Recarga manual",
                })
              }
            >
              Lançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
