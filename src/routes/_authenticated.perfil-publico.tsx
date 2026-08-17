import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccountType, useCurrentTenant } from "@/hooks/use-tenant";
import { generateStudioPhoto, signProfileImages } from "@/lib/public-profile.functions";
import { PublicLanding, type PublicService } from "@/components/public-landing";
import {
  DEFAULT_SECTIONS,
  STUDIO_STYLES,
  TEMPLATES,
  defaultContent,
  defaultTemplateFor,
  templateById,
  templatesForAccount,
  type ProfileContent,
  type ProfileSections,
  type ProfileTheme,
} from "@/lib/public-profile.types";
import {
  Eye,
  Globe,
  ImagePlus,
  Layers,
  Loader2,
  Monitor,
  Palette,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  Plus,
  X,
  Type as TypeIcon,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil-publico")({
  head: () => ({
    meta: [
      { title: "Perfil Público — LivHub" },
      {
        name: "description",
        content: "Monte sua landing page de agendamento com editor visual, IA de fotos de estúdio e checkout integrado.",
      },
      { property: "og:title", content: "Perfil Público — LivHub" },
      { property: "og:description", content: "Editor visual de landing page com agenda e checkout para psicoterapeutas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerfilPublicoPage,
});

type TabId = "layout" | "conteudo" | "foto" | "estilo" | "publicar";

const TABS: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: "layout", label: "Layouts", icon: Layers },
  { id: "conteudo", label: "Conteúdo", icon: TypeIcon },
  { id: "foto", label: "Foto IA", icon: Sparkles },
  { id: "estilo", label: "Estilo", icon: Palette },
  { id: "publicar", label: "Publicar", icon: Globe },
];

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function PerfilPublicoPage() {
  const { data: tenant } = useCurrentTenant();
  const { accountType } = useAccountType();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabId>("layout");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [template, setTemplate] = useState("serena");
  const [theme, setTheme] = useState<ProfileTheme>(TEMPLATES[0].theme);
  const [content, setContent] = useState<ProfileContent>(defaultContent());
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: profile, isFetched: profileFetched } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["public-profile-editor", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    enabled: !!tenant?.id,
    queryKey: ["public-profile-services", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, description, duration_minutes, price_cents, modality")
        .eq("tenant_id", tenant!.id)
        .eq("is_active", true)
        .order("price_cents");
      return (data ?? []) as PublicService[];
    },
  });

  // Fotos ainda não publicadas só abrem com URL assinada — usada apenas na pré-visualização.
  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    const paths = [
      content.heroImage,
      content.aboutImage,
      content.avatarImage,
      ...(content.team ?? []).map((m) => m.photo),
    ].filter((u) => u && u.startsWith("/api/public/perfil/img/") && !signed[u]) as string[];
    if (paths.length === 0) return;
    signProfileImages({ data: { paths: [...new Set(paths)] } })
      .then((map) => setSigned((prev) => ({ ...prev, ...map })))
      .catch(() => {});
  }, [content.heroImage, content.aboutImage, content.avatarImage, content.team, signed]);

  const previewContent = useMemo(
    () => ({
      ...content,
      heroImage: signed[content.heroImage] ?? content.heroImage,
      aboutImage: signed[content.aboutImage] ?? content.aboutImage,
      avatarImage: signed[content.avatarImage] ?? content.avatarImage,
      team: (content.team ?? []).map((m) => ({ ...m, photo: signed[m.photo] ?? m.photo })),
    }),
    [content, signed],
  );


  useEffect(() => {
    // Só inicializa depois que a consulta do perfil terminou — senão o
    // conteúdo salvo seria substituído pelos valores padrão.
    if (loaded || !tenant || !profileFetched) return;
    if (profile) {
      const tpl = templateById(profile.template);
      const savedContent = (profile.content ?? {}) as Partial<ProfileContent>;
      const defaults = defaultContent(tenant.name);
      // Se o plano mudou (individual <-> clínica), cai no layout padrão do tipo de conta.
      const allowed = templatesForAccount(accountType).some((t) => t.id === profile.template);
      const effectiveTemplate = allowed ? profile.template : defaultTemplateFor(accountType);
      const effectiveTpl = allowed ? tpl : templateById(effectiveTemplate);
      const isClinic = effectiveTemplate === "clinica";
      setTemplate(effectiveTemplate);
      setTheme({ ...effectiveTpl.theme, ...((profile.theme ?? {}) as Partial<ProfileTheme>) });
      setContent({
        ...defaults,
        ...savedContent,
        sections: {
          ...defaults.sections,
          ...(savedContent.sections ?? {}),
          ...(isClinic ? { team: true, about: false } : {}),
        },
      });
      setSlug(profile.slug ?? "");
      setPublished(!!profile.is_published);
    } else {
      const tplId = defaultTemplateFor(accountType);
      setTemplate(tplId);
      setTheme({ ...templateById(tplId).theme });
      const base = defaultContent(tenant.name);
      setContent(
        tplId === "clinica"
          ? { ...base, sections: { ...base.sections, team: true, about: false } }
          : base,
      );
      setSlug(slugify(tenant.slug || tenant.name));
    }
    setLoaded(true);
  }, [profile, profileFetched, tenant, loaded, accountType]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return `/p/${slug}`;
    return `${window.location.origin}/p/${slug}`;
  }, [slug]);

  function patch(part: Partial<ProfileContent>) {
    setContent((c) => ({ ...c, ...part }));
  }

  function applyTemplate(id: string) {
    setTemplate(id);
    setTheme({ ...templateById(id).theme });
    if (id === "clinica") {
      setContent((c) => ({
        ...c,
        sections: { ...c.sections, team: true, about: false },
        team:
          (c.team ?? []).length > 0
            ? c.team
            : [
                {
                  name: "Nome do profissional",
                  role: "Psicoterapeuta · CRP 00/00000",
                  bio: "Breve descrição da abordagem e das áreas de atuação.",
                  photo: "",
                  slug: "",
                },
              ],
      }));
    }
  }

  async function save(nextPublished = published) {
    if (!tenant || !loaded) return;
    const clean = slugify(slug);
    if (clean.length < 3) {
      toast.error("Defina um endereço (slug) com pelo menos 3 caracteres.");
      setTab("publicar");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        slug: clean,
        template,
        theme: JSON.parse(JSON.stringify(theme)),
        content: JSON.parse(JSON.stringify(content)),
        is_published: nextPublished,
      };
      const { error } = await supabase.from("public_profiles").upsert(payload, { onConflict: "tenant_id" });
      if (error) {
        toast.error(
          error.code === "23505" ? "Este endereço já está em uso. Escolha outro." : "Não foi possível salvar: " + error.message,
        );
        return;
      }
      setSlug(clean);
      setPublished(nextPublished);
      queryClient.invalidateQueries({ queryKey: ["public-profile-editor", tenant.id] });
      toast.success(nextPublished ? "Página publicada!" : "Alterações salvas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Perfil Público</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monte sua landing page, gere fotos de estúdio com IA e receba agendamentos com checkout.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 sm:flex">
            <button
              onClick={() => setDevice("desktop")}
              aria-label="Pré-visualizar desktop"
              className={
                "grid h-7 w-7 place-items-center rounded-full " +
                (device === "desktop" ? "bg-gold text-black" : "text-muted-foreground hover:bg-muted")
              }
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              aria-label="Pré-visualizar mobile"
              className={
                "grid h-7 w-7 place-items-center rounded-full " +
                (device === "mobile" ? "bg-gold text-black" : "text-muted-foreground hover:bg-muted")
              }
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
          {published && (
            <a
              href={`/p/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Eye className="h-4 w-4" /> Ver página
            </a>
          )}
          <button
            onClick={() => save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black shadow-[0_8px_24px_-10px_rgba(216,177,101,.9)] hover:opacity-90 disabled:opacity-60"
          >
            <Globe className="h-4 w-4" /> {published ? "Republicar" : "Publicar"}
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[400px_1fr]">
        {/* Editor */}
        <div className="rounded-2xl border border-border bg-surface">
          <div className="flex overflow-x-auto border-b border-border">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    "flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors " +
                    (active
                      ? "border-b-2 border-gold text-foreground"
                      : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="max-h-[calc(100vh-15rem)] space-y-5 overflow-y-auto p-4">
            {tab === "layout" && (
              <LayoutTab
                template={template}
                onSelect={applyTemplate}
                sections={content.sections}
                onToggle={(k, v) => patch({ sections: { ...content.sections, [k]: v } })}
                accountType={accountType}
              />
            )}
            {tab === "conteudo" && <ContentTab template={template} content={content} patch={patch} />}
            {tab === "foto" && (
              <PhotoTab
                heroImage={content.heroImage}
                aboutImage={content.aboutImage}
                avatarImage={content.avatarImage ?? ""}
                onHero={(url) => patch({ heroImage: url })}
                onAbout={(url) => patch({ aboutImage: url })}
                onAvatar={(url) => patch({ avatarImage: url })}
                signedUrls={signed}

                framing={{
                  heroZoom: content.heroZoom ?? 100,
                  heroPosY: content.heroPosY ?? 50,
                  aboutZoom: content.aboutZoom ?? 100,
                  aboutPosY: content.aboutPosY ?? 50,
                }}
                patchFraming={patch}
              />
            )}
            {tab === "estilo" && <StyleTab theme={theme} setTheme={setTheme} />}
            {tab === "publicar" && (
              <PublishTab
                slug={slug}
                setSlug={setSlug}
                published={published}
                publicUrl={publicUrl}
                services={services}
                checkoutLinks={content.checkoutLinks}
                onCheckout={(id, url) => patch({ checkoutLinks: { ...content.checkoutLinks, [id]: url } })}
                onUnpublish={() => save(false)}
              />
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-gold" /> Pré-visualização em tempo real · {publicUrl}
          </div>
          <div
            className="mx-auto overflow-hidden rounded-xl border border-border bg-background shadow-xl transition-all"
            style={{ maxWidth: device === "mobile" ? 400 : "100%" }}
          >
            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
              <PublicLanding
                template={template}
                theme={theme}
                content={previewContent}
                services={services}
                slug={slug}
                interactive={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Tabs ---------------------------------- */

const SECTION_LABELS: Record<keyof ProfileSections, string> = {
  hero: "Capa (hero)",
  topics: "Como eu ajudo",
  about: "Sobre mim",
  team: "Equipe da clínica",

  testimonials: "Depoimentos",
  booking: "Agendamento + checkout",
  footer: "Rodapé",
};

function LayoutTab({
  template,
  onSelect,
  sections,
  onToggle,
  accountType,
}: {
  template: string;
  onSelect: (id: string) => void;
  sections: ProfileSections;
  onToggle: (k: keyof ProfileSections, v: boolean) => void;
  accountType: "individual" | "clinic" | "whitelabel";
}) {
  const available = templatesForAccount(accountType);
  return (
    <>
      <Field label={accountType === "clinic" ? "Modelo de landing page (Clínica)" : "Modelo de landing page (Profissional)"}>
        <p className="mb-3 text-[11px] text-muted-foreground">
          {accountType === "clinic"
            ? "Seu plano é Clínica: os layouts abaixo são exclusivos para equipes de profissionais."
            : "Seu plano é Individual: os layouts abaixo são exclusivos para profissionais autônomos."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {available.map((t) => {
            const active = t.id === template;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={
                  "rounded-xl border p-3 text-left transition " +
                  (active ? "border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(216,177,101,.5)]" : "border-border hover:border-gold/50")
                }
              >
                <div className="mb-2 flex gap-1">
                  {t.swatch.map((c) => (
                    <span key={c} className="h-5 flex-1 rounded" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.description}</p>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Seções visíveis">
        <div className="space-y-2">
          {(Object.keys(SECTION_LABELS) as (keyof ProfileSections)[])
            .filter((k) => k !== "team" || accountType === "clinic")
            .map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground"
            >
              {SECTION_LABELS[k]}
              <input
                type="checkbox"
                checked={sections[k] ?? DEFAULT_SECTIONS[k]}
                onChange={(e) => onToggle(k, e.target.checked)}
                className="h-4 w-4 accent-[var(--gold,#d8b165)]"
              />
            </label>
          ))}
        </div>
      </Field>
    </>
  );
}

function ContentTab({
  template,
  content,
  patch,
}: {
  template: string;
  content: ProfileContent;
  patch: (p: Partial<ProfileContent>) => void;
}) {
  return (
    <>
      <Input label="Nome" value={content.name} onChange={(v) => patch({ name: v })} />
      <Input label="Credencial (CRP)" value={content.credential} onChange={(v) => patch({ credential: v })} />
      <Input label="Linha de apoio (eyebrow)" value={content.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      <Input label="Título principal" value={content.headline} onChange={(v) => patch({ headline: v })} />
      <Textarea label="Subtítulo" value={content.subheadline} onChange={(v) => patch({ subheadline: v })} />
      <Input label="Texto do botão" value={content.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />

      {template !== "clinica" && (
        <>
          <Divider>Sobre mim</Divider>
          <Input label="Título" value={content.aboutTitle} onChange={(v) => patch({ aboutTitle: v })} />
          <Textarea label="Texto" rows={6} value={content.aboutText} onChange={(v) => patch({ aboutText: v })} />
        </>
      )}

      <Divider>Como eu ajudo</Divider>
      <Input label="Título" value={content.topicsTitle} onChange={(v) => patch({ topicsTitle: v })} />
      <Input label="Introdução" value={content.topicsIntro} onChange={(v) => patch({ topicsIntro: v })} />
      <div className="space-y-3">
        {content.topics.map((t, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Card {i + 1}</span>
              <button
                onClick={() => patch({ topics: content.topics.filter((_, x) => x !== i) })}
                className="text-[11px] text-destructive hover:underline"
              >
                Remover
              </button>
            </div>
            <Input
              label="Título"
              value={t.title}
              onChange={(v) =>
                patch({ topics: content.topics.map((x, xi) => (xi === i ? { ...x, title: v } : x)) })
              }
            />
            <Textarea
              label="Descrição"
              rows={2}
              value={t.description}
              onChange={(v) =>
                patch({ topics: content.topics.map((x, xi) => (xi === i ? { ...x, description: v } : x)) })
              }
            />
          </div>
        ))}
        <button
          onClick={() => patch({ topics: [...content.topics, { title: "Novo tema", description: "Descreva como você ajuda." }] })}
          className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:border-gold hover:text-foreground"
        >
          + Adicionar card
        </button>
      </div>

      <Divider>Equipe da clínica</Divider>
      <p className="-mt-1 text-[11px] text-muted-foreground">
        Cada profissional aparece com foto e botão “Ver agenda”, que abre a página pública dele (/p/slug) com o
        calendário próprio. Ative a seção “Equipe da clínica” na aba Layout.
      </p>
      <Input label="Título da seção" value={content.teamTitle ?? ""} onChange={(v) => patch({ teamTitle: v })} />
      <Textarea label="Introdução" rows={2} value={content.teamIntro ?? ""} onChange={(v) => patch({ teamIntro: v })} />
      <div className="space-y-3">
        {(content.team ?? []).map((m, i) => {
          const team = content.team ?? [];
          const upd = (part: Partial<(typeof team)[number]>) =>
            patch({ team: team.map((x, xi) => (xi === i ? { ...x, ...part } : x)) });
          return (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Profissional {i + 1}
                </span>
                <button
                  onClick={() => patch({ team: team.filter((_, x) => x !== i) })}
                  className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"
                >
                  <X className="h-3 w-3" /> Remover
                </button>
              </div>
              <Input label="Nome" value={m.name} onChange={(v) => upd({ name: v })} />
              <Input label="Especialidade / CRP" value={m.role} onChange={(v) => upd({ role: v })} />
              <Textarea label="Mini bio" rows={2} value={m.bio} onChange={(v) => upd({ bio: v })} />
              <Input
                label="Slug da página do profissional"
                value={m.slug}
                onChange={(v) => upd({ slug: v.replace(/[^a-z0-9-]/gi, "").toLowerCase() })}
                placeholder="ana-souza"
              />
              <Input
                label="URL da foto"
                value={m.photo}
                onChange={(v) => upd({ photo: v })}
                placeholder="https://…"
              />
              {m.photo && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={m.photo} alt={`Foto de ${m.name}`} className="h-12 w-12 rounded-full object-cover" />
                  <button
                    onClick={() => upd({ photo: "" })}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir foto
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <button
          onClick={() =>
            patch({
              team: [
                ...(content.team ?? []),
                { name: "Nome do profissional", role: "Psicoterapeuta · CRP 00/00000", bio: "", photo: "", slug: "" },
              ],
            })
          }
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:border-gold hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar profissional
        </button>
      </div>

      <Divider>Depoimentos</Divider>

      <Input label="Título" value={content.testimonialsTitle} onChange={(v) => patch({ testimonialsTitle: v })} />
      <div className="space-y-3">
        {content.testimonials.map((t, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Depoimento {i + 1}</span>
              <button
                onClick={() => patch({ testimonials: content.testimonials.filter((_, x) => x !== i) })}
                className="text-[11px] text-destructive hover:underline"
              >
                Remover
              </button>
            </div>
            <Input
              label="Assinatura"
              value={t.name}
              onChange={(v) =>
                patch({ testimonials: content.testimonials.map((x, xi) => (xi === i ? { ...x, name: v } : x)) })
              }
            />
            <Textarea
              label="Texto"
              rows={2}
              value={t.text}
              onChange={(v) =>
                patch({ testimonials: content.testimonials.map((x, xi) => (xi === i ? { ...x, text: v } : x)) })
              }
            />
          </div>
        ))}
        <button
          onClick={() => patch({ testimonials: [...content.testimonials, { name: "A. B.", text: "Depoimento…" }] })}
          className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:border-gold hover:text-foreground"
        >
          + Adicionar depoimento
        </button>
      </div>

      <Divider>Agendamento e contato</Divider>
      <Input label="Título da agenda" value={content.bookingTitle} onChange={(v) => patch({ bookingTitle: v })} />
      <Input label="Introdução da agenda" value={content.bookingIntro} onChange={(v) => patch({ bookingIntro: v })} />
      <Input label="WhatsApp (com DDI)" value={content.whatsapp} onChange={(v) => patch({ whatsapp: v })} placeholder="5511999999999" />
      <Input label="E-mail" value={content.email} onChange={(v) => patch({ email: v })} />
      <Input label="Instagram" value={content.instagram} onChange={(v) => patch({ instagram: v })} placeholder="@seuperfil" />
      <Input label="Localização" value={content.city} onChange={(v) => patch({ city: v })} />
      <Input label="Nota do rodapé" value={content.footerNote} onChange={(v) => patch({ footerNote: v })} />
    </>
  );
}

type Framing = { heroZoom: number; heroPosY: number; aboutZoom: number; aboutPosY: number };

function PhotoTab({
  heroImage,
  aboutImage,
  avatarImage,
  onHero,
  onAbout,
  onAvatar,
  signedUrls,
  framing,
  patchFraming,
}: {
  heroImage: string;
  aboutImage: string;
  avatarImage: string;
  onHero: (url: string) => void;
  onAbout: (url: string) => void;
  onAvatar: (url: string) => void;
  signedUrls: Record<string, string>;
  framing: Framing;
  patchFraming: (p: Partial<ProfileContent>) => void;
}) {

  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [style, setStyle] = useState<string>(STUDIO_STYLES[0].id);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [localSigned, setLocalSigned] = useState<Record<string, string>>({});
  const pic = (url: string) => localSigned[url] ?? signedUrls[url] ?? url;

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8MB).");
      return;
    }
    setSource(await fileToDataUrl(file));
  }

  async function generate() {
    if (!source) {
      toast.error("Envie uma foto primeiro.");
      return;
    }
    const preset = STUDIO_STYLES.find((s) => s.id === style)!;
    setBusy(true);
    try {
      const res = await generateStudioPhoto({ data: { image: source, stylePrompt: preset.prompt } });
      setResults((r) => [res.url, ...r]);
      signProfileImages({ data: { paths: [res.url] } })
        .then((m) => setLocalSigned((prev) => ({ ...prev, ...m })))
        .catch(() => {});
      toast.success("Foto de estúdio gerada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar a foto.");
    } finally {
      setBusy(false);
    }
  }

  const latest = results[0] ?? null;

  return (
    <>
      <Field label="Sua foto original e o resultado da IA">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Original</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-gold hover:text-foreground"
            >
              {source ? (
                <img src={source} alt="Foto enviada" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span className="px-2 text-center">Enviar foto (JPG/PNG, máx. 8MB)</span>
                </>
              )}
            </button>
            {source && (
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1 w-full text-[11px] text-muted-foreground hover:text-foreground"
              >
                Trocar foto
              </button>
            )}
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gerada por IA</p>
            <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-surface text-xs text-muted-foreground">
              {busy ? (
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              ) : latest ? (
                <img src={pic(latest)} alt="Retrato gerado por IA" className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center">O retrato profissional aparece aqui</span>
              )}
            </div>
            {latest && !busy && (
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    onHero(latest);
                    onAbout(latest);
                    toast.success("Foto aprovada e aplicada na landing page.");
                  }}
                  className="rounded-md bg-gold px-2 py-1 text-[11px] font-semibold text-black hover:opacity-90"
                >
                  Aprovar
                </button>
                <button
                  onClick={generate}
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Gerar nova
                </button>
              </div>
            )}
          </div>
        </div>
      </Field>

      <Field label="Estilo do estúdio">
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={
                "rounded-lg border px-3 py-2 text-xs font-medium transition " +
                (style === s.id ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <button
        onClick={generate}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "Gerando retrato profissional…" : latest ? "Gerar nova imagem" : "Gerar foto de estúdio com IA"}
      </button>

      <Field label="Enquadramento da foto de capa">
        <div
          className="mb-3 h-40 w-full overflow-hidden rounded-xl border border-border bg-surface"
        >
          {heroImage ? (
            <img
              src={pic(heroImage)}
              alt="Prévia do enquadramento"
              className="h-full w-full object-cover"
              style={{
                objectPosition: `50% ${framing.heroPosY}%`,
                transform: `scale(${framing.heroZoom / 100})`,
              }}
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              Aplique uma foto na capa para ajustar
            </div>
          )}
        </div>
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Zoom — {framing.heroZoom}%
        </label>
        <input
          type="range"
          min={100}
          max={200}
          step={1}
          value={framing.heroZoom}
          onChange={(e) => patchFraming({ heroZoom: Number(e.target.value) })}
          className="mt-1 w-full accent-[var(--gold)]"
        />
        <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">
          Posição vertical — {framing.heroPosY}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={framing.heroPosY}
          onChange={(e) => patchFraming({ heroPosY: Number(e.target.value) })}
          className="mt-1 w-full accent-[var(--gold)]"
        />
      </Field>

      <Field label="Enquadramento da foto da seção Sobre">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Zoom — {framing.aboutZoom}%
        </label>
        <input
          type="range"
          min={100}
          max={200}
          step={1}
          value={framing.aboutZoom}
          onChange={(e) => patchFraming({ aboutZoom: Number(e.target.value) })}
          className="mt-1 w-full accent-[var(--gold)]"
        />
        <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">
          Posição vertical — {framing.aboutPosY}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={framing.aboutPosY}
          onChange={(e) => patchFraming({ aboutPosY: Number(e.target.value) })}
          className="mt-1 w-full accent-[var(--gold)]"
        />
      </Field>

      {(results.length > 0 || heroImage || aboutImage || avatarImage) && (
        <Field label="Suas imagens">
          <div className="grid grid-cols-3 gap-2">
            {[...new Set([...results, heroImage, aboutImage, avatarImage].filter(Boolean))].map((url) => (
              <div key={url} className="group relative overflow-hidden rounded-lg border border-border">
                <img src={pic(url)} alt="Retrato gerado" className="h-28 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => onHero(url)}
                    className="flex-1 bg-black/75 py-1 text-[10px] font-semibold text-white"
                  >
                    Capa
                  </button>
                  <button
                    onClick={() => onAbout(url)}
                    className="flex-1 bg-black/75 py-1 text-[10px] font-semibold text-white"
                  >
                    Sobre
                  </button>
                  <button
                    onClick={() => onAvatar(url)}
                    className="flex-1 bg-black/75 py-1 text-[10px] font-semibold text-white"
                  >
                    Perfil
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ImagePlus className="h-3 w-3" /> Passe o mouse na imagem e escolha onde aplicar.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {heroImage && (
              <button type="button" onClick={() => onHero("")} className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir foto de capa
              </button>
            )}
            {aboutImage && (
              <button type="button" onClick={() => onAbout("")} className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir foto “Sobre”
              </button>
            )}
            {avatarImage && (
              <button type="button" onClick={() => onAvatar("")} className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir foto de perfil
              </button>
            )}
          </div>
        </Field>
      )}

    </>
  );
}


const COLOR_FIELDS: { key: keyof ProfileTheme; label: string }[] = [
  { key: "bg", label: "Fundo" },
  { key: "surface", label: "Cards" },
  { key: "text", label: "Texto" },
  { key: "muted", label: "Texto suave" },
  { key: "accent", label: "Destaque" },
  { key: "accentText", label: "Texto do destaque" },
  { key: "band", label: "Faixa" },
  { key: "bandText", label: "Texto da faixa" },
];

const FONTS = [
  { label: "Cormorant (serifada elegante)", value: "'Cormorant Garamond', Georgia, serif" },
  { label: "Plus Jakarta (moderna)", value: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { label: "Inter (neutra)", value: "'Inter', system-ui, sans-serif" },
  { label: "Georgia (clássica)", value: "Georgia, serif" },
];

function StyleTab({ theme, setTheme }: { theme: ProfileTheme; setTheme: (t: ProfileTheme) => void }) {
  return (
    <>
      <Field label="Cores">
        <div className="grid grid-cols-2 gap-2">
          {COLOR_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
              <input
                type="color"
                value={String(theme[f.key])}
                onChange={(e) => setTheme({ ...theme, [f.key]: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-[11px] text-muted-foreground">{f.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Fonte dos títulos">
        <select
          value={theme.headingFont}
          onChange={(e) => setTheme({ ...theme, headingFont: e.target.value })}
          className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Fonte do texto">
        <select
          value={theme.bodyFont}
          onChange={(e) => setTheme({ ...theme, bodyFont: e.target.value })}
          className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`Arredondamento — ${theme.radius}px`}>
        <input
          type="range"
          min={0}
          max={32}
          value={theme.radius}
          onChange={(e) => setTheme({ ...theme, radius: Number(e.target.value) })}
          className="w-full accent-[var(--gold,#d8b165)]"
        />
      </Field>
    </>
  );
}

function PublishTab({
  slug,
  setSlug,
  published,
  publicUrl,
  services,
  checkoutLinks,
  onCheckout,
  onUnpublish,
}: {
  slug: string;
  setSlug: (v: string) => void;
  published: boolean;
  publicUrl: string;
  services: PublicService[];
  checkoutLinks: Record<string, string>;
  onCheckout: (id: string, url: string) => void;
  onUnpublish: () => void;
}) {
  return (
    <>
      <Input label="Endereço da página (slug)" value={slug} onChange={(v) => setSlug(slugify(v))} placeholder="dra-ana-souza" />
      <p className="-mt-3 break-all text-[11px] text-muted-foreground">{publicUrl}</p>

      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="font-semibold text-foreground">
          Status: {published ? "Publicada" : "Rascunho"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {published
            ? "Sua página está no ar e recebendo agendamentos."
            : "Clique em Publicar no topo para deixar a página no ar."}
        </p>
        {published && (
          <button onClick={onUnpublish} className="mt-3 text-xs font-semibold text-destructive hover:underline">
            Despublicar página
          </button>
        )}
      </div>

      <Divider>Checkout por serviço</Divider>
      <p className="-mt-2 text-[11px] text-muted-foreground">
        Cole o link de pagamento (Stripe ou Mercado Pago) de cada serviço. Ao confirmar o agendamento, o paciente é
        redirecionado para o pagamento.
      </p>
      {services.length === 0 && (
        <p className="text-xs text-muted-foreground">Cadastre serviços em Pagamentos para exibi-los na agenda.</p>
      )}
      {services.map((s) => (
        <Input
          key={s.id}
          label={`${s.name} · ${s.duration_minutes} min`}
          value={checkoutLinks[s.id] ?? ""}
          onChange={(v) => onCheckout(s.id, v)}
          placeholder="https://buy.stripe.com/... ou https://mpago.la/..."
        />
      ))}
    </>
  );
}

/* ------------------------------ Primitivos ------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gold">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}
