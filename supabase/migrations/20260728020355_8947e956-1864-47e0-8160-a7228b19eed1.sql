ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'appointment'
    CHECK (kind IN ('appointment','block'));

CREATE INDEX IF NOT EXISTS appointments_tenant_kind_idx
  ON public.appointments (tenant_id, kind, starts_at);