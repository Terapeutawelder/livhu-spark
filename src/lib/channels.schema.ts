import { z } from "zod";

export const CHANNEL_KINDS = ["instagram", "messenger", "tiktok", "site", "email"] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

const nonEmpty = (max: number, msg: string) => z.string().trim().min(1, msg).max(max, "Valor muito longo");
const numericId = (label: string) =>
  z.string().trim().regex(/^\d{5,25}$/, `${label} deve conter apenas números (5 a 25 dígitos)`);
const token = z
  .string()
  .trim()
  .min(20, "Token muito curto")
  .max(2048, "Token muito longo")
  .regex(/^[A-Za-z0-9._\-|]+$/, "Token contém caracteres inválidos");

export const instagramSchema = z.object({
  channel: z.literal("instagram"),
  display_name: nonEmpty(80, "Informe o @ do perfil"),
  ig_business_account_id: numericId("ID da conta Instagram"),
  page_id: numericId("ID da Página do Facebook"),
  access_token: token,
});

export const messengerSchema = z.object({
  channel: z.literal("messenger"),
  display_name: nonEmpty(80, "Informe o nome da Página"),
  page_id: numericId("ID da Página"),
  access_token: token,
});

export const tiktokSchema = z.object({
  channel: z.literal("tiktok"),
  display_name: nonEmpty(80, "Informe o @ do perfil"),
  advertiser_id: numericId("ID da conta TikTok Business"),
  access_token: token,
});

export const siteSchema = z.object({
  channel: z.literal("site"),
  display_name: nonEmpty(80, "Informe um nome para o widget"),
  site_domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/, "Informe um domínio válido, ex.: meusite.com.br"),
  welcome_message: z.string().trim().max(200, "Máximo 200 caracteres").optional().default(""),
});

export const emailSchema = z.object({
  channel: z.literal("email"),
  display_name: nonEmpty(80, "Informe o nome do remetente"),
  from_email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
  reply_to: z
    .union([z.string().trim().toLowerCase().email("E-mail de resposta inválido").max(255), z.literal("")])
    .optional()
    .default(""),
});

export const channelSaveSchema = z.discriminatedUnion("channel", [
  instagramSchema,
  messengerSchema,
  tiktokSchema,
  siteSchema,
  emailSchema,
]);

export type ChannelSaveInput = z.infer<typeof channelSaveSchema>;

export const channelIdSchema = z.object({ channel: z.enum(CHANNEL_KINDS) });
