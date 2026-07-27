import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban — LivHub" },
      { name: "description", content: "Jornada do paciente em pipeline visual." },
      { property: "og:title", content: "Kanban — LivHub" },
      { property: "og:description", content: "Pipeline visual da jornada clínica." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Jornada do paciente"
      description="Quadro Kanban com Novos Leads → Triagem → Agendou sessão → Pagamento → Paciente ativo, com drag-and-drop e automações."
    />
  ),
});
