import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NOTIFICATION_EVENTS } from "@/lib/notifications.templates";

const eventEnum = z.enum(NOTIFICATION_EVENTS);
const channelEnum = z.enum(["whatsapp", "email"]);

async function tenantOf(supabase: any) {
  const { data } = await supabase.rpc("current_tenant_id");
  if (!data) throw new Error("Consultório não encontrado.");
  return data as string;
}

export const getNotificationConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const tenantId = await tenantOf(supabase);

    const [{ data: settings }, { data: templates }, { data: jobs }] = await Promise.all([
      supabase.from("notification_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("notification_templates").select("*").eq("tenant_id", tenantId),
      supabase
        .from("notification_jobs")
        .select("id, event, channel, status, send_at, sent_at, to_phone, to_email, last_error")
        .eq("tenant_id", tenantId)
        .order("send_at", { ascending: false })
        .limit(50),
    ]);

    return {
      tenantId,
      settings: settings ?? null,
      templates: templates ?? [],
      jobs: jobs ?? [],
    };
  });

export const saveNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        whatsapp_enabled: z.boolean(),
        email_enabled: z.boolean(),
        events: z.record(z.string(), z.boolean()),
        reminder_offsets: z.array(z.number().int().min(5).max(20160)).max(6),
        quiet_start: z.number().int().min(0).max(23),
        quiet_end: z.number().int().min(0).max(23),
        sender_name: z.string().trim().max(80).optional().default(""),
        reply_to: z.string().trim().max(160).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const tenantId = await tenantOf(supabase);
    const { error } = await supabase.from("notification_settings").upsert(
      {
        tenant_id: tenantId,
        whatsapp_enabled: data.whatsapp_enabled,
        email_enabled: data.email_enabled,
        events: data.events,
        reminder_offsets: data.reminder_offsets,
        quiet_start: data.quiet_start,
        quiet_end: data.quiet_end,
        sender_name: data.sender_name || null,
        reply_to: data.reply_to || null,
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        event: eventEnum,
        channel: channelEnum,
        subject: z.string().trim().max(200).optional().default(""),
        body: z.string().trim().min(1, "Escreva a mensagem").max(2000),
        wa_template_name: z.string().trim().max(80).optional().default(""),
        is_active: z.boolean().optional().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const tenantId = await tenantOf(supabase);
    const { error } = await supabase.from("notification_templates").upsert(
      {
        tenant_id: tenantId,
        event: data.event,
        channel: data.channel,
        subject: data.subject || null,
        body: data.body,
        wa_template_name: data.wa_template_name || null,
        is_active: data.is_active,
      },
      { onConflict: "tenant_id,event,channel" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        event: eventEnum,
        channel: channelEnum,
        to: z.string().trim().min(5).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const tenantId = await tenantOf(supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("notification_jobs").insert({
      tenant_id: tenantId,
      event: data.event,
      channel: data.channel,
      to_phone: data.channel === "whatsapp" ? data.to.replace(/\D/g, "") : null,
      to_email: data.channel === "email" ? data.to : null,
      send_at: new Date().toISOString(),
      payload: {
        title: "Sessão de teste",
        starts_at: new Date(Date.now() + 3600_000).toISOString(),
        modality: "online",
      },
      dedupe_key: `test:${tenantId}:${data.channel}:${Date.now()}`,
    });
    if (error) throw new Error(error.message);

    const { processDueNotifications } = await import("@/lib/notifications.server");
    const result = await processDueNotifications({ limit: 5 });
    return result;
  });

export const retryNotificationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("notification_jobs")
      .update({ status: "pending", attempts: 0, last_error: null, send_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const { processDueNotifications } = await import("@/lib/notifications.server");
    return processDueNotifications({ limit: 5 });
  });
