import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BACKUP_FORMAT_VERSION = "2";
const PAGE_SIZE = 500;

type TenantScope =
  | { kind: "tenant_id" }
  | { kind: "tenant_pk" }
  | { kind: "member_id" }
  | { kind: "member_user_id" }
  | { kind: "global" }
  | { kind: "missing" };

type TableSpec = { name: string; scope: TenantScope };

/** Tabelas reais do schema public + tabelas esperadas que não existem no banco. */
const TABLE_SPECS: TableSpec[] = [
  { name: "ai_agents", scope: { kind: "tenant_id" } },
  { name: "ai_memory_sources", scope: { kind: "tenant_id" } },
  { name: "appointments", scope: { kind: "tenant_id" } },
  { name: "contact_notes", scope: { kind: "tenant_id" } },
  { name: "contact_stage_history", scope: { kind: "tenant_id" } },
  { name: "contacts", scope: { kind: "tenant_id" } },
  { name: "domain_activation_requests", scope: { kind: "tenant_id" } },
  { name: "feature_flags", scope: { kind: "global" } },
  { name: "flow_run_steps", scope: { kind: "tenant_id" } },
  { name: "flow_runs", scope: { kind: "tenant_id" } },
  { name: "flows", scope: { kind: "tenant_id" } },
  { name: "invoices", scope: { kind: "tenant_id" } },
  { name: "kanban_stages", scope: { kind: "tenant_id" } },
  { name: "message_credit_ledger", scope: { kind: "tenant_id" } },
  { name: "message_credit_orders", scope: { kind: "tenant_id" } },
  { name: "message_credit_packages", scope: { kind: "global" } },
  { name: "message_credit_wallets", scope: { kind: "tenant_id" } },
  { name: "notification_jobs", scope: { kind: "tenant_id" } },
  { name: "notification_settings", scope: { kind: "tenant_id" } },
  { name: "notification_templates", scope: { kind: "tenant_id" } },
  { name: "payment_orders", scope: { kind: "tenant_id" } },
  { name: "payment_settings", scope: { kind: "tenant_id" } },
  { name: "platform_settings", scope: { kind: "global" } },
  { name: "profiles", scope: { kind: "member_id" } },
  { name: "public_profiles", scope: { kind: "tenant_id" } },
  { name: "services", scope: { kind: "tenant_id" } },
  { name: "subscription_plans", scope: { kind: "global" } },
  { name: "support_tickets", scope: { kind: "tenant_id" } },
  { name: "tenant_ai_credentials", scope: { kind: "tenant_id" } },
  { name: "tenant_channels", scope: { kind: "tenant_id" } },
  { name: "tenant_members", scope: { kind: "tenant_id" } },
  { name: "tenant_settings", scope: { kind: "tenant_id" } },
  { name: "tenants", scope: { kind: "tenant_pk" } },
  { name: "user_roles", scope: { kind: "member_user_id" } },
  { name: "whatsapp_broadcast_recipients", scope: { kind: "tenant_id" } },
  { name: "whatsapp_broadcasts", scope: { kind: "tenant_id" } },
  { name: "whatsapp_channels", scope: { kind: "tenant_id" } },
  { name: "whatsapp_conversations", scope: { kind: "tenant_id" } },
  { name: "whatsapp_evolution_instances", scope: { kind: "missing" } },
  { name: "whatsapp_evolution_webhooks", scope: { kind: "missing" } },
  { name: "whatsapp_messages", scope: { kind: "tenant_id" } },
  { name: "whatsapp_quick_replies", scope: { kind: "tenant_id" } },
  { name: "whatsapp_templates", scope: { kind: "tenant_id" } },
  { name: "zernio_accounts", scope: { kind: "tenant_id" } },
  { name: "zernio_profiles", scope: { kind: "tenant_id" } },
];

export type TableReport = {
  table_name: string;
  scope: string;
  database_count: number;
  exported_count: number;
  complete: boolean;
  error?: string;
};

export type BackupManifest = {
  generated_at: string;
  format_version: string;
  kind: "full" | "tenant";
  tenant_id: string | null;
  include_global: boolean;
  tables: TableReport[];
  expected_total: number;
  exported_total: number;
  missing_tables: string[];
  truncated_tables: string[];
  failed_tables: string[];
  complete: boolean;
  contains_encrypted_credentials: boolean;
  notice: string;
};

const CREDENTIALS_NOTICE =
  "Este backup pode conter campos criptografados de credenciais (tokens de canais, chaves de IA e credenciais de pagamento). Nenhum secret de ambiente do servidor é incluído.";

function specOf(table: string): TableSpec | undefined {
  return TABLE_SPECS.find((t) => t.name === table);
}

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Apenas super admins podem exportar dados.");
}

async function getMemberIds(admin: any, tenantId: string): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ user_id: string }>;
    ids.push(...rows.map((r) => r.user_id));
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  const { data: tenant } = await admin
    .from("tenants")
    .select("owner_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenant?.owner_id) ids.push(tenant.owner_id as string);
  return Array.from(new Set(ids));
}

/** Aplica o filtro de tenant diretamente na consulta ao banco. */
function applyScope(
  query: any,
  spec: TableSpec,
  tenantId: string | null,
  memberIds: string[],
) {
  if (!tenantId) return query;
  switch (spec.scope.kind) {
    case "tenant_id":
      return query.eq("tenant_id", tenantId);
    case "tenant_pk":
      return query.eq("id", tenantId);
    case "member_id":
      return query.in("id", memberIds.length ? memberIds : [tenantId]);
    case "member_user_id":
      return query.in("user_id", memberIds.length ? memberIds : [tenantId]);
    default:
      return query;
  }
}

