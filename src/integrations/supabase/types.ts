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
      admin_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blog_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string
          content_ar: string | null
          content_en: string | null
          cover_image_url: string | null
          created_at: string
          excerpt_ar: string | null
          excerpt_en: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title_ar: string
          title_en: string | null
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id: string
          category?: string
          content_ar?: string | null
          content_en?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title_ar: string
          title_en?: string | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string
          category?: string
          content_ar?: string | null
          content_en?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      business_services: {
        Row: {
          business_id: string
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          price_from: number | null
          price_to: number | null
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          price_from?: number | null
          price_to?: number | null
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          price_from?: number | null
          price_to?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category_id: string | null
          city_id: string | null
          country_id: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          email: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          name_ar: string
          name_en: string | null
          phone: string | null
          rating_avg: number
          rating_count: number
          updated_at: string
          user_id: string
          username: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          name_ar: string
          name_en?: string | null
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          updated_at?: string
          user_id: string
          username: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          name_ar?: string
          name_en?: string | null
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          updated_at?: string
          user_id?: string
          username?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_milestones: {
        Row: {
          amount: number
          completed_at: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          due_date: string | null
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          contract_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          due_date?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          contract_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          due_date?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_milestones_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          business_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_accepted_at: string | null
          client_id: string
          completed_at: string | null
          contract_number: string
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          end_date: string | null
          id: string
          provider_accepted_at: string | null
          provider_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          terms_ar: string | null
          terms_en: string | null
          title_ar: string
          title_en: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_accepted_at?: string | null
          client_id: string
          completed_at?: string | null
          contract_number?: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          provider_accepted_at?: string | null
          provider_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          terms_ar?: string | null
          terms_en?: string | null
          title_ar: string
          title_en?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_accepted_at?: string | null
          client_id?: string
          completed_at?: string | null
          contract_number?: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          provider_accepted_at?: string | null
          provider_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          terms_ar?: string | null
          terms_en?: string | null
          title_ar?: string
          title_en?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contract_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_text: string | null
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          currency_name_ar: string
          currency_name_en: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          phone_code: string
          tax_rate: number
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          currency_name_ar?: string
          currency_name_en?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          phone_code?: string
          tax_rate?: number
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          currency_name_ar?: string
          currency_name_en?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          phone_code?: string
          tax_rate?: number
        }
        Relationships: []
      }
      installment_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          plan_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          contract_id: string
          created_at: string
          currency_code: string
          down_payment: number
          id: string
          installment_amount: number
          notes: string | null
          number_of_installments: number
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          currency_code?: string
          down_payment?: number
          id?: string
          installment_amount: number
          notes?: string | null
          number_of_installments?: number
          start_date?: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          currency_code?: string
          down_payment?: number
          id?: string
          installment_amount?: number
          notes?: string | null
          number_of_installments?: number
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          client_id: string
          completed_at: string | null
          contract_id: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          provider_id: string
          request_number: string
          resolution_notes: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          title_ar: string
          title_en: string | null
          updated_at: string
          warranty_id: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          provider_id: string
          request_number?: string
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title_ar: string
          title_en?: string | null
          updated_at?: string
          warranty_id?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          provider_id?: string
          request_number?: string
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id?: string
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
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body_ar: string | null
          body_en: string | null
          created_at: string
          id: string
          is_read: boolean
          notification_type: string
          reference_id: string | null
          reference_type: string | null
          title_ar: string
          title_en: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          reference_id?: string | null
          reference_type?: string | null
          title_ar: string
          title_en?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          reference_id?: string | null
          reference_type?: string | null
          title_ar?: string
          title_en?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          is_secret: boolean
          setting_key: string
          setting_label_ar: string | null
          setting_label_en: string | null
          setting_value: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_secret?: boolean
          setting_key: string
          setting_label_ar?: string | null
          setting_label_en?: string | null
          setting_value?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_secret?: boolean
          setting_key?: string
          setting_label_ar?: string | null
          setting_label_en?: string | null
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          business_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_featured: boolean
          media_type: string
          media_url: string
          sort_order: number
          title_ar: string
          title_en: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          media_type?: string
          media_url: string
          sort_order?: number
          title_ar: string
          title_en?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          media_type?: string
          media_url?: string
          sort_order?: number
          title_ar?: string
          title_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_images: {
        Row: {
          caption_ar: string | null
          caption_en: string | null
          created_at: string
          id: string
          image_type: string
          image_url: string
          profile_id: string
          sort_order: number
        }
        Insert: {
          caption_ar?: string | null
          caption_en?: string | null
          created_at?: string
          id?: string
          image_type?: string
          image_url: string
          profile_id: string
          sort_order?: number
        }
        Update: {
          caption_ar?: string | null
          caption_en?: string | null
          created_at?: string
          id?: string
          image_type?: string
          image_url?: string
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_images_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          profile_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          profile_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_specifications: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          sort_order: number
          spec_name_ar: string
          spec_name_en: string | null
          spec_unit: string | null
          spec_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          sort_order?: number
          spec_name_ar: string
          spec_name_en?: string | null
          spec_unit?: string | null
          spec_value: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          sort_order?: number
          spec_name_ar?: string
          spec_name_en?: string | null
          spec_unit?: string | null
          spec_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_specifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_suppliers: {
        Row: {
          business_id: string
          created_at: string
          currency_code: string
          id: string
          is_available: boolean
          notes_ar: string | null
          notes_en: string | null
          price_range_from: number | null
          price_range_to: number | null
          profile_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency_code?: string
          id?: string
          is_available?: boolean
          notes_ar?: string | null
          notes_en?: string | null
          price_range_from?: number | null
          price_range_to?: number | null
          profile_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_available?: boolean
          notes_ar?: string | null
          notes_en?: string | null
          price_range_from?: number | null
          price_range_to?: number | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_suppliers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_systems: {
        Row: {
          applications_ar: string | null
          applications_en: string | null
          available_colors: string[] | null
          category: string
          cover_image_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          features_ar: string[] | null
          features_en: string[] | null
          id: string
          logo_url: string | null
          max_height_mm: number | null
          max_width_mm: number | null
          name_ar: string
          name_en: string | null
          origin_business_id: string | null
          profile_type: string
          recommendation_level: string
          slug: string
          sort_order: number
          sound_insulation_rating: number | null
          status: string
          strength_rating: number | null
          thermal_insulation_rating: number | null
          updated_at: string
          views_count: number
        }
        Insert: {
          applications_ar?: string | null
          applications_en?: string | null
          available_colors?: string[] | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          features_ar?: string[] | null
          features_en?: string[] | null
          id?: string
          logo_url?: string | null
          max_height_mm?: number | null
          max_width_mm?: number | null
          name_ar: string
          name_en?: string | null
          origin_business_id?: string | null
          profile_type?: string
          recommendation_level?: string
          slug: string
          sort_order?: number
          sound_insulation_rating?: number | null
          status?: string
          strength_rating?: number | null
          thermal_insulation_rating?: number | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          applications_ar?: string | null
          applications_en?: string | null
          available_colors?: string[] | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          features_ar?: string[] | null
          features_en?: string[] | null
          id?: string
          logo_url?: string | null
          max_height_mm?: number | null
          max_width_mm?: number | null
          name_ar?: string
          name_en?: string | null
          origin_business_id?: string | null
          profile_type?: string
          recommendation_level?: string
          slug?: string
          sort_order?: number
          sound_insulation_rating?: number | null
          status?: string
          strength_rating?: number | null
          thermal_insulation_rating?: number | null
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_systems_origin_business_id_fkey"
            columns: ["origin_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          city_id: string | null
          country_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          is_verified: boolean
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          phone: string | null
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          is_verified?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          is_verified?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      project_images: {
        Row: {
          caption_ar: string | null
          caption_en: string | null
          created_at: string
          id: string
          image_url: string
          project_id: string
          sort_order: number
        }
        Insert: {
          caption_ar?: string | null
          caption_en?: string | null
          created_at?: string
          id?: string
          image_url: string
          project_id: string
          sort_order?: number
        }
        Update: {
          caption_ar?: string | null
          caption_en?: string | null
          created_at?: string
          id?: string
          image_url?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          business_id: string
          category_id: string | null
          city_id: string | null
          client_name: string | null
          completion_date: string | null
          cover_image_url: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          duration_days: number | null
          id: string
          is_featured: boolean
          project_cost: number | null
          sort_order: number
          status: string
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id?: string | null
          city_id?: string | null
          client_name?: string | null
          completion_date?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          duration_days?: number | null
          id?: string
          is_featured?: boolean
          project_cost?: number | null
          sort_order?: number
          status?: string
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string | null
          city_id?: string | null
          client_name?: string | null
          completion_date?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          duration_days?: number | null
          id?: string
          is_featured?: boolean
          project_cost?: number | null
          sort_order?: number
          status?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          business_id: string
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          offer_price: number | null
          original_price: number | null
          promotion_type: Database["public"]["Enums"]["promotion_type"]
          sort_order: number
          start_date: string
          title_ar: string
          title_en: string | null
          updated_at: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          business_id: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          offer_price?: number | null
          original_price?: number | null
          promotion_type?: Database["public"]["Enums"]["promotion_type"]
          sort_order?: number
          start_date?: string
          title_ar: string
          title_en?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          offer_price?: number | null
          original_price?: number | null
          promotion_type?: Database["public"]["Enums"]["promotion_type"]
          sort_order?: number
          start_date?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_installment_settings: {
        Row: {
          business_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          down_payment_percentage: number | null
          id: string
          is_enabled: boolean
          max_installments: number | null
          min_amount: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          down_payment_percentage?: number | null
          id?: string
          is_enabled?: boolean
          max_installments?: number | null
          min_amount?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          down_payment_percentage?: number | null
          id?: string
          is_enabled?: boolean
          max_installments?: number | null
          min_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_installment_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string
          content: string | null
          created_at: string
          id: string
          is_verified: boolean
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      warranties: {
        Row: {
          contract_id: string
          coverage_ar: string | null
          coverage_en: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["warranty_status"]
          title_ar: string
          title_en: string | null
          updated_at: string
          warranty_type: Database["public"]["Enums"]["warranty_type"]
        }
        Insert: {
          contract_id: string
          coverage_ar?: string | null
          coverage_en?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["warranty_status"]
          title_ar: string
          title_en?: string | null
          updated_at?: string
          warranty_type?: Database["public"]["Enums"]["warranty_type"]
        }
        Update: {
          contract_id?: string
          coverage_ar?: string | null
          coverage_en?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["warranty_status"]
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          warranty_type?: Database["public"]["Enums"]["warranty_type"]
        }
        Relationships: [
          {
            foreignKeyName: "warranties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          _action_url?: string
          _body_ar: string
          _body_en: string
          _ref_id?: string
          _ref_type?: string
          _title_ar: string
          _title_en: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "individual" | "business" | "company"
      app_role: "admin" | "moderator" | "user" | "super_admin"
      contract_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "completed"
        | "cancelled"
        | "disputed"
      maintenance_priority: "low" | "medium" | "high" | "urgent"
      maintenance_status:
        | "submitted"
        | "under_review"
        | "in_progress"
        | "completed"
        | "rejected"
      membership_tier: "free" | "basic" | "premium" | "enterprise"
      milestone_status: "pending" | "active" | "completed" | "disputed"
      promotion_type: "ad" | "offer" | "video"
      warranty_status: "active" | "expired" | "claimed" | "void"
      warranty_type: "comprehensive" | "limited" | "extended"
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
      account_type: ["individual", "business", "company"],
      app_role: ["admin", "moderator", "user", "super_admin"],
      contract_status: [
        "draft",
        "pending_approval",
        "active",
        "completed",
        "cancelled",
        "disputed",
      ],
      maintenance_priority: ["low", "medium", "high", "urgent"],
      maintenance_status: [
        "submitted",
        "under_review",
        "in_progress",
        "completed",
        "rejected",
      ],
      membership_tier: ["free", "basic", "premium", "enterprise"],
      milestone_status: ["pending", "active", "completed", "disputed"],
      promotion_type: ["ad", "offer", "video"],
      warranty_status: ["active", "expired", "claimed", "void"],
      warranty_type: ["comprehensive", "limited", "extended"],
    },
  },
} as const
