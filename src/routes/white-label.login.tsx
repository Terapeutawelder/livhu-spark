import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import { PlanLogin } from "@/components/plan-login";

export const Route = createFileRoute("/white-label/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login White-label — LivHub" },
      { name: "description", content: "Acesso ao painel white-label: sub-contas, marca e domínio próprio." },
      { property: "og:title", content: "Login White-label — LivHub" },
      { property: "og:description", content: "Acesso ao painel white-label: sub-contas, marca e domínio próprio." },
    ],
  }),
  component: () => (
    <PlanLogin
      accountType="whitelabel"
      icon={Palette}
      badge="Painel White-label"
      title="Entrar na sua operação"
      subtitle="Gerencie sub-contas, marca e domínio da sua rede."
      wrongTypeMessage="Esta conta não é do plano White-label. Use o login correspondente ao seu plano."
    />
  ),
});
