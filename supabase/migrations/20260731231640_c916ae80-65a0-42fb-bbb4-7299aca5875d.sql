CREATE TYPE public.channel_kind AS ENUM ('instagram','messenger','tiktok','site','email');
CREATE TYPE public.channel_conn_status AS ENUM ('disconnected','pending','active','error');

CREATE TABLE public.tenant_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel public.channel_kind NOT NULL,
  display_name text NOT NULL DEFAULT '',
  account_id text,
  credentials_enc text,
  credential_hint text NOT NULL DEFAULT '',
  status public.channel_conn_status NOT NULL DEFAULT 'disconnected',
  last_error text,
  last_checked_at timestamptz,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel)
);

GRANT ALL ON public.tenant_channels TO service_role;

ALTER TABLE public.tenant_channels ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_tenant_channels_updated_at
BEFORE UPDATE ON public.tenant_channels
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();