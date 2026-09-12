import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { currentTenantId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "schedule_appointment",
  title: "Agendar sessão",
  description: "Cria uma sessão na agenda do consultório, opcionalmente vinculada a um contato e serviço.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Título da sessão."),
    starts_at: z.string().describe("Início em ISO 8601, ex.: 2026-09-20T14:00:00-03:00."),
    duration_minutes: z.number().int().min(10).max(480).default(50).optional(),
    contact_id: z.string().uuid().optional(),
    service_id: z.string().uuid().optional(),
    modality: z.enum(["online", "presencial"]).optional(),
    notes: z.string().trim().max(2000).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, starts_at, duration_minutes, contact_id, service_id, modality, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const start = new Date(starts_at);
    if (Number.isNaN(start.getTime())) {
      return { content: [{ type: "text", text: "Data de início inválida." }], isError: true };
    }
    const ends = new Date(start.getTime() + (duration_minutes ?? 50) * 60000);

    const supabase = supabaseForUser(ctx);
    const tenantId = await currentTenantId(supabase);

    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      created_by: ctx.getUserId(),
      title,
      starts_at: start.toISOString(),
      ends_at: ends.toISOString(),
      contact_id: contact_id ?? null,
      service_id: service_id ?? null,
      notes: notes ?? null,
    };
    if (modality) payload.modality = modality;

    const { data, error } = await supabase
      .from("appointments")
      .insert(payload as never)
      .select("id,title,starts_at,ends_at,status,modality")
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { appointment: data },
    };
  },
});
