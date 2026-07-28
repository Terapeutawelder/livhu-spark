// Detects the tenant slug from the current hostname.
// Rules:
//   - Root/app hosts (livhub.cloud, psi.livhub.cloud, www, app, admin) → null
//   - Lovable preview / localhost → null
//   - `{slug}.livhub.cloud` → slug (if not reserved)
//
// Phase A of white-label: subdomain-based tenant detection.

const ROOT_DOMAIN = "livhub.cloud";
const RESERVED_SUBDOMAINS = new Set([
  "psi",
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

  // Local dev / preview environments never carry a tenant subdomain.
  const isPreview =
    host === "localhost" ||
    host.startsWith("127.") ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.dev");

  if (isPreview) {
    return { slug: null, hostname: host, isRoot: false, isPreview: true };
  }

  // Exact root domain (livhub.cloud) → no tenant.
  if (host === ROOT_DOMAIN) {
    return { slug: null, hostname: host, isRoot: true, isPreview: false };
  }

  // Subdomain of the root domain: strip the root and take the leftmost label.
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const prefix = host.slice(0, -1 - ROOT_DOMAIN.length); // e.g. "drmaria" or "app.staging"
    const first = prefix.split(".")[0];
    if (!first || RESERVED_SUBDOMAINS.has(first)) {
      return { slug: null, hostname: host, isRoot: true, isPreview: false };
    }
    return { slug: first, hostname: host, isRoot: false, isPreview: false };
  }

  // Any other host (custom domain in a future phase) → no slug yet.
  return { slug: null, hostname: host, isRoot: false, isPreview: false };
}

export function detectTenantFromWindow(): HostTenantInfo {
  if (typeof window === "undefined") {
    return { slug: null, hostname: "", isRoot: false, isPreview: true };
  }
  return detectTenantFromHostname(window.location.hostname);
}
