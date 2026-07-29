// Catálogo de fluxos prontos para 1-clique de instalação.
// Cada template gera um registro na tabela `flows` já com steps preenchidos.

export type FlowTemplateStepKind = "message" | "wait" | "ai" | "condition" | "notify";

export type FlowTemplateStep = {
  kind: FlowTemplateStepKind;
  label: string;
  content: string;
};

export type FlowTemplate = {
  id: string;
  name: string;
  description: string;
  category: "captacao" | "agendamento" | "retencao" | "pos_sessao" | "financeiro";
  icon: string; // emoji para exibir no card
  trigger:
    | "contact_created"
    | "first_message_received"
    | "appointment_scheduled"
    | "appointment_completed"
    | "no_reply_7d"
    | "payment_received";
  steps: FlowTemplateStep[];
};

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "boas-vindas-lead",
    name: "Boas-vindas para novo lead do WhatsApp",
    description:
      "Recebe o novo contato, apresenta o consultório, pergunta motivo da procura e encaminha para triagem.",
    category: "captacao",
    icon: "👋",
    trigger: "first_message_received",
    steps: [
      {
        kind: "message",
        label: "Saudação",
        content:
          "Olá {{nome}}! Aqui é a assistente virtual do consultório 🌿\nQue bom receber você. Posso te ajudar em alguns minutos?",
      },
      { kind: "wait", label: "Aguardar resposta", content: "2 minutos" },
      {
        kind: "ai",
        label: "Triagem com IA",
        content:
          "Objetivo: identificar (1) motivo da procura, (2) urgência (baixa/média/alta), (3) modalidade preferida (online/presencial), (4) melhor horário para conversar. Seja acolhedora e nunca dê diagnósticos.",
      },
      {
        kind: "condition",
        label: "Se urgência = alta",
        content: "Se urgência = alta → notificar terapeuta imediatamente. Senão → seguir agendamento.",
      },
      {
        kind: "notify",
        label: "Notificar terapeuta",
        content: "Push + e-mail com o resumo da triagem.",
      },
    ],
  },
  {
    id: "confirmacao-sessao",
    name: "Confirmação automática de sessão (24h antes)",
    description:
      "Envia lembrete 24h antes da sessão, aguarda confirmação e reagenda automaticamente se necessário.",
    category: "agendamento",
    icon: "📅",
    trigger: "appointment_scheduled",
    steps: [
      { kind: "wait", label: "Aguardar até 24h antes", content: "24h antes de starts_at" },
      {
        kind: "message",
        label: "Lembrete + confirmação",
        content:
          "Oi {{nome}}! Passando para confirmar sua sessão amanhã às {{horario}} ({{modalidade}}). Podemos manter? Responda *SIM* para confirmar ou *REAGENDAR*.",
      },
      { kind: "wait", label: "Aguardar resposta", content: "6 horas" },
      {
        kind: "condition",
        label: "Se não respondeu",
        content: "Se sem resposta → reenviar lembrete às 8h do dia da sessão.",
      },
      {
        kind: "message",
        label: "Reenvio matinal",
        content: "Bom dia {{nome}}! Nossa sessão de hoje às {{horario}} está confirmada?",
      },
    ],
  },
  {
    id: "sem-resposta-7d",
    name: "Resgate de lead sem resposta há 7 dias",
    description:
      "Reativa contatos que sumiram: mensagem leve de acolhimento e oferta de nova conversa.",
    category: "retencao",
    icon: "💬",
    trigger: "no_reply_7d",
    steps: [
      {
        kind: "message",
        label: "Retomar contato",
        content:
          "Oi {{nome}}, tudo bem? Notei que a gente não conversou nos últimos dias. Se ainda faz sentido pra você conhecer o trabalho, é só me responder por aqui — sem compromisso. 💛",
      },
      { kind: "wait", label: "Aguardar", content: "3 dias" },
      {
        kind: "condition",
        label: "Se continuar sem resposta",
        content: "Se sem resposta → mover para estágio 'Perdido' no Kanban.",
      },
      {
        kind: "notify",
        label: "Notificar terapeuta",
        content: "Registrar no CRM o contato como frio para follow-up manual futuro.",
      },
    ],
  },
  {
    id: "pos-sessao-feedback",
    name: "Pós-sessão: agradecimento + feedback",
    description:
      "Após a sessão realizada, agradece, pede um feedback rápido e agenda a próxima.",
    category: "pos_sessao",
    icon: "✨",
    trigger: "appointment_completed",
    steps: [
      { kind: "wait", label: "Aguardar 2 horas", content: "2 horas" },
      {
        kind: "message",
        label: "Agradecimento",
        content:
          "Oi {{nome}}, espero que a sessão de hoje tenha sido acolhedora 🌿\nEm uma palavra, como você está se sentindo agora?",
      },
      { kind: "wait", label: "Aguardar 1 dia", content: "24 horas" },
      {
        kind: "message",
        label: "Agendar próxima",
        content:
          "Que bom te ver na sessão! Vamos deixar já a próxima marcada? Me confirma um horário aqui: {{link_agendamento}}",
      },
    ],
  },
  {
    id: "cobranca-pagamento",
    name: "Confirmação de pagamento + recibo",
    description:
      "Assim que o pagamento é confirmado, envia mensagem de agradecimento com recibo e próximos passos.",
    category: "financeiro",
    icon: "💳",
    trigger: "payment_received",
    steps: [
      {
        kind: "message",
        label: "Confirmação",
        content:
          "Recebemos seu pagamento, {{nome}}! ✅\nEnviei o recibo para o seu e-mail cadastrado. Qualquer dúvida é só me chamar por aqui.",
      },
      {
        kind: "notify",
        label: "Registrar no CRM",
        content: "Marcar contato como 'Em atendimento' no Kanban e registrar receita.",
      },
    ],
  },
];

export const CATEGORY_LABEL: Record<FlowTemplate["category"], string> = {
  captacao: "Captação",
  agendamento: "Agendamento",
  retencao: "Retenção",
  pos_sessao: "Pós-sessão",
  financeiro: "Financeiro",
};
