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
      tenants: {
        Row: {
          contacts_limit: number
          created_at: string
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
          timezone: string
          trial_ends_at: string | null
          updated_at: string
          usage_reset_at: string
        }
        Insert: {
          contacts_limit?: number
          created_at?: string
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
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          usage_reset_at?: string
        }
        Update: {
          contacts_limit?: number
          created_at?: string
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
      current_tenant_id: { Args: never; Returns: string }
      get_tenant_usage: {
        Args: never
        Returns: {
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
    },
  },
} as const
