import { createFileRoute } from "@tanstack/react-router";

/**
 * EvolutionGo Webhook receiver.
 * URL: https://<host>/api/public/evolution/webhook
 */
export const Route = createFileRoute("/api/public/evolution/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });

        let payload: any;
        try { payload = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

        // Log webhook
        await admin.from("whatsapp_evolution_webhooks" as any).insert({
          instance_name: payload.instance,
          event: payload.event,
          payload: payload
        });

        const event = payload.event;
        const instanceName = payload.instance;

        if (event === "MESSAGES_UPSERT") {
          const message = payload.data?.message;
          if (!message || message.key.fromMe) return new Response("ok");

          // Encontrar tenant/user da instância
          const { data: inst } = await admin
            .from("whatsapp_evolution_instances" as any)
            .select("tenant_id, user_id")
            .eq("instance_name", instanceName)
            .maybeSingle();

          if (!inst) return new Response("instance not found", { status: 404 });

          const tenantId = (inst as any).tenant_id;
          const remoteJid = message.key.remoteJid; // e.g. 5511987650000@s.whatsapp.net
          const phone = remoteJid.split("@")[0];
          const pushName = payload.data?.pushName || phone;
          
          let body = "";
          if (message.message?.conversation) body = message.message.conversation;
          else if (message.message?.extendedTextMessage?.text) body = message.message.extendedTextMessage.text;
          else if (message.message?.imageMessage?.caption) body = message.message.imageMessage.caption;

          // Upsert conversation (reusing WhatsApp Cloud tables for inbox integration)
          const { data: conv } = await admin
            .from("whatsapp_conversations")
            .upsert(
              {
                tenant_id: tenantId,
                wa_contact_id: remoteJid,
                phone: phone,
                display_name: pushName,
                status: "open",
                last_message_at: new Date().toISOString(),
                last_message_direction: "inbound",
                last_message_preview: body.slice(0, 140) || "[Mídia]",
              },
              { onConflict: "wa_contact_id" }
            )
            .select("id, unread_count")
            .maybeSingle();


          if (conv) {
            await admin
              .from("whatsapp_conversations")
              .update({ unread_count: (conv.unread_count ?? 0) + 1 })
              .eq("id", conv.id);
            
            await admin.from("whatsapp_messages").insert({
              tenant_id: tenantId,
              conversation_id: conv.id,
              wa_message_id: message.key.id,
              direction: "inbound",
              type: "text", // simplify for MVP
              body: body,
              status: "delivered",
              raw: payload
            });
          }
        }

        if (event === "QRCODE_UPDATED") {
          await admin
            .from("whatsapp_evolution_instances" as any)
            .update({ qrcode: payload.data?.qrcode?.base64, status: "qrcode_ready" } as any)
            .eq("instance_name", instanceName);
        }

        if (event === "CONNECTION_UPDATE") {
          const state = payload.data?.state;
          let status = "disconnected";
          if (state === "open") status = "connected";
          if (state === "connecting") status = "connecting";
          
          await admin
            .from("whatsapp_evolution_instances" as any)
            .update({ status } as any)
            .eq("instance_name", instanceName);
        }

        return new Response("ok");
      },
    },
  },
});
