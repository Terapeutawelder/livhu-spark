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

// ---------------- Channels ----------------

export const listChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context);
    const { data, error } = await context.supabase
      .from("whatsapp_channels")
      .select("id, display_name, phone_number, phone_number_id, waba_id, is_coexistence, status, last_error, last_synced_at, webhook_verify_token, updated_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

const ChannelInput = z.object({
  id: z.string().uuid().optional(),
  display_name: z.string().min(1).max(80),
  phone_number: z.string().min(6).max(30),
  phone_number_id: z.string().min(3).max(60),
  waba_id: z.string().min(3).max(60).optional().or(z.literal("")),
  business_id: z.string().max(60).optional().or(z.literal("")),
  access_token: z.string().min(10).max(2000),
  app_secret: z.string().min(6).max(200).optional().or(z.literal("")),
  is_coexistence: z.boolean().default(true),
});

export const upsertChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ChannelInput.parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { encryptToken } = await import("./token-crypto.server");
    const payload = {
      tenant_id: tenantId,
      display_name: data.display_name,
      phone_number: data.phone_number,
      phone_number_id: data.phone_number_id,
      waba_id: data.waba_id || null,
      business_id: data.business_id || null,
      access_token: await encryptToken(data.access_token),
      app_secret: data.app_secret || null,
      is_coexistence: data.is_coexistence,
      status: "active" as const,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("whatsapp_channels")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("whatsapp_channels")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const deleteChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { error } = await context.supabase
      .from("whatsapp_channels")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", tenantId);
    if (error) throw error;
    return { ok: true };
  });

export const testChannelConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: ch, error } = await context.supabase
      .from("whatsapp_channels")
      .select("phone_number_id, access_token")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !ch) throw new Error("Canal não encontrado.");
    const { decryptToken } = await import("./token-crypto.server");
    const token = await decryptToken(ch.access_token);
    const res = await fetch(`https://graph.facebook.com/v20.0/${ch.phone_number_id}?fields=verified_name,display_phone_number`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      await context.supabase.from("whatsapp_channels").update({
        status: "error",
        last_error: body?.error?.message ?? `HTTP ${res.status}`,
      }).eq("id", data.id);
      throw new Error(body?.error?.message ?? "Falha ao conectar à Meta.");
    }
    await context.supabase.from("whatsapp_channels").update({
      status: "active",
      last_error: null,
      last_synced_at: new Date().toISOString(),
    }).eq("id", data.id);
    return body;
  });

