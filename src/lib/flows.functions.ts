import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RunFlowInput = z.object({
  flowId: z.string().uuid(),
  contactId: z.string().uuid().nullable().optional(),
  isTest: z.boolean().default(true),
});

const ListRunsInput = z.object({
  flowId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(20),
});

const RunStepsInput = z.object({ runId: z.string().uuid() });

async function resolveTenantId(context: { supabase: any }) {
  const { data: tenantId } = await context.supabase.rpc("current_tenant_id");
  if (!tenantId) throw new Error("Consultório não encontrado para este usuário.");
  return tenantId as string;
}

export const runFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunFlowInput.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context);
    const { executeFlow } = await import("./flow-engine.server");
    return executeFlow({
      tenantId,
      flowId: data.flowId,
      contactId: data.contactId ?? null,
      isTest: data.isTest,
      userId: context.userId,
    });
  });

export const listFlowRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListRunsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: runs, error } = await context.supabase
      .from("flow_runs")
      .select("id, status, is_test, trigger, error, started_at, finished_at, contact_id")
      .eq("flow_id", data.flowId)
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return runs ?? [];
  });

export const getFlowRunSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunStepsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: steps, error } = await context.supabase
      .from("flow_run_steps")
      .select("id, position, kind, label, content, status, output, error")
      .eq("run_id", data.runId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return steps ?? [];
  });
