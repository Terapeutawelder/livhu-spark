/** Catálogo de eventos e textos padrão das notificações (client-safe). */

export const NOTIFICATION_EVENTS = [
  "contact_created",
  "appointment_created",
  "appointment_rescheduled",
  "appointment_canceled",
  "reminder_24h",
  "reminder_1h",
  "reminder_15m",
  "payment_received",
  "payment_pending",
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationChannel = "whatsapp" | "email";

export const EVENT_LABELS: Record<NotificationEvent, string> = {
  contact_created: "Cadastro de paciente",
  appointment_created: "Agendamento confirmado",
  appointment_rescheduled: "Reagendamento",
  appointment_canceled: "Cancelamento",
  reminder_24h: "Lembrete — 24 horas antes",
  reminder_1h: "Lembrete — 1 hora antes",
  reminder_15m: "Lembrete — 15 minutos antes",
  payment_received: "Pagamento confirmado",
  payment_pending: "Pagamento pendente",
};

export const EVENT_DESCRIPTIONS: Record<NotificationEvent, string> = {
  contact_created: "Enviado quando um novo paciente entra na sua base.",
  appointment_created: "Enviado assim que uma sessão é marcada.",
  appointment_rescheduled: "Enviado quando o horário da sessão muda.",
  appointment_canceled: "Enviado quando a sessão é cancelada.",
  reminder_24h: "Lembrete automático no dia anterior.",
  reminder_1h: "Lembrete automático uma hora antes.",
  reminder_15m: "Último aviso, pouco antes de começar.",
  payment_received: "Confirmação de pagamento recebido.",
  payment_pending: "Cobrança gerada e aguardando pagamento.",
};

export const TEMPLATE_VARIABLES = [
  "{{paciente}}",
  "{{profissional}}",
  "{{servico}}",
  "{{data}}",
  "{{hora}}",
  "{{modalidade}}",
  "{{link}}",
  "{{valor}}",
] as const;

type Defaults = { subject: string; body: string };

export const DEFAULT_TEMPLATES: Record<NotificationEvent, Defaults> = {
  contact_created: {
    subject: "Bem-vindo(a) ao consultório de {{profissional}}",
    body:
      "Olá, {{paciente}}! 💛\n\nQue bom ter você por aqui. Sou {{profissional}} e vou acompanhar você neste processo.\n\nQualquer dúvida, é só responder esta mensagem.",
  },
  appointment_created: {
    subject: "Sessão confirmada para {{data}} às {{hora}}",
    body:
      "Olá, {{paciente}}! Sua sessão de {{servico}} está confirmada para {{data}} às {{hora}} ({{modalidade}}).\n\n{{link}}\n\nAté lá!",
  },
  appointment_rescheduled: {
    subject: "Sua sessão foi remarcada para {{data}} às {{hora}}",
    body:
      "Olá, {{paciente}}! Sua sessão foi remarcada para {{data}} às {{hora}}.\n\n{{link}}\n\nSe esse horário não funcionar, é só me avisar.",
  },
  appointment_canceled: {
    subject: "Sessão de {{data}} cancelada",
    body:
      "Olá, {{paciente}}. Sua sessão de {{data}} às {{hora}} foi cancelada.\n\nQuando quiser, podemos encontrar um novo horário.",
  },
  reminder_24h: {
    subject: "Lembrete: sua sessão é amanhã, {{data}} às {{hora}}",
    body:
      "Olá, {{paciente}}! Passando para lembrar da sua sessão amanhã, {{data}}, às {{hora}} ({{modalidade}}).\n\n{{link}}",
  },
  reminder_1h: {
    subject: "Sua sessão começa em 1 hora",
    body: "Olá, {{paciente}}! Sua sessão começa em 1 hora, às {{hora}}.\n\n{{link}}",
  },
  reminder_15m: {
    subject: "Sua sessão começa em 15 minutos",
    body: "{{paciente}}, sua sessão começa em 15 minutos. Já pode se preparar. 💛\n\n{{link}}",
  },
  payment_received: {
    subject: "Pagamento confirmado — sua sessão está agendada",
    body:
      "Olá, {{paciente}}! Recebemos seu pagamento de {{valor}} referente a {{servico}}. ✅\n\nSua sessão está confirmada para {{data}} às {{hora}}.\n\n{{link}}",
  },

  payment_pending: {
    subject: "Pagamento pendente da sua sessão",
    body:
      "Olá, {{paciente}}! Para confirmar sua sessão de {{servico}} em {{data}} às {{hora}}, finalize o pagamento de {{valor}}:\n\n{{link}}",
  },
};

export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
