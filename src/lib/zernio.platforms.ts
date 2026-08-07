/** Canais suportados pela Zernio (client-safe). */
export const ZERNIO_PLATFORMS = [
  { id: "whatsapp", label: "WhatsApp Business", group: "Mensagens", color: "#25D366" },
  { id: "instagram", label: "Instagram", group: "Mensagens", color: "#E4405F" },
  { id: "facebook", label: "Facebook / Messenger", group: "Mensagens", color: "#1877F2" },
  { id: "telegram", label: "Telegram", group: "Mensagens", color: "#0088CC" },
  { id: "googlebusiness", label: "Google Meu Negócio", group: "Presença", color: "#4285F4" },
  { id: "tiktok", label: "TikTok", group: "Presença", color: "#000000" },
  { id: "linkedin", label: "LinkedIn", group: "Presença", color: "#0077B5" },
  { id: "youtube", label: "YouTube", group: "Presença", color: "#FF0000" },
  { id: "threads", label: "Threads", group: "Presença", color: "#000000" },
  { id: "twitter", label: "X (Twitter)", group: "Presença", color: "#000000" },
  { id: "pinterest", label: "Pinterest", group: "Presença", color: "#BD081C" },
  { id: "discord", label: "Discord", group: "Comunidade", color: "#5865F2" },
  { id: "slack", label: "Slack", group: "Comunidade", color: "#4A154B" },
  { id: "bluesky", label: "Bluesky", group: "Comunidade", color: "#0285FF" },
  { id: "snapchat", label: "Snapchat", group: "Comunidade", color: "#FFFC00" },
  { id: "reddit", label: "Reddit", group: "Comunidade", color: "#FF4500" },
] as const;

export type ZernioPlatformId = (typeof ZERNIO_PLATFORMS)[number]["id"];

export const ZERNIO_PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  ZERNIO_PLATFORMS.map((p) => [p.id, p.label]),
);
