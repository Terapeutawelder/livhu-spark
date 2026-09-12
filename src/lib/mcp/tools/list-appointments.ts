import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_appointments",
  title: "Listar agendamentos",
  description: "Lista as sessões agendadas do consultório dentro de um intervalo de datas.",
  inputSchema: {
    from: z.string().describe("Data/hora inicial ISO 8601. Padrão: agora.").optional(),
    to: z.string().describe("Data/hora final ISO 8601. Padrão: 30 dias à frente.").optional(),
    limit: z.number().int().min(1).max(100).default(25).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const start = from ?? new Date().toISOString();
    const end = to ?? new Date(Date.now() + 30 * 86400000).toISOString();

    const { data, error } = await supabase
      .from("appointments")
      .select("id,title,starts_at,ends_at,status,modality,meeting_url,notes,contact_id,service_id")
      .gte("starts_at", start)
      .lte("starts_at", end)
      .order("starts_at", { ascending: true })
      .limit(limit ?? 25);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
