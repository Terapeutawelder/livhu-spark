import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { detectTenantFromWindow, type HostTenantInfo } from "@/lib/tenant-host";

export type HostTenantBranding = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  timezone: string | null;
};

type HostTenantContextValue = {
  host: HostTenantInfo;
  tenant: HostTenantBranding | null;
  isLoading: boolean;
  notFound: boolean;
};

const HostTenantContext = createContext<HostTenantContextValue>({
  host: { slug: null, hostname: "", isRoot: true, isPreview: true },
  tenant: null,
  isLoading: false,
  notFound: false,
});

export function useHostTenant() {
  return useContext(HostTenantContext);
}

function applyBranding(primary: string | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (primary && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primary)) {
    root.style.setProperty("--tenant-primary", primary);
  } else {
    root.style.removeProperty("--tenant-primary");
  }
}

export function HostTenantProvider({ children }: { children: ReactNode }) {
  const host = useMemo(() => detectTenantFromWindow(), []);

  const query = useQuery({
    queryKey: ["host-tenant-branding", host.slug],
    enabled: !!host.slug,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<HostTenantBranding | null> => {
      if (!host.slug) return null;
      const { data, error } = await supabase.rpc("get_tenant_branding_by_slug", {
        _slug: host.slug,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as HostTenantBranding | undefined) ?? null;
    },
  });

  const tenant = query.data ?? null;

  useEffect(() => {
    applyBranding(tenant?.primary_color);
    if (tenant?.name && typeof document !== "undefined") {
      const title = document.title;
      if (!title.includes(tenant.name)) {
        document.title = `${tenant.name} · LivHub`;
      }
    }
  }, [tenant?.primary_color, tenant?.name]);

  const value: HostTenantContextValue = {
    host,
    tenant,
    isLoading: query.isLoading,
    notFound: !!host.slug && !query.isLoading && !tenant,
  };

  return <HostTenantContext.Provider value={value}>{children}</HostTenantContext.Provider>;
}
