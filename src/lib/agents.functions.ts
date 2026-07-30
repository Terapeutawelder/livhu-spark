import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";

const ChatInput = z.object({
  agentId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    }),
  ).min(1).max(40),
});

export const chatWithAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: agent, error } = await context.supabase
      .from("ai_agents")
      .select("id, tenant_id, name, system_prompt, model, temperature, language, tools, handoff_rules")
      .eq("id", data.agentId)
      .maybeSingle();

    if (error || !agent) throw new Error("Agente não encontrado ou sem acesso.");

    const { loadTenantAiCredential, createProvider, defaultModel, isAllowedModel, friendlyAiError } =
      await import("./byo-ai.server");

    const credential = await loadTenantAiCredential(agent.tenant_id);
    const { provider, client } = createProvider(credential);
    const model = isAllowedModel(provider, agent.model ?? "") ? agent.model! : defaultModel(provider);

    const tools = Array.isArray(agent.tools) ? (agent.tools as string[]) : [];
    const handoff = Array.isArray(agent.handoff_rules) ? (agent.handoff_rules as string[]) : [];

    const system = [
      agent.system_prompt || `Você é ${agent.name}, um assistente virtual de um psicoterapeuta.`,
      `Responda sempre em ${agent.language || "pt-BR"}, com tom acolhedor e profissional.`,
      tools.length ? `Você pode auxiliar com: ${tools.join(", ")}.` : "",
      handoff.length ? `Escale imediatamente para um humano quando: ${handoff.join("; ")}.` : "",
      "Nunca faça diagnóstico clínico. Se detectar sinais de crise, oriente contato com o CVV 188 e encaminhe ao profissional.",
    ].filter(Boolean).join("\n\n");

    const messages: ModelMessage[] = [
      { role: "system", content: system },
      ...data.messages.map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
    ];

    try {
      const result = await generateText({
        model: client(model),
        messages,
        temperature: Number(agent.temperature ?? 0.4),
      });
      return { reply: result.text };
    } catch (err) {
      throw friendlyAiError(err);
    }
  });

