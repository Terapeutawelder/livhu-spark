export type TherapyPlan = {
  id: string;
  name: string;
  sessions: number;
  discount: number;
  note: string;
};

/** Planos de terapia oferecidos no agendamento público (compartilhado cliente/servidor). */
export const THERAPY_PLANS: TherapyPlan[] = [
  {
    id: "single",
    name: "Sessão avulsa",
    sessions: 1,
    discount: 0,
    note: "Sem compromisso — ideal para começar",
  },
  {
    id: "monthly",
    name: "Plano mensal",
    sessions: 4,
    discount: 0.05,
    note: "4 sessões · 5% de desconto",
  },
  {
    id: "quarterly",
    name: "Plano trimestral",
    sessions: 12,
    discount: 0.12,
    note: "12 sessões · 12% de desconto",
  },
];

export function findPlan(id: string | null | undefined): TherapyPlan {
  return THERAPY_PLANS.find((p) => p.id === id) ?? THERAPY_PLANS[0];
}

export function planTotalCents(priceCents: number, plan: TherapyPlan): number {
  return Math.round(priceCents * plan.sessions * (1 - plan.discount));
}
