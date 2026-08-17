import type { SupabaseClient } from "@supabase/supabase-js";

/** Normaliza um identificador de sub-conta (slug público). */
export function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Garante que o usuário logado é o titular de uma conta White-label
 * e devolve o id do tenant pai.
 */
export async function assertWhitelabelParent(
  supabase: SupabaseClient<never>,
  userId: string,
): Promise<string> {
  const { data: tenantIdRes } = await supabase.rpc("current_tenant_id");
  const parentId = tenantIdRes as string | null;
  if (!parentId) throw new Error("Conta não encontrada.");

  const { data: parent } = await supabase
    .from("tenants")
    .select("id, account_type, owner_id")
    .eq("id", parentId)
    .maybeSingle();

  const row = parent as { account_type?: string; owner_id?: string } | null;
  if (!row || row.account_type !== "whitelabel" || row.owner_id !== userId) {
    throw new Error("Apenas o titular de uma conta White-label pode gerenciar sub-contas.");
  }
  return parentId;
}

/** Confere que a sub-conta pertence mesmo à rede do titular. */
export async function assertOwnsSubAccount(
  supabase: SupabaseClient<never>,
  parentId: string,
  subAccountId: string,
) {
  const { data } = await supabase
    .from("tenants")
    .select("id, parent_tenant_id")
    .eq("id", subAccountId)
    .maybeSingle();
  const row = data as { parent_tenant_id?: string | null } | null;
  if (!row || row.parent_tenant_id !== parentId) {
    throw new Error("Sub-conta não encontrada na sua rede.");
  }
}
