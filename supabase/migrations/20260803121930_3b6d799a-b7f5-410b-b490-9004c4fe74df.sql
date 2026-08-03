
CREATE TABLE public.message_credit_wallets (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  billing_mode text NOT NULL DEFAULT 'own',
  low_balance_threshold integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_credit_wallets_mode_chk CHECK (billing_mode IN ('own','managed'))
);
GRANT SELECT ON public.message_credit_wallets TO authenticated;
GRANT ALL ON public.message_credit_wallets TO service_role;
ALTER TABLE public.message_credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_select_members" ON public.message_credit_wallets FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "wallet_admin_all" ON public.message_credit_wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.message_credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.message_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  reference_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_ledger_tenant ON public.message_credit_ledger(tenant_id, created_at DESC);
GRANT SELECT ON public.message_credit_ledger TO authenticated;
GRANT ALL ON public.message_credit_ledger TO service_role;
ALTER TABLE public.message_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_select_members" ON public.message_credit_ledger FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.message_credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.message_credit_packages TO authenticated;
GRANT ALL ON public.message_credit_packages TO service_role;
ALTER TABLE public.message_credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_select_auth" ON public.message_credit_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "packages_admin_all" ON public.message_credit_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.message_credit_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.message_credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.message_credit_packages(id) ON DELETE SET NULL,
  credits integer NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  requested_by uuid,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_orders_status_chk CHECK (status IN ('pending','paid','canceled'))
);
CREATE INDEX idx_credit_orders_tenant ON public.message_credit_orders(tenant_id, created_at DESC);
GRANT SELECT, INSERT ON public.message_credit_orders TO authenticated;
GRANT ALL ON public.message_credit_orders TO service_role;
ALTER TABLE public.message_credit_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_members" ON public.message_credit_orders FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "orders_insert_members" ON public.message_credit_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) AND requested_by = auth.uid());
CREATE POLICY "orders_admin_all" ON public.message_credit_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_credit_orders_updated BEFORE UPDATE ON public.message_credit_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.consume_message_credit(_tenant_id uuid, _reference text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mode text; v_balance integer;
BEGIN
  SELECT billing_mode, balance INTO v_mode, v_balance
  FROM public.message_credit_wallets WHERE tenant_id = _tenant_id FOR UPDATE;

  IF NOT FOUND THEN RETURN true; END IF;
  IF v_mode <> 'managed' THEN RETURN true; END IF;
  IF v_balance <= 0 THEN RETURN false; END IF;

  UPDATE public.message_credit_wallets SET balance = balance - 1 WHERE tenant_id = _tenant_id
    RETURNING balance INTO v_balance;
  INSERT INTO public.message_credit_ledger(tenant_id, delta, balance_after, reason, reference_id)
  VALUES (_tenant_id, -1, v_balance, 'Mensagem enviada', _reference);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.grant_message_credits(_tenant_id uuid, _amount integer, _reason text DEFAULT 'Créditos adicionados')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Apenas o super admin pode alterar créditos';
  END IF;

  INSERT INTO public.message_credit_wallets(tenant_id, balance)
  VALUES (_tenant_id, GREATEST(_amount, 0))
  ON CONFLICT (tenant_id) DO UPDATE SET balance = GREATEST(public.message_credit_wallets.balance + _amount, 0)
  RETURNING balance INTO v_balance;

  INSERT INTO public.message_credit_ledger(tenant_id, delta, balance_after, reason, created_by)
  VALUES (_tenant_id, _amount, v_balance, _reason, auth.uid());
  RETURN v_balance;
END; $$;

INSERT INTO public.message_credit_packages (name, credits, price_cents, sort_order) VALUES
  ('Pacote Inicial', 500, 4900, 1),
  ('Pacote Consultório', 2000, 16900, 2),
  ('Pacote Alto Volume', 10000, 74900, 3);
