/**
 * Symmetric encryption for WhatsApp access tokens at rest.
 * Uses AES-GCM (Web Crypto, available in Cloudflare workerd).
 *
 * Ciphertext format: enc:v1:<base64(iv)>:<base64(cipher+tag)>
 * Anything that does not start with "enc:v1:" is treated as legacy plaintext
 * and returned as-is by decryptToken, so pre-migration rows keep working.
 */

const PREFIX = "enc:v1:";

function getKeyMaterial(): Uint8Array {
  const raw = process.env.WHATSAPP_TOKEN_ENC_KEY;
  if (!raw) throw new Error("WHATSAPP_TOKEN_ENC_KEY não configurada.");
  // Hash to derive a stable 32-byte key regardless of input length/format.
  const enc = new TextEncoder().encode(raw);
  return enc;
}

async function getKey() {
  const material = getKeyMaterial();
  const hash = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptToken(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${PREFIX}${b64encode(iv)}:${b64encode(new Uint8Array(cipher))}`;
}

export async function decryptToken(stored: string | null | undefined): Promise<string> {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext row
  const rest = stored.slice(PREFIX.length);
  const [ivB64, cipherB64] = rest.split(":");
  if (!ivB64 || !cipherB64) throw new Error("Token cifrado inválido.");
  const key = await getKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(cipherB64),
  );
  return new TextDecoder().decode(plain);
}
