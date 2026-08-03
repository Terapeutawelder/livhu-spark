/**
 * Motor de notificações (server-only).
 * Lê a fila `notification_jobs` e envia por WhatsApp (Meta Cloud API) e e-mail.
 */
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  type NotificationChannel,
  type NotificationEvent,
} from "@/lib/notifications.templates";

const MAX_ATTEMPTS = 4;
const BATCH_SIZE = 40;

type JobRow = {
  id: string;
  tenant_id: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  contact_id: string | null;
  appointment_id: string | null;
  to_phone: string | null;
  to_email: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

function fmtDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "long" }).format(new Date(iso));
}
function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Está dentro do horário de silêncio do consultório? */
export function inQuietHours(nowIso: string, tz: string, start: number, end: number): boolean {
  if (start === end) return false;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(new Date(nowIso)),
  );
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

export async function processDueNotifications(opts?: { limit?: number; jobId?: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let query = supabaseAdmin
    .from("notification_jobs")
    .select(
      "id, tenant_id, event, channel, contact_id, appointment_id, to_phone, to_email, payload, attempts",
    )
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true });

  if (opts?.jobId) {
    query = query.eq("id", opts.jobId);
  } else {
    query = query.limit(opts?.limit ?? BATCH_SIZE);
  }

  const { data: jobs } = await query;

  const list = (jobs ?? []) as unknown as JobRow[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of list) {
    try {
      const result = await deliver(job);
      if (result.ok) {
        sent++;
        await supabaseAdmin
          .from("notification_jobs")
          .update({ status: "sent", sent_at: new Date().toISOString(), attempts: job.attempts + 1, last_error: null })
          .eq("id", job.id);
      } else if (result.retry && job.attempts + 1 < MAX_ATTEMPTS) {
        failed++;
        await supabaseAdmin
          .from("notification_jobs")
          .update({
            status: "pending",
            attempts: job.attempts + 1,
            last_error: result.error ?? null,
            send_at: new Date(Date.now() + (job.attempts + 1) * 5 * 60 * 1000).toISOString(),
          })
          .eq("id", job.id);
      } else {
        if (result.retry) failed++;
        else skipped++;
        await supabaseAdmin
          .from("notification_jobs")
          .update({
            status: result.retry ? "failed" : "skipped",
            attempts: job.attempts + 1,
            last_error: result.error ?? null,
          })
          .eq("id", job.id);
      }
    } catch (err) {
      failed++;
      await supabaseAdmin
        .from("notification_jobs")
        .update({
          status: job.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts: job.attempts + 1,
          last_error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", job.id);
    }
  }

  return { processed: list.length, sent, failed, skipped };
}

type DeliverResult = { ok: boolean; retry?: boolean; error?: string };

async function deliver(job: JobRow): Promise<DeliverResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: tenant }, { data: settings }, { data: template }, { data: contact }] = await Promise.all([
    supabaseAdmin.from("tenants").select("id, name, timezone, is_active").eq("id", job.tenant_id).maybeSingle(),
    supabaseAdmin.from("notification_settings").select("*").eq("tenant_id", job.tenant_id).maybeSingle(),
    supabaseAdmin
      .from("notification_templates")
      .select("subject, body, is_active, wa_template_name, wa_template_language")
      .eq("tenant_id", job.tenant_id)
      .eq("event", job.event)
      .eq("channel", job.channel)
      .maybeSingle(),
    job.contact_id
      ? supabaseAdmin.from("contacts").select("full_name, phone, email").eq("id", job.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!tenant || !tenant.is_active) return { ok: false, retry: false, error: "Consultório inativo." };
  if (template && template.is_active === false) return { ok: false, retry: false, error: "Modelo desativado." };
  if (settings) {
    if (job.channel === "whatsapp" && settings.whatsapp_enabled === false) {
      return { ok: false, retry: false, error: "WhatsApp desativado." };
    }
    if (job.channel === "email" && settings.email_enabled === false) {
      return { ok: false, retry: false, error: "E-mail desativado." };
    }
  }

  const tz = tenant.timezone || "America/Sao_Paulo";

  // Silêncio noturno: só adia avisos não urgentes (lembretes de 1h/15min sempre saem).
  const quietStart = settings?.quiet_start ?? 21;
  const quietEnd = settings?.quiet_end ?? 8;
  const urgent = job.event === "reminder_1h" || job.event === "reminder_15m";
  if (!urgent && inQuietHours(new Date().toISOString(), tz, quietStart, quietEnd)) {
    const next = new Date();
    next.setUTCHours(next.getUTCHours() + 1);
    await supabaseAdmin.from("notification_jobs").update({ send_at: next.toISOString() }).eq("id", job.id);
    return { ok: false, retry: false, error: "Adiado (horário de silêncio)." };
  }

  const payload = job.payload ?? {};
  const startsAt = typeof payload.starts_at === "string" ? payload.starts_at : null;
  const vars: Record<string, string> = {
    paciente: (contact?.full_name ?? "").split(" ")[0] || "tudo bem",
    profissional: settings?.sender_name || tenant.name,
    servico: String(payload.title ?? payload.service ?? "sua sessão"),
    data: startsAt ? fmtDate(startsAt, tz) : "",
    hora: startsAt ? fmtTime(startsAt, tz) : "",
    modalidade: payload.modality === "presencial" ? "presencial" : "online",
    link: String(payload.meeting_url ?? payload.checkout_url ?? payload.location ?? ""),
    valor: typeof payload.amount_cents === "number" ? fmtMoney(payload.amount_cents) : "",
  };

  const defaults = DEFAULT_TEMPLATES[job.event];
  const bodyText = renderTemplate(template?.body || defaults.body, vars);
  const subject = renderTemplate(template?.subject || defaults.subject, vars);

  if (job.channel === "whatsapp") {
    return sendViaWhatsApp(job, bodyText, template?.wa_template_name ?? null, template?.wa_template_language ?? "pt_BR", vars);
  }
  return sendViaEmail(job, subject, bodyText, vars);
}

async function sendViaWhatsApp(
  job: JobRow,
  body: string,
  waTemplateName: string | null,
  waLanguage: string,
  vars: Record<string, string>,
): Promise<DeliverResult> {
  if (!job.to_phone) return { ok: false, retry: false, error: "Paciente sem telefone." };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: channel } = await supabaseAdmin
    .from("whatsapp_channels")
    .select("id, phone_number_id, access_token")
    .eq("tenant_id", job.tenant_id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!channel?.phone_number_id || !channel.access_token) {
    return { ok: false, retry: false, error: "Nenhum canal WhatsApp ativo." };
  }

  // Créditos pré-pagos: consultórios no modo gerenciado precisam de saldo.
  const { data: hasCredit, error: creditError } = await supabaseAdmin.rpc("consume_message_credit", {
    _tenant_id: job.tenant_id,
    _reference: job.id,
  });
  if (creditError) return { ok: false, retry: true, error: creditError.message };
  if (hasCredit === false) {
    return { ok: false, retry: false, error: "Sem créditos de mensagem. Compre um pacote para continuar." };
  }

  const { decryptToken } = await import("@/lib/token-crypto.server");
  const { sendText, sendTemplate, normalizePhone } = await import("@/lib/whatsapp.server");
  const creds = { phoneNumberId: channel.phone_number_id, accessToken: await decryptToken(channel.access_token) };
  const to = normalizePhone(job.to_phone);

  try {
    if (waTemplateName) {
      await sendTemplate(creds, to, waTemplateName, waLanguage, [
        vars.paciente,
        vars.data,
        vars.hora,
      ]);
    } else {
      await sendText(creds, to, body);
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fora da janela de 24h a Meta exige template aprovado — não adianta repetir.
    const permanent = /template|24|re-?engagement|131047|opt/i.test(msg);
    return { ok: false, retry: !permanent, error: msg };
  }
}

async function sendViaEmail(
  job: JobRow,
  subject: string,
  body: string,
  vars: Record<string, string>,
): Promise<DeliverResult> {
  if (!job.to_email) return { ok: false, retry: false, error: "Paciente sem e-mail." };
  const { sendNotificationEmail } = await import("@/lib/notifications-email.server");
  return sendNotificationEmail({
    to: job.to_email,
    subject,
    body,
    senderName: vars.profissional,
    idempotencyKey: `notif-${job.id}`,
  });
}
