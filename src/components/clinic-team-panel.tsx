import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Member = { user_id: string; role: string; name: string };

/** Painel exclusivo do plano Clínica: equipe de profissionais do consultório. */
export function ClinicTeamPanel({ usersLimit }: { usersLimit?: number }) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["clinic-team"],
    queryFn: async (): Promise<Member[]> => {
      const { data: rows } = await supabase.from("tenant_members").select("user_id, role");
      const ids = (rows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return (rows ?? []).map((r) => {
        const p = profiles?.find((x) => x.id === r.user_id);
        return { user_id: r.user_id, role: r.role, name: p?.full_name ?? p?.email ?? "Profissional" };
      });
    },
    staleTime: 60 * 1000,
  });

  return (
    <section>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Equipe da clínica
      </p>
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-gold" />
            {members.length}
            {usersLimit ? `/${usersLimit}` : ""} profissionais
          </span>
          <Link to="/servicos" className="text-xs font-semibold text-gold hover:underline">
            Gerenciar
          </Link>
        </div>
        <ul className="space-y-2">
          {isLoading && <li className="text-xs text-muted-foreground">Carregando equipe…</li>}
          {!isLoading && members.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhum profissional cadastrado ainda.</li>
          )}
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-[11px] font-bold text-gold">
                {m.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
              <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{m.role}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/servicos"
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground transition hover:border-gold/60 hover:text-gold"
        >
          <UserPlus className="h-3.5 w-3.5" /> Convidar profissional
        </Link>
      </div>
    </section>
  );
}
