CREATE POLICY "Business members can view branding files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'business-branding'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = b.id AND bm.user_id = auth.uid()
      ))
  )
);

CREATE POLICY "Business members can upload branding files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-branding'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = b.id AND bm.user_id = auth.uid()
      ))
  )
);

CREATE POLICY "Business members can replace branding files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-branding'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = b.id AND bm.user_id = auth.uid()
      ))
  )
)
WITH CHECK (
  bucket_id = 'business-branding'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = b.id AND bm.user_id = auth.uid()
      ))
  )
);

CREATE POLICY "Business members can remove branding files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-branding'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = b.id AND bm.user_id = auth.uid()
      ))
  )
);