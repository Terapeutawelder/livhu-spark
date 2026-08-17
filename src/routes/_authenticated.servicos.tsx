import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Settings, 
  Trash2, 
  Shield, 
  Mail, 
  Building2,
  Calendar,
  Globe,
  Layout
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountType, useCurrentTenant, useMyTenantRole } from "@/hooks/use-tenant";
import { SoloServicesPanel } from "@/components/solo-services-panel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — LivHub" },
      { name: "description", content: "Gerencie seus serviços de terapia — ou a equipe, no plano Clínica." },
      { property: "og:title", content: "Serviços — LivHub" },
      { property: "og:description", content: "Gerencie seus serviços de terapia — ou a equipe, no plano Clínica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServicosPage,
});

/**
 * Nota: Esta é uma implementação inicial da funcionalidade de Equipes/Clínica.
 * Atualmente as tabelas 'tenant_members' e 'invitations' precisam ser criadas via migração.
 */

/** Contas individuais veem apenas seus serviços; clínicas (gestão) veem a equipe. */
function ServicosPage() {
  const { isClinic, isLoading } = useAccountType();
  const { isTenantAdmin, isLoading: roleLoading } = useMyTenantRole();
  if (isLoading || roleLoading) return null;
  if (!isClinic || !isTenantAdmin) return <SoloServicesPanel />;
  return <ClinicaPage />;
}

function ClinicaPage() {
  const { data: tenant } = useCurrentTenant();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "therapist">("therapist");

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["tenant-members", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_members" as any)
        .select(`
          id,
          user_id,
          role,
          status,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("tenant_id", tenant!.id);
      
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        name: m.profiles?.full_name || "Membro da Equipe",
        email: m.profiles?.email || ""
      }));
    }
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["tenant-invitations", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_invitations" as any)
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("status", "pending");
      
      if (error) throw error;
      return data || [];
    }
  });

  const handleInvite = async () => {
    if (!inviteEmail || !tenant) return;
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.from("tenant_invitations" as any).insert({
        tenant_id: tenant.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        token: crypto.randomUUID(),
        invited_by: user.user.id
      } as any);

      if (error) throw error;

      toast.success(`Convite enviado para ${inviteEmail}!`);
      qc.invalidateQueries({ queryKey: ["tenant-invitations"] });
      setInviteOpen(false);
      setInviteEmail("");
    } catch (error: any) {
      toast.error(`Erro ao enviar convite: ${error.message}`);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gold">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Gestão de Equipe</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Minha Clínica</h1>
          <p className="text-muted-foreground">
            Gerencie profissionais, permissões e personalizações individuais da sua equipe.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-gold hover:bg-gold/90 text-black font-semibold">
          <UserPlus className="mr-2 h-4 w-4" /> Convidar Profissional
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gold" />
              Membros da Equipe
            </CardTitle>
            <CardDescription>
              Lista de profissionais com acesso ao consultório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nome / Email</th>
                    <th className="px-4 py-3 text-left font-medium">Função</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingMembers ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando membros...</td></tr>
                  ) : (
                    <>
                      {members.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-semibold">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className="capitalize">
                              {m.role === 'owner' ? 'Proprietário' : m.role === 'admin' ? 'Administrador' : 'Psicoterapeuta'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              {m.status === 'active' ? 'Ativo' : m.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button variant="ghost" size="icon" disabled={m.role === 'owner'}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {invitations.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors opacity-70">
                          <td className="px-4 py-4">
                            <div className="font-semibold italic">Convite Pendente</div>
                            <div className="text-xs text-muted-foreground">{inv.email}</div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="secondary" className="capitalize">
                              {inv.role === 'admin' ? 'Administrador' : 'Psicoterapeuta'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className="animate-pulse">
                              Aguardando
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-gold/20 bg-gold/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Seu Plano: Clínica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Membros da equipe</span>
                  <span className="font-semibold">1 / 5</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gold w-1/5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Você gerencia e configura sua equipe aqui mesmo. Novos profissionais podem ser convidados pelo botão acima, e cada um terá seu próprio painel individual.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Personalização Individual</CardTitle>
              <CardDescription className="text-xs">
                Cada profissional possui seu próprio:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gold" />
                  <span>Agenda e horários próprios</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-gold" />
                  <span>Landing page exclusiva</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Layout className="h-4 w-4 text-gold" />
                  <span>Painel de gestão individual</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar novo profissional</DialogTitle>
            <DialogDescription>
              Envie um convite por e-mail para que um profissional se junte à sua equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do profissional</Label>
              <Input 
                id="email" 
                placeholder="exemplo@clinica.com" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="therapist">Psicoterapeuta (Painel próprio)</SelectItem>
                  <SelectItem value="admin">Administrador (Gestão total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} className="bg-gold hover:bg-gold/90 text-black">
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
