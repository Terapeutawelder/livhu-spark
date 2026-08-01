import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AgentChatInput } from "./agents.schema";

export const chatWithAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AgentChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: agent, error } = await context.supabase
      .from("ai_agents")
      .select("id, tenant_id, name, system_prompt, model, temperature, language, tools, handoff_rules")
      .eq("id", data.agentId)
      .maybeSingle();

    if (error || !agent) throw new Error("Agente não encontrado ou sem acesso.");

    const { runAgentChat } = await import("./agents.server");
    return runAgentChat(agent, data);
  });
