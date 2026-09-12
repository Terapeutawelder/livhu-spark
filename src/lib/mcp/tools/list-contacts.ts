import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contacts",
  title: "Listar contatos",
  description: "Lista ou busca contatos e pacientes do consultório por nome, e-mail ou telefone.",
  inputSchema: {
    search: z.string().trim().min(1).describe("Texto para buscar por nome.").optional(),
    limit: z.number().int().min(1).max(100).default(25).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("contacts")
      .select("id,full_name,email,phone,tags,source,value_cents,last_interaction_at,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);

    if (search) query = query.ilike("full_name", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { contacts: data ?? [] },
    };
  },
});
