/** Canais suportados pela Zernio (client-safe). */
export const ZERNIO_PLATFORMS = [
  { id: "whatsapp", label: "WhatsApp Business", group: "Mensagens" },
  { id: "instagram", label: "Instagram", group: "Mensagens" },
  { id: "facebook", label: "Facebook / Messenger", group: "Mensagens" },
  { id: "telegram", label: "Telegram", group: "Mensagens" },
  { id: "googlebusiness", label: "Google Meu Negócio", group: "Presença" },
  { id: "tiktok", label: "TikTok", group: "Presença" },
  { id: "linkedin", label: "LinkedIn", group: "Presença" },
  { id: "youtube", label: "YouTube", group: "Presença" },
  { id: "threads", label: "Threads", group: "Presença" },
  { id: "twitter", label: "X (Twitter)", group: "Presença" },
  { id: "pinterest", label: "Pinterest", group: "Presença" },
  { id: "discord", label: "Discord", group: "Comunidade" },
  { id: "slack", label: "Slack", group: "Comunidade" },
  { id: "bluesky", label: "Bluesky", group: "Comunidade" },
  { id: "snapchat", label: "Snapchat", group: "Comunidade" },
  { id: "reddit", label: "Reddit", group: "Comunidade" },
] as const;

export type ZernioPlatformId = (typeof ZERNIO_PLATFORMS)[number]["id"];

export const ZERNIO_PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  ZERNIO_PLATFORMS.map((p) => [p.id, p.label]),
);
