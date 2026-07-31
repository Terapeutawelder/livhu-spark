import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { channelSaveSchema, channelIdSchema, type ChannelKind } from "./channels.schema";

export type ChannelRow = {
  channel: ChannelKind;
  display_name: string;
  account_id: string | null;
  credential_hint: string;
  status: "disconnected" | "pending" | "active" | "error";
  last_error: string | null;
  last_checked_at: string | null;
  settings: Record<string, string>;
  updated_at: string;
};

export const listMyChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChannelRow[]> => {
    const { resolveTenantId } = await import("./channels.server");
    const tenantId = await resolveTenantId(context.supabase, context.userId);
    if (!tenantId) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tenant_channels")
      .select(
        "channel, display_name, account_id, credential_hint, status, last_error, last_checked_at, settings, updated_at",
      )
      .eq("tenant_id", tenantId);
    if (error) throw error;
    return (data ?? []) as ChannelRow[];
  });

export const saveMyChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => channelSaveSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { resolveTenantId, buildChannelRecord } = await import("./channels.server");
    const tenantId = await resolveTenantId(context.supabase, context.userId);
    if (!tenantId) throw new Error("Consultório não encontrado.");
    const record = await buildChannelRecord(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_channels")
      .upsert(
        { tenant_id: tenantId, created_by: context.userId, ...record },
        { onConflict: "tenant_id,channel" },
      );
    if (error) throw error;
    return { ok: true as const };
  });

export const disconnectMyChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => channelIdSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { resolveTenantId } = await import("./channels.server");
    const tenantId = await resolveTenantId(context.supabase, context.userId);
    if (!tenantId) throw new Error("Consultório não encontrado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_channels")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("channel", data.channel);
    if (error) throw error;
    return { ok: true as const };
  });
