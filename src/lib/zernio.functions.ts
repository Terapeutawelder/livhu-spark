import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getTenant(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("tenant_members")
    .select("tenant_id, tenants(name, slug)")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.tenant_id) throw new Error("Consultório não encontrado.");
  return {
    tenantId: data.tenant_id as string,
    name: (data as any)?.tenants?.name as string | undefined,
    slug: (data as any)?.tenants?.slug as string | undefined,
  };
}

async function ensureProfileId(ctx: { supabase: any; userId: string }) {
  const tenant = await getTenant(ctx);
  const { data: existing } = await ctx.supabase
    .from("zernio_profiles")
    .select("profile_id")
    .eq("tenant_id", tenant.tenantId)
    .maybeSingle();
  if (existing?.profile_id) return { ...tenant, profileId: existing.profile_id as string };

  const { createZernioProfile } = await import("./zernio.server");
  const profileId = await createZernioProfile(
    `LivHub · ${tenant.slug ?? tenant.tenantId.slice(0, 8)}`,
    tenant.name ?? "Consultório LivHub",
  );
  await ctx.supabase
    .from("zernio_profiles")
    .upsert({ tenant_id: tenant.tenantId, profile_id: profileId }, { onConflict: "tenant_id" });
  return { ...tenant, profileId };
}

/** Estado da integração + canais já conectados. */
export const getZernioStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getZernioKey } = await import("./zernio.server");
    const configured = !!getZernioKey();
    const tenant = await getTenant(context);

    const { data: profile } = await context.supabase
      .from("zernio_profiles")
      .select("profile_id")
      .eq("tenant_id", tenant.tenantId)
      .maybeSingle();

    const { data: accounts } = await context.supabase
      .from("zernio_accounts")
      .select("id, account_id, platform, username, display_name, profile_picture, profile_url, status, needs_reconnection, connected_at, metadata")
      .eq("tenant_id", tenant.tenantId)
      .order("connected_at", { ascending: true });

    return {
      configured,
      profileId: (profile?.profile_id as string | undefined) ?? null,
      accounts: accounts ?? [],
    };
  });

/** Gera a URL de OAuth da Zernio para conectar um canal. */
export const startZernioConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        platform: z.string().trim().min(2).max(30),
        redirectUrl: z.string().trim().url(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { getZernioConnectUrl } = await import("./zernio.server");
    const { profileId } = await ensureProfileId(context);
    const authUrl = await getZernioConnectUrl({
      platform: data.platform,
      profileId,
      redirectUrl: data.redirectUrl,
    });
    return { authUrl };
  });

/** Sincroniza as contas conectadas na Zernio com o banco do LivHub. */
export const syncZernioAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listZernioAccounts } = await import("./zernio.server");
    const { tenantId, profileId } = await ensureProfileId(context);
    const remote = await listZernioAccounts(profileId);

    const rows = remote.map((a) => ({
      tenant_id: tenantId,
      account_id: a._id,
      platform: a.platform,
      username: a.username ?? null,
      display_name: a.displayName ?? a.username ?? null,
      profile_picture: a.profilePicture ?? null,
      profile_url: a.profileUrl ?? null,
      status: a.needsReconnection ? "needs_reconnection" : a.isActive === false ? "inactive" : "connected",
      needs_reconnection: !!a.needsReconnection,
      metadata: (a.metadata ?? {}) as Record<string, unknown>,
    }));

    if (rows.length) {
      const { error } = await context.supabase
        .from("zernio_accounts")
        .upsert(rows, { onConflict: "tenant_id,account_id" });
      if (error) throw error;
    }

    const keep = remote.map((a) => a._id);
    let del = context.supabase.from("zernio_accounts").delete().eq("tenant_id", tenantId);
    if (keep.length) del = del.not("account_id", "in", `(${keep.map((k) => `"${k}"`).join(",")})`);
    await del;

    return { synced: rows.length };
  });

/** Desconecta um canal (remove na Zernio e localmente). */
export const disconnectZernioAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { tenantId } = await getTenant(context);
    const { data: row } = await context.supabase
      .from("zernio_accounts")
      .select("account_id")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!row) throw new Error("Canal não encontrado.");

    const { deleteZernioAccount } = await import("./zernio.server");
    try {
      await deleteZernioAccount(row.account_id as string);
    } catch (e) {
      console.error("Falha ao remover conta na Zernio:", e);
    }
    await context.supabase.from("zernio_accounts").delete().eq("id", data.id).eq("tenant_id", tenantId);
    return { ok: true };
  });

/** Envia uma mensagem de teste por um canal conectado. */
export const sendZernioTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        to: z.string().trim().min(5).max(40),
        text: z.string().trim().min(1).max(600),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { tenantId } = await getTenant(context);
    const { data: row } = await context.supabase
      .from("zernio_accounts")
      .select("account_id")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!row) throw new Error("Canal não encontrado.");

    const { startZernioConversation } = await import("./zernio.server");
    try {
      await startZernioConversation({
        accountId: row.account_id as string,
        to: data.to.replace(/\s/g, ""),
        text: data.text,
      });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Falha no envio." };
    }
  });
