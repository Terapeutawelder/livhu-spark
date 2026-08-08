import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, ShoppingCart, AlertTriangle, TrendingDown, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/creditos")({
  head: () => ({
    meta: [
      { title: "Créditos de mensagem — LivHub" },
      {
        name: "description",
        content:
          "Acompanhe seu saldo de créditos de mensagem, compre pacotes pré-pagos e veja o histórico de consumo do consultório.",
      },
      { property: "og:title", content: "Créditos de mensagem — LivHub" },
      { property: "og:description", content: "Saldo, pacotes pré-pagos e histórico de consumo de mensagens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Créditos de mensagem — LivHub" },
      { name: "twitter:description", content: "Saldo e pacotes pré-pagos de mensagens do LivHub." },
    ],
  }),
  component: CreditosPage,
});

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CreditosPage() {
  const { data: tenant } = useCurrentTenant();
  const tenantId = tenant?.id;
  const qc = useQueryClient();

  const wallet = useQuery({
    queryKey: ["credit-wallet", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_credit_wallets")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const packages = useQuery({
    queryKey: ["credit-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ledger = useQuery({
    queryKey: ["credit-ledger", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_credit_ledger")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["credit-orders", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_credit_orders")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const buy = useMutation({
    mutationFn: async (pkg: { id: string; credits: number; price_cents: number; name: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("message_credit_orders").insert({
        tenant_id: tenantId!,
        package_id: pkg.id,
        credits: pkg.credits,
        amount_cents: pkg.price_cents,
        note: pkg.name,
        requested_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido enviado! Os créditos entram assim que o pagamento for confirmado.");
      qc.invalidateQueries({ queryKey: ["credit-orders", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balance = wallet.data?.balance ?? 0;
  const managed = wallet.data?.billing_mode === "managed";
  const low = managed && balance <= (wallet.data?.low_balance_threshold ?? 50);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gold/40 bg-gold p-5 text-[hsl(var(--sidebar-active-foreground))] shadow-[0_10px_30px_-10px_hsl(var(--gold)/0.6)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
            <Coins className="h-4 w-4" /> Saldo de mensagens
          </div>
          <p className="mt-3 font-display text-4xl font-bold">{balance.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs opacity-80">créditos disponíveis</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Modo de cobrança
          </div>
          <p className="mt-3 font-display text-xl font-bold">
            {managed ? "Gerenciado pelo LivHub" : "Conta própria (Meta direta)"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {managed
              ? "As mensagens saem pelo número do LivHub e consomem créditos pré-pagos."
              : "Você usa suas próprias credenciais da Meta e paga direto a ela. Nenhum crédito é consumido."}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Alerta de saldo baixo
          </div>
          <p className="mt-3 font-display text-xl font-bold">
            {(wallet.data?.low_balance_threshold ?? 50).toLocaleString("pt-BR")} créditos
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Avisamos você quando o saldo chegar nesse limite para evitar interrupção dos envios.
          </p>
        </Card>
      </div>

      {low && (
        <Card className="flex items-start gap-3 border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="font-semibold">Saldo baixo</p>
            <p className="text-sm text-muted-foreground">
              Ao zerar os créditos, os envios de WhatsApp ficam pausados até a recarga. E-mails continuam funcionando.
            </p>
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Pacotes pré-pagos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(packages.data ?? []).map((pkg) => (
            <Card key={pkg.id} className="flex flex-col p-5 transition-shadow hover:shadow-lg">
              <p className="font-display text-base font-bold">{pkg.name}</p>
              <p className="mt-2 font-display text-3xl font-bold text-gold">
                {pkg.credits.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">mensagens</p>
              <p className="mt-3 text-lg font-semibold">{brl(pkg.price_cents)}</p>
              <p className="text-xs text-muted-foreground">
                {brl(Math.round(pkg.price_cents / pkg.credits))} por mensagem
              </p>
              <Button
                className="mt-4"
                disabled={buy.isPending || !tenantId}
                onClick={() => buy.mutate(pkg)}
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> Comprar
              </Button>
            </Card>
          ))}
          {packages.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum pacote disponível no momento.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Meus pedidos</h2>
          <div className="space-y-2">
            {(orders.data ?? []).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{o.note || `${o.credits} créditos`}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")} · {brl(o.amount_cents)}
                  </p>
                </div>
                <Badge variant={o.status === "paid" ? "default" : o.status === "canceled" ? "destructive" : "secondary"}>
                  {o.status === "paid" ? "Pago" : o.status === "canceled" ? "Cancelado" : "Aguardando"}
                </Badge>
              </div>
            ))}
            {orders.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">Você ainda não fez pedidos de créditos.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Histórico de consumo</h2>
          <div className="space-y-2">
            {(ledger.data ?? []).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  {l.delta >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{l.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={l.delta >= 0 ? "font-semibold text-emerald-500" : "font-semibold"}>
                    {l.delta >= 0 ? "+" : ""}
                    {l.delta}
                  </p>
                  <p className="text-xs text-muted-foreground">saldo {l.balance_after}</p>
                </div>
              </div>
            ))}
            {ledger.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
