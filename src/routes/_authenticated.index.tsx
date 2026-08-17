import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getDashboardData } from "@/lib/dashboard.functions";
import { IndividualDashboard } from "@/components/dashboards/individual-dashboard";
import { ClinicDashboard } from "@/components/dashboards/clinic-dashboard";
import { WhitelabelDashboard } from "@/components/dashboards/whitelabel-dashboard";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: async () => {
    const { data } = await supabase.from("user_roles").select("role").eq("role", "super_admin").maybeSingle();
    if (data) throw redirect({ to: "/admin" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions),
  head: () => ({
    meta: [
      { title: "Dashboard — LivHub" },
      {
        name: "description",
        content: "Visão geral da sua prática: mensagens, sessões, faturamento e entregabilidade.",
      },
      { property: "og:title", content: "Dashboard — LivHub" },
      {
        property: "og:description",
        content: "Visão geral da sua prática: mensagens, sessões, faturamento e entregabilidade.",
      },
    ],
  }),
  component: Dashboard,
});

const dashboardQueryOptions = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardData(),
  staleTime: 60 * 1000,
});

/** Cada tipo de plano tem o seu próprio dashboard. */
function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQueryOptions);
  const accountType = (data.usage as { account_type?: string } | null)?.account_type ?? "individual";

  if (accountType === "whitelabel") return <WhitelabelDashboard data={data} />;
  if (accountType === "clinic") return <ClinicDashboard data={data} />;
  return <IndividualDashboard data={data} />;
}
