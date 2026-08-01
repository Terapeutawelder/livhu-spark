-- Memória expansível da Super IA
CREATE TABLE public.ai_memory_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'note',
  content text NOT NULL DEFAULT '',
  size_bytes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_memory_sources TO authenticated;
GRANT ALL ON public.ai_memory_sources TO service_role;
ALTER TABLE public.ai_memory_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_memory_sources_select ON public.ai_memory_sources FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY ai_memory_sources_insert ON public.ai_memory_sources FOR INSERT TO authenticated
  WITH CHECK ((public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())));

CREATE POLICY ai_memory_sources_update ON public.ai_memory_sources FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid()));

CREATE POLICY ai_memory_sources_delete ON public.ai_memory_sources FOR DELETE TO authenticated
  USING ((public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())));

CREATE TRIGGER ai_memory_sources_updated_at BEFORE UPDATE ON public.ai_memory_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ai_memory_sources_tenant_idx ON public.ai_memory_sources(tenant_id);

-- Orquestrador Master: acesso controlado aos módulos
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS is_orchestrator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS module_access jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Credenciais de IA: suporte a Anthropic e endpoints compatíveis
ALTER TABLE public.tenant_ai_credentials
  ADD COLUMN IF NOT EXISTS base_url text;