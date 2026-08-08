import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location, context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) {
      throw redirect({ to: "/admin/login", search: { redirect: location.href } });
    }
    // Cache the role check via react-query so navigating between admin pages
    // doesn't hit the network on every transition.
    const isSuperAdmin = await context.queryClient.ensureQueryData({
      queryKey: ["is-super-admin", user.id],
      staleTime: 5 * 60 * 1000,
      queryFn: async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();
        return !!data;
      },
    });
    if (!isSuperAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
