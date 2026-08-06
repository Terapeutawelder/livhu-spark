import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function resolveTenantIdFor(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from("tenant_members")
    .select("tenant_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  return data?.[0]?.tenant_id ?? null;
}

/** Chama o Lovable AI Gateway para transformar a foto enviada em retrato de estúdio. */
export async function generateStudioImage(sourceImage: string, stylePrompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Serviço de IA indisponível no momento.");

  const instruction = [
    "Transform this photo of a person into a polished professional studio portrait for a therapist's landing page.",
    stylePrompt,
    "Keep the person's identity, face, skin tone and hair exactly the same. Do not change their features.",
    "Photorealistic, sharp focus on the eyes, 4:5 portrait framing, no text, no watermark, no logos.",
  ].join(" ");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: sourceImage } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`AI gateway image error [${res.status}]: ${body}`);
    throw new Error("Não foi possível gerar a foto agora. Tente novamente em instantes.");
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("A IA não retornou nenhuma imagem. Tente outra foto.");
  return b64;
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function uploadProfileImage(tenantId: string, b64: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = `${tenantId}/${crypto.randomUUID()}.png`;
  const { error } = await supabaseAdmin.storage
    .from("perfil-publico")
    .upload(path, b64ToBytes(b64), { contentType: "image/png", upsert: false });
  if (error) throw new Error(error.message);
  return `/api/public/perfil/img/${path}`;
}

/** URLs assinadas (1h) para os arquivos do próprio consultório. */
export async function signProfileImagePaths(
  tenantId: string,
  urls: string[],
): Promise<Record<string, string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const out: Record<string, string> = {};
  for (const url of urls) {
    const prefix = "/api/public/perfil/img/";
    if (!url.startsWith(prefix)) continue;
    const path = url.slice(prefix.length);
    if (!path.startsWith(`${tenantId}/`)) continue;
    const { data } = await supabaseAdmin.storage.from("perfil-publico").createSignedUrl(path, 3600);
    if (data?.signedUrl) out[url] = data.signedUrl;
  }
  return out;
}
