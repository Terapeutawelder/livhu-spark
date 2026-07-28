// Cloudflare for SaaS — Custom Hostnames API helper.
// Docs: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/

const CF_API = "https://api.cloudflare.com/client/v4";

export type CloudflareHostname = {
  id: string;
  hostname: string;
  status: "active" | "pending" | "active_redeploying" | "moved" | "pending_deletion" | "pending_blocked" | "pending_migration" | "provisioned" | "test_pending" | "test_active" | "test_active_apex" | "test_blocked" | "test_failed" | "deleted" | "blocked";
  ssl: {
    status: string;
    method?: string;
    type?: string;
    validation_records?: Array<{ txt_name?: string; txt_value?: string; http_url?: string; http_body?: string }>;
    validation_errors?: Array<{ message: string }>;
  };
  ownership_verification?: { name: string; type: string; value: string };
  ownership_verification_http?: { http_url: string; http_body: string };
  verification_errors?: string[];
};

function cfEnv() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const fallbackOrigin = process.env.CLOUDFLARE_FALLBACK_ORIGIN;
  if (!token || !zoneId) {
    throw new Error(
      "Cloudflare não configurado. Peça ao super admin para definir CLOUDFLARE_API_TOKEN e CLOUDFLARE_ZONE_ID.",
    );
  }
  return { token, zoneId, fallbackOrigin };
}

async function cfFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = cfEnv();
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = (await res.json()) as { success: boolean; result: T; errors?: Array<{ message: string }> };
  if (!json.success) {
    const msg = json.errors?.map((e) => e.message).join("; ") || `Cloudflare API error (${res.status})`;
    throw new Error(msg);
  }
  return json.result;
}

export async function createCustomHostname(hostname: string): Promise<CloudflareHostname> {
  const { zoneId } = cfEnv();
  return cfFetch<CloudflareHostname>(`/zones/${zoneId}/custom_hostnames`, {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "txt",
        type: "dv",
        settings: { min_tls_version: "1.2" },
      },
    }),
  });
}

export async function getCustomHostname(id: string): Promise<CloudflareHostname> {
  const { zoneId } = cfEnv();
  return cfFetch<CloudflareHostname>(`/zones/${zoneId}/custom_hostnames/${id}`);
}

export async function deleteCustomHostname(id: string): Promise<void> {
  const { zoneId } = cfEnv();
  await cfFetch(`/zones/${zoneId}/custom_hostnames/${id}`, { method: "DELETE" });
}

export function getFallbackOrigin(): string | undefined {
  return process.env.CLOUDFLARE_FALLBACK_ORIGIN;
}
