import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/perfil/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const tenantId = path.split("/")[0];
        if (!tenantId) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Só entrega imagens de consultórios com perfil público publicado.
        const { data: profile } = await supabaseAdmin
          .from("public_profiles")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("is_published", true)
          .maybeSingle();
        if (!profile) return new Response("Not found", { status: 404 });

        const { data, error } = await supabaseAdmin.storage.from("perfil-publico").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
