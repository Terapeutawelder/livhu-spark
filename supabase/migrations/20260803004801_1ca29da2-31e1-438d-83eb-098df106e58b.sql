-- ENUMS
CREATE TYPE public.notification_event AS ENUM (
  'contact_created',
  'appointment_created',
  'appointment_rescheduled',
  'appointment_canceled',
  'reminder_24h',
  'reminder_1h',
  'reminder_15m',
  'payment_received',
  'payment_pending'
);

CREATE TYPE public.notification_channel AS ENUM ('whatsapp', 'email');

CREATE TYPE public.notification_job_status AS ENUM ('pending', 'sending', 'sent', 'failed', 'canceled', 'skipped');

-- SETTINGS
CREATE TABLE public.notification_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  events jsonb NOT NULL DEFAULT '{}'::jsonb,
  reminder_offsets integer[] NOT NULL DEFAULT ARRAY[1440, 60, 15],
  quiet_start integer NOT NULL DEFAULT 21,
  quiet_end integer NOT NULL DEFAULT 8,
  sender_name text,
  reply_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage notification settings" ON public.notification_settings
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

CREATE TRIGGER notification_settings_updated_at BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TEMPLATES
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event public.notification_event NOT NULL,
  channel public.notification_channel NOT NULL,
  subject text,
  body text NOT NULL,
  wa_template_name text,
  wa_template_language text NOT NULL DEFAULT 'pt_BR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage notification templates" ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

CREATE TRIGGER notification_templates_updated_at BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- JOBS
CREATE TABLE public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event public.notification_event NOT NULL,
  channel public.notification_channel NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  to_phone text,
  to_email text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_at timestamptz NOT NULL DEFAULT now(),
  status public.notification_job_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_jobs_due_idx ON public.notification_jobs (status, send_at);
CREATE INDEX notification_jobs_tenant_idx ON public.notification_jobs (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_jobs TO authenticated;
GRANT ALL ON public.notification_jobs TO service_role;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read notification jobs" ON public.notification_jobs
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "members insert notification jobs" ON public.notification_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "members update notification jobs" ON public.notification_jobs
  FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

CREATE TRIGGER notification_jobs_updated_at BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HELPER: enqueue one event across enabled channels
CREATE OR REPLACE FUNCTION public.enqueue_notification(
  _tenant_id uuid,
  _event public.notification_event,
  _contact_id uuid,
  _appointment_id uuid,
  _send_at timestamptz,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text;
  v_email text;
  v_wa boolean := true;
  v_mail boolean := true;
  v_events jsonb := '{}'::jsonb;
BEGIN
  IF _contact_id IS NULL THEN RETURN; END IF;

  SELECT c.phone, c.email INTO v_phone, v_email FROM public.contacts c WHERE c.id = _contact_id;

  SELECT s.whatsapp_enabled, s.email_enabled, s.events
    INTO v_wa, v_mail, v_events
  FROM public.notification_settings s WHERE s.tenant_id = _tenant_id;

  v_wa := COALESCE(v_wa, true);
  v_mail := COALESCE(v_mail, true);
  v_events := COALESCE(v_events, '{}'::jsonb);

  IF COALESCE((v_events ->> _event::text)::boolean, true) = false THEN RETURN; END IF;

  IF v_wa AND v_phone IS NOT NULL AND length(v_phone) >= 8 THEN
    INSERT INTO public.notification_jobs (tenant_id, event, channel, contact_id, appointment_id, to_phone, send_at, payload, dedupe_key)
    VALUES (_tenant_id, _event, 'whatsapp', _contact_id, _appointment_id, v_phone, _send_at, _payload,
            _tenant_id::text || ':' || _event::text || ':whatsapp:' || COALESCE(_appointment_id::text, _contact_id::text) || ':' || extract(epoch from _send_at)::bigint::text)
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  IF v_mail AND v_email IS NOT NULL AND position('@' in v_email) > 1 THEN
    INSERT INTO public.notification_jobs (tenant_id, event, channel, contact_id, appointment_id, to_email, send_at, payload, dedupe_key)
    VALUES (_tenant_id, _event, 'email', _contact_id, _appointment_id, v_email, _send_at, _payload,
            _tenant_id::text || ':' || _event::text || ':email:' || COALESCE(_appointment_id::text, _contact_id::text) || ':' || extract(epoch from _send_at)::bigint::text)
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
END; $$;

-- APPOINTMENT AUTOMATION
CREATE OR REPLACE FUNCTION public.schedule_appointment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offsets integer[] := ARRAY[1440, 60, 15];
  v_offset integer;
  v_event public.notification_event;
  v_payload jsonb;
BEGIN
  SELECT s.reminder_offsets INTO v_offsets FROM public.notification_settings s WHERE s.tenant_id = NEW.tenant_id;
  v_offsets := COALESCE(v_offsets, ARRAY[1440, 60, 15]);

  v_payload := jsonb_build_object('title', NEW.title, 'starts_at', NEW.starts_at, 'modality', NEW.modality, 'meeting_url', NEW.meeting_url, 'location', NEW.location);

  IF TG_OP = 'UPDATE' THEN
    -- cancel outdated pending jobs whenever time or status changes
    IF NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.status IS DISTINCT FROM OLD.status THEN
      UPDATE public.notification_jobs SET status = 'canceled'
      WHERE appointment_id = NEW.id AND status = 'pending'
        AND event IN ('reminder_24h','reminder_1h','reminder_15m');
    END IF;
  END IF;

  IF NEW.status = 'canceled' THEN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'canceled' THEN
      PERFORM public.enqueue_notification(NEW.tenant_id, 'appointment_canceled', NEW.contact_id, NEW.id, now(), v_payload);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_notification(NEW.tenant_id, 'appointment_created', NEW.contact_id, NEW.id, now(), v_payload);
  ELSIF NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
    PERFORM public.enqueue_notification(NEW.tenant_id, 'appointment_rescheduled', NEW.contact_id, NEW.id, now(),
      v_payload || jsonb_build_object('previous_starts_at', OLD.starts_at));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  FOREACH v_offset IN ARRAY v_offsets LOOP
    v_event := CASE
      WHEN v_offset >= 1440 THEN 'reminder_24h'::public.notification_event
      WHEN v_offset >= 60 THEN 'reminder_1h'::public.notification_event
      ELSE 'reminder_15m'::public.notification_event
    END;
    IF NEW.starts_at - make_interval(mins => v_offset) > now() THEN
      PERFORM public.enqueue_notification(NEW.tenant_id, v_event, NEW.contact_id, NEW.id,
        NEW.starts_at - make_interval(mins => v_offset), v_payload);
    END IF;
  END LOOP;

  RETURN NEW;
END; $$;

CREATE TRIGGER appointments_notify
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.schedule_appointment_notifications();

-- WELCOME ON NEW CONTACT
CREATE OR REPLACE FUNCTION public.notify_contact_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.enqueue_notification(NEW.tenant_id, 'contact_created', NEW.id, NULL, now(),
    jsonb_build_object('full_name', NEW.full_name));
  RETURN NEW;
END; $$;

CREATE TRIGGER contacts_notify_created
AFTER INSERT ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.notify_contact_created();

-- KEEP EXISTING KANBAN/HISTORY TRIGGERS WORKING (they were defined but not attached previously)
CREATE TRIGGER contacts_log_stage_change
AFTER INSERT OR UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.log_contact_stage_change();

CREATE TRIGGER appointments_advance_stage_trg
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.appointments_advance_stage();

CREATE TRIGGER tenants_seed_kanban AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.seed_default_kanban();

CREATE TRIGGER tenants_seed_services AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.seed_default_services();