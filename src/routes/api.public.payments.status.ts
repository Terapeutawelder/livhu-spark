import { createFileRoute } from "@tanstack/react-router";

/** Consulta pública do status de uma cobrança (usada na página de retorno do checkout). */
export const Route = createFileRoute("/api/public/payments/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("order") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
          return Response.json({ status: "unknown" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("payment_orders")
          .select("id, status, appointment_id")
          .eq("id", orderId)
          .maybeSingle();
        if (!order) return Response.json({ status: "unknown" }, { status: 404 });

        // Stripe: confirma consultando a sessão (o webhook pode ainda não ter chegado).
        if (order.status === "pending") {
          const { confirmPaidOrder } = await import("@/lib/payments.server");
          await confirmPaidOrder(order.id).catch(() => false);
        }

        const { data: fresh } = await supabaseAdmin
          .from("payment_orders")
          .select("status")
          .eq("id", orderId)
          .maybeSingle();

        let startsAt: string | null = null;
        let meetingUrl: string | null = null;
        if (order.appointment_id) {
          const { data: appt } = await supabaseAdmin
            .from("appointments")
            .select("starts_at, meeting_url")
            .eq("id", order.appointment_id)
            .maybeSingle();
          startsAt = appt?.starts_at ?? null;
          meetingUrl = appt?.meeting_url ?? null;
        }

        return Response.json(
          { status: fresh?.status ?? order.status, startsAt, meetingUrl },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
