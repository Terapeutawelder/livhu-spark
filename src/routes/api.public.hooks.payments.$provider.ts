import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook de pagamento (Mercado Pago / Stripe).
 * O corpo nunca é confiado: o pagamento é reconsultado no provedor
 * antes de confirmar a sessão e disparar a notificação.
 */
export const Route = createFileRoute("/api/public/hooks/payments/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider;
        if (provider !== "mercadopago" && provider !== "stripe") {
          return Response.json({ error: "provider" }, { status: 404 });
        }

        let body: any = null;
        try {
          body = await request.json();
        } catch {
          body = null;
        }

        const { confirmPaidOrder } = await import("@/lib/payments.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (provider === "mercadopago") {
          const url = new URL(request.url);
          const paymentId =
            body?.data?.id ?? body?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
          const topic = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
          if (!paymentId || (topic && !String(topic).includes("payment"))) {
            return Response.json({ ok: true, ignored: true });
          }

          // Descobre a cobrança pelo external_reference do pagamento.
          const { data: orders } = await supabaseAdmin
            .from("payment_orders")
            .select("id, tenant_id, provider, status")
            .eq("provider", "mercadopago")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(200);

          for (const order of orders ?? []) {
            const { loadPaymentSettings } = await import("@/lib/payments.server");
            const settings = await loadPaymentSettings(order.tenant_id);
            if (!settings?.mpAccessToken) continue;
            const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { Authorization: `Bearer ${settings.mpAccessToken}` },
            });
            if (!res.ok) continue;
            const payment = (await res.json()) as { external_reference?: string; status?: string };
            if (payment.external_reference !== order.id) continue;
            if (payment.status !== "approved") return Response.json({ ok: true, pending: true });
            await confirmPaidOrder(order.id, String(paymentId));
            return Response.json({ ok: true });
          }
          return Response.json({ ok: true, unmatched: true });
        }

        // Stripe
        const session = body?.data?.object;
        const orderId: string | undefined = session?.metadata?.order_id ?? session?.client_reference_id;
        if (!orderId) return Response.json({ ok: true, ignored: true });
        const confirmed = await confirmPaidOrder(orderId);
        return Response.json({ ok: true, confirmed });
      },
    },
  },
});
