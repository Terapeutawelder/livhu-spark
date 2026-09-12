import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { exportAllData, exportTenantData } from "@/lib/backup.functions";
import { Database, Download, FileJson, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/dados")({
  head: () => ({
    meta: [
      { title: "Dados & Backup — Super Admin — LivHub" },
      { name: "description", content: "Exporte os dados do banco em JSON." },
      { property: "og:title", content: "Dados & Backup — Super Admin — LivHub" },
      { property: "og:description", content: "Exporte os dados do banco em JSON." },
    ],
  }),
  component: DadosPage,
});

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function DadosPage() {
  const [tenantId, setTenantId] = useState("");
  const exportAll = useServerFn(exportAllData);
  const exportTenant = useServerFn(exportTenantData);

  const tenantsQuery = useQuery({
    queryKey: ["admin", "tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const allMutation = useMutation({
    mutationFn: () => exportAll(),
    onSuccess: (data) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJson(data, `livhub-backup-${timestamp}.json`);
      toast.success("Backup completo baixado com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tenantMutation = useMutation({
    mutationFn: () => exportTenant({ data: { tenantId } }),
    onSuccess: (data) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const slug = tenantsQuery.data?.find((t) => t.id === tenantId)?.slug || "tenant";
      downloadJson(data, `livhub-tenant-${slug}-${timestamp}.json`);
      toast.success("Backup do tenant baixado com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      title="Dados & Backup"
      description="Exporte uma cópia dos dados do banco em formato JSON."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Exportar tudo</h2>
              <p className="text-sm text-muted-foreground">
                Baixa todas as tabelas públicas do projeto em um único arquivo JSON.
              </p>
            </div>
          </div>
          <Button
            className="mt-6 w-full"
            onClick={() => allMutation.mutate()}
            disabled={allMutation.isPending}
          >
            {allMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar banco completo
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Exportar por cliente</h2>
              <p className="text-sm text-muted-foreground">
                Baixa apenas os dados vinculados ao tenant selecionado.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tenant-select">Cliente</Label>
              <select
                id="tenant-select"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Selecione um cliente</option>
                {tenantsQuery.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => tenantMutation.mutate()}
              disabled={tenantMutation.isPending || !tenantId}
              variant="outline"
              className="w-full"
            >
              {tenantMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="mr-2 h-4 w-4" />
              )}
              Exportar dados do cliente
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h3 className="font-display text-lg font-semibold">Sobre a exportação</h3>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>O arquivo JSON contém apenas tabelas do schema público do projeto.</li>
          <li>Dados de autenticação (senhas, tokens, sessões) não são incluídos.</li>
          <li>A exportação usa service role e ignora as políticas de RLS; por isso é restrita ao super admin.</li>
          <li>Grandes bases podem demorar alguns segundos; aguarde o download iniciar.</li>
        </ul>
      </Card>
    </AdminShell>
  );
}
