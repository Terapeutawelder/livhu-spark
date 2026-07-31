CREATE TABLE public.flow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  trigger text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  is_test boolean NOT NULL DEFAULT false,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flow_runs TO authenticated;
GRANT ALL ON public.flow_runs TO service_role;
ALTER TABLE public.flow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own tenant flow runs" ON public.flow_runs
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));

CREATE TABLE public.flow_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.flow_runs(id) ON DELETE CASCADE,
  position integer NOT NULL,
  kind text NOT NULL,
  label text NOT NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ok',
  output text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flow_run_steps TO authenticated;
GRANT ALL ON public.flow_run_steps TO service_role;
ALTER TABLE public.flow_run_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own tenant flow run steps" ON public.flow_run_steps
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));

CREATE INDEX idx_flow_runs_flow ON public.flow_runs(flow_id, started_at DESC);
CREATE INDEX idx_flow_run_steps_run ON public.flow_run_steps(run_id, position);

ALTER TABLE public.flows
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS success_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_count integer NOT NULL DEFAULT 0;

CREATE TRIGGER set_flow_runs_updated_at BEFORE UPDATE ON public.flow_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();