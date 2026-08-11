/**
 * Zernio API client (server-only).
 *
 * Zernio is used as the "behind the scenes" channel provider: one LivHub team
 * key, one Zernio profile per tenant (consultório), and OAuth connect flows
 * for WhatsApp, Instagram, Messenger/Facebook, Google Business and others.
 *
 * Docs: https://docs.zernio.com
 */

const BASE_URL = "https://zernio.com/api/v1";

export const ZERNIO_PLATFORMS = [
  { id: "whatsapp", label: "WhatsApp Business" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook / Messenger" },
  { id: "googlebusiness", label: "Google Meu Negócio" },
  { id: "telegram", label: "Telegram" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "threads", label: "Threads" },
  { id: "twitter", label: "X (Twitter)" },
  { id: "pinterest", label: "Pinterest" },
  { id: "discord", label: "Discord" },
  { id: "slack", label: "Slack" },
  { id: "bluesky", label: "Bluesky" },
  { id: "snapchat", label: "Snapchat" },
  { id: "reddit", label: "Reddit" },
] as const;

export type ZernioPlatform = (typeof ZERNIO_PLATFORMS)[number]["id"];

export function getZernioKey(): string | null {
  return process.env["ZERNIO_API_KEY"] || null;
}

export function requireZernioKey(): string {
  const key = getZernioKey();
  if (!key) throw new Error("Integração Zernio ainda não configurada pelo administrador.");
  return key;
}

async function zernioFetch<T = any>(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {},
): Promise<T> {
  const key = requireZernioKey();
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const message = json?.error || json?.message || `Zernio respondeu ${res.status}`;
    console.error(`Zernio ${init.method ?? "GET"} ${path} falhou [${res.status}]: ${text}`);
    const err = new Error(message) as Error & { status?: number; payload?: unknown };
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json as T;
}

/** Cria (ou recupera) o profile Zernio que representa um consultório. */
export async function createZernioProfile(name: string, description?: string) {
  try {
    const created = await zernioFetch<{ profile: { _id: string; name: string } }>("/profiles", {
      method: "POST",
      body: { name, description: description ?? "Consultório LivHub" },
    });
    const id = created?.profile?._id;
    if (id) return id;
  } catch (e) {
    const err = e as { status?: number; payload?: any };
    const existing = err?.payload?.details?.existingProfileId;
    if (err?.status === 409 && existing) return String(existing);
    if (err?.status !== 409) throw e;
  }
  // fallback: busca por nome exato
  const list = await zernioFetch<{ profiles: Array<{ _id: string; name: string }> }>("/profiles", {
    query: { name },
  });
  const found = list?.profiles?.[0]?._id;
  if (!found) throw new Error("Não foi possível criar o perfil Zernio.");
  return String(found);
}

export async function listZernioProfiles() {
  const res = await zernioFetch<{ profiles: Array<{ _id: string; name: string }> }>("/profiles");
  return res?.profiles ?? [];
}

/**
 * Inicia a conexão de um canal.
 * A maioria dos canais devolve `authUrl` (OAuth). O Telegram devolve um código
 * que o usuário envia ao bot, sem OAuth.
 */
export type ZernioConnectStart = {
  authUrl?: string;
  code?: string;
  botUsername?: string;
  instructions?: string[];
  expiresIn?: number;
};

export async function getZernioConnectUrl(args: {
  platform: string;
  profileId: string;
  redirectUrl: string;
}): Promise<ZernioConnectStart> {
  const res = await zernioFetch<ZernioConnectStart>(`/connect/${args.platform}`, {
    query: { profileId: args.profileId, redirect_url: args.redirectUrl },
  });
  if (res?.authUrl) return { authUrl: res.authUrl };
  if (res?.code) {
    return {
      code: res.code,
      botUsername: res.botUsername,
      instructions: res.instructions ?? [],
      expiresIn: res.expiresIn,
    };
  }
  throw new Error("Zernio não retornou a URL de autorização.");
}

/**
 * Conexão de contas de anúncios: GET /v1/connect/{base}/ads
 * Pode retornar `alreadyConnected` (same-token) ou `authUrl` (OAuth próprio).
 */
export async function getZernioAdsConnectUrl(args: {
  base: string;
  profileId: string;
  redirectUrl: string;
  accountId?: string;
}): Promise<ZernioConnectStart & { alreadyConnected?: boolean }> {
  const res = await zernioFetch<ZernioConnectStart & { alreadyConnected?: boolean; account?: unknown }>(
    `/connect/${args.base}/ads`,
    {
      query: {
        profileId: args.profileId,
        redirect_url: args.redirectUrl,
        accountId: args.accountId,
      },
    },
  );
  if (res?.authUrl) return { authUrl: res.authUrl };
  if (res?.alreadyConnected || res?.account) return { alreadyConnected: true };
  throw new Error("Zernio não retornou a URL de autorização para anúncios.");
}

export type ZernioAccount = {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profilePicture?: string | null;
  profileUrl?: string;
  isActive?: boolean;
  needsReconnection?: boolean;
  metadata?: Record<string, unknown>;
};

export async function listZernioAccounts(profileId: string): Promise<ZernioAccount[]> {
  const res = await zernioFetch<{ accounts: ZernioAccount[] }>("/accounts", {
    query: { profileId },
  });
  return res?.accounts ?? [];
}

export async function deleteZernioAccount(accountId: string) {
  await zernioFetch(`/accounts/${accountId}`, { method: "DELETE" });
}

/** Envia mensagem em uma conversa existente do inbox unificado. */
export async function sendZernioMessage(conversationId: string, text: string) {
  return zernioFetch(`/inbox/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { text },
  });
}

/** Cria/abre uma conversa (ex.: WhatsApp) e envia a primeira mensagem. */
export async function startZernioConversation(args: {
  accountId: string;
  to: string;
  text: string;
}) {
  return zernioFetch("/inbox/conversations", {
    method: "POST",
    body: { accountId: args.accountId, recipientId: args.to, text: args.text },
  });
}

export async function listZernioConversations(profileId: string, limit = 30) {
  return zernioFetch<{ conversations: any[] }>("/inbox/conversations", {
    query: { profileId, limit: String(limit) },
  });
}
