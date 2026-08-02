import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const studioSchema = z.object({
  image: z.string().min(32),
  stylePrompt: z.string().min(4).max(1200),
});

export const generateStudioPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => studioSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ url: string }> => {
    const { resolveTenantIdFor, generateStudioImage, uploadProfileImage } = await import(
      "./public-profile.server"
    );
    const tenantId = await resolveTenantIdFor(context.supabase, context.userId);
    if (!tenantId) throw new Error("Consultório não encontrado.");
    const b64 = await generateStudioImage(data.image, data.stylePrompt);
    const url = await uploadProfileImage(tenantId, b64);
    return { url };
  });
