import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/mensagens")({
  head: () => ({
    meta: [
      { title: "Mensagens — LivHub" },
      { name: "description", content: "Caixa de entrada do WhatsApp com atendimento humano + IA." },
      { property: "og:title", content: "Mensagens — LivHub" },
      { property: "og:description", content: "Inbox unificada do LivHub." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Inbox WhatsApp"
      description="Aqui vai a caixa de entrada estilo WhatsApp Web com atendimento humano + IA, painel de funil do paciente e transferência entre departamentos."
    />
  ),
});
