/**
 * WhatsApp Cloud API helpers (server-only).
 * Never import from client components — this file talks to Meta Graph API.
 */

const GRAPH = "https://graph.facebook.com/v20.0";

export interface ChannelCreds {
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string | null;
}

async function graph(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  let json: any = null;
  try { json = body ? JSON.parse(body) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const msg = json?.error?.message ?? body ?? `Graph ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function sendText(creds: ChannelCreds, to: string, text: string) {
  return graph(`/${creds.phoneNumberId}/messages`, creds.accessToken, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text, preview_url: true },
    }),
  });
}

export async function sendMedia(
  creds: ChannelCreds,
  to: string,
  kind: "image" | "audio" | "video" | "document",
  link: string,
  opts: { caption?: string; filename?: string } = {},
) {
  const media: Record<string, any> = { link };
  if (opts.caption && kind !== "audio") media.caption = opts.caption;
  if (opts.filename && kind === "document") media.filename = opts.filename;
  return graph(`/${creds.phoneNumberId}/messages`, creds.accessToken, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: kind,
      [kind]: media,
    }),
  });
}

export async function sendTemplate(
  creds: ChannelCreds,
  to: string,
  templateName: string,
  language: string,
  variables: string[] = [],
) {
  const components = variables.length
    ? [{
        type: "body",
        parameters: variables.map((v) => ({ type: "text", text: v })),
      }]
    : [];
  return graph(`/${creds.phoneNumberId}/messages`, creds.accessToken, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    }),
  });
}

export async function listTemplates(wabaId: string, token: string) {
  return graph(`/${wabaId}/message_templates?limit=200`, token);
}

export async function getMediaUrl(mediaId: string, token: string) {
  return graph(`/${mediaId}`, token);
}

/**
 * Verify Meta webhook signature (X-Hub-Signature-256, sha256=<hex>).
 * Uses Web Crypto (available in Cloudflare workerd).
 */
export async function verifyWebhookSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header || !header.startsWith("sha256=")) return false;
  const expectedHex = header.slice("sha256=".length).trim();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
}

export function normalizePhone(p: string) {
  return p.replace(/[^\d]/g, "");
}
