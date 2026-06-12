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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      media_assets: {
        Row: {
          created_at: string
          duration_sec: number | null
          external_url: string | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          size_bytes: number | null
          storage_path: string | null
          thumbnail_path: string | null
          title: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"]
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          external_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          size_bytes?: number | null
          storage_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"]
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          external_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          size_bytes?: number | null
          storage_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      media_links: {
        Row: {
          created_at: string
          id: string
          media_id: string
          session_id: string | null
          technique_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          session_id?: string | null
          technique_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          session_id?: string | null
          technique_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_links_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_links_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_links_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          is_admin: boolean
          reminder_days: number[]
          reminder_enabled: boolean
          reminder_time: string
          timezone: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          created_at?: string
          display_name?: string
          is_admin?: boolean
          reminder_days?: number[]
          reminder_enabled?: boolean
          reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          created_at?: string
          display_name?: string
          is_admin?: boolean
          reminder_days?: number[]
          reminder_enabled?: boolean
          reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      session_disciplines: {
        Row: {
          discipline: Database["public"]["Enums"]["discipline"]
          session_id: string
        }
        Insert: {
          discipline: Database["public"]["Enums"]["discipline"]
          session_id: string
        }
        Update: {
          discipline?: Database["public"]["Enums"]["discipline"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_disciplines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_techniques: {
        Row: {
          created_at: string
          day_memo_md: string | null
          id: string
          session_id: string
          sort_order: number
          technique_id: string
        }
        Insert: {
          created_at?: string
          day_memo_md?: string | null
          id?: string
          session_id: string
          sort_order?: number
          technique_id: string
        }
        Update: {
          created_at?: string
          day_memo_md?: string | null
          id?: string
          session_id?: string
          sort_order?: number
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_techniques_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_techniques_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          class_type: Database["public"]["Enums"]["class_type"] | null
          created_at: string
          duration_min: number | null
          gym: string | null
          id: string
          intensity: number | null
          is_favorite: boolean
          memo_md: string | null
          partners: string | null
          rating: number | null
          rounds: number | null
          trained_on: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          class_type?: Database["public"]["Enums"]["class_type"] | null
          created_at?: string
          duration_min?: number | null
          gym?: string | null
          id?: string
          intensity?: number | null
          is_favorite?: boolean
          memo_md?: string | null
          partners?: string | null
          rating?: number | null
          rounds?: number | null
          trained_on: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          class_type?: Database["public"]["Enums"]["class_type"] | null
          created_at?: string
          duration_min?: number | null
          gym?: string | null
          id?: string
          intensity?: number | null
          is_favorite?: boolean
          memo_md?: string | null
          partners?: string | null
          rating?: number | null
          rounds?: number | null
          trained_on?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      shares: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          resource_id: string
          resource_type: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          resource_id: string
          resource_type: string
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          resource_id?: string
          resource_type?: string
          token?: string
        }
        Relationships: []
      }
      taggables: {
        Row: {
          id: string
          session_id: string | null
          tag_id: string
          technique_id: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          tag_id: string
          technique_id?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          tag_id?: string
          technique_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taggables_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taggables_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taggables_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      techniques: {
        Row: {
          belt: Database["public"]["Enums"]["belt"] | null
          belt_stripes: number | null
          category: Database["public"]["Enums"]["technique_category"]
          created_at: string
          description_md: string | null
          details_md: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          id: string
          is_favorite: boolean
          level: Database["public"]["Enums"]["skill_level"] | null
          name: string
          position: Database["public"]["Enums"]["position_kind"] | null
          striking_style: Database["public"]["Enums"]["striking_style"] | null
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          belt?: Database["public"]["Enums"]["belt"] | null
          belt_stripes?: number | null
          category: Database["public"]["Enums"]["technique_category"]
          created_at?: string
          description_md?: string | null
          details_md?: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          id?: string
          is_favorite?: boolean
          level?: Database["public"]["Enums"]["skill_level"] | null
          name: string
          position?: Database["public"]["Enums"]["position_kind"] | null
          striking_style?: Database["public"]["Enums"]["striking_style"] | null
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          belt?: Database["public"]["Enums"]["belt"] | null
          belt_stripes?: number | null
          category?: Database["public"]["Enums"]["technique_category"]
          created_at?: string
          description_md?: string | null
          details_md?: string | null
          discipline?: Database["public"]["Enums"]["discipline"]
          id?: string
          is_favorite?: boolean
          level?: Database["public"]["Enums"]["skill_level"] | null
          name?: string
          position?: Database["public"]["Enums"]["position_kind"] | null
          striking_style?: Database["public"]["Enums"]["striking_style"] | null
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      user_ranks: {
        Row: {
          belt: Database["public"]["Enums"]["belt"] | null
          created_at: string
          id: string
          level: string | null
          stripes: number | null
          track: Database["public"]["Enums"]["rank_track"]
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          belt?: Database["public"]["Enums"]["belt"] | null
          created_at?: string
          id?: string
          level?: string | null
          stripes?: number | null
          track: Database["public"]["Enums"]["rank_track"]
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          belt?: Database["public"]["Enums"]["belt"] | null
          created_at?: string
          id?: string
          level?: string | null
          stripes?: number | null
          track?: Database["public"]["Enums"]["rank_track"]
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      youtube_cache: {
        Row: {
          fetched_at: string
          query: string
          results: Json
        }
        Insert: {
          fetched_at?: string
          query: string
          results: Json
        }
        Update: {
          fetched_at?: string
          query?: string
          results?: Json
        }
        Relationships: []
      }
    }
    Views: {
      calendar_day_summary: {
        Row: {
          disciplines: Database["public"]["Enums"]["discipline"][] | null
          has_media: boolean | null
          session_count: number | null
          trained_on: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_shared_comment: {
        Args: { p_token: string; p_body: string }
        Returns: Json
      }
      create_gym: {
        Args: { p_name: string }
        Returns: Json
      }
      get_admin_overview: {
        Args: never
        Returns: Json
      }
      current_user_gym_id: {
        Args: never
        Returns: string
      }
      delete_gym: {
        Args: never
        Returns: boolean
      }
      get_gym_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: Json
      }
      get_my_gym: {
        Args: never
        Returns: Json
      }
      request_join_gym: {
        Args: { p_invite_code: string }
        Returns: Json
      }
      get_my_pending_request: {
        Args: never
        Returns: Json
      }
      cancel_join_request: {
        Args: never
        Returns: boolean
      }
      list_gym_join_requests: {
        Args: never
        Returns: Json
      }
      approve_gym_join_request: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      reject_gym_join_request: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      get_gym_feed: {
        Args: never
        Returns: Json
      }
      list_my_gym_shares: {
        Args: { p_resource_type: string }
        Returns: Json
      }
      share_to_gym: {
        Args: {
          p_resource_type: string
          p_resource_id: string
          p_visibility?: string
          p_recipient_ids?: string[]
        }
        Returns: boolean
      }
      unshare_from_gym: {
        Args: { p_resource_type: string; p_resource_id: string }
        Returns: boolean
      }
      get_gym_shared_detail: {
        Args: { p_gym_share_id: string }
        Returns: Json
      }
      get_gym_comments: {
        Args: { p_gym_share_id: string }
        Returns: Json
      }
      add_gym_comment: {
        Args: { p_gym_share_id: string; p_body: string }
        Returns: Json
      }
      delete_gym_comment: {
        Args: { p_comment_id: string }
        Returns: boolean
      }
      leave_gym: {
        Args: never
        Returns: boolean
      }
      remove_gym_member: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      set_gym_member_role: {
        Args: { p_user_id: string; p_role: string }
        Returns: boolean
      }
      rotate_gym_invite_code: {
        Args: never
        Returns: string
      }
      delete_shared_comment: {
        Args: { p_comment_id: string }
        Returns: boolean
      }
      get_shared_comments: {
        Args: { p_token: string }
        Returns: Json
      }
      get_shared_resource: {
        Args: { p_token: string }
        Returns: Json
      }
      get_shared_session: {
        Args: { p_token: string }
        Returns: Json
      }
      get_shared_technique: {
        Args: { p_token: string }
        Returns: Json
      }
      log_session: {
        Args: {
          p_class_type?: Database["public"]["Enums"]["class_type"]
          p_disciplines?: Json
          p_duration_min?: number
          p_gym?: string
          p_intensity?: number
          p_media?: Json
          p_memo_md?: string
          p_partners?: string
          p_rating?: number
          p_rounds?: number
          p_tag_ids?: Json
          p_techniques?: Json
          p_trained_on: string
          p_user: string
        }
        Returns: string
      }
      register_push_token: {
        Args: { p_token: string; p_platform: string }
        Returns: undefined
      }
      search_all: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          belt: string
          rank: number
          result_id: string
          result_type: string
          subtitle: string
          title: string
        }[]
      }
      seed_starter_techniques: { Args: { p_user: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unregister_push_token: {
        Args: { p_token: string }
        Returns: undefined
      }
      update_session: {
        Args: {
          p_class_type?: Database["public"]["Enums"]["class_type"]
          p_disciplines?: Json
          p_duration_min?: number
          p_gym?: string
          p_intensity?: number
          p_media?: Json
          p_memo_md?: string
          p_partners?: string
          p_rating?: number
          p_rounds?: number
          p_session_id: string
          p_tag_ids?: Json
          p_techniques?: Json
          p_trained_on: string
          p_user: string
        }
        Returns: string
      }
    }
    Enums: {
      belt: "white" | "blue" | "purple" | "brown" | "black"
      class_type:
        | "technique"
        | "drilling"
        | "sparring"
        | "open_mat"
        | "private"
        | "seminar"
        | "competition"
        | "strength"
      discipline: "bjj_gi" | "bjj_nogi" | "wrestling" | "striking" | "mma"
      media_kind: "upload" | "youtube" | "external"
      position_kind:
        | "standing"
        | "clinch"
        | "closed_guard"
        | "open_guard"
        | "half_guard"
        | "mount"
        | "side_control"
        | "back_control"
        | "turtle"
        | "north_south"
        | "knee_on_belly"
        | "other"
      rank_track: "bjj" | "wrestling" | "striking" | "mma"
      skill_level: "beginner" | "intermediate" | "advanced"
      striking_style: "muay_thai" | "kickboxing" | "boxing" | "other"
      technique_category:
        | "guard"
        | "pass"
        | "sweep"
        | "submission"
        | "takedown"
        | "escape"
        | "transition"
        | "control"
        | "defense"
        | "punch"
        | "kick"
        | "knee"
        | "elbow"
        | "clinch"
        | "combination"
        | "footwork"
        | "entry"
        | "cage_work"
        | "ground_and_pound"
      visibility: "private" | "shared" | "public"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      belt: ["white", "blue", "purple", "brown", "black"],
      class_type: [
        "technique",
        "drilling",
        "sparring",
        "open_mat",
        "private",
        "seminar",
        "competition",
        "strength",
      ],
      discipline: ["bjj_gi", "bjj_nogi", "wrestling", "striking", "mma"],
      media_kind: ["upload", "youtube", "external"],
      position_kind: [
        "standing",
        "clinch",
        "closed_guard",
        "open_guard",
        "half_guard",
        "mount",
        "side_control",
        "back_control",
        "turtle",
        "north_south",
        "knee_on_belly",
        "other",
      ],
      rank_track: ["bjj", "wrestling", "striking", "mma"],
      skill_level: ["beginner", "intermediate", "advanced"],
      striking_style: ["muay_thai", "kickboxing", "boxing", "other"],
      technique_category: [
        "guard",
        "pass",
        "sweep",
        "submission",
        "takedown",
        "escape",
        "transition",
        "control",
        "defense",
        "punch",
        "kick",
        "knee",
        "elbow",
        "clinch",
        "combination",
        "footwork",
        "entry",
        "cage_work",
        "ground_and_pound",
      ],
      visibility: ["private", "shared", "public"],
    },
  },
} as const
