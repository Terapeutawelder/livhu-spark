import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { decryptToken } from "./token-crypto.server";

export type AiProvider = "openai" | "google" | "lovable";

const PROVIDER_BASE_URL: Record<Exclude<AiProvider, "lovable">, string> = {
  openai: "https://api.openai.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
};

/** Modelos permitidos por provedor (allowlist do servidor). */
export const PROVIDER_MODELS: Record<AiProvider, string[]> = {
  lovable: [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "openai/gpt-5-mini",
    "openai/gpt-5",
  ],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
};

export function isAllowedModel(provider: AiProvider, model: string) {
  return PROVIDER_MODELS[provider].includes(model);
}

export function defaultModel(provider: AiProvider) {
  return PROVIDER_MODELS[provider][0];
}

type Credential = { provider: AiProvider; apiKey: string };

/**
 * Lê a credencial de IA do tenant (cifrada em repouso) usando o cliente admin.
 * O chamador DEVE ter validado que o usuário pertence ao tenant.
 */
export async function loadTenantAiCredential(tenantId: string): Promise<Credential | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tenant_ai_credentials")
    .select("provider, api_key_enc")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return null;
  const apiKey = await decryptToken(data.api_key_enc);
  if (!apiKey) return null;
  return { provider: data.provider as AiProvider, apiKey };
}

/**
 * Cria o provider AI SDK. Usa a chave do próprio tenant quando existir,
 * caindo para o Lovable AI Gateway quando não houver chave configurada.
 */
export function createProvider(credential: Credential | null) {
  if (credential) {
    return {
      provider: credential.provider,
      client: createOpenAICompatible({
        name: "lovable",
        baseURL: PROVIDER_BASE_URL[credential.provider as Exclude<AiProvider, "lovable">],
        apiKey: credential.apiKey,
      }),
    };
  }

  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Nenhuma chave de IA configurada.");

  return {
    provider: "lovable" as AiProvider,
    client: createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    }),
  };
}

export function friendlyAiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : "Falha ao consultar o modelo de IA.";
  if (msg.includes("429")) return new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
  if (msg.includes("402")) return new Error("Créditos de IA esgotados.");
  if (msg.includes("401") || msg.includes("403")) {
    return new Error("Chave de API de IA inválida ou sem permissão. Revise em Agentes IA → Chave de IA.");
  }
  return new Error(msg);
}
