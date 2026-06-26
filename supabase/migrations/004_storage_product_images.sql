-- Product images storage bucket and RLS policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'products'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users update own images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'products'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');
