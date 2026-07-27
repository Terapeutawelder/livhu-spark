import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/fluxos")({
  head: () => ({
    meta: [
      { title: "Fluxos — LivHub" },
      { name: "description", content: "Construtor visual de automação de conversas." },
      { property: "og:title", content: "Fluxos — LivHub" },
      { property: "og:description", content: "Editor de fluxos LivHub." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Construtor de Fluxos"
      description="Editor visual drag-and-drop com gatilhos, conteúdo, lógica, dados/CRM, requisições HTTP e Agentes de IA."
    />
  ),
});
