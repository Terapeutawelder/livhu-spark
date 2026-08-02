CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  template text NOT NULL DEFAULT 'serena',
  is_published boolean NOT NULL DEFAULT false,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published profiles are viewable by everyone"
ON public.public_profiles FOR SELECT TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Members manage their tenant profile"
ON public.public_profiles FOR ALL TO authenticated
USING (public.is_tenant_member(tenant_id, auth.uid()))
WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

CREATE TRIGGER update_public_profiles_updated_at
BEFORE UPDATE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.services TO anon;
CREATE POLICY "Active services of published profiles are public"
ON public.services FOR SELECT TO anon, authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.public_profiles p
    WHERE p.tenant_id = services.tenant_id AND p.is_published = true
  )
);

CREATE POLICY "Public profile images are readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'perfil-publico');

CREATE POLICY "Authenticated users manage their profile images"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'perfil-publico')
WITH CHECK (bucket_id = 'perfil-publico');