export const checkChannelWabaConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: ch, error } = await context.supabase
      .from("whatsapp_channels")
      .select("phone_number_id, waba_id, access_token")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !ch) throw new Error("Canal não encontrado.");
    if (!ch.waba_id) return { conflict: false, configuredWaba: null, actualWaba: null };
    const { decryptToken } = await import("./token-crypto.server");
    const token = await decryptToken(ch.access_token);
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${ch.phone_number_id}?fields=account_id,verified_name,display_phone_number`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { conflict: false, configuredWaba: ch.waba_id, actualWaba: null, error: body?.error?.message };
    const actualWaba = body?.account_id ?? null;
    const conflict = actualWaba !== null && actualWaba !== ch.waba_id;
    return {
      conflict,
      configuredWaba: ch.waba_id,
      actualWaba,
      displayPhoneNumber: body?.display_phone_number ?? null,
      verifiedName: body?.verified_name ?? null,
    };
  });

// ---------------- Conversations & messages ----------------

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ status: z.enum(["open", "pending", "resolved", "snoozed", "archived", "all"]).default("open") }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    let q = context.supabase
      .from("whatsapp_conversations")
      .select("id, display_name, phone, profile_pic_url, status, tags, unread_count, last_message_at, last_message_preview, last_message_direction, assigned_to")
      .eq("tenant_id", tenantId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ conversationId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: conv, error: cErr } = await context.supabase
      .from("whatsapp_conversations")
      .select("id, display_name, phone, tags, status, assigned_to, channel_id, contact_id, wa_contact_id")
      .eq("id", data.conversationId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!conv) throw new Error("Conversa não encontrada.");
    const { data: msgs, error } = await context.supabase
      .from("whatsapp_messages")
      .select("id, direction, type, body, media_url, media_mime, media_filename, template_name, status, sent_at, delivered_at, read_at, sender_user_id")
      .eq("conversation_id", data.conversationId)
      .order("sent_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    // mark read
    await context.supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", data.conversationId);
    return { conversation: conv, messages: msgs ?? [] };
  });

export const sendConversationMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      conversationId: z.string().uuid(),
      body: z.string().min(1).max(4096).optional(),
      media: z.object({
        url: z.string().url(),
        mime: z.string().min(1),
        filename: z.string().optional(),
        kind: z.enum(["image", "audio", "video", "document"]),
      }).optional(),
    }).refine((v) => v.body || v.media, "Envie texto ou mídia.").parse(i),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: conv, error: cErr } = await context.supabase
      .from("whatsapp_conversations")
      .select("id, tenant_id, channel_id, phone")
      .eq("id", data.conversationId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (cErr || !conv) throw new Error("Conversa não encontrada.");
    if (!conv.channel_id) throw new Error("Conversa sem canal WhatsApp vinculado.");

    const { data: channel, error: chErr } = await context.supabase
      .from("whatsapp_channels")
      .select("id, phone_number_id, access_token, waba_id, status")
      .eq("id", conv.channel_id)
      .maybeSingle();
    if (chErr || !channel) throw new Error("Canal não encontrado.");
    if (!channel.phone_number_id || !channel.access_token) throw new Error("Canal incompleto.");

    const { decryptToken } = await import("./token-crypto.server");
    const creds = {
      phoneNumberId: channel.phone_number_id,
      accessToken: await decryptToken(channel.access_token),
      wabaId: channel.waba_id,
    };
    const { sendText, sendMedia } = await import("./whatsapp.server");
    let waResp: any;
    try {
      if (data.media) {
        waResp = await sendMedia(creds, conv.phone, data.media.kind, data.media.url, {
          caption: data.body,
          filename: data.media.filename,
        });
      } else {
        waResp = await sendText(creds, conv.phone, data.body!);
      }
    } catch (err: any) {
      // persist as failed
      await context.supabase.from("whatsapp_messages").insert({
        tenant_id: tenantId,
        conversation_id: conv.id,
        channel_id: channel.id,
        direction: "outbound",
        type: data.media?.kind ?? "text",
        body: data.body,
        media_url: data.media?.url,
        media_mime: data.media?.mime,
        media_filename: data.media?.filename,
        sender_user_id: context.userId,
        status: "failed",
        error: String(err?.message ?? err),
      });
      throw new Error(err?.message ?? "Falha ao enviar pelo WhatsApp.");
    }

    const waId = waResp?.messages?.[0]?.id ?? null;
    const { data: inserted, error: iErr } = await context.supabase
      .from("whatsapp_messages")
      .insert({
        tenant_id: tenantId,
        conversation_id: conv.id,
        channel_id: channel.id,
        wa_message_id: waId,
        direction: "outbound",
        type: data.media?.kind ?? "text",
        body: data.body,
        media_url: data.media?.url,
        media_mime: data.media?.mime,
        media_filename: data.media?.filename,
        sender_user_id: context.userId,
        status: "sent",
      })
      .select("id")
      .single();
    if (iErr) throw iErr;

    await context.supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: data.body ?? `[${data.media?.kind ?? "mídia"}]`,
        last_message_direction: "outbound",
      })
      .eq("id", conv.id);

    return { id: inserted.id, wa_message_id: waId };
  });

export const updateConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      conversationId: z.string().uuid(),
      status: z.enum(["open", "pending", "resolved", "snoozed", "archived"]).optional(),
      assigned_to: z.string().uuid().nullable().optional(),
      tags: z.array(z.string()).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const patch: Record<string, any> = {};
    if (data.status) patch.status = data.status;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    if (data.tags) patch.tags = data.tags;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await (context.supabase as any)
      .from("whatsapp_conversations")
      .update(patch)
      .eq("id", data.conversationId)
      .eq("tenant_id", tenantId);
    if (error) throw error;
    return { ok: true };
  });

// ---------------- Media upload ----------------

export const createMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      filename: z.string().min(1).max(200),
      mime: z.string().min(1).max(120),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const safe = data.filename.replace(/[^\w.\-]+/g, "_");
    const path = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { data: signed, error } = await context.supabase
      .storage.from("whatsapp-media")
      .createSignedUploadUrl(path);
    if (error) throw error;
    const { data: pub } = context.supabase.storage.from("whatsapp-media").getPublicUrl(path);
    return { path, uploadUrl: signed.signedUrl, token: signed.token, publicUrl: pub.publicUrl };
  });

// ---------------- Quick replies ----------------

export const listQuickReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context);
    const { data, error } = await context.supabase
      .from("whatsapp_quick_replies")
      .select("id, shortcut, body")
      .eq("tenant_id", tenantId)
      .order("shortcut");
    if (error) throw error;
    return data ?? [];
  });

// ---------------- Templates ----------------

export const listTemplatesLocal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context);
    const { data, error } = await context.supabase
      .from("whatsapp_templates")
      .select("id, name, language, category, status, body_text, variables_count, channel_id, synced_at")
      .eq("tenant_id", tenantId)
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const syncTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ channelId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: ch, error } = await context.supabase
      .from("whatsapp_channels")
      .select("id, waba_id, access_token")
      .eq("id", data.channelId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !ch) throw new Error("Canal não encontrado.");
    if (!ch.waba_id || !ch.access_token) throw new Error("Configure o WABA ID e o token para sincronizar templates.");
    const { listTemplates } = await import("./whatsapp.server");
    const { decryptToken } = await import("./token-crypto.server");
    const res = await listTemplates(ch.waba_id, await decryptToken(ch.access_token));
    const items: any[] = res?.data ?? [];
    const rows = items.map((t) => {
      const body = (t.components ?? []).find((c: any) => c.type === "BODY");
      const text = body?.text ?? "";
      const varCount = (text.match(/\{\{\d+\}\}/g) ?? []).length;
      return {
        tenant_id: tenantId,
        channel_id: ch.id,
        external_id: t.id ?? null,
        name: t.name,
        language: t.language ?? "pt_BR",
        category: t.category ?? "MARKETING",
        status: (t.status ?? "pending").toLowerCase(),
        body_text: text,
        components: t.components ?? [],
        variables_count: varCount,
        synced_at: new Date().toISOString(),
      };
    });
    if (rows.length) {
      const { error: upErr } = await context.supabase
        .from("whatsapp_templates")
        .upsert(rows, { onConflict: "channel_id,name,language" });
      if (upErr) throw upErr;
    }
    return { imported: rows.length };
  });

// ---------------- Broadcasts ----------------

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context);
    const { data, error } = await context.supabase
      .from("whatsapp_broadcasts")
      .select("id, name, status, scheduled_at, started_at, completed_at, total_recipients, sent_count, delivered_count, read_count, failed_count, template_id, channel_id, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const BroadcastInput = z.object({
  name: z.string().min(1).max(120),
  channelId: z.string().uuid(),
  templateId: z.string().uuid(),
  variables: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
  contactIds: z.array(z.string().uuid()).min(1).max(5000),
});

export const createBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BroadcastInput.parse(i))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context);
    const { data: contacts, error: cErr } = await context.supabase
      .from("contacts")
      .select("id, phone, full_name")
      .eq("tenant_id", tenantId)
      .in("id", data.contactIds);
    if (cErr) throw cErr;
    const valid = (contacts ?? []).filter((c: any) => c.phone);
    if (!valid.length) throw new Error("Nenhum contato com telefone válido.");

    const { data: bc, error } = await context.supabase
      .from("whatsapp_broadcasts")
      .insert({
        tenant_id: tenantId,
        channel_id: data.channelId,
        template_id: data.templateId,
        name: data.name,
        template_variables: { defaults: data.variables },
        scheduled_at: data.scheduledAt ?? null,
        total_recipients: valid.length,
        status: data.scheduledAt ? "scheduled" : "running",
        started_at: data.scheduledAt ? null : new Date().toISOString(),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    const recips = valid.map((c: any) => ({
      tenant_id: tenantId,
      broadcast_id: bc.id,
      contact_id: c.id,
      phone: c.phone,
    }));
    const { error: rErr } = await context.supabase
      .from("whatsapp_broadcast_recipients")
      .insert(recips);
    if (rErr) throw rErr;

    // Fire-and-forget send when not scheduled
    if (!data.scheduledAt) {
      queueMicrotask(() => runBroadcastSend(bc.id, tenantId).catch((e) => console.error("broadcast", e)));
    }
    return { id: bc.id, total: valid.length };
  });

async function runBroadcastSend(broadcastId: string, tenantId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: bc } = await admin
    .from("whatsapp_broadcasts")
    .select("id, channel_id, template_id, template_variables")
    .eq("id", broadcastId)
    .maybeSingle();
  if (!bc) return;
  const [{ data: channel }, { data: template }, { data: recips }] = await Promise.all([
    admin.from("whatsapp_channels").select("phone_number_id, access_token, waba_id").eq("id", bc.channel_id).maybeSingle(),
    admin.from("whatsapp_templates").select("name, language").eq("id", bc.template_id).maybeSingle(),
    admin.from("whatsapp_broadcast_recipients").select("id, phone").eq("broadcast_id", broadcastId).eq("status", "queued"),
  ]);
  if (!channel || !template) {
    await admin.from("whatsapp_broadcasts").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", broadcastId);
    return;
  }
  const { sendTemplate } = await import("./whatsapp.server");
  const { decryptToken } = await import("./token-crypto.server");
  const decryptedToken = await decryptToken(channel.access_token);
  const vars: string[] = (bc.template_variables as any)?.defaults ?? [];
  let sent = 0, failed = 0;
  for (const r of recips ?? []) {
    try {
      const res = await sendTemplate(
        { phoneNumberId: channel.phone_number_id, accessToken: decryptedToken, wabaId: channel.waba_id },
        r.phone,
        template.name,
        template.language,
        vars,
      );
      const wid = res?.messages?.[0]?.id ?? null;
      await admin.from("whatsapp_broadcast_recipients").update({
        status: "sent", wa_message_id: wid, sent_at: new Date().toISOString(),
      }).eq("id", r.id);
      sent++;
    } catch (e: any) {
      await admin.from("whatsapp_broadcast_recipients").update({
        status: "failed", error: String(e?.message ?? e),
      }).eq("id", r.id);
      failed++;
    }
  }
  await admin.from("whatsapp_broadcasts").update({
    status: "completed",
    sent_count: sent,
    failed_count: failed,
    completed_at: new Date().toISOString(),
  }).eq("id", broadcastId);
}
