ALTER TABLE public.projects
  ADD COLUMN test_type text,
  ADD COLUMN regulatory_pathway text,
  ADD COLUMN sample_type text,
  ADD COLUMN priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN monthly_volume integer,
  ADD COLUMN location text,
  ADD COLUMN contact_name text,
  ADD COLUMN contact_email text,
  ADD COLUMN contact_phone text;
ALTER TABLE public.profiles
  ADD COLUMN avatar_url text,
  ADD COLUMN bio text,
  ADD COLUMN department text,
  ADD COLUMN location text;
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));