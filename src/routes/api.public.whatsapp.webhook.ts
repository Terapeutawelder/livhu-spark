import { createFileRoute } from "@tanstack/react-router";

/**
 * Meta WhatsApp Cloud API webhook.
 * URL: https://<host>/api/public/whatsapp/webhook?channel=<channel_id>
 * GET  = verification handshake
 * POST = message / status callback
 *
 * The channel query param routes the callback to the right tenant.
 */
export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const channelId = url.searchParams.get("channel");
        if (mode !== "subscribe" || !challenge || !channelId) {
          return new Response("bad request", { status: 400 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });
        const { data: ch } = await admin
          .from("whatsapp_channels")
          .select("webhook_verify_token")
          .eq("id", channelId)
          .maybeSingle();
        if (!ch || ch.webhook_verify_token !== token) {
          return new Response("forbidden", { status: 403 });
        }
        return new Response(challenge, { status: 200 });
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const channelId = url.searchParams.get("channel");
        if (!channelId) return new Response("missing channel", { status: 400 });

        const raw = await request.text();
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });
        const { data: ch } = await admin
          .from("whatsapp_channels")
          .select("id, tenant_id, app_secret")
          .eq("id", channelId)
          .maybeSingle();
        if (!ch) return new Response("channel not found", { status: 404 });

        if (ch.app_secret) {
          const { verifyWebhookSignature } = await import("@/lib/whatsapp.server");
          const sigHeader = request.headers.get("x-hub-signature-256");
          const ok = await verifyWebhookSignature(raw, sigHeader, ch.app_secret);
          if (!ok) return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

        for (const entry of payload?.entry ?? []) {
          for (const change of entry?.changes ?? []) {
            const value = change?.value ?? {};
            // Inbound messages
            for (const m of value.messages ?? []) {
              const waFrom: string = m.from;
              const profileName: string = value.contacts?.[0]?.profile?.name ?? waFrom;
              // upsert conversation
              const { data: conv } = await admin
                .from("whatsapp_conversations")
                .upsert(
                  {
                    tenant_id: ch.tenant_id,
                    channel_id: ch.id,
                    wa_contact_id: waFrom,
                    phone: waFrom,
                    display_name: profileName,
                    status: "open",
                    last_message_at: new Date().toISOString(),
                    last_message_direction: "inbound",
                    last_message_preview: extractPreview(m),
                    window_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                  },
                  { onConflict: "channel_id,wa_contact_id" },
                )
                .select("id, unread_count")
                .maybeSingle();

              if (conv) {
                await admin
                  .from("whatsapp_conversations")
                  .update({ unread_count: (conv.unread_count ?? 0) + 1 })
                  .eq("id", conv.id);
                await admin.from("whatsapp_messages").insert({
                  tenant_id: ch.tenant_id,
                  conversation_id: conv.id,
                  channel_id: ch.id,
                  wa_message_id: m.id,
                  direction: "inbound",
                  type: (m.type ?? "text") as any,
                  body: m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? null,
                  media_url: null,
                  media_mime: m[m.type]?.mime_type ?? null,
                  media_filename: m.document?.filename ?? null,
                  reply_to_wa_id: m.context?.id ?? null,
                  status: "delivered",
                  raw: m,
                });
              }
            }
            // Delivery / read status
            for (const s of value.statuses ?? []) {
              const patch: Record<string, unknown> = { status: s.status };
              if (s.status === "delivered") patch.delivered_at = new Date(Number(s.timestamp) * 1000).toISOString();
              if (s.status === "read") patch.read_at = new Date(Number(s.timestamp) * 1000).toISOString();
              await admin
                .from("whatsapp_messages")
                .update(patch)
                .eq("wa_message_id", s.id);
              await admin
                .from("whatsapp_broadcast_recipients")
                .update(patch)
                .eq("wa_message_id", s.id);
            }
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});

function extractPreview(m: any): string {
  if (m.text?.body) return m.text.body.slice(0, 140);
  if (m.image) return "[imagem]";
  if (m.audio) return "[áudio]";
  if (m.video) return "[vídeo]";
  if (m.document) return `[documento] ${m.document?.filename ?? ""}`.trim();
  if (m.interactive) return "[interativo]";
  return `[${m.type ?? "mensagem"}]`;
}
