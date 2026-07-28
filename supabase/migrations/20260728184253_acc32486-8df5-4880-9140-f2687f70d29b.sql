-- 1) Tenant fields
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS custom_hostname_id text,
  ADD COLUMN IF NOT EXISTS custom_domain_verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subdomain_status text NOT NULL DEFAULT 'pending';

-- Backfill: existing tenants already using their slug are considered live
UPDATE public.tenants SET subdomain_status = 'live' WHERE subdomain_status = 'pending';

-- 2) Domain activation requests
CREATE TABLE IF NOT EXISTS public.domain_activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('subdomain','custom_domain')),
  value text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','active','rejected','failed')),
  notes text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS domain_activation_requests_tenant_idx ON public.domain_activation_requests(tenant_id);
CREATE INDEX IF NOT EXISTS domain_activation_requests_status_idx ON public.domain_activation_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.domain_activation_requests TO authenticated;
GRANT ALL ON public.domain_activation_requests TO service_role;

ALTER TABLE public.domain_activation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view their requests"
  ON public.domain_activation_requests FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "tenant owner can create requests"
  ON public.domain_activation_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
  );

CREATE POLICY "super admin updates requests"
  ON public.domain_activation_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_domain_req_updated_at
  BEFORE UPDATE ON public.domain_activation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Only super_admin can change custom domain columns directly on tenants
--    (owner still updates name/slug/branding via existing policies)
CREATE OR REPLACE FUNCTION public.protect_tenant_domain_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.custom_domain IS DISTINCT FROM OLD.custom_domain
      OR NEW.custom_domain_status IS DISTINCT FROM OLD.custom_domain_status
      OR NEW.custom_hostname_id IS DISTINCT FROM OLD.custom_hostname_id
      OR NEW.custom_domain_verification IS DISTINCT FROM OLD.custom_domain_verification
      OR NEW.subdomain_status IS DISTINCT FROM OLD.subdomain_status)
  THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Only super admins can change domain settings';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_tenant_domain ON public.tenants;
CREATE TRIGGER trg_protect_tenant_domain
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.protect_tenant_domain_columns();