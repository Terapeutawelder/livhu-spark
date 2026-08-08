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
