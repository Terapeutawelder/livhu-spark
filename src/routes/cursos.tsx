import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — LivHub" },
      { name: "description", content: "Onboarding e treinamento in-app." },
      { property: "og:title", content: "Cursos — LivHub" },
      { property: "og:description", content: "Cursos LivHub." },
    ],
  }),
  component: () => (
    <ComingSoon
      title="Configurando o seu LivHub"
      description="Onboarding em vídeo + checklist para você configurar sua conta e começar a atender."
    />
  ),
});
