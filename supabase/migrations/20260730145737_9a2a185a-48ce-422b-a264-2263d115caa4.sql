CREATE TABLE public.tenant_ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai','google')),
  api_key_enc text NOT NULL,
  key_hint text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.tenant_ai_credentials TO service_role;
ALTER TABLE public.tenant_ai_credentials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tenant_ai_credentials_updated_at BEFORE UPDATE ON public.tenant_ai_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();