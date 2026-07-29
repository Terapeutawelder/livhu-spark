import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "./privacidade";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — LivHub" },
      { name: "description", content: "Termos de uso do LivHub, plataforma de gestão clínica e mensageria WhatsApp para psicoterapeutas." },
      { property: "og:title", content: "Termos de Uso — LivHub" },
      { property: "og:description", content: "Termos de uso da plataforma LivHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalShell title="Termos de Uso" updated="29 de julho de 2026">
      <p>
        Ao criar uma conta no LivHub, você concorda com estes Termos. Leia com atenção antes de
        continuar utilizando a plataforma.
      </p>

      <h2>1. Objeto</h2>
      <p>
        O LivHub disponibiliza uma plataforma SaaS que integra CRM, agenda, mensageria WhatsApp
        (via Meta Cloud API) e agentes de IA para psicoterapeutas e clínicas.
      </p>

      <h2>2. Cadastro e responsabilidade</h2>
      <p>
        Você é responsável pela veracidade das informações fornecidas, pela guarda das credenciais
        e por todas as ações realizadas na sua conta. É proibido compartilhar acesso com terceiros
        não autorizados.
      </p>

      <h2>3. Uso adequado</h2>
      <ul>
        <li>Você não pode utilizar o LivHub para enviar spam, mensagens não solicitadas ou conteúdo ilícito.</li>
        <li>Você deve respeitar as políticas do WhatsApp Business e da Meta.</li>
        <li>É vedado utilizar a plataforma para atividades que violem sigilo profissional ou legislação vigente.</li>
      </ul>

      <h2>4. Planos e pagamentos</h2>
      <p>
        Oferecemos plano gratuito com limites e planos pagos recorrentes. O valor, ciclo de
        cobrança e limites de cada plano estão descritos na página de assinatura. Em caso de
        inadimplência, a conta pode ser bloqueada em modo somente-leitura.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        O código, marca e conteúdo do LivHub são de propriedade da LivHub. Os dados clínicos e
        conversas armazenadas pertencem ao Cliente.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        O LivHub é uma ferramenta auxiliar. Decisões clínicas são de responsabilidade exclusiva do
        profissional. Não nos responsabilizamos por indisponibilidades causadas por terceiros
        (Meta, provedores de nuvem, operadoras).
      </p>

      <h2>7. Cancelamento</h2>
      <p>
        Você pode cancelar sua assinatura a qualquer momento pelo painel. Após o cancelamento, os
        dados serão retidos por 30 dias para eventual reativação e depois excluídos.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Podemos atualizar estes Termos a qualquer momento; alterações relevantes serão comunicadas
        por e-mail com pelo menos 15 dias de antecedência.
      </p>

      <h2>9. Foro</h2>
      <p>
        Fica eleito o foro da Comarca de São Paulo/SP para dirimir qualquer controvérsia.
      </p>
    </LegalShell>
  ),
});
