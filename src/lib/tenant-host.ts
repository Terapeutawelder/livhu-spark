// Detects the tenant slug from the current hostname.
//
// Phase A of white-label: subdomain-based tenant detection.
// Main app lives at `psi.livhub.cloud`. Tenants will live at
// `{slug}.psi.livhub.cloud` (requires wildcard `*.psi.livhub.cloud`
// pointing to Lovable in DNS).

const APP_HOST = "psi.livhub.cloud";
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "auth",
  "static",
  "cdn",
  "mail",
  "email",
]);

export type HostTenantInfo = {
  slug: string | null;
  hostname: string;
  isRoot: boolean;
  isPreview: boolean;
};

export function detectTenantFromHostname(hostname: string): HostTenantInfo {
  const host = hostname.toLowerCase();

  // Local dev / Lovable preview environments never carry a tenant subdomain.
  const isPreview =
    host === "localhost" ||
    host.startsWith("127.") ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.dev");

  if (isPreview) {
    return { slug: null, hostname: host, isRoot: false, isPreview: true };
  }

  // Main app host → no tenant.
  if (host === APP_HOST) {
    return { slug: null, hostname: host, isRoot: true, isPreview: false };
  }

  // Tenant subdomain of the app host: `{slug}.psi.livhub.cloud`
  if (host.endsWith(`.${APP_HOST}`)) {
    const prefix = host.slice(0, -1 - APP_HOST.length);
    const first = prefix.split(".")[0];
    if (!first || RESERVED_SUBDOMAINS.has(first)) {
      return { slug: null, hostname: host, isRoot: true, isPreview: false };
    }
    return { slug: first, hostname: host, isRoot: false, isPreview: false };
  }

  // Any other host (future custom domains) → no slug yet.
  return { slug: null, hostname: host, isRoot: false, isPreview: false };
}

export function detectTenantFromWindow(): HostTenantInfo {
  if (typeof window === "undefined") {
    return { slug: null, hostname: "", isRoot: false, isPreview: true };
  }
  return detectTenantFromHostname(window.location.hostname);
}
