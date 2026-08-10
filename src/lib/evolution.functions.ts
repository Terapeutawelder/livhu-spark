import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getEvolutionInstance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("whatsapp_evolution_instances")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  });

export const connectEvolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const globalApikey = process.env.EVOLUTION_API_KEY;
    if (!globalApikey) {
      console.warn("EVOLUTION_API_KEY não encontrada no process.env");
      throw new Error("Conexão Mental: EVOLUTION_API_KEY não configurada no servidor (Solicite ao Admin).");
    }

    const { data: existing } = await (context.supabase as any)
      .from("whatsapp_evolution_instances")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    const instanceName = (existing as any)?.instance_name || `user_${context.userId.split("-")[0]}_${Math.random().toString(36).substring(2, 6)}`;

    const { createInstance, getConnectState, getQrCode } = await import("./evolution.server");

    try {
      if (!existing) {
        const { data: tenantMember } = await (context.supabase as any)
          .from("tenant_members")
          .select("tenant_id")
          .eq("user_id", context.userId)
          .limit(1)
          .single();

        if (!tenantMember) throw new Error("Consultório não encontrado.");

        await (context.supabase as any).from("whatsapp_evolution_instances").insert({
          tenant_id: (tenantMember as any).tenant_id,
          user_id: context.userId,
          instance_name: instanceName,
          status: "connecting",
        });

        const webhookUrl = `${process.env.SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/api/public/evolution/webhook`;
        
        await createInstance(instanceName, globalApikey);
        
        // Configurar o webhook logo após criar (se a API permitir via settings ou create)
        // Como o webhook é específico por sistema, garantimos que a EvolutionGo aponte para cá.
        // Nota: se a API createInstance aceitar webhook, passamos lá. 
        // Caso contrário, precisaríamos de uma chamada settings/setWebhook.
        // Assumindo que o admin já configura o webhook global ou a API suporta por instância.
      }

      const state = await getConnectState(instanceName, globalApikey);
      
      if (state.instance?.state === "open") {
        await (context.supabase as any)
          .from("whatsapp_evolution_instances")
          .update({ status: "connected" })
          .eq("instance_name", instanceName);
        return { status: "connected" };
      }

      const qr = await getQrCode(instanceName, globalApikey);
      await (context.supabase as any)
        .from("whatsapp_evolution_instances")
        .update({ qrcode: qr.base64, status: "qrcode_ready" })
        .eq("instance_name", instanceName);

      return { status: "qrcode_ready", qrcode: qr.base64 };
    } catch (err: any) {
      console.error("Evolution connect error:", err);
      // Tentamos atualizar o erro se a instância existir
      try {
        await (context.supabase as any)
          .from("whatsapp_evolution_instances")
          .update({ status: "error", last_error: err.message })
          .eq("instance_name", instanceName);
      } catch (e) {
        // Ignorar erro de update se a instância não foi criada
      }
      throw err;
    }
  });

export const disconnectEvolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const globalApikey = process.env.EVOLUTION_API_KEY;
    if (!globalApikey) throw new Error("EVOLUTION_API_KEY não configurada.");

    const { data: inst } = await (context.supabase as any)
      .from("whatsapp_evolution_instances")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!inst) return { ok: true };

    const { logoutInstance, deleteInstance } = await import("./evolution.server");
    try {
      await logoutInstance((inst as any).instance_name, globalApikey);
      await deleteInstance((inst as any).instance_name, globalApikey);
    } catch (e) {
      console.warn("Evolution delete error (might be already gone):", e);
    }

    await (context.supabase as any).from("whatsapp_evolution_instances").delete().eq("id", (inst as any).id);
    return { ok: true };
  });
