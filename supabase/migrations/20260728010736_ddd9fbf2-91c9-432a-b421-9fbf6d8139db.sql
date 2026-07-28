
-- =====================================================
-- Fase 1: Fundação multi-tenant + CRM
-- =====================================================

-- Enum de papéis dentro de um tenant
CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'therapist', 'assistant');

-- Enum de eventos que disparam avanço automático no kanban
CREATE TYPE public.stage_trigger AS ENUM (
  'manual',
  'contact_created',
  'first_message_received',
  'appointment_scheduled',
  'appointment_completed',
  'payment_received',
  'no_reply_7d',
  'course_completed'
);

-- =====================================================
-- 1) TENANTS
-- =====================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text DEFAULT '#D4A017',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  plan text NOT NULL DEFAULT 'trial',
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2) TENANT MEMBERS
-- =====================================================
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL DEFAULT 'therapist',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3) HELPER FUNCTIONS (SECURITY DEFINER, sem recursão RLS)
-- =====================================================

-- Retorna true se o usuário pertence ao tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id AND user_id = _user_id
  );
$$;

-- Retorna o papel do usuário no tenant (ou null)
CREATE OR REPLACE FUNCTION public.tenant_role_of(_tenant_id uuid, _user_id uuid)
RETURNS public.tenant_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.tenant_members
  WHERE tenant_id = _tenant_id AND user_id = _user_id
  LIMIT 1;
$$;

-- Retorna o tenant "corrente" do usuário (primeiro que ele possui)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- =====================================================
-- 4) POLICIES em tenants / tenant_members
-- =====================================================

CREATE POLICY "tenants_select_members_or_admin"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    public.is_tenant_member(id, auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "tenants_update_owner_or_admin"
  ON public.tenants FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "tenant_members_select_own_tenants"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_tenant_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "tenant_members_manage_by_owner"
  ON public.tenant_members FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- =====================================================
-- 5) KANBAN STAGES
-- =====================================================
CREATE TABLE public.kanban_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  auto_advance_on public.stage_trigger[] NOT NULL DEFAULT ARRAY[]::public.stage_trigger[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, position)
);
CREATE INDEX idx_kanban_stages_tenant ON public.kanban_stages(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_stages TO authenticated;
GRANT ALL ON public.kanban_stages TO service_role;
ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_stages_tenant_rw"
  ON public.kanban_stages FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 6) CONTACTS
-- =====================================================
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.kanban_stages(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  source text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  value_cents int NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_stage ON public.contacts(stage_id);
CREATE INDEX idx_contacts_phone ON public.contacts(tenant_id, phone);
CREATE UNIQUE INDEX uq_contacts_tenant_phone ON public.contacts(tenant_id, phone) WHERE phone IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_tenant_rw"
  ON public.contacts FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 7) CONTACT NOTES
-- =====================================================
CREATE TABLE public.contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_contact ON public.contact_notes(contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_notes TO authenticated;
GRANT ALL ON public.contact_notes TO service_role;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_notes_tenant_rw"
  ON public.contact_notes FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 8) STAGE HISTORY (auditoria de movimentos no kanban)
-- =====================================================
CREATE TABLE public.contact_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES public.kanban_stages(id) ON DELETE SET NULL,
  to_stage_id uuid REFERENCES public.kanban_stages(id) ON DELETE SET NULL,
  trigger public.stage_trigger NOT NULL DEFAULT 'manual',
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_history_contact ON public.contact_stage_history(contact_id, created_at DESC);

