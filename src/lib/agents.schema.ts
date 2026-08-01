import { z } from "zod";

export const AgentChatInput = z.object({
  agentId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

export type AgentChatInput = z.infer<typeof AgentChatInput>;
