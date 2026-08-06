/**
 * Checkout de pagamento por consultório (server-only).
 * Suporta Mercado Pago e Stripe com as credenciais do próprio profissional.
 */

export type PaymentProvider = "mercadopago" | "stripe";

export type PaymentSettings = {
  tenantId: string;
  provider: PaymentProvider;
  isActive: boolean;
  currency: string;
  mpAccessToken: string | null;
  stripeSecret: string | null;
  stripeWebhookSecret: string | null;
  meetingMode: "virtual" | "fixed" | "none";
  fixedMeetingUrl: string | null;
};

export function defaultBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL || "https://psi.livhub.cloud";
}

export async function loadPaymentSettings(tenantId: string): Promise<PaymentSettings | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { decryptToken } = await import("@/lib/token-crypto.server");

  const { data } = await supabaseAdmin
    .from("payment_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!data) return null;

  return {
    tenantId,
    provider: (data.provider === "stripe" ? "stripe" : "mercadopago") as PaymentProvider,
    isActive: Boolean(data.is_active),
    currency: data.currency || "BRL",
    mpAccessToken: data.mp_access_token_enc ? await decryptToken(data.mp_access_token_enc) : null,
    stripeSecret: data.stripe_secret_enc ? await decryptToken(data.stripe_secret_enc) : null,
    stripeWebhookSecret: data.stripe_webhook_secret_enc
      ? await decryptToken(data.stripe_webhook_secret_enc)
      : null,
    meetingMode: (data.meeting_mode as PaymentSettings["meetingMode"]) ?? "virtual",
    fixedMeetingUrl: data.fixed_meeting_url ?? null,
  };
}

/** Link da sala online da sessão (sala virtual gerada ou link fixo do profissional). */
export function buildMeetingUrl(settings: PaymentSettings | null, appointmentId: string): string | null {
  if (!settings || settings.meetingMode === "none") return null;
  if (settings.meetingMode === "fixed") return settings.fixedMeetingUrl || null;
  return `https://meet.jit.si/livhub-${appointmentId.replace(/-/g, "").slice(0, 16)}`;
}

type CheckoutInput = {
  settings: PaymentSettings;
  orderId: string;
  title: string;
  amountCents: number;
  baseUrl: string;
  payer: { name: string; email?: string | null };
};

export async function createCheckout(
  input: CheckoutInput,
): Promise<{ ok: true; url: string; externalId: string | null } | { ok: false; error: string }> {
  const { settings } = input;
  if (settings.provider === "stripe") return createStripeCheckout(input);
  return createMercadoPagoCheckout(input);
}

async function createMercadoPagoCheckout(input: CheckoutInput) {
  const token = input.settings.mpAccessToken;
  if (!token) return { ok: false as const, error: "Mercado Pago não configurado." };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          currency_id: input.settings.currency || "BRL",
          unit_price: Number((input.amountCents / 100).toFixed(2)),
        },
      ],
      payer: { name: input.payer.name, ...(input.payer.email ? { email: input.payer.email } : {}) },
      external_reference: input.orderId,
      notification_url: `${input.baseUrl}/api/public/hooks/payments/mercadopago`,
      back_urls: {
        success: `${input.baseUrl}/pagamento/retorno?order=${input.orderId}&status=sucesso`,
        pending: `${input.baseUrl}/pagamento/retorno?order=${input.orderId}&status=pendente`,
        failure: `${input.baseUrl}/pagamento/retorno?order=${input.orderId}&status=falha`,
      },
      auto_return: "approved",
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | { id?: string; init_point?: string; sandbox_init_point?: string; message?: string }
    | null;
  if (!res.ok || !body?.init_point) {
    return { ok: false as const, error: body?.message || `Mercado Pago ${res.status}` };
  }
  return { ok: true as const, url: body.init_point, externalId: body.id ?? null };
}

