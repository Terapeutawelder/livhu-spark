import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plug, RefreshCw, Trash2, Send, ShieldCheck, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ZERNIO_PLATFORMS, ZERNIO_PLATFORM_LABEL } from "@/lib/zernio.platforms";
import {
  getZernioStatus,
  startZernioConnect,
  syncZernioAccounts,
  disconnectZernioAccount,
  sendZernioTestMessage,
} from "@/lib/zernio.functions";

type ZAccount = {
  id: string;
  account_id: string;
  platform: string;
  username: string | null;
  display_name: string | null;
  profile_picture: string | null;
  status: string;
  needs_reconnection: boolean;
};

export function ZernioChannelsPanel() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getZernioStatus);
  const connectFn = useServerFn(startZernioConnect);
  const syncFn = useServerFn(syncZernioAccounts);
  const disconnectFn = useServerFn(disconnectZernioAccount);
  const testFn = useServerFn(sendZernioTestMessage);

  const { data, isLoading } = useQuery({
    queryKey: ["zernio-status"],
    queryFn: () => statusFn() as Promise<{ configured: boolean; profileId: string | null; accounts: ZAccount[] }>,
  });

  const accounts = data?.accounts ?? [];
  const connectedIds = useMemo(() => new Set(accounts.map((a) => a.platform)), [accounts]);

  const sync = useMutation({
    mutationFn: async () => syncFn({ data: undefined as never }),
    onSuccess: () => {
      toast.success("Canais sincronizados");
      qc.invalidateQueries({ queryKey: ["zernio-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao sincronizar"),
  });

  // Após voltar do OAuth da Zernio, sincroniza automaticamente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (!connected) return;
    toast.success(`${ZERNIO_PLATFORM_LABEL[connected] ?? connected} conectado com sucesso`);
    params.delete("connected");
    params.delete("profileId");
    params.delete("accountId");
    params.delete("username");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    sync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [connecting, setConnecting] = useState<string | null>(null);
  async function connect(platform: string) {
    try {
      setConnecting(platform);
      const redirectUrl = `${window.location.origin}/configuracoes?tab=zernio`;
      const res = (await connectFn({ data: { platform, redirectUrl } })) as { authUrl: string };
      window.location.href = res.authUrl;
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível iniciar a conexão");
      setConnecting(null);
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => disconnectFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Canal desconectado");
      qc.invalidateQueries({ queryKey: ["zernio-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao desconectar"),
  });

  const [testTarget, setTestTarget] = useState<ZAccount | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testText, setTestText] = useState("Olá! Teste de conexão do LivHub 🌿");
  const sendTest = useMutation({
    mutationFn: async () => testFn({ data: { id: testTarget!.id, to: testTo, text: testText } }),
    onSuccess: (r: any) => (r?.ok ? toast.success("Mensagem enviada") : toast.error(r?.error ?? "Falha no envio")),
    onError: (e: any) => toast.error(e?.message ?? "Falha no envio"),
  });

  const groups = useMemo(() => {
    const map = new Map<string, typeof ZERNIO_PLATFORMS[number][]>();
    for (const p of ZERNIO_PLATFORMS) {
      const arr = map.get(p.group) ?? [];
      arr.push(p);
      map.set(p.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-primary" /> Conexão de canais
            </h2>
            <div className="mt-1.5 flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 border border-primary/20">
                <div className="h-4 w-12 flex items-center justify-center">
                  <span className="text-[10px] font-black tracking-tighter text-foreground/80">ZERNIO</span>
                </div>
                <Separator orientation="vertical" className="h-3 mx-0.5" />
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold uppercase bg-primary/10 text-primary border-0">
                  Partner
                </Badge>
                <div className="flex -space-x-1 items-center ml-0.5 opacity-70">
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-1 ring-border shadow-sm p-0.5">
                    <img src="https://cdn.simpleicons.org/meta" alt="Meta" className="h-full w-full object-contain" />
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Parceira oficial LivHub & Meta</p>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Conecte WhatsApp, Instagram, Messenger, Google Meu Negócio e outros canais autorizando sua conta
              diretamente — sem criar app na Meta e sem tokens manuais. As mensagens chegam no seu Inbox do LivHub.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Sincronizar
          </Button>
        </div>

        {data && !data.configured && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            A integração de canais ainda não foi ativada pelo administrador do LivHub. Assim que a chave for
            configurada, a conexão em 1 clique ficará disponível aqui.
          </div>
        )}

        <Separator className="my-4" />

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando canais…
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => {
                    const isConnected = connectedIds.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-card/60 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div 
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm"
                          >
                            <img 
                              src={`https://cdn.simpleicons.org/${p.icon}`} 
                              alt={p.label}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                // Fallback se o ícone não carregar
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="text-[10px] font-bold uppercase text-black">${p.id.slice(0, 2)}</span>`;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {isConnected ? "Conectado" : "Não conectado"}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isConnected ? "outline" : "default"}
                          disabled={!data?.configured || connecting === p.id}
                          onClick={() => connect(p.id)}
                        >
                          {connecting === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plug className="mr-1 h-4 w-4" /> {isConnected ? "Reconectar" : "Conectar"}
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold">Canais conectados</h3>
        <p className="text-sm text-muted-foreground">Contas ativas neste consultório.</p>
        <Separator className="my-3" />

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum canal conectado ainda.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {a.profile_picture ? (
                    <img src={a.profile_picture} alt={a.display_name ?? a.platform} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div 
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-2 shadow-sm"
                    >
                      <img 
                        src={`https://cdn.simpleicons.org/${ZERNIO_PLATFORMS.find(p => p.id === a.platform)?.icon ?? a.platform}`} 
                        alt={a.platform}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `<span class="text-xs font-semibold text-black">${(ZERNIO_PLATFORM_LABEL[a.platform] ?? a.platform).slice(0, 2).toUpperCase()}</span>`;
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {a.display_name ?? a.username ?? ZERNIO_PLATFORM_LABEL[a.platform] ?? a.platform}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ZERNIO_PLATFORM_LABEL[a.platform] ?? a.platform}
                      {a.username ? ` · @${a.username}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.needs_reconnection ? "destructive" : "outline"}>
                    {a.needs_reconnection ? "Reconectar" : "Ativo"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setTestTarget(a)}>
                    <Send className="mr-1 h-4 w-4" /> Testar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)} disabled={remove.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {testTarget && (
          <div className="mt-4 rounded-lg border p-3">
            <p className="text-sm font-medium">
              Enviar teste por {ZERNIO_PLATFORM_LABEL[testTarget.platform] ?? testTarget.platform}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Destinatário (número ou ID)</Label>
                <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="5511987650000" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Mensagem</Label>
                <Input value={testText} onChange={(e) => setTestText(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setTestTarget(null)}>Fechar</Button>
              <Button size="sm" onClick={() => sendTest.mutate()} disabled={sendTest.isPending || !testTo}>
                {sendTest.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Enviar
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Como funciona
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Cada consultório tem um espaço isolado no provedor de canais — suas conversas não se misturam.</li>
          <li>Você autoriza pelo login oficial da rede (Meta, Google etc.); o LivHub nunca vê sua senha.</li>
          <li>Não é necessário criar app de desenvolvedor nem gerar tokens manualmente.</li>
          <li>Pode desconectar qualquer canal a qualquer momento por aqui.</li>
        </ul>
      </Card>
    </div>
  );
}
