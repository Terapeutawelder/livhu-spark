
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_tenant_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _tenant_id AND t.owner_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.my_managed_tenant_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tm.tenant_id FROM public.tenant_members tm
  WHERE tm.user_id = auth.uid() AND tm.role IN ('owner','admin');
$$;

DROP POLICY IF EXISTS "Whitelabel owners can view child tenants" ON public.tenants;
CREATE POLICY "Whitelabel owners can view child tenants"
ON public.tenants FOR SELECT TO authenticated
USING (parent_tenant_id IS NOT NULL AND parent_tenant_id IN (SELECT public.my_managed_tenant_ids()));

DROP POLICY IF EXISTS "tenant_members_manage_by_owner" ON public.tenant_members;
CREATE POLICY "tenant_members_insert_by_owner"
ON public.tenant_members FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_owner(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "tenant_members_update_by_owner"
ON public.tenant_members FOR UPDATE TO authenticated
USING (public.is_tenant_owner(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.is_tenant_owner(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "tenant_members_delete_by_owner"
ON public.tenant_members FOR DELETE TO authenticated
USING (public.is_tenant_owner(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
