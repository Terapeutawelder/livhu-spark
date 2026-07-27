import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes IA — LivHub" },
      { name: "description", content: "Configuração dos agentes de IA clínicos." },
      { property: "og:title", content: "Agentes IA — LivHub" },
      { property: "og:description", content: "Agentes de IA do LivHub." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Agentes de IA"
      description="Construtor por abas: Detalhes, Inteligência, Produtos, Conhecimento, Transbordo, Gatilhos, Fluxos e Chat de Teste."
    />
  ),
});
