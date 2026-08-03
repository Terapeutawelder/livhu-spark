ALTER TABLE public.whatsapp_channels
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS alibaba_region text,
  ADD COLUMN IF NOT EXISTS alibaba_access_key_id text,
  ADD COLUMN IF NOT EXISTS alibaba_access_key_secret text,
  ADD COLUMN IF NOT EXISTS alibaba_cust_space_id text,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;