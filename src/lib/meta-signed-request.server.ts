/**
 * Parse and verify a Facebook/Meta signed_request payload.
 * Used by Deauthorize and Data Deletion callbacks.
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface SignedRequestPayload {
  user_id: string;
  algorithm?: string;
  issued_at?: number;
  [k: string]: unknown;
}

export async function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<SignedRequestPayload> {
  const [encodedSig, encodedPayload] = signedRequest.split(".");
  if (!encodedSig || !encodedPayload) throw new Error("signed_request malformado");

  const sig = b64urlDecode(encodedSig);
  const payloadBytes = b64urlDecode(encodedPayload);
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SignedRequestPayload;
  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    throw new Error(`algoritmo não suportado: ${payload.algorithm}`);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)),
  );
  if (expected.length !== sig.length) throw new Error("assinatura inválida");
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ sig[i];
  if (diff !== 0) throw new Error("assinatura inválida");
  return payload;
}
