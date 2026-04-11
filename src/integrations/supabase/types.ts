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
      access_violation_log: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          route: string | null
          user_id: string | null
          violation_type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          route?: string | null
          user_id?: string | null
          violation_type?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          route?: string | null
          user_id?: string | null
          violation_type?: string
        }
        Relationships: []
      }
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
      ai_assistant_settings: {
        Row: {
          content_instructions: string
          created_at: string | null
          default_model: string
          default_tone: string
          id: string
          include_knowledge: boolean | null
          language_preference: string | null
          max_knowledge_entries: number | null
          response_style: string | null
          system_prompt: string | null
          translation_instructions: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_instructions?: string
          created_at?: string | null
          default_model?: string
          default_tone?: string
          id?: string
          include_knowledge?: boolean | null
          language_preference?: string | null
          max_knowledge_entries?: number | null
          response_style?: string | null
          system_prompt?: string | null
          translation_instructions?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_instructions?: string
          created_at?: string | null
          default_model?: string
          default_tone?: string
          id?: string
          include_knowledge?: boolean | null
          language_preference?: string | null
          max_knowledge_entries?: number | null
          response_style?: string | null
          system_prompt?: string | null
          translation_instructions?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_knowledge_entries: {
        Row: {
          char_count: number | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          source_name: string | null
          source_type: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          char_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          source_name?: string | null
          source_type?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          char_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          source_name?: string | null
          source_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempt_type: string
          attempts: number
          blocked_until: string | null
          first_attempt_at: string
          id: string
          identifier: string
          last_attempt_at: string
        }
        Insert: {
          attempt_type?: string
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier: string
          last_attempt_at?: string
        }
        Update: {
          attempt_type?: string
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier?: string
          last_attempt_at?: string
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
      blog_drafts: {
        Row: {
          auto_saved: boolean
          content_ar: string | null
          content_en: string | null
          created_at: string
          excerpt_ar: string | null
          excerpt_en: string | null
          form_snapshot: Json | null
          id: string
          post_id: string
          title_ar: string
          title_en: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          auto_saved?: boolean
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          form_snapshot?: Json | null
          id?: string
          post_id: string
          title_ar?: string
          title_en?: string | null
          user_id: string
          version_number?: number
        }
        Update: {
          auto_saved?: boolean
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          form_snapshot?: Json | null
          id?: string
          post_id?: string
          title_ar?: string
          title_en?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_drafts_post_id_fkey"
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
          canonical_url: string | null
          category: string
          content_ar: string | null
          content_en: string | null
          cover_image_url: string | null
          created_at: string
          excerpt_ar: string | null
          excerpt_en: string | null
          focus_keyword: string | null
          id: string
          keywords: string[] | null
          meta_description_ar: string | null
          meta_description_en: string | null
          meta_title_ar: string | null
          meta_title_en: string | null
          og_image_url: string | null
          published_at: string | null
          reading_time_minutes: number | null
          ref_id: string | null
          scheduled_at: string | null
          seo_score: number | null
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
          canonical_url?: string | null
          category?: string
          content_ar?: string | null
          content_en?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          focus_keyword?: string | null
          id?: string
          keywords?: string[] | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          ref_id?: string | null
          scheduled_at?: string | null
          seo_score?: number | null
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
          canonical_url?: string | null
          category?: string
          content_ar?: string | null
          content_en?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          focus_keyword?: string | null
          id?: string
          keywords?: string[] | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          ref_id?: string | null
          scheduled_at?: string | null
          seo_score?: number | null
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
      bnpl_providers: {
        Row: {
          color_hex: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          id: string
          installments_count: number
          interest_rate: number
          is_active: boolean
          logo_url: string | null
          max_amount: number
          min_amount: number
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          installments_count?: number
          interest_rate?: number
          is_active?: boolean
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          installments_count?: number
          interest_rate?: number
          is_active?: boolean
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      business_bnpl_providers: {
        Row: {
          bnpl_provider_id: string
          business_id: string
          created_at: string
          credit_limit: number | null
          id: string
          is_active: boolean
          merchant_code: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          bnpl_provider_id: string
          business_id: string
          created_at?: string
          credit_limit?: number | null
          id?: string
          is_active?: boolean
          merchant_code?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          bnpl_provider_id?: string
          business_id?: string
          created_at?: string
          credit_limit?: number | null
          id?: string
          is_active?: boolean
          merchant_code?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_bnpl_providers_bnpl_provider_id_fkey"
            columns: ["bnpl_provider_id"]
            isOneToOne: false
            referencedRelation: "bnpl_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_bnpl_providers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_branches: {
        Row: {
          additional_number: string | null
          address: string | null
          building_number: string | null
          business_id: string
          city_id: string | null
          contact_person: string | null
          country_id: string | null
          created_at: string
          customer_service_phone: string | null
          district: string | null
          email: string | null
          id: string
          is_active: boolean
          is_main: boolean
          latitude: number | null
          longitude: number | null
          mobile: string | null
          name_ar: string
          name_en: string | null
          national_id: string | null
          phone: string | null
          region: string | null
          sort_order: number
          street_name: string | null
          unified_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          additional_number?: string | null
          address?: string | null
          building_number?: string | null
          business_id: string
          city_id?: string | null
          contact_person?: string | null
          country_id?: string | null
          created_at?: string
          customer_service_phone?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          name_ar: string
          name_en?: string | null
          national_id?: string | null
          phone?: string | null
          region?: string | null
          sort_order?: number
          street_name?: string | null
          unified_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          additional_number?: string | null
          address?: string | null
          building_number?: string | null
          business_id?: string
          city_id?: string | null
          contact_person?: string | null
          country_id?: string | null
          created_at?: string
          customer_service_phone?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          name_ar?: string
          name_en?: string | null
          national_id?: string | null
          phone?: string | null
          region?: string | null
          sort_order?: number
          street_name?: string | null
          unified_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_branches_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_branches_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
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
      business_staff: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          role: Database["public"]["Enums"]["business_staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["business_staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["business_staff_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          additional_number: string | null
          address: string | null
          building_number: string | null
          business_number: number
          category_id: string | null
          city_id: string | null
          contact_person: string | null
          country_id: string | null
          cover_url: string | null
          created_at: string
          customer_service_phone: string | null
          description_ar: string | null
          description_en: string | null
          district: string | null
          email: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          mobile: string | null
          name_ar: string
          name_en: string | null
          national_id: string | null
          phone: string | null
          rating_avg: number
          rating_count: number
          ref_id: string
          region: string | null
          short_description_ar: string | null
          short_description_en: string | null
          street_name: string | null
          unified_number: string | null
          updated_at: string
          user_id: string
          username: string
          website: string | null
        }
        Insert: {
          additional_number?: string | null
          address?: string | null
          building_number?: string | null
          business_number?: number
          category_id?: string | null
          city_id?: string | null
          contact_person?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string
          customer_service_phone?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          mobile?: string | null
          name_ar: string
          name_en?: string | null
          national_id?: string | null
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          ref_id?: string
          region?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          street_name?: string | null
          unified_number?: string | null
          updated_at?: string
          user_id: string
          username: string
          website?: string | null
        }
        Update: {
          additional_number?: string | null
          address?: string | null
          building_number?: string | null
          business_number?: number
          category_id?: string | null
          city_id?: string | null
          contact_person?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string
          customer_service_phone?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          mobile?: string | null
          name_ar?: string
          name_en?: string | null
          national_id?: string | null
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          ref_id?: string
          region?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          street_name?: string | null
          unified_number?: string | null
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
      contract_amendments: {
        Row: {
          amendment_type: string
          client_approved_at: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          new_amount: number | null
          new_end_date: string | null
          provider_approved_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          amendment_type?: string
          client_approved_at?: string | null
          contract_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          new_amount?: number | null
          new_end_date?: string | null
          provider_approved_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          amendment_type?: string
          client_approved_at?: string | null
          contract_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          new_amount?: number | null
          new_end_date?: string | null
          provider_approved_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_attachments: {
        Row: {
          contract_id: string
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          milestone_id: string | null
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          file_name: string
          file_type?: string
          file_url: string
          id?: string
          milestone_id?: string | null
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          milestone_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_attachments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_attachments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "contract_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_measurements: {
        Row: {
          area_sqm: number | null
          contract_id: string
          created_at: string
          currency_code: string
          floor_label: string | null
          id: string
          length_mm: number | null
          location_ar: string | null
          location_en: string | null
          name_ar: string
          name_en: string | null
          notes: string | null
          piece_number: string
          quantity: number
          sort_order: number
          status: string
          total_cost: number | null
          unit_price: number
          updated_at: string
          width_mm: number | null
        }
        Insert: {
          area_sqm?: number | null
          contract_id: string
          created_at?: string
          currency_code?: string
          floor_label?: string | null
          id?: string
          length_mm?: number | null
          location_ar?: string | null
          location_en?: string | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          piece_number?: string
          quantity?: number
          sort_order?: number
          status?: string
          total_cost?: number | null
          unit_price?: number
          updated_at?: string
          width_mm?: number | null
        }
        Update: {
          area_sqm?: number | null
          contract_id?: string
          created_at?: string
          currency_code?: string
          floor_label?: string | null
          id?: string
          length_mm?: number | null
          location_ar?: string | null
          location_en?: string | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          piece_number?: string
          quantity?: number
          sort_order?: number
          status?: string
          total_cost?: number | null
          unit_price?: number
          updated_at?: string
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_measurements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
      contract_notes: {
        Row: {
          content: string
          contract_id: string
          created_at: string
          id: string
          note_type: string
          user_id: string
        }
        Insert: {
          content: string
          contract_id: string
          created_at?: string
          id?: string
          note_type?: string
          user_id: string
        }
        Update: {
          content?: string
          contract_id?: string
          created_at?: string
          id?: string
          note_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_notes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          category: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          notes_ar: string | null
          notes_en: string | null
          payment_terms_ar: string | null
          payment_terms_en: string | null
          penalties_ar: string | null
          penalties_en: string | null
          scope_of_work_ar: string | null
          scope_of_work_en: string | null
          sort_order: number
          terms_ar: string
          terms_en: string | null
          updated_at: string
          warranty_terms_ar: string | null
          warranty_terms_en: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          notes_ar?: string | null
          notes_en?: string | null
          payment_terms_ar?: string | null
          payment_terms_en?: string | null
          penalties_ar?: string | null
          penalties_en?: string | null
          scope_of_work_ar?: string | null
          scope_of_work_en?: string | null
          sort_order?: number
          terms_ar: string
          terms_en?: string | null
          updated_at?: string
          warranty_terms_ar?: string | null
          warranty_terms_en?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          notes_ar?: string | null
          notes_en?: string | null
          payment_terms_ar?: string | null
          payment_terms_en?: string | null
          penalties_ar?: string | null
          penalties_en?: string | null
          scope_of_work_ar?: string | null
          scope_of_work_en?: string | null
          sort_order?: number
          terms_ar?: string
          terms_en?: string | null
          updated_at?: string
          warranty_terms_ar?: string | null
          warranty_terms_en?: string | null
        }
        Relationships: []
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
          supervisor_email: string | null
          supervisor_name: string | null
          supervisor_phone: string | null
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
          supervisor_email?: string | null
          supervisor_name?: string | null
          supervisor_phone?: string | null
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
          supervisor_email?: string | null
          supervisor_name?: string | null
          supervisor_phone?: string | null
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
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contract_id: string | null
          created_at: string
          created_by: string | null
          group_avatar_url: string | null
          group_name: string | null
          id: string
          is_group: boolean
          last_message_at: string | null
          last_message_text: string | null
          participant_1: string
          participant_2: string
          ref_id: string | null
          updated_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1: string
          participant_2: string
          ref_id?: string | null
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1?: string
          participant_2?: string
          ref_id?: string | null
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
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
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
          ref_id: string | null
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
          ref_id?: string | null
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
          ref_id?: string | null
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
      membership_plans: {
        Row: {
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name_ar: string
          name_en: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          tier: Database["public"]["Enums"]["membership_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name_ar: string
          name_en: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          tier: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name_ar?: string
          name_en?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          tier?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      membership_subscriptions: {
        Row: {
          billing_cycle: string
          business_id: string | null
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          external_subscription_id: string | null
          id: string
          payment_method: string | null
          plan_id: string
          ref_id: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_method?: string | null
          plan_id: string
          ref_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string
          ref_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          business_id: string | null
          category: string
          content_ar: string
          content_en: string | null
          created_at: string
          id: string
          is_active: boolean
          is_global: boolean
          sort_order: number
          title_ar: string
          title_en: string | null
        }
        Insert: {
          business_id?: string | null
          category?: string
          content_ar: string
          content_en?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          sort_order?: number
          title_ar: string
          title_en?: string | null
        }
        Update: {
          business_id?: string | null
          category?: string
          content_ar?: string
          content_en?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          sort_order?: number
          title_ar?: string
          title_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
      operations_log: {
        Row: {
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          operation_type: string
          ref_id: string
          status: string
          title_ar: string
          title_en: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          operation_type: string
          ref_id?: string
          status?: string
          title_ar: string
          title_en?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          operation_type?: string
          ref_id?: string
          status?: string
          title_ar?: string
          title_en?: string | null
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code: string
          phone: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          user_id?: string
          verified?: boolean
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
          category: string
          completion_date: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_featured: boolean
          media_type: string
          media_url: string
          project_location: string | null
          sort_order: number
          title_ar: string
          title_en: string | null
        }
        Insert: {
          business_id: string
          category?: string
          completion_date?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          media_type?: string
          media_url: string
          project_location?: string | null
          sort_order?: number
          title_ar: string
          title_en?: string | null
        }
        Update: {
          business_id?: string
          category?: string
          completion_date?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          media_type?: string
          media_url?: string
          project_location?: string | null
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
          account_number: number
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          city_id: string | null
          country_code: string
          country_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          is_onboarded: boolean
          is_verified: boolean
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          phone: string | null
          phone_verified: boolean
          preferred_language: string
          ref_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: number
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city_id?: string | null
          country_code?: string
          country_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          is_onboarded?: boolean
          is_verified?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          ref_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: number
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city_id?: string | null
          country_code?: string
          country_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          is_onboarded?: boolean
          is_verified?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          ref_id?: string
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
          ref_id: string | null
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
          ref_id?: string | null
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
          ref_id?: string | null
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
          ref_id: string | null
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
          ref_id?: string | null
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
          ref_id?: string | null
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
      tags: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
          tag_group: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
          tag_group?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
          tag_group?: string
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
          ref_id: string | null
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
          ref_id?: string | null
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
          ref_id?: string | null
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
      check_rate_limit: {
        Args: {
          _block_minutes?: number
          _identifier: string
          _max_attempts?: number
          _type: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
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
      generate_ref_id: {
        Args: { _prefix: string; _seq_name: string }
        Returns: string
      }
      get_public_branch_data: {
        Args: { _branch_id: string }
        Returns: {
          address: string
          business_id: string
          city_id: string
          country_id: string
          district: string
          email: string
          id: string
          is_main: boolean
          latitude: number
          longitude: number
          mobile: string
          name_ar: string
          name_en: string
          phone: string
          region: string
          sort_order: number
          website: string
        }[]
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_business_role: {
        Args: {
          _business_id: string
          _roles: Database["public"]["Enums"]["business_staff_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_promotion_views: {
        Args: { _promotion_id: string }
        Returns: undefined
      }
      is_business_owner_or_manager: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_staff: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "individual" | "business" | "company"
      app_role: "admin" | "moderator" | "user" | "super_admin"
      business_staff_role: "owner" | "manager" | "editor" | "viewer"
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
      business_staff_role: ["owner", "manager", "editor", "viewer"],
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
