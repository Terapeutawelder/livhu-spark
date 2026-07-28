CREATE POLICY "wa_media_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-media');
CREATE POLICY "wa_media_upload_authenticated" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-media');
CREATE POLICY "wa_media_delete_authenticated" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-media');
