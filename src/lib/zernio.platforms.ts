/** Canais suportados pela Zernio (client-safe). */
export const ZERNIO_PLATFORMS = [
  { id: "whatsapp", label: "WhatsApp", group: "Mensagens", color: "#25D366", icon: "whatsapp" },
  { id: "instagram", label: "Instagram", group: "Mensagens", color: "#E4405F", icon: "instagram" },
  { id: "facebook", label: "Facebook / Messenger", group: "Mensagens", color: "#1877F2", icon: "facebook" },
  { id: "telegram", label: "Telegram", group: "Mensagens", color: "#0088CC", icon: "telegram" },
  { id: "googlebusiness", label: "Google Meu Negócio", group: "Presença", color: "#4285F4", icon: "googlemybusiness" },
  { id: "tiktok", label: "TikTok", group: "Presença", color: "#000000", icon: "tiktok" },
  { id: "linkedin", label: "LinkedIn", group: "Presença", color: "#0077B5", icon: "linkedin" },
  { id: "youtube", label: "YouTube", group: "Presença", color: "#FF0000", icon: "youtube" },
  { id: "threads", label: "Threads", group: "Presença", color: "#000000", icon: "threads" },
  { id: "twitter", label: "X (Twitter)", group: "Presença", color: "#000000", icon: "x" },
  { id: "pinterest", label: "Pinterest", group: "Presença", color: "#BD081C", icon: "pinterest" },
  { id: "discord", label: "Discord", group: "Comunidade", color: "#5865F2", icon: "discord" },
  { id: "slack", label: "Slack", group: "Comunidade", color: "#4A154B", icon: "slack" },
  { id: "bluesky", label: "Bluesky", group: "Comunidade", color: "#0285FF", icon: "bluesky" },
  { id: "snapchat", label: "Snapchat", group: "Comunidade", color: "#FFFC00", icon: "snapchat", comingSoon: true },
  { id: "reddit", label: "Reddit", group: "Comunidade", color: "#FF4500", icon: "reddit" },
  { id: "googleads", label: "Google Ads", group: "Anúncios", color: "#4285F4", icon: "googleads" },
  { id: "metaads", label: "Meta Ads", group: "Anúncios", color: "#0668E1", icon: "meta" },
  { id: "linkedinads", label: "LinkedIn Ads", group: "Anúncios", color: "#0077B5", icon: "linkedin" },
  { id: "tiktokads", label: "TikTok Ads", group: "Anúncios", color: "#000000", icon: "tiktok" },
  { id: "pinterestads", label: "Pinterest Ads", group: "Anúncios", color: "#BD081C", icon: "pinterest" },
  { id: "xads", label: "X Ads", group: "Anúncios", color: "#000000", icon: "x" },
  { comingSoon: true, id: "openaiads", label: "OpenAI Ads", group: "Anúncios", color: "#412991", icon: "openai" },
] as const;

export type ZernioPlatformId = (typeof ZERNIO_PLATFORMS)[number]["id"];

/**
 * Canais de anúncios da Zernio: cada um conecta via GET /v1/connect/{base}/ads.
 * `requiresParent` indica que é obrigatório ter a conta de postagem conectada antes.
 */
export const ZERNIO_ADS_PLATFORMS: Record<string, { base: string; requiresParent: boolean }> = {
  metaads: { base: "facebook", requiresParent: true },
  linkedinads: { base: "linkedin", requiresParent: true },
  pinterestads: { base: "pinterest", requiresParent: true },
  tiktokads: { base: "tiktok", requiresParent: false },
  xads: { base: "twitter", requiresParent: true },
  googleads: { base: "googleads", requiresParent: false },
};

export const ZERNIO_PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  ZERNIO_PLATFORMS.map((p) => [p.id, p.label]),
);

