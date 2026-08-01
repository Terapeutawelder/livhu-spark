import { z } from "zod";

export const SaveAiKeyInput = z.object({
  provider: z.enum(["openai", "google", "anthropic", "custom"]),
  apiKey: z.string().trim().min(20).max(500),
  baseUrl: z.string().trim().url().max(300).optional().nullable(),
});

export const OrchestrateAgentsInput = z.object({
  instruction: z.string().trim().min(10).max(2000),
  count: z.number().int().min(1).max(3).default(1),
});