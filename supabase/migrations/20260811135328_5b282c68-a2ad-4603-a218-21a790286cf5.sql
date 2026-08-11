ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual';
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual';

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_account_type_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_account_type_check CHECK (account_type IN ('individual','clinic'));
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_account_type_check;
ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_account_type_check CHECK (account_type IN ('individual','clinic'));

CREATE OR REPLACE FUNCTION public.sync_tenant_account_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_type text;
BEGIN
  IF NEW.plan IS NULL OR NEW.plan = 'trial' THEN
    RETURN NEW;
  END IF;
  SELECT p.account_type INTO v_type FROM public.subscription_plans p WHERE p.slug = NEW.plan;
  IF v_type IS NOT NULL THEN
    NEW.account_type := v_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tenant_account_type ON public.tenants;
CREATE TRIGGER trg_sync_tenant_account_type
BEFORE INSERT OR UPDATE OF plan ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_account_type();

DROP FUNCTION IF EXISTS public.get_tenant_usage();
CREATE FUNCTION public.get_tenant_usage()
 RETURNS TABLE(tenant_id uuid, plan text, trial_ends_at timestamp with time zone, contacts_limit integer, contacts_used integer, messages_limit integer, messages_used integer, is_readonly boolean, is_owner boolean, account_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    t.id,
    t.plan,
    t.trial_ends_at,
    t.contacts_limit,
    (SELECT COUNT(*)::int FROM public.contacts c WHERE c.tenant_id = t.id),
    t.messages_limit,
    t.messages_used_this_month,
    public.is_tenant_readonly(t.id),
    (t.owner_id = auth.uid()),
    t.account_type
  FROM public.tenants t
  WHERE t.id = public.current_tenant_id()
  LIMIT 1;
$$;