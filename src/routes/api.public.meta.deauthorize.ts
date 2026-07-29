import { createFileRoute } from "@tanstack/react-router";

/**
 * Meta Deauthorize Callback.
 * Called by Meta when a user removes the LivHub app from their Facebook account.
 * We revoke stored WhatsApp channels associated with that Meta user_id.
 */
export const Route = createFileRoute("/api/public/meta/deauthorize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const appSecret = process.env.META_APP_SECRET;
        if (!appSecret) {
          return jsonResp({ error: "META_APP_SECRET not configured" }, 500);
        }
        const form = await request.formData().catch(() => null);
        const signedRequest = form?.get("signed_request");
        if (typeof signedRequest !== "string") {
          return jsonResp({ error: "missing signed_request" }, 400);
        }
        const { parseSignedRequest } = await import("@/lib/meta-signed-request.server");
        let payload;
        try {
          payload = await parseSignedRequest(signedRequest, appSecret);
        } catch (err: any) {
          return jsonResp({ error: err?.message ?? "invalid signature" }, 401);
        }

        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });

        // Mark any channels linked to this Meta user as disabled.
        await admin
          .from("whatsapp_channels")
          .update({
            status: "disabled",
            access_token: "",
            last_error: "Usuário Meta revogou a autorização.",
          })
          .eq("business_id", payload.user_id);

        return jsonResp({ ok: true });
      },
    },
  },
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
