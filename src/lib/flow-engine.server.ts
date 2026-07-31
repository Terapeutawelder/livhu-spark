/**
 * Motor de execução dos fluxos de automação (server-only).
 * Executa os passos de um fluxo para um contato, registrando cada etapa
 * em flow_runs / flow_run_steps.
 */

export type FlowStepKind = "message" | "wait" | "ai" | "condition" | "notify";

export type FlowStep = {
  id?: string;
  kind: FlowStepKind;
  label: string;
  content: string;
};

type RunOptions = {
  tenantId: string;
  flowId: string;
  contactId?: string | null;
  trigger?: string;
  isTest: boolean;
  userId?: string | null;
};

export type StepResult = {
  position: number;
  kind: FlowStepKind;
  label: string;
  content: string;
  status: "ok" | "skipped" | "error";
  output: string | null;
  error: string | null;
};

export type RunResult = {
  runId: string;
  status: "completed" | "failed";
  steps: StepResult[];
  error: string | null;
};

function renderTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => vars[key] ?? `{{${key}}}`);
}

function firstName(full: string | null | undefined) {
  return (full ?? "").trim().split(/\s+/)[0] || "tudo bem";
}

async function loadWhatsappCreds(admin: any, tenantId: string) {
  const { data } = await admin
    .from("whatsapp_channels")
    .select("phone_number_id, access_token, waba_id, status")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.phone_number_id || !data?.access_token) return null;
  const { decryptToken } = await import("./token-crypto.server");
  return {
    phoneNumberId: data.phone_number_id as string,
    accessToken: await decryptToken(data.access_token),
    wabaId: data.waba_id as string | null,
  };
}

async function runAiStep(tenantId: string, instruction: string, vars: Record<string, string>) {
  const { loadTenantAiCredential, createProvider, defaultModel, friendlyAiError } = await import(
    "./byo-ai.server"
  );
  try {
    const credential = await loadTenantAiCredential(tenantId);
    const { client, provider } = createProvider(credential);
    const { generateText } = await import("ai");
    const model = credential ? defaultModel(credential.provider) : defaultModel(provider);
    const { text } = await generateText({
      model: client(model),
      system:
        "Você é uma assistente de um consultório de psicoterapia no Brasil. Responda em português do Brasil, " +
        "de forma acolhedora, breve (máx. 3 frases) e sem dar diagnósticos ou orientações clínicas. " +
        "Nunca prometa resultados terapêuticos.",
      prompt:
        `Contexto do contato: nome=${vars.nome}, telefone=${vars.telefone || "não informado"}.\n` +
        `Tarefa do passo do fluxo: ${instruction}\n` +
        `Escreva apenas a mensagem final a ser enviada ao contato.`,
    });
    return text.trim();
  } catch (err) {
    throw friendlyAiError(err);
  }
}

