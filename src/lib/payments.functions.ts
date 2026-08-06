import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const settingsSchema = z.object({
  provider: z.enum(["mercadopago", "stripe"]),
  isActive: z.boolean(),
  currency: z.string().min(3).max(3),
  mpAccessToken: z.string().max(400).optional(),
  mpPublicKey: z.string().max(400).optional(),
  stripeSecret: z.string().max(400).optional(),
  stripePublishable: z.string().max(400).optional(),
  stripeWebhookSecret: z.string().max(400).optional(),
  meetingMode: z.enum(["virtual", "fixed", "none"]),
  fixedMeetingUrl: z.string().max(500).optional(),
});

async function currentTenantId(supabase: any): Promise<string | null> {
  const { data } = await supabase.rpc("current_tenant_id");
  return (data as string) ?? null;
}

export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await currentTenantId(context.supabase);
    if (!tenantId) return null;
    const { data } = await context.supabase
      .from("payment_settings")
      .select(
        "provider, is_active, currency, credential_hint, meeting_mode, fixed_meeting_url, mp_public_key, stripe_publishable, mp_access_token_enc, stripe_secret_enc",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!data) return null;
    return {
      provider: data.provider as "mercadopago" | "stripe",
      isActive: Boolean(data.is_active),
      currency: data.currency as string,
      credentialHint: (data.credential_hint as string) ?? "",
      meetingMode: (data.meeting_mode as "virtual" | "fixed" | "none") ?? "virtual",
      fixedMeetingUrl: (data.fixed_meeting_url as string) ?? "",
      mpPublicKey: (data.mp_public_key as string) ?? "",
      stripePublishable: (data.stripe_publishable as string) ?? "",
      hasMpToken: Boolean(data.mp_access_token_enc),
      hasStripeSecret: Boolean(data.stripe_secret_enc),
    };
  });

export const savePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await currentTenantId(context.supabase);
    if (!tenantId) return { ok: false as const, error: "Consultório não encontrado." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptToken } = await import("@/lib/token-crypto.server");

    const patch: Record<string, unknown> = {
      tenant_id: tenantId,
      provider: data.provider,
      is_active: data.isActive,
      currency: data.currency.toUpperCase(),
      meeting_mode: data.meetingMode,
      fixed_meeting_url: data.fixedMeetingUrl || null,
      mp_public_key: data.mpPublicKey || null,
      stripe_publishable: data.stripePublishable || null,
    };

    if (data.mpAccessToken) {
      patch.mp_access_token_enc = await encryptToken(data.mpAccessToken);
      patch.credential_hint = `•••${data.mpAccessToken.slice(-4)}`;
    }
    if (data.stripeSecret) {
      patch.stripe_secret_enc = await encryptToken(data.stripeSecret);
      patch.credential_hint = `•••${data.stripeSecret.slice(-4)}`;
    }
    if (data.stripeWebhookSecret) {
      patch.stripe_webhook_secret_enc = await encryptToken(data.stripeWebhookSecret);
    }

    const { error } = await supabaseAdmin
      .from("payment_settings")
      .upsert(patch as never, { onConflict: "tenant_id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listPaymentOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await currentTenantId(context.supabase);
    if (!tenantId) return [];
    const { data } = await context.supabase
      .from("payment_orders")
      .select("id, amount_cents, currency, status, plan_id, checkout_url, paid_at, created_at, contact_id")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(25);
    return data ?? [];
  });
