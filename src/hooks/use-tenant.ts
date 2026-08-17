import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  primary_color: string | null;
  timezone: string;
  plan: string;
  is_active: boolean;
  account_type?: string | null;
};

export type AccountType = "individual" | "clinic" | "whitelabel";

/**
 * Retorna o tenant "corrente" do usuário logado (o primeiro que ele possui).
 * Fase 1: single-tenant por usuário. Futuramente vira seletor.
 */
export function useCurrentTenant() {
  return useQuery({
    queryKey: ["current-tenant"],
    queryFn: async (): Promise<Tenant | null> => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return null;

      const { data: memberships, error: memErr } = await supabase
        .from("tenant_members")
        .select("tenant_id, created_at")
        .eq("user_id", userRes.user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      if (memErr) throw memErr;
      const tenantId = memberships?.[0]?.tenant_id;
      if (!tenantId) return null;

      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .maybeSingle();
      if (tErr) throw tErr;
      return (tenant as Tenant) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Tipo de conta do tenant: profissional individual ou clínica.
 * Definido pelo plano assinado (ver tabela subscription_plans.account_type).
 */
export function useAccountType(): {
  accountType: AccountType;
  isClinic: boolean;
  isWhitelabel: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useCurrentTenant();
  const raw = data?.account_type;
  const accountType: AccountType =
    raw === "clinic" ? "clinic" : raw === "whitelabel" ? "whitelabel" : "individual";
  return {
    accountType,
    isClinic: accountType === "clinic",
    isWhitelabel: accountType === "whitelabel",
    isLoading,
  };
}

/** Tela de login correspondente a cada tipo de plano. */
export function loginPathFor(accountType: AccountType) {
  if (accountType === "clinic") return "/clinica/login" as const;
  if (accountType === "whitelabel") return "/white-label/login" as const;
  return "/auth" as const;
}

/** Papel do usuário logado dentro do tenant atual (owner/admin/therapist/assistant). */
export function useMyTenantRole() {
  const { data: tenant } = useCurrentTenant();
  const { data: role, isLoading } = useQuery({
    queryKey: ["my-tenant-role", tenant?.id],
    enabled: Boolean(tenant?.id),
    queryFn: async (): Promise<string | null> => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || !tenant?.id) return null;
      const { data } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", tenant.id)
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      return (data?.role as string | undefined) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const isOwner = tenant?.owner_id != null && role === "owner";
  return {
    role: role ?? null,
    isTenantAdmin: role === "owner" || role === "admin",
    isOwner,
    isLoading,
  };
}
