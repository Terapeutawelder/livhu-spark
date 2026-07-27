import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/agendamento")({
  head: () => ({
    meta: [
      { title: "Agendamento — LivHub" },
      { name: "description", content: "Calendário e auto-agendamento de sessões via WhatsApp." },
      { property: "og:title", content: "Agendamento — LivHub" },
      { property: "og:description", content: "Calendário e auto-agendamento de sessões via WhatsApp." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Agendamento"
      description="Calendário integrado com auto-agendamento pelo WhatsApp, confirmações e lembretes automáticos."
    />
  ),
});
