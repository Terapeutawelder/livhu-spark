ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS additional_user_price_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_channel_price_cents INTEGER DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;