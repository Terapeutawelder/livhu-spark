CREATE OR REPLACE FUNCTION public.current_account_type()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.account_type FROM public.tenants t
  WHERE t.id = public.current_tenant_id()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_account_type() TO authenticated;