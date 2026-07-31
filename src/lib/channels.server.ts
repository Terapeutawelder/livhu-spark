import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptToken } from "./token-crypto.server";
import type { ChannelSaveInput } from "./channels.schema";

/** Retorna o tenant do usuário autenticado (primeiro vínculo). */
export async function resolveTenantId(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.tenant_id as string) ?? null;
}

function hint(secret: string) {
  return secret.length > 6 ? `••••${secret.slice(-4)}` : "••••";
}

/** Monta a linha a persistir: segredos cifrados, resto em settings. */
export async function buildChannelRecord(input: ChannelSaveInput) {
  const base = {
    channel: input.channel,
    display_name: input.display_name,
    last_error: null as string | null,
    last_checked_at: new Date().toISOString(),
  };

  switch (input.channel) {
    case "instagram":
      return {
        ...base,
        account_id: input.ig_business_account_id,
        credentials_enc: await encryptToken(input.access_token),
        credential_hint: hint(input.access_token),
        status: "active" as const,
        settings: { page_id: input.page_id },
      };
    case "messenger":
      return {
        ...base,
        account_id: input.page_id,
        credentials_enc: await encryptToken(input.access_token),
        credential_hint: hint(input.access_token),
        status: "active" as const,
        settings: {},
      };
    case "tiktok":
      return {
        ...base,
        account_id: input.advertiser_id,
        credentials_enc: await encryptToken(input.access_token),
        credential_hint: hint(input.access_token),
        status: "active" as const,
        settings: {},
      };
    case "site":
      return {
        ...base,
        account_id: input.site_domain,
        credentials_enc: null,
        credential_hint: "",
        status: "active" as const,
        settings: { welcome_message: input.welcome_message ?? "" },
      };
    case "email":
      return {
        ...base,
        account_id: input.from_email,
        credentials_enc: null,
        credential_hint: "",
        status: "active" as const,
        settings: { reply_to: input.reply_to ?? "" },
      };
  }
}
