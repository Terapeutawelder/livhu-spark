CREATE TABLE public.zernio_profiles (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zernio_profiles TO authenticated;
GRANT ALL ON public.zernio_profiles TO service_role;
ALTER TABLE public.zernio_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zernio_profiles_member_all" ON public.zernio_profiles FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_zernio_profiles_updated BEFORE UPDATE ON public.zernio_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.zernio_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  platform text NOT NULL,
  username text,
  display_name text,
  profile_picture text,
  profile_url text,
  status text NOT NULL DEFAULT 'connected',
  needs_reconnection boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, account_id)
);
CREATE INDEX idx_zernio_accounts_tenant ON public.zernio_accounts(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zernio_accounts TO authenticated;
GRANT ALL ON public.zernio_accounts TO service_role;
ALTER TABLE public.zernio_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zernio_accounts_member_all" ON public.zernio_accounts FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_zernio_accounts_updated BEFORE UPDATE ON public.zernio_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();