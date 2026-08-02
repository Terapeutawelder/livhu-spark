import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes IA — LivHub" },
      { name: "description", content: "Configure agentes de IA para triagem, atendimento e follow-up automatizado." },
      { property: "og:title", content: "Agentes IA — LivHub" },
      { property: "og:description", content: "Agentes de IA especializados no atendimento terapêutico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});