function selectedSpecs(tenantId: string | null, includeGlobal: boolean): TableSpec[] {
  return TABLE_SPECS.filter((spec) => {
    if (spec.scope.kind === "global") return !tenantId || includeGlobal;
    return true;
  });
}

async function countTable(
  admin: any,
  spec: TableSpec,
  tenantId: string | null,
  memberIds: string[],
): Promise<{ count: number; error?: string }> {
  if (spec.scope.kind === "missing") {
    return { count: 0, error: "Tabela inexistente no banco de dados." };
  }
  const base = admin.from(spec.name).select("*", { count: "exact", head: true });
  const { count, error } = await applyScope(base, spec, tenantId, memberIds);
  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}

async function fetchTablePaged(
  admin: any,
  spec: TableSpec,
  tenantId: string | null,
  memberIds: string[],
): Promise<{ rows: any[]; error?: string }> {
  if (spec.scope.kind === "missing") {
    return { rows: [], error: "Tabela inexistente no banco de dados." };
  }
  const rows: any[] = [];
  let offset = 0;
  for (;;) {
    const base = admin.from(spec.name).select("*").range(offset, offset + PAGE_SIZE - 1);
    const { data, error } = await applyScope(base, spec, tenantId, memberIds);
    if (error) return { rows, error: error.message };
    const batch = (data ?? []) as any[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return { rows };
}

function buildManifest(
  reports: TableReport[],
  kind: "full" | "tenant",
  tenantId: string | null,
  includeGlobal: boolean,
): BackupManifest {
  const missing = reports.filter((r) => r.error?.includes("inexistente")).map((r) => r.table_name);
  const failed = reports
    .filter((r) => r.error && !r.error.includes("inexistente"))
    .map((r) => r.table_name);
  const truncated = reports
    .filter((r) => !r.error && r.exported_count < r.database_count)
    .map((r) => r.table_name);
  return {
    generated_at: new Date().toISOString(),
    format_version: BACKUP_FORMAT_VERSION,
    kind,
    tenant_id: tenantId,
    include_global: includeGlobal,
    tables: reports,
    expected_total: reports.reduce((a, r) => a + r.database_count, 0),
    exported_total: reports.reduce((a, r) => a + r.exported_count, 0),
    missing_tables: missing,
    truncated_tables: truncated,
    failed_tables: failed,
    complete: reports.every((r) => r.complete),
    contains_encrypted_credentials: true,
    notice: CREDENTIALS_NOTICE,
  };
}

/** Etapa 1: contagens exatas por tabela, sem trazer os dados. */
export const startBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tenantId?: string | null; includeGlobal?: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as { supabase: any; userId: string });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tenantId = data.tenantId ?? null;
    const includeGlobal = data.includeGlobal ?? !tenantId;
    const memberIds = tenantId ? await getMemberIds(supabaseAdmin, tenantId) : [];

    const plan: Array<{ table_name: string; scope: string; database_count: number; error?: string }> = [];
    for (const spec of selectedSpecs(tenantId, includeGlobal)) {
      const { count, error } = await countTable(supabaseAdmin, spec, tenantId, memberIds);
      plan.push({
        table_name: spec.name,
        scope: spec.scope.kind,
        database_count: count,
        ...(error ? { error } : {}),
      });
    }

    return {
      generated_at: new Date().toISOString(),
      format_version: BACKUP_FORMAT_VERSION,
      kind: tenantId ? "tenant" : "full",
      tenant_id: tenantId,
      include_global: includeGlobal,
      page_size: PAGE_SIZE,
      notice: CREDENTIALS_NOTICE,
      plan,
    };
  });

/** Etapa 2: exporta um lote de tabelas já filtradas no banco, com paginação real. */
export const exportTablesChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { tables: string[]; tenantId?: string | null; includeGlobal?: boolean }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as { supabase: any; userId: string });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tenantId = data.tenantId ?? null;
    const includeGlobal = data.includeGlobal ?? !tenantId;
    const memberIds = tenantId ? await getMemberIds(supabaseAdmin, tenantId) : [];

    const tables: Record<string, any[]> = {};
    const reports: TableReport[] = [];

    for (const name of data.tables) {
      const spec = specOf(name);
      if (!spec) {
        reports.push({
          table_name: name,
          scope: "unknown",
          database_count: 0,
          exported_count: 0,
          complete: false,
          error: "Tabela desconhecida.",
        });
        continue;
      }
      if (spec.scope.kind === "global" && tenantId && !includeGlobal) continue;

      const counted = await countTable(supabaseAdmin, spec, tenantId, memberIds);
      const fetched = await fetchTablePaged(supabaseAdmin, spec, tenantId, memberIds);
      const err = counted.error ?? fetched.error;
      tables[name] = fetched.rows;
      reports.push({
        table_name: name,
        scope: spec.scope.kind,
        database_count: counted.count,
        exported_count: fetched.rows.length,
        complete: !err && fetched.rows.length === counted.count,
        ...(err ? { error: err } : {}),
      });
    }

    return { tables, reports };
  });

export function composeManifest(
  reports: TableReport[],
  kind: "full" | "tenant",
  tenantId: string | null,
  includeGlobal: boolean,
): BackupManifest {
  return buildManifest(reports, kind, tenantId, includeGlobal);
}
