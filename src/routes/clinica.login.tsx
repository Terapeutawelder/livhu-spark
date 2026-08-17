import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PlanLogin } from "@/components/plan-login";

export const Route = createFileRoute("/clinica/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login da Clínica — LivHub" },
      { name: "description", content: "Acesso ao painel de gestão da clínica e da equipe de psicoterapeutas." },
      { property: "og:title", content: "Login da Clínica — LivHub" },
      { property: "og:description", content: "Acesso ao painel de gestão da clínica e da equipe de psicoterapeutas." },
    ],
  }),
  component: () => (
    <PlanLogin
      accountType="clinic"
      icon={Building2}
      badge="Painel da Clínica"
      title="Entrar na sua clínica"
      subtitle="Gestão da equipe, agenda coletiva e faturamento consolidado."
      wrongTypeMessage="Esta conta não é do plano Clínica. Use o login correspondente ao seu plano."
    />
  ),
});
