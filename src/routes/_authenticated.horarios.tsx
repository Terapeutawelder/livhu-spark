import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/horarios")({
  beforeLoad: () => {
    throw redirect({ to: "/calendario", replace: true });
  },
});
