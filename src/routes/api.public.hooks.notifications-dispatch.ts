import { createFileRoute } from "@tanstack/react-router";

/**
 * Processa a fila de notificações (WhatsApp + e-mail).
 * Chamado imediatamente por trigger no banco quando um job é criado,
 * e a cada 1 minuto pelo agendador para lembretes agendados no futuro.
 */
export const Route = createFileRoute("/api/public/hooks/notifications-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const accepted = [process.env.SUPABASE_ANON_KEY, process.env.SUPABASE_PUBLISHABLE_KEY].filter(
          (v): v is string => Boolean(v),
        );
        if (!accepted.length || !accepted.includes(apikey)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        let jobId: string | undefined;
        try {
          const body = await request.json();
          if (body && typeof body.job_id === "string") jobId = body.job_id;
        } catch {
          // corpo vazio ou inválido: processa todos os jobs vencidos
        }

        const { processDueNotifications } = await import("@/lib/notifications.server");
        const result = await processDueNotifications(jobId ? { jobId } : undefined);
        return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
