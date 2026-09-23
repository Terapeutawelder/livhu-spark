import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/conectar")({
  head: () => ({
    meta: [
      { title: "Conectar assistente de IA — LivHub" },
      {
        name: "description",
        content:
          "Passo a passo para conectar o ChatGPT, o Claude ou outro assistente de IA ao seu consultório no LivHub.",
      },
      { property: "og:title", content: "Conectar assistente de IA — LivHub" },
      {
        property: "og:description",
        content: "Conecte seu assistente de IA ao LivHub e gerencie agenda, contatos e conversas por chat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

const SERVER_NAME = "livhub";

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function ConnectPage() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  const safeUrl = url.replaceAll("'", "'\\''");
  const claudeCode = `claude mcp add --scope user --transport http ${SERVER_NAME} '${safeUrl}'`;
  const claudeLink = url
    ? `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent("LivHub")}&connectorUrl=${encodeURIComponent(url)}`
    : "https://claude.ai/customize/connectors";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm font-semibold">LivHub</Link>
          <nav className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold">Conecte seu assistente de IA ao LivHub</h1>
          <p className="mt-2 text-muted-foreground">
            Com a conexão ativa, você pode pedir ao ChatGPT ou ao Claude para consultar sua agenda,
            criar contatos, agendar sessões e ver conversas recentes do seu consultório.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endereço de conexão</CardTitle>
            <CardDescription>Copie este endereço — você vai colá-lo no seu assistente.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 text-sm">
              {url || "carregando..."}
            </code>
            <CopyButton value={url} label="Copiar endereço" />
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Como conectar</h2>
          <Tabs defaultValue="chatgpt">
            <TabsList className="flex-wrap">
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="outros">Outros</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt" className="pt-4">
              <Steps
                items={[
                  <>
                    Abra as{" "}
                    <a className="underline" href="https://chatgpt.com/#settings/Connectors/Advanced" target="_blank" rel="noreferrer">
                      configurações avançadas de conectores
                    </a>{" "}
                    e ative o modo desenvolvedor (leia o aviso de risco exibido lá). Se a opção não
                    aparecer, peça a um administrador do ChatGPT para liberá-la.
                  </>,
                  <>
                    Abra a{" "}
                    <a className="underline" href="https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins" target="_blank" rel="noreferrer">
                      janela de novo conector
                    </a>
                    .
                  </>,
                  <>Preencha o nome <strong>LivHub</strong> e cole o endereço copiado acima.</>,
                  <>
                    Confira os dados, marque “Eu entendi e quero continuar” (o ChatGPT mostra esse
                    aviso para qualquer conector personalizado) e clique em “Criar”.
                  </>,
                  <>Ative o LivHub na caixa de mensagem e peça algo como “liste minhas sessões da semana”.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude" className="pt-4">
              <Steps
                items={[
                  <>
                    Abra o{" "}
                    <a className="underline" href={claudeLink} target="_blank" rel="noreferrer">
                      cadastro de conector do Claude
                    </a>{" "}
                    — nome e endereço já vêm preenchidos.
                  </>,
                  <>Confira os dados e clique em “Add”.</>,
                  <>
                    Se o formulário não abrir preenchido, vá em Connectors, escolha “Add custom
                    connector”, dê o nome LivHub e cole o endereço acima.
                  </>,
                  <>Ative o conector na caixa de mensagem e peça ao Claude para usar o LivHub.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude-code" className="space-y-4 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 text-xs">{claudeCode}</code>
                <CopyButton value={claudeCode} label="Copiar comando" />
              </div>
              <Steps
                items={[
                  <>Rode o comando acima no terminal.</>,
                  <>
                    Abra o Claude Code e digite <code>/mcp</code> para confirmar que o LivHub está
                    conectado (ele pede login quando necessário).
                  </>,
                  <>Peça ao Claude Code para usar o LivHub.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="outros" className="pt-4">
              <Steps
                items={[
                  <>Abra as configurações de conectores do seu assistente.</>,
                  <>Crie uma conexão com servidor remoto.</>,
                  <>Dê o nome LivHub e cole o endereço copiado acima.</>,
                  <>Conclua o login ou autorização solicitada.</>,
                  <>Ative a conexão e peça ao assistente para usar o LivHub.</>,
                ]}
              />
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Atualizar depois de mudanças no LivHub</h2>
          <p className="text-sm text-muted-foreground">
            Assistentes guardam a lista de recursos disponíveis. Depois de novidades no LivHub,
            atualize a conexão para ver as mais recentes.
          </p>
          <Tabs defaultValue="chatgpt">
            <TabsList className="flex-wrap">
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="outros">Outros</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt" className="pt-4">
              <Steps
                items={[
                  <>Abra a página de conectores do ChatGPT e selecione o LivHub.</>,
                  <>Desça até “Information” e clique em “Refresh”.</>,
                  <>
                    O ChatGPT não permite trocar o endereço de um conector existente: se ele mudou,
                    apague o conector e repita os passos de conexão com o novo endereço.
                  </>,
                  <>Comece uma conversa nova e peça para usar o LivHub.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude" className="pt-4">
              <Steps
                items={[
                  <>Abra a página de conectores e selecione o LivHub.</>,
                  <>Atualize a lista de recursos do conector.</>,
                  <>
                    O Claude não permite trocar o endereço de um conector existente: se ele mudou,
                    remova o conector e repita os passos de conexão.
                  </>,
                  <>Peça ao Claude para usar o LivHub.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude-code" className="pt-4">
              <Steps
                items={[
                  <>Inicie uma sessão nova do Claude Code — ele carrega a versão mais recente.</>,
                  <>
                    Se o endereço mudou, rode <code>claude mcp remove {SERVER_NAME}</code> e execute
                    novamente o comando de instalação com o novo endereço.
                  </>,
                  <>Peça ao Claude Code para usar o LivHub.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="outros" className="pt-4">
              <Steps
                items={[
                  <>Abra as configurações de conectores do assistente.</>,
                  <>Selecione a conexão criada para o LivHub.</>,
                  <>Atualize a lista de recursos ou reconecte o servidor.</>,
                  <>Se o endereço mudou, cole o endereço atual mostrado nesta página.</>,
                  <>Comece uma conversa nova e peça para usar o LivHub.</>,
                ]}
              />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
