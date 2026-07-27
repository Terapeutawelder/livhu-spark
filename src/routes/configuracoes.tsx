import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — LivHub" },
      { name: "description", content: "Configurações do negócio: WhatsApp, integrações, equipe." },
      { property: "og:title", content: "Configurações — LivHub" },
      { property: "og:description", content: "Configurações LivHub." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Configurações do negócio"
      description="WhatsApp Cloud, integrações, templates, departamentos, colaboradores, produtos, links de mensagem, chaves de API e documentação."
    />
  ),
});
