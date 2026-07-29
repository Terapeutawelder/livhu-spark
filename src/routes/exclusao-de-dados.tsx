import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "./privacidade";

export const Route = createFileRoute("/exclusao-de-dados")({
  head: () => ({
    meta: [
      { title: "Exclusão de Dados — LivHub" },
      { name: "description", content: "Instruções para solicitar a exclusão dos seus dados no LivHub, incluindo dados vindos da integração com Meta/WhatsApp." },
      { property: "og:title", content: "Exclusão de Dados — LivHub" },
      { property: "og:description", content: "Como solicitar a exclusão dos seus dados no LivHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalShell title="Instruções de Exclusão de Dados" updated="29 de julho de 2026">
      <p>
        Você pode solicitar a exclusão completa dos seus dados armazenados no LivHub, incluindo
        aqueles obtidos via integração com a Meta (Facebook/WhatsApp Business).
      </p>

      <h2>Como solicitar</h2>
      <ol>
        <li>
          Envie um e-mail para{" "}
          <a href="mailto:contato@livhub.cloud">contato@livhub.cloud</a> com o assunto{" "}
          <strong>"Exclusão de dados — LivHub"</strong>.
        </li>
        <li>Informe o e-mail cadastrado na plataforma e, se possível, o nome do consultório/tenant.</li>
        <li>Nossa equipe confirmará a solicitação em até 5 dias úteis.</li>
        <li>A exclusão será concluída em até 30 dias, incluindo backups.</li>
      </ol>

      <h2>Exclusão automática via Meta</h2>
      <p>
        Se você removeu o LivHub das permissões do seu Facebook/Meta, receberemos automaticamente
        uma requisição de exclusão de dados por meio do callback oficial da Meta. O status da sua
        solicitação poderá ser consultado através do código de confirmação recebido.
      </p>

      <h2>O que é excluído</h2>
      <ul>
        <li>Perfil, credenciais e histórico de acesso;</li>
        <li>Contatos, agendamentos e notas clínicas;</li>
        <li>Conversas e mídias do WhatsApp armazenadas no LivHub;</li>
        <li>Tokens de acesso à API da Meta.</li>
      </ul>

      <h2>O que pode ser retido</h2>
      <p>
        Dados fiscais e registros mínimos exigidos por lei podem ser retidos pelo período legal
        aplicável, sempre de forma segregada e restrita.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas? Fale com nosso Encarregado (DPO):{" "}
        <a href="mailto:contato@livhub.cloud">contato@livhub.cloud</a>.
      </p>
    </LegalShell>
  ),
});
