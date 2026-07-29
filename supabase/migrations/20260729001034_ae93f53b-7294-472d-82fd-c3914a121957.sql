
DROP POLICY IF EXISTS "wa_media_read_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "wa_media_upload_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "wa_media_delete_authenticated" ON storage.objects;

CREATE POLICY "wa_media_read_own_tenant" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND public.is_tenant_member(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );

CREATE POLICY "wa_media_upload_own_tenant" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND public.is_tenant_member(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );

CREATE POLICY "wa_media_update_own_tenant" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND public.is_tenant_member(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );

CREATE POLICY "wa_media_delete_own_tenant" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND public.is_tenant_member(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );
