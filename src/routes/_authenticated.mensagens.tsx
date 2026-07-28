import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Search, Send, Paperclip, Check, CheckCheck, MoreVertical, Tag, User as UserIcon,
  MessageSquare, Loader2, RefreshCw, Archive, Clock, CheckCircle2, Circle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  listConversations,
  getConversationMessages,
  sendConversationMessage,
  updateConversationStatus,
  listChannels,
  createMediaUploadUrl,
} from "@/lib/whatsapp.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mensagens")({
  head: () => ({
    meta: [
      { title: "Inbox — LivHub" },
      { name: "description", content: "Caixa de entrada WhatsApp multi-atendente com envio de mídia e templates." },
      { property: "og:title", content: "Inbox — LivHub" },
      { property: "og:description", content: "Atenda pacientes pelo WhatsApp com IA e humanos no LivHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxPage,
});

type Conv = {
  id: string;
  display_name: string;
  phone: string;
  profile_pic_url: string | null;
  status: "open" | "pending" | "resolved" | "snoozed" | "archived";
  tags: string[];
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: "inbound" | "outbound" | null;
  assigned_to: string | null;
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function InboxPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"open" | "pending" | "resolved" | "all">("open");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const listFn = useServerFn(listConversations);
  const channelsFn = useServerFn(listChannels);

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["wa-conversations", statusFilter],
    queryFn: () => listFn({ data: { status: statusFilter } }) as Promise<Conv[]>,
    refetchInterval: 30_000,
  });
  const { data: channels = [] } = useQuery({
    queryKey: ["wa-channels"],
    queryFn: () => channelsFn() as Promise<any[]>,
  });

  // Realtime — refresh list on new messages
  useEffect(() => {
    const ch = supabase
      .channel("wa-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["wa-conversations"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (p: any) => {
        qc.invalidateQueries({ queryKey: ["wa-conversations"] });
        if (p.new?.conversation_id) {
          qc.invalidateQueries({ queryKey: ["wa-conversation", p.new.conversation_id] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const filtered = useMemo(() => {
    if (!search.trim()) return convs;
    const q = search.toLowerCase();
    return convs.filter((c) =>
      c.display_name.toLowerCase().includes(q) || c.phone.includes(q) || (c.last_message_preview ?? "").toLowerCase().includes(q),
    );
  }, [convs, search]);

  const totalOpen = convs.filter((c) => c.status === "open").length;
  const totalUnread = convs.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  const hasChannel = channels.length > 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {!hasChannel && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-300">
          Você ainda não conectou um número WhatsApp. Vá em <a className="font-semibold underline" href="/configuracoes?tab=whatsapp">Configurações → WhatsApp</a> para ativar a Cloud API.
        </div>
      )}
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_320px]">
        {/* Left: conversation list */}
        <aside className="flex min-h-0 flex-col border-r bg-surface">
          <div className="border-b p-3">
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-lg font-semibold">Caixa de entrada</h1>
              <Badge variant="secondary" className="gap-1">
                <MessageSquare className="h-3 w-3" /> {totalOpen} abertas · {totalUnread} não lidas
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone…" className="pl-8" />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mt-3">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="open">Abertas</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="resolved">Resolvidas</TabsTrigger>
                <TabsTrigger value="all">Todas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Sem conversas nesta caixa.</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected(c.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40",
                        selected === c.id && "bg-muted/60",
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-gold text-xs text-sidebar-active-foreground">
                          {initials(c.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{c.display_name}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.last_message_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">{c.last_message_preview ?? c.phone}</p>
                          {c.unread_count > 0 && (
                            <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-sidebar-active-foreground">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                        {c.tags?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.tags.slice(0, 3).map((t) => (
                              <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </aside>

        {/* Middle: conversation */}
        {selected ? (
          <ConversationPane key={selected} conversationId={selected} />
        ) : (
          <div className="flex items-center justify-center bg-background p-8">
            <div className="text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Selecione uma conversa para começar.
            </div>
          </div>
        )}

        {/* Right: details (hidden on smaller screens) */}
        {selected && (
          <ConversationDetails conversationId={selected} className="hidden xl:flex" />
        )}
      </div>
    </div>
  );
}

// ---------------- Conversation pane ----------------

function ConversationPane({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getConversationMessages);
  const sendFn = useServerFn(sendConversationMessage);
  const uploadFn = useServerFn(createMediaUploadUrl);
  const statusFn = useServerFn(updateConversationStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["wa-conversation", conversationId],
    queryFn: () => getFn({ data: { conversationId } }),
  });

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages?.length]);

  const sendMut = useMutation({
    mutationFn: async (payload: any) => sendFn({ data: payload }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["wa-conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao enviar."),
  });

  const statusMut = useMutation({
    mutationFn: async (payload: any) => statusFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-conversations"] }),
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = (await uploadFn({
        data: { filename: file.name, mime: file.type || "application/octet-stream" },
      })) as any;
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload falhou");
      const kind: "image" | "audio" | "video" | "document" = file.type.startsWith("image/")
        ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : "document";
      setSending(true);
      await sendMut.mutateAsync({
        conversationId,
        body: text.trim() || undefined,
        media: { url: publicUrl, mime: file.type, filename: file.name, kind },
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no upload.");
    } finally {
      setUploading(false);
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMut.mutateAsync({ conversationId, body: text.trim() });
    } finally {
      setSending(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conv = (data as any).conversation;
  const msgs = (data as any).messages as any[];

  return (
    <section className="flex min-h-0 flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gold text-xs text-sidebar-active-foreground">{initials(conv.display_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{conv.display_name}</p>
            <p className="text-xs text-muted-foreground">{conv.phone} · {conv.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => statusMut.mutate({ conversationId, status: "resolved" })}>
            <CheckCircle2 className="h-4 w-4" /> Resolver
          </Button>
          <Button size="sm" variant="ghost" onClick={() => statusMut.mutate({ conversationId, status: "snoozed" })}>
            <Clock className="h-4 w-4" /> Adiar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => statusMut.mutate({ conversationId, status: "archived" })}>
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="min-h-0 flex-1 bg-[radial-gradient(circle,rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4">
          {msgs.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-surface p-3">
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" onChange={handleFile} className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
          <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading || sending}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Escreva uma mensagem…  (Enter envia, Shift+Enter quebra linha)"
            rows={1}
            className="min-h-[40px] max-h-40 resize-none"
          />
          <Button onClick={handleSend} disabled={sending || !text.trim()} className="gap-1">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
          </Button>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ m }: { m: any }) {
  const mine = m.direction === "outbound";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
        mine ? "bg-gold text-sidebar-active-foreground rounded-br-sm" : "bg-surface border rounded-bl-sm",
      )}>
        {m.type === "image" && m.media_url && (
          <img src={m.media_url} alt="" className="mb-1 max-h-64 rounded" />
        )}
        {m.type === "audio" && m.media_url && (
          <audio controls src={m.media_url} className="mb-1 w-64" />
        )}
        {m.type === "video" && m.media_url && (
          <video controls src={m.media_url} className="mb-1 max-h-64 rounded" />
        )}
        {m.type === "document" && m.media_url && (
          <a href={m.media_url} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 underline">
            <Paperclip className="h-3 w-3" /> {m.media_filename ?? "documento"}
          </a>
        )}
        {m.template_name && (
          <div className="mb-1 text-[10px] uppercase opacity-70">template: {m.template_name}</div>
        )}
        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
        <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-black/60" : "text-muted-foreground")}>
          <span>{new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {mine && <StatusTick status={m.status} />}
        </div>
      </div>
    </div>
  );
}

function StatusTick({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-blue-600" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3" />;
  if (status === "failed") return <Circle className="h-3 w-3 text-red-500" />;
  return <Check className="h-3 w-3" />;
}

function ConversationDetails({ conversationId, className }: { conversationId: string; className?: string }) {
  const getFn = useServerFn(getConversationMessages);
  const { data } = useQuery({
    queryKey: ["wa-conversation", conversationId],
    queryFn: () => getFn({ data: { conversationId } }),
  });
  const conv = (data as any)?.conversation;
  if (!conv) return null;
  return (
    <aside className={cn("min-h-0 flex-col overflow-y-auto border-l bg-surface p-4 flex", className)}>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gold text-sidebar-active-foreground">{initials(conv.display_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{conv.display_name}</p>
            <p className="text-xs text-muted-foreground">{conv.phone}</p>
          </div>
        </div>
      </Card>
      <Card className="mt-3 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Tag className="h-3 w-3" /> Tags
        </p>
        <div className="flex flex-wrap gap-1">
          {conv.tags?.length ? conv.tags.map((t: string) => (
            <Badge key={t} variant="outline">{t}</Badge>
          )) : <span className="text-xs text-muted-foreground">Sem tags</span>}
        </div>
      </Card>
      <Card className="mt-3 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <UserIcon className="h-3 w-3" /> Atribuição
        </p>
        <p className="text-xs">{conv.assigned_to ? "Atribuída" : "Não atribuída"}</p>
      </Card>
    </aside>
  );
}
