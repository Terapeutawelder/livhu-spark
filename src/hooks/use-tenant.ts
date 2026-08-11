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

export type AccountType = "individual" | "clinic";

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
export function useAccountType(): { accountType: AccountType; isClinic: boolean; isLoading: boolean } {
  const { data, isLoading } = useCurrentTenant();
  const accountType: AccountType = data?.account_type === "clinic" ? "clinic" : "individual";
  return { accountType, isClinic: accountType === "clinic", isLoading };
}