async function createStripeCheckout(input: CheckoutInput) {
  const secret = input.settings.stripeSecret;
  if (!secret) return { ok: false as const, error: "Stripe não configurado." };

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${input.baseUrl}/pagamento/retorno?order=${input.orderId}&status=sucesso`);
  form.set("cancel_url", `${input.baseUrl}/pagamento/retorno?order=${input.orderId}&status=falha`);
  form.set("client_reference_id", input.orderId);
  form.set("metadata[order_id]", input.orderId);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", (input.settings.currency || "BRL").toLowerCase());
  form.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  form.set("line_items[0][price_data][product_data][name]", input.title);
  if (input.payer.email) form.set("customer_email", input.payer.email);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body = (await res.json().catch(() => null)) as
    | { id?: string; url?: string; error?: { message?: string } }
    | null;
  if (!res.ok || !body?.url) {
    return { ok: false as const, error: body?.error?.message || `Stripe ${res.status}` };
  }
  return { ok: true as const, url: body.url, externalId: body.id ?? null };
}

/** Consulta o provedor para saber se a cobrança foi mesmo paga (nunca confia no webhook). */
export async function isOrderPaidAtProvider(
  settings: PaymentSettings,
  order: { external_id: string | null; provider: string },
  hint?: { paymentId?: string },
): Promise<boolean> {
  if (settings.provider === "mercadopago" || order.provider === "mercadopago") {
    const token = settings.mpAccessToken;
    if (!token) return false;
    if (hint?.paymentId) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${hint.paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const p = (await res.json()) as { status?: string };
      return p.status === "approved";
    }
    return false;
  }

  const secret = settings.stripeSecret;
  if (!secret || !order.external_id) return false;
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${order.external_id}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return false;
  const s = (await res.json()) as { payment_status?: string };
  return s.payment_status === "paid";
}

/**
 * Confirma o pagamento: marca a cobrança como paga, confirma a sessão,
 * garante o link da sala online e dispara a notificação no WhatsApp/e-mail.
 */
export async function confirmPaidOrder(orderId: string, providerPaymentId?: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("payment_orders")
    .select("id, tenant_id, appointment_id, contact_id, provider, external_id, amount_cents, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return false;
  if (order.status === "paid") return true;

  const settings = await loadPaymentSettings(order.tenant_id);
  if (!settings) return false;

  const paid = await isOrderPaidAtProvider(settings, order, { paymentId: providerPaymentId });
  if (!paid) return false;

  await supabaseAdmin
    .from("payment_orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", order.id);

  let meetingUrl: string | null = null;
  let startsAt: string | null = null;
  let title = "sua sessão";
  let modality = "online";
  let phone: string | null = null;
  let email: string | null = null;

  if (order.appointment_id) {
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, title, starts_at, modality, meeting_url, location")
      .eq("id", order.appointment_id)
      .maybeSingle();
    if (appt) {
      startsAt = appt.starts_at;
      title = appt.title;
      modality = appt.modality;
      meetingUrl = appt.meeting_url || (modality === "online" ? buildMeetingUrl(settings, appt.id) : appt.location);
      await supabaseAdmin
        .from("appointments")
        .update({ status: "confirmed", meeting_url: modality === "online" ? meetingUrl : appt.meeting_url })
        .eq("id", appt.id);
    }
  }

  if (order.contact_id) {
    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("phone, email")
      .eq("id", order.contact_id)
      .maybeSingle();
    phone = contact?.phone ?? null;
    email = contact?.email ?? null;
  }

  const payload = {
    title,
    starts_at: startsAt,
    modality,
    meeting_url: meetingUrl,
    amount_cents: order.amount_cents,
  };

  const jobs: Record<string, unknown>[] = [];
  if (phone) {
    jobs.push({
      tenant_id: order.tenant_id,
      event: "payment_received" as const,
      channel: "whatsapp" as const,
      contact_id: order.contact_id,
      appointment_id: order.appointment_id,
      to_phone: phone,
      send_at: new Date().toISOString(),
      payload,
      dedupe_key: `${order.tenant_id}:payment_received:whatsapp:${order.id}`,
    });
  }
  if (email) {
    jobs.push({
      tenant_id: order.tenant_id,
      event: "payment_received" as const,
      channel: "email" as const,
      contact_id: order.contact_id,
      appointment_id: order.appointment_id,
      to_email: email,
      send_at: new Date().toISOString(),
      payload,
      dedupe_key: `${order.tenant_id}:payment_received:email:${order.id}`,
    });
  }
  if (jobs.length) {
    await supabaseAdmin.from("notification_jobs").insert(jobs as never);
  }

  return true;
}
