import { createFileRoute } from "@tanstack/react-router";

/**
 * Processa a fila de notificações (WhatsApp + e-mail).
 * Chamado a cada 5 minutos pelo agendador do banco.
 */
export const Route = createFileRoute("/api/public/hooks/notifications-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { processDueNotifications } = await import("@/lib/notifications.server");
        const result = await processDueNotifications();
        return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
