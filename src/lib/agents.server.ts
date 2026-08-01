import { generateText, type ModelMessage } from "ai";
import type { AgentChatInput } from "./agents.schema";

type AgentRow = {
  id: string;
  tenant_id: string;
  name: string;
  system_prompt: string | null;
  model: string | null;
  temperature: number | null;
  language: string | null;
  tools: unknown;
  handoff_rules: unknown;
};

export async function runAgentChat(agent: AgentRow, input: AgentChatInput) {
  const { loadTenantAiCredential, createProvider, defaultModel, isAllowedModel, friendlyAiError } =
    await import("./byo-ai.server");

  const credential = await loadTenantAiCredential(agent.tenant_id);
  const { provider, client } = createProvider(credential);
  const configuredModel = agent.model ?? "";
  const model = isAllowedModel(provider, configuredModel) ? configuredModel : defaultModel(provider);

  const tools = Array.isArray(agent.tools) ? (agent.tools as string[]) : [];
  const handoff = Array.isArray(agent.handoff_rules) ? (agent.handoff_rules as string[]) : [];

  const system = [
    agent.system_prompt || `Você é ${agent.name}, um assistente virtual de um psicoterapeuta.`,
    `Responda sempre em ${agent.language || "pt-BR"}, com tom acolhedor e profissional.`,
    tools.length ? `Você pode auxiliar com: ${tools.join(", ")}.` : "",
    handoff.length ? `Escale imediatamente para um humano quando: ${handoff.join("; ")}.` : "",
    "Nunca faça diagnóstico clínico. Se detectar sinais de crise, oriente contato com o CVV 188 e encaminhe ao profissional.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ModelMessage[] = [
    { role: "system", content: system },
    ...input.messages.map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
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
}
