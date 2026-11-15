export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string;
          first_question: string;
          id: string;
          messages: Json;
          question_count: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          first_question?: string;
          id: string;
          messages?: Json;
          question_count?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          first_question?: string;
          id?: string;
          messages?: Json;
          question_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_accounts: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          name: string;
          opening_cents: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          name: string;
          opening_cents?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          opening_cents?: number;
        };
        Relationships: [];
      };
      finance_budgets: {
        Row: {
          budget_cents: number;
          phase_id: string;
        };
        Insert: {
          budget_cents?: number;
          phase_id: string;
        };
        Update: {
          budget_cents?: number;
          phase_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finance_budgets_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: true;
            referencedRelation: "project_phases";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_company: {
        Row: {
          address: string;
          currency: string;
          email: string;
          id: boolean;
          invoice_notes: string;
          name: string;
          tax_id: string;
        };
        Insert: {
          address?: string;
          currency?: string;
          email?: string;
          id?: boolean;
          invoice_notes?: string;
          name?: string;
          tax_id?: string;
        };
        Update: {
          address?: string;
          currency?: string;
          email?: string;
          id?: boolean;
          invoice_notes?: string;
          name?: string;
          tax_id?: string;
        };
        Relationships: [];
      };
      finance_entries: {
        Row: {
          account_id: string;
          amount_cents: number;
          category: string;
          created_at: string;
          description: string;
          destination_id: string | null;
          entry_date: string;
          id: string;
          invoice_id: string | null;
          kind: string;
          phase_id: string | null;
          project_id: string | null;
        };
        Insert: {
          account_id: string;
          amount_cents: number;
          category?: string;
          created_at?: string;
          description: string;
          destination_id?: string | null;
          entry_date: string;
          id?: string;
          invoice_id?: string | null;
          kind: string;
          phase_id?: string | null;
          project_id?: string | null;
        };
        Update: {
          account_id?: string;
          amount_cents?: number;
          category?: string;
          created_at?: string;
          description?: string;
          destination_id?: string | null;
          entry_date?: string;
          id?: string;
          invoice_id?: string | null;
          kind?: string;
          phase_id?: string | null;
          project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "finance_entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "finance_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_entries_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "finance_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_entries_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "finance_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_entries_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "project_phases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_invoices: {
        Row: {
          client_address: string;
          client_email: string;
          client_name: string;
          created_at: string;
          due_date: string;
          id: string;
          issue_date: string;
          lines: Json;
          notes: string;
          number: string;
          project_id: string | null;
          status: string;
          subtotal_cents: number;
          tax_bps: number;
          tax_cents: number;
          total_cents: number;
        };
        Insert: {
          client_address?: string;
          client_email?: string;
          client_name: string;
          created_at?: string;
          due_date: string;
          id?: string;
          issue_date: string;
          lines: Json;
          notes?: string;
          number: string;
          project_id?: string | null;
          status?: string;
          subtotal_cents?: number;
          tax_bps?: number;
          tax_cents?: number;
          total_cents?: number;
        };
        Update: {
          client_address?: string;
          client_email?: string;
          client_name?: string;
          created_at?: string;
          due_date?: string;
          id?: string;
          issue_date?: string;
          lines?: Json;
          notes?: string;
          number?: string;
          project_id?: string | null;
          status?: string;
          subtotal_cents?: number;
          tax_bps?: number;
          tax_cents?: number;
          total_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "finance_invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiries: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          interests: string[];
          is_sample: boolean;
          message: string;
          name: string;
          notes: string | null;
          organization: string | null;
          status: Database["public"]["Enums"]["inquiry_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          interests?: string[];
          is_sample?: boolean;
          message: string;
          name: string;
          notes?: string | null;
          organization?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          interests?: string[];
          is_sample?: boolean;
          message?: string;
          name?: string;
          notes?: string | null;
          organization?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          department: string | null;
          email: string;
          full_name: string;
          id: string;
          job_title: string | null;
          location: string | null;
          organization: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          department?: string | null;
          email?: string;
          full_name?: string;
          id: string;
          job_title?: string | null;
          location?: string | null;
          organization?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          department?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          job_title?: string | null;
          location?: string | null;
          organization?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_phases: {
        Row: {
          due_date: string | null;
          id: string;
          notes: string | null;
          phase_no: number;
          project_id: string;
          signed_off_at: string | null;
          signed_off_by: string | null;
          status: Database["public"]["Enums"]["phase_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          phase_no: number;
          project_id: string;
          signed_off_at?: string | null;
          signed_off_by?: string | null;
          status?: Database["public"]["Enums"]["phase_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          phase_no?: number;
          project_id?: string;
          signed_off_at?: string | null;
          signed_off_by?: string | null;
          status?: Database["public"]["Enums"]["phase_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_phases_signed_off_by_fkey";
            columns: ["signed_off_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_updates: {
        Row: {
          author_id: string | null;
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          kind: string;
          project_id: string;
        };
        Insert: {
          author_id?: string | null;
          author_name?: string;
          body: string;
          created_at?: string;
          id?: string;
          kind?: string;
          project_id: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_updates_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_updates_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          client_id: string | null;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          is_sample: boolean;
          lab_name: string;
          location: string | null;
          monthly_volume: number | null;
          name: string;
          priority: string;
          regulatory_pathway: string | null;
          sample_type: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          summary: string | null;
          target_date: string | null;
          test_type: string | null;
          updated_at: string;
        };
        Insert: {
          client_id?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          lab_name: string;
          location?: string | null;
          monthly_volume?: number | null;
          name: string;
          priority?: string;
          regulatory_pathway?: string | null;
          sample_type?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          summary?: string | null;
          target_date?: string | null;
          test_type?: string | null;
          updated_at?: string;
        };
        Update: {
          client_id?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          lab_name?: string;
          location?: string | null;
          monthly_volume?: number | null;
          name?: string;
          priority?: string;
          regulatory_pathway?: string | null;
          sample_type?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          summary?: string | null;
          target_date?: string | null;
          test_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      sign_off_phase: { Args: { _phase_id: string }; Returns: undefined };
    };
    Enums: {
      app_role: "admin" | "client";
      inquiry_status: "new" | "in_progress" | "booked" | "closed";
      phase_status: "not_started" | "in_progress" | "awaiting_signoff" | "signed_off";
      project_status: "active" | "on_hold" | "complete";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
      inquiry_status: ["new", "in_progress", "booked", "closed"],
      phase_status: ["not_started", "in_progress", "awaiting_signoff", "signed_off"],
      project_status: ["active", "on_hold", "complete"],
    },
  },
} as const;
