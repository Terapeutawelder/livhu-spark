export type ProfileTheme = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  band: string;
  bandText: string;
  radius: number;
  headingFont: string;
  bodyFont: string;
};

export type ProfileTopic = { title: string; description: string };
export type ProfileTestimonial = { name: string; text: string };

/** Profissional que atende pela clínica — cada um com sua própria página/agenda. */
export type ProfileTeamMember = {
  name: string;
  role: string;
  bio: string;
  photo: string;
  /** Slug do perfil público do profissional (agenda própria): /p/{slug} */
  slug: string;
};

export type ProfileSections = {
  hero: boolean;
  topics: boolean;
  about: boolean;
  team: boolean;
  booking: boolean;
  testimonials: boolean;
  footer: boolean;
};

export type ProfileContent = {
  name: string;
  credential: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  heroImage: string;
  /** Zoom da foto de capa em % (100 = original). */
  heroZoom: number;
  /** Posição vertical do recorte da foto de capa em % (0 = topo). */
  heroPosY: number;
  /** Foto de perfil (avatar) exibida no header — usada no layout Clínica. */
  avatarImage: string;
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  aboutZoom: number;
  aboutPosY: number;
  topicsTitle: string;
  topicsIntro: string;
  topics: ProfileTopic[];
  teamTitle: string;
  teamIntro: string;
  team: ProfileTeamMember[];
  testimonialsTitle: string;
  testimonials: ProfileTestimonial[];
  bookingTitle: string;
  bookingIntro: string;
  whatsapp: string;
  email: string;
  instagram: string;
  city: string;
  footerNote: string;
  sections: ProfileSections;
  checkoutLinks: Record<string, string>;
};


export type PublicProfileRow = {
  id: string;
  tenant_id: string;
  slug: string;
  template: string;
  is_published: boolean;
  theme: ProfileTheme;
  content: ProfileContent;
  gallery: string[];
};

export type TemplateDef = {
  id: string;
  name: string;
  description: string;
  swatch: string[];
  theme: ProfileTheme;
};

