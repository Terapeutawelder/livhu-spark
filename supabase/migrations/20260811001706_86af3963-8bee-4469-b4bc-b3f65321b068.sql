ALTER TABLE public.tenant_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_ai_credentials ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_channels TO authenticated;
GRANT ALL ON public.tenant_channels TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_ai_credentials TO authenticated;
GRANT ALL ON public.tenant_ai_credentials TO service_role;

DROP POLICY IF EXISTS "tenant_channels_admin_all" ON public.tenant_channels;
CREATE POLICY "tenant_channels_admin_all" ON public.tenant_channels
FOR ALL TO authenticated
USING (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'))
WITH CHECK (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'));

DROP POLICY IF EXISTS "tenant_ai_credentials_admin_all" ON public.tenant_ai_credentials;
CREATE POLICY "tenant_ai_credentials_admin_all" ON public.tenant_ai_credentials
FOR ALL TO authenticated
USING (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'))
WITH CHECK (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'));