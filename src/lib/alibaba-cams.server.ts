/**
 * Alibaba Cloud — Chat App Message Service (CAMS) helpers (server-only).
 * CAMS is a Meta BSP: it exposes the WhatsApp Business API through Alibaba Cloud.
 *
 * Auth: Alibaba Cloud API signature V3 (ACS3-HMAC-SHA256), RPC style.
 */

export interface AlibabaCreds {
  accessKeyId: string;
  accessKeySecret: string;
  region: string; // e.g. ap-southeast-1
  custSpaceId?: string | null;
  from?: string | null; // phone number in E.164 without "+"
}

const API_VERSION = "2020-06-06";

function endpointFor(region: string) {
  return `cams.${region || "ap-southeast-1"}.aliyuncs.com`;
}

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  return hex(await crypto.subtle.digest("SHA-256", data));
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function rfc3986(str: string) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, "%20");
}

function canonicalQuery(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k]!)}`)
    .join("&");
}

/**
 * Call a CAMS RPC action. Query parameters only (CAMS accepts RPC-style params).
 */
export async function camsRequest(
  creds: AlibabaCreds,
  action: string,
  params: Record<string, string | number | undefined | null> = {},
): Promise<any> {
  const host = endpointFor(creds.region);
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    query[k] = String(v);
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const bodyHash = await sha256Hex("");

  const headers: Record<string, string> = {
    host,
    "x-acs-action": action,
    "x-acs-version": API_VERSION,
    "x-acs-date": date,
    "x-acs-signature-nonce": nonce,
    "x-acs-content-sha256": bodyHash,
  };

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((h) => `${h}:${headers[h]!.trim()}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const cq = canonicalQuery(query);

  const canonicalRequest = [
    "POST",
    "/",
    cq,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");

  const stringToSign = `ACS3-HMAC-SHA256\n${await sha256Hex(canonicalRequest)}`;
  const signature = await hmacHex(creds.accessKeySecret, stringToSign);

  const authorization =
    `ACS3-HMAC-SHA256 Credential=${creds.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`;

  const url = `https://${host}/${cq ? `?${cq}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-acs-action": action,
      "x-acs-version": API_VERSION,
      "x-acs-date": date,
      "x-acs-signature-nonce": nonce,
      "x-acs-content-sha256": bodyHash,
      Authorization: authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }

  if (!res.ok || json?.Code && json.Code !== "OK") {
    const msg = json?.Message || json?.message || text || `CAMS HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/** Lists the WhatsApp numbers registered in the CAMS account — used as connection test. */
export async function listPhoneNumbers(creds: AlibabaCreds) {
  return camsRequest(creds, "QueryChatappPhoneNumbers", {
    CustSpaceId: creds.custSpaceId ?? undefined,
  });
}

/** Sends a free-form text message (only valid inside the 24h service window). */
export async function camsSendText(creds: AlibabaCreds, to: string, text: string) {
  return camsRequest(creds, "SendChatappMessage", {
    CustSpaceId: creds.custSpaceId ?? undefined,
    ChannelType: "whatsapp",
    MessageType: "text",
    From: creds.from ?? undefined,
    To: to,
    Content: JSON.stringify({ text }),
  });
}

/** Sends an approved template message (works outside the 24h window). */
export async function camsSendTemplate(
  creds: AlibabaCreds,
  to: string,
  templateName: string,
  language: string,
  variables: string[] = [],
) {
  const templateParams: Record<string, string> = {};
  variables.forEach((v, i) => { templateParams[String(i + 1)] = v; });
  return camsSendText === undefined ? null : camsRequest(creds, "SendChatappMessage", {
    CustSpaceId: creds.custSpaceId ?? undefined,
    ChannelType: "whatsapp",
    MessageType: "template",
    From: creds.from ?? undefined,
    To: to,
    TemplateCode: templateName,
    Language: language,
    TemplateParams: Object.keys(templateParams).length ? JSON.stringify(templateParams) : undefined,
  });
}