export const TEMPLATES: TemplateDef[] = [
  {
    id: "serena",
    name: "Serena",
    description: "Editorial em tons nude e areia — acolhedor e sofisticado.",
    swatch: ["#f6f1ea", "#ffffff", "#3f342c", "#b08968"],
    theme: {
      bg: "#f6f1ea",
      surface: "#ffffff",
      text: "#3f342c",
      muted: "#8a7c6f",
      accent: "#b08968",
      accentText: "#ffffff",
      band: "#efe6da",
      bandText: "#3f342c",
      radius: 18,
      headingFont: "'Cormorant Garamond', Georgia, serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Fundo escuro azul-noite com dourado — premium e intimista.",
    swatch: ["#0d1524", "#141f33", "#f2f4f8", "#d8b165"],
    theme: {
      bg: "#0d1524",
      surface: "#141f33",
      text: "#f2f4f8",
      muted: "#9aa8bf",
      accent: "#d8b165",
      accentText: "#101828",
      band: "#101a2b",
      bandText: "#f2f4f8",
      radius: 16,
      headingFont: "'Cormorant Garamond', Georgia, serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
  {
    id: "bosque",
    name: "Bosque",
    description: "Verde profundo e bege — natural, sólido e confiável.",
    swatch: ["#f3efe6", "#ffffff", "#1f3d2b", "#2f6b45"],
    theme: {
      bg: "#f3efe6",
      surface: "#ffffff",
      text: "#1f3d2b",
      muted: "#5c7264",
      accent: "#2f6b45",
      accentText: "#ffffff",
      band: "#1f3d2b",
      bandText: "#f3efe6",
      radius: 12,
      headingFont: "'Plus Jakarta Sans', system-ui, sans-serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
  {
    id: "equilibrio",
    name: "Equilíbrio",
    description: "Branco clínico com verde sálvia — clean e direto ao ponto.",
    swatch: ["#ffffff", "#f4f7f5", "#16241d", "#4c7c66"],
    theme: {
      bg: "#ffffff",
      surface: "#f4f7f5",
      text: "#16241d",
      muted: "#6c7f76",
      accent: "#4c7c66",
      accentText: "#ffffff",
      band: "#eaf1ec",
      bandText: "#16241d",
      radius: 14,
      headingFont: "'Plus Jakarta Sans', system-ui, sans-serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
  {
    id: "essencia",
    name: "Essência",
    description: "Editorial nude com serifada alta — inspirado em sites de psicologia premium.",
    swatch: ["#f7f2ec", "#ffffff", "#4a3f37", "#a98a6d"],
    theme: {
      bg: "#f7f2ec",
      surface: "#ffffff",
      text: "#4a3f37",
      muted: "#93826f",
      accent: "#a98a6d",
      accentText: "#ffffff",
      band: "#eae0d4",
      bandText: "#4a3f37",
      radius: 6,
      headingFont: "'Cormorant Garamond', Georgia, serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
  {
    id: "florescer",
    name: "Florescer",
    description: "Coral suave e off-white floral — leve, feminino e acolhedor.",
    swatch: ["#fdf6f2", "#ffffff", "#4b3b36", "#e78b73"],
    theme: {
      bg: "#fdf6f2",
      surface: "#ffffff",
      text: "#4b3b36",
      muted: "#93756c",
      accent: "#e78b73",
      accentText: "#ffffff",
      band: "#f6d9cd",
      bandText: "#4b3b36",
      radius: 24,
      headingFont: "'Plus Jakarta Sans', system-ui, sans-serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
  {
    id: "oxnard",
    name: "Oxnard",
    description: "Verde-petróleo escuro e tipografia clean — executivo e sofisticado.",
    swatch: ["#12312c", "#194039", "#eef4f1", "#9ec9b6"],
    theme: {
      bg: "#12312c",
      surface: "#194039",
      text: "#eef4f1",
      muted: "#a8c2b8",
      accent: "#9ec9b6",
      accentText: "#0f2a25",
      band: "#0d2621",
      bandText: "#eef4f1",
      radius: 10,
      headingFont: "'Plus Jakarta Sans', system-ui, sans-serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
  {
    id: "clinica",
    name: "Clínica",
    description: "Header full-bleed com painel lilás translúcido — ideal para clínicas e equipes.",
    swatch: ["#faf7fd", "#ffffff", "#2b1f3d", "#7c4dbe"],
    theme: {
      bg: "#faf7fd",
      surface: "#ffffff",
      text: "#2b1f3d",
      muted: "#6f6383",
      accent: "#7c4dbe",
      accentText: "#ffffff",
      band: "#efe6fa",
      bandText: "#2b1f3d",
      radius: 20,
      headingFont: "'Plus Jakarta Sans', system-ui, sans-serif",
      bodyFont: "'Inter', system-ui, sans-serif",
    },
  },
];

export function templateById(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export const DEFAULT_SECTIONS: ProfileSections = {
  hero: true,
  topics: true,
  about: true,
  team: false,
  booking: true,
  testimonials: false,
  footer: true,
};


export function defaultContent(name = "Seu Nome"): ProfileContent {
  return {
    name,
    credential: "Psicoterapeuta · CRP 00/00000",
    eyebrow: "Saúde mental · Autoconhecimento · Equilíbrio",
    headline: "Cuidar da sua mente também é prioridade",
    subheadline:
      "Atendimento psicológico online e presencial para ajudar você a viver com mais leveza, equilíbrio e bem-estar.",
    ctaLabel: "Agendar minha consulta",
    heroImage: "",
    heroZoom: 100,
    heroPosY: 50,
    avatarImage: "",

    aboutTitle: "Sobre mim",
    aboutText:
      "Sou psicoterapeuta e acredito que todo processo de mudança começa com uma escolha: olhar para dentro. Meu trabalho une escuta acolhedora e técnicas baseadas em evidências para transformar sofrimento em movimento.",
    aboutImage: "",
    aboutZoom: 100,
    aboutPosY: 50,
    topicsTitle: "Como eu posso te ajudar",
    topicsIntro: "Áreas em que atuo com atendimento individual, online ou presencial.",
    topics: [
      { title: "Ansiedade", description: "Estratégias para lidar com a ansiedade e viver com mais tranquilidade." },
      { title: "Depressão", description: "Acolhimento e cuidado para retomar o sentido e a energia do dia a dia." },
      { title: "Relacionamentos", description: "Melhore suas relações e construa vínculos mais saudáveis." },
      { title: "Autoconhecimento", description: "Aprenda a gerenciar emoções e reconhecer seus próprios limites." },
      { title: "Luto", description: "Apoio para atravessar perdas com respeito ao seu tempo." },
      { title: "Estresse e burnout", description: "Recupere o equilíbrio entre trabalho, descanso e vida pessoal." },
    ],
    testimonialsTitle: "O que dizem os pacientes",
    testimonials: [
      { name: "M. S.", text: "A terapia me deu ferramentas concretas para lidar com a ansiedade no trabalho." },
      { name: "R. A.", text: "Um espaço seguro, sem julgamentos. Mudou minha relação comigo mesma." },
    ],
    bookingTitle: "Agende sua sessão",
    bookingIntro: "Escolha o serviço, o dia e o horário disponível. A confirmação é enviada na hora.",
    whatsapp: "",
    email: "",
    instagram: "",
    city: "Atendimento online em todo o Brasil",
    footerNote: "Todos os direitos reservados.",
    sections: { ...DEFAULT_SECTIONS },
    checkoutLinks: {},
  };
}

export const STUDIO_STYLES = [
  {
    id: "estudio-classico",
    label: "Estúdio clássico",
    prompt:
      "professional studio headshot, soft key light with gentle rim light, neutral warm beige seamless backdrop, smart casual blazer, shallow depth of field, natural retouching, calm confident expression",
  },
  {
    id: "consultorio",
    label: "Consultório acolhedor",
    prompt:
      "editorial portrait seated in a warm therapy office, soft natural window light, plants and bookshelf softly blurred in the background, smart casual outfit, welcoming expression",
  },
  {
    id: "editorial-claro",
    label: "Editorial claro",
    prompt:
      "high-end editorial portrait, bright airy white studio, soft diffused lighting, minimalist composition with negative space on one side, elegant neutral clothing, magazine quality",
  },
  {
    id: "premium-escuro",
    label: "Premium escuro",
    prompt:
      "premium dark studio portrait, deep navy background, dramatic soft lighting with golden rim light, elegant dark outfit, cinematic and sophisticated",
  },
] as const;
