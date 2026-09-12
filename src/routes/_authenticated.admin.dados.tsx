import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  composeManifest,
  exportTablesChunk,
  startBackup,
  type BackupManifest,
  type TableReport,
} from "@/lib/backup.functions";
import {
  Building2,
  Database,
  Download,
  FileJson,
  Loader2,
  ShieldAlert,
} from "lucide-react";
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

/** Limite seguro de um único arquivo/resposta serializada. */
const MAX_PART_BYTES = 8 * 1024 * 1024;
/** Agrupamento de tabelas por chamada ao servidor. */
const MAX_ROWS_PER_CALL = 5000;
const MAX_TABLES_PER_CALL = 8;

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

function groupTables(plan: Array<{ table_name: string; database_count: number }>) {
  const groups: string[][] = [];
  let current: string[] = [];
  let rows = 0;
  for (const item of plan) {
    if (current.length && (rows + item.database_count > MAX_ROWS_PER_CALL || current.length >= MAX_TABLES_PER_CALL)) {
      groups.push(current);
      current = [];
      rows = 0;
    }
    current.push(item.table_name);
    rows += item.database_count;
  }
  if (current.length) groups.push(current);
  return groups;
}

function splitIntoParts(tables: Record<string, unknown[]>) {
  const parts: Array<Record<string, unknown[]>> = [];
  let current: Record<string, unknown[]> = {};
  let size = 0;
  for (const [name, rows] of Object.entries(tables)) {
    const bytes = JSON.stringify(rows).length;
    if (size > 0 && size + bytes > MAX_PART_BYTES) {
      parts.push(current);
      current = {};
      size = 0;
    }
    current[name] = rows;
    size += bytes;
  }
  if (Object.keys(current).length) parts.push(current);
  return parts;
}

function DadosPage() {
  const [tenantId, setTenantId] = useState("");
  const [includeGlobal, setIncludeGlobal] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastManifest, setLastManifest] = useState<BackupManifest | null>(null);

  const start = useServerFn(startBackup);
  const chunk = useServerFn(exportTablesChunk);

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

  async function runBackup(targetTenantId: string | null) {
    setLastManifest(null);
    setProgress("Contando registros...");

    const planResult = await start({
      data: { tenantId: targetTenantId, includeGlobal: targetTenantId ? includeGlobal : true },
    });

    const groups = groupTables(planResult.plan);
    const tables: Record<string, unknown[]> = {};
    const reports: TableReport[] = [];

    let done = 0;
    for (const group of groups) {
      setProgress(`Exportando tabelas ${done + 1}–${done + group.length} de ${planResult.plan.length}...`);
      const res = await chunk({
        data: {
          tables: group,
          tenantId: targetTenantId,
          includeGlobal: targetTenantId ? includeGlobal : true,
        },
      });
      Object.assign(tables, res.tables);
      reports.push(...(res.reports as TableReport[]));
      done += group.length;
    }

    const kind: "full" | "tenant" = targetTenantId ? "tenant" : "full";
    const manifest = composeManifest(
      reports,
      kind,
      targetTenantId,
      targetTenantId ? includeGlobal : true,
    );
    setLastManifest(manifest);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = targetTenantId
      ? tenantsQuery.data?.find((t) => t.id === targetTenantId)?.slug || "tenant"
      : "completo";
    const suffix = manifest.complete ? "" : "-parcial";
    const parts = splitIntoParts(tables);

    setProgress("Gerando arquivo...");

    if (parts.length === 1) {
      downloadJson(
        { manifest, tables: parts[0] },
        `livhub-backup-${slug}-${stamp}${suffix}.json`,
      );
    } else {
      downloadJson(
        { ...manifest, parts: parts.length },
        `livhub-backup-${slug}-${stamp}${suffix}-manifest.json`,
      );
      parts.forEach((part, i) => {
        downloadJson(
          {
            manifest_ref: manifest.generated_at,
            part: i + 1,
            of: parts.length,
            tables: part,
          },
          `livhub-backup-${slug}-${stamp}${suffix}-parte-${String(i + 1).padStart(2, "0")}.json`,
        );
      });
    }

    setProgress(null);
    return manifest;
  }

  const allMutation = useMutation({
    mutationFn: () => runBackup(null),
    onSuccess: (manifest) => {
      if (manifest.complete) {
        toast.success(
          `Backup completo: ${manifest.exported_total} de ${manifest.expected_total} registros.`,
        );
      } else {
        toast.warning("Backup parcial — veja o relatório abaixo.");
      }
    },
    onError: (e: Error) => {
      setProgress(null);
      toast.error(e.message);
    },
  });

  const tenantMutation = useMutation({
    mutationFn: () => runBackup(tenantId),
    onSuccess: (manifest) => {
      if (manifest.complete) {
        toast.success("Backup completo do cliente baixado.");
      } else {
        toast.warning("Backup parcial do cliente — veja o relatório abaixo.");
      }
    },
    onError: (e: Error) => {
      setProgress(null);
      toast.error(e.message);
    },
  });

  const busy = allMutation.isPending || tenantMutation.isPending;

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
                Baixa todas as tabelas públicas com contagem verificada e manifest.
              </p>
            </div>
          </div>
          <Button
            className="mt-6 w-full"
            onClick={() => allMutation.mutate()}
            disabled={busy}
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
                Cada tabela é filtrada diretamente no banco pelo cliente escolhido.
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
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={includeGlobal}
                onChange={(e) => setIncludeGlobal(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Incluir tabelas globais (planos, pacotes, configurações da plataforma)
            </label>
            <Button
              onClick={() => tenantMutation.mutate()}
              disabled={busy || !tenantId}
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

      {progress && (
        <Card className="mt-6 flex items-center gap-3 p-4 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          {progress}
        </Card>
      )}

      {lastManifest && (
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold">
              {lastManifest.complete ? "Backup completo" : "Backup parcial"}
            </h3>
            <span className="text-sm text-muted-foreground">
              {lastManifest.exported_total} de {lastManifest.expected_total} registros •{" "}
              {lastManifest.tables.length} tabelas
            </span>
          </div>

          {!lastManifest.complete && (
            <p className="mt-3 text-sm text-destructive">
              Divergências encontradas em:{" "}
              {[
                ...lastManifest.truncated_tables,
                ...lastManifest.failed_tables,
                ...lastManifest.missing_tables,
              ].join(", ")}
            </p>
          )}

          <div className="mt-4 max-h-80 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Tabela</th>
                  <th className="px-3 py-2">No banco</th>
                  <th className="px-3 py-2">Exportado</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {lastManifest.tables.map((r) => (
                  <tr key={r.table_name} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{r.table_name}</td>
                    <td className="px-3 py-2">{r.database_count}</td>
                    <td className="px-3 py-2">{r.exported_count}</td>
                    <td className="px-3 py-2">
                      {r.complete ? (
                        <span className="text-emerald-500">ok</span>
                      ) : (
                        <span className="text-destructive">{r.error ?? "incompleto"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <h3 className="font-display text-lg font-semibold">Aviso de segurança</h3>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>
                O arquivo pode conter <strong>campos criptografados de credenciais</strong>{" "}
                (tokens de canais, chaves de IA e credenciais de pagamento). Guarde-o em local seguro.
              </li>
              <li>Nenhum secret do ambiente do servidor é incluído no arquivo.</li>
              <li>Dados de autenticação (senhas, hashes, sessões) não são exportados.</li>
              <li>
                A exportação roda no servidor com privilégio administrativo e é restrita ao super admin.
              </li>
              <li>
                Backups grandes são divididos em partes numeradas acompanhadas de um manifest.
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </AdminShell>
  );
}
