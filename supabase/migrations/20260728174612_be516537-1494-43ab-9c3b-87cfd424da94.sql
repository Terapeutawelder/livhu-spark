CREATE OR REPLACE FUNCTION public.get_tenant_branding_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, primary_color text, timezone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.slug, t.logo_url, t.primary_color, t.timezone
  FROM public.tenants t
  WHERE t.slug = lower(_slug) AND t.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_branding_by_slug(text) TO anon, authenticated;