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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      budget_ads: {
        Row: {
          audience: string
          budget: number
          campaign_id: string
          conversions: number
          cpc: number
          created_at: string
          creative_name: string
          ctr: number
          frequency: number
          id: string
          phase: string
          revenue: number
          roas: number
          score: number
          spend: number
          status: string
        }
        Insert: {
          audience?: string
          budget?: number
          campaign_id: string
          conversions?: number
          cpc?: number
          created_at?: string
          creative_name?: string
          ctr?: number
          frequency?: number
          id?: string
          phase?: string
          revenue?: number
          roas?: number
          score?: number
          spend?: number
          status?: string
        }
        Update: {
          audience?: string
          budget?: number
          campaign_id?: string
          conversions?: number
          cpc?: number
          created_at?: string
          creative_name?: string
          ctr?: number
          frequency?: number
          id?: string
          phase?: string
          revenue?: number
          roas?: number
          score?: number
          spend?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_ads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "budget_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_campaigns: {
        Row: {
          auto_optimize: boolean
          created_at: string
          evaluation_pct: number
          id: string
          name: string
          scaling_pct: number
          testing_pct: number
          total_budget: number
          updated_at: string
        }
        Insert: {
          auto_optimize?: boolean
          created_at?: string
          evaluation_pct?: number
          id?: string
          name?: string
          scaling_pct?: number
          testing_pct?: number
          total_budget?: number
          updated_at?: string
        }
        Update: {
          auto_optimize?: boolean
          created_at?: string
          evaluation_pct?: number
          id?: string
          name?: string
          scaling_pct?: number
          testing_pct?: number
          total_budget?: number
          updated_at?: string
        }
        Relationships: []
      }
      campaign_metrics: {
        Row: {
          active_ads: number
          campaign_id: string
          created_at: string
          id: string
          revenue: number
          roas: number
          score: number
          total_spend: number
        }
        Insert: {
          active_ads?: number
          campaign_id: string
          created_at?: string
          id?: string
          revenue?: number
          roas?: number
          score?: number
          total_spend?: number
        }
        Update: {
          active_ads?: number
          campaign_id?: string
          created_at?: string
          id?: string
          revenue?: number
          roas?: number
          score?: number
          total_spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "budget_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_config: {
        Row: {
          active_channels: Json
          created_at: string
          id: string
          persona: string
          settings: Json
          trigger_words: Json
          updated_at: string
        }
        Insert: {
          active_channels?: Json
          created_at?: string
          id?: string
          persona?: string
          settings?: Json
          trigger_words?: Json
          updated_at?: string
        }
        Update: {
          active_channels?: Json
          created_at?: string
          id?: string
          persona?: string
          settings?: Json
          trigger_words?: Json
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          platform: string
          sender_avatar: string | null
          sender_id: string
          sender_name: string
          tags: Json
          unread: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          platform: string
          sender_avatar?: string | null
          sender_id: string
          sender_name?: string
          tags?: Json
          unread?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          platform?: string
          sender_avatar?: string | null
          sender_id?: string
          sender_name?: string
          tags?: Json
          unread?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget: string | null
          business_name: string | null
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          budget?: string | null
          business_name?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          budget?: string | null
          business_name?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_text: string
          platform: string
          sender: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_text: string
          platform?: string
          sender?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_text?: string
          platform?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          media_url: string | null
          order_index: number
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          order_index?: number
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          order_index?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      processed_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          platform: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          platform?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          platform?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          connected: boolean | null
          id: string
          page_id: string | null
          platform: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          connected?: boolean | null
          id?: string
          page_id?: string | null
          platform: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          connected?: boolean | null
          id?: string
          page_id?: string | null
          platform?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
