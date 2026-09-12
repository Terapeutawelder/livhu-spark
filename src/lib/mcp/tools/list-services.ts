import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_services",
  title: "Listar serviços",
  description: "Lista os serviços de terapia oferecidos, com duração, modalidade e preço.",
  inputSchema: {
    only_active: z.boolean().default(true).describe("Listar apenas serviços ativos.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_active }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("services")
      .select("id,name,description,duration_minutes,modality,price_cents,is_active")
      .order("name", { ascending: true });
    if (only_active !== false) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { services: data ?? [] },
    };
  },
});
