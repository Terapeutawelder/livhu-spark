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

export const getMyTenantDomain = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

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
