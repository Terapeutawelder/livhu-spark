import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  slug: z.string().min(1).max(64),
  serviceId: z.string().uuid().nullable().optional(),
  planId: z.string().max(32).nullable().optional(),
  startsAt: z.string().min(10),
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(30),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const Route = createFileRoute("/api/public/perfil/book")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Preencha os campos corretamente." }, { status: 400 });
        }
        const { createPublicBooking } = await import("@/lib/public-booking.server");
        const result = await createPublicBooking({
          slug: parsed.data.slug,
          serviceId: parsed.data.serviceId ?? null,
          startsAt: parsed.data.startsAt,
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email || undefined,
          notes: parsed.data.notes,
        });
        return Response.json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});
