import { createFileRoute } from "@tanstack/react-router";

/**
 * Meta Data Deletion Callback.
 * Meta requires this URL to receive user-initiated data-deletion requests.
 * Must return JSON { url, confirmation_code } within 24h.
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export const Route = createFileRoute("/api/public/meta/data-deletion")({
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

        const confirmationCode = `del_${payload.user_id}_${Date.now().toString(36)}`;

        // Record a support ticket / audit row for the deletion request.
        await admin.from("support_tickets").insert({
          code: confirmationCode,
          subject: "Solicitação de exclusão de dados (Meta)",
          body: `Meta user_id: ${payload.user_id}. Iniciar processo de exclusão em até 30 dias.`,
          priority: "high",
          status: "open",
        });

        // Best-effort: revoke and clear tokens for any channels linked to this Meta user.
        await admin
          .from("whatsapp_channels")
          .update({
            status: "disabled",
            access_token: "",
            last_error: "Solicitação de exclusão de dados recebida da Meta.",
          })
          .eq("business_id", payload.user_id);

        const origin = new URL(request.url).origin;
        return jsonResp({
          url: `${origin}/exclusao-de-dados?code=${encodeURIComponent(confirmationCode)}`,
          confirmation_code: confirmationCode,
        });
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
