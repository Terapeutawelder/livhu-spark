CREATE TYPE public.wa_channel_status   AS ENUM ('pending','verifying','active','disabled','error');
CREATE TYPE public.wa_conversation_status AS ENUM ('open','pending','resolved','snoozed','archived');
CREATE TYPE public.wa_message_direction AS ENUM ('inbound','outbound');
CREATE TYPE public.wa_message_type      AS ENUM ('text','image','audio','video','document','template','interactive','location','contacts','system');
CREATE TYPE public.wa_message_status    AS ENUM ('queued','sent','delivered','read','failed');
CREATE TYPE public.wa_template_status   AS ENUM ('pending','approved','rejected','paused','disabled');
CREATE TYPE public.wa_broadcast_status  AS ENUM ('draft','scheduled','running','completed','canceled','failed');

CREATE TABLE public.whatsapp_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone_number text,
  phone_number_id text,
  waba_id text,
  business_id text,
  access_token text,
  app_secret text,
  webhook_verify_token text DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_coexistence boolean NOT NULL DEFAULT true,
  status public.wa_channel_status NOT NULL DEFAULT 'pending',
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(phone_number_id)
);
CREATE INDEX idx_wa_channels_tenant ON public.whatsapp_channels(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_channels TO authenticated;
GRANT ALL ON public.whatsapp_channels TO service_role;
ALTER TABLE public.whatsapp_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_channels_member_read" ON public.whatsapp_channels FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "wa_channels_admin_write" ON public.whatsapp_channels FOR ALL TO authenticated
  USING (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_wa_channels_updated BEFORE UPDATE ON public.whatsapp_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.whatsapp_channels(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  wa_contact_id text NOT NULL,
  display_name text NOT NULL,
  phone text NOT NULL,
  profile_pic_url text,
  status public.wa_conversation_status NOT NULL DEFAULT 'open',
  assigned_to uuid,
  tags text[] NOT NULL DEFAULT '{}',
  priority int NOT NULL DEFAULT 0,
  unread_count int NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_direction public.wa_message_direction,
  window_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, wa_contact_id)
);
CREATE INDEX idx_wa_conv_tenant_status ON public.whatsapp_conversations(tenant_id, status, last_message_at DESC);
CREATE INDEX idx_wa_conv_assigned ON public.whatsapp_conversations(assigned_to) WHERE assigned_to IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_conv_member_all" ON public.whatsapp_conversations FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_wa_conv_updated BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.whatsapp_channels(id) ON DELETE SET NULL,
  wa_message_id text UNIQUE,
  direction public.wa_message_direction NOT NULL,
  sender_user_id uuid,
  type public.wa_message_type NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  media_mime text,
  media_filename text,
  template_name text,
  template_language text,
  template_variables jsonb,
  interactive jsonb,
  reply_to_wa_id text,
  status public.wa_message_status NOT NULL DEFAULT 'sent',
  error text,
  raw jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_msg_conv ON public.whatsapp_messages(conversation_id, sent_at ASC);
CREATE INDEX idx_wa_msg_tenant ON public.whatsapp_messages(tenant_id, sent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_msg_member_all" ON public.whatsapp_messages FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.whatsapp_channels(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'pt_BR',
  category text NOT NULL DEFAULT 'MARKETING',
  status public.wa_template_status NOT NULL DEFAULT 'pending',
  body_text text NOT NULL DEFAULT '',
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables_count int NOT NULL DEFAULT 0,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, name, language)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_tpl_member_all" ON public.whatsapp_templates FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_wa_tpl_updated BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.whatsapp_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.whatsapp_channels(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  template_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.wa_broadcast_status NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  read_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_broadcasts TO authenticated;
GRANT ALL ON public.whatsapp_broadcasts TO service_role;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bc_member_all" ON public.whatsapp_broadcasts FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_wa_bc_updated BEFORE UPDATE ON public.whatsapp_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.whatsapp_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone text NOT NULL,
  wa_message_id text,
  status public.wa_message_status NOT NULL DEFAULT 'queued',
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_bcr_broadcast ON public.whatsapp_broadcast_recipients(broadcast_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_broadcast_recipients TO authenticated;
GRANT ALL ON public.whatsapp_broadcast_recipients TO service_role;
ALTER TABLE public.whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bcr_member_all" ON public.whatsapp_broadcast_recipients FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.whatsapp_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shortcut text NOT NULL,
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, shortcut)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_quick_replies TO authenticated;
GRANT ALL ON public.whatsapp_quick_replies TO service_role;
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_qr_member_all" ON public.whatsapp_quick_replies FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_wa_qr_updated BEFORE UPDATE ON public.whatsapp_quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
