import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RESERVED = new Set([
  "www", "app", "admin", "api", "auth", "static", "cdn", "mail", "email", "psi", "root", "public",
]);

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(40, "Máximo 40 caracteres")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use letras, números e hífens");

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4, "Domínio inválido")
  .max(253, "Domínio muito longo")
  .regex(
    /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/,
    "Informe um domínio válido, ex.: consultorio.seudominio.com",
  );

// ---------- Tenant reads ----------

export const getMyTenantDomain = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenants")
      .select(
        "id, name, slug, subdomain_status, custom_domain, custom_domain_status, custom_domain_verification",
      )
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const listMyDomainRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("domain_activation_requests")
      .select("id, kind, value, status, notes, created_at, handled_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });

// ---------- Tenant writes ----------

export const updateMyTenantSlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ slug: slugSchema }).parse(data))
  .handler(async ({ context, data }) => {
    if (RESERVED.has(data.slug)) {
      throw new Error("Este subdomínio é reservado. Escolha outro.");
    }

    const { data: existing, error: checkErr } = await context.supabase
      .from("tenants")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (checkErr) throw checkErr;
    if (existing) throw new Error("Este subdomínio já está em uso.");

    const { data: updated, error } = await context.supabase
      .from("tenants")
      .update({ slug: data.slug })
      .eq("owner_id", context.userId)
      .select("id, slug")
      .maybeSingle();
    if (error) throw error;
    return updated;
  });

export const requestSubdomainActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: tenant, error: te } = await context.supabase
      .from("tenants")
      .select("id, slug")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (te) throw te;
    if (!tenant) throw new Error("Consultório não encontrado.");

    const value = `${tenant.slug}.psi.livhub.cloud`;

    // Avoid duplicate open requests
    const { data: existing } = await context.supabase
      .from("domain_activation_requests")
      .select("id, status")
      .eq("tenant_id", tenant.id)
      .eq("kind", "subdomain")
      .eq("value", value)
      .in("status", ["pending", "in_progress"])
      .maybeSingle();
    if (existing) return existing;

    const { data, error } = await context.supabase
      .from("domain_activation_requests")
      .insert({
        tenant_id: tenant.id,
        requested_by: context.userId,
        kind: "subdomain",
        value,
      })
      .select("id, status, value")
      .single();
    if (error) throw error;
    return data;
  });

export const requestCustomDomainActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ domain: domainSchema }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: tenant, error: te } = await context.supabase
      .from("tenants")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (te) throw te;
    if (!tenant) throw new Error("Consultório não encontrado.");

    // Avoid duplicate open request for same value
    const { data: existing } = await context.supabase
      .from("domain_activation_requests")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("kind", "custom_domain")
      .eq("value", data.domain)
      .in("status", ["pending", "in_progress"])
      .maybeSingle();
    if (existing) return existing;

    const { data: inserted, error } = await context.supabase
      .from("domain_activation_requests")
      .insert({
        tenant_id: tenant.id,
        requested_by: context.userId,
        kind: "custom_domain",
        value: data.domain,
      })
      .select("id, status, value")
      .single();
    if (error) throw error;
    return inserted;
  });

// ---------- Super admin ----------

async function assertSuperAdmin(context: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Acesso negado.");
}

export const adminListDomainRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("domain_activation_requests")
      .select(
        "id, tenant_id, kind, value, status, notes, created_at, handled_at, requested_by, tenants(name, slug, custom_domain, custom_domain_status, custom_hostname_id, custom_domain_verification)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const adminActivateSubdomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: re } = await supabaseAdmin
      .from("domain_activation_requests")
      .select("id, tenant_id, kind, value")
      .eq("id", data.requestId)
      .single();
    if (re) throw re;
    if (req.kind !== "subdomain") throw new Error("Solicitação não é de subdomínio.");

    await supabaseAdmin
      .from("tenants")
      .update({ subdomain_status: "live" })
      .eq("id", req.tenant_id);

    const { data: updated, error } = await supabaseAdmin
      .from("domain_activation_requests")
      .update({ status: "active", handled_by: context.userId, handled_at: new Date().toISOString() })
      .eq("id", data.requestId)
      .select("id, status")
      .single();
    if (error) throw error;
    return updated;
  });

export const adminProvisionCustomHostname = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createCustomHostname } = await import("@/lib/cloudflare.server");

    const { data: req, error: re } = await supabaseAdmin
      .from("domain_activation_requests")
      .select("id, tenant_id, kind, value")
      .eq("id", data.requestId)
      .single();
    if (re) throw re;
    if (req.kind !== "custom_domain") throw new Error("Solicitação não é de domínio próprio.");

    let hostname;
    try {
      hostname = await createCustomHostname(req.value);
    } catch (e) {
      await supabaseAdmin
        .from("domain_activation_requests")
        .update({
          status: "failed",
          notes: e instanceof Error ? e.message : String(e),
          handled_by: context.userId,
          handled_at: new Date().toISOString(),
        })
        .eq("id", data.requestId);
      throw e;
    }

    await supabaseAdmin
      .from("tenants")
      .update({
        custom_domain: req.value,
        custom_hostname_id: hostname.id,
        custom_domain_status: hostname.status,
        custom_domain_verification: {
          ownership: hostname.ownership_verification ?? null,
          ssl: hostname.ssl?.validation_records ?? null,
        },
      })
      .eq("id", req.tenant_id);

    const { data: updated, error } = await supabaseAdmin
      .from("domain_activation_requests")
      .update({
        status: "in_progress",
        handled_by: context.userId,
        handled_at: new Date().toISOString(),
        notes: `Cloudflare hostname criado: ${hostname.id}`,
      })
      .eq("id", data.requestId)
      .select("id, status")
      .single();
    if (error) throw error;
    return { request: updated, hostname };
  });

export const adminRefreshCustomHostname = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ tenantId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCustomHostname } = await import("@/lib/cloudflare.server");

    const { data: tenant, error: te } = await supabaseAdmin
      .from("tenants")
      .select("id, custom_hostname_id")
      .eq("id", data.tenantId)
      .single();
    if (te) throw te;
    if (!tenant.custom_hostname_id) throw new Error("Tenant não possui hostname na Cloudflare.");

    const hostname = await getCustomHostname(tenant.custom_hostname_id);

    await supabaseAdmin
      .from("tenants")
      .update({
        custom_domain_status: hostname.status,
        custom_domain_verification: {
          ownership: hostname.ownership_verification ?? null,
          ssl: hostname.ssl?.validation_records ?? null,
          ssl_status: hostname.ssl?.status ?? null,
        },
      })
      .eq("id", tenant.id);

    // Auto-close any in_progress request for this hostname once fully active
    if (hostname.status === "active" && hostname.ssl?.status === "active") {
      await supabaseAdmin
        .from("domain_activation_requests")
        .update({ status: "active", handled_at: new Date().toISOString() })
        .eq("tenant_id", tenant.id)
        .eq("kind", "custom_domain")
        .eq("status", "in_progress");
    }

    return hostname;
  });
