import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Check, 
  AlertCircle, 
  QrCode, 
  MessageSquareOff,
  Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  getEvolutionInstance, 
  connectEvolution, 
  disconnectEvolution,
  validateEvolutionConfig 
} from "@/lib/evolution.functions";

export function EvolutionWhatsappPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getEvolutionInstance);
  const connectFn = useServerFn(connectEvolution);
  const disconnectFn = useServerFn(disconnectEvolution);

  const validateFn = useServerFn(validateEvolutionConfig);

  const { data: configStatus, isLoading: isConfigLoading } = useQuery({
    queryKey: ["evolution-config"],
    queryFn: () => validateFn(),
  });

  const { data: instanceData, isLoading: isInstanceLoading } = useQuery({
    queryKey: ["evolution-instance"],
    queryFn: () => getFn(),
    refetchInterval: (query: any) => {
      const data = query.state.data as any;
      return (data?.status === "qrcode_ready" || data?.status === "connecting" ? 3000 : false);
    },
    enabled: !!configStatus?.valid,
  });

  const instance = instanceData as any;

  const connect = useMutation({
    mutationFn: () => connectFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evolution-instance"] }),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao iniciar conexão"),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("Desconectado com sucesso");
      qc.invalidateQueries({ queryKey: ["evolution-instance"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao desconectar"),
  });

  if (isConfigLoading || isInstanceLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (configStatus && !configStatus.valid) {
    return (
      <Card className="p-6 border-destructive/50 bg-destructive/5">
        <div className="flex items-center gap-3 text-destructive mb-4">
          <AlertCircle className="h-6 w-6" />
          <h3 className="font-bold">Erro de Configuração do Sistema</h3>
        </div>
        <div className="space-y-2 mb-6">
          {configStatus.errors.map((err: string, i: number) => (
            <p key={i} className="text-sm text-destructive/80">• {err}</p>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic mb-4">
          Webhook esperado: <code className="bg-muted px-1 rounded">{configStatus.webhookUrl || 'N/A'}</code>
        </p>
        <Button 
          variant="outline" 
          onClick={() => qc.invalidateQueries({ queryKey: ["evolution-config"] })}
          className="w-full"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Validar Novamente
        </Button>
      </Card>
    );
  }

  const isConnected = instance?.status === "connected";
  const hasQrCode = instance?.status === "qrcode_ready" && instance?.qrcode;

  return (
    <div className="space-y-4">
      <Card className="p-6 border-gold/20">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              WhatsApp EvolutionGo <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20">Não Oficial</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte seu WhatsApp pessoal rapidamente via QR Code.
            </p>
          </div>
          {instance && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => connect.mutate()} 
              disabled={connect.isPending}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", connect.isPending && "animate-spin")} />
              Atualizar Status
            </Button>
          )}
        </div>

        <Separator className="my-4" />

        {!instance ? (
          <div className="py-8 text-center space-y-4">
            <div className="bg-gold/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold/10">
              <QrCode className="h-8 w-8 text-gold" />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="font-medium text-base">Pronto para conectar?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ao clicar em conectar, uma instância exclusiva será criada no servidor para o seu usuário.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
              <Button 
                onClick={() => connect.mutate()} 
                disabled={connect.isPending}
                className="bg-gold hover:bg-gold/90 text-black font-semibold w-full"
              >
                {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Criar Nova Instância
              </Button>
              <p className="text-[10px] text-muted-foreground italic">
                * Uma nova conexão segura e isolada será provisionada agora.
              </p>
            </div>
          </div>

        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-3 w-3 rounded-full animate-pulse",
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                )} />
                <div>
                  <p className="text-sm font-medium">{instance.instance_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{instance.status}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:bg-destructive/10"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Desconectar
              </Button>
            </div>

            {hasQrCode && !isConnected && (
              <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-white p-4 rounded-xl shadow-xl border-4 border-gold/20">
                  <img src={instance.qrcode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-gold">Escaneie o QR Code no seu WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Abra o WhatsApp {">"} Dispositivos Conectados {">"} Conectar um dispositivo</p>
                </div>
              </div>
            )}

            {isConnected && (
              <div className="py-6 text-center space-y-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-400">WhatsApp Conectado!</h3>
                  <p className="text-sm text-emerald-700/70 dark:text-emerald-500/70">Sua instância está ativa e pronta para enviar/receber mensagens.</p>
                </div>
              </div>
            )}

            {instance.status === "error" && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Erro na Conexão</p>
                  <p className="text-xs opacity-80">{instance.last_error || "Ocorreu um problema ao comunicar com a Evolution API."}</p>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 mt-2 text-destructive font-bold text-xs"
                    onClick={() => connect.mutate()}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-surface">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <MessageSquareOff className="h-4 w-4 text-gold" />
          Notas Importantes
        </h3>
        <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
          <li>Esta é uma integração <strong>não oficial</strong>. Use com moderação para evitar bloqueios da Meta.</li>
          <li>Recomendamos não enviar spam e responder apenas a interações iniciadas pelos clientes.</li>
          <li>As mensagens aparecerão automaticamente no seu <a href="/mensagens" className="text-gold hover:underline font-medium">Inbox</a>.</li>
          <li>Para maior estabilidade profissional, considere a Cloud API oficial da Meta na aba avançada.</li>
        </ul>
      </Card>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
