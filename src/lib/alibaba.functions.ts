import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const getAlibabaChannel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context);
    const { data, error } = await context.supabase
      .from("whatsapp_channels")
      .select("id, display_name, phone_number, alibaba_region, alibaba_access_key_id, alibaba_cust_space_id, onboarding_step, status, last_error, last_synced_at")
      .eq("tenant_id", tenantId)
      .eq("provider", "alibaba")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  });

const AlibabaInput = z.object({
  id: z.string().uuid().optional(),
  display_name: z.string().trim().min(1).max(80),
  phone_number: z.string().trim().min(6).max(30),
  alibaba_region: z.string().trim().min(3).max(40).default("ap-southeast-1"),
  alibaba_access_key_id: z.string().trim().min(6).max(120),
  alibaba_access_key_secret: z.string().trim().min(6).max(300).optional().or(z.literal("")),
  alibaba_cust_space_id: z.string().trim().max(120).optional().or(z.literal("")),
  onboarding_step: z.number().int().min(0).max(6).default(0),
});

export const saveAlibabaChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AlibabaInput.parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { encryptToken } = await import("./token-crypto.server");

    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      provider: "alibaba",
      display_name: data.display_name,
      phone_number: data.phone_number,
      alibaba_region: data.alibaba_region,
      alibaba_access_key_id: data.alibaba_access_key_id,
      alibaba_cust_space_id: data.alibaba_cust_space_id || null,
      onboarding_step: data.onboarding_step,
      is_coexistence: false,
    };
    if (data.alibaba_access_key_secret) {
      payload["alibaba_access_key_secret"] = await encryptToken(data.alibaba_access_key_secret);
    }

    if (data.id) {
      const { error } = await context.supabase
        .from("whatsapp_channels")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }

    if (!data.alibaba_access_key_secret) {
      throw new Error("Informe o Access Key Secret da Alibaba Cloud.");
    }
    payload["status"] = "pending";
    const { data: row, error } = await context.supabase
      .from("whatsapp_channels")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const testAlibabaChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: ch, error } = await context.supabase
      .from("whatsapp_channels")
      .select("alibaba_region, alibaba_access_key_id, alibaba_access_key_secret, alibaba_cust_space_id, phone_number")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !ch) throw new Error("Canal não encontrado.");
    if (!ch.alibaba_access_key_secret) throw new Error("Credenciais incompletas. Salve o Access Key Secret novamente.");

    const { decryptToken } = await import("./token-crypto.server");
    const { listPhoneNumbers } = await import("./alibaba-cams.server");
    const secret = await decryptToken(ch.alibaba_access_key_secret);

    try {
      const result = await listPhoneNumbers({
        accessKeyId: ch.alibaba_access_key_id,
        accessKeySecret: secret,
        region: ch.alibaba_region || "ap-southeast-1",
        custSpaceId: ch.alibaba_cust_space_id,
      });
      const numbers: any[] = result?.Data?.PhoneNumbers ?? result?.PhoneNumbers ?? [];
      await context.supabase
        .from("whatsapp_channels")
        .update({
          status: "active",
          last_error: null,
          last_synced_at: new Date().toISOString(),
          onboarding_step: 5,
        })
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      return {
        ok: true,
        numbers: numbers.map((n) => ({
          phone: n?.PhoneNumber ?? n?.phoneNumber ?? null,
          status: n?.VerifiedStatus ?? n?.Status ?? null,
          name: n?.VerifiedName ?? n?.DisplayName ?? null,
        })),
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao conectar à Alibaba Cloud.";
      await context.supabase
        .from("whatsapp_channels")
        .update({ status: "error", last_error: message })
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      return { ok: false, error: message, numbers: [] as { phone: string | null; status: string | null; name: string | null }[] };
    }
  });

export const sendAlibabaTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), to: z.string().trim().min(8).max(30), text: z.string().trim().min(1).max(600) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: ch, error } = await context.supabase
      .from("whatsapp_channels")
      .select("alibaba_region, alibaba_access_key_id, alibaba_access_key_secret, alibaba_cust_space_id, phone_number")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !ch) throw new Error("Canal não encontrado.");
    if (!ch.alibaba_access_key_secret) throw new Error("Credenciais incompletas.");

    const { decryptToken } = await import("./token-crypto.server");
    const { camsSendText } = await import("./alibaba-cams.server");
    const secret = await decryptToken(ch.alibaba_access_key_secret);

    try {
      await camsSendText(
        {
          accessKeyId: ch.alibaba_access_key_id,
          accessKeySecret: secret,
          region: ch.alibaba_region || "ap-southeast-1",
          custSpaceId: ch.alibaba_cust_space_id,
          from: (ch.phone_number || "").replace(/\D/g, ""),
        },
        data.to.replace(/\D/g, ""),
        data.text,
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha no envio." };
    }
  });
