import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/disparos")({
  head: () => ({
    meta: [
      { title: "Disparos — LivHub" },
      { name: "description", content: "Campanhas em massa no WhatsApp." },
      { property: "og:title", content: "Disparos — LivHub" },
      { property: "og:description", content: "Disparos LivHub." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Disparos em massa"
      description="Assistente em 4 passos: detalhes, audiência, conteúdo (Template Meta ou Fluxo LivHub) e revisão."
    />
  ),
});
