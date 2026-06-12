-- Add support for image/gif banner ads
ALTER TABLE ads ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Storage bucket for ad banner images (public read, admin write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-banners', 'ad-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ad_banners_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'ad-banners');

CREATE POLICY "ad_banners_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-banners');

CREATE POLICY "ad_banners_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ad-banners');

CREATE POLICY "ad_banners_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ad-banners');
