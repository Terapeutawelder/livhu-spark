
-- AI Agents
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature numeric(3,2) NOT NULL DEFAULT 0.4,
  language text NOT NULL DEFAULT 'pt-BR',
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  handoff_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_agents_select ON public.ai_agents FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY ai_agents_insert ON public.ai_agents FOR INSERT TO authenticated
  WITH CHECK ((public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())));

CREATE POLICY ai_agents_update ON public.ai_agents FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid()));

CREATE POLICY ai_agents_delete ON public.ai_agents FOR DELETE TO authenticated
  USING ((public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())));

CREATE TRIGGER ai_agents_updated_at BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ai_agents_tenant_idx ON public.ai_agents(tenant_id);

-- Flows
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger text NOT NULL DEFAULT 'contact_created',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  runs_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flows TO authenticated;
GRANT ALL ON public.flows TO service_role;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY flows_select ON public.flows FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY flows_insert ON public.flows FOR INSERT TO authenticated
  WITH CHECK ((public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())));

CREATE POLICY flows_update ON public.flows FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid()));

CREATE POLICY flows_delete ON public.flows FOR DELETE TO authenticated
  USING ((public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (NOT public.is_tenant_readonly(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())));

CREATE TRIGGER flows_updated_at BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX flows_tenant_idx ON public.flows(tenant_id);