export async function executeFlow(opts: RunOptions): Promise<RunResult> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  const { data: flow, error: flowErr } = await admin
    .from("flows")
    .select("id, tenant_id, name, trigger, steps, is_active")
    .eq("id", opts.flowId)
    .eq("tenant_id", opts.tenantId)
    .maybeSingle();
  if (flowErr || !flow) throw new Error("Fluxo não encontrado.");

  const steps: FlowStep[] = Array.isArray(flow.steps) ? (flow.steps as unknown as FlowStep[]) : [];
  if (steps.length === 0) throw new Error("Este fluxo não possui passos para executar.");

  let contact: { id: string; full_name: string; phone: string | null; email: string | null } | null = null;
  if (opts.contactId) {
    const { data } = await admin
      .from("contacts")
      .select("id, full_name, phone, email")
      .eq("id", opts.contactId)
      .eq("tenant_id", opts.tenantId)
      .maybeSingle();
    contact = (data as any) ?? null;
  }

  const vars: Record<string, string> = {
    nome: firstName(contact?.full_name),
    nome_completo: contact?.full_name ?? "",
    telefone: contact?.phone ?? "",
    email: contact?.email ?? "",
    horario: "",
    modalidade: "",
    link_agendamento: "",
  };

  const { data: run, error: runErr } = await admin
    .from("flow_runs")
    .insert({
      tenant_id: opts.tenantId,
      flow_id: flow.id,
      contact_id: contact?.id ?? null,
      trigger: opts.trigger ?? flow.trigger,
      status: "running",
      is_test: opts.isTest,
      created_by: opts.userId ?? null,
    })
    .select("id")
    .single();
  if (runErr || !run) throw new Error("Não foi possível registrar a execução.");

  const results: StepResult[] = [];
  let creds: Awaited<ReturnType<typeof loadWhatsappCreds>> = null;
  let credsLoaded = false;
  let fatal: string | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const rendered = renderTemplate(step.content ?? "", vars);
    const base = {
      position: i,
      kind: step.kind,
      label: step.label ?? step.kind,
      content: rendered,
    };

    try {
      if (step.kind === "wait") {
        results.push({ ...base, status: "skipped", output: `Espera programada: ${rendered}`, error: null });
        continue;
      }

      if (step.kind === "condition") {
        results.push({
          ...base,
          status: "skipped",
          output: `Condição avaliada como verdadeira (continuando): ${rendered}`,
          error: null,
        });
        continue;
      }

      if (step.kind === "notify") {
        if (opts.isTest || !contact) {
          results.push({ ...base, status: "skipped", output: "Notificação simulada (teste).", error: null });
        } else {
          await admin.from("contact_notes").insert({
            tenant_id: opts.tenantId,
            contact_id: contact.id,
            body: `[Automação: ${flow.name}] ${rendered}`,
          });
          results.push({ ...base, status: "ok", output: "Nota registrada no contato.", error: null });
        }
        continue;
      }

      let outgoing = rendered;
      if (step.kind === "ai") {
        outgoing = await runAiStep(opts.tenantId, rendered, vars);
      }

      if (opts.isTest) {
        results.push({ ...base, status: "skipped", output: `Prévia: ${outgoing}`, error: null });
        continue;
      }

      if (!contact?.phone) {
        results.push({ ...base, status: "skipped", output: "Contato sem telefone — envio ignorado.", error: null });
        continue;
      }

      if (!credsLoaded) {
        creds = await loadWhatsappCreds(admin, opts.tenantId);
        credsLoaded = true;
      }
      if (!creds) {
        results.push({
          ...base,
          status: "skipped",
          output: "Nenhum canal WhatsApp conectado — envio ignorado.",
          error: null,
        });
        continue;
      }

      const { sendText, normalizePhone } = await import("./whatsapp.server");
      await sendText(creds, normalizePhone(contact.phone), outgoing);
      results.push({ ...base, status: "ok", output: `Mensagem enviada: ${outgoing}`, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao executar o passo.";
      results.push({ ...base, status: "error", output: null, error: msg });
      fatal = msg;
      break;
    }
  }

  if (results.length) {
    await admin.from("flow_run_steps").insert(
      results.map((r) => ({
        tenant_id: opts.tenantId,
        run_id: run.id,
        position: r.position,
        kind: r.kind,
        label: r.label,
        content: r.content,
        status: r.status,
        output: r.output,
        error: r.error,
      })),
    );
  }

  const status: RunResult["status"] = fatal ? "failed" : "completed";
  await admin
    .from("flow_runs")
    .update({ status, error: fatal, finished_at: new Date().toISOString() })
    .eq("id", run.id);

  if (!opts.isTest) {
    const { data: current } = await admin
      .from("flows")
      .select("runs_count, success_count, error_count")
      .eq("id", flow.id)
      .maybeSingle();
    await admin
      .from("flows")
      .update({
        runs_count: (current?.runs_count ?? 0) + 1,
        success_count: (current?.success_count ?? 0) + (fatal ? 0 : 1),
        error_count: (current?.error_count ?? 0) + (fatal ? 1 : 0),
        last_run_at: new Date().toISOString(),
      })
      .eq("id", flow.id);
  }

  return { runId: run.id, status, steps: results, error: fatal };
}

/** Dispara todos os fluxos ativos de um tenant para um gatilho. */
export async function runFlowsForTrigger(params: {
  tenantId: string;
  trigger: string;
  contactId?: string | null;
}) {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: flows } = await admin
    .from("flows")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("trigger", params.trigger)
    .eq("is_active", true);

  const results: string[] = [];
  for (const f of flows ?? []) {
    try {
      const r = await executeFlow({
        tenantId: params.tenantId,
        flowId: f.id,
        contactId: params.contactId ?? null,
        trigger: params.trigger,
        isTest: false,
      });
      results.push(`${f.id}:${r.status}`);
    } catch (err) {
      console.error("flow trigger failed", f.id, err);
    }
  }
  return results;
}
