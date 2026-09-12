import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PUBLIC_TABLES = [
  "ai_agents",
  "ai_memory_sources",
  "appointments",
  "contact_notes",
  "contact_stage_history",
  "contacts",
  "domain_activation_requests",
  "feature_flags",
  "flow_run_steps",
  "flow_runs",
  "flows",
  "invoices",
  "kanban_stages",
  "message_credit_ledger",
  "message_credit_orders",
  "message_credit_packages",
  "message_credit_wallets",
  "notification_jobs",
  "notification_settings",
  "notification_templates",
  "payment_orders",
  "payment_settings",
  "platform_settings",
  "profiles",
  "public_profiles",
  "services",
  "subscription_plans",
  "support_tickets",
  "tenant_ai_credentials",
  "tenant_channels",
  "tenant_members",
  "tenant_settings",
  "tenants",
  "whatsapp_broadcast_recipients",
  "whatsapp_broadcasts",
  "whatsapp_channels",
  "whatsapp_conversations",
  "whatsapp_messages",
  "whatsapp_quick_replies",
  "whatsapp_templates",
  "zernio_accounts",
  "zernio_profiles",
];

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Apenas super admins podem exportar dados.");
}

async function fetchTable(supabaseAdmin: any, table: string) {
  const { data, error } = await supabaseAdmin.from(table).select("*");
  if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`);
  return (data ?? []) as any[];
}

function belongsToTenant(row: Record<string, any>, tenantId: string): boolean {
  if (row.tenant_id === tenantId) return true;
  if (row.id === tenantId) return true;
  if (row.owner_id === tenantId) return true;
  return false;
}

export const exportAllData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as { supabase: any; userId: string });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const result: Record<string, any[]> = {};
    for (const table of PUBLIC_TABLES) {
      result[table] = await fetchTable(supabaseAdmin, table);
    }

    return {
      exported_at: new Date().toISOString(),
      schema: "public",
      tables: result,
    } as any;
  });

export const exportTenantData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tenantId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as { supabase: any; userId: string });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { tenantId } = data;
    const result: Record<string, any[]> = {};

    const { data: members } = await supabaseAdmin
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId);
    const memberIds = new Set((members ?? []).map((m: any) => m.user_id));

    for (const table of PUBLIC_TABLES) {
      const rows = await fetchTable(supabaseAdmin, table);
      if (table === "profiles") {
        result[table] = rows.filter((r: any) => memberIds.has(r.id));
      } else {
        result[table] = rows.filter((r: any) => belongsToTenant(r, tenantId));
      }
    }

    return {
      exported_at: new Date().toISOString(),
      schema: "public",
      tenant_id: tenantId,
      tables: result,
    } as any;
  });