GRANT SELECT, INSERT ON public.contact_stage_history TO authenticated;
GRANT ALL ON public.contact_stage_history TO service_role;
ALTER TABLE public.contact_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_tenant_read"
  ON public.contact_stage_history FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "history_tenant_insert"
  ON public.contact_stage_history FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 9) updated_at trigger util
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stages_updated BEFORE UPDATE ON public.kanban_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 10) Auditoria automática de mudança de estágio
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_contact_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.stage_id IS NOT NULL) THEN
    INSERT INTO public.contact_stage_history(tenant_id, contact_id, from_stage_id, to_stage_id, trigger, changed_by)
    VALUES (NEW.tenant_id, NEW.id, NULL, NEW.stage_id, 'contact_created', NEW.created_by);
  ELSIF (TG_OP = 'UPDATE' AND NEW.stage_id IS DISTINCT FROM OLD.stage_id) THEN
    INSERT INTO public.contact_stage_history(tenant_id, contact_id, from_stage_id, to_stage_id, trigger, changed_by)
    VALUES (NEW.tenant_id, NEW.id, OLD.stage_id, NEW.stage_id, 'manual', auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_contact_stage_history
  AFTER INSERT OR UPDATE OF stage_id ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_contact_stage_change();

-- =====================================================
-- 11) advance_contact_stage: função central de auto-move
--     Módulos futuros (agenda, mensagens, pagamentos) chamam esta função
--     passando o evento; ela move o contato para o próximo estágio
--     cuja regra auto_advance_on contenha esse evento — só avança para
--     frente, nunca para trás.
-- =====================================================
CREATE OR REPLACE FUNCTION public.advance_contact_stage(
  _contact_id uuid,
  _trigger public.stage_trigger,
  _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_current_pos int;
  v_current_stage uuid;
  v_target_stage uuid;
BEGIN
  SELECT c.tenant_id, c.stage_id, s.position
    INTO v_tenant, v_current_stage, v_current_pos
  FROM public.contacts c
  LEFT JOIN public.kanban_stages s ON s.id = c.stage_id
  WHERE c.id = _contact_id;

  IF v_tenant IS NULL THEN RETURN NULL; END IF;

  -- Procura o próximo estágio (posição > atual) que tenha esse trigger configurado
  SELECT id INTO v_target_stage
  FROM public.kanban_stages
  WHERE tenant_id = v_tenant
    AND position > COALESCE(v_current_pos, -1)
    AND _trigger = ANY(auto_advance_on)
  ORDER BY position ASC
  LIMIT 1;

  IF v_target_stage IS NULL OR v_target_stage = v_current_stage THEN
    RETURN v_current_stage;
  END IF;

  UPDATE public.contacts SET stage_id = v_target_stage WHERE id = _contact_id;

  INSERT INTO public.contact_stage_history(tenant_id, contact_id, from_stage_id, to_stage_id, trigger, reason)
  VALUES (v_tenant, _contact_id, v_current_stage, v_target_stage, _trigger, _reason);

  RETURN v_target_stage;
END; $$;

GRANT EXECUTE ON FUNCTION public.advance_contact_stage(uuid, public.stage_trigger, text) TO authenticated, service_role;

-- =====================================================
-- 12) Seed automático: ao criar tenant, gera as 5 colunas padrão
-- =====================================================
CREATE OR REPLACE FUNCTION public.seed_default_kanban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kanban_stages (tenant_id, name, position, color, auto_advance_on, is_won) VALUES
    (NEW.id, 'Lead',            1, '#f59e0b', ARRAY['contact_created']::public.stage_trigger[], false),
    (NEW.id, 'Triagem',         2, '#3b82f6', ARRAY['first_message_received']::public.stage_trigger[], false),
    (NEW.id, 'Agendado',        3, '#8b5cf6', ARRAY['appointment_scheduled']::public.stage_trigger[], false),
    (NEW.id, 'Em atendimento',  4, '#10b981', ARRAY['appointment_completed','payment_received']::public.stage_trigger[], false),
    (NEW.id, 'Alta',            5, '#64748b', ARRAY['course_completed']::public.stage_trigger[], true);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_seed_kanban
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_kanban();

-- =====================================================
-- 13) Atualiza handle_new_user para criar tenant + membership
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix int := 0;
BEGIN
  -- profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- role global
  IF lower(NEW.email) = 'livhub.pro@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'therapist') ON CONFLICT DO NOTHING;
  END IF;

  -- gera slug único a partir do email
  v_base_slug := regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  IF v_base_slug = '' THEN v_base_slug := 'consultorio'; END IF;
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  END LOOP;

  -- cria tenant próprio
  INSERT INTO public.tenants (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Consultório ' || split_part(NEW.email, '@', 1)),
    v_slug,
    NEW.id
  )
  RETURNING id INTO v_tenant_id;

  -- vincula como owner
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END; $$;

-- =====================================================
-- 14) Backfill: cria tenant para usuários já existentes
-- =====================================================
DO $$
DECLARE
  u record;
  v_tenant_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix int;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.tenant_members tm ON tm.user_id = au.id
    WHERE tm.id IS NULL
  LOOP
    v_base_slug := regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9]+', '-', 'g');
    IF v_base_slug = '' THEN v_base_slug := 'consultorio'; END IF;
    v_slug := v_base_slug;
    v_suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
      v_suffix := v_suffix + 1;
      v_slug := v_base_slug || '-' || v_suffix::text;
    END LOOP;

    INSERT INTO public.tenants (name, slug, owner_id)
    VALUES (
      COALESCE(u.raw_user_meta_data->>'full_name', 'Consultório ' || split_part(u.email, '@', 1)),
      v_slug,
      u.id
    )
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES (v_tenant_id, u.id, 'owner');
  END LOOP;
END $$;

-- Realtime para kanban e contatos
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_stages;
