import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Video, XCircle } from "lucide-react";

export const Route = createFileRoute("/pagamento/retorno")({
  head: () => ({
    meta: [
      { title: "Confirmação de pagamento — LivHub" },
      { name: "description", content: "Acompanhe a confirmação do pagamento da sua sessão de psicoterapia." },
      { property: "og:title", content: "Confirmação de pagamento — LivHub" },
      { property: "og:description", content: "Acompanhe a confirmação do pagamento da sua sessão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentReturnPage,
});

type Status = "pending" | "paid" | "failed" | "unknown";

function PaymentReturnPage() {
  const [status, setStatus] = useState<Status>("pending");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order");
    if (!orderId) {
      setStatus("unknown");
      return;
    }
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      tries++;
      try {
        const res = await fetch(`/api/public/payments/status?order=${encodeURIComponent(orderId)}`);
        const data = (await res.json()) as { status?: Status; startsAt?: string | null; meetingUrl?: string | null };
        setStartsAt(data.startsAt ?? null);
        setMeetingUrl(data.meetingUrl ?? null);
        if (data.status === "paid" || data.status === "failed") {
          setStatus(data.status);
          return;
        }
      } catch {
        /* tenta de novo */
      }
      if (tries < 20) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {status === "paid" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
            <h1 className="mt-4 font-display text-2xl font-bold">Pagamento confirmado!</h1>
            {startsAt && (
              <p className="mt-2 text-sm text-muted-foreground">
                Sessão em {new Date(startsAt).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Você vai receber a confirmação com os detalhes no WhatsApp.
            </p>
            {meetingUrl && (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-sidebar-active-foreground"
              >
                <Video className="h-4 w-4" /> Entrar na sala da sessão
              </a>
            )}
          </>
        ) : status === "failed" ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold">Pagamento não concluído</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nada foi cobrado. Volte à página do profissional e tente novamente.
            </p>
          </>
        ) : (
          <>
            <Clock className="mx-auto h-12 w-12 animate-pulse text-gold" />
            <h1 className="mt-4 font-display text-2xl font-bold">Confirmando seu pagamento…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Isso leva alguns segundos. Assim que confirmar, enviamos os dados da sessão e o link da sala no WhatsApp.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
