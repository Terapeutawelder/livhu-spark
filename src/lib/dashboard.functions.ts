import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Tenant corrente e perfil do usuário
    const [{ data: tenantIdRes }, { data: profile }] = await Promise.all([
      supabase.rpc("current_tenant_id"),
      supabase.from("profiles").select("id, full_name, avatar_url").eq("id", userId).maybeSingle(),
    ]);

    const tenantId = tenantIdRes as string | null;
    if (!tenantId) {
      return {
        profile,
        usage: null,
        messageTotals: { sent: 0, received: 0, delivered: 0, read: 0, failed: 0 },
        last7Days: [],
        upcomingSessions: [],
        monthlyRevenue: [],
      };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const [
      { data: usage },
      { data: messages7 },
      { data: upcomingSessionsRaw },
      { data: revenueRaw },
    ] = await Promise.all([
      supabase.rpc("get_tenant_usage"),
      supabase
        .from("whatsapp_messages")
        .select("created_at, direction, status")
        .eq("tenant_id", tenantId)
        .gte("created_at", last7[0].toISOString())
        .lt("created_at", new Date(startOfToday.getTime() + 86400000).toISOString()),
      supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at, status, modality, contacts(full_name)")
        .eq("tenant_id", tenantId)
        .gte("starts_at", now.toISOString())
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("payment_orders")
        .select("amount_cents, paid_at")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(200),
    ]);

    // Agrupamento das mensagens por dia e direção
    const ptDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const last7Days = last7.map((date) => {
      const iso = date.toISOString().split("T")[0];
      const dayMessages =
        messages7?.filter((m) => m.created_at?.startsWith(iso)) ?? [];
      return {
        d: ptDays[date.getDay()],
        enviadas: dayMessages.filter((m) => m.direction === "outbound").length,
        recebidas: dayMessages.filter((m) => m.direction === "inbound").length,
      };
    });

    const messageTotals = {
      sent: messages7?.filter((m) => m.direction === "outbound").length ?? 0,
      received: messages7?.filter((m) => m.direction === "inbound").length ?? 0,
      delivered: messages7?.filter((m) => m.status === "delivered").length ?? 0,
      read: messages7?.filter((m) => m.status === "read").length ?? 0,
      failed: messages7?.filter((m) => m.status === "failed").length ?? 0,
    };

    // Sessões futuras formatadas
    const upcomingSessions =
      upcomingSessionsRaw?.map((a: any) => {
        const start = new Date(a.starts_at);
        const isToday = start.toDateString() === now.toDateString();
        const dayLabel = isToday
          ? "Hoje"
          : start.toLocaleDateString("pt-BR", { weekday: "long" });
        const time = start.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          id: a.id,
          title: a.title,
          who: a.contacts?.full_name ?? "Paciente",
          time: `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} · ${time}`,
          modality: a.modality,
        };
      }) ?? [];

    // Faturamento mensal dos últimos 11 meses
    const months: { m: string; v: number }[] = [];
    for (let i = 10; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const value =
        revenueRaw
          ?.filter((r) => r.paid_at?.startsWith(key))
          .reduce((sum, r) => sum + (r.amount_cents ?? 0), 0) ?? 0;
      months.push({
        m: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        v: value,
      });
    }

    return {
      profile,
      usage: usage?.[0] ?? null,
      messageTotals,
      last7Days,
      upcomingSessions,
      monthlyRevenue: months,
    };
  });

/** Métricas exclusivas do plano Clínica: equipe, sessões e faturamento por profissional. */
export const getClinicDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: tenantIdRes } = await supabase.rpc("current_tenant_id");
    const tenantId = tenantIdRes as string | null;
    if (!tenantId) return { members: [], sessionsByMember: [], totals: { members: 0, sessions30d: 0, revenue30d: 0 }, myRole: null };

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: members }, { data: appts }, { data: orders }] = await Promise.all([
      supabase.from("tenant_members").select("user_id, role, created_at").eq("tenant_id", tenantId),
      supabase
        .from("appointments")
        .select("id, created_by, status, starts_at")
        .eq("tenant_id", tenantId)
        .gte("starts_at", since),
      supabase
        .from("payment_orders")
        .select("amount_cents, paid_at")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("paid_at", since),
    ]);

    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids)
      : { data: [] as { id: string; full_name: string | null; email: string | null; avatar_url: string | null }[] };

    const enriched = (members ?? []).map((m) => {
      const p = profiles?.find((x) => x.id === m.user_id);
      const sessions = (appts ?? []).filter((a) => a.created_by === m.user_id);
      return {
        user_id: m.user_id,
        role: m.role as string,
        name: p?.full_name ?? p?.email ?? "Profissional",
        email: p?.email ?? "",
        avatar_url: p?.avatar_url ?? null,
        sessions: sessions.length,
        completed: sessions.filter((a) => a.status === "completed").length,
      };
    });

    return {
      members: enriched,
      sessionsByMember: enriched.map((m) => ({ name: m.name.split(" ")[0], sessoes: m.sessions })),
      totals: {
        members: enriched.length,
        sessions30d: appts?.length ?? 0,
        revenue30d: (orders ?? []).reduce((s, o) => s + (o.amount_cents ?? 0), 0),
      },
      myRole: (members ?? []).find((m) => m.user_id === userId)?.role ?? null,
    };
  });

/** Métricas exclusivas do plano White-label: sub-contas revendidas. */
export const getWhitelabelDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: children } = await supabase.rpc("get_whitelabel_children");
    const rows = (children ?? []) as {
      id: string;
      name: string;
      slug: string;
      plan: string;
      account_type: string;
      is_active: boolean;
      created_at: string;
      contacts_count: number;
      members_count: number;
    }[];
    return {
      children: rows,
      totals: {
        accounts: rows.length,
        active: rows.filter((r) => r.is_active).length,
        contacts: rows.reduce((s, r) => s + (r.contacts_count ?? 0), 0),
        professionals: rows.reduce((s, r) => s + (r.members_count ?? 0), 0),
      },
    };
  });

/** Cria uma sub-conta vinculada à conta White-label do usuário. */
export const createWhitelabelSubAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; slug: string; accountType: "individual" | "clinic" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tenantIdRes } = await supabase.rpc("current_tenant_id");
    const parentId = tenantIdRes as string | null;
    if (!parentId) throw new Error("Conta não encontrada.");

    const { data: parent } = await supabase
      .from("tenants")
      .select("id, account_type, owner_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.account_type !== "whitelabel" || parent.owner_id !== userId) {
      throw new Error("Apenas o titular de uma conta White-label pode criar sub-contas.");
    }

    const slug = data.slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (slug.length < 3) throw new Error("Informe um identificador com ao menos 3 caracteres.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: data.name,
        slug,
        owner_id: userId,
        parent_tenant_id: parentId,
        account_type: data.accountType,
        plan: "trial",
        trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      })
      .select("id, name, slug")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });
