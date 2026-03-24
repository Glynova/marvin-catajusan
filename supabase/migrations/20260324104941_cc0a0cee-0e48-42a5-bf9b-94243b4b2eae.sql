CREATE TABLE public.social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE,
  api_key text DEFAULT '',
  api_secret text DEFAULT '',
  access_token text DEFAULT '',
  webhook_url text DEFAULT '',
  page_id text DEFAULT '',
  connected boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social connections"
ON public.social_connections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.social_connections (platform) VALUES
  ('facebook'), ('instagram'), ('tiktok'), ('linkedin'), ('whatsapp');