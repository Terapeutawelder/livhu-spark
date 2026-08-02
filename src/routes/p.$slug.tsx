import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLanding, type PublicService } from "@/components/public-landing";
import {
  defaultContent,
  templateById,
  type ProfileContent,
  type ProfileTheme,
} from "@/lib/public-profile.types";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Agende sua sessão — ${params.slug}` },
      {
        name: "description",
        content: "Página de agendamento de psicoterapia: conheça o profissional, escolha o serviço e reserve seu horário.",
      },
      { property: "og:title", content: "Agende sua sessão de psicoterapia" },
      {
        property: "og:description",
        content: "Conheça o profissional, veja os horários disponíveis e agende sua sessão online.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { slug } = Route.useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-profile", slug],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("public_profiles")
        .select("tenant_id, slug, template, theme, content")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!profile) throw notFound();

      const { data: services } = await supabase
        .from("services")
        .select("id, name, description, duration_minutes, price_cents, modality")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("price_cents");

      return { profile, services: (services ?? []) as PublicService[] };
    },
    retry: false,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Página não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este perfil não existe ou ainda não foi publicado.
          </p>
        </div>
      </div>
    );
  }

  const tpl = templateById(data.profile.template);
  const theme = { ...tpl.theme, ...((data.profile.theme ?? {}) as Partial<ProfileTheme>) } as ProfileTheme;
  const content = { ...defaultContent(), ...((data.profile.content ?? {}) as Partial<ProfileContent>) } as ProfileContent;

  return (
    <PublicLanding
      template={data.profile.template}
      theme={theme}
      content={content}
      services={data.services}
      slug={slug}
      interactive
    />
  );
}
