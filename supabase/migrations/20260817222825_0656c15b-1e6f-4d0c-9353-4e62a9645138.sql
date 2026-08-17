ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_account_type_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_account_type_check CHECK (account_type = ANY (ARRAY['individual'::text,'clinic'::text,'whitelabel'::text]));

ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_account_type_check;
ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_account_type_check CHECK (account_type = ANY (ARRAY['individual'::text,'clinic'::text,'whitelabel'::text]));

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tenants_parent_tenant_id_idx ON public.tenants(parent_tenant_id);

CREATE OR REPLACE FUNCTION public.current_account_type()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.account_type FROM public.tenants t WHERE t.id = public.current_tenant_id();
$$;

-- Whitelabel: dono da conta-mãe pode ver e editar suas sub-contas
DROP POLICY IF EXISTS "Whitelabel owners can view child tenants" ON public.tenants;
CREATE POLICY "Whitelabel owners can view child tenants"
ON public.tenants FOR SELECT TO authenticated
USING (
  parent_tenant_id IS NOT NULL
  AND parent_tenant_id IN (
    SELECT tm.tenant_id FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid() AND tm.role IN ('owner','admin')
  )
);

CREATE OR REPLACE FUNCTION public.get_whitelabel_children()
RETURNS TABLE(id uuid, name text, slug text, plan text, account_type text, is_active boolean, created_at timestamptz, contacts_count integer, members_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.id, t.name, t.slug, t.plan, t.account_type, t.is_active, t.created_at,
    (SELECT COUNT(*)::int FROM public.contacts c WHERE c.tenant_id = t.id),
    (SELECT COUNT(*)::int FROM public.tenant_members m WHERE m.tenant_id = t.id)
  FROM public.tenants t
  WHERE t.parent_tenant_id = public.current_tenant_id()
  ORDER BY t.created_at DESC;
$$;