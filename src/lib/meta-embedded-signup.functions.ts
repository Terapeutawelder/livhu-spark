import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Meta Embedded Signup helpers.
 *
 * Flow:
 *  1. Frontend opens FB.login({ config_id }) with WhatsApp Embedded Signup config.
 *  2. Meta returns { code, phone_number_id, waba_id } (via message event).
 *  3. Frontend calls exchangeMetaCode({ code, phone_number_id, waba_id }).
 *  4. Server exchanges short-lived code -> long-lived System User token
 *     (per-tenant), subscribes the WABA webhook, and persists a channel row.
 */

async function getTenantId(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.tenant_id) throw new Error("Consultório não encontrado.");
  return data.tenant_id as string;
}

const GRAPH = "https://graph.facebook.com/v20.0";

export const getEmbeddedSignupConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      appId: process.env.META_APP_ID ?? null,
      configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? null,
      configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_EMBEDDED_SIGNUP_CONFIG_ID),
    };
  });

const ExchangeInput = z.object({
  code: z.string().min(10),
  phone_number_id: z.string().min(3).optional(),
  waba_id: z.string().min(3).optional(),
});

export const exchangeMetaCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ExchangeInput.parse(i))
  .handler(async ({ data, context }) => {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("Integração com a Meta ainda não configurada pelo super admin.");
    }
    const tenantId = await getTenantId(context);

    // Step 1: exchange code -> access token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(data.code)}`,
    );
    const tokenJson: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson?.error?.message ?? "Falha ao trocar código pela Meta.");
    }
    const accessToken: string = tokenJson.access_token;

    // Step 2: resolve WABA + phone if not supplied
    let wabaId = data.waba_id;
    let phoneId = data.phone_number_id;
    let displayPhone = "";
    let verifiedName = "";

    if (!wabaId) {
      const debugRes = await fetch(`${GRAPH}/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`);
      const debug: any = await debugRes.json().catch(() => ({}));
      const scoped = debug?.data?.granular_scopes?.find((s: any) => s.scope === "whatsapp_business_management");
      wabaId = scoped?.target_ids?.[0];
    }
    if (wabaId && !phoneId) {
      const phonesRes = await fetch(`${GRAPH}/${wabaId}/phone_numbers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const phones: any = await phonesRes.json().catch(() => ({}));
      const first = phones?.data?.[0];
      if (first) {
        phoneId = first.id;
        displayPhone = first.display_phone_number ?? "";
        verifiedName = first.verified_name ?? "";
      }
    } else if (phoneId) {
      const phoneRes = await fetch(`${GRAPH}/${phoneId}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const p: any = await phoneRes.json().catch(() => ({}));
      displayPhone = p?.display_phone_number ?? "";
      verifiedName = p?.verified_name ?? "";
    }

    if (!wabaId || !phoneId) {
      throw new Error("Não foi possível identificar o WABA/número. Selecione manualmente e tente novamente.");
    }

    // Step 3: subscribe our app to the WABA webhook (best effort)
    await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});

    // Step 4: persist channel (encrypt token at rest)
    const { encryptToken } = await import("./token-crypto.server");
    const encToken = await encryptToken(accessToken);
    const normalizedPhone = displayPhone.replace(/[^\d]/g, "") || phoneId;

    const { data: existing } = await context.supabase
      .from("whatsapp_channels")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_number_id", phoneId)
      .maybeSingle();

    const payload = {
      tenant_id: tenantId,
      display_name: verifiedName || displayPhone || "WhatsApp",
      phone_number: normalizedPhone,
      phone_number_id: phoneId,
      waba_id: wabaId,
      access_token: encToken,
      is_coexistence: true,
      status: "active" as const,
      last_error: null,
      last_synced_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await context.supabase.from("whatsapp_channels").update(payload).eq("id", existing.id);
      return { id: existing.id, waba_id: wabaId, phone_number_id: phoneId };
    }
    const { data: row, error } = await context.supabase
      .from("whatsapp_channels")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string, waba_id: wabaId, phone_number_id: phoneId };
  });
