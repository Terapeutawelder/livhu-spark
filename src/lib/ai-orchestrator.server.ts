export const MAX_AGENTS_PER_TENANT = 20;

type TenantContext = {
  supabase: {
    rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  userId: string;
};

export async function resolveAiTenant(context: TenantContext) {
  const { data: tenantId } = await context.supabase.rpc("current_tenant_id");
  if (typeof tenantId !== "string" || !tenantId) {
    throw new Error("Consultório não encontrado para este usuário.");
  }

  const { data: role } = await context.supabase.rpc("tenant_role_of", {
    _tenant_id: tenantId,
    _user_id: context.userId,
  });

  return { tenantId, role: typeof role === "string" ? role : "" };
}