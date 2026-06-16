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
      activity_log: {
        Row: {
          action: string
          actor: string
          bar_id: string
          created_at: string
          detail: string
          id: string
        }
        Insert: {
          action: string
          actor: string
          bar_id: string
          created_at?: string
          detail?: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          bar_id?: string
          created_at?: string
          detail?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string
          bar_id: string
          id: string
          shown_at: string
          source: string
        }
        Insert: {
          ad_id: string
          bar_id: string
          id?: string
          shown_at?: string
          source: string
        }
        Update: {
          ad_id?: string
          bar_id?: string
          id?: string
          shown_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          bar_id: string
          color: string
          company_name: string | null
          duration_seconds: number
          emoji: string
          end_date: string | null
          id: string
          image_url: string | null
          impressions_count: number
          is_active: boolean
          is_own: boolean
          max_impressions: number | null
          sort_order: number
          start_date: string | null
          subtitle: string | null
          time_end: string | null
          time_start: string | null
          title: string
        }
        Insert: {
          bar_id: string
          color?: string
          company_name?: string | null
          duration_seconds?: number
          emoji?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions_count?: number
          is_active?: boolean
          is_own?: boolean
          max_impressions?: number | null
          sort_order?: number
          start_date?: string | null
          subtitle?: string | null
          time_end?: string | null
          time_start?: string | null
          title: string
        }
        Update: {
          bar_id?: string
          color?: string
          company_name?: string | null
          duration_seconds?: number
          emoji?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions_count?: number
          is_active?: boolean
          is_own?: boolean
          max_impressions?: number | null
          sort_order?: number
          start_date?: string | null
          subtitle?: string | null
          time_end?: string | null
          time_start?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_admins: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_admins_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_stats: {
        Row: {
          active_tables: number
          bar_id: string
          date: string
          id: string
          peak_tables: number
          total_bids: number
          total_credits_sold: number
          total_songs: number
        }
        Insert: {
          active_tables?: number
          bar_id: string
          date: string
          id?: string
          peak_tables?: number
          total_bids?: number
          total_credits_sold?: number
          total_songs?: number
        }
        Update: {
          active_tables?: number
          bar_id?: string
          date?: string
          id?: string
          peak_tables?: number
          total_bids?: number
          total_credits_sold?: number
          total_songs?: number
        }
        Relationships: [
          {
            foreignKeyName: "bar_stats_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bars: {
        Row: {
          config: Json
          created_at: string
          emoji: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          tv_pin: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          emoji?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          tv_pin?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          emoji?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          tv_pin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blocked_songs: {
        Row: {
          artist: string
          bar_id: string
          blocked_by: string
          created_at: string
          id: string
          reason: string | null
          title: string
        }
        Insert: {
          artist: string
          bar_id: string
          blocked_by: string
          created_at?: string
          id?: string
          reason?: string | null
          title: string
        }
        Update: {
          artist?: string
          bar_id?: string
          blocked_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_songs_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          is_pinned: boolean
          message: string
          message_type: Database["public"]["Enums"]["message_type"]
          table_id: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          message: string
          message_type?: Database["public"]["Enums"]["message_type"]
          table_id?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          message?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_transactions: {
        Row: {
          amount: number
          bar_id: string
          created_at: string
          id: string
          qr_code: string | null
          reference: string | null
          status: string
          table_id: string
          type: Database["public"]["Enums"]["transaction_type"]
          verified_by: string | null
        }
        Insert: {
          amount: number
          bar_id: string
          created_at?: string
          id?: string
          qr_code?: string | null
          reference?: string | null
          status?: string
          table_id: string
          type: Database["public"]["Enums"]["transaction_type"]
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bar_id?: string
          created_at?: string
          id?: string
          qr_code?: string | null
          reference?: string | null
          status?: string
          table_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credits_transactions_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_transactions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          added_at: string
          artist: string
          bar_id: string
          id: string
          times_played: number
          title: string
          youtube_video_id: string | null
        }
        Insert: {
          added_at?: string
          artist: string
          bar_id: string
          id?: string
          times_played?: number
          title: string
          youtube_video_id?: string | null
        }
        Update: {
          added_at?: string
          artist?: string
          bar_id?: string
          id?: string
          times_played?: number
          title?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      genre_songs: {
        Row: {
          artist: string
          genre_id: string
          id: string
          title: string
          youtube_video_id: string | null
        }
        Insert: {
          artist: string
          genre_id: string
          id?: string
          title: string
          youtube_video_id?: string | null
        }
        Update: {
          artist?: string
          genre_id?: string
          id?: string
          title?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genre_songs_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          bar_id: string
          color: string
          emoji: string
          id: string
          name: string
        }
        Insert: {
          bar_id: string
          color?: string
          emoji?: string
          id?: string
          name: string
        }
        Update: {
          bar_id?: string
          color?: string
          emoji?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "genres_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          bar_id: string
          emoji: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          bar_id: string
          emoji?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          bar_id?: string
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          bar_id: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
          subcategory_id: string
        }
        Insert: {
          bar_id: string
          id?: string
          is_available?: boolean
          name: string
          price: number
          sort_order?: number
          subcategory_id: string
        }
        Update: {
          bar_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "menu_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_subcategories: {
        Row: {
          category_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          items: Json
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
          total: number
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          items?: Json
          status?: Database["public"]["Enums"]["order_status"]
          table_id: string
          total?: number
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          items?: Json
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string
          total?: number
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      queue: {
        Row: {
          added_at: string
          artist: string
          bar_id: string
          bid_amount: number
          dedication: string | null
          id: string
          played_at: string | null
          position: number
          status: Database["public"]["Enums"]["queue_status"]
          table_id: string | null
          thumbnail_url: string | null
          title: string
          youtube_video_id: string | null
        }
        Insert: {
          added_at?: string
          artist: string
          bar_id: string
          bid_amount?: number
          dedication?: string | null
          id?: string
          played_at?: string | null
          position: number
          status?: Database["public"]["Enums"]["queue_status"]
          table_id?: string | null
          thumbnail_url?: string | null
          title: string
          youtube_video_id?: string | null
        }
        Update: {
          added_at?: string
          artist?: string
          bar_id?: string
          bid_amount?: number
          dedication?: string | null
          id?: string
          played_at?: string | null
          position?: number
          status?: Database["public"]["Enums"]["queue_status"]
          table_id?: string | null
          thumbnail_url?: string | null
          title?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          bar_id: string
          connected_at: string | null
          credits: number
          id: string
          is_active: boolean
          is_banned: boolean
          label: string
          max_occupants: number
          number: number
          session_token: string | null
        }
        Insert: {
          bar_id: string
          connected_at?: string | null
          credits?: number
          id?: string
          is_active?: boolean
          is_banned?: boolean
          label: string
          max_occupants?: number
          number: number
          session_token?: string | null
        }
        Update: {
          bar_id?: string
          connected_at?: string | null
          credits?: number
          id?: string
          is_active?: boolean
          is_banned?: boolean
          label?: string
          max_occupants?: number
          number?: number
          session_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          queue_id: string
          table_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          queue_id: string
          table_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          created_at?: string
          id?: string
          queue_id?: string
          table_id?: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "votes_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      waiters: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          pin: string
          shift: string
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          pin: string
          shift?: string
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          pin?: string
          shift?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiters_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_cache: {
        Row: {
          created_at: string
          hit_count: number
          id: string
          last_hit_at: string | null
          query: string
          results: Json
        }
        Insert: {
          created_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          query: string
          results: Json
        }
        Update: {
          created_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          query?: string
          results?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_waiter: {
        Args: { p_bar_id: string; p_pin: string }
        Returns: {
          id: string
          is_active: boolean
          name: string
          phone: string
          shift: string
        }[]
      }
      ban_table_rpc: {
        Args: { p_bar_id: string; p_reason?: string; p_table_id: string }
        Returns: undefined
      }
      bid_on_song: {
        Args: {
          p_amount: number
          p_bar_id: string
          p_queue_id: string
          p_table_id: string
        }
        Returns: {
          added_at: string
          artist: string
          bar_id: string
          bid_amount: number
          dedication: string | null
          id: string
          played_at: string | null
          position: number
          status: Database["public"]["Enums"]["queue_status"]
          table_id: string | null
          thumbnail_url: string | null
          title: string
          youtube_video_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cast_vote_and_check: {
        Args: {
          p_bar_id: string
          p_queue_id: string
          p_table_id: string
          p_vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Returns: Json
      }
      confirm_recharge_qr: {
        Args: { p_scanned_code: string; p_transaction_id: string }
        Returns: number
      }
      create_order_validated: {
        Args: { p_bar_id: string; p_items: Json; p_token: string }
        Returns: {
          bar_id: string
          created_at: string
          id: string
          items: Json
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
          total: number
          updated_at: string
          waiter_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_waiter_rpc: {
        Args: {
          p_bar_id: string
          p_name: string
          p_phone?: string
          p_pin: string
          p_shift?: string
        }
        Returns: {
          bar_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          pin: string
          shift: string
        }
        SetofOptions: {
          from: "*"
          to: "waiters"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_old_youtube_cache: { Args: never; Returns: undefined }
      get_active_ads: {
        Args: { p_bar_id: string }
        Returns: {
          bar_id: string
          color: string
          company_name: string | null
          duration_seconds: number
          emoji: string
          end_date: string | null
          id: string
          image_url: string | null
          impressions_count: number
          is_active: boolean
          is_own: boolean
          max_impressions: number | null
          sort_order: number
          start_date: string | null
          subtitle: string | null
          time_end: string | null
          time_start: string | null
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_active_queue: {
        Args: { p_bar_id: string }
        Returns: {
          added_at: string
          artist: string
          bid_amount: number
          dedication: string
          id: string
          keep_votes: number
          position: number
          skip_votes: number
          status: Database["public"]["Enums"]["queue_status"]
          table_id: string
          table_label: string
          thumbnail_url: string
          title: string
          youtube_video_id: string
        }[]
      }
      get_ad_impressions_history: {
        Args: { p_ad_id: string; p_limit?: number }
        Returns: {
          ad_id: string
          bar_id: string
          id: string
          shown_at: string
          source: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ad_impressions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_ad_impressions_report: {
        Args: { p_bar_id: string }
        Returns: {
          ad_id: string
          emoji: string
          is_active: boolean
          last_shown: string
          title: string
          total_count: number
        }[]
      }
      get_bar_id_for_user: { Args: { p_user_id?: string }; Returns: string }
      get_bar_public_info: {
        Args: { p_bar_id: string }
        Returns: {
          config: Json
          emoji: string
          id: string
          is_open: boolean
          name: string
          slug: string
        }[]
      }
      get_bar_stats_summary: {
        Args: { p_bar_id: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      get_credits_history_for_table: {
        Args: { p_bar_id: string; p_token: string }
        Returns: {
          amount: number
          bar_id: string
          created_at: string
          id: string
          qr_code: string | null
          reference: string | null
          status: string
          table_id: string
          type: Database["public"]["Enums"]["transaction_type"]
          verified_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "credits_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_global_bar_ranking: {
        Args: { p_limit?: number }
        Returns: {
          bar_emoji: string
          bar_id: string
          bar_name: string
          bar_slug: string
          table_count: number
          total_bids: number
          total_songs: number
        }[]
      }
      get_global_top_songs: {
        Args: { p_limit?: number }
        Returns: {
          artist: string
          avg_bid: number
          max_bid: number
          times_played: number
          title: string
        }[]
      }
      get_orders_for_table: {
        Args: { p_bar_id: string; p_token: string }
        Returns: {
          bar_id: string
          created_at: string
          id: string
          items: Json
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
          total: number
          updated_at: string
          waiter_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recharge_transaction_by_qr: {
        Args: { p_qr_code: string }
        Returns: {
          amount: number
          bar_id: string
          created_at: string
          id: string
          qr_code: string | null
          reference: string | null
          status: string
          table_id: string
          type: Database["public"]["Enums"]["transaction_type"]
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "credits_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_table_by_token: {
        Args: { p_token: string }
        Returns: {
          bar_id: string
          credits: number
          is_active: boolean
          is_banned: boolean
          label: string
          table_id: string
          table_number: number
        }[]
      }
      get_table_credits: {
        Args: { p_bar_id: string; p_token: string }
        Returns: number
      }
      get_top_songs: {
        Args: { p_bar_id: string; p_limit?: number }
        Returns: {
          artist: string
          avg_bid: number
          max_bid: number
          times_played: number
          title: string
        }[]
      }
      initiate_recharge_qr: {
        Args: {
          p_amount: number
          p_bar_id: string
          p_table_id: string
          p_waiter_id?: string
        }
        Returns: Json
      }
      is_admin_of_bar: { Args: { p_bar_id: string }; Returns: boolean }
      is_song_blocked: {
        Args: { p_artist: string; p_bar_id: string; p_title: string }
        Returns: boolean
      }
      is_table_active: { Args: { p_table_id: string }; Returns: boolean }
      place_order: {
        Args: {
          p_bar_id: string
          p_items: Json
          p_token: string
          p_total: number
        }
        Returns: {
          bar_id: string
          created_at: string
          id: string
          items: Json
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
          total: number
          updated_at: string
          waiter_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      play_next_song: {
        Args: { p_bar_id: string }
        Returns: {
          added_at: string
          artist: string
          bar_id: string
          bid_amount: number
          dedication: string | null
          id: string
          played_at: string | null
          position: number
          status: Database["public"]["Enums"]["queue_status"]
          table_id: string | null
          thumbnail_url: string | null
          title: string
          youtube_video_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recharge_credits: {
        Args: {
          p_amount: number
          p_bar_id: string
          p_qr_code?: string
          p_reference?: string
          p_table_id: string
          p_verified_by?: string
        }
        Returns: number
      }
      record_ad_impression: {
        Args: { p_ad_id: string; p_source: string }
        Returns: undefined
      }
      record_daily_stats: { Args: { p_bar_id: string }; Returns: undefined }
      refresh_table_session: {
        Args: { p_bar_id: string; p_table_id: string }
        Returns: string
      }
      register_bar_admin: {
        Args: { p_bar_name: string; p_bar_slug: string; p_user_id: string }
        Returns: string
      }
      remove_from_queue: {
        Args: { p_bar_id: string; p_queue_id: string }
        Returns: undefined
      }
      reorder_queue: {
        Args: { p_bar_id: string; p_items: Json }
        Returns: undefined
      }
      request_song: {
        Args: {
          p_artist: string
          p_bar_id: string
          p_bid_amount?: number
          p_dedication?: string
          p_table_id: string
          p_thumbnail_url?: string
          p_title: string
          p_youtube_video_id?: string
        }
        Returns: {
          added_at: string
          artist: string
          bar_id: string
          bid_amount: number
          dedication: string | null
          id: string
          played_at: string | null
          position: number
          status: Database["public"]["Enums"]["queue_status"]
          table_id: string | null
          thumbnail_url: string | null
          title: string
          youtube_video_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_admin_chat_message: {
        Args: { p_bar_id: string; p_is_pinned?: boolean; p_message: string }
        Returns: {
          bar_id: string
          created_at: string
          id: string
          is_pinned: boolean
          message: string
          message_type: Database["public"]["Enums"]["message_type"]
          table_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "chat_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_chat_message: {
        Args: {
          p_bar_id: string
          p_message: string
          p_message_type?: Database["public"]["Enums"]["message_type"]
          p_token: string
        }
        Returns: {
          bar_id: string
          created_at: string
          id: string
          is_pinned: boolean
          message: string
          message_type: Database["public"]["Enums"]["message_type"]
          table_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "chat_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_message_safe: {
        Args: { p_bar_id: string; p_message: string; p_token: string }
        Returns: Json
      }
      skip_song: {
        Args: { p_bar_id: string; p_queue_id: string }
        Returns: undefined
      }
      toggle_table_active_rpc: {
        Args: { p_bar_id: string; p_table_id: string }
        Returns: boolean
      }
      unban_table_rpc: {
        Args: { p_bar_id: string; p_table_id: string }
        Returns: undefined
      }
      update_bar_config: {
        Args: { p_bar_id: string; p_config: Json }
        Returns: Json
      }
      validate_table_session: {
        Args: { p_bar_id: string; p_token: string }
        Returns: {
          bar_id: string
          connected_at: string | null
          credits: number
          id: string
          is_active: boolean
          is_banned: boolean
          label: string
          max_occupants: number
          number: number
          session_token: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tables"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_tv_pin: {
        Args: { p_bar_slug: string; p_pin: string }
        Returns: string
      }
      vote_on_song: {
        Args: {
          p_queue_id: string
          p_table_id: string
          p_vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "owner" | "manager"
      message_type: "msg" | "admin" | "reaction" | "system"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "delivered"
        | "cancelled"
      queue_status: "queued" | "playing" | "played" | "skipped"
      transaction_type: "recharge" | "bid" | "refund" | "reward"
      vote_type: "skip" | "keep"
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
      admin_role: ["owner", "manager"],
      message_type: ["msg", "admin", "reaction", "system"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "delivered",
        "cancelled",
      ],
      queue_status: ["queued", "playing", "played", "skipped"],
      transaction_type: ["recharge", "bid", "refund", "reward"],
      vote_type: ["skip", "keep"],
    },
  },
} as const

// Aliases usados en @rokka/supabase y las apps para los tipos de fila de
// géneros (no forman parte del formato estándar generado por `supabase gen types`).
export type GenresRow = Tables<'genres'>
export type GenreSongsRow = Tables<'genre_songs'>
