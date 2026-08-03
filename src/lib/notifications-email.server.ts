/**
 * Envio de e-mails de notificação (server-only).
 *
 * Enquanto o domínio de envio não estiver verificado, os jobs de e-mail
 * ficam marcados como "ignorados" com o motivo — nada é perdido.
 */

export type EmailSendResult = { ok: boolean; retry?: boolean; error?: string };

export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  body: string;
  senderName: string;
  idempotencyKey: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const senderDomain = process.env.NOTIFICATIONS_EMAIL_DOMAIN;

  if (!apiKey || !senderDomain) {
    return { ok: false, retry: false, error: "E-mail ainda não configurado (domínio de envio pendente)." };
  }

  const html = renderHtml(input.subject, input.body, input.senderName);

  try {
    const res = await fetch("https://email.lovable.dev/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        sender_domain: senderDomain,
        from: { name: input.senderName, email: `nao-responda@${senderDomain}` },
        to: input.to,
        subject: input.subject,
        html,
        text: input.body,
      }),
    });

    if (res.ok) return { ok: true };

    const text = await res.text();
    if (res.status === 429 || res.status >= 500) return { ok: false, retry: true, error: text.slice(0, 300) };
    return { ok: false, retry: false, error: text.slice(0, 300) };
  } catch (err) {
    return { ok: false, retry: true, error: err instanceof Error ? err.message : String(err) };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(subject: string, body: string, senderName: string) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#1f2430;font-size:15px">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="border:1px solid #ece6da;border-radius:16px;overflow:hidden">
      <div style="background:#111214;padding:20px 24px">
        <span style="color:#e3b04b;font-size:16px;font-weight:700;letter-spacing:.3px">${escapeHtml(senderName)}</span>
      </div>
      <div style="padding:28px 24px">
        <h1 style="margin:0 0 18px;font-size:19px;color:#111214">${escapeHtml(subject)}</h1>
        ${paragraphs}
      </div>
    </div>
    <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8d8677">Enviado automaticamente pelo LivHub</p>
  </div>
</body></html>`;
}
