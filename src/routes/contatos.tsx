import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos — LivHub" },
      { name: "description", content: "Base de leads e pacientes com tags, histórico e valor gerado." },
      { property: "og:title", content: "Contatos — LivHub" },
      { property: "og:description", content: "Gestão de contatos do LivHub." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Contatos"
      description="Base completa de leads e pacientes: tags, campos customizados, histórico de interação e valor gerado."
    />
  ),
});
