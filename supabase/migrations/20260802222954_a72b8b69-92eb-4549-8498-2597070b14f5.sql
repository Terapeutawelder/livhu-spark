DROP POLICY IF EXISTS "Authenticated users manage their profile images" ON storage.objects;

CREATE POLICY "Tenant members read own profile files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'perfil-publico'
  AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Tenant members insert own profile files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'perfil-publico'
  AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Tenant members update own profile files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'perfil-publico'
  AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'perfil-publico'
  AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Tenant members delete own profile files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'perfil-publico'
  AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
);