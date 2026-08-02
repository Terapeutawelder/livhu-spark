import type { Database } from "@/integrations/supabase/types";

export type AvailabilityWindow = { day: number; start: string; end: string };
type Availability = {
  start_hour?: number;
  end_hour?: number;
  days?: number[];
  windows?: AvailabilityWindow[];
  gap_minutes?: number;
  min_advance_hours?: number;
};
type TenantSettings = { availability?: Availability } & Record<string, unknown>;

export type PublicTenant = {
  tenantId: string;
  timezone: string;
  availability: {
    start_hour: number;
    end_hour: number;
    days: number[];
    windows: AvailabilityWindow[];
    gap_minutes: number;
    min_advance_hours: number;
  };
  content: Record<string, unknown>;
};

function parseHm(v: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 24 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - date.getTime();
}

/** Converte data/hora local do consultório para instante UTC. */
export function zonedToUtc(dateStr: string, hour: number, minute: number, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute, 0);
  const offset = tzOffsetMs(timeZone, new Date(guess));
  return new Date(guess - offset);
}

/** Dia da semana (0=Dom) da data no fuso do consultório. */
export function weekdayOf(dateStr: string, timeZone: string): number {
  const noon = zonedToUtc(dateStr, 12, 0, timeZone);
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
}

export async function loadPublicTenant(slug: string): Promise<PublicTenant | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("public_profiles")
    .select("tenant_id, content, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (!profile || !profile.is_published) return null;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, timezone, settings")
    .eq("id", profile.tenant_id)
    .maybeSingle();
  if (!tenant) return null;

  const settings = (tenant.settings ?? {}) as TenantSettings;
  const av = settings.availability ?? {};
  return {
    tenantId: tenant.id,
    timezone: tenant.timezone || "America/Sao_Paulo",
    availability: {
      start_hour: av.start_hour ?? 8,
      end_hour: av.end_hour ?? 19,
      days: av.days ?? [1, 2, 3, 4, 5],
    },
    content: (profile.content ?? {}) as Record<string, unknown>,
  };
}

export async function computeSlots(
  slug: string,
  dateStr: string,
  durationMinutes: number,
): Promise<{ slots: string[]; timezone: string }> {
  const tenant = await loadPublicTenant(slug);
  if (!tenant) return { slots: [], timezone: "America/Sao_Paulo" };

  const weekday = weekdayOf(dateStr, tenant.timezone);
  if (!tenant.availability.days.includes(weekday)) return { slots: [], timezone: tenant.timezone };

  const dayStart = zonedToUtc(dateStr, tenant.availability.start_hour, 0, tenant.timezone);
  const dayEnd = zonedToUtc(dateStr, tenant.availability.end_hour, 0, tenant.timezone);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: busy } = await supabaseAdmin
    .from("appointments")
    .select("starts_at, ends_at, status")
    .eq("tenant_id", tenant.tenantId)
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());

  const blocks = (busy ?? [])
    .filter((b) => b.status !== "canceled")
    .map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const);

  const step = 30 * 60 * 1000;
  const dur = durationMinutes * 60 * 1000;
  const now = Date.now() + 60 * 60 * 1000; // antecedência mínima de 1h
  const slots: string[] = [];

  for (let t = dayStart.getTime(); t + dur <= dayEnd.getTime(); t += step) {
    if (t < now) continue;
    const overlaps = blocks.some(([s, e]) => t < e && t + dur > s);
    if (!overlaps) slots.push(new Date(t).toISOString());
  }
  return { slots, timezone: tenant.timezone };
}

export type BookingInput = {
  slug: string;
  serviceId: string | null;
  startsAt: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export async function createPublicBooking(
  input: BookingInput,
): Promise<{ ok: true; checkoutUrl: string | null; startsAt: string } | { ok: false; error: string }> {
  const tenant = await loadPublicTenant(input.slug);
  if (!tenant) return { ok: false, error: "Página não encontrada." };

  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
    return { ok: false, error: "Horário inválido." };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let duration = 50;
  let serviceName = "Sessão";
  let priceCents = 0;
  let modality: Database["public"]["Enums"]["service_modality"] = "online";

  if (input.serviceId) {
    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, name, duration_minutes, price_cents, modality, tenant_id, is_active")
      .eq("id", input.serviceId)
      .maybeSingle();
    if (!service || service.tenant_id !== tenant.tenantId || !service.is_active) {
      return { ok: false, error: "Serviço indisponível." };
    }
    duration = service.duration_minutes;
    serviceName = service.name;
    priceCents = service.price_cents;
    modality = service.modality === "ambos" ? "online" : service.modality;
  }

  const end = new Date(start.getTime() + duration * 60 * 1000);

  // Valida disponibilidade novamente no servidor
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone }).format(start);
  const { slots } = await computeSlots(input.slug, dateStr, duration);
  if (!slots.includes(start.toISOString())) {
    return { ok: false, error: "Este horário acabou de ser ocupado. Escolha outro." };
  }

  const phone = input.phone.replace(/\D/g, "");
  let contactId: string | null = null;
  if (phone) {
    const { data: existing } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("tenant_id", tenant.tenantId)
      .eq("phone", phone)
      .maybeSingle();
    contactId = existing?.id ?? null;
  }
  if (!contactId) {
    const { data: created, error: contactErr } = await supabaseAdmin
      .from("contacts")
      .insert({
        tenant_id: tenant.tenantId,
        full_name: input.name,
        phone: phone || null,
        email: input.email || null,
        source: "landing_page",
      })
      .select("id")
      .single();
    if (contactErr) return { ok: false, error: contactErr.message };
    contactId = created.id;
  }

  const { error: apptErr } = await supabaseAdmin.from("appointments").insert({
    tenant_id: tenant.tenantId,
    contact_id: contactId,
    service_id: input.serviceId,
    title: `${serviceName} — ${input.name}`,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    modality,
    status: "scheduled",
    kind: "appointment",
    notes: input.notes || null,
  });
  if (apptErr) return { ok: false, error: apptErr.message };

  const links = (tenant.content.checkoutLinks ?? {}) as Record<string, string>;
  const rawLink = (input.serviceId && links[input.serviceId]) || links.default || "";
  const checkoutUrl = priceCents > 0 && rawLink ? rawLink : null;

  return { ok: true, checkoutUrl, startsAt: start.toISOString() };
}
