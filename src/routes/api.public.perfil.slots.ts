import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/perfil/slots")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const slug = url.searchParams.get("slug") ?? "";
        const date = url.searchParams.get("date") ?? "";
        const duration = Number(url.searchParams.get("duration") ?? "50") || 50;
        if (!/^[a-z0-9-]{1,64}$/i.test(slug) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return Response.json({ slots: [] }, { status: 400 });
        }
        const { computeSlots } = await import("@/lib/public-booking.server");
        const result = await computeSlots(slug, date, Math.min(Math.max(duration, 15), 240));
        return Response.json(result, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
