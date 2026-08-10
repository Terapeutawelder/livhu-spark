-- Tabela para armazenar as instâncias da EvolutionGo vinculadas aos usuários
CREATE TABLE public.whatsapp_evolution_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL UNIQUE,
    instance_id TEXT, -- ID retornado pela API se aplicável
    status TEXT NOT NULL DEFAULT 'disconnected', -- disconnected, connecting, connected, error
    apikey TEXT, -- API Key da instância se for gerada por instância
    connection_status JSONB, -- Armazena detalhes da conexão
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

-- Políticas: Usuários só veem suas próprias instâncias dentro do seu tenant
CREATE POLICY "Users can manage their own evolution instances"
ON public.whatsapp_evolution_instances
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Adicionar tipo de canal 'evolution_go' se necessário (embora o schema Zod controle no app)
-- Nota: A tabela tenant_channels é genérica, mas aqui usaremos uma tabela específica para o estado real da EvolutionGo
-- para não bagunçar o fluxo de outros canais Meta-first.

-- Webhook logs para depuração
CREATE TABLE public.whatsapp_evolution_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name TEXT,
    event TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON public.whatsapp_evolution_webhooks TO service_role;
