-- Tabela para armazenar as instâncias da EvolutionGo vinculadas aos usuários
CREATE TABLE public.whatsapp_evolution_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL UNIQUE,
    instance_id TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected',
    apikey TEXT,
    connection_status JSONB,
    qrcode TEXT,
    last_error TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_evolution_instances ENABLE ROW LEVEL SECURITY;

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_evolution_instances TO authenticated;
GRANT ALL ON public.whatsapp_evolution_instances TO service_role;

-- Políticas
CREATE POLICY "Users can manage their own evolution instances"
ON public.whatsapp_evolution_instances
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Tabela para log de webhooks
CREATE TABLE public.whatsapp_evolution_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name TEXT,
    event TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON public.whatsapp_evolution_webhooks TO service_role;
