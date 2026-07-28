-- Enums
CREATE TYPE public.service_modality AS ENUM ('online', 'presencial', 'ambos');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'canceled', 'no_show');

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 50,
  price_cents integer NOT NULL DEFAULT 0,
  modality public.service_modality NOT NULL DEFAULT 'online',
  color text NOT NULL DEFAULT '#10b981',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY services_tenant_rw ON public.services
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_services_tenant ON public.services(tenant_id) WHERE is_active = true;

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  modality public.service_modality NOT NULL DEFAULT 'online',
  meeting_url text,
  location text,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointments_tenant_rw ON public.appointments
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_appointments_tenant_start ON public.appointments(tenant_id, starts_at);
CREATE INDEX idx_appointments_contact ON public.appointments(contact_id);

-- Auto-advance kanban on appointment lifecycle
CREATE OR REPLACE FUNCTION public.appointments_advance_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.contact_id IS NOT NULL) THEN
    PERFORM public.advance_contact_stage(NEW.contact_id, 'appointment_scheduled'::public.stage_trigger, 'Sessão agendada: ' || NEW.title);
  ELSIF (TG_OP = 'UPDATE'
         AND NEW.contact_id IS NOT NULL
         AND NEW.status = 'completed'
         AND OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.advance_contact_stage(NEW.contact_id, 'appointment_completed'::public.stage_trigger, 'Sessão realizada: ' || NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_advance_stage
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.appointments_advance_stage();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;

-- Seed default services for existing tenants
INSERT INTO public.services (tenant_id, name, description, duration_minutes, price_cents, modality, color)
SELECT id, 'Sessão individual online', 'Psicoterapia individual por vídeo chamada', 50, 20000, 'online'::public.service_modality, '#10b981' FROM public.tenants
UNION ALL
SELECT id, 'Sessão individual presencial', 'Psicoterapia individual no consultório', 50, 25000, 'presencial'::public.service_modality, '#8b5cf6' FROM public.tenants
UNION ALL
SELECT id, 'Sessão de triagem', 'Primeira conversa de acolhimento (gratuita)', 30, 0, 'online'::public.service_modality, '#f59e0b' FROM public.tenants;

-- Seed defaults for future tenants
CREATE OR REPLACE FUNCTION public.seed_default_services()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.services (tenant_id, name, description, duration_minutes, price_cents, modality, color) VALUES
    (NEW.id, 'Sessão individual online', 'Psicoterapia individual por vídeo chamada', 50, 20000, 'online'::public.service_modality, '#10b981'),
    (NEW.id, 'Sessão individual presencial', 'Psicoterapia individual no consultório', 50, 25000, 'presencial'::public.service_modality, '#8b5cf6'),
    (NEW.id, 'Sessão de triagem', 'Primeira conversa de acolhimento (gratuita)', 30, 0, 'online'::public.service_modality, '#f59e0b');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_default_services
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.seed_default_services();