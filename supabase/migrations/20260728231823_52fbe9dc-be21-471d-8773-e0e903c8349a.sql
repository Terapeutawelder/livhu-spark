-- =========================================
-- SUBSCRIPTION PLANS
-- =========================================
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  billing_period text NOT NULL DEFAULT 'monthly',
  contacts_limit integer NOT NULL DEFAULT 50,
  messages_limit integer NOT NULL DEFAULT 100,
  users_limit integer NOT NULL DEFAULT 1,
  ai_agents_limit integer NOT NULL DEFAULT 1,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_highlighted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_read_all" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "plans_admin_write" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- INVOICES
-- =========================================
CREATE TYPE public.invoice_status AS ENUM ('paid','open','overdue','void','refunded');

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  external_id text,
  provider text NOT NULL DEFAULT 'manual',
  plan_name text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  status public.invoice_status NOT NULL DEFAULT 'open',
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  paid_at timestamptz,
  hosted_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id, issued_at DESC);
CREATE INDEX idx_invoices_status ON public.invoices(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_member_read" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "invoices_admin_write" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- SUPPORT TICKETS
-- =========================================
CREATE TYPE public.ticket_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.ticket_status AS ENUM ('open','analyzing','waiting_customer','resolved','closed');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE DEFAULT ('TCK-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*9000)+1000)::text,4,'0')),
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  status public.ticket_status NOT NULL DEFAULT 'open',
  created_by uuid,
  assigned_to uuid,
  last_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_status ON public.support_tickets(status, updated_at DESC);
CREATE INDEX idx_tickets_tenant ON public.support_tickets(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_member_read" ON public.support_tickets FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()))
    OR created_by = auth.uid()
  );
CREATE POLICY "tickets_member_insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()))
  );
CREATE POLICY "tickets_admin_update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tickets_admin_delete" ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- FEATURE FLAGS
-- =========================================
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  is_on boolean NOT NULL DEFAULT false,
  rollout_pct integer NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_read_all" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "flags_admin_write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_flags_updated BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- PLATFORM SETTINGS (single row)
-- =========================================
CREATE TABLE public.platform_settings (
  id text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
  brand_name text NOT NULL DEFAULT 'LivHub',
  support_email text NOT NULL DEFAULT 'contato@livhub.cloud',
  noreply_email text NOT NULL DEFAULT 'noreply@livhub.cloud',
  default_timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  primary_color text NOT NULL DEFAULT '#D4A017',
  logo_url text,
  favicon_url text,
  trial_days integer NOT NULL DEFAULT 3,
  allow_signups boolean NOT NULL DEFAULT true,
  require_email_verification boolean NOT NULL DEFAULT true,
  maintenance_mode boolean NOT NULL DEFAULT false,
  notify_new_tenant boolean NOT NULL DEFAULT true,
  notify_failed_payment boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_write" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed platform settings row
INSERT INTO public.platform_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

-- Seed default plans
INSERT INTO public.subscription_plans
  (slug, name, description, price_cents, contacts_limit, messages_limit, users_limit, ai_agents_limit, features, is_highlighted, sort_order)
VALUES
  ('trial','Teste grátis','3 dias gratuitos para experimentar', 0, 50, 100, 1, 1,
    '["50 contatos","100 mensagens","1 usuário","3 dias de acesso"]'::jsonb, false, 0),
  ('solo','Solo','Para psicoterapeutas autônomos', 8900, 500, 2000, 1, 1,
    '["1 usuário","1 número WhatsApp","500 conversas/mês","1 agente IA","Kanban básico"]'::jsonb, false, 1),
  ('pro','Pro','Para consultórios em crescimento', 34900, 5000, 20000, 10, 5,
    '["Até 10 usuários","3 números WhatsApp","5.000 conversas/mês","5 agentes IA","Fluxos avançados","Cursos ilimitados"]'::jsonb, true, 2),
  ('enterprise','Enterprise','Para clínicas e institutos', 129000, 100000, 500000, 999, 999,
    '["Usuários ilimitados","Números ilimitados","Conversas ilimitadas","Agentes IA ilimitados","White-label completo","SLA dedicado","API completa"]'::jsonb, false, 3)
ON CONFLICT (slug) DO NOTHING;

-- Seed default feature flags
INSERT INTO public.feature_flags (key, description, is_on, rollout_pct) VALUES
  ('new-inbox-ui','Novo layout da caixa de entrada', true, 40),
  ('ai-voice-messages','Transcrição e resposta em áudio', false, 0),
  ('mercadopago-pix','Pix via Mercado Pago', true, 100),
  ('kanban-automations','Automações no Kanban', true, 60),
  ('google-calendar-sync','Sincronização com Google Agenda', false, 0)
ON CONFLICT (key) DO NOTHING;
