export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          created_at: string
          created_by: string | null
          handoff_rules: Json
          id: string
          is_active: boolean
          is_orchestrator: boolean
          language: string
          model: string
          module_access: Json
          name: string
          role: string
          system_prompt: string
          temperature: number
          tenant_id: string
          tools: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          handoff_rules?: Json
          id?: string
          is_active?: boolean
          is_orchestrator?: boolean
          language?: string
          model?: string
          module_access?: Json
          name: string
          role?: string
          system_prompt?: string
          temperature?: number
          tenant_id: string
          tools?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          handoff_rules?: Json
          id?: string
          is_active?: boolean
          is_orchestrator?: boolean
          language?: string
          model?: string
          module_access?: Json
          name?: string
          role?: string
          system_prompt?: string
          temperature?: number
          tenant_id?: string
          tools?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory_sources: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          size_bytes: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          size_bytes?: number
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          size_bytes?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          kind: string
          location: string | null
          meeting_url: string | null
          modality: Database["public"]["Enums"]["service_modality"]
          notes: string | null
          service_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          kind?: string
          location?: string | null
          meeting_url?: string | null
          modality?: Database["public"]["Enums"]["service_modality"]
          notes?: string | null
          service_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: string
          location?: string | null
          meeting_url?: string | null
          modality?: Database["public"]["Enums"]["service_modality"]
          notes?: string | null
          service_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          author_id: string | null
          body: string
          contact_id: string
          created_at: string
          id: string
          tenant_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          contact_id: string
          created_at?: string
          id?: string
          tenant_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          contact_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_stage_history: {
        Row: {
          changed_by: string | null
          contact_id: string
          created_at: string
          from_stage_id: string | null
          id: string
          reason: string | null
          tenant_id: string
          to_stage_id: string | null
          trigger: Database["public"]["Enums"]["stage_trigger"]
        }
        Insert: {
          changed_by?: string | null
          contact_id: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          reason?: string | null
          tenant_id: string
          to_stage_id?: string | null
          trigger?: Database["public"]["Enums"]["stage_trigger"]
        }
        Update: {
          changed_by?: string | null
          contact_id?: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          reason?: string | null
          tenant_id?: string
          to_stage_id?: string | null
          trigger?: Database["public"]["Enums"]["stage_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "contact_stage_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "kanban_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "kanban_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          last_interaction_at: string | null
          metadata: Json
          phone: string | null
          source: string | null
          stage_id: string | null
          tags: string[]
          tenant_id: string
          updated_at: string
          value_cents: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          last_interaction_at?: string | null
          metadata?: Json
          phone?: string | null
          source?: string | null
          stage_id?: string | null
          tags?: string[]
          tenant_id: string
          updated_at?: string
          value_cents?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_interaction_at?: string | null
          metadata?: Json
          phone?: string | null
          source?: string | null
          stage_id?: string | null
          tags?: string[]
          tenant_id?: string
          updated_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "contacts_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "kanban_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_activation_requests: {
        Row: {
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          kind: string
          notes: string | null
          requested_by: string
          status: string
          tenant_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind: string
          notes?: string | null
          requested_by: string
          status?: string
          tenant_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind?: string
          notes?: string | null
          requested_by?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_activation_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string
          id: string
          is_on: boolean
          key: string
          rollout_pct: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_on?: boolean
          key: string
          rollout_pct?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_on?: boolean
          key?: string
          rollout_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      flow_run_steps: {
        Row: {
          content: string
          created_at: string
          error: string | null
          id: string
          kind: string
          label: string
          output: string | null
          position: number
          run_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          label: string
          output?: string | null
          position: number
          run_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          content?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          label?: string
          output?: string | null
          position?: number
          run_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "flow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_run_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_runs: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          error: string | null
          finished_at: string | null
          flow_id: string
          id: string
          is_test: boolean
          started_at: string
          status: string
          tenant_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          flow_id: string
          id?: string
          is_test?: boolean
          started_at?: string
          status?: string
          tenant_id: string
          trigger: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          flow_id?: string
          id?: string
          is_test?: boolean
          started_at?: string
          status?: string
          tenant_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          error_count: number
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          runs_count: number
          steps: Json
          success_count: number
          tenant_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_count?: number
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          runs_count?: number
          steps?: Json
          success_count?: number
          tenant_id: string
          trigger?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_count?: number
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          runs_count?: number
          steps?: Json
          success_count?: number
          tenant_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          due_at: string | null
          external_id: string | null
          hosted_url: string | null
          id: string
          issued_at: string
          paid_at: string | null
          plan_id: string | null
          plan_name: string
          provider: string
          status: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          due_at?: string | null
          external_id?: string | null
          hosted_url?: string | null
          id?: string
          issued_at?: string
          paid_at?: string | null
          plan_id?: string | null
          plan_name: string
          provider?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          external_id?: string | null
          hosted_url?: string | null
          id?: string
          issued_at?: string
          paid_at?: string | null
          plan_id?: string | null
          plan_name?: string
          provider?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_stages: {
        Row: {
          auto_advance_on: Database["public"]["Enums"]["stage_trigger"][]
          color: string
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          position: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_advance_on?: Database["public"]["Enums"]["stage_trigger"][]
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          position: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_advance_on?: Database["public"]["Enums"]["stage_trigger"][]
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string | null
          delta: number
          id: string
          reason: string
          reference_id: string | null
          tenant_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          reason: string
          reference_id?: string | null
          tenant_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          reason?: string
          reference_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_credit_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_credit_orders: {
        Row: {
          amount_cents: number
          created_at: string
          credits: number
          handled_at: string | null
          handled_by: string | null
          id: string
          note: string | null
          package_id: string | null
          requested_by: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          credits: number
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          package_id?: string | null
          requested_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          credits?: number
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          package_id?: string | null
          requested_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_credit_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "message_credit_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_credit_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_credit_packages: {
        Row: {
          created_at: string
          credits: number
          currency: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      message_credit_wallets: {
        Row: {
          balance: number
          billing_mode: string
          created_at: string
          low_balance_threshold: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          billing_mode?: string
          created_at?: string
          low_balance_threshold?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          billing_mode?: string
          created_at?: string
          low_balance_threshold?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_credit_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          appointment_id: string | null
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          contact_id: string | null
          created_at: string
          dedupe_key: string | null
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          last_error: string | null
          payload: Json
          send_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_job_status"]
          tenant_id: string
          to_email: string | null
          to_phone: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          attempts?: number
          channel: Database["public"]["Enums"]["notification_channel"]
          contact_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          last_error?: string | null
          payload?: Json
          send_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_job_status"]
          tenant_id: string
          to_email?: string | null
          to_phone?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          contact_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          last_error?: string | null
          payload?: Json
          send_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_job_status"]
          tenant_id?: string
          to_email?: string | null
          to_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email_enabled: boolean
          events: Json
          quiet_end: number
          quiet_start: number
          reminder_offsets: number[]
          reply_to: string | null
          sender_name: string | null
          tenant_id: string
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          events?: Json
          quiet_end?: number
          quiet_start?: number
          reminder_offsets?: number[]
          reply_to?: string | null
          sender_name?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          events?: Json
          quiet_end?: number
          quiet_start?: number
          reminder_offsets?: number[]
          reply_to?: string | null
          sender_name?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          is_active: boolean
          subject: string | null
          tenant_id: string
          updated_at: string
          wa_template_language: string
          wa_template_name: string | null
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          is_active?: boolean
          subject?: string | null
          tenant_id: string
          updated_at?: string
          wa_template_language?: string
          wa_template_name?: string | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          is_active?: boolean
          subject?: string | null
          tenant_id?: string
          updated_at?: string
          wa_template_language?: string
          wa_template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount_cents: number
          appointment_id: string | null
          checkout_url: string | null
          contact_id: string | null
          created_at: string
          currency: string
          external_id: string | null
          id: string
          paid_at: string | null
          plan_id: string | null
          provider: string
          raw: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          appointment_id?: string | null
          checkout_url?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          paid_at?: string | null
          plan_id?: string | null
          provider: string
          raw?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          appointment_id?: string | null
          checkout_url?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          paid_at?: string | null
          plan_id?: string | null
          provider?: string
          raw?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string
          credential_hint: string
          currency: string
          fixed_meeting_url: string | null
          is_active: boolean
          meeting_mode: string
          mp_access_token_enc: string | null
          mp_public_key: string | null
          provider: string
          stripe_publishable: string | null
          stripe_secret_enc: string | null
          stripe_webhook_secret_enc: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_hint?: string
          currency?: string
          fixed_meeting_url?: string | null
          is_active?: boolean
          meeting_mode?: string
          mp_access_token_enc?: string | null
          mp_public_key?: string | null
          provider?: string
          stripe_publishable?: string | null
          stripe_secret_enc?: string | null
          stripe_webhook_secret_enc?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_hint?: string
          currency?: string
          fixed_meeting_url?: string | null
          is_active?: boolean
          meeting_mode?: string
          mp_access_token_enc?: string | null
          mp_public_key?: string | null
          provider?: string
          stripe_publishable?: string | null
          stripe_secret_enc?: string | null
          stripe_webhook_secret_enc?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          allow_signups: boolean
          brand_name: string
          default_timezone: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          maintenance_mode: boolean
          noreply_email: string
          notify_failed_payment: boolean
          notify_new_tenant: boolean
          primary_color: string
          require_email_verification: boolean
          support_email: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          allow_signups?: boolean
          brand_name?: string
          default_timezone?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          maintenance_mode?: boolean
          noreply_email?: string
          notify_failed_payment?: boolean
          notify_new_tenant?: boolean
          primary_color?: string
          require_email_verification?: boolean
          support_email?: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          allow_signups?: boolean
          brand_name?: string
          default_timezone?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          maintenance_mode?: boolean
          noreply_email?: string
          notify_failed_payment?: boolean
          notify_new_tenant?: boolean
          primary_color?: string
          require_email_verification?: boolean
          support_email?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          content: Json
          created_at: string
          gallery: Json
          id: string
          is_published: boolean
          slug: string
          template: string
          tenant_id: string
          theme: Json
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          gallery?: Json
          id?: string
          is_published?: boolean
          slug: string
          template?: string
          tenant_id: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          gallery?: Json
          id?: string
          is_published?: boolean
          slug?: string
          template?: string
          tenant_id?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          color: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          modality: Database["public"]["Enums"]["service_modality"]
          name: string
          price_cents: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          modality?: Database["public"]["Enums"]["service_modality"]
          name: string
          price_cents?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          modality?: Database["public"]["Enums"]["service_modality"]
          name?: string
          price_cents?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          account_type: string
          additional_channel_price_cents: number | null
          additional_user_price_cents: number | null
          ai_agents_limit: number
          billing_period: string
          contacts_limit: number
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_highlighted: boolean
          messages_limit: number
          name: string
          price_cents: number
          slug: string
          sort_order: number
          updated_at: string
          users_limit: number
        }
        Insert: {
          account_type?: string
          additional_channel_price_cents?: number | null
          additional_user_price_cents?: number | null
          ai_agents_limit?: number
          billing_period?: string
          contacts_limit?: number
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          messages_limit?: number
          name: string
          price_cents?: number
          slug: string
          sort_order?: number
          updated_at?: string
          users_limit?: number
        }
        Update: {
          account_type?: string
          additional_channel_price_cents?: number | null
          additional_user_price_cents?: number | null
          ai_agents_limit?: number
          billing_period?: string
          contacts_limit?: number
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          messages_limit?: number
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
          updated_at?: string
          users_limit?: number
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          body: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          last_reply_at: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_reply_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_reply_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_credentials: {
        Row: {
          api_key_enc: string
          base_url: string | null
          created_at: string
          created_by: string | null
          id: string
          key_hint: string
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key_enc: string
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_hint?: string
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key_enc?: string
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_hint?: string
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_channels: {
        Row: {
          account_id: string | null
          channel: Database["public"]["Enums"]["channel_kind"]
          created_at: string
          created_by: string | null
          credential_hint: string
          credentials_enc: string | null
          display_name: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          settings: Json
          status: Database["public"]["Enums"]["channel_conn_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          channel: Database["public"]["Enums"]["channel_kind"]
          created_at?: string
          created_by?: string | null
          credential_hint?: string
          credentials_enc?: string | null
          display_name?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          settings?: Json
          status?: Database["public"]["Enums"]["channel_conn_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          channel?: Database["public"]["Enums"]["channel_kind"]
          created_at?: string
          created_by?: string | null
          credential_hint?: string
          credentials_enc?: string | null
          display_name?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          settings?: Json
          status?: Database["public"]["Enums"]["channel_conn_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          branding: Json
          clinic: Json
          notifications: Json
          profile: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          clinic?: Json
          notifications?: Json
          profile?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          clinic?: Json
          notifications?: Json
          profile?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          account_type: string
          contacts_limit: number
          created_at: string
          custom_domain: string | null
          custom_domain_status: string
          custom_domain_verification: Json
          custom_hostname_id: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          messages_limit: number
          messages_used_this_month: number
          name: string
          owner_id: string
          plan: string
          primary_color: string | null
          settings: Json
          slug: string
          subdomain_status: string
          timezone: string
          trial_ends_at: string | null
          updated_at: string
          usage_reset_at: string
        }
        Insert: {
          account_type?: string
          contacts_limit?: number
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          custom_domain_verification?: Json
          custom_hostname_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          messages_limit?: number
          messages_used_this_month?: number
          name: string
          owner_id: string
          plan?: string
          primary_color?: string | null
          settings?: Json
          slug: string
          subdomain_status?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          usage_reset_at?: string
        }
        Update: {
          account_type?: string
          contacts_limit?: number
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          custom_domain_verification?: Json
          custom_hostname_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          messages_limit?: number
          messages_used_this_month?: number
          name?: string
          owner_id?: string
          plan?: string
          primary_color?: string | null
          settings?: Json
          slug?: string
          subdomain_status?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          usage_reset_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_broadcast_recipients: {
        Row: {
          broadcast_id: string
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          error: string | null
          id: string
          phone: string
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["wa_message_status"]
          tenant_id: string
          wa_message_id: string | null
        }
        Insert: {
          broadcast_id: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          phone: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["wa_message_status"]
          tenant_id: string
          wa_message_id?: string | null
        }
        Update: {
          broadcast_id?: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          phone?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["wa_message_status"]
          tenant_id?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcasts: {
        Row: {
          channel_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          id: string
          name: string
          read_count: number
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["wa_broadcast_status"]
          template_id: string | null
          template_variables: Json
          tenant_id: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name: string
          read_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["wa_broadcast_status"]
          template_id?: string | null
          template_variables?: Json
          tenant_id: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name?: string
          read_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["wa_broadcast_status"]
          template_id?: string | null
          template_variables?: Json
          tenant_id?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcasts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcasts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_channels: {
        Row: {
          access_token: string | null
          alibaba_access_key_id: string | null
          alibaba_access_key_secret: string | null
          alibaba_cust_space_id: string | null
          alibaba_region: string | null
          app_secret: string | null
          business_id: string | null
          created_at: string
          display_name: string
          id: string
          is_coexistence: boolean
          last_error: string | null
          last_synced_at: string | null
          onboarding_step: number
          phone_number: string | null
          phone_number_id: string | null
          provider: string
          status: Database["public"]["Enums"]["wa_channel_status"]
          tenant_id: string
          updated_at: string
          waba_id: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          access_token?: string | null
          alibaba_access_key_id?: string | null
          alibaba_access_key_secret?: string | null
          alibaba_cust_space_id?: string | null
          alibaba_region?: string | null
          app_secret?: string | null
          business_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_coexistence?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          onboarding_step?: number
          phone_number?: string | null
          phone_number_id?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["wa_channel_status"]
          tenant_id: string
          updated_at?: string
          waba_id?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          access_token?: string | null
          alibaba_access_key_id?: string | null
          alibaba_access_key_secret?: string | null
          alibaba_cust_space_id?: string | null
          alibaba_region?: string | null
          app_secret?: string | null
          business_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_coexistence?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          onboarding_step?: number
          phone_number?: string | null
          phone_number_id?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["wa_channel_status"]
          tenant_id?: string
          updated_at?: string
          waba_id?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          channel_id: string | null
          contact_id: string | null
          created_at: string
          display_name: string
          id: string
          last_message_at: string | null
          last_message_direction:
            | Database["public"]["Enums"]["wa_message_direction"]
            | null
          last_message_preview: string | null
          phone: string
          priority: number
          profile_pic_url: string | null
          status: Database["public"]["Enums"]["wa_conversation_status"]
          tags: string[]
          tenant_id: string
          unread_count: number
          updated_at: string
          wa_contact_id: string
          window_expires_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          last_message_at?: string | null
          last_message_direction?:
            | Database["public"]["Enums"]["wa_message_direction"]
            | null
          last_message_preview?: string | null
          phone: string
          priority?: number
          profile_pic_url?: string | null
          status?: Database["public"]["Enums"]["wa_conversation_status"]
          tags?: string[]
          tenant_id: string
          unread_count?: number
          updated_at?: string
          wa_contact_id: string
          window_expires_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_message_at?: string | null
          last_message_direction?:
            | Database["public"]["Enums"]["wa_message_direction"]
            | null
          last_message_preview?: string | null
          phone?: string
          priority?: number
          profile_pic_url?: string | null
          status?: Database["public"]["Enums"]["wa_conversation_status"]
          tags?: string[]
          tenant_id?: string
          unread_count?: number
          updated_at?: string
          wa_contact_id?: string
          window_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          channel_id: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: Database["public"]["Enums"]["wa_message_direction"]
          error: string | null
          id: string
          interactive: Json | null
          media_filename: string | null
          media_mime: string | null
          media_url: string | null
          raw: Json | null
          read_at: string | null
          reply_to_wa_id: string | null
          sender_user_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["wa_message_status"]
          template_language: string | null
          template_name: string | null
          template_variables: Json | null
          tenant_id: string
          type: Database["public"]["Enums"]["wa_message_type"]
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          channel_id?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["wa_message_direction"]
          error?: string | null
          id?: string
          interactive?: Json | null
          media_filename?: string | null
          media_mime?: string | null
          media_url?: string | null
          raw?: Json | null
          read_at?: string | null
          reply_to_wa_id?: string | null
          sender_user_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["wa_message_status"]
          template_language?: string | null
          template_name?: string | null
          template_variables?: Json | null
          tenant_id: string
          type?: Database["public"]["Enums"]["wa_message_type"]
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          channel_id?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["wa_message_direction"]
          error?: string | null
          id?: string
          interactive?: Json | null
          media_filename?: string | null
          media_mime?: string | null
          media_url?: string | null
          raw?: Json | null
          read_at?: string | null
          reply_to_wa_id?: string | null
          sender_user_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["wa_message_status"]
          template_language?: string | null
          template_name?: string | null
          template_variables?: Json | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["wa_message_type"]
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quick_replies: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          shortcut: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          shortcut: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          shortcut?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          category: string
          channel_id: string | null
          components: Json
          created_at: string
          external_id: string | null
          id: string
          language: string
          name: string
          status: Database["public"]["Enums"]["wa_template_status"]
          synced_at: string | null
          tenant_id: string
          updated_at: string
          variables_count: number
        }
        Insert: {
          body_text?: string
          category?: string
          channel_id?: string | null
          components?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          language?: string
          name: string
          status?: Database["public"]["Enums"]["wa_template_status"]
          synced_at?: string | null
          tenant_id: string
          updated_at?: string
          variables_count?: number
        }
        Update: {
          body_text?: string
          category?: string
          channel_id?: string | null
          components?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          language?: string
          name?: string
          status?: Database["public"]["Enums"]["wa_template_status"]
          synced_at?: string | null
          tenant_id?: string
          updated_at?: string
          variables_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      zernio_accounts: {
        Row: {
          account_id: string
          connected_at: string
          display_name: string | null
          id: string
          metadata: Json
          needs_reconnection: boolean
          platform: string
          profile_picture: string | null
          profile_url: string | null
          status: string
          tenant_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          account_id: string
          connected_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json
          needs_reconnection?: boolean
          platform: string
          profile_picture?: string | null
          profile_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_id?: string
          connected_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json
          needs_reconnection?: boolean
          platform?: string
          profile_picture?: string | null
          profile_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zernio_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      zernio_profiles: {
        Row: {
          created_at: string
          profile_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zernio_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_contact_stage: {
        Args: {
          _contact_id: string
          _reason?: string
          _trigger: Database["public"]["Enums"]["stage_trigger"]
        }
        Returns: string
      }
      consume_message_credit: {
        Args: { _reference?: string; _tenant_id: string }
        Returns: boolean
      }
      current_tenant_id: { Args: never; Returns: string }
      enqueue_notification: {
        Args: {
          _appointment_id: string
          _contact_id: string
          _event: Database["public"]["Enums"]["notification_event"]
          _payload?: Json
          _send_at: string
          _tenant_id: string
        }
        Returns: undefined
      }
      get_tenant_branding_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          primary_color: string
          slug: string
          timezone: string
        }[]
      }
      get_tenant_usage: {
        Args: never
        Returns: {
          account_type: string
          contacts_limit: number
          contacts_used: number
          is_owner: boolean
          is_readonly: boolean
          messages_limit: number
          messages_used: number
          plan: string
          tenant_id: string
          trial_ends_at: string
        }[]
      }
      grant_message_credits: {
        Args: { _amount: number; _reason?: string; _tenant_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_readonly: { Args: { _tenant_id: string }; Returns: boolean }
      tenant_role_of: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["tenant_role"]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "therapist"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "canceled"
        | "no_show"
      channel_conn_status: "disconnected" | "pending" | "active" | "error"
      channel_kind: "instagram" | "messenger" | "tiktok" | "site" | "email"
      invoice_status: "paid" | "open" | "overdue" | "void" | "refunded"
      notification_channel: "whatsapp" | "email"
      notification_event:
        | "contact_created"
        | "appointment_created"
        | "appointment_rescheduled"
        | "appointment_canceled"
        | "reminder_24h"
        | "reminder_1h"
        | "reminder_15m"
        | "payment_received"
        | "payment_pending"
      notification_job_status:
        | "pending"
        | "sending"
        | "sent"
        | "failed"
        | "canceled"
        | "skipped"
      service_modality: "online" | "presencial" | "ambos"
      stage_trigger:
        | "manual"
        | "contact_created"
        | "first_message_received"
        | "appointment_scheduled"
        | "appointment_completed"
        | "payment_received"
        | "no_reply_7d"
        | "course_completed"
      tenant_role: "owner" | "admin" | "therapist" | "assistant"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "analyzing"
        | "waiting_customer"
        | "resolved"
        | "closed"
      wa_broadcast_status:
        | "draft"
        | "scheduled"
        | "running"
        | "completed"
        | "canceled"
        | "failed"
      wa_channel_status:
        | "pending"
        | "verifying"
        | "active"
        | "disabled"
        | "error"
      wa_conversation_status:
        | "open"
        | "pending"
        | "resolved"
        | "snoozed"
        | "archived"
      wa_message_direction: "inbound" | "outbound"
      wa_message_status: "queued" | "sent" | "delivered" | "read" | "failed"
      wa_message_type:
        | "text"
        | "image"
        | "audio"
        | "video"
        | "document"
        | "template"
        | "interactive"
        | "location"
        | "contacts"
        | "system"
      wa_template_status:
        | "pending"
        | "approved"
        | "rejected"
        | "paused"
        | "disabled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "therapist"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "canceled",
        "no_show",
      ],
      channel_conn_status: ["disconnected", "pending", "active", "error"],
      channel_kind: ["instagram", "messenger", "tiktok", "site", "email"],
      invoice_status: ["paid", "open", "overdue", "void", "refunded"],
      notification_channel: ["whatsapp", "email"],
      notification_event: [
        "contact_created",
        "appointment_created",
        "appointment_rescheduled",
        "appointment_canceled",
        "reminder_24h",
        "reminder_1h",
        "reminder_15m",
        "payment_received",
        "payment_pending",
      ],
      notification_job_status: [
        "pending",
        "sending",
        "sent",
        "failed",
        "canceled",
        "skipped",
      ],
      service_modality: ["online", "presencial", "ambos"],
      stage_trigger: [
        "manual",
        "contact_created",
        "first_message_received",
        "appointment_scheduled",
        "appointment_completed",
        "payment_received",
        "no_reply_7d",
        "course_completed",
      ],
      tenant_role: ["owner", "admin", "therapist", "assistant"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "analyzing",
        "waiting_customer",
        "resolved",
        "closed",
      ],
      wa_broadcast_status: [
        "draft",
        "scheduled",
        "running",
        "completed",
        "canceled",
        "failed",
      ],
      wa_channel_status: [
        "pending",
        "verifying",
        "active",
        "disabled",
        "error",
      ],
      wa_conversation_status: [
        "open",
        "pending",
        "resolved",
        "snoozed",
        "archived",
      ],
      wa_message_direction: ["inbound", "outbound"],
      wa_message_status: ["queued", "sent", "delivered", "read", "failed"],
      wa_message_type: [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "template",
        "interactive",
        "location",
        "contacts",
        "system",
      ],
      wa_template_status: [
        "pending",
        "approved",
        "rejected",
        "paused",
        "disabled",
      ],
    },
  },
} as const
