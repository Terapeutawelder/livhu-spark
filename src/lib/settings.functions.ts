import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type JsonValue = string | number | boolean | null;
type SettingsGroup = Record<string, JsonValue>;

function asSettingsGroup(value: unknown): SettingsGroup {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj: SettingsGroup = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        obj[k] = v;
      }
    }
    return obj;
  }
  return {};
}

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: tenantIdRes, error: tenantErr } = await supabase.rpc("current_tenant_id");
    if (tenantErr) throw tenantErr;
    const tenantId = tenantIdRes as string | null;
    if (!tenantId) throw new Error("Nenhum tenant encontrado.");

    const [{ data: profile }, { data: tenant }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, avatar_url").eq("id", context.userId).maybeSingle(),
      supabase.from("tenants").select("id, name, slug, timezone, primary_color, logo_url").eq("id", tenantId).maybeSingle(),
      supabase.from("tenant_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    ]);

    return {
      profile,
      tenant,
      settings: {
        profile: asSettingsGroup(settings?.profile),
        clinic: asSettingsGroup(settings?.clinic),
        branding: asSettingsGroup(settings?.branding),
        notifications: asSettingsGroup(settings?.notifications),
      },
    };
  });

export const saveProfileSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { full_name: string; title?: string; crp?: string; phone?: string; bio?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tenantIdRes, error: tenantErr } = await supabase.rpc("current_tenant_id");
    if (tenantErr) throw tenantErr;
    const tenantId = tenantIdRes as string | null;
    if (!tenantId) throw new Error("Nenhum tenant encontrado.");

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", userId);
    if (profileErr) throw profileErr;

    const { error } = await supabase
      .from("tenant_settings")
      .upsert(
        {
          tenant_id: tenantId,
          profile: {
            title: data.title ?? "",
            crp: data.crp ?? "",
            phone: data.phone ?? "",
            bio: data.bio ?? "",
          },
        },
        { onConflict: "tenant_id" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const saveClinicSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      name: string;
      address?: string;
      session_duration_minutes?: number;
      session_price_cents?: number;
      min_booking_hours?: number;
      accepts_online?: boolean;
      accepts_in_person?: boolean;
      accepts_insurance?: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: tenantIdRes, error: tenantErr } = await supabase.rpc("current_tenant_id");
    if (tenantErr) throw tenantErr;
    const tenantId = tenantIdRes as string | null;
    if (!tenantId) throw new Error("Nenhum tenant encontrado.");

    const { error: tenantErr2 } = await supabase.from("tenants").update({ name: data.name }).eq("id", tenantId);
    if (tenantErr2) throw tenantErr2;

    const { error } = await supabase
      .from("tenant_settings")
      .upsert(
        {
          tenant_id: tenantId,
          clinic: {
            address: data.address ?? "",
            session_duration_minutes: data.session_duration_minutes ?? 50,
            session_price_cents: data.session_price_cents ?? 0,
            min_booking_hours: data.min_booking_hours ?? 24,
            accepts_online: data.accepts_online ?? true,
            accepts_in_person: data.accepts_in_person ?? true,
            accepts_insurance: data.accepts_insurance ?? false,
          },
        },
        { onConflict: "tenant_id" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const saveBrandingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { public_name?: string; primary_color?: string; logo_url?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: tenantIdRes, error: tenantErr } = await supabase.rpc("current_tenant_id");
    if (tenantErr) throw tenantErr;
    const tenantId = tenantIdRes as string | null;
    if (!tenantId) throw new Error("Nenhum tenant encontrado.");

    const { error: tenantErr2 } = await supabase
      .from("tenants")
      .update({ primary_color: data.primary_color })
      .eq("id", tenantId);
    if (tenantErr2) throw tenantErr2;

    const { error } = await supabase
      .from("tenant_settings")
      .upsert(
        {
          tenant_id: tenantId,
          branding: {
            public_name: data.public_name ?? "",
            logo_url: data.logo_url ?? "",
          },
        },
        { onConflict: "tenant_id" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const saveNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      new_conversation?: boolean;
      session_scheduled?: boolean;
      handoff?: boolean;
      payment_received?: boolean;
      weekly_summary?: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: tenantIdRes, error: tenantErr } = await supabase.rpc("current_tenant_id");
    if (tenantErr) throw tenantErr;
    const tenantId = tenantIdRes as string | null;
    if (!tenantId) throw new Error("Nenhum tenant encontrado.");

    const { error } = await supabase
      .from("tenant_settings")
      .upsert(
        {
          tenant_id: tenantId,
          notifications: {
            new_conversation: data.new_conversation ?? true,
            session_scheduled: data.session_scheduled ?? true,
            handoff: data.handoff ?? true,
            payment_received: data.payment_received ?? true,
            weekly_summary: data.weekly_summary ?? false,
          },
        },
        { onConflict: "tenant_id" },
      );
    if (error) throw error;
    return { ok: true };
  });
