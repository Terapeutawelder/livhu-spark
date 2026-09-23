import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — LivHub" },
      { name: "description", content: "Como o LivHub coleta, usa e protege os dados dos profissionais e pacientes." },
      { property: "og:title", content: "Política de Privacidade — LivHub" },
      { property: "og:description", content: "Como o LivHub coleta, usa e protege os dados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Política de Privacidade" updated="29 de julho de 2026">
      <p>
        A LivHub ("nós") oferece uma plataforma SaaS de gestão clínica e mensageria WhatsApp para
        psicoterapeutas e clínicas ("Cliente"). Esta política descreve quais dados coletamos, como
        os utilizamos e quais são os seus direitos.
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Dados de conta:</strong> nome, e-mail, telefone e credenciais de autenticação.</li>
        <li><strong>Dados do consultório:</strong> pacientes, agendamentos, sessões e notas clínicas.</li>
        <li><strong>Dados de mensageria:</strong> mensagens WhatsApp trocadas entre profissional e paciente através da API oficial da Meta (WhatsApp Business Cloud).</li>
        <li><strong>Dados técnicos:</strong> logs, IP, user-agent e dados de uso para segurança e diagnóstico.</li>
      </ul>

      <h2>2. Como usamos</h2>
      <p>
        Utilizamos os dados exclusivamente para operar a plataforma, prestar suporte, cumprir
        obrigações legais e garantir a segurança. Não vendemos dados pessoais e não os utilizamos
        para publicidade de terceiros.
      </p>

      <h2>3. Integração com a Meta (WhatsApp Business)</h2>
      <p>
        Quando o profissional conecta seu número WhatsApp, o LivHub atua como Business Solution
        Provider (BSP) autorizado, armazenando o token de acesso de forma cifrada e utilizando-o
        apenas para enviar/receber mensagens em nome do profissional. Nenhum dado é compartilhado
        com outros clientes LivHub.
      </p>

      <h2>4. Base legal (LGPD)</h2>
      <p>
        Tratamos dados com base em (i) execução de contrato, (ii) consentimento do titular quando
        aplicável e (iii) legítimo interesse para segurança e prevenção a fraudes.
      </p>

      <h2>5. Retenção</h2>
      <p>
        Mantemos os dados enquanto durar a relação contratual. Após o encerramento, os dados são
        anonimizados ou excluídos em até 90 dias, salvo obrigação legal em contrário.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados a qualquer
        momento pelo e-mail <a href="mailto:contato@livhub.cloud">contato@livhub.cloud</a> ou pela
        página <Link to="/exclusao-de-dados">Exclusão de Dados</Link>.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos criptografia em trânsito (TLS) e em repouso para credenciais sensíveis, controle
        de acesso por tenant (isolamento por consultório) e revisões periódicas de segurança.
      </p>

      <h2>8. Contato do Encarregado (DPO)</h2>
      <p>
        E-mail: <a href="mailto:contato@livhub.cloud">contato@livhub.cloud</a>
      </p>
    </LegalShell>
  );
}

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm font-semibold">LivHub</Link>
          <nav className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
            <Link to="/exclusao-de-dados">Excluir dados</Link>
            <Link to="/conectar">Conectar IA</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: {updated}</p>
        <article className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-h2:mt-8 prose-h2:text-xl prose-h2:font-semibold prose-p:leading-relaxed">
          {children}
        </article>
      </main>
    </div>
  );
}
