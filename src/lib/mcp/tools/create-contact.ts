import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { currentTenantId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_contact",
  title: "Criar contato",
  description: "Cria um novo contato/paciente no consultório do usuário autenticado.",
  inputSchema: {
    full_name: z.string().trim().min(1).describe("Nome completo do contato."),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(5).optional(),
    source: z.string().trim().min(1).describe("Origem do contato, ex.: indicação.").optional(),
    tags: z.array(z.string().trim().min(1)).max(10).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ full_name, email, phone, source, tags }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const tenantId = await currentTenantId(supabase);

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        tenant_id: tenantId,
        created_by: ctx.getUserId(),
        full_name,
        email: email ?? null,
        phone: phone ?? null,
        source: source ?? "mcp",
        tags: tags ?? [],
      })
      .select("id,full_name,email,phone,source,tags")
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { contact: data },
    };
  },
});
