import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, Globe, Loader2, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminActivateSubdomain,
  adminListDomainRequests,
  adminProvisionCustomHostname,
  adminRefreshCustomHostname,
} from "@/lib/tenant-domain.functions";

export const Route = createFileRoute("/_authenticated/admin/dominios")({
  head: () => ({
    meta: [
      { title: "Domínios — Super Admin" },
      { name: "description", content: "Ative subdomínios e provisione domínios próprios dos tenants via Cloudflare for SaaS." },
      { property: "og:title", content: "Domínios — Super Admin" },
      { property: "og:description", content: "Gestão de subdomínios e domínios próprios do LivHub." },
    ],
  }),
  component: DominiosAdminPage,
});

function statusColor(status: string) {
  switch (status) {
    case "pending": return "bg-amber-500/10 text-amber-600";
    case "in_progress": return "bg-blue-500/10 text-blue-600";
    case "active": return "bg-emerald-500/10 text-emerald-600";
    case "failed":
    case "rejected": return "bg-rose-500/10 text-rose-600";
    default: return "bg-muted text-muted-foreground";
  }
}

function DominiosAdminPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListDomainRequests);
  const activateFn = useServerFn(adminActivateSubdomain);
  const provisionFn = useServerFn(adminProvisionCustomHostname);
  const refreshFn = useServerFn(adminRefreshCustomHostname);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-domain-requests"],
    queryFn: () => listFn(),
  });

  const activate = useMutation({
    mutationFn: (id: string) => activateFn({ data: { requestId: id } }),
    onSuccess: () => {
      toast.success("Subdomínio ativado.");
      qc.invalidateQueries({ queryKey: ["admin-domain-requests"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const provision = useMutation({
    mutationFn: (id: string) => provisionFn({ data: { requestId: id } }),
    onSuccess: () => {
      toast.success("Hostname criado na Cloudflare. Aguardando validação DNS.");
      qc.invalidateQueries({ queryKey: ["admin-domain-requests"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const refresh = useMutation({
    mutationFn: (tenantId: string) => refreshFn({ data: { tenantId } }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-domain-requests"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <AdminShell
      title="Domínios"
      description="Ative subdomínios e provisione domínios próprios (Cloudflare for SaaS)."
    >
      {isLoading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação de domínio no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((r) => {
            type Tenant = { name: string; slug: string; custom_domain: string | null; custom_domain_status: string | null; custom_hostname_id: string | null; custom_domain_verification: Record<string, unknown> | null };
            const tenant = (r as unknown as { tenants: Tenant | null }).tenants;
            const isCustom = r.kind === "custom_domain";
            return (
              <div key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isCustom ? <Globe className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      <p className="truncate font-mono text-sm font-semibold">{r.value}</p>
                      <Badge className={`${statusColor(r.status)} text-[10px]`}>{r.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tenant?.name} · {isCustom ? "Domínio próprio" : "Subdomínio"} ·{" "}
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </p>
                    {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isCustom && r.status === "pending" && (
                      <Button size="sm" onClick={() => activate.mutate(r.id)} disabled={activate.isPending}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Ativar
                      </Button>
                    )}
                    {isCustom && r.status === "pending" && (
                      <Button size="sm" onClick={() => provision.mutate(r.id)} disabled={provision.isPending}>
                        Provisionar na Cloudflare
                      </Button>
                    )}
                    {isCustom && tenant?.custom_hostname_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refresh.mutate(r.tenant_id)}
                        disabled={refresh.isPending}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Verificar
                      </Button>
                    )}
                  </div>
                </div>

                {isCustom && tenant?.custom_domain_verification && (
                  <VerificationBlock verification={tenant.custom_domain_verification} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

function VerificationBlock({ verification }: { verification: Record<string, unknown> }) {
  const ownership = verification.ownership as { name?: string; type?: string; value?: string } | null;
  const ssl = verification.ssl as Array<{ txt_name?: string; txt_value?: string }> | null;
  return (
    <div className="mt-3 space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
      <p className="font-medium">Registros DNS que o cliente precisa criar:</p>
      {ownership?.name && (
        <div className="space-y-1">
          <p className="text-muted-foreground">Verificação de propriedade ({ownership.type}):</p>
          <div className="rounded bg-background p-2 font-mono">
            <div>Nome: {ownership.name}</div>
            <div>Valor: {ownership.value}</div>
          </div>
        </div>
      )}
      {ssl?.map((rec, i) =>
        rec.txt_name ? (
          <div key={i} className="space-y-1">
            <p className="text-muted-foreground">Validação SSL (TXT):</p>
            <div className="rounded bg-background p-2 font-mono">
              <div>Nome: {rec.txt_name}</div>
              <div>Valor: {rec.txt_value}</div>
            </div>
          </div>
        ) : null,
      )}
      <p className="text-muted-foreground">
        Além disso: o cliente aponta um <span className="font-mono">CNAME</span> do domínio dele para{" "}
        <span className="font-mono">psi.livhub.cloud</span>.
      </p>
    </div>
  );
}
