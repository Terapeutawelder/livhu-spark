import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/remarketing")({
  head: () => ({
    meta: [
      { title: "Remarketing — LivHub" },
      { name: "description", content: "Reengajamento automatizado pós-funil." },
      { property: "og:title", content: "Remarketing — LivHub" },
      { property: "og:description", content: "Campanhas de reengajamento." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Remarketing"
      description="Etapas sequenciais para reengajar pacientes que não confirmaram agendamento, não compareceram ou abandonaram o pagamento."
    />
  ),
});
