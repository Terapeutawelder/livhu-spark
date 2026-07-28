-- 1) Novos campos de limites no tenant
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacts_limit integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS messages_limit integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS messages_used_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month';

-- Preenche trial_ends_at para tenants existentes (3 dias a partir de agora)
UPDATE public.tenants
SET trial_ends_at = now() + interval '3 days'
WHERE trial_ends_at IS NULL AND plan = 'trial';

-- 2) Atualiza handle_new_user para setar trial_ends_at de novos tenants
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix int := 0;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  IF lower(NEW.email) = 'livhub.pro@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'therapist') ON CONFLICT DO NOTHING;
  END IF;

  v_base_slug := regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  IF v_base_slug = '' THEN v_base_slug := 'consultorio'; END IF;
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.tenants (name, slug, owner_id, plan, trial_ends_at, contacts_limit, messages_limit)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Consultório ' || split_part(NEW.email, '@', 1)),
    v_slug,
    NEW.id,
    'trial',
    now() + interval '3 days',
    50,
    100
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END; $function$;

-- 3) Função que diz se o tenant está em modo somente-leitura
CREATE OR REPLACE FUNCTION public.is_tenant_readonly(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant_id
      AND t.plan = 'trial'
      AND (
        (t.trial_ends_at IS NOT NULL AND t.trial_ends_at < now())
        OR (SELECT COUNT(*) FROM public.contacts c WHERE c.tenant_id = t.id) >= t.contacts_limit
        OR t.messages_used_this_month >= t.messages_limit
      )
  );
$$;

-- 4) Ajusta policies: bloqueia INSERT/UPDATE/DELETE quando readonly (owner e super_admin escapam)
DROP POLICY IF EXISTS contacts_tenant_rw ON public.contacts;
CREATE POLICY contacts_tenant_select ON public.contacts
  FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY contacts_tenant_write ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'))
    AND (
      NOT is_tenant_readonly(tenant_id)
      OR has_role(auth.uid(), 'super_admin')
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
    )
  );
CREATE POLICY contacts_tenant_update ON public.contacts
  FOR UPDATE TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (
    NOT is_tenant_readonly(tenant_id)
    OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
  );
CREATE POLICY contacts_tenant_delete ON public.contacts
  FOR DELETE TO authenticated
  USING (
    (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'))
    AND (
      NOT is_tenant_readonly(tenant_id)
      OR has_role(auth.uid(), 'super_admin')
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS appointments_tenant_rw ON public.appointments;
CREATE POLICY appointments_tenant_select ON public.appointments
  FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY appointments_tenant_write ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'))
    AND (
      NOT is_tenant_readonly(tenant_id)
      OR has_role(auth.uid(), 'super_admin')
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
    )
  );
CREATE POLICY appointments_tenant_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (
    NOT is_tenant_readonly(tenant_id)
    OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
  );
CREATE POLICY appointments_tenant_delete ON public.appointments
  FOR DELETE TO authenticated
  USING (
    (is_tenant_member(tenant_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'))
    AND (
      NOT is_tenant_readonly(tenant_id)
      OR has_role(auth.uid(), 'super_admin')
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_id = auth.uid())
    )
  );

-- 5) RPC para o frontend consultar uso/limites do tenant atual
CREATE OR REPLACE FUNCTION public.get_tenant_usage()
RETURNS TABLE (
  tenant_id uuid,
  plan text,
  trial_ends_at timestamptz,
  contacts_limit integer,
  contacts_used integer,
  messages_limit integer,
  messages_used integer,
  is_readonly boolean,
  is_owner boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    t.id,
    t.plan,
    t.trial_ends_at,
    t.contacts_limit,
    (SELECT COUNT(*)::int FROM public.contacts c WHERE c.tenant_id = t.id),
    t.messages_limit,
    t.messages_used_this_month,
    public.is_tenant_readonly(t.id),
    (t.owner_id = auth.uid())
  FROM public.tenants t
  WHERE t.id = public.current_tenant_id()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_readonly(uuid) TO authenticated;