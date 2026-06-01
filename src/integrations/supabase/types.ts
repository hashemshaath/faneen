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
      ab_events: {
        Row: {
          created_at: string
          event_type: string
          experiment_id: string
          id: number
          variant_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          experiment_id: string
          id?: number
          variant_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          experiment_id?: string
          id?: number
          variant_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_events_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_experiments: {
        Row: {
          auto_promote: boolean
          confidence_threshold: number
          created_at: string
          description: string | null
          id: string
          key: string
          min_sample_per_variant: number
          promoted_at: string | null
          status: string
          updated_at: string
          winner_variant_id: string | null
        }
        Insert: {
          auto_promote?: boolean
          confidence_threshold?: number
          created_at?: string
          description?: string | null
          id?: string
          key: string
          min_sample_per_variant?: number
          promoted_at?: string | null
          status?: string
          updated_at?: string
          winner_variant_id?: string | null
        }
        Update: {
          auto_promote?: boolean
          confidence_threshold?: number
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          min_sample_per_variant?: number
          promoted_at?: string | null
          status?: string
          updated_at?: string
          winner_variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_experiments_winner_fk"
            columns: ["winner_variant_id"]
            isOneToOne: false
            referencedRelation: "ab_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_variants: {
        Row: {
          content: Json
          created_at: string
          experiment_id: string
          id: string
          is_active: boolean
          is_control: boolean
          key: string
          updated_at: string
          weight: number
        }
        Insert: {
          content?: Json
          created_at?: string
          experiment_id: string
          id?: string
          is_active?: boolean
          is_control?: boolean
          key: string
          updated_at?: string
          weight?: number
        }
        Update: {
          content?: Json
          created_at?: string
          experiment_id?: string
          id?: string
          is_active?: boolean
          is_control?: boolean
          key?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ab_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
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
      addresses: {
        Row: {
          additional_number: string | null
          address: string | null
          address_en: string | null
          address_type: string
          building_number: string | null
          city_id: string | null
          country_code: string
          country_id: string | null
          created_at: string
          created_by: string | null
          district: string | null
          district_en: string | null
          id: string
          is_primary: boolean
          is_verified: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          national_address_raw: Json | null
          national_address_source: string | null
          owner_id: string
          owner_type: string
          post_code: string | null
          region: string | null
          region_en: string | null
          short_address: string | null
          source: string
          street_name: string | null
          street_name_en: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
        }
        Insert: {
          additional_number?: string | null
          address?: string | null
          address_en?: string | null
          address_type?: string
          building_number?: string | null
          city_id?: string | null
          country_code?: string
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          district_en?: string | null
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          national_address_raw?: Json | null
          national_address_source?: string | null
          owner_id: string
          owner_type: string
          post_code?: string | null
          region?: string | null
          region_en?: string | null
          short_address?: string | null
          source?: string
          street_name?: string | null
          street_name_en?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
        }
        Update: {
          additional_number?: string | null
          address?: string | null
          address_en?: string | null
          address_type?: string
          building_number?: string | null
          city_id?: string | null
          country_code?: string
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          district_en?: string | null
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          national_address_raw?: Json | null
          national_address_source?: string | null
          owner_id?: string
          owner_type?: string
          post_code?: string | null
          region?: string | null
          region_en?: string | null
          short_address?: string | null
          source?: string
          street_name?: string | null
          street_name_en?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
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
      admin_client_site_access_audit: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          site_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          site_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_client_site_access_audit_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_client_site_operations_notes: {
        Row: {
          admin_user_id: string
          archived_at: string | null
          category: string
          created_at: string
          id: string
          note: string
          site_id: string
        }
        Insert: {
          admin_user_id: string
          archived_at?: string | null
          category?: string
          created_at?: string
          id?: string
          note: string
          site_id: string
        }
        Update: {
          admin_user_id?: string
          archived_at?: string | null
          category?: string
          created_at?: string
          id?: string
          note?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_client_site_operations_notes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_operational_notes: {
        Row: {
          created_at: string
          created_by: string | null
          entity_type: string
          id: string
          metadata: Json
          note: string
          ref_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          note: string
          ref_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          note?: string
          ref_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
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
      auth_temporary_login_codes: {
        Row: {
          attempt_count: number
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          identifier: string
          max_attempts: number
          metadata: Json | null
          purpose: string
          revoked_at: string | null
          role_hint: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          identifier: string
          max_attempts?: number
          metadata?: Json | null
          purpose?: string
          revoked_at?: string | null
          role_hint?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          identifier?: string
          max_attempts?: number
          metadata?: Json | null
          purpose?: string
          revoked_at?: string | null
          role_hint?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badge_clicks: {
        Row: {
          business_id: string
          created_at: string
          id: string
          referrer: string | null
          session_token: string | null
          user_agent: string | null
          username: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          referrer?: string | null
          session_token?: string | null
          user_agent?: string | null
          username: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          referrer?: string | null
          session_token?: string | null
          user_agent?: string | null
          username?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_clicks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_clicks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_conversions: {
        Row: {
          business_id: string
          created_at: string
          event_type: string
          id: string
          session_token: string
          source_page: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          session_token: string
          source_page?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          session_token?: string
          source_page?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_conversions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_conversions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_impressions: {
        Row: {
          business_id: string
          created_at: string
          id: string
          referrer_host: string | null
          user_agent: string | null
          username: string
          variant: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          referrer_host?: string | null
          user_agent?: string | null
          username: string
          variant?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          referrer_host?: string | null
          user_agent?: string | null
          username?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_impressions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_impressions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      barcode_entity_links: {
        Row: {
          barcode_id: string
          created_at: string
          created_by: string | null
          id: string
          linked_entity_id: string
          linked_entity_type: string
          relationship_type: string
        }
        Insert: {
          barcode_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          linked_entity_id: string
          linked_entity_type: string
          relationship_type: string
        }
        Update: {
          barcode_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          linked_entity_id?: string
          linked_entity_type?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "barcode_entity_links_barcode_id_fkey"
            columns: ["barcode_id"]
            isOneToOne: false
            referencedRelation: "barcode_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      barcode_events: {
        Row: {
          actor_business_id: string | null
          actor_role: string | null
          actor_user_id: string | null
          barcode_id: string
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          user_agent_hash: string | null
        }
        Insert: {
          actor_business_id?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          barcode_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          user_agent_hash?: string | null
        }
        Update: {
          actor_business_id?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          barcode_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barcode_events_barcode_id_fkey"
            columns: ["barcode_id"]
            isOneToOne: false
            referencedRelation: "barcode_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      barcode_registry: {
        Row: {
          archived_at: string | null
          barcode_code: string
          created_at: string
          created_by: string | null
          current_scan_token_hash: string | null
          entity_id: string
          entity_type: string
          frozen_at: string | null
          id: string
          last_scanned_at: string | null
          metadata: Json | null
          owner_business_id: string | null
          owner_user_id: string | null
          permanent_public_code: boolean
          scan_count: number
          scan_url_path: string | null
          source: string
          status: string
          transfer_from_user_id: string | null
          transfer_to_user_id: string | null
          transferred_at: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          barcode_code: string
          created_at?: string
          created_by?: string | null
          current_scan_token_hash?: string | null
          entity_id: string
          entity_type: string
          frozen_at?: string | null
          id?: string
          last_scanned_at?: string | null
          metadata?: Json | null
          owner_business_id?: string | null
          owner_user_id?: string | null
          permanent_public_code?: boolean
          scan_count?: number
          scan_url_path?: string | null
          source?: string
          status?: string
          transfer_from_user_id?: string | null
          transfer_to_user_id?: string | null
          transferred_at?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          barcode_code?: string
          created_at?: string
          created_by?: string | null
          current_scan_token_hash?: string | null
          entity_id?: string
          entity_type?: string
          frozen_at?: string | null
          id?: string
          last_scanned_at?: string | null
          metadata?: Json | null
          owner_business_id?: string | null
          owner_user_id?: string | null
          permanent_public_code?: boolean
          scan_count?: number
          scan_url_path?: string | null
          source?: string
          status?: string
          transfer_from_user_id?: string | null
          transfer_to_user_id?: string | null
          transferred_at?: string | null
          updated_at?: string
          visibility?: string
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
          faq: Json
          focus_keyword: string | null
          guide_topic: string | null
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
          faq?: Json
          focus_keyword?: string | null
          guide_topic?: string | null
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
          faq?: Json
          focus_keyword?: string | null
          guide_topic?: string | null
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
      bookings: {
        Row: {
          booking_date: string
          business_id: string
          cancellation_reason: string | null
          cancelled_by: string | null
          client_id: string
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          is_demo: boolean
          legacy_ref_id: string | null
          notes: string | null
          ref_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          booking_date: string
          business_id: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          client_id: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_demo?: boolean
          legacy_ref_id?: string | null
          notes?: string | null
          ref_id?: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          booking_date?: string
          business_id?: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          client_id?: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_demo?: boolean
          legacy_ref_id?: string | null
          notes?: string | null
          ref_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_addition_requests: {
        Row: {
          admin_notes: string | null
          approved_brand_id: string | null
          brand_id: string | null
          business_id: string
          business_service_id: string | null
          created_at: string
          description: string | null
          documents: Json
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string | null
          notes: string | null
          proposed_country_of_origin_code: string | null
          proposed_manufacturing_countries: Json
          proposed_sector_ids: string[]
          proposed_service_ids: string[]
          ref_id: string | null
          reject_reason: string | null
          relationship_type: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sector_id: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_brand_id?: string | null
          brand_id?: string | null
          business_id: string
          business_service_id?: string | null
          created_at?: string
          description?: string | null
          documents?: Json
          id?: string
          logo_url?: string | null
          name_ar: string
          name_en?: string | null
          notes?: string | null
          proposed_country_of_origin_code?: string | null
          proposed_manufacturing_countries?: Json
          proposed_sector_ids?: string[]
          proposed_service_ids?: string[]
          ref_id?: string | null
          reject_reason?: string | null
          relationship_type?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_id?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_brand_id?: string | null
          brand_id?: string | null
          business_id?: string
          business_service_id?: string | null
          created_at?: string
          description?: string | null
          documents?: Json
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          proposed_country_of_origin_code?: string | null
          proposed_manufacturing_countries?: Json
          proposed_sector_ids?: string[]
          proposed_service_ids?: string[]
          ref_id?: string | null
          reject_reason?: string | null
          relationship_type?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_id?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_addition_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_addition_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_addition_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_addition_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_addition_requests_business_service_id_fkey"
            columns: ["business_service_id"]
            isOneToOne: false
            referencedRelation: "business_services"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          brand_id: string | null
          brand_request_id: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          provider_brand_link_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          brand_id?: string | null
          brand_request_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          provider_brand_link_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          brand_id?: string | null
          brand_request_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          provider_brand_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_audit_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_audit_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_audit_logs_brand_request_id_fkey"
            columns: ["brand_request_id"]
            isOneToOne: false
            referencedRelation: "brand_addition_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_audit_logs_provider_brand_link_id_fkey"
            columns: ["provider_brand_link_id"]
            isOneToOne: false
            referencedRelation: "business_service_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_catalog: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          brand_owner_company: string | null
          country_of_origin_code: string | null
          country_of_origin_name_ar: string | null
          country_of_origin_name_en: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          founded_year: number | null
          id: string
          is_active: boolean
          is_local: boolean
          is_verified: boolean
          logo_url: string | null
          merged_into_brand_id: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          ref_id: string | null
          rejection_reason: string | null
          sector_id: string | null
          slug: string | null
          source: string
          status: string
          submitted_by: string | null
          updated_at: string
          verification_status: string
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          brand_owner_company?: string | null
          country_of_origin_code?: string | null
          country_of_origin_name_ar?: string | null
          country_of_origin_name_en?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          founded_year?: number | null
          id?: string
          is_active?: boolean
          is_local?: boolean
          is_verified?: boolean
          logo_url?: string | null
          merged_into_brand_id?: string | null
          metadata?: Json
          name_ar: string
          name_en?: string | null
          ref_id?: string | null
          rejection_reason?: string | null
          sector_id?: string | null
          slug?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          brand_owner_company?: string | null
          country_of_origin_code?: string | null
          country_of_origin_name_ar?: string | null
          country_of_origin_name_en?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          founded_year?: number | null
          id?: string
          is_active?: boolean
          is_local?: boolean
          is_verified?: boolean
          logo_url?: string | null
          merged_into_brand_id?: string | null
          metadata?: Json
          name_ar?: string
          name_en?: string | null
          ref_id?: string | null
          rejection_reason?: string | null
          sector_id?: string | null
          slug?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_catalog_merged_into_brand_id_fkey"
            columns: ["merged_into_brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_catalog_merged_into_brand_id_fkey"
            columns: ["merged_into_brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_manufacturing_countries: {
        Row: {
          brand_id: string
          country_code: string
          country_name_ar: string | null
          country_name_en: string | null
          created_at: string
          id: string
          manufacturing_type: string
          notes_ar: string | null
          notes_en: string | null
        }
        Insert: {
          brand_id: string
          country_code: string
          country_name_ar?: string | null
          country_name_en?: string | null
          created_at?: string
          id?: string
          manufacturing_type?: string
          notes_ar?: string | null
          notes_en?: string | null
        }
        Update: {
          brand_id?: string
          country_code?: string
          country_name_ar?: string | null
          country_name_en?: string | null
          created_at?: string
          id?: string
          manufacturing_type?: string
          notes_ar?: string | null
          notes_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_manufacturing_countries_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_manufacturing_countries_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_sector_links: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          is_primary: boolean
          sector_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          sector_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          sector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_sector_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_sector_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_sector_links_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      business_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          business_id: string | null
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          business_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          business_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "business_audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_availability: {
        Row: {
          business_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          max_bookings_per_slot: number
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_active?: boolean
          max_bookings_per_slot?: number
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          max_bookings_per_slot?: number
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_badge_status: {
        Row: {
          business_id: string
          checked_url: string | null
          consecutive_misses: number
          created_at: string
          error: string | null
          found: boolean
          http_status: number | null
          id: string
          last_checked_at: string | null
          last_found_at: string | null
          matched_url: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          checked_url?: string | null
          consecutive_misses?: number
          created_at?: string
          error?: string | null
          found?: boolean
          http_status?: number | null
          id?: string
          last_checked_at?: string | null
          last_found_at?: string | null
          matched_url?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          checked_url?: string | null
          consecutive_misses?: number
          created_at?: string
          error?: string | null
          found?: boolean
          http_status?: number | null
          id?: string
          last_checked_at?: string | null
          last_found_at?: string | null
          matched_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_badge_status_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_badge_status_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "business_bnpl_providers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
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
          is_demo: boolean
          is_main: boolean
          latitude: number | null
          legacy_ref_id: string | null
          location_type: string | null
          longitude: number | null
          mobile: string | null
          name_ar: string
          name_en: string | null
          national_id: string | null
          phone: string | null
          phone_country_code: string | null
          phone_national: string | null
          ref_id: string | null
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
          is_demo?: boolean
          is_main?: boolean
          latitude?: number | null
          legacy_ref_id?: string | null
          location_type?: string | null
          longitude?: number | null
          mobile?: string | null
          name_ar: string
          name_en?: string | null
          national_id?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          ref_id?: string | null
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
          is_demo?: boolean
          is_main?: boolean
          latitude?: number | null
          legacy_ref_id?: string | null
          location_type?: string | null
          longitude?: number | null
          mobile?: string | null
          name_ar?: string
          name_en?: string | null
          national_id?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          ref_id?: string | null
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
            foreignKeyName: "business_branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
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
      business_internal_notes: {
        Row: {
          author_user_id: string
          body: string
          business_id: string
          created_at: string
          deleted_at: string | null
          id: string
          pinned: boolean
          ref_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          author_user_id: string
          body: string
          business_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          pinned?: boolean
          ref_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          business_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          pinned?: boolean
          ref_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_notification_preferences: {
        Row: {
          business_id: string
          created_at: string
          email_bookings: boolean
          email_contracts: boolean
          email_enabled: boolean
          email_leads: boolean
          email_maintenance_updates: boolean
          email_marketing: boolean
          email_messages: boolean
          id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email_bookings?: boolean
          email_contracts?: boolean
          email_enabled?: boolean
          email_leads?: boolean
          email_maintenance_updates?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email_bookings?: boolean
          email_contracts?: boolean
          email_enabled?: boolean
          email_leads?: boolean
          email_maintenance_updates?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_notification_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_notification_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_service_areas: {
        Row: {
          business_id: string
          city: string
          country_id: string | null
          created_at: string
          district: string | null
          id: string
          is_primary: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          city: string
          country_id?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_primary?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          city?: string
          country_id?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_primary?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_service_areas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_areas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_areas_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      business_service_brands: {
        Row: {
          authorization_document_url: string | null
          authorization_ends_at: string | null
          authorization_starts_at: string | null
          authorization_status: string
          brand_id: string
          business_id: string
          business_service_id: string
          created_at: string
          id: string
          ref_id: string | null
          rejection_reason: string | null
          relationship_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          authorization_document_url?: string | null
          authorization_ends_at?: string | null
          authorization_starts_at?: string | null
          authorization_status?: string
          brand_id: string
          business_id: string
          business_service_id: string
          created_at?: string
          id?: string
          ref_id?: string | null
          rejection_reason?: string | null
          relationship_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          authorization_document_url?: string | null
          authorization_ends_at?: string | null
          authorization_starts_at?: string | null
          authorization_status?: string
          brand_id?: string
          business_id?: string
          business_service_id?: string
          created_at?: string
          id?: string
          ref_id?: string | null
          rejection_reason?: string | null
          relationship_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_service_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_brands_business_service_id_fkey"
            columns: ["business_service_id"]
            isOneToOne: false
            referencedRelation: "business_services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_service_countries: {
        Row: {
          business_id: string
          country_id: string
          coverage_note: string | null
          created_at: string
          id: string
          is_primary: boolean
        }
        Insert: {
          business_id: string
          country_id: string
          coverage_note?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
        }
        Update: {
          business_id?: string
          country_id?: string
          coverage_note?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_service_countries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_countries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_service_countries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      business_services: {
        Row: {
          admin_note: string | null
          admin_status: string
          business_id: string
          category_id: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          is_featured: boolean
          is_premium_service: boolean
          name_ar: string
          name_en: string | null
          price_from: number | null
          price_to: number | null
          provider_note: string | null
          provider_status: string
          rejection_reason: string | null
          required_plan_tier:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          requires_admin_review: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          source_sub_service_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          admin_status?: string
          business_id: string
          category_id?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_featured?: boolean
          is_premium_service?: boolean
          name_ar: string
          name_en?: string | null
          price_from?: number | null
          price_to?: number | null
          provider_note?: string | null
          provider_status?: string
          rejection_reason?: string | null
          required_plan_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          requires_admin_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          source_sub_service_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          admin_status?: string
          business_id?: string
          category_id?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_featured?: boolean
          is_premium_service?: boolean
          name_ar?: string
          name_en?: string | null
          price_from?: number | null
          price_to?: number | null
          provider_note?: string | null
          provider_status?: string
          rejection_reason?: string | null
          required_plan_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          requires_admin_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          source_sub_service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
          },
        ]
      }
      business_staff: {
        Row: {
          business_id: string
          created_at: string
          department: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          is_primary_manager: boolean
          permissions_override: Json
          ref_id: string
          role: Database["public"]["Enums"]["business_staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_primary_manager?: boolean
          permissions_override?: Json
          ref_id: string
          role?: Database["public"]["Enums"]["business_staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_primary_manager?: boolean
          permissions_override?: Json
          ref_id?: string
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
          {
            foreignKeyName: "business_staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          business_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          permissions: Json | null
          ref_id: string | null
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          business_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          permissions?: Json | null
          ref_id?: string | null
          role?: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          permissions?: Json | null
          ref_id?: string | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_staff_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_staff_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_staff_permissions: {
        Row: {
          business_staff_id: string
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: Database["public"]["Enums"]["business_module"]
          updated_at: string
        }
        Insert: {
          business_staff_id: string
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["business_module"]
          updated_at?: string
        }
        Update: {
          business_staff_id?: string
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["business_module"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_staff_permissions_business_staff_id_fkey"
            columns: ["business_staff_id"]
            isOneToOne: false
            referencedRelation: "business_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_tax_profiles: {
        Row: {
          business_id: string
          certificate_path: string | null
          country_id: string
          created_at: string
          id: string
          inclusive_default: boolean
          scheme: string
          status: string
          tax_number: string | null
          tax_rate: number | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          business_id: string
          certificate_path?: string | null
          country_id: string
          created_at?: string
          id?: string
          inclusive_default?: boolean
          scheme: string
          status: string
          tax_number?: string | null
          tax_rate?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          business_id?: string
          certificate_path?: string | null
          country_id?: string
          created_at?: string
          id?: string
          inclusive_default?: boolean
          scheme?: string
          status?: string
          tax_number?: string | null
          tax_rate?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tax_profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      business_team_members: {
        Row: {
          business_staff_id: string
          created_by: string | null
          id: string
          is_active: boolean
          joined_at: string
          role_in_team: string
          team_id: string
        }
        Insert: {
          business_staff_id: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          role_in_team?: string
          team_id: string
        }
        Update: {
          business_staff_id?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          role_in_team?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_team_members_business_staff_id_fkey"
            columns: ["business_staff_id"]
            isOneToOne: false
            referencedRelation: "business_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "business_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      business_teams: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          ref_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          ref_id?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          ref_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_teams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_teams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          account_manager_email: string | null
          account_manager_name: string | null
          account_manager_phone: string | null
          account_manager_position: string | null
          additional_number: string | null
          address: string | null
          address_en: string | null
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["business_approval_status"]
          building_number: string | null
          business_number: number
          capabilities: Json
          category_id: string | null
          city_id: string | null
          contact_person: string | null
          country_code: string | null
          country_id: string | null
          cover_url: string | null
          cr_document_mime: string | null
          cr_document_path: string | null
          cr_document_size: number | null
          cr_document_uploaded_at: string | null
          cr_document_uploaded_by: string | null
          cr_document_url: string | null
          cr_expiry_date: string | null
          cr_issue_date: string | null
          cr_legal_entity: string | null
          cr_owner_name: string | null
          cr_scan_at: string | null
          cr_scan_data: Json | null
          cr_scan_raw: string | null
          created_at: string
          customer_service_phone: string | null
          default_currency: string | null
          default_locale: string | null
          description_ar: string | null
          description_en: string | null
          district: string | null
          district_en: string | null
          email: string | null
          entity_type: string | null
          floor_number: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          is_verified: boolean
          last_active_at: string | null
          latitude: number | null
          legacy_ref_id: string | null
          logo_url: string | null
          longitude: number | null
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          mobile: string | null
          name_ar: string
          name_en: string | null
          national_id: string | null
          onboarding_completion: number
          phone: string | null
          phone_country_code: string | null
          phone_national: string | null
          rating_avg: number
          rating_count: number
          ref_id: string
          region: string | null
          region_en: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sectors: string[]
          short_address: string | null
          short_description_ar: string | null
          short_description_en: string | null
          street_name: string | null
          street_name_en: string | null
          sub_services: string[]
          submitted_at: string | null
          timezone: string | null
          unified_number: string | null
          unit_number: string | null
          unit_type: string | null
          updated_at: string
          user_id: string
          username: string
          username_status: Database["public"]["Enums"]["username_status"]
          vat_number: string | null
          website: string | null
        }
        Insert: {
          account_manager_email?: string | null
          account_manager_name?: string | null
          account_manager_phone?: string | null
          account_manager_position?: string | null
          additional_number?: string | null
          address?: string | null
          address_en?: string | null
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["business_approval_status"]
          building_number?: string | null
          business_number?: number
          capabilities?: Json
          category_id?: string | null
          city_id?: string | null
          contact_person?: string | null
          country_code?: string | null
          country_id?: string | null
          cover_url?: string | null
          cr_document_mime?: string | null
          cr_document_path?: string | null
          cr_document_size?: number | null
          cr_document_uploaded_at?: string | null
          cr_document_uploaded_by?: string | null
          cr_document_url?: string | null
          cr_expiry_date?: string | null
          cr_issue_date?: string | null
          cr_legal_entity?: string | null
          cr_owner_name?: string | null
          cr_scan_at?: string | null
          cr_scan_data?: Json | null
          cr_scan_raw?: string | null
          created_at?: string
          customer_service_phone?: string | null
          default_currency?: string | null
          default_locale?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          district_en?: string | null
          email?: string | null
          entity_type?: string | null
          floor_number?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_verified?: boolean
          last_active_at?: string | null
          latitude?: number | null
          legacy_ref_id?: string | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          mobile?: string | null
          name_ar: string
          name_en?: string | null
          national_id?: string | null
          onboarding_completion?: number
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          rating_avg?: number
          rating_count?: number
          ref_id?: string
          region?: string | null
          region_en?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sectors?: string[]
          short_address?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          street_name?: string | null
          street_name_en?: string | null
          sub_services?: string[]
          submitted_at?: string | null
          timezone?: string | null
          unified_number?: string | null
          unit_number?: string | null
          unit_type?: string | null
          updated_at?: string
          user_id: string
          username: string
          username_status?: Database["public"]["Enums"]["username_status"]
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          account_manager_email?: string | null
          account_manager_name?: string | null
          account_manager_phone?: string | null
          account_manager_position?: string | null
          additional_number?: string | null
          address?: string | null
          address_en?: string | null
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["business_approval_status"]
          building_number?: string | null
          business_number?: number
          capabilities?: Json
          category_id?: string | null
          city_id?: string | null
          contact_person?: string | null
          country_code?: string | null
          country_id?: string | null
          cover_url?: string | null
          cr_document_mime?: string | null
          cr_document_path?: string | null
          cr_document_size?: number | null
          cr_document_uploaded_at?: string | null
          cr_document_uploaded_by?: string | null
          cr_document_url?: string | null
          cr_expiry_date?: string | null
          cr_issue_date?: string | null
          cr_legal_entity?: string | null
          cr_owner_name?: string | null
          cr_scan_at?: string | null
          cr_scan_data?: Json | null
          cr_scan_raw?: string | null
          created_at?: string
          customer_service_phone?: string | null
          default_currency?: string | null
          default_locale?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          district_en?: string | null
          email?: string | null
          entity_type?: string | null
          floor_number?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_verified?: boolean
          last_active_at?: string | null
          latitude?: number | null
          legacy_ref_id?: string | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          mobile?: string | null
          name_ar?: string
          name_en?: string | null
          national_id?: string | null
          onboarding_completion?: number
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          rating_avg?: number
          rating_count?: number
          ref_id?: string
          region?: string | null
          region_en?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sectors?: string[]
          short_address?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          street_name?: string | null
          street_name_en?: string | null
          sub_services?: string[]
          submitted_at?: string | null
          timezone?: string | null
          unified_number?: string | null
          unit_number?: string | null
          unit_type?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          username_status?: Database["public"]["Enums"]["username_status"]
          vat_number?: string | null
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
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
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
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          updated_at?: string
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
      client_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          bound_contract_id: string | null
          business_id: string | null
          cancelled_at: string | null
          created_at: string
          draft_payload: Json | null
          email_hmac: string | null
          email_lower: string
          expires_at: string
          id: string
          invited_by: string
          last_reminder_at: string | null
          recipient_name: string | null
          recipient_phone: string | null
          ref_id: string
          reminder_count: number
          status: Database["public"]["Enums"]["client_invite_status"]
          template_version_id: string | null
          token_hash: string
          updated_at: string
          work_type: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          bound_contract_id?: string | null
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          draft_payload?: Json | null
          email_hmac?: string | null
          email_lower: string
          expires_at?: string
          id?: string
          invited_by: string
          last_reminder_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          ref_id: string
          reminder_count?: number
          status?: Database["public"]["Enums"]["client_invite_status"]
          template_version_id?: string | null
          token_hash: string
          updated_at?: string
          work_type?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          bound_contract_id?: string | null
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          draft_payload?: Json | null
          email_hmac?: string | null
          email_lower?: string
          expires_at?: string
          id?: string
          invited_by?: string
          last_reminder_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          ref_id?: string
          reminder_count?: number
          status?: Database["public"]["Enums"]["client_invite_status"]
          template_version_id?: string | null
          token_hash?: string
          updated_at?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_bound_contract_id_fkey"
            columns: ["bound_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invitations_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invitations_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      client_site_access_audit: {
        Row: {
          actor_business_id: string | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          grant_id: string | null
          id: string
          metadata: Json | null
          site_id: string | null
        }
        Insert: {
          actor_business_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          site_id?: string | null
        }
        Update: {
          actor_business_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          site_id?: string | null
        }
        Relationships: []
      }
      client_site_access_grants: {
        Row: {
          access_level: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          ignored_at: string | null
          ignored_by: string | null
          provider_business_id: string
          provider_user_id: string
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          revoked_at: string | null
          revoked_by: string | null
          site_id: string
          status: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          provider_business_id: string
          provider_user_id: string
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          site_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          provider_business_id?: string
          provider_user_id?: string
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          site_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_site_access_grants_provider_business_id_fkey"
            columns: ["provider_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_site_access_grants_provider_business_id_fkey"
            columns: ["provider_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_site_access_grants_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_site_lookup_audit: {
        Row: {
          created_at: string
          found: boolean
          id: string
          lookup_type: string
          site_id: string | null
          site_ref: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          found: boolean
          id?: string
          lookup_type: string
          site_id?: string | null
          site_ref?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          found?: boolean
          id?: string
          lookup_type?: string
          site_id?: string | null
          site_ref?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_site_notification_preferences: {
        Row: {
          auto_ignore_anonymous_visits: boolean
          auto_ignore_repeated_visits: boolean
          created_at: string
          id: string
          notify_on_access_request: boolean
          notify_on_locked_section_attempt: boolean
          notify_on_provider_interest: boolean
          notify_on_qr_scan: boolean
          site_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_ignore_anonymous_visits?: boolean
          auto_ignore_repeated_visits?: boolean
          created_at?: string
          id?: string
          notify_on_access_request?: boolean
          notify_on_locked_section_attempt?: boolean
          notify_on_provider_interest?: boolean
          notify_on_qr_scan?: boolean
          site_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_ignore_anonymous_visits?: boolean
          auto_ignore_repeated_visits?: boolean
          created_at?: string
          id?: string
          notify_on_access_request?: boolean
          notify_on_locked_section_attempt?: boolean
          notify_on_provider_interest?: boolean
          notify_on_qr_scan?: boolean
          site_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_site_notification_preferences_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_site_visibility_settings: {
        Row: {
          id: string
          section_key: string
          site_id: string
          updated_at: string
          updated_by: string | null
          visibility_level: string
        }
        Insert: {
          id?: string
          section_key: string
          site_id: string
          updated_at?: string
          updated_by?: string | null
          visibility_level: string
        }
        Update: {
          id?: string
          section_key?: string
          site_id?: string
          updated_at?: string
          updated_by?: string | null
          visibility_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_site_visibility_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_site_visit_logs: {
        Row: {
          action: string
          attempted_section: string | null
          created_at: string
          id: string
          metadata: Json | null
          provider_business_id: string | null
          site_id: string | null
          visit_source: string
          visitor_user_id: string | null
        }
        Insert: {
          action: string
          attempted_section?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider_business_id?: string | null
          site_id?: string | null
          visit_source: string
          visitor_user_id?: string | null
        }
        Update: {
          action?: string
          attempted_section?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider_business_id?: string | null
          site_id?: string | null
          visit_source?: string
          visitor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_site_visit_logs_provider_business_id_fkey"
            columns: ["provider_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_site_visit_logs_provider_business_id_fkey"
            columns: ["provider_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_site_visit_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sites: {
        Row: {
          access_notes: string | null
          address_line1: string
          address_line2: string | null
          archived_at: string | null
          business_id: string
          city_id: string | null
          city_name: string | null
          client_user_id: string | null
          contact_name: string | null
          contact_phone: string | null
          country_id: string | null
          created_at: string
          created_by: string
          district: string | null
          id: string
          is_default: boolean
          is_demo: boolean
          label: string
          last_scanned_at: string | null
          latitude: number | null
          legacy_ref_id: string | null
          longitude: number | null
          map_url: string | null
          owner_user_id: string | null
          qr_enabled: boolean
          qr_revoked_at: string | null
          qr_token_hash: string | null
          ref_id: string | null
          scan_count: number
          site_name: string | null
          site_ref: string
          site_type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          access_notes?: string | null
          address_line1: string
          address_line2?: string | null
          archived_at?: string | null
          business_id: string
          city_id?: string | null
          city_name?: string | null
          client_user_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string
          district?: string | null
          id?: string
          is_default?: boolean
          is_demo?: boolean
          label: string
          last_scanned_at?: string | null
          latitude?: number | null
          legacy_ref_id?: string | null
          longitude?: number | null
          map_url?: string | null
          owner_user_id?: string | null
          qr_enabled?: boolean
          qr_revoked_at?: string | null
          qr_token_hash?: string | null
          ref_id?: string | null
          scan_count?: number
          site_name?: string | null
          site_ref: string
          site_type?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          access_notes?: string | null
          address_line1?: string
          address_line2?: string | null
          archived_at?: string | null
          business_id?: string
          city_id?: string | null
          city_name?: string | null
          client_user_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string
          district?: string | null
          id?: string
          is_default?: boolean
          is_demo?: boolean
          label?: string
          last_scanned_at?: string | null
          latitude?: number | null
          legacy_ref_id?: string | null
          longitude?: number | null
          map_url?: string | null
          owner_user_id?: string | null
          qr_enabled?: boolean
          qr_revoked_at?: string | null
          qr_token_hash?: string | null
          ref_id?: string | null
          scan_count?: number
          site_name?: string | null
          site_ref?: string
          site_type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sites_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sites_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inbox_settings: {
        Row: {
          alert_on_max_retries: boolean
          alert_recipients: string[]
          id: number
          max_notification_attempts: number
          muted_user_ids: string[]
          notify_email_on_assign: boolean
          notify_email_on_priority_change: boolean
          notify_email_on_status_change: boolean
          notify_webhook_on_assign: boolean
          notify_webhook_on_priority_change: boolean
          notify_webhook_on_status_change: boolean
          retry_backoff_seconds: number
          role_subscriptions: Json
          stale_hours: number
          target_resolution_hours: number
          target_response_hours: number
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
          webhook_url: string | null
          weekly_report_recipients: string[]
        }
        Insert: {
          alert_on_max_retries?: boolean
          alert_recipients?: string[]
          id: number
          max_notification_attempts?: number
          muted_user_ids?: string[]
          notify_email_on_assign?: boolean
          notify_email_on_priority_change?: boolean
          notify_email_on_status_change?: boolean
          notify_webhook_on_assign?: boolean
          notify_webhook_on_priority_change?: boolean
          notify_webhook_on_status_change?: boolean
          retry_backoff_seconds?: number
          role_subscriptions?: Json
          stale_hours?: number
          target_resolution_hours?: number
          target_response_hours?: number
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          weekly_report_recipients?: string[]
        }
        Update: {
          alert_on_max_retries?: boolean
          alert_recipients?: string[]
          id?: number
          max_notification_attempts?: number
          muted_user_ids?: string[]
          notify_email_on_assign?: boolean
          notify_email_on_priority_change?: boolean
          notify_email_on_status_change?: boolean
          notify_webhook_on_assign?: boolean
          notify_webhook_on_priority_change?: boolean
          notify_webhook_on_status_change?: boolean
          retry_backoff_seconds?: number
          role_subscriptions?: Json
          stale_hours?: number
          target_resolution_hours?: number
          target_response_hours?: number
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          weekly_report_recipients?: string[]
        }
        Relationships: []
      }
      contact_message_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_value: string | null
          id: string
          message_id: string
          metadata: Json | null
          note: string | null
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_value?: string | null
          id?: string
          message_id: string
          metadata?: Json | null
          note?: string | null
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_value?: string | null
          id?: string
          message_id?: string
          metadata?: Json | null
          note?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_message_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          ai_category: string | null
          ai_confidence: number | null
          ai_priority: string | null
          ai_processed_at: string | null
          ai_suggested_reply: string | null
          ai_summary: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          message: string
          name: string
          priority: string
          replied_at: string | null
          replied_by: string | null
          starred: boolean
          status: string
          subject: string | null
          ticket_number: string | null
          updated_at: string
          user_id: string | null
          work_state: string
          work_state_updated_at: string | null
        }
        Insert: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_priority?: string | null
          ai_processed_at?: string | null
          ai_suggested_reply?: string | null
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          message: string
          name: string
          priority?: string
          replied_at?: string | null
          replied_by?: string | null
          starred?: boolean
          status?: string
          subject?: string | null
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
          work_state?: string
          work_state_updated_at?: string | null
        }
        Update: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_priority?: string | null
          ai_processed_at?: string | null
          ai_suggested_reply?: string | null
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          message?: string
          name?: string
          priority?: string
          replied_at?: string | null
          replied_by?: string | null
          starred?: boolean
          status?: string
          subject?: string | null
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
          work_state?: string
          work_state_updated_at?: string | null
        }
        Relationships: []
      }
      contact_notification_log: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          error_code: string | null
          error_message: string | null
          event_id: string | null
          event_type: string | null
          http_status: number | null
          id: string
          last_attempt_at: string | null
          max_attempts: number
          message_id: string | null
          next_retry_at: string | null
          recipient: string | null
          request_payload: Json | null
          response_body: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          message_id?: string | null
          next_retry_at?: string | null
          recipient?: string | null
          request_payload?: Json | null
          response_body?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          message_id?: string | null
          next_retry_at?: string | null
          recipient?: string | null
          request_payload?: Json | null
          response_body?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notification_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "contact_message_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notification_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_interactions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contract_amendment_approvals: {
        Row: {
          amendment_hash: string | null
          amendment_id: string
          approval_method: string
          approved_at: string
          approver_id: string
          approver_role: string
          contract_hash_at_approval: string | null
          contract_id: string
          created_at: string
          id: string
          ip_hash: string | null
          notes: string | null
          user_agent_hash: string | null
        }
        Insert: {
          amendment_hash?: string | null
          amendment_id: string
          approval_method?: string
          approved_at?: string
          approver_id: string
          approver_role: string
          contract_hash_at_approval?: string | null
          contract_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          notes?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          amendment_hash?: string | null
          amendment_id?: string
          approval_method?: string
          approved_at?: string
          approver_id?: string
          approver_role?: string
          contract_hash_at_approval?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          notes?: string | null
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendment_approvals_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendment_approvals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_amendment_audit: {
        Row: {
          action: string
          actor_id: string | null
          amendment_id: string
          created_at: string
          id: string
          metadata: Json
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          amendment_id: string
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          amendment_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendment_audit_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_amendments: {
        Row: {
          after_snapshot_id: string | null
          amendment_number: number | null
          amendment_type: string
          amount_delta: number | null
          applied_at: string | null
          applied_by: string | null
          before_snapshot_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_approved_at: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          internal_note: string | null
          new_amount: number | null
          new_end_date: string | null
          new_scope_summary: string | null
          old_end_date: string | null
          old_scope_summary: string | null
          old_total: number | null
          provider_approved_at: string | null
          public_reason: string | null
          reason: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          superseded_by: string | null
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          after_snapshot_id?: string | null
          amendment_number?: number | null
          amendment_type?: string
          amount_delta?: number | null
          applied_at?: string | null
          applied_by?: string | null
          before_snapshot_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_approved_at?: string | null
          contract_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          internal_note?: string | null
          new_amount?: number | null
          new_end_date?: string | null
          new_scope_summary?: string | null
          old_end_date?: string | null
          old_scope_summary?: string | null
          old_total?: number | null
          provider_approved_at?: string | null
          public_reason?: string | null
          reason?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          superseded_by?: string | null
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          after_snapshot_id?: string | null
          amendment_number?: number | null
          amendment_type?: string
          amount_delta?: number | null
          applied_at?: string | null
          applied_by?: string | null
          before_snapshot_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_approved_at?: string | null
          contract_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          internal_note?: string | null
          new_amount?: number | null
          new_end_date?: string | null
          new_scope_summary?: string | null
          old_end_date?: string | null
          old_scope_summary?: string | null
          old_total?: number | null
          provider_approved_at?: string | null
          public_reason?: string | null
          reason?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          superseded_by?: string | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_after_snapshot_id_fkey"
            columns: ["after_snapshot_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_before_snapshot_id_fkey"
            columns: ["before_snapshot_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_attachments: {
        Row: {
          amendment_id: string | null
          contract_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          measurement_id: string | null
          milestone_id: string | null
          payment_id: string | null
          storage_path: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          amendment_id?: string | null
          contract_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          measurement_id?: string | null
          milestone_id?: string | null
          payment_id?: string | null
          storage_path?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          amendment_id?: string | null
          contract_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          measurement_id?: string | null
          milestone_id?: string | null
          payment_id?: string | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_attachments_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_attachments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_attachments_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "contract_measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_attachments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "contract_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_attachments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "installment_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_counter_offers: {
        Row: {
          contract_id: string
          created_at: string
          field_label_ar: string | null
          field_label_en: string | null
          field_path: string
          id: string
          message: string | null
          new_value: Json
          old_value: Json | null
          proposer_id: string
          responded_at: string | null
          responded_by: string | null
          response_message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          field_label_ar?: string | null
          field_label_en?: string | null
          field_path: string
          id?: string
          message?: string | null
          new_value: Json
          old_value?: Json | null
          proposer_id: string
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          field_label_ar?: string | null
          field_label_en?: string | null
          field_path?: string
          id?: string
          message?: string | null
          new_value?: Json
          old_value?: Json | null
          proposer_id?: string
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_counter_offers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_expiry_alerts_log: {
        Row: {
          contract_id: string
          created_at: string
          days_before: number
          id: string
          notified_at: string
          recipients: Json
        }
        Insert: {
          contract_id: string
          created_at?: string
          days_before: number
          id?: string
          notified_at?: string
          recipients?: Json
        }
        Update: {
          contract_id?: string
          created_at?: string
          days_before?: number
          id?: string
          notified_at?: string
          recipients?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_expiry_alerts_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_line_items: {
        Row: {
          boq_group_key: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          formula_inputs: Json
          id: string
          is_optional: boolean
          item_type: string
          name_ar: string
          name_en: string | null
          pricing_method: string | null
          quantity: number
          sort_order: number
          total_cost: number | null
          unit_of_measure: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          boq_group_key?: string | null
          contract_id: string
          created_at?: string
          description_ar?: string | null
          formula_inputs?: Json
          id?: string
          is_optional?: boolean
          item_type?: string
          name_ar: string
          name_en?: string | null
          pricing_method?: string | null
          quantity?: number
          sort_order?: number
          total_cost?: number | null
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          boq_group_key?: string | null
          contract_id?: string
          created_at?: string
          description_ar?: string | null
          formula_inputs?: Json
          id?: string
          is_optional?: boolean
          item_type?: string
          name_ar?: string
          name_en?: string | null
          pricing_method?: string | null
          quantity?: number
          sort_order?: number
          total_cost?: number | null
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_line_items_pricing_method_fkey"
            columns: ["pricing_method"]
            isOneToOne: false
            referencedRelation: "contract_measurement_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_measurement_methods: {
        Row: {
          created_at: string
          decimals: number
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          label_ar: string
          label_en: string
          symbol: string | null
        }
        Insert: {
          created_at?: string
          decimals?: number
          description_ar?: string | null
          description_en?: string | null
          id: string
          is_active?: boolean
          label_ar: string
          label_en: string
          symbol?: string | null
        }
        Update: {
          created_at?: string
          decimals?: number
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          symbol?: string | null
        }
        Relationships: []
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
      contract_pdf_analysis_log: {
        Row: {
          build_version: string | null
          byte_length: number | null
          contract_id: string
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          mojibake_count: number
          mojibake_detected: boolean
          report: string | null
          sample: string | null
          source: string
          status: string
        }
        Insert: {
          build_version?: string | null
          byte_length?: number | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          mojibake_count?: number
          mojibake_detected?: boolean
          report?: string | null
          sample?: string | null
          source?: string
          status: string
        }
        Update: {
          build_version?: string | null
          byte_length?: number | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          mojibake_count?: number
          mojibake_detected?: boolean
          report?: string | null
          sample?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_pdf_analysis_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_pdf_exports: {
        Row: {
          amendment_count: number
          archived_at: string | null
          archived_reason: string | null
          boq_group_count: number
          contract_id: string
          contract_number: string | null
          contract_status: string | null
          contract_version: number | null
          created_at: string
          document_hash: string | null
          document_hash_prefix: string | null
          export_locale: string | null
          exported_at: string
          exported_by: string
          has_amendments: boolean
          id: string
          ip_hash: string | null
          line_item_count: number
          official_version_number: number | null
          retention_expires_at: string | null
          retention_policy_months: number | null
          source: string
          template_name_ar: string | null
          template_name_en: string | null
          template_version_id: string | null
          template_version_number: number | null
          user_agent_hash: string | null
        }
        Insert: {
          amendment_count?: number
          archived_at?: string | null
          archived_reason?: string | null
          boq_group_count?: number
          contract_id: string
          contract_number?: string | null
          contract_status?: string | null
          contract_version?: number | null
          created_at?: string
          document_hash?: string | null
          document_hash_prefix?: string | null
          export_locale?: string | null
          exported_at?: string
          exported_by: string
          has_amendments?: boolean
          id?: string
          ip_hash?: string | null
          line_item_count?: number
          official_version_number?: number | null
          retention_expires_at?: string | null
          retention_policy_months?: number | null
          source?: string
          template_name_ar?: string | null
          template_name_en?: string | null
          template_version_id?: string | null
          template_version_number?: number | null
          user_agent_hash?: string | null
        }
        Update: {
          amendment_count?: number
          archived_at?: string | null
          archived_reason?: string | null
          boq_group_count?: number
          contract_id?: string
          contract_number?: string | null
          contract_status?: string | null
          contract_version?: number | null
          created_at?: string
          document_hash?: string | null
          document_hash_prefix?: string | null
          export_locale?: string | null
          exported_at?: string
          exported_by?: string
          has_amendments?: boolean
          id?: string
          ip_hash?: string | null
          line_item_count?: number
          official_version_number?: number | null
          retention_expires_at?: string | null
          retention_policy_months?: number | null
          source?: string
          template_name_ar?: string | null
          template_name_en?: string | null
          template_version_id?: string | null
          template_version_number?: number | null
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_pdf_exports_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_pdf_exports_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_pdf_exports_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_attachments: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          is_mandatory: boolean
          kind: string
          precedence_order: number
          title_ar: string
          title_en: string | null
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_mandatory?: boolean
          kind: string
          precedence_order?: number
          title_ar: string
          title_en?: string | null
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_mandatory?: boolean
          kind?: string
          precedence_order?: number
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_attachments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_attachments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_clauses: {
        Row: {
          body_ar: string
          body_en: string | null
          created_at: string
          id: string
          is_editable_by_client: boolean
          is_editable_by_provider: boolean
          is_mandatory: boolean
          legal_reference: string | null
          section_id: string
          sort_order: number
          tags: Json
          updated_at: string
        }
        Insert: {
          body_ar: string
          body_en?: string | null
          created_at?: string
          id?: string
          is_editable_by_client?: boolean
          is_editable_by_provider?: boolean
          is_mandatory?: boolean
          legal_reference?: string | null
          section_id: string
          sort_order?: number
          tags?: Json
          updated_at?: string
        }
        Update: {
          body_ar?: string
          body_en?: string | null
          created_at?: string
          id?: string
          is_editable_by_client?: boolean
          is_editable_by_provider?: boolean
          is_mandatory?: boolean
          legal_reference?: string | null
          section_id?: string
          sort_order?: number
          tags?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_clauses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "contract_template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_pricing_rules: {
        Row: {
          created_at: string
          display_in_pdf: Json
          formula: string | null
          id: string
          is_default: boolean
          method: string
          required_fields: Json
          rounding: Json
          updated_at: string
          vat_handling: string
          version_id: string
        }
        Insert: {
          created_at?: string
          display_in_pdf?: Json
          formula?: string | null
          id?: string
          is_default?: boolean
          method: string
          required_fields?: Json
          rounding?: Json
          updated_at?: string
          vat_handling?: string
          version_id: string
        }
        Update: {
          created_at?: string
          display_in_pdf?: Json
          formula?: string | null
          id?: string
          is_default?: boolean
          method?: string
          required_fields?: Json
          rounding?: Json
          updated_at?: string
          vat_handling?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_pricing_rules_method_fkey"
            columns: ["method"]
            isOneToOne: false
            referencedRelation: "contract_measurement_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_pricing_rules_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_pricing_rules_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_required_fields: {
        Row: {
          applies_to: string
          created_at: string
          enum_values: Json
          field_key: string
          field_type: string
          help_ar: string | null
          help_en: string | null
          id: string
          is_required: boolean
          label_ar: string
          label_en: string | null
          sort_order: number
          updated_at: string
          validation: Json
          version_id: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          enum_values?: Json
          field_key: string
          field_type: string
          help_ar?: string | null
          help_en?: string | null
          id?: string
          is_required?: boolean
          label_ar: string
          label_en?: string | null
          sort_order?: number
          updated_at?: string
          validation?: Json
          version_id: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          enum_values?: Json
          field_key?: string
          field_type?: string
          help_ar?: string | null
          help_en?: string | null
          id?: string
          is_required?: boolean
          label_ar?: string
          label_en?: string | null
          sort_order?: number
          updated_at?: string
          validation?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_required_fields_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_required_fields_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_review_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          risk_level: string | null
          template_version_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          risk_level?: string | null
          template_version_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          risk_level?: string | null
          template_version_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_review_events_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_review_events_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_sections: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          section_key: string
          sort_order: number
          title_ar: string
          title_en: string | null
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          section_key: string
          sort_order?: number
          title_ar: string
          title_en?: string | null
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          section_key?: string
          sort_order?: number
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_sections_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_sections_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_snapshots: {
        Row: {
          contract_id: string
          created_by: string | null
          frozen_at: string
          frozen_payload: Json
          id: string
          version_id: string | null
        }
        Insert: {
          contract_id: string
          created_by?: string | null
          frozen_at?: string
          frozen_payload: Json
          id?: string
          version_id?: string | null
        }
        Update: {
          contract_id?: string
          created_by?: string | null
          frozen_at?: string
          frozen_payload?: Json
          id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_snapshots_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_snapshots_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_snapshots_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_versions: {
        Row: {
          archived_at: string | null
          body_hash: string | null
          changes_requested_at: string | null
          created_at: string
          effective_from: string | null
          id: string
          language_precedence: string
          legal_review_notes: string | null
          legal_reviewed_at: string | null
          legal_reviewer_id: string | null
          published_at: string | null
          published_by: string | null
          review_decision_at: string | null
          review_decision_by: string | null
          review_requested_at: string | null
          review_status_note: string | null
          risk_level: string | null
          status: string
          superseded_by: string | null
          template_id: string
          updated_at: string
          version_number: number
        }
        Insert: {
          archived_at?: string | null
          body_hash?: string | null
          changes_requested_at?: string | null
          created_at?: string
          effective_from?: string | null
          id?: string
          language_precedence?: string
          legal_review_notes?: string | null
          legal_reviewed_at?: string | null
          legal_reviewer_id?: string | null
          published_at?: string | null
          published_by?: string | null
          review_decision_at?: string | null
          review_decision_by?: string | null
          review_requested_at?: string | null
          review_status_note?: string | null
          risk_level?: string | null
          status?: string
          superseded_by?: string | null
          template_id: string
          updated_at?: string
          version_number: number
        }
        Update: {
          archived_at?: string | null
          body_hash?: string | null
          changes_requested_at?: string | null
          created_at?: string
          effective_from?: string | null
          id?: string
          language_precedence?: string
          legal_review_notes?: string | null
          legal_reviewed_at?: string | null
          legal_reviewer_id?: string | null
          published_at?: string | null
          published_by?: string | null
          review_decision_at?: string | null
          review_decision_by?: string | null
          review_requested_at?: string | null
          review_status_note?: string | null
          risk_level?: string | null
          status?: string
          superseded_by?: string | null
          template_id?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_versions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_versions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          current_version_id: string | null
          default_locale: string
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
          service_category_id: string | null
          slug: string | null
          sort_order: number
          terms_ar: string
          terms_en: string | null
          updated_at: string
          warranty_terms_ar: string | null
          warranty_terms_en: string | null
        }
        Insert: {
          archived_at?: string | null
          category?: string
          created_at?: string
          current_version_id?: string | null
          default_locale?: string
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
          service_category_id?: string | null
          slug?: string | null
          sort_order?: number
          terms_ar: string
          terms_en?: string | null
          updated_at?: string
          warranty_terms_ar?: string | null
          warranty_terms_en?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          current_version_id?: string | null
          default_locale?: string
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
          service_category_id?: string | null
          slug?: string | null
          sort_order?: number
          terms_ar?: string
          terms_en?: string | null
          updated_at?: string
          warranty_terms_ar?: string | null
          warranty_terms_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
          },
        ]
      }
      contract_versions: {
        Row: {
          amendment_id: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          document_hash: string
          id: string
          kind: string
          pdf_storage_path: string | null
          prev_document_hash: string | null
          prev_version_id: string | null
          snapshot: Json
          version_number: number
        }
        Insert: {
          amendment_id?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          document_hash: string
          id?: string
          kind: string
          pdf_storage_path?: string | null
          prev_document_hash?: string | null
          prev_version_id?: string | null
          snapshot: Json
          version_number: number
        }
        Update: {
          amendment_id?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          document_hash?: string
          id?: string
          kind?: string
          pdf_storage_path?: string | null
          prev_document_hash?: string | null
          prev_version_id?: string | null
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_versions_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_versions_prev_version_id_fkey"
            columns: ["prev_version_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
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
          client_id: string | null
          completed_at: string | null
          contract_number: string
          contract_version: number
          country_id: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          document_hash: string | null
          end_date: string | null
          execution_address_snapshot: Json | null
          execution_site_id: string | null
          guest_client_email: string | null
          guest_client_name: string | null
          guest_client_phone: string | null
          id: string
          is_demo: boolean
          last_pdf_generated_at: string | null
          last_pdf_snapshot_id: string | null
          location_id: string | null
          locked_at: string | null
          official_version_number: number
          pricing_method: string | null
          provider_accepted_at: string | null
          provider_entity_id: string | null
          provider_id: string
          requester_entity_id: string | null
          service_category_id: string | null
          source_lead_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          supervisor_email: string | null
          supervisor_name: string | null
          supervisor_phone: string | null
          template_snapshot_id: string | null
          template_version_id: string | null
          terms_ar: string | null
          terms_en: string | null
          title_ar: string
          title_en: string | null
          total_amount: number
          updated_at: string
          vat_inclusive: boolean
          vat_rate: number
        }
        Insert: {
          business_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_accepted_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          contract_number?: string
          contract_version?: number
          country_id?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          document_hash?: string | null
          end_date?: string | null
          execution_address_snapshot?: Json | null
          execution_site_id?: string | null
          guest_client_email?: string | null
          guest_client_name?: string | null
          guest_client_phone?: string | null
          id?: string
          is_demo?: boolean
          last_pdf_generated_at?: string | null
          last_pdf_snapshot_id?: string | null
          location_id?: string | null
          locked_at?: string | null
          official_version_number?: number
          pricing_method?: string | null
          provider_accepted_at?: string | null
          provider_entity_id?: string | null
          provider_id: string
          requester_entity_id?: string | null
          service_category_id?: string | null
          source_lead_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          supervisor_email?: string | null
          supervisor_name?: string | null
          supervisor_phone?: string | null
          template_snapshot_id?: string | null
          template_version_id?: string | null
          terms_ar?: string | null
          terms_en?: string | null
          title_ar: string
          title_en?: string | null
          total_amount: number
          updated_at?: string
          vat_inclusive?: boolean
          vat_rate?: number
        }
        Update: {
          business_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_accepted_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          contract_number?: string
          contract_version?: number
          country_id?: string | null
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          document_hash?: string | null
          end_date?: string | null
          execution_address_snapshot?: Json | null
          execution_site_id?: string | null
          guest_client_email?: string | null
          guest_client_name?: string | null
          guest_client_phone?: string | null
          id?: string
          is_demo?: boolean
          last_pdf_generated_at?: string | null
          last_pdf_snapshot_id?: string | null
          location_id?: string | null
          locked_at?: string | null
          official_version_number?: number
          pricing_method?: string | null
          provider_accepted_at?: string | null
          provider_entity_id?: string | null
          provider_id?: string
          requester_entity_id?: string | null
          service_category_id?: string | null
          source_lead_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          supervisor_email?: string | null
          supervisor_name?: string | null
          supervisor_phone?: string | null
          template_snapshot_id?: string | null
          template_version_id?: string | null
          terms_ar?: string | null
          terms_en?: string | null
          title_ar?: string
          title_en?: string | null
          total_amount?: number
          updated_at?: string
          vat_inclusive?: boolean
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_execution_site_id_fkey"
            columns: ["execution_site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_last_pdf_snapshot_id_fkey"
            columns: ["last_pdf_snapshot_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_pricing_method_fkey"
            columns: ["pricing_method"]
            isOneToOne: false
            referencedRelation: "contract_measurement_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "contracts_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "lead_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_snapshot_id_fkey"
            columns: ["template_snapshot_id"]
            isOneToOne: false
            referencedRelation: "contract_template_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
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
          is_archived_by_p1: boolean
          is_archived_by_p2: boolean
          is_demo: boolean
          is_group: boolean
          is_pinned_by_p1: boolean
          is_pinned_by_p2: boolean
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
          is_archived_by_p1?: boolean
          is_archived_by_p2?: boolean
          is_demo?: boolean
          is_group?: boolean
          is_pinned_by_p1?: boolean
          is_pinned_by_p2?: boolean
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
          is_archived_by_p1?: boolean
          is_archived_by_p2?: boolean
          is_demo?: boolean
          is_group?: boolean
          is_pinned_by_p1?: boolean
          is_pinned_by_p2?: boolean
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
      country_admin_assignments: {
        Row: {
          country_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_admin_assignments_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "country_admin_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      country_settings: {
        Row: {
          address_format: Json | null
          beta_enabled: boolean
          country_id: string
          created_at: string
          default_currency: string | null
          default_locale: string | null
          default_tax_rate: number | null
          default_timezone: string | null
          is_launched: boolean
          phone_code: string | null
          updated_at: string
        }
        Insert: {
          address_format?: Json | null
          beta_enabled?: boolean
          country_id: string
          created_at?: string
          default_currency?: string | null
          default_locale?: string | null
          default_tax_rate?: number | null
          default_timezone?: string | null
          is_launched?: boolean
          phone_code?: string | null
          updated_at?: string
        }
        Update: {
          address_format?: Json | null
          beta_enabled?: boolean
          country_id?: string
          created_at?: string
          default_currency?: string | null
          default_locale?: string | null
          default_tax_rate?: number | null
          default_timezone?: string | null
          is_launched?: boolean
          phone_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_settings_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          created_at: string
          currency: string
          entity_id: string | null
          id: string
          invoice_id: string | null
          metadata: Json
          payment_intent_id: string | null
          reason: string | null
          ref_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          entity_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          payment_intent_id?: string | null
          reason?: string | null
          ref_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          entity_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          payment_intent_id?: string | null
          reason?: string | null
          ref_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_run_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          function_name: string
          id: string
          job_name: string
          ok: boolean | null
          started_at: string
          status: string | null
          summary: Json
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          function_name: string
          id?: string
          job_name: string
          ok?: boolean | null
          started_at?: string
          status?: string | null
          summary?: Json
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          function_name?: string
          id?: string
          job_name?: string
          ok?: boolean | null
          started_at?: string
          status?: string | null
          summary?: Json
        }
        Relationships: []
      }
      customer_feedback: {
        Row: {
          business_id: string
          closure_id: string
          created_at: string
          feedback_text: string | null
          id: string
          rating: number
          ref_id: string
          work_order_id: string
          would_recommend: boolean | null
        }
        Insert: {
          business_id: string
          closure_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating: number
          ref_id?: string
          work_order_id: string
          would_recommend?: boolean | null
        }
        Update: {
          business_id?: string
          closure_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating?: number
          ref_id?: string
          work_order_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: true
            referencedRelation: "project_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_nps_responses: {
        Row: {
          business_id: string
          closure_id: string | null
          created_at: string
          id: string
          score: number
          work_order_id: string
        }
        Insert: {
          business_id: string
          closure_id?: string | null
          created_at?: string
          id?: string
          score: number
          work_order_id: string
        }
        Update: {
          business_id?: string
          closure_id?: string | null
          created_at?: string
          id?: string
          score?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_nps_responses_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "project_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_nps_responses_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_project_notifications: {
        Row: {
          action_url: string | null
          body_ar: string
          body_en: string
          business_id: string
          channel: string
          contract_id: string | null
          created_at: string
          customer_email: string | null
          customer_phone: string | null
          event_type: string
          id: string
          idempotency_key: string
          quotation_id: string | null
          ref_id: string
          sent_at: string | null
          status: string
          title_ar: string
          title_en: string
          work_order_id: string | null
        }
        Insert: {
          action_url?: string | null
          body_ar?: string
          body_en?: string
          business_id: string
          channel: string
          contract_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          quotation_id?: string | null
          ref_id?: string
          sent_at?: string | null
          status?: string
          title_ar: string
          title_en: string
          work_order_id?: string | null
        }
        Update: {
          action_url?: string | null
          body_ar?: string
          body_en?: string
          business_id?: string
          channel?: string
          contract_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          quotation_id?: string | null
          ref_id?: string
          sent_at?: string | null
          status?: string
          title_ar?: string
          title_en?: string
          work_order_id?: string | null
        }
        Relationships: []
      }
      customer_tracking_links: {
        Row: {
          business_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          quotation_id: string | null
          ref_id: string
          revoked_at: string | null
          token_hash: string
          view_count: number
          work_order_id: string | null
        }
        Insert: {
          business_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          quotation_id?: string | null
          ref_id?: string
          revoked_at?: string | null
          token_hash: string
          view_count?: number
          work_order_id?: string | null
        }
        Update: {
          business_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          quotation_id?: string | null
          ref_id?: string
          revoked_at?: string | null
          token_hash?: string
          view_count?: number
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_tracking_links_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delegated_workspace_access: {
        Row: {
          business_id: string
          created_at: string
          delegated_by_user_id: string
          delegated_to_user_id: string
          expires_at: string
          id: string
          permissions: string[]
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          starts_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          delegated_by_user_id: string
          delegated_to_user_id: string
          expires_at: string
          id?: string
          permissions?: string[]
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          starts_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          delegated_by_user_id?: string
          delegated_to_user_id?: string
          expires_at?: string
          id?: string
          permissions?: string[]
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegated_workspace_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_workspace_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          city: string
          city_ar: string | null
          city_en: string | null
          country_code: string
          created_at: string
          district_ar: string
          district_en: string | null
          id: string
          is_active: boolean
          region: string
          region_ar: string | null
          region_en: string | null
          source: string
          updated_at: string
        }
        Insert: {
          city: string
          city_ar?: string | null
          city_en?: string | null
          country_code?: string
          created_at?: string
          district_ar: string
          district_en?: string | null
          id?: string
          is_active?: boolean
          region: string
          region_ar?: string | null
          region_en?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          city?: string
          city_ar?: string | null
          city_en?: string | null
          country_code?: string
          created_at?: string
          district_ar?: string
          district_en?: string | null
          id?: string
          is_active?: boolean
          region?: string
          region_ar?: string | null
          region_en?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_deliverability_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          bounced_count: number
          complained_count: number
          created_at: string
          failed_count: number
          id: string
          message: string | null
          metadata: Json | null
          rate: number
          severity: string
          threshold: number
          total_emails: number
          window_minutes: number
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          bounced_count?: number
          complained_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          message?: string | null
          metadata?: Json | null
          rate: number
          severity?: string
          threshold: number
          total_emails: number
          window_minutes: number
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          bounced_count?: number
          complained_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          message?: string | null
          metadata?: Json | null
          rate?: number
          severity?: string
          threshold?: number
          total_emails?: number
          window_minutes?: number
        }
        Relationships: []
      }
      email_link_clicks: {
        Row: {
          category: string
          clicked_at: string
          id: number
          message_id: string
          target_url: string | null
          template_name: string | null
        }
        Insert: {
          category: string
          clicked_at?: string
          id?: number
          message_id: string
          target_url?: string | null
          template_name?: string | null
        }
        Update: {
          category?: string
          clicked_at?: string
          id?: number
          message_id?: string
          target_url?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          clicks_count: number
          created_at: string
          error_message: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          id: string
          last_clicked_at: string | null
          last_opened_at: string | null
          message_id: string | null
          metadata: Json | null
          opens_count: number
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          clicks_count?: number
          created_at?: string
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          opens_count?: number
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          clicks_count?: number
          created_at?: string
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          opens_count?: number
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entity_access_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          ref_id: string
          requester_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_business_id: string | null
          target_ref: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          ref_id?: string
          requester_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_business_id?: string | null
          target_ref?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          ref_id?: string
          requester_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_business_id?: string | null
          target_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_access_requests_target_business_id_fkey"
            columns: ["target_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_access_requests_target_business_id_fkey"
            columns: ["target_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_legal_identifiers: {
        Row: {
          country_code: string
          created_at: string
          created_by: string | null
          entity_id: string
          expires_at: string | null
          id: string
          identifier_type: string
          identifier_value: string
          issuing_authority: string | null
          metadata: Json
          ref_id: string | null
          verified_at: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          expires_at?: string | null
          id?: string
          identifier_type: string
          identifier_value: string
          issuing_authority?: string | null
          metadata?: Json
          ref_id?: string | null
          verified_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          expires_at?: string | null
          id?: string
          identifier_type?: string
          identifier_value?: string
          issuing_authority?: string | null
          metadata?: Json
          ref_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_legal_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_legal_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
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
      help_articles: {
        Row: {
          audience: Database["public"]["Enums"]["help_audience"]
          category_id: string | null
          content_ar: string | null
          content_en: string | null
          created_at: string
          created_by: string | null
          created_from_gap_id: string | null
          helpful_count: number
          id: string
          keywords: string[]
          not_helpful_count: number
          ref_id: string | null
          slug: string
          status: Database["public"]["Enums"]["help_article_status"]
          summary_ar: string | null
          summary_en: string | null
          title_ar: string
          title_en: string
          updated_at: string
          updated_by: string | null
          views_count: number
        }
        Insert: {
          audience?: Database["public"]["Enums"]["help_audience"]
          category_id?: string | null
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          created_by?: string | null
          created_from_gap_id?: string | null
          helpful_count?: number
          id?: string
          keywords?: string[]
          not_helpful_count?: number
          ref_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["help_article_status"]
          summary_ar?: string | null
          summary_en?: string | null
          title_ar: string
          title_en: string
          updated_at?: string
          updated_by?: string | null
          views_count?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["help_audience"]
          category_id?: string | null
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          created_by?: string | null
          created_from_gap_id?: string | null
          helpful_count?: number
          id?: string
          keywords?: string[]
          not_helpful_count?: number
          ref_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["help_article_status"]
          summary_ar?: string | null
          summary_en?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string
          updated_by?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_created_from_gap_id_fkey"
            columns: ["created_from_gap_id"]
            isOneToOne: false
            referencedRelation: "help_content_gaps"
            referencedColumns: ["id"]
          },
        ]
      }
      help_assistant_logs: {
        Row: {
          audience: Database["public"]["Enums"]["help_audience"] | null
          confidence: number | null
          created_at: string
          event: string
          id: string
          page_key: string | null
          query_normalized: string | null
          sources_count: number
        }
        Insert: {
          audience?: Database["public"]["Enums"]["help_audience"] | null
          confidence?: number | null
          created_at?: string
          event: string
          id?: string
          page_key?: string | null
          query_normalized?: string | null
          sources_count?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["help_audience"] | null
          confidence?: number | null
          created_at?: string
          event?: string
          id?: string
          page_key?: string | null
          query_normalized?: string | null
          sources_count?: number
        }
        Relationships: []
      }
      help_categories: {
        Row: {
          audience: Database["public"]["Enums"]["help_audience"]
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          ref_id: string | null
          slug: string
          sort_order: number
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["help_audience"]
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          ref_id?: string | null
          slug: string
          sort_order?: number
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["help_audience"]
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          ref_id?: string | null
          slug?: string
          sort_order?: number
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_content_gaps: {
        Row: {
          audience: Database["public"]["Enums"]["help_audience"] | null
          created_article_id: string | null
          created_at: string
          dedupe_key: string
          frequency: number
          id: string
          last_query: string
          page_key: string | null
          query_normalized: string
          ref_id: string | null
          status: Database["public"]["Enums"]["help_content_gap_status"]
          submitted_by: string | null
          suggested_title_ar: string | null
          suggested_title_en: string | null
          updated_at: string
          zero_result_count: number
        }
        Insert: {
          audience?: Database["public"]["Enums"]["help_audience"] | null
          created_article_id?: string | null
          created_at?: string
          dedupe_key: string
          frequency?: number
          id?: string
          last_query: string
          page_key?: string | null
          query_normalized: string
          ref_id?: string | null
          status?: Database["public"]["Enums"]["help_content_gap_status"]
          submitted_by?: string | null
          suggested_title_ar?: string | null
          suggested_title_en?: string | null
          updated_at?: string
          zero_result_count?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["help_audience"] | null
          created_article_id?: string | null
          created_at?: string
          dedupe_key?: string
          frequency?: number
          id?: string
          last_query?: string
          page_key?: string | null
          query_normalized?: string
          ref_id?: string | null
          status?: Database["public"]["Enums"]["help_content_gap_status"]
          submitted_by?: string | null
          suggested_title_ar?: string | null
          suggested_title_en?: string | null
          updated_at?: string
          zero_result_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_content_gaps_created_article_id_fkey"
            columns: ["created_article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_feature_requests: {
        Row: {
          business_id: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          ref_id: string | null
          status: Database["public"]["Enums"]["help_feature_status"]
          title: string
          updated_at: string
          user_id: string | null
          votes_count: number
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ref_id?: string | null
          status?: Database["public"]["Enums"]["help_feature_status"]
          title: string
          updated_at?: string
          user_id?: string | null
          votes_count?: number
        }
        Update: {
          business_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ref_id?: string | null
          status?: Database["public"]["Enums"]["help_feature_status"]
          title?: string
          updated_at?: string
          user_id?: string | null
          votes_count?: number
        }
        Relationships: []
      }
      help_issue_reports: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          id: string
          issue_type: Database["public"]["Enums"]["help_issue_type"]
          page_key: string | null
          priority: Database["public"]["Enums"]["help_issue_priority"]
          ref_id: string | null
          reporter_user_id: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["help_issue_status"]
          title: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: Database["public"]["Enums"]["help_issue_type"]
          page_key?: string | null
          priority?: Database["public"]["Enums"]["help_issue_priority"]
          ref_id?: string | null
          reporter_user_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["help_issue_status"]
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: Database["public"]["Enums"]["help_issue_type"]
          page_key?: string | null
          priority?: Database["public"]["Enums"]["help_issue_priority"]
          ref_id?: string | null
          reporter_user_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["help_issue_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_search_logs: {
        Row: {
          audience: Database["public"]["Enums"]["help_audience"] | null
          business_id: string | null
          created_at: string
          id: string
          page_key: string | null
          query: string
          query_normalized: string
          ref_id: string | null
          results_count: number
          selected_article_id: string | null
          user_id: string | null
        }
        Insert: {
          audience?: Database["public"]["Enums"]["help_audience"] | null
          business_id?: string | null
          created_at?: string
          id?: string
          page_key?: string | null
          query: string
          query_normalized: string
          ref_id?: string | null
          results_count?: number
          selected_article_id?: string | null
          user_id?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["help_audience"] | null
          business_id?: string | null
          created_at?: string
          id?: string
          page_key?: string | null
          query?: string
          query_normalized?: string
          ref_id?: string | null
          results_count?: number
          selected_article_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_search_logs_selected_article_id_fkey"
            columns: ["selected_article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_appointments: {
        Row: {
          business_id: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_confirmation_status: string
          customer_note: string | null
          customer_tracking_link_id: string | null
          id: string
          internal_note: string | null
          ref_id: string
          scheduled_date: string
          status: string
          time_window: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_confirmation_status?: string
          customer_note?: string | null
          customer_tracking_link_id?: string | null
          id?: string
          internal_note?: string | null
          ref_id?: string
          scheduled_date: string
          status?: string
          time_window?: string | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_confirmation_status?: string
          customer_note?: string | null
          customer_tracking_link_id?: string | null
          id?: string
          internal_note?: string | null
          ref_id?: string
          scheduled_date?: string
          status?: string
          time_window?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_appointments_customer_tracking_link_id_fkey"
            columns: ["customer_tracking_link_id"]
            isOneToOne: false
            referencedRelation: "customer_tracking_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_appointments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
          milestone_id: string | null
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
          milestone_id?: string | null
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
          milestone_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "contract_milestones"
            referencedColumns: ["id"]
          },
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
      invoices: {
        Row: {
          amount: number
          country_code: string
          created_at: string
          currency: string
          entity_id: string | null
          id: string
          issued_to_entity_id: string | null
          metadata: Json
          payment_intent_id: string | null
          ref_id: string | null
          status: string
          subscription_id: string | null
          tax_rate: number | null
          tax_registration_number: string | null
          tax_scheme: string | null
        }
        Insert: {
          amount?: number
          country_code?: string
          created_at?: string
          currency?: string
          entity_id?: string | null
          id?: string
          issued_to_entity_id?: string | null
          metadata?: Json
          payment_intent_id?: string | null
          ref_id?: string | null
          status?: string
          subscription_id?: string | null
          tax_rate?: number | null
          tax_registration_number?: string | null
          tax_scheme?: string | null
        }
        Update: {
          amount?: number
          country_code?: string
          created_at?: string
          currency?: string
          entity_id?: string | null
          id?: string
          issued_to_entity_id?: string | null
          metadata?: Json
          payment_intent_id?: string | null
          ref_id?: string | null
          status?: string
          subscription_id?: string | null
          tax_rate?: number | null
          tax_registration_number?: string | null
          tax_scheme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_to_entity_id_fkey"
            columns: ["issued_to_entity_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_to_entity_id_fkey"
            columns: ["issued_to_entity_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_request_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          lead_request_id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          lead_request_id: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          lead_request_id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_request_events_lead_request_id_fkey"
            columns: ["lead_request_id"]
            isOneToOne: false
            referencedRelation: "lead_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_requests: {
        Row: {
          accepted_at: string | null
          budget_range: string | null
          business_id: string
          cancelled_at: string | null
          closed_at: string | null
          contact_preference: string
          conversation_id: string | null
          converted_at: string | null
          converted_by: string | null
          converted_contract_id: string | null
          country_id: string | null
          created_at: string
          email: string
          id: string
          initiated_by: string
          internal_notes: string | null
          is_demo: boolean
          legacy_ref_id: string | null
          location_id: string | null
          message: string
          name: string
          needs_info_at: string | null
          phone: string | null
          phone_country_code: string | null
          phone_national: string | null
          priority: string
          project_scope: string | null
          quote_amount: number | null
          quote_currency: string | null
          quote_note: string | null
          quote_valid_until: string | null
          quoted_at: string | null
          quoted_by: string | null
          ref_id: string | null
          rejected_at: string | null
          responded_at: string | null
          responded_by: string | null
          site_access_grant_id: string | null
          source: string | null
          source_entity_id: string | null
          source_site_id: string | null
          status: string
          subject: string | null
          target_entity_id: string | null
          updated_at: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          budget_range?: string | null
          business_id: string
          cancelled_at?: string | null
          closed_at?: string | null
          contact_preference?: string
          conversation_id?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_contract_id?: string | null
          country_id?: string | null
          created_at?: string
          email: string
          id?: string
          initiated_by?: string
          internal_notes?: string | null
          is_demo?: boolean
          legacy_ref_id?: string | null
          location_id?: string | null
          message: string
          name: string
          needs_info_at?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          priority?: string
          project_scope?: string | null
          quote_amount?: number | null
          quote_currency?: string | null
          quote_note?: string | null
          quote_valid_until?: string | null
          quoted_at?: string | null
          quoted_by?: string | null
          ref_id?: string | null
          rejected_at?: string | null
          responded_at?: string | null
          responded_by?: string | null
          site_access_grant_id?: string | null
          source?: string | null
          source_entity_id?: string | null
          source_site_id?: string | null
          status?: string
          subject?: string | null
          target_entity_id?: string | null
          updated_at?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          budget_range?: string | null
          business_id?: string
          cancelled_at?: string | null
          closed_at?: string | null
          contact_preference?: string
          conversation_id?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_contract_id?: string | null
          country_id?: string | null
          created_at?: string
          email?: string
          id?: string
          initiated_by?: string
          internal_notes?: string | null
          is_demo?: boolean
          legacy_ref_id?: string | null
          location_id?: string | null
          message?: string
          name?: string
          needs_info_at?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          priority?: string
          project_scope?: string | null
          quote_amount?: number | null
          quote_currency?: string | null
          quote_note?: string | null
          quote_valid_until?: string | null
          quoted_at?: string | null
          quoted_by?: string | null
          ref_id?: string | null
          rejected_at?: string | null
          responded_at?: string | null
          responded_by?: string | null
          site_access_grant_id?: string | null
          source?: string | null
          source_entity_id?: string | null
          source_site_id?: string | null
          status?: string
          subject?: string | null
          target_entity_id?: string | null
          updated_at?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_converted_contract_id_fkey"
            columns: ["converted_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_site_access_grant_id_fkey"
            columns: ["site_access_grant_id"]
            isOneToOne: false
            referencedRelation: "client_site_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_source_site_id_fkey"
            columns: ["source_site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_contract_normalization_log: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          id: number
          inferred_category: string | null
          new_pricing_method: string | null
          new_template_snapshot_id: string | null
          new_template_version_id: string | null
          notes: string | null
          old_pricing_method: string | null
          old_template_snapshot_id: string | null
          old_template_version_id: string | null
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          id?: number
          inferred_category?: string | null
          new_pricing_method?: string | null
          new_template_snapshot_id?: string | null
          new_template_version_id?: string | null
          notes?: string | null
          old_pricing_method?: string | null
          old_template_snapshot_id?: string | null
          old_template_version_id?: string | null
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          id?: number
          inferred_category?: string | null
          new_pricing_method?: string | null
          new_template_snapshot_id?: string | null
          new_template_version_id?: string | null
          notes?: string | null
          old_pricing_method?: string | null
          old_template_snapshot_id?: string | null
          old_template_version_id?: string | null
        }
        Relationships: []
      }
      location_catalog: {
        Row: {
          city_ar: string
          city_en: string
          created_at: string
          district_ar: string | null
          district_en: string | null
          id: string
          is_active: boolean
          region_ar: string | null
          region_en: string | null
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          city_ar: string
          city_en: string
          created_at?: string
          district_ar?: string | null
          district_en?: string | null
          id?: string
          is_active?: boolean
          region_ar?: string | null
          region_en?: string | null
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          city_ar?: string
          city_en?: string
          created_at?: string
          district_ar?: string | null
          district_en?: string | null
          id?: string
          is_active?: boolean
          region_ar?: string | null
          region_en?: string | null
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      location_staff_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          location_table: string
          permissions_override: Json
          ref_id: string | null
          role: string | null
          staff_membership_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          location_table?: string
          permissions_override?: Json
          ref_id?: string | null
          role?: string | null
          staff_membership_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          location_table?: string
          permissions_override?: Json
          ref_id?: string | null
          role?: string | null
          staff_membership_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_staff_assignments_staff_membership_id_fkey"
            columns: ["staff_membership_id"]
            isOneToOne: false
            referencedRelation: "business_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          fulfilled_at: string | null
          id: string
          points_spent: number
          redemption_code: string | null
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          points_spent: number
          redemption_code?: string | null
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          points_spent?: number
          redemption_code?: string | null
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          currency_code: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          points_cost: number
          reward_type: string
          sort_order: number
          stock: number | null
          title_ar: string
          title_en: string
          updated_at: string
          value_amount: number | null
        }
        Insert: {
          created_at?: string
          currency_code?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          points_cost: number
          reward_type?: string
          sort_order?: number
          stock?: number | null
          title_ar: string
          title_en: string
          updated_at?: string
          value_amount?: number | null
        }
        Update: {
          created_at?: string
          currency_code?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          points_cost?: number
          reward_type?: string
          sort_order?: number
          stock?: number | null
          title_ar?: string
          title_en?: string
          updated_at?: string
          value_amount?: number | null
        }
        Relationships: []
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
      membership_access_key_usage_log: {
        Row: {
          access_key_id: string
          business_id: string | null
          created_at: string
          endpoint: string | null
          id: string
          ip: string | null
          method: string | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_key_id: string
          business_id?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          ip?: string | null
          method?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_key_id?: string
          business_id?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          ip?: string | null
          method?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_access_key_usage_log_access_key_id_fkey"
            columns: ["access_key_id"]
            isOneToOne: false
            referencedRelation: "membership_access_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_access_key_usage_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_access_key_usage_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_access_keys: {
        Row: {
          business_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoke_reason: string | null
          revoked_at: string | null
          scopes: Json
          subscription_id: string | null
          tier_at_creation: Database["public"]["Enums"]["membership_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoke_reason?: string | null
          revoked_at?: string | null
          scopes?: Json
          subscription_id?: string | null
          tier_at_creation?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          scopes?: Json
          subscription_id?: string | null
          tier_at_creation?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_access_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_access_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_access_keys_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_invite_keys: {
        Row: {
          business_id: string
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number
          notes: string | null
          revoke_reason: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["business_staff_role"]
          status: string
          subscription_id: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["business_staff_role"]
          status?: string
          subscription_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["business_staff_role"]
          status?: string
          subscription_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "membership_invite_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invite_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invite_keys_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_invite_redemptions: {
        Row: {
          business_staff_id: string | null
          created_at: string
          id: string
          invite_key_id: string
          redeemed_by_user_id: string
        }
        Insert: {
          business_staff_id?: string | null
          created_at?: string
          id?: string
          invite_key_id: string
          redeemed_by_user_id: string
        }
        Update: {
          business_staff_id?: string | null
          created_at?: string
          id?: string
          invite_key_id?: string
          redeemed_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_invite_redemptions_business_staff_id_fkey"
            columns: ["business_staff_id"]
            isOneToOne: false
            referencedRelation: "business_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invite_redemptions_invite_key_id_fkey"
            columns: ["invite_key_id"]
            isOneToOne: false
            referencedRelation: "membership_invite_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_payment_intents: {
        Row: {
          amount: number
          billing_cycle: string | null
          business_id: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          invoice_id: string | null
          metadata: Json
          plan_id: string | null
          provider: string
          provider_intent_id: string | null
          receipt_url: string | null
          ref_id: string | null
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          business_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency: string
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          invoice_id?: string | null
          metadata?: Json
          plan_id?: string | null
          provider: string
          provider_intent_id?: string | null
          receipt_url?: string | null
          ref_id?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          business_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string | null
          metadata?: Json
          plan_id?: string | null
          provider?: string
          provider_intent_id?: string | null
          receipt_url?: string | null
          ref_id?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_payment_intents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_payment_intents_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_payment_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider: string
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          provider: string
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
      membership_plan_modules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          plan_id: string
          set_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key: string
          plan_id: string
          set_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key?: string
          plan_id?: string
          set_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plan_modules_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "membership_plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
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
      membership_promo_code_attempts: {
        Row: {
          applied_subscription_id: string | null
          business_id: string | null
          code: string
          created_at: string
          id: string
          promo_code_id: string | null
          rejection_reason: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          applied_subscription_id?: string | null
          business_id?: string | null
          code: string
          created_at?: string
          id?: string
          promo_code_id?: string | null
          rejection_reason?: string | null
          success: boolean
          user_id?: string | null
        }
        Update: {
          applied_subscription_id?: string | null
          business_id?: string | null
          code?: string
          created_at?: string
          id?: string
          promo_code_id?: string | null
          rejection_reason?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_promo_code_attempts_applied_subscription_id_fkey"
            columns: ["applied_subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_promo_code_attempts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_promo_code_attempts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_promo_code_attempts_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "membership_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_percent: number | null
          duration_days: number | null
          id: string
          is_active: boolean
          max_redemptions: number
          notes: string | null
          target_tier: Database["public"]["Enums"]["membership_tier"] | null
          type: string
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_percent?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean
          max_redemptions?: number
          notes?: string | null
          target_tier?: Database["public"]["Enums"]["membership_tier"] | null
          type: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_percent?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean
          max_redemptions?: number
          notes?: string | null
          target_tier?: Database["public"]["Enums"]["membership_tier"] | null
          type?: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      membership_promo_redemptions: {
        Row: {
          applied_subscription_id: string | null
          business_id: string | null
          created_at: string
          id: string
          promo_code_id: string
          user_id: string
        }
        Insert: {
          applied_subscription_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          promo_code_id: string
          user_id: string
        }
        Update: {
          applied_subscription_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_promo_redemptions_applied_subscription_id_fkey"
            columns: ["applied_subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_promo_redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_promo_redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "membership_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_subscription_events: {
        Row: {
          action: string
          actor_user_id: string | null
          business_id: string | null
          created_at: string
          from_tier: string | null
          id: string
          metadata: Json
          subscription_id: string
          to_plan_id: string | null
          to_tier: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          from_tier?: string | null
          id?: string
          metadata?: Json
          subscription_id: string
          to_plan_id?: string | null
          to_tier?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          from_tier?: string | null
          id?: string
          metadata?: Json
          subscription_id?: string
          to_plan_id?: string | null
          to_tier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_subscription_events_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_cycle: string
          business_id: string | null
          cancelled_at: string | null
          created_at: string
          downgrade_to_plan_id: string | null
          downgrade_to_tier: string | null
          expires_at: string | null
          external_subscription_id: string | null
          grace_period_until: string | null
          id: string
          is_demo: boolean
          last_external_payment_id: string | null
          last_invoice_id: string | null
          last_paid_amount: number | null
          last_paid_at: string | null
          last_paid_currency: string | null
          last_receipt_url: string | null
          last_renewal_attempt_at: string | null
          payment_failure_reason: string | null
          payment_metadata: Json
          payment_method: string | null
          payment_provider: string | null
          payment_status: string | null
          plan_id: string
          ref_id: string
          renewal_failure_count: number
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle?: string
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          downgrade_to_plan_id?: string | null
          downgrade_to_tier?: string | null
          expires_at?: string | null
          external_subscription_id?: string | null
          grace_period_until?: string | null
          id?: string
          is_demo?: boolean
          last_external_payment_id?: string | null
          last_invoice_id?: string | null
          last_paid_amount?: number | null
          last_paid_at?: string | null
          last_paid_currency?: string | null
          last_receipt_url?: string | null
          last_renewal_attempt_at?: string | null
          payment_failure_reason?: string | null
          payment_metadata?: Json
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          plan_id: string
          ref_id?: string
          renewal_failure_count?: number
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          billing_cycle?: string
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          downgrade_to_plan_id?: string | null
          downgrade_to_tier?: string | null
          expires_at?: string | null
          external_subscription_id?: string | null
          grace_period_until?: string | null
          id?: string
          is_demo?: boolean
          last_external_payment_id?: string | null
          last_invoice_id?: string | null
          last_paid_amount?: number | null
          last_paid_at?: string | null
          last_paid_currency?: string | null
          last_receipt_url?: string | null
          last_renewal_attempt_at?: string | null
          payment_failure_reason?: string | null
          payment_metadata?: Json
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          plan_id?: string
          ref_id?: string
          renewal_failure_count?: number
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
            foreignKeyName: "membership_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_subscriptions_downgrade_to_plan_id_fkey"
            columns: ["downgrade_to_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
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
      membership_upgrade_audit: {
        Row: {
          action: string
          actor_id: string | null
          billing_cycle: string | null
          business_id: string
          business_ref_id: string | null
          changed_fields: string[]
          created_at: string
          current_tier: string | null
          id: string
          new_status: string | null
          old_status: string | null
          request_id: string
          requested_tier: string | null
          snapshot: Json | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          billing_cycle?: string | null
          business_id: string
          business_ref_id?: string | null
          changed_fields?: string[]
          created_at?: string
          current_tier?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          request_id: string
          requested_tier?: string | null
          snapshot?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          billing_cycle?: string | null
          business_id?: string
          business_ref_id?: string | null
          changed_fields?: string[]
          created_at?: string
          current_tier?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          request_id?: string
          requested_tier?: string | null
          snapshot?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      membership_upgrade_rejections: {
        Row: {
          actual_business_ref_id: string | null
          attempted_business_id: string | null
          attempted_business_ref_id: string | null
          billing_cycle: string | null
          created_at: string
          error_message: string | null
          id: string
          reason_code: string
          requested_tier: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          actual_business_ref_id?: string | null
          attempted_business_id?: string | null
          attempted_business_ref_id?: string | null
          billing_cycle?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          reason_code: string
          requested_tier?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          actual_business_ref_id?: string | null
          attempted_business_id?: string | null
          attempted_business_ref_id?: string | null
          billing_cycle?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          reason_code?: string
          requested_tier?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      membership_upgrade_requests: {
        Row: {
          admin_note: string | null
          billing_cycle: string
          business_id: string
          business_ref_id: string | null
          created_at: string
          current_tier: string | null
          id: string
          is_demo: boolean
          note: string | null
          requested_plan_id: string | null
          requested_tier: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          billing_cycle?: string
          business_id: string
          business_ref_id?: string | null
          created_at?: string
          current_tier?: string | null
          id?: string
          is_demo?: boolean
          note?: string | null
          requested_plan_id?: string | null
          requested_tier: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          billing_cycle?: string
          business_id?: string
          business_ref_id?: string | null
          created_at?: string
          current_tier?: string | null
          id?: string
          is_demo?: boolean
          note?: string | null
          requested_plan_id?: string | null
          requested_tier?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_upgrade_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_upgrade_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_upgrade_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
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
          {
            foreignKeyName: "message_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
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
          delivered_at: string | null
          id: string
          is_demo: boolean
          is_read: boolean
          message_type: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_demo?: boolean
          is_read?: boolean
          message_type?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_demo?: boolean
          is_read?: boolean
          message_type?: string
          read_at?: string | null
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
      migration_alert_config: {
        Row: {
          cooldown_hours: number
          enabled: boolean
          evaluation_window_hours: number
          failure_rate_threshold: number
          id: number
          last_rerun_at: string | null
          last_rerun_by: string | null
          last_rerun_reason: string | null
          migration_epoch: number
          min_sample_size: number
          notify_emails: string[]
          rerun_cooldown_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cooldown_hours?: number
          enabled?: boolean
          evaluation_window_hours?: number
          failure_rate_threshold?: number
          id?: number
          last_rerun_at?: string | null
          last_rerun_by?: string | null
          last_rerun_reason?: string | null
          migration_epoch?: number
          min_sample_size?: number
          notify_emails?: string[]
          rerun_cooldown_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cooldown_hours?: number
          enabled?: boolean
          evaluation_window_hours?: number
          failure_rate_threshold?: number
          id?: number
          last_rerun_at?: string | null
          last_rerun_by?: string | null
          last_rerun_reason?: string | null
          migration_epoch?: number
          min_sample_size?: number
          notify_emails?: string[]
          rerun_cooldown_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      migration_alerts_sent: {
        Row: {
          channel: string
          details: Json | null
          failed_events: number
          failure_rate: number
          id: string
          recipients: string[]
          sent_at: string
          threshold: number
          total_events: number
        }
        Insert: {
          channel?: string
          details?: Json | null
          failed_events: number
          failure_rate: number
          id?: string
          recipients?: string[]
          sent_at?: string
          threshold: number
          total_events: number
        }
        Update: {
          channel?: string
          details?: Json | null
          failed_events?: number
          failure_rate?: number
          id?: string
          recipients?: string[]
          sent_at?: string
          threshold?: number
          total_events?: number
        }
        Relationships: []
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
      notification_preferences: {
        Row: {
          created_at: string
          email_bookings: boolean
          email_contracts: boolean
          email_enabled: boolean
          email_leads: boolean
          email_maintenance_updates: boolean
          email_marketing: boolean
          email_messages: boolean
          email_system: boolean
          id: string
          in_app_enabled: boolean
          inapp_bookings: boolean
          inapp_contracts: boolean
          inapp_leads: boolean
          inapp_maintenance_updates: boolean
          inapp_messages: boolean
          inapp_system: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_bookings?: boolean
          email_contracts?: boolean
          email_enabled?: boolean
          email_leads?: boolean
          email_maintenance_updates?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          email_system?: boolean
          id?: string
          in_app_enabled?: boolean
          inapp_bookings?: boolean
          inapp_contracts?: boolean
          inapp_leads?: boolean
          inapp_maintenance_updates?: boolean
          inapp_messages?: boolean
          inapp_system?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_bookings?: boolean
          email_contracts?: boolean
          email_enabled?: boolean
          email_leads?: boolean
          email_maintenance_updates?: boolean
          email_marketing?: boolean
          email_messages?: boolean
          email_system?: boolean
          id?: string
          in_app_enabled?: boolean
          inapp_bookings?: boolean
          inapp_contracts?: boolean
          inapp_leads?: boolean
          inapp_maintenance_updates?: boolean
          inapp_messages?: boolean
          inapp_system?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
      operational_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          condition_code: string
          created_at: string
          domain: string
          due_at: string | null
          entity_id: string
          entity_type: string
          id: string
          idempotency_key: string
          message_ar: string
          message_en: string
          metadata: Json
          owner_business_id: string | null
          owner_user_id: string | null
          ref_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title_ar: string
          title_en: string
          triggered_at: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          condition_code: string
          created_at?: string
          domain: string
          due_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          idempotency_key: string
          message_ar: string
          message_en: string
          metadata?: Json
          owner_business_id?: string | null
          owner_user_id?: string | null
          ref_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title_ar: string
          title_en: string
          triggered_at?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          condition_code?: string
          created_at?: string
          domain?: string
          due_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          idempotency_key?: string
          message_ar?: string
          message_en?: string
          metadata?: Json
          owner_business_id?: string | null
          owner_user_id?: string | null
          ref_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title_ar?: string
          title_en?: string
          triggered_at?: string
          updated_at?: string
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
      operations_observability_log: {
        Row: {
          alerts: Json
          created_at: string
          created_by: string | null
          id: string
          ref_id: string | null
          run_day: string | null
          run_type: string
          score: number
          status: string
          summary: Json
        }
        Insert: {
          alerts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          ref_id?: string | null
          run_day?: string | null
          run_type: string
          score: number
          status: string
          summary?: Json
        }
        Update: {
          alerts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          ref_id?: string | null
          run_day?: string | null
          run_type?: string
          score?: number
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      password_reset_log: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          request_id: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          request_id?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          request_id?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      perf_audit_runs: {
        Row: {
          accessibility_score: number | null
          best_practices_score: number | null
          cls: number | null
          created_at: string
          error: string | null
          fcp_ms: number | null
          id: string
          lcp_ms: number | null
          performance_score: number | null
          raw_summary: Json | null
          seo_score: number | null
          source: string
          speed_index_ms: number | null
          strategy: string
          tbt_ms: number | null
          triggered_by: string | null
          ttfb_ms: number | null
          url: string
        }
        Insert: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          cls?: number | null
          created_at?: string
          error?: string | null
          fcp_ms?: number | null
          id?: string
          lcp_ms?: number | null
          performance_score?: number | null
          raw_summary?: Json | null
          seo_score?: number | null
          source?: string
          speed_index_ms?: number | null
          strategy?: string
          tbt_ms?: number | null
          triggered_by?: string | null
          ttfb_ms?: number | null
          url: string
        }
        Update: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          cls?: number | null
          created_at?: string
          error?: string | null
          fcp_ms?: number | null
          id?: string
          lcp_ms?: number | null
          performance_score?: number | null
          raw_summary?: Json | null
          seo_score?: number | null
          source?: string
          speed_index_ms?: number | null
          strategy?: string
          tbt_ms?: number | null
          triggered_by?: string | null
          ttfb_ms?: number | null
          url?: string
        }
        Relationships: []
      }
      permissions_catalog: {
        Row: {
          created_at: string
          group_key: string
          key: string
          label_ar: string
          label_en: string
        }
        Insert: {
          created_at?: string
          group_key: string
          key: string
          label_ar: string
          label_en: string
        }
        Update: {
          created_at?: string
          group_key?: string
          key?: string
          label_ar?: string
          label_en?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_code_hash: string
          phone: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code_hash: string
          phone: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code_hash?: string
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
          {
            foreignKeyName: "portfolio_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      private_sector_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          notes: string | null
          sector_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          notes?: string | null
          sector_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          notes?: string | null
          sector_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_sector_audit_log_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "private_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sector_audit_log_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "private_sectors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      private_sector_distributors: {
        Row: {
          business_id: string
          created_at: string
          id: string
          notes: string | null
          ref_id: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["private_sector_distributor_role"]
          sector_id: string
          since_date: string | null
          status: Database["public"]["Enums"]["private_sector_link_status"]
          territory_ar: string | null
          territory_en: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          ref_id?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["private_sector_distributor_role"]
          sector_id: string
          since_date?: string | null
          status?: Database["public"]["Enums"]["private_sector_link_status"]
          territory_ar?: string | null
          territory_en?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          ref_id?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["private_sector_distributor_role"]
          sector_id?: string
          since_date?: string | null
          status?: Database["public"]["Enums"]["private_sector_link_status"]
          territory_ar?: string | null
          territory_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_sector_distributors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sector_distributors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sector_distributors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "private_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sector_distributors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "private_sectors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      private_sector_specializations: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          ref_id: string
          sector_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          ref_id?: string
          sector_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          ref_id?: string
          sector_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_sector_specializations_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "private_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sector_specializations_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "private_sectors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      private_sectors: {
        Row: {
          brand_type: Database["public"]["Enums"]["private_sector_brand_type"]
          business_id: string
          category_id: string | null
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          country_id: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          established_year: number | null
          id: string
          is_featured: boolean
          logo_url: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          parent_sector: string
          ref_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seo_description_ar: string | null
          seo_description_en: string | null
          seo_keywords: string[]
          seo_title_ar: string | null
          seo_title_en: string | null
          short_description_ar: string | null
          short_description_en: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["private_sector_status"]
          submitted_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          brand_type?: Database["public"]["Enums"]["private_sector_brand_type"]
          business_id: string
          category_id?: string | null
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          established_year?: number | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          metadata?: Json
          name_ar: string
          name_en?: string | null
          parent_sector: string
          ref_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description_ar?: string | null
          seo_description_en?: string | null
          seo_keywords?: string[]
          seo_title_ar?: string | null
          seo_title_en?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["private_sector_status"]
          submitted_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          brand_type?: Database["public"]["Enums"]["private_sector_brand_type"]
          business_id?: string
          category_id?: string | null
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          established_year?: number | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          metadata?: Json
          name_ar?: string
          name_en?: string | null
          parent_sector?: string
          ref_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description_ar?: string | null
          seo_description_en?: string | null
          seo_keywords?: string[]
          seo_title_ar?: string | null
          seo_title_en?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["private_sector_status"]
          submitted_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_sectors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sectors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sectors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sectors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "private_sectors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_purchase_orders: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          currency: string
          id: string
          po_number: string | null
          rfq_id: string
          status: string
          subtotal: number
          supplier_id: string
          supplier_name: string
          supplier_quote_id: string
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          po_number?: string | null
          rfq_id: string
          status?: string
          subtotal?: number
          supplier_id: string
          supplier_name: string
          supplier_quote_id: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          po_number?: string | null
          rfq_id?: string
          status?: string
          subtotal?: number
          supplier_id?: string
          supplier_name?: string
          supplier_quote_id?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_purchase_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "procurement_rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "procurement_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_purchase_orders_supplier_quote_id_fkey"
            columns: ["supplier_quote_id"]
            isOneToOne: true
            referencedRelation: "procurement_supplier_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requests: {
        Row: {
          awarded_at: string | null
          business_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          needed_by: string | null
          status: string
          title: string
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          business_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          needed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          business_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          needed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_requests_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_rfq_invitations: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_at: string
          invited_by: string
          responded_at: string | null
          rfq_id: string
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          responded_at?: string | null
          rfq_id: string
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          responded_at?: string | null
          rfq_id?: string
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_rfq_invitations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "procurement_rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_rfq_invitations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "procurement_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_rfq_items: {
        Row: {
          brand_lock: string | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          procurement_request_id: string | null
          quantity: number
          requested_brand_id: string | null
          rfq_id: string
          sort_order: number
          target_price: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          brand_lock?: string | null
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          procurement_request_id?: string | null
          quantity?: number
          requested_brand_id?: string | null
          rfq_id: string
          sort_order?: number
          target_price?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          brand_lock?: string | null
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          procurement_request_id?: string | null
          quantity?: number
          requested_brand_id?: string | null
          rfq_id?: string
          sort_order?: number
          target_price?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_rfq_items_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_rfq_items_requested_brand_id_fkey"
            columns: ["requested_brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_rfq_items_requested_brand_id_fkey"
            columns: ["requested_brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "procurement_rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_rfqs: {
        Row: {
          awarded_quote_id: string | null
          business_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          due_at: string | null
          expires_at: string | null
          id: string
          procurement_request_id: string
          rfq_number: string | null
          sent_at: string | null
          source_boq_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          awarded_quote_id?: string | null
          business_id: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          due_at?: string | null
          expires_at?: string | null
          id?: string
          procurement_request_id: string
          rfq_number?: string | null
          sent_at?: string | null
          source_boq_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          awarded_quote_id?: string | null
          business_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          due_at?: string | null
          expires_at?: string | null
          id?: string
          procurement_request_id?: string
          rfq_number?: string | null
          sent_at?: string | null
          source_boq_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_rfqs_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_supplier_quote_items: {
        Row: {
          brand_match_status: string | null
          brand_review_note: string | null
          brand_review_status: string
          brand_reviewed_at: string | null
          brand_reviewed_by: string | null
          business_id: string
          created_at: string
          equivalence_notes: string | null
          id: string
          is_equivalent: boolean
          notes: string | null
          proposed_brand_id: string | null
          proposed_brand_name: string | null
          quantity: number
          quote_id: string
          rfq_item_id: string
          total_price: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          brand_match_status?: string | null
          brand_review_note?: string | null
          brand_review_status?: string
          brand_reviewed_at?: string | null
          brand_reviewed_by?: string | null
          business_id: string
          created_at?: string
          equivalence_notes?: string | null
          id?: string
          is_equivalent?: boolean
          notes?: string | null
          proposed_brand_id?: string | null
          proposed_brand_name?: string | null
          quantity?: number
          quote_id: string
          rfq_item_id: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          brand_match_status?: string | null
          brand_review_note?: string | null
          brand_review_status?: string
          brand_reviewed_at?: string | null
          brand_reviewed_by?: string | null
          business_id?: string
          created_at?: string
          equivalence_notes?: string | null
          id?: string
          is_equivalent?: boolean
          notes?: string | null
          proposed_brand_id?: string | null
          proposed_brand_name?: string | null
          quantity?: number
          quote_id?: string
          rfq_item_id?: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_supplier_quote_items_proposed_brand_id_fkey"
            columns: ["proposed_brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_supplier_quote_items_proposed_brand_id_fkey"
            columns: ["proposed_brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_supplier_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "procurement_supplier_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_supplier_quote_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "procurement_rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_supplier_quotes: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          id: string
          lead_time_days: number | null
          notes: string | null
          rejection_reason: string | null
          rfq_id: string
          status: string
          submitted_at: string | null
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          rejection_reason?: string | null
          rfq_id: string
          status?: string
          submitted_at?: string | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          rejection_reason?: string | null
          rfq_id?: string
          status?: string
          submitted_at?: string | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_supplier_quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "procurement_rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_supplier_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "procurement_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_suppliers: {
        Row: {
          business_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_activity_log: {
        Row: {
          changed_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "profile_suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
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
          {
            foreignKeyName: "profile_systems_origin_business_id_fkey"
            columns: ["origin_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_number: number
          account_type: Database["public"]["Enums"]["account_type"]
          additional_number: string | null
          address_line: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_until: string | null
          building_number: string | null
          city_id: string | null
          country_code: string
          country_id: string | null
          created_at: string
          district: string | null
          email: string | null
          full_name: string | null
          full_name_ar: string | null
          full_name_en: string | null
          id: string
          is_banned: boolean
          is_onboarded: boolean
          is_verified: boolean
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          national_id: string | null
          national_id_type: string | null
          onboarding_completed_at: string | null
          onboarding_draft: Json
          onboarding_draft_updated_at: string | null
          onboarding_started_at: string | null
          onboarding_step: number
          phone: string | null
          phone_country_code: string | null
          phone_national: string | null
          phone_verified: boolean
          postal_code: string | null
          preferred_language: string
          ref_id: string
          region_name: string | null
          short_national_address: string | null
          street: string | null
          updated_at: string
          user_id: string
          username: string | null
          vat_number: string | null
        }
        Insert: {
          account_number: number
          account_type?: Database["public"]["Enums"]["account_type"]
          additional_number?: string | null
          address_line?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          building_number?: string | null
          city_id?: string | null
          country_code?: string
          country_id?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          id?: string
          is_banned?: boolean
          is_onboarded?: boolean
          is_verified?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          national_id?: string | null
          national_id_type?: string | null
          onboarding_completed_at?: string | null
          onboarding_draft?: Json
          onboarding_draft_updated_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: number
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          phone_verified?: boolean
          postal_code?: string | null
          preferred_language?: string
          ref_id: string
          region_name?: string | null
          short_national_address?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          vat_number?: string | null
        }
        Update: {
          account_number?: number
          account_type?: Database["public"]["Enums"]["account_type"]
          additional_number?: string | null
          address_line?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          building_number?: string | null
          city_id?: string | null
          country_code?: string
          country_id?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          id?: string
          is_banned?: boolean
          is_onboarded?: boolean
          is_verified?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          national_id?: string | null
          national_id_type?: string | null
          onboarding_completed_at?: string | null
          onboarding_draft?: Json
          onboarding_draft_updated_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: number
          phone?: string | null
          phone_country_code?: string | null
          phone_national?: string | null
          phone_verified?: boolean
          postal_code?: string | null
          preferred_language?: string
          ref_id?: string
          region_name?: string | null
          short_national_address?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          vat_number?: string | null
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
      project_closures: {
        Row: {
          business_id: string
          closure_status: string
          completion_date: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          issue_reported_at: string | null
          issue_text: string | null
          ref_id: string
          updated_at: string
          warranty_end_date: string | null
          warranty_start_date: string | null
          work_order_id: string
        }
        Insert: {
          business_id: string
          closure_status?: string
          completion_date?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issue_reported_at?: string | null
          issue_text?: string | null
          ref_id?: string
          updated_at?: string
          warranty_end_date?: string | null
          warranty_start_date?: string | null
          work_order_id: string
        }
        Update: {
          business_id?: string
          closure_status?: string
          completion_date?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issue_reported_at?: string | null
          issue_text?: string | null
          ref_id?: string
          updated_at?: string
          warranty_end_date?: string | null
          warranty_start_date?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_closures_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      project_delivery_evidence: {
        Row: {
          attachment_id: string | null
          business_id: string
          caption_ar: string | null
          caption_en: string | null
          closure_id: string
          created_at: string
          created_by: string | null
          id: string
          is_customer_visible: boolean
          public_image_url: string | null
          ref_id: string
        }
        Insert: {
          attachment_id?: string | null
          business_id: string
          caption_ar?: string | null
          caption_en?: string | null
          closure_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_customer_visible?: boolean
          public_image_url?: string | null
          ref_id?: string
        }
        Update: {
          attachment_id?: string | null
          business_id?: string
          caption_ar?: string | null
          caption_en?: string | null
          closure_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_customer_visible?: boolean
          public_image_url?: string | null
          ref_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_delivery_evidence_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "work_order_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_delivery_evidence_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "project_closures"
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
          is_demo: boolean
          is_featured: boolean
          project_cost: number | null
          ref_id: string | null
          saves_count: number
          shares_count: number
          sort_order: number
          status: string
          title_ar: string
          title_en: string | null
          updated_at: string
          views_count: number
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
          is_demo?: boolean
          is_featured?: boolean
          project_cost?: number | null
          ref_id?: string | null
          saves_count?: number
          shares_count?: number
          sort_order?: number
          status?: string
          title_ar: string
          title_en?: string | null
          updated_at?: string
          views_count?: number
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
          is_demo?: boolean
          is_featured?: boolean
          project_cost?: number | null
          ref_id?: string | null
          saves_count?: number
          shares_count?: number
          sort_order?: number
          status?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          views_count?: number
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
            foreignKeyName: "projects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
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
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
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
          {
            foreignKeyName: "provider_installment_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_interactions: {
        Row: {
          created_at: string
          event_type: string
          id: string
          provider_id: string | null
          provider_username: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          provider_id?: string | null
          provider_username?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          provider_id?: string | null
          provider_username?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_interactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_interactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_landing_content: {
        Row: {
          body_ar: string | null
          body_en: string | null
          created_at: string
          cta_primary_href: string | null
          cta_primary_label_ar: string | null
          cta_primary_label_en: string | null
          cta_secondary_href: string | null
          cta_secondary_label_ar: string | null
          cta_secondary_label_en: string | null
          id: string
          image_url: string | null
          is_active: boolean
          section_key: string
          sort_order: number
          subtitle_ar: string | null
          subtitle_en: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          cta_primary_href?: string | null
          cta_primary_label_ar?: string | null
          cta_primary_label_en?: string | null
          cta_secondary_href?: string | null
          cta_secondary_label_ar?: string | null
          cta_secondary_label_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_key: string
          sort_order?: number
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          cta_primary_href?: string | null
          cta_primary_label_ar?: string | null
          cta_primary_label_en?: string | null
          cta_secondary_href?: string | null
          cta_secondary_label_ar?: string | null
          cta_secondary_label_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_key?: string
          sort_order?: number
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_landing_faq: {
        Row: {
          answer_ar: string
          answer_en: string | null
          created_at: string
          id: string
          is_active: boolean
          question_ar: string
          question_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer_ar: string
          answer_en?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question_ar: string
          question_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer_ar?: string
          answer_en?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question_ar?: string
          question_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      provider_landing_features: {
        Row: {
          category: string | null
          created_at: string
          desc_ar: string
          desc_en: string | null
          icon_name: string
          id: string
          is_active: boolean
          sort_order: number
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          desc_ar: string
          desc_en?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          desc_ar?: string
          desc_en?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_landing_metrics: {
        Row: {
          country: string | null
          created_at: string
          cta_id: string | null
          device: string | null
          event_type: string
          id: string
          metadata: Json | null
          path: string | null
          referrer: string | null
          section: string | null
          session_id: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          cta_id?: string | null
          device?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          section?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          cta_id?: string | null
          device?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          section?: string | null
          session_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      provider_landing_settings: {
        Row: {
          bing_verification: string | null
          enable_tracking: boolean
          ga4_measurement_id: string | null
          gsc_verification: string | null
          gtm_container_id: string | null
          hero_video_url: string | null
          id: number
          indexnow_key: string | null
          keywords: string | null
          og_image_url: string | null
          seo_desc_ar: string | null
          seo_desc_en: string | null
          seo_title_ar: string | null
          seo_title_en: string | null
          updated_at: string
          updated_by: string | null
          yandex_verification: string | null
        }
        Insert: {
          bing_verification?: string | null
          enable_tracking?: boolean
          ga4_measurement_id?: string | null
          gsc_verification?: string | null
          gtm_container_id?: string | null
          hero_video_url?: string | null
          id?: number
          indexnow_key?: string | null
          keywords?: string | null
          og_image_url?: string | null
          seo_desc_ar?: string | null
          seo_desc_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          updated_at?: string
          updated_by?: string | null
          yandex_verification?: string | null
        }
        Update: {
          bing_verification?: string | null
          enable_tracking?: boolean
          ga4_measurement_id?: string | null
          gsc_verification?: string | null
          gtm_container_id?: string | null
          hero_video_url?: string | null
          id?: number
          indexnow_key?: string | null
          keywords?: string | null
          og_image_url?: string | null
          seo_desc_ar?: string | null
          seo_desc_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          updated_at?: string
          updated_by?: string | null
          yandex_verification?: string | null
        }
        Relationships: []
      }
      provider_landing_testimonials: {
        Row: {
          author_name: string
          author_role_ar: string | null
          author_role_en: string | null
          avatar_url: string | null
          business_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_featured: boolean
          quote_ar: string
          quote_en: string | null
          rating: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          author_name: string
          author_role_ar?: string | null
          author_role_en?: string | null
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          quote_ar: string
          quote_en?: string | null
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_role_ar?: string | null
          author_role_en?: string | null
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          quote_ar?: string
          quote_en?: string | null
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_landing_testimonials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_landing_testimonials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_lead_credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          provider_user_id: string | null
          quote_request_lead_id: string | null
          reason: string
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          provider_user_id?: string | null
          quote_request_lead_id?: string | null
          reason: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          provider_user_id?: string | null
          quote_request_lead_id?: string | null
          reason?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_lead_credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_lead_credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_lead_credit_transactions_quote_request_lead_id_fkey"
            columns: ["quote_request_lead_id"]
            isOneToOne: false
            referencedRelation: "quote_request_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_plans: {
        Row: {
          code: string
          created_at: string
          description_ar: string | null
          features: Json
          id: string
          is_active: boolean
          lead_credits_per_month: number
          monthly_price: number
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description_ar?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          lead_credits_per_month?: number
          monthly_price?: number
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description_ar?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          lead_credits_per_month?: number
          monthly_price?: number
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_subscriptions: {
        Row: {
          business_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          lead_credits_balance: number
          plan_id: string
          provider_user_id: string | null
          ref_id: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          lead_credits_balance?: number
          plan_id: string
          provider_user_id?: string | null
          ref_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          lead_credits_balance?: number
          plan_id?: string
          provider_user_id?: string | null
          ref_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "provider_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          quote_request_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          quote_request_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          quote_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_events_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          quote_request_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          quote_request_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          quote_request_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_files_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_lead_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          lead_id: string
          metadata: Json
          quote_request_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json
          quote_request_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json
          quote_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "quote_request_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_lead_events_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_leads: {
        Row: {
          admin_notes: string | null
          contact_reveal_note: string | null
          contact_revealed: boolean
          contact_revealed_at: string | null
          contact_revealed_by: string | null
          contact_view_count: number
          contact_viewed_at: string | null
          created_at: string
          id: string
          match_reasons: Json
          match_score: number
          provider_id: string
          provider_notes: string | null
          provider_user_id: string | null
          quote_request_id: string
          responded_at: string | null
          status: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          contact_reveal_note?: string | null
          contact_revealed?: boolean
          contact_revealed_at?: string | null
          contact_revealed_by?: string | null
          contact_view_count?: number
          contact_viewed_at?: string | null
          created_at?: string
          id?: string
          match_reasons?: Json
          match_score?: number
          provider_id: string
          provider_notes?: string | null
          provider_user_id?: string | null
          quote_request_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          contact_reveal_note?: string | null
          contact_revealed?: boolean
          contact_revealed_at?: string | null
          contact_revealed_by?: string | null
          contact_view_count?: number
          contact_viewed_at?: string | null
          created_at?: string
          id?: string
          match_reasons?: Json
          match_score?: number
          provider_id?: string
          provider_notes?: string | null
          provider_user_id?: string | null
          quote_request_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_leads_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_leads_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_leads_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          approx_dimensions: string | null
          brand_notes: string | null
          brand_preference_mode: string | null
          budget_amount: number | null
          budget_note: string | null
          city: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_type: string
          district: string | null
          execution_timeline: string
          has_budget: boolean
          id: string
          location_id: string | null
          metadata: Json
          preferred_brand_ids: string[] | null
          preferred_contact_method: string
          project_description: string
          quantity: string | null
          ref_id: string | null
          requester_entity_id: string | null
          sector: string
          service_location_type: string
          source: string
          status: string
          target_entity_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approx_dimensions?: string | null
          brand_notes?: string | null
          brand_preference_mode?: string | null
          budget_amount?: number | null
          budget_note?: string | null
          city: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_type: string
          district?: string | null
          execution_timeline: string
          has_budget?: boolean
          id?: string
          location_id?: string | null
          metadata?: Json
          preferred_brand_ids?: string[] | null
          preferred_contact_method: string
          project_description: string
          quantity?: string | null
          ref_id?: string | null
          requester_entity_id?: string | null
          sector: string
          service_location_type: string
          source?: string
          status?: string
          target_entity_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approx_dimensions?: string | null
          brand_notes?: string | null
          brand_preference_mode?: string | null
          budget_amount?: number | null
          budget_note?: string | null
          city?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_type?: string
          district?: string | null
          execution_timeline?: string
          has_budget?: boolean
          id?: string
          location_id?: string | null
          metadata?: Json
          preferred_brand_ids?: string[] | null
          preferred_contact_method?: string
          project_description?: string
          quantity?: string | null
          ref_id?: string | null
          requester_entity_id?: string | null
          sector?: string
          service_location_type?: string
          source?: string
          status?: string
          target_entity_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reserved_usernames: {
        Row: {
          created_at: string
          name: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          name: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          name?: string
          reason?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          business_id: string
          content: string | null
          created_at: string
          id: string
          is_demo: boolean
          is_verified: boolean
          project_id: string | null
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
          is_demo?: boolean
          is_verified?: boolean
          project_id?: string | null
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
          is_demo?: boolean
          is_verified?: boolean
          project_id?: string | null
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
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_quotes: {
        Row: {
          amount: number
          business_id: string | null
          created_at: string
          currency: string
          delivery_days: number | null
          id: string
          message: string | null
          provider_user_id: string
          rfq_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id?: string | null
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          message?: string | null
          provider_user_id: string
          rfq_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          message?: string | null
          provider_user_id?: string
          rfq_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buyer_user_id: string
          created_at: string
          currency: string
          deadline: string | null
          description: string | null
          id: string
          industry: string
          ref_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buyer_user_id: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          id?: string
          industry: string
          ref_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buyer_user_id?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          id?: string
          industry?: string
          ref_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_key: string
        }
        Insert: {
          permission_key: string
          role_key: string
        }
        Update: {
          permission_key?: string
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "roles_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      roles_catalog: {
        Row: {
          created_at: string
          description: string | null
          key: string
          label_ar: string
          label_en: string
          scope: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          label_ar: string
          label_en: string
          scope: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          label_ar?: string
          label_en?: string
          scope?: string
        }
        Relationships: []
      }
      sector_page_events: {
        Row: {
          city_slug: string | null
          id: number
          occurred_at: string
          path: string | null
          referrer_host: string | null
          sector_slug: string
        }
        Insert: {
          city_slug?: string | null
          id?: number
          occurred_at?: string
          path?: string | null
          referrer_host?: string | null
          sector_slug: string
        }
        Update: {
          city_slug?: string | null
          id?: number
          occurred_at?: string
          path?: string | null
          referrer_host?: string | null
          sector_slug?: string
        }
        Relationships: []
      }
      sector_seo_snapshots: {
        Row: {
          captured_by: string | null
          created_at: string
          description: string
          description_length: number
          id: string
          keywords: string
          keywords_count: number
          language: string
          note: string | null
          sector_slug: string
          tagline: string | null
          title: string
          title_length: number
        }
        Insert: {
          captured_by?: string | null
          created_at?: string
          description: string
          description_length: number
          id?: string
          keywords: string
          keywords_count: number
          language?: string
          note?: string | null
          sector_slug: string
          tagline?: string | null
          title: string
          title_length: number
        }
        Update: {
          captured_by?: string | null
          created_at?: string
          description?: string
          description_length?: number
          id?: string
          keywords?: string
          keywords_count?: number
          language?: string
          note?: string | null
          sector_slug?: string
          tagline?: string | null
          title?: string
          title_length?: number
        }
        Relationships: []
      }
      sectors: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id: string
          is_active?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_action: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json
          reason: string | null
          request_id: string | null
          status: string
          subject_hash: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_action: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          reason?: string | null
          request_id?: string | null
          status?: string
          subject_hash?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_action?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          reason?: string | null
          request_id?: string | null
          status?: string
          subject_hash?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_audit_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          page_results: Json | null
          pages_checked: number | null
          pages_passed: number | null
          robots_has_sitemap: boolean | null
          robots_ok: boolean | null
          robots_status: number | null
          sitemap_ok: boolean | null
          sitemap_status: number | null
          sitemap_url_count: number | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          page_results?: Json | null
          pages_checked?: number | null
          pages_passed?: number | null
          robots_has_sitemap?: boolean | null
          robots_ok?: boolean | null
          robots_status?: number | null
          sitemap_ok?: boolean | null
          sitemap_status?: number | null
          sitemap_url_count?: number | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          page_results?: Json | null
          pages_checked?: number | null
          pages_passed?: number | null
          robots_has_sitemap?: boolean | null
          robots_ok?: boolean | null
          robots_status?: number | null
          sitemap_ok?: boolean | null
          sitemap_status?: number | null
          sitemap_url_count?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      service_addition_requests: {
        Row: {
          approved_sub_service_id: string | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          name_ar: string
          name_en: string | null
          ref_id: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sector_id: string
          status: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_sub_service_id?: string | null
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          name_ar: string
          name_en?: string | null
          ref_id?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_id: string
          status?: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_sub_service_id?: string | null
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name_ar?: string
          name_en?: string | null
          ref_id?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_id?: string
          status?: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addition_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addition_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_submissions: {
        Row: {
          business_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          image_url: string
          kind: string
          link_url: string | null
          rejected_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sector_slug: string | null
          status: string
          submitted_by: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url: string
          kind: string
          link_url?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_slug?: string | null
          status?: string
          submitted_by?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string
          kind?: string
          link_url?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_slug?: string | null
          status?: string
          submitted_by?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sitemap_audit_runs: {
        Row: {
          alert_sent: boolean
          created_at: string
          diff_from_previous: Json
          error_count: number
          has_failures: boolean
          has_spa_fallback: boolean
          id: string
          ok_count: number
          results: Json
          robots_check: Json
          total_endpoints: number
          total_urls: number
          triggered_by: string
        }
        Insert: {
          alert_sent?: boolean
          created_at?: string
          diff_from_previous?: Json
          error_count?: number
          has_failures?: boolean
          has_spa_fallback?: boolean
          id?: string
          ok_count?: number
          results?: Json
          robots_check?: Json
          total_endpoints?: number
          total_urls?: number
          triggered_by?: string
        }
        Update: {
          alert_sent?: boolean
          created_at?: string
          diff_from_previous?: Json
          error_count?: number
          has_failures?: boolean
          has_spa_fallback?: boolean
          id?: string
          ok_count?: number
          results?: Json
          robots_check?: Json
          total_endpoints?: number
          total_urls?: number
          triggered_by?: string
        }
        Relationships: []
      }
      sitemap_submissions: {
        Row: {
          created_at: string
          duration_ms: number | null
          http_status: number | null
          id: string
          message: string | null
          provider: string
          sitemap_url: string
          status: string
          trigger_source: string
          triggered_by: string | null
          url_count: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          http_status?: number | null
          id?: string
          message?: string | null
          provider: string
          sitemap_url: string
          status: string
          trigger_source?: string
          triggered_by?: string | null
          url_count?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          http_status?: number | null
          id?: string
          message?: string | null
          provider?: string
          sitemap_url?: string
          status?: string
          trigger_source?: string
          triggered_by?: string | null
          url_count?: number | null
        }
        Relationships: []
      }
      staff_activity_sessions: {
        Row: {
          business_id: string
          business_staff_id: string | null
          ended_at: string | null
          id: string
          last_seen_at: string
          metadata: Json
          session_label: string | null
          source: string
          started_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          business_staff_id?: string | null
          ended_at?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json
          session_label?: string | null
          source?: string
          started_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          business_staff_id?: string | null
          ended_at?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json
          session_label?: string | null
          source?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_activity_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_sessions_business_staff_id_fkey"
            columns: ["business_staff_id"]
            isOneToOne: false
            referencedRelation: "business_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_module_audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          module_key: string
          new_enabled: boolean | null
          previous_enabled: boolean | null
          reason: string | null
          scope_type: string
          scope_value: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          module_key: string
          new_enabled?: boolean | null
          previous_enabled?: boolean | null
          reason?: string | null
          scope_type: string
          scope_value?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          module_key?: string
          new_enabled?: boolean | null
          previous_enabled?: boolean | null
          reason?: string | null
          scope_type?: string
          scope_value?: string | null
        }
        Relationships: []
      }
      system_module_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          reason: string | null
          scope_type: string
          scope_value: string | null
          set_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled: boolean
          id?: string
          module_key: string
          reason?: string | null
          scope_type: string
          scope_value?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key?: string
          reason?: string | null
          scope_type?: string
          scope_value?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_module_overrides_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      system_modules: {
        Row: {
          category: string
          created_at: string
          default_account_types: string[]
          default_enabled: boolean
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_core: boolean
          key: string
          label_ar: string
          label_en: string
          route: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_account_types?: string[]
          default_enabled?: boolean
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_core?: boolean
          key: string
          label_ar: string
          label_en: string
          route?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_account_types?: string[]
          default_enabled?: boolean
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_core?: boolean
          key?: string
          label_ar?: string
          label_en?: string
          route?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      user_locale_settings: {
        Row: {
          created_at: string
          currency_display: string | null
          date_format: string | null
          language: string
          number_format: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_display?: string | null
          date_format?: string | null
          language?: string
          number_format?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_display?: string | null
          date_format?: string | null
          language?: string
          number_format?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locale_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      web_vitals_events: {
        Row: {
          connection_type: string | null
          created_at: string
          device_type: string | null
          id: string
          metric_name: string
          metric_rating: string | null
          metric_value: number
          page_path: string
          user_agent: string | null
        }
        Insert: {
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          metric_name: string
          metric_rating?: string | null
          metric_value: number
          page_path: string
          user_agent?: string | null
        }
        Update: {
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          metric_name?: string
          metric_rating?: string | null
          metric_value?: number
          page_path?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      work_order_attachments: {
        Row: {
          attachment_type: string
          business_id: string
          created_at: string
          deleted_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          ref_id: string | null
          task_id: string | null
          uploaded_by_user_id: string
          work_order_id: string
        }
        Insert: {
          attachment_type?: string
          business_id: string
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ref_id?: string | null
          task_id?: string | null
          uploaded_by_user_id: string
          work_order_id: string
        }
        Update: {
          attachment_type?: string
          business_id?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ref_id?: string | null
          task_id?: string | null
          uploaded_by_user_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_order_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_boq_items: {
        Row: {
          boq_id: string
          brand_id: string | null
          brand_lock: string | null
          created_at: string
          deleted_at: string | null
          id: string
          item_type: string
          measurement_id: string | null
          metadata: Json
          quantity: number
          ref_id: string | null
          sort_order: number
          title_ar: string
          title_en: string
          total_price: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          boq_id: string
          brand_id?: string | null
          brand_lock?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_type?: string
          measurement_id?: string | null
          metadata?: Json
          quantity?: number
          ref_id?: string | null
          sort_order?: number
          title_ar: string
          title_en: string
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          boq_id?: string
          brand_id?: string | null
          brand_lock?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_type?: string
          measurement_id?: string | null
          metadata?: Json
          quantity?: number
          ref_id?: string | null
          sort_order?: number
          title_ar?: string
          title_en?: string
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_boq_items_boq_id_fkey"
            columns: ["boq_id"]
            isOneToOne: false
            referencedRelation: "work_order_boqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_boq_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_boq_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_boq_items_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "work_order_measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_boqs: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          notes: string | null
          ref_id: string | null
          status: string
          subtotal: number
          tax: number
          title: string
          total: number
          updated_at: string
          work_order_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          ref_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title: string
          total?: number
          updated_at?: string
          work_order_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          ref_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title?: string
          total?: number
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_boqs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_checklist_items: {
        Row: {
          checklist_id: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          label: string
          notes: string | null
          ref_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          checklist_id: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          ref_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          ref_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "work_order_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_checklists: {
        Row: {
          assigned_to_user_id: string | null
          business_id: string
          checklist_type: string
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          ref_id: string | null
          sector_key: string | null
          status: string
          title: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          business_id: string
          checklist_type: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          ref_id?: string | null
          sector_key?: string | null
          status?: string
          title: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          assigned_to_user_id?: string | null
          business_id?: string
          checklist_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          ref_id?: string | null
          sector_key?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_checklists_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          task_id: string | null
          work_order_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          task_id?: string | null
          work_order_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          task_id?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_order_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_comments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_measurement_templates: {
        Row: {
          created_at: string
          default_measurement_type: string
          default_unit: string
          description_ar: string | null
          description_en: string | null
          fields: Json
          id: string
          is_active: boolean
          ref_id: string | null
          sector_key: string
          sort_order: number
          template_key: string
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_measurement_type?: string
          default_unit?: string
          description_ar?: string | null
          description_en?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          ref_id?: string | null
          sector_key: string
          sort_order?: number
          template_key: string
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_measurement_type?: string
          default_unit?: string
          description_ar?: string | null
          description_en?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          ref_id?: string | null
          sector_key?: string
          sort_order?: number
          template_key?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_order_measurements: {
        Row: {
          business_id: string
          created_at: string
          deleted_at: string | null
          depth: number | null
          height: number | null
          id: string
          label: string
          length: number | null
          measurement_type: string
          metadata: Json
          notes: string | null
          quantity: number | null
          recorded_by_user_id: string
          ref_id: string | null
          task_id: string | null
          unit: string
          updated_at: string
          width: number | null
          work_order_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          deleted_at?: string | null
          depth?: number | null
          height?: number | null
          id?: string
          label: string
          length?: number | null
          measurement_type: string
          metadata?: Json
          notes?: string | null
          quantity?: number | null
          recorded_by_user_id: string
          ref_id?: string | null
          task_id?: string | null
          unit?: string
          updated_at?: string
          width?: number | null
          work_order_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          deleted_at?: string | null
          depth?: number | null
          height?: number | null
          id?: string
          label?: string
          length?: number | null
          measurement_type?: string
          metadata?: Json
          notes?: string | null
          quantity?: number | null
          recorded_by_user_id?: string
          ref_id?: string | null
          task_id?: string | null
          unit?: string
          updated_at?: string
          width?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_measurements_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_order_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_measurements_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_pipeline_events: {
        Row: {
          actor_id: string
          business_id: string
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          ref_id: string | null
          to_stage: string
          work_order_id: string
        }
        Insert: {
          actor_id: string
          business_id: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          ref_id?: string | null
          to_stage: string
          work_order_id: string
        }
        Update: {
          actor_id?: string
          business_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          ref_id?: string | null
          to_stage?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_pipeline_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_quotation_items: {
        Row: {
          boq_item_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          item_type: string
          metadata: Json
          quantity: number
          quotation_id: string
          ref_id: string | null
          sort_order: number
          title_ar: string
          title_en: string
          total_price: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          boq_item_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_type?: string
          metadata?: Json
          quantity?: number
          quotation_id: string
          ref_id?: string | null
          sort_order?: number
          title_ar: string
          title_en: string
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          boq_item_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_type?: string
          metadata?: Json
          quantity?: number
          quotation_id?: string
          ref_id?: string | null
          sort_order?: number
          title_ar?: string
          title_en?: string
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_quotation_items_boq_item_id_fkey"
            columns: ["boq_item_id"]
            isOneToOne: false
            referencedRelation: "work_order_boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "work_order_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_quotations: {
        Row: {
          approval_ip_hash: string | null
          approval_token_hash: string | null
          approval_user_agent_hash: string | null
          approved_at: string | null
          approved_by_name: string | null
          approved_by_title: string | null
          boq_id: string
          business_id: string
          contract_id: string | null
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          id: string
          notes: string | null
          pdf_attachment_id: string | null
          quotation_number: string
          ref_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          sent_at: string | null
          signature_text: string | null
          status: string
          subtotal: number
          tax: number
          title: string
          total: number
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
          work_order_id: string
        }
        Insert: {
          approval_ip_hash?: string | null
          approval_token_hash?: string | null
          approval_user_agent_hash?: string | null
          approved_at?: string | null
          approved_by_name?: string | null
          approved_by_title?: string | null
          boq_id: string
          business_id: string
          contract_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          pdf_attachment_id?: string | null
          quotation_number: string
          ref_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          signature_text?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
          work_order_id: string
        }
        Update: {
          approval_ip_hash?: string | null
          approval_token_hash?: string | null
          approval_user_agent_hash?: string | null
          approved_at?: string | null
          approved_by_name?: string | null
          approved_by_title?: string | null
          boq_id?: string
          business_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          pdf_attachment_id?: string | null
          quotation_number?: string
          ref_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          signature_text?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_quotations_boq_id_fkey"
            columns: ["boq_id"]
            isOneToOne: false
            referencedRelation: "work_order_boqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_quotations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_quotations_pdf_attachment_id_fkey"
            columns: ["pdf_attachment_id"]
            isOneToOne: false
            referencedRelation: "work_order_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_quotations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_sla_events: {
        Row: {
          business_id: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          level: string
          metadata: Json
          task_id: string | null
          work_order_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          level: string
          metadata?: Json
          task_id?: string | null
          work_order_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          level?: string
          metadata?: Json
          task_id?: string | null
          work_order_id?: string
        }
        Relationships: []
      }
      work_order_stage_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string
          assigned_to_user_id: string
          business_id: string
          created_at: string
          id: string
          notes: string | null
          ref_id: string | null
          stage_key: string
          unassigned_at: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id: string
          assigned_to_user_id: string
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          ref_id?: string | null
          stage_key: string
          unassigned_at?: string | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string
          assigned_to_user_id?: string
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          ref_id?: string | null
          stage_key?: string
          unassigned_at?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_stage_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_stages: {
        Row: {
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          sort_order: number
          stage_key: string
          started_at: string | null
          status: string
          title_ar: string
          title_en: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          stage_key: string
          started_at?: string | null
          status?: string
          title_ar: string
          title_en: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          stage_key?: string
          started_at?: string | null
          status?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_stages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_tasks: {
        Row: {
          assigned_to_user_id: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          description: string | null
          due_at: string | null
          id: string
          priority: string
          ref_id: string | null
          stage_id: string | null
          status: string
          title: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          ref_id?: string | null
          stage_id?: string | null
          status?: string
          title: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          assigned_to_user_id?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          ref_id?: string | null
          stage_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "work_order_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_warranties: {
        Row: {
          business_id: string
          closure_id: string | null
          created_at: string
          end_date: string
          id: string
          notes: string | null
          ref_id: string
          start_date: string
          status: string
          updated_at: string
          warranty_type: string
          work_order_id: string
        }
        Insert: {
          business_id: string
          closure_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          ref_id?: string
          start_date: string
          status?: string
          updated_at?: string
          warranty_type?: string
          work_order_id: string
        }
        Update: {
          business_id?: string
          closure_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          ref_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          warranty_type?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_warranties_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "project_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_warranties_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          current_stage_key: string | null
          customer_name: string | null
          customer_phone: string | null
          deleted_at: string | null
          due_at: string | null
          id: string
          owner_user_id: string
          pipeline_stage: string
          priority: string
          ref_id: string | null
          source_id: string | null
          source_ref_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          current_stage_key?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          due_at?: string | null
          id?: string
          owner_user_id: string
          pipeline_stage?: string
          priority?: string
          ref_id?: string | null
          source_id?: string | null
          source_ref_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          current_stage_key?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          due_at?: string | null
          id?: string
          owner_user_id?: string
          pipeline_stage?: string
          priority?: string
          ref_id?: string | null
          source_id?: string | null
          source_ref_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      brands_public: {
        Row: {
          brand_owner_company: string | null
          country_of_origin_code: string | null
          country_of_origin_name_ar: string | null
          country_of_origin_name_en: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          founded_year: number | null
          id: string | null
          is_local: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name_ar: string | null
          name_en: string | null
          ref_id: string | null
          sector_id: string | null
          slug: string | null
          verification_status: string | null
          website: string | null
        }
        Insert: {
          brand_owner_company?: string | null
          country_of_origin_code?: string | null
          country_of_origin_name_ar?: string | null
          country_of_origin_name_en?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          founded_year?: number | null
          id?: string | null
          is_local?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          ref_id?: string | null
          sector_id?: string | null
          slug?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          brand_owner_company?: string | null
          country_of_origin_code?: string | null
          country_of_origin_name_ar?: string | null
          country_of_origin_name_en?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          founded_year?: number | null
          id?: string | null
          is_local?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          ref_id?: string | null
          sector_id?: string | null
          slug?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      business_branches_public: {
        Row: {
          address: string | null
          business_id: string | null
          created_at: string | null
          district: string | null
          id: string | null
          is_active: boolean | null
          is_main: boolean | null
          latitude: number | null
          longitude: number | null
          name_ar: string | null
          name_en: string | null
          region: string | null
          sort_order: number | null
          street_name: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          created_at?: string | null
          district?: string | null
          id?: string | null
          is_active?: boolean | null
          is_main?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_en?: string | null
          region?: string | null
          sort_order?: number | null
          street_name?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string | null
          created_at?: string | null
          district?: string | null
          id?: string | null
          is_active?: boolean | null
          is_main?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_en?: string | null
          region?: string | null
          sort_order?: number | null
          street_name?: string | null
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
            foreignKeyName: "business_branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses_public: {
        Row: {
          address: string | null
          business_number: number | null
          category_id: string | null
          city_id: string | null
          country_id: string | null
          cover_url: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          district: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          membership_tier: Database["public"]["Enums"]["membership_tier"] | null
          name_ar: string | null
          name_en: string | null
          rating_avg: number | null
          rating_count: number | null
          ref_id: string | null
          region: string | null
          short_description_ar: string | null
          short_description_en: string | null
          street_name: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_number?: number | null
          category_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          name_ar?: string | null
          name_en?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          ref_id?: string | null
          region?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          street_name?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_number?: number | null
          category_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          name_ar?: string | null
          name_en?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          ref_id?: string | null
          region?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          street_name?: string | null
          updated_at?: string | null
          username?: string | null
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
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
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
      category_public_counts: {
        Row: {
          active_services_count: number | null
          category_id: string | null
          name_ar: string | null
          name_en: string | null
          parent_id: string | null
          providers_count: number | null
          services_count: number | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
          },
        ]
      }
      contract_amendment_approvals_safe: {
        Row: {
          amendment_hash: string | null
          amendment_id: string | null
          approval_method: string | null
          approved_at: string | null
          approver_role: string | null
          contract_hash_at_approval: string | null
          contract_id: string | null
          created_at: string | null
          id: string | null
        }
        Insert: {
          amendment_hash?: string | null
          amendment_id?: string | null
          approval_method?: string | null
          approved_at?: string | null
          approver_role?: string | null
          contract_hash_at_approval?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string | null
        }
        Update: {
          amendment_hash?: string | null
          amendment_id?: string | null
          approval_method?: string | null
          approved_at?: string | null
          approver_role?: string | null
          contract_hash_at_approval?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendment_approvals_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendment_approvals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_amendment_audit_safe: {
        Row: {
          action: string | null
          amendment_id: string | null
          created_at: string | null
          id: string | null
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          action?: string | null
          amendment_id?: string | null
          created_at?: string | null
          id?: string | null
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          action?: string | null
          amendment_id?: string | null
          created_at?: string | null
          id?: string | null
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendment_audit_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_versions_public: {
        Row: {
          archived_at: string | null
          body_hash: string | null
          created_at: string | null
          effective_from: string | null
          id: string | null
          language_precedence: string | null
          published_at: string | null
          published_by: string | null
          status: string | null
          superseded_by: string | null
          template_id: string | null
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          archived_at?: string | null
          body_hash?: string | null
          created_at?: string | null
          effective_from?: string | null
          id?: string | null
          language_precedence?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          superseded_by?: string | null
          template_id?: string | null
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          archived_at?: string | null
          body_hash?: string | null
          created_at?: string | null
          effective_from?: string | null
          id?: string | null
          language_precedence?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          superseded_by?: string | null
          template_id?: string | null
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_versions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_versions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "contract_template_versions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      private_sectors_public: {
        Row: {
          brand_type:
            | Database["public"]["Enums"]["private_sector_brand_type"]
            | null
          business_id: string | null
          business_name_ar: string | null
          business_name_en: string | null
          business_username: string | null
          category_id: string | null
          category_name_ar: string | null
          category_name_en: string | null
          category_slug: string | null
          city_id: string | null
          city_name_ar: string | null
          city_name_en: string | null
          contact_email: string | null
          contact_phone: string | null
          country_id: string | null
          cover_url: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          established_year: number | null
          id: string | null
          is_featured: boolean | null
          logo_url: string | null
          name_ar: string | null
          name_en: string | null
          parent_sector: string | null
          ref_id: string | null
          seo_description_ar: string | null
          seo_description_en: string | null
          seo_keywords: string[] | null
          seo_title_ar: string | null
          seo_title_en: string | null
          short_description_ar: string | null
          short_description_en: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_sectors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sectors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sectors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_sectors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_public_counts"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "private_sectors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_landing_settings_public: {
        Row: {
          bing_verification: string | null
          enable_tracking: boolean | null
          ga4_measurement_id: string | null
          gsc_verification: string | null
          gtm_container_id: string | null
          hero_video_url: string | null
          id: number | null
          keywords: string | null
          og_image_url: string | null
          seo_desc_ar: string | null
          seo_desc_en: string | null
          seo_title_ar: string | null
          seo_title_en: string | null
          updated_at: string | null
          yandex_verification: string | null
        }
        Insert: {
          bing_verification?: string | null
          enable_tracking?: boolean | null
          ga4_measurement_id?: string | null
          gsc_verification?: string | null
          gtm_container_id?: string | null
          hero_video_url?: string | null
          id?: number | null
          keywords?: string | null
          og_image_url?: string | null
          seo_desc_ar?: string | null
          seo_desc_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          updated_at?: string | null
          yandex_verification?: string | null
        }
        Update: {
          bing_verification?: string | null
          enable_tracking?: boolean | null
          ga4_measurement_id?: string | null
          gsc_verification?: string | null
          gtm_container_id?: string | null
          hero_video_url?: string | null
          id?: number | null
          keywords?: string | null
          og_image_url?: string | null
          seo_desc_ar?: string | null
          seo_desc_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          updated_at?: string | null
          yandex_verification?: string | null
        }
        Relationships: []
      }
      reviews_public: {
        Row: {
          business_id: string | null
          content: string | null
          created_at: string | null
          id: string | null
          is_verified: boolean | null
          project_id: string | null
          rating: number | null
          reviewer_avatar: string | null
          reviewer_name: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_contract_attachments_unparsed: {
        Row: {
          contract_id: string | null
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_attachments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _admin_log_barcode_event: {
        Args: {
          _barcode_id: string
          _event_type: string
          _new_status: string
          _previous_status: string
          _reason: string
        }
        Returns: undefined
      }
      _atlc_hash: { Args: { _code: string; _row_id: string }; Returns: string }
      _atlc_mask_identifier: { Args: { _identifier: string }; Returns: string }
      _atlc_normalize_identifier: {
        Args: { _identifier: string }
        Returns: string
      }
      _barcode_entity_label: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: Json
      }
      _build_template_snapshot_payload: {
        Args: { _version_id: string }
        Returns: Json
      }
      _can_manage_client_site: { Args: { _site_id: string }; Returns: boolean }
      _csag_manage_or_raise: {
        Args: { _grant_id: string }
        Returns: {
          access_level: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          ignored_at: string | null
          ignored_by: string | null
          provider_business_id: string
          provider_user_id: string
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          revoked_at: string | null
          revoked_by: string | null
          site_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "client_site_access_grants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _csnp_can_manage: {
        Args: { _site_id: string; _uid: string }
        Returns: boolean
      }
      _csnp_recipient: { Args: { _site_id: string }; Returns: string }
      _ct_assert_admin: { Args: never; Returns: undefined }
      _ct_assert_version_editable: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      _ct_notify_review_event: {
        Args: {
          p_action: string
          p_actor: string
          p_to_status: string
          p_version_id: string
        }
        Returns: undefined
      }
      _gen_client_site_qr_token: { Args: never; Returns: string }
      _membership_free_defaults: { Args: never; Returns: Json }
      _resolve_customer_tracking_link: {
        Args: { _token: string; _tracking_ref: string }
        Returns: {
          business_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          quotation_id: string | null
          ref_id: string
          revoked_at: string | null
          token_hash: string
          view_count: number
          work_order_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customer_tracking_links"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ab_assign_variant: {
        Args: { p_experiment_key: string; p_visitor_id: string }
        Returns: Json
      }
      ab_evaluate_experiments: { Args: never; Returns: Json }
      ab_experiment_stats: {
        Args: { p_key: string }
        Returns: {
          clicks: number
          ctr: number
          impressions: number
          is_active: boolean
          is_control: boolean
          variant_id: string
          variant_key: string
        }[]
      }
      ab_track_click: {
        Args: { p_experiment_key: string; p_visitor_id: string }
        Returns: boolean
      }
      ab_two_tailed_p: { Args: { z: number }; Returns: number }
      accept_client_invitation: { Args: { _token: string }; Returns: Json }
      accept_contract: {
        Args: { _contract_id: string }
        Returns: {
          business_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_accepted_at: string | null
          client_id: string | null
          completed_at: string | null
          contract_number: string
          contract_version: number
          country_id: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          document_hash: string | null
          end_date: string | null
          execution_address_snapshot: Json | null
          execution_site_id: string | null
          guest_client_email: string | null
          guest_client_name: string | null
          guest_client_phone: string | null
          id: string
          is_demo: boolean
          last_pdf_generated_at: string | null
          last_pdf_snapshot_id: string | null
          location_id: string | null
          locked_at: string | null
          official_version_number: number
          pricing_method: string | null
          provider_accepted_at: string | null
          provider_entity_id: string | null
          provider_id: string
          requester_entity_id: string | null
          service_category_id: string | null
          source_lead_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          supervisor_email: string | null
          supervisor_name: string | null
          supervisor_phone: string | null
          template_snapshot_id: string | null
          template_version_id: string | null
          terms_ar: string | null
          terms_en: string | null
          title_ar: string
          title_en: string | null
          total_amount: number
          updated_at: string
          vat_inclusive: boolean
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_invite_key: {
        Args: { _code: string }
        Returns: {
          business_id: string
          role: Database["public"]["Enums"]["business_staff_role"]
        }[]
      }
      accept_staff_invitation: { Args: { _token: string }; Returns: Json }
      add_business_sub_service: {
        Args: { p_business_id: string; p_sub_service_id: string }
        Returns: undefined
      }
      add_project_delivery_evidence: {
        Args: {
          _attachment_id?: string
          _caption_ar?: string
          _caption_en?: string
          _closure_id: string
          _is_customer_visible?: boolean
          _public_image_url?: string
        }
        Returns: Json
      }
      admin_add_client_site_operations_note: {
        Args: { _category: string; _note: string; _site_id: string }
        Returns: Json
      }
      admin_adjust_provider_credits: {
        Args: {
          p_action: string
          p_amount: number
          p_note?: string
          p_quote_request_lead_id?: string
          p_reason: string
          p_subscription_id: string
        }
        Returns: Json
      }
      admin_approve_brand: {
        Args: { _brand_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          brand_owner_company: string | null
          country_of_origin_code: string | null
          country_of_origin_name_ar: string | null
          country_of_origin_name_en: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          founded_year: number | null
          id: string
          is_active: boolean
          is_local: boolean
          is_verified: boolean
          logo_url: string | null
          merged_into_brand_id: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          ref_id: string | null
          rejection_reason: string | null
          sector_id: string | null
          slug: string | null
          source: string
          status: string
          submitted_by: string | null
          updated_at: string
          verification_status: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "brand_catalog"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_approve_provider_brand_link: {
        Args: { _link_id: string }
        Returns: {
          authorization_document_url: string | null
          authorization_ends_at: string | null
          authorization_starts_at: string | null
          authorization_status: string
          brand_id: string
          business_id: string
          business_service_id: string
          created_at: string
          id: string
          ref_id: string | null
          rejection_reason: string | null
          relationship_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          submitted_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "business_service_brands"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_archive_barcode: {
        Args: { _barcode_id: string; _reason?: string }
        Returns: Json
      }
      admin_archive_brand: {
        Args: { _brand_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          brand_owner_company: string | null
          country_of_origin_code: string | null
          country_of_origin_name_ar: string | null
          country_of_origin_name_en: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          founded_year: number | null
          id: string
          is_active: boolean
          is_local: boolean
          is_verified: boolean
          logo_url: string | null
          merged_into_brand_id: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          ref_id: string | null
          rejection_reason: string | null
          sector_id: string | null
          slug: string | null
          source: string
          status: string
          submitted_by: string | null
          updated_at: string
          verification_status: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "brand_catalog"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_barcode_registry_summary: { Args: never; Returns: Json }
      admin_bulk_set_business_active: {
        Args: { _active: boolean; _business_ids: string[] }
        Returns: number
      }
      admin_bulk_set_user_ban: {
        Args: { _banned: boolean; _user_ids: string[] }
        Returns: number
      }
      admin_check_identity_availability: {
        Args: {
          _email?: string
          _exclude_user_id?: string
          _phone?: string
          _username?: string
        }
        Returns: Json
      }
      admin_clear_module_override: {
        Args: { _module_key: string; _scope_type: string; _scope_value: string }
        Returns: boolean
      }
      admin_client_sites_monitoring_summary: { Args: never; Returns: Json }
      admin_contract_pdf_exports_summary: {
        Args: never
        Returns: {
          archived_count: number
          exports_7d: number
          exports_today: number
          top_source: string
          unique_contracts_30d: number
        }[]
      }
      admin_convert_lead_to_contract: {
        Args: { _lead_id: string }
        Returns: string
      }
      admin_create_contract_on_behalf: {
        Args: {
          _client_id: string
          _currency_code?: string
          _description_ar?: string
          _description_en?: string
          _end_date?: string
          _provider_id: string
          _start_date?: string
          _title_ar: string
          _title_en?: string
          _total_amount?: number
        }
        Returns: string
      }
      admin_freeze_barcode: {
        Args: { _barcode_id: string; _reason?: string }
        Returns: Json
      }
      admin_get_barcode_detail: { Args: { _barcode_id: string }; Returns: Json }
      admin_get_barcode_transfer_trail: {
        Args: { _barcode_id: string }
        Returns: {
          action: string
          actor_display_name: string
          actor_ref_id: string
          actor_user_id: string
          barcode_id: string
          created_at: string
          event_id: string
          from_display_name: string
          from_masked_email: string
          from_phone_hint: string
          from_ref_id: string
          from_user_id: string
          reason: string
          to_display_name: string
          to_masked_email: string
          to_phone_hint: string
          to_ref_id: string
          to_user_id: string
        }[]
      }
      admin_get_client_site_monitoring_detail: {
        Args: { _site_id: string }
        Returns: Json
      }
      admin_get_client_site_sensitive_detail: {
        Args: { _reason: string; _site_id: string }
        Returns: Json
      }
      admin_get_membership_lifecycle_email_markers: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          dispatch_key: string
          id: string
          message_id: string
          recipient_email: string
          status: string
          template_name: string
        }[]
      }
      admin_get_membership_lifecycle_jobs: {
        Args: never
        Returns: {
          active: boolean
          jobname: string
          last_run_end: string
          last_run_return_message: string
          last_run_started: string
          last_run_status: string
          recent_failures_count: number
          schedule: string
          total_runs_7d: number
        }[]
      }
      admin_identity_duplicates_report: {
        Args: never
        Returns: {
          details: Json
          kind: string
          occurrences: number
          user_ids: string[]
          value: string
        }[]
      }
      admin_identity_integrity_report: {
        Args: never
        Returns: {
          has_business: boolean
          has_profile: boolean
          has_role: boolean
          masked_email: string
          mismatch_type: string
          recommended_action: string
          synthetic_or_test: boolean
          user_id: string
        }[]
      }
      admin_issue_successor_barcode: {
        Args: { _reason?: string; _transferred_barcode_id: string }
        Returns: Json
      }
      admin_list_barcodes: {
        Args: {
          _entity_type?: string
          _limit?: number
          _offset?: number
          _search?: string
          _status?: string
          _visibility?: string
        }
        Returns: Json
      }
      admin_list_client_site_operations_notes: {
        Args: { _site_id: string }
        Returns: Json
      }
      admin_list_client_sites_monitoring: {
        Args: {
          _city?: string
          _limit?: number
          _offset?: number
          _qr_status?: string
          _search?: string
          _site_type?: string
          _status?: string
          _visibility?: string
        }
        Returns: Json
      }
      admin_list_contract_pdf_exports: {
        Args: {
          _contract_status?: string
          _date_from?: string
          _date_to?: string
          _limit?: number
          _offset?: number
          _search?: string
          _source?: string
          _template_version_number?: number
        }
        Returns: {
          amendment_count: number
          boq_group_count: number
          contract_number: string
          contract_status: string
          contract_version: number
          document_hash_prefix: string
          export_locale: string
          export_ref: string
          exported_at: string
          exporter_display_name: string
          line_item_count: number
          official_version_number: number
          source: string
          template_name_ar: string
          template_name_en: string
          template_version_number: number
          total_count: number
        }[]
      }
      admin_list_membership_usage: {
        Args: { _limit?: number; _only_over_or_near?: boolean }
        Returns: {
          business_id: string
          business_name_ar: string
          business_name_en: string
          limit_value: number
          metric: string
          near_cap: boolean
          over_limit: boolean
          owner_user_id: string
          period: string
          tier: string
          used: number
        }[]
      }
      admin_list_unparsed_attachments: {
        Args: never
        Returns: {
          contract_id: string | null
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_contract_attachments_unparsed"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_log_client_site_contact_action: {
        Args: {
          _channel: string
          _notes?: string
          _purpose: string
          _site_id: string
        }
        Returns: Json
      }
      admin_mark_membership_paid_manually: {
        Args: {
          p_admin_user_id: string
          p_external_payment_id?: string
          p_invoice_id?: string
          p_notes?: string
          p_paid_at?: string
          p_payment_intent_id: string
        }
        Returns: Json
      }
      admin_mark_membership_payment_refunded_manually: {
        Args: {
          p_admin_user_id: string
          p_notes?: string
          p_payment_intent_id: string
          p_refund_reference?: string
          p_refunded_at?: string
        }
        Returns: Json
      }
      admin_merge_brands: {
        Args: { _source_id: string; _target_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          brand_owner_company: string | null
          country_of_origin_code: string | null
          country_of_origin_name_ar: string | null
          country_of_origin_name_en: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          founded_year: number | null
          id: string
          is_active: boolean
          is_local: boolean
          is_verified: boolean
          logo_url: string | null
          merged_into_brand_id: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          ref_id: string | null
          rejection_reason: string | null
          sector_id: string | null
          slug: string | null
          source: string
          status: string
          submitted_by: string | null
          updated_at: string
          verification_status: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "brand_catalog"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_reassign_business_owner: {
        Args: {
          _business_id: string
          _new_owner_user_id: string
          _reason?: string
        }
        Returns: Json
      }
      admin_reject_brand: {
        Args: { _brand_id: string; _reason: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          brand_owner_company: string | null
          country_of_origin_code: string | null
          country_of_origin_name_ar: string | null
          country_of_origin_name_en: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          founded_year: number | null
          id: string
          is_active: boolean
          is_local: boolean
          is_verified: boolean
          logo_url: string | null
          merged_into_brand_id: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          ref_id: string | null
          rejection_reason: string | null
          sector_id: string | null
          slug: string | null
          source: string
          status: string
          submitted_by: string | null
          updated_at: string
          verification_status: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "brand_catalog"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_reject_provider_brand_link: {
        Args: { _link_id: string; _reason: string }
        Returns: {
          authorization_document_url: string | null
          authorization_ends_at: string | null
          authorization_starts_at: string | null
          authorization_status: string
          brand_id: string
          business_id: string
          business_service_id: string
          created_at: string
          id: string
          ref_id: string | null
          rejection_reason: string | null
          relationship_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          submitted_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "business_service_brands"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_restore_barcode: {
        Args: { _barcode_id: string; _reason?: string }
        Returns: Json
      }
      admin_rotate_client_site_qr_token: {
        Args: { _reason: string; _site_id: string }
        Returns: Json
      }
      admin_search_users_for_transfer: {
        Args: { _limit?: number; _query: string }
        Returns: {
          display_name: string
          masked_email: string
          phone_hint: string
          ref_id: string
          user_id: string
        }[]
      }
      admin_set_business_membership_tier: {
        Args: {
          _business_id: string
          _reason?: string
          _tier: Database["public"]["Enums"]["membership_tier"]
        }
        Returns: Json
      }
      admin_set_module_override: {
        Args: {
          _enabled: boolean
          _module_key: string
          _reason?: string
          _scope_type: string
          _scope_value: string
        }
        Returns: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          reason: string | null
          scope_type: string
          scope_value: string | null
          set_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "system_module_overrides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_sync_profile_email_from_auth: {
        Args: { _target_user_id: string }
        Returns: Json
      }
      admin_transfer_barcode: {
        Args: {
          _barcode_id: string
          _reason?: string
          _transfer_to_user_id: string
        }
        Returns: Json
      }
      admin_update_business_approval: {
        Args: {
          _business_id: string
          _new_status: Database["public"]["Enums"]["business_approval_status"]
          _notes?: string
        }
        Returns: Database["public"]["Enums"]["business_approval_status"]
      }
      admin_update_username_status: {
        Args: {
          _business_id: string
          _new_status: Database["public"]["Enums"]["username_status"]
          _notes?: string
        }
        Returns: Database["public"]["Enums"]["username_status"]
      }
      admin_upgrade_subscription: {
        Args: {
          _billing_cycle?: string
          _new_plan_id: string
          _subscription_id: string
        }
        Returns: string
      }
      amendment_canonical_safe_payload: {
        Args: { _amendment_id: string }
        Returns: Json
      }
      amendment_safe_hash: { Args: { _amendment_id: string }; Returns: string }
      apply_contract_amendment: {
        Args: { _amendment_id: string }
        Returns: {
          after_snapshot_id: string | null
          amendment_number: number | null
          amendment_type: string
          amount_delta: number | null
          applied_at: string | null
          applied_by: string | null
          before_snapshot_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_approved_at: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          internal_note: string | null
          new_amount: number | null
          new_end_date: string | null
          new_scope_summary: string | null
          old_end_date: string | null
          old_scope_summary: string | null
          old_total: number | null
          provider_approved_at: string | null
          public_reason: string | null
          reason: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          superseded_by: string | null
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contract_amendments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_brand_addition_request: {
        Args: { p_admin_note?: string; p_request_id: string }
        Returns: {
          admin_notes: string | null
          approved_brand_id: string | null
          brand_id: string | null
          business_id: string
          business_service_id: string | null
          created_at: string
          description: string | null
          documents: Json
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string | null
          notes: string | null
          proposed_country_of_origin_code: string | null
          proposed_manufacturing_countries: Json
          proposed_sector_ids: string[]
          proposed_service_ids: string[]
          ref_id: string | null
          reject_reason: string | null
          relationship_type: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sector_id: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "brand_addition_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_client_site_access: {
        Args: { _access_level?: string; _grant_id: string; _reason?: string }
        Returns: Json
      }
      approve_contract_amendment: {
        Args: { _amendment_id: string }
        Returns: {
          after_snapshot_id: string | null
          amendment_number: number | null
          amendment_type: string
          amount_delta: number | null
          applied_at: string | null
          applied_by: string | null
          before_snapshot_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_approved_at: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          internal_note: string | null
          new_amount: number | null
          new_end_date: string | null
          new_scope_summary: string | null
          old_end_date: string | null
          old_scope_summary: string | null
          old_total: number | null
          provider_approved_at: string | null
          public_reason: string | null
          reason: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          superseded_by: string | null
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contract_amendments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_quotation_by_token: {
        Args: {
          _approved_by_name: string
          _approved_by_title?: string
          _ip_hash?: string
          _ref_id: string
          _signature_text: string
          _token: string
          _user_agent_hash?: string
        }
        Returns: Json
      }
      approve_service_addition_request: {
        Args: { p_admin_note?: string; p_request_id: string }
        Returns: {
          approved_sub_service_id: string | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          name_ar: string
          name_en: string | null
          ref_id: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sector_id: string
          status: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "service_addition_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_client_site: { Args: { _site_id: string }; Returns: Json }
      archive_expired_contract_pdf_exports: { Args: never; Returns: number }
      barcode_entity_prefix: { Args: { _entity_type: string }; Returns: string }
      build_execution_address_snapshot: {
        Args: { _site_id: string }
        Returns: Json
      }
      bump_help_article_helpful: {
        Args: { _helpful: boolean; _slug: string }
        Returns: undefined
      }
      bump_help_article_view: { Args: { _slug: string }; Returns: undefined }
      bump_migration_epoch: { Args: { _reason?: string }; Returns: number }
      calculate_contract_line_item_total: {
        Args: {
          _formula_inputs: Json
          _pricing_method: string
          _quantity: number
          _unit_price: number
        }
        Returns: Json
      }
      can_access_address: {
        Args: { _owner_id: string; _owner_type: string }
        Returns: boolean
      }
      cancel_client_invitation: { Args: { _id: string }; Returns: Json }
      cancel_contract: {
        Args: { _contract_id: string; _reason?: string }
        Returns: {
          business_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_accepted_at: string | null
          client_id: string | null
          completed_at: string | null
          contract_number: string
          contract_version: number
          country_id: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          document_hash: string | null
          end_date: string | null
          execution_address_snapshot: Json | null
          execution_site_id: string | null
          guest_client_email: string | null
          guest_client_name: string | null
          guest_client_phone: string | null
          id: string
          is_demo: boolean
          last_pdf_generated_at: string | null
          last_pdf_snapshot_id: string | null
          location_id: string | null
          locked_at: string | null
          official_version_number: number
          pricing_method: string | null
          provider_accepted_at: string | null
          provider_entity_id: string | null
          provider_id: string
          requester_entity_id: string | null
          service_category_id: string | null
          source_lead_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          supervisor_email: string | null
          supervisor_name: string | null
          supervisor_phone: string | null
          template_snapshot_id: string | null
          template_version_id: string | null
          terms_ar: string | null
          terms_en: string | null
          title_ar: string
          title_en: string | null
          total_amount: number
          updated_at: string
          vat_inclusive: boolean
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_contract_amendment: {
        Args: { _amendment_id: string }
        Returns: {
          after_snapshot_id: string | null
          amendment_number: number | null
          amendment_type: string
          amount_delta: number | null
          applied_at: string | null
          applied_by: string | null
          before_snapshot_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_approved_at: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          internal_note: string | null
          new_amount: number | null
          new_end_date: string | null
          new_scope_summary: string | null
          old_end_date: string | null
          old_scope_summary: string | null
          old_total: number | null
          provider_approved_at: string | null
          public_reason: string | null
          reason: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          superseded_by: string | null
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contract_amendments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_installation_appointment: {
        Args: { _ref_id: string }
        Returns: boolean
      }
      cancel_subscription: {
        Args: { _subscription_id: string }
        Returns: undefined
      }
      cancel_subscription_at_period_end: {
        Args: { _downgrade_to_plan_id?: string; _subscription_id: string }
        Returns: undefined
      }
      categorize_email_link: { Args: { _url: string }; Returns: string }
      check_business_cr_duplicates: {
        Args: {
          _exclude_business_id: string
          _national_id?: string
          _unified_number?: string
          _vat_number?: string
        }
        Returns: {
          field: string
          id: string
          name_ar: string
          name_en: string
          ref_id: string
          value: string
        }[]
      }
      check_email_deliverability: { Args: never; Returns: undefined }
      check_email_registered: { Args: { _email: string }; Returns: boolean }
      check_password_reset_rate_limit: {
        Args: { _email: string }
        Returns: boolean
      }
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
      check_username_available: {
        Args: { _exclude_user?: string; _username: string }
        Returns: Json
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_audit_data: { Args: never; Returns: undefined }
      cleanup_old_migration_telemetry: { Args: never; Returns: undefined }
      client_site_can_manage: {
        Args: {
          _site: Database["public"]["Tables"]["client_sites"]["Row"]
          _user_id: string
        }
        Returns: boolean
      }
      clone_contract_as_draft: {
        Args: {
          _include_line_items?: boolean
          _include_supervisor?: boolean
          _include_terms?: boolean
          _source_contract_id: string
        }
        Returns: Json
      }
      complete_contract: {
        Args: { _contract_id: string }
        Returns: {
          business_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_accepted_at: string | null
          client_id: string | null
          completed_at: string | null
          contract_number: string
          contract_version: number
          country_id: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          document_hash: string | null
          end_date: string | null
          execution_address_snapshot: Json | null
          execution_site_id: string | null
          guest_client_email: string | null
          guest_client_name: string | null
          guest_client_phone: string | null
          id: string
          is_demo: boolean
          last_pdf_generated_at: string | null
          last_pdf_snapshot_id: string | null
          location_id: string | null
          locked_at: string | null
          official_version_number: number
          pricing_method: string | null
          provider_accepted_at: string | null
          provider_entity_id: string | null
          provider_id: string
          requester_entity_id: string | null
          service_category_id: string | null
          source_lead_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          supervisor_email: string | null
          supervisor_name: string | null
          supervisor_phone: string | null
          template_snapshot_id: string | null
          template_version_id: string | null
          terms_ar: string | null
          terms_en: string | null
          title_ar: string
          title_en: string | null
          total_amount: number
          updated_at: string
          vat_inclusive: boolean
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_contract_from_invitation: {
        Args: { _invite_id: string }
        Returns: string
      }
      complete_installation_appointment: {
        Args: { _ref_id: string }
        Returns: boolean
      }
      compute_business_onboarding_completion: {
        Args: { _business_id: string }
        Returns: number
      }
      consume_provider_lead_credit: {
        Args: {
          p_business_id: string
          p_cost: number
          p_created_by?: string
          p_idempotency_key?: string
          p_quote_request_lead_id?: string
          p_reason: string
        }
        Returns: Json
      }
      contract_caller_can_act: {
        Args: { _contract_id: string }
        Returns: {
          is_admin: boolean
          is_client: boolean
          is_provider: boolean
        }[]
      }
      contract_canonical_snapshot: {
        Args: { _contract_id: string }
        Returns: Json
      }
      contract_snapshot_hash: { Args: { _snapshot: Json }; Returns: string }
      create_access_key: {
        Args: { _business_id?: string; _name: string; _scopes?: Json }
        Returns: {
          expires_at: string
          id: string
          key_prefix: string
          raw_key: string
        }[]
      }
      create_barcode_for_entity: {
        Args: {
          _barcode_code?: string
          _entity_id: string
          _entity_type: string
          _metadata?: Json
          _owner_business_id?: string
          _owner_user_id?: string
          _source?: string
          _visibility?: string
        }
        Returns: Json
      }
      create_client_invitation: {
        Args: {
          _business_id?: string
          _draft_payload?: Json
          _email: string
          _name?: string
          _phone?: string
          _template_version_id?: string
          _work_type?: string
        }
        Returns: Json
      }
      create_client_site: { Args: { _payload: Json }; Returns: Json }
      create_contract_draft_from_quotation: {
        Args: { _quotation_id: string }
        Returns: Json
      }
      create_contract_from_template: {
        Args: {
          _payload: Json
          _pricing_method?: string
          _template_version_id: string
        }
        Returns: string
      }
      create_customer_tracking_link: {
        Args: {
          _customer_email?: string
          _expires_at?: string
          _work_order_id: string
        }
        Returns: Json
      }
      create_installation_appointment: {
        Args: {
          _customer_tracking_link_id?: string
          _internal_note?: string
          _scheduled_date: string
          _time_window?: string
          _work_order_id: string
        }
        Returns: Json
      }
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
      create_or_get_lead_conversation: {
        Args: { _lead_id: string }
        Returns: string
      }
      create_project_closure: {
        Args: { _completion_date?: string; _work_order_id: string }
        Returns: Json
      }
      create_temporary_login_code: {
        Args: { _identifier: string; _purpose?: string; _user_id?: string }
        Returns: Json
      }
      csag_site_summary: { Args: { _site_id: string }; Returns: Json }
      customer_confirm_appointment: {
        Args: { _apt_ref: string; _token: string; _tracking_ref: string }
        Returns: boolean
      }
      customer_confirm_project_completion: {
        Args: { _token: string; _tracking_ref: string }
        Returns: boolean
      }
      customer_report_project_issue: {
        Args: { _text: string; _token: string; _tracking_ref: string }
        Returns: boolean
      }
      customer_request_appointment_reschedule: {
        Args: {
          _apt_ref: string
          _note?: string
          _token: string
          _tracking_ref: string
        }
        Returns: boolean
      }
      customer_submit_feedback: {
        Args: {
          _rating: number
          _text?: string
          _token: string
          _tracking_ref: string
          _would_recommend?: boolean
        }
        Returns: Json
      }
      customer_submit_nps: {
        Args: { _score: number; _token: string; _tracking_ref: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_district: {
        Args: {
          _city: string
          _city_en?: string
          _country_code: string
          _district_ar: string
          _district_en?: string
          _region: string
          _region_en?: string
          _source?: string
        }
        Returns: string
      }
      expire_client_invitations: { Args: never; Returns: Json }
      find_auth_user_email_by_identifier: {
        Args: { _identifier: string }
        Returns: string
      }
      find_user_by_ref_id: {
        Args: { _ref_id: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          phone: string
          ref_id: string
          user_id: string
        }[]
      }
      generate_barcode_code: { Args: { _entity_type: string }; Returns: string }
      generate_client_site_ref: { Args: never; Returns: string }
      generate_invite_key: {
        Args: {
          _business_id: string
          _max_uses?: number
          _notes?: string
          _role?: Database["public"]["Enums"]["business_staff_role"]
          _valid_days?: number
        }
        Returns: {
          code: string
          expires_at: string
          id: string
        }[]
      }
      generate_ref_id: {
        Args: { _prefix: string; _seq_name: string }
        Returns: string
      }
      get_active_delegated_permissions: {
        Args: { _business_id: string; _user_id: string }
        Returns: string[]
      }
      get_active_membership_limits: {
        Args: { _business_id?: string; _user_id: string }
        Returns: Json
      }
      get_admin_contract_analytics_dashboard: {
        Args: {
          _business_id?: string
          _include_demo?: boolean
          _period?: string
        }
        Returns: Json
      }
      get_business_staff_with_profiles: {
        Args: { _business_id: string }
        Returns: {
          avatar_url: string
          business_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          ref_id: string
          role: Database["public"]["Enums"]["business_staff_role"]
          user_id: string
        }[]
      }
      get_client_site_notification_preferences: {
        Args: { _site_id: string }
        Returns: Json
      }
      get_contact_inbox_settings: {
        Args: never
        Returns: {
          alert_on_max_retries: boolean
          alert_recipients: string[]
          id: number
          max_notification_attempts: number
          muted_user_ids: string[]
          notify_email_on_assign: boolean
          notify_email_on_priority_change: boolean
          notify_email_on_status_change: boolean
          notify_webhook_on_assign: boolean
          notify_webhook_on_priority_change: boolean
          notify_webhook_on_status_change: boolean
          retry_backoff_seconds: number
          role_subscriptions: Json
          stale_hours: number
          target_resolution_hours: number
          target_response_hours: number
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
          webhook_url: string | null
          weekly_report_recipients: string[]
        }
        SetofOptions: {
          from: "*"
          to: "contact_inbox_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_contact_sla_compliance: {
        Args: { _from?: string; _group_by?: string; _to?: string }
        Returns: Json
      }
      get_contact_sla_weekly: { Args: never; Returns: Json }
      get_contract_analytics_dashboard: {
        Args: { _business_id?: string; _period?: string; _scope?: string }
        Returns: Json
      }
      get_contract_counterpart_profile: {
        Args: { _contract_id: string; _user_id: string }
        Returns: {
          account_type: string
          avatar_url: string
          full_name: string
          ref_id: string
          user_id: string
        }[]
      }
      get_contract_full_audit_trail: {
        Args: { _contract_id: string }
        Returns: Json
      }
      get_contract_source_lead_summary: {
        Args: { _contract_id: string }
        Returns: Json
      }
      get_cron_run_health: {
        Args: { _since?: string }
        Returns: {
          avg_duration_ms: number
          failed_runs: number
          function_name: string
          job_name: string
          last_failed_at: string
          last_ok_at: string
          last_run_at: string
          latest_error_code: string
          latest_status: string
          max_duration_ms: number
          ok_runs: number
          success_rate: number
          total_runs: number
        }[]
      }
      get_current_migration_rerun: {
        Args: never
        Returns: {
          epoch: number
          last_rerun_at: string
          reason: string
        }[]
      }
      get_customer_project_snapshot: {
        Args: { _ref_id: string; _token: string }
        Returns: Json
      }
      get_email_deliverability_stats: {
        Args: { _window_minutes?: number }
        Returns: {
          bounce_rate: number
          bounced: number
          complained: number
          complaint_rate: number
          dlq: number
          failed: number
          failure_rate: number
          pending: number
          sent: number
          suppressed: number
          total: number
        }[]
      }
      get_email_engagement_stats: {
        Args: { _window_minutes?: number }
        Returns: {
          click_rate: number
          delivered: number
          open_rate: number
          total_clicks: number
          total_opens: number
          unique_clicks: number
          unique_opens: number
        }[]
      }
      get_email_link_category_stats: {
        Args: { _window_minutes?: number }
        Returns: {
          category: string
          ctr: number
          total_clicks: number
          unique_clicks: number
          unique_messages: number
        }[]
      }
      get_entity_barcode_code: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: string
      }
      get_home_stats: { Args: never; Returns: Json }
      get_loyalty_summary: {
        Args: { _user_id: string }
        Returns: {
          level: string
          total_points: number
        }[]
      }
      get_membership_usage: {
        Args: { _business_id?: string; _user_id?: string }
        Returns: {
          limit_value: number
          metric: string
          near_cap: boolean
          over_limit: boolean
          period: string
          used: number
        }[]
      }
      get_migration_epoch: { Args: never; Returns: number }
      get_migration_failure_stats_24h: {
        Args: never
        Returns: {
          failed_events: number
          failure_rate: number
          total_events: number
        }[]
      }
      get_migration_failure_stats_window: {
        Args: { _hours: number }
        Returns: {
          failed_events: number
          failure_rate: number
          total_events: number
        }[]
      }
      get_migration_rerun_history: {
        Args: { _limit?: number }
        Returns: {
          cooldown_minutes: number
          failed_events: number
          new_epoch: number
          reason: string
          rerun_at: string
          success_events: number
          total_events: number
          triggered_by: string
          triggered_by_email: string
          triggered_by_name: string
          unique_users: number
          window_until: string
        }[]
      }
      get_my_staff_invitations: {
        Args: never
        Returns: {
          accepted_at: string
          business_id: string
          business_name_ar: string
          business_name_en: string
          created_at: string
          email: string
          expires_at: string
          id: string
          is_expired: boolean
          role: string
          status: string
          token: string
        }[]
      }
      get_promo_code_status: {
        Args: { _code_id: string }
        Returns: {
          max_redemptions: number
          remaining: number
          status: string
          used_count: number
        }[]
      }
      get_public_bnpl_for_business: {
        Args: { _business_id: string }
        Returns: {
          bnpl_provider_id: string
          business_id: string
          id: string
          is_active: boolean
        }[]
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
      get_public_business_data: {
        Args: { _business_id: string }
        Returns: {
          address: string
          business_number: number
          category_id: string
          city_id: string
          country_id: string
          cover_url: string
          created_at: string
          description_ar: string
          description_en: string
          district: string
          email: string
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number
          logo_url: string
          longitude: number
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          mobile: string
          name_ar: string
          name_en: string
          phone: string
          rating_avg: number
          rating_count: number
          ref_id: string
          region: string
          short_description_ar: string
          short_description_en: string
          street_name: string
          updated_at: string
          user_id: string
          username: string
          website: string
        }[]
      }
      get_public_profile: {
        Args: { _username: string }
        Returns: {
          account_type: string
          avatar_url: string
          city_name_ar: string
          city_name_en: string
          country_name_ar: string
          country_name_en: string
          created_at: string
          full_name: string
          full_name_ar: string
          full_name_en: string
          is_verified: boolean
          membership_tier: string
          region_name: string
          username: string
        }[]
      }
      get_public_site_by_token: { Args: { _token: string }; Returns: Json }
      get_quotation_by_token: {
        Args: { _ref_id: string; _token: string }
        Returns: Json
      }
      get_review_authors: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      get_staff_invitation_preview: {
        Args: { _token: string }
        Returns: {
          business_id: string
          business_name_ar: string
          business_name_en: string
          email: string
          expires_at: string
          id: string
          role: string
          status: string
        }[]
      }
      get_user_entity_contexts: {
        Args: { _user_id: string }
        Returns: {
          entity_id: string
          is_owner: boolean
          legacy_ref_id: string
          name_ar: string
          ref_id: string
          role: string
        }[]
      }
      get_user_visible_modules:
        | {
            Args: { _user_id: string }
            Returns: {
              enabled: boolean
              module_key: string
              source: string
            }[]
          }
        | {
            Args: { _entity_id?: string; _user_id: string }
            Returns: {
              enabled: boolean
              module_key: string
              source: string
            }[]
          }
      get_web_vitals_summary: {
        Args: { _hours?: number }
        Returns: {
          good_pct: number
          metric_name: string
          p50: number
          p75: number
          p95: number
          sample_count: number
        }[]
      }
      grant_loyalty_points: {
        Args: {
          _points: number
          _reason: string
          _reference_id?: string
          _user_id: string
        }
        Returns: undefined
      }
      grant_monthly_provider_credit: {
        Args: {
          p_amount: number
          p_period_end: string
          p_period_start: string
          p_plan_code?: string
          p_subscription_id: string
        }
        Returns: Json
      }
      has_active_delegated_access: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_business_permission: {
        Args: {
          _action: string
          _business_id: string
          _module: Database["public"]["Enums"]["business_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_business_role: {
        Args: {
          _business_id: string
          _roles: Database["public"]["Enums"]["business_staff_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_entity_membership: {
        Args: { _entity_id: string; _permission?: string; _user_id: string }
        Returns: boolean
      }
      has_location_access: {
        Args: { _location_id: string; _permission?: string; _user_id: string }
        Returns: boolean
      }
      has_membership_feature: {
        Args: { _business_id?: string; _feature_key: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _entity_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_site_qr_token: { Args: { _token: string }; Returns: string }
      ignore_client_site_access: {
        Args: { _grant_id: string; _reason?: string }
        Returns: Json
      }
      increment_blog_views: { Args: { _post_id: string }; Returns: undefined }
      increment_promotion_views: {
        Args: { _promotion_id: string }
        Returns: undefined
      }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_owner_of: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
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
      is_valid_username: { Args: { _username: string }; Returns: Json }
      is_work_order_member: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      issue_client_site_qr_token: { Args: { _site_id: string }; Returns: Json }
      jsonb_diff: { Args: { _new: Json; _old: Json }; Returns: Json }
      link_lead_to_contract: {
        Args: { _contract_id: string; _lead_id: string }
        Returns: Json
      }
      list_admin_assignees: {
        Args: never
        Returns: {
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      list_client_sites_for_contract: {
        Args: { _business_id: string; _client_user_id?: string }
        Returns: {
          access_notes: string
          address_line1: string
          address_line2: string
          city_id: string
          city_name: string
          client_user_id: string
          contact_name: string
          contact_phone: string
          district: string
          id: string
          is_default: boolean
          label: string
          latitude: number
          longitude: number
          map_url: string
          site_name: string
          site_ref: string
          site_type: string
        }[]
      }
      list_contact_audit_events: {
        Args: {
          _actor?: string
          _event_types?: string[]
          _from?: string
          _limit?: number
          _message_id?: string
          _to?: string
        }
        Returns: {
          actor_email: string
          actor_id: string
          actor_name: string
          created_at: string
          event_type: string
          from_value: string
          id: string
          message_email: string
          message_id: string
          message_name: string
          message_subject: string
          metadata: Json
          note: string
          ticket_number: string
          to_value: string
        }[]
      }
      list_contact_notification_log: {
        Args: {
          _channel?: string
          _event_type?: string
          _from?: string
          _limit?: number
          _message_id?: string
          _status?: string
          _to?: string
        }
        Returns: {
          attempt_count: number
          channel: string
          created_at: string
          error_code: string
          error_message: string
          event_id: string
          event_type: string
          http_status: number
          id: string
          last_attempt_at: string
          max_attempts: number
          message_id: string
          next_retry_at: string
          recipient: string
          response_body: string
          status: string
          ticket_number: string
        }[]
      }
      list_contract_pdf_exports: {
        Args: {
          _contract_id: string
          _contract_version?: number
          _limit?: number
          _offset?: number
          _search?: string
          _source?: string
          _template_version_number?: number
        }
        Returns: {
          amendment_count: number
          boq_group_count: number
          contract_number: string
          contract_status: string
          contract_version: number
          document_hash_prefix: string
          export_locale: string
          export_ref: string
          exported_at: string
          exporter_display_name: string
          is_self: boolean
          line_item_count: number
          official_version_number: number
          source: string
          template_name_ar: string
          template_name_en: string
          template_version_number: number
          total_count: number
        }[]
      }
      list_membership_plan_modules: {
        Args: { _plan_id: string }
        Returns: {
          category: string
          enabled: boolean
          is_core: boolean
          label_ar: string
          label_en: string
          module_key: string
        }[]
      }
      list_my_site_access_grants: { Args: never; Returns: Json }
      list_site_access_requests_for_owner: {
        Args: { _site_id?: string }
        Returns: Json
      }
      log_cron_run: {
        Args: {
          _error_code?: string
          _error_message?: string
          _finished_at: string
          _function_name: string
          _job_name: string
          _ok: boolean
          _started_at: string
          _status: string
          _summary: Json
        }
        Returns: string
      }
      log_sector_pageview: {
        Args: {
          p_city?: string
          p_path?: string
          p_referrer?: string
          p_sector: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          _event_action: string
          _event_type: string
          _ip_hash?: string
          _metadata?: Json
          _reason?: string
          _request_id?: string
          _status?: string
          _subject_hash?: string
          _user_agent?: string
          _user_id?: string
        }
        Returns: string
      }
      log_site_visit: {
        Args: {
          _action?: string
          _attempted_section?: string
          _metadata?: Json
          _provider_business_id?: string
          _site_id: string
          _visit_source: string
        }
        Returns: Json
      }
      log_upgrade_rejection: {
        Args: {
          _attempted_business_id: string
          _attempted_business_ref_id: string
          _billing_cycle: string
          _error_message: string
          _reason_code: string
          _requested_tier: string
          _user_agent: string
        }
        Returns: string
      }
      lookup_by_reference: {
        Args: { _ref: string }
        Returns: {
          canonical_route: string
          entity_type: string
          id: string
          legacy_ref_id: string
          ref_id: string
          table_name: string
        }[]
      }
      market_sector_city_stats: {
        Args: { p_days?: number }
        Returns: {
          backlink_visits: number
          city_slug: string
          growth_pct: number
          sector_slug: string
          unique_referrers: number
          visits_current: number
          visits_previous: number
        }[]
      }
      market_top_referrers: {
        Args: { p_days?: number; p_limit?: number; p_sector?: string }
        Returns: {
          first_seen: string
          last_seen: string
          referrer_host: string
          sector_slug: string
          visits: number
        }[]
      }
      market_visits_timeseries: {
        Args: { p_city?: string; p_days?: number; p_sector?: string }
        Returns: {
          day: string
          sector_slug: string
          visits: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_barcode_code: { Args: { _code: string }; Returns: string }
      notify_expiring_memberships: { Args: never; Returns: number }
      owner_clear_module_override: {
        Args: { _module_key: string; _scope_type: string; _scope_value: string }
        Returns: boolean
      }
      owner_employs_user: {
        Args: { _owner_id: string; _staff_user_id: string }
        Returns: boolean
      }
      owner_get_staff_visible_modules: {
        Args: { _entity_id?: string; _staff_user_id: string }
        Returns: {
          enabled: boolean
          module_key: string
          source: string
        }[]
      }
      owner_set_module_override: {
        Args: {
          _enabled: boolean
          _module_key: string
          _reason?: string
          _scope_type: string
          _scope_value: string
        }
        Returns: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          reason: string | null
          scope_type: string
          scope_value: string | null
          set_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "system_module_overrides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_contract_prefill_from_lead: {
        Args: { _lead_id: string }
        Returns: Json
      }
      private_sector_make_slug: {
        Args: { _name: string; _ref: string }
        Returns: string
      }
      process_expired_memberships: {
        Args: never
        Returns: {
          notified_count: number
          processed_count: number
        }[]
      }
      process_renewal_failures: {
        Args: never
        Returns: {
          downgraded: number
          grace_started: number
          notified: number
        }[]
      }
      process_work_order_sla_due_items: { Args: never; Returns: Json }
      procurement_award_quote: { Args: { _quote_id: string }; Returns: string }
      provider_clients_list: {
        Args: {
          _filter?: string
          _limit?: number
          _offset?: number
          _q?: string
        }
        Returns: {
          active_contracts: number
          client_key: string
          currency: string
          email_masked: string
          full_name: string
          has_account: boolean
          is_guest: boolean
          last_interaction: string
          phone_masked: string
          ref_id: string
          total_contracts: number
          total_leads: number
          total_value: number
          user_id: string
        }[]
      }
      prune_cron_run_log: { Args: { _older_than_days?: number }; Returns: Json }
      quick_resolve_contract_client: {
        Args: { _email?: string; _phone?: string }
        Returns: {
          email_masked: string
          full_name: string
          matched_on: string
          matched_user_id: string
          phone_masked: string
          ref_id: string
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_contract_total: { Args: { _contract_id: string }; Returns: number }
      record_access_key_usage: {
        Args: {
          _endpoint?: string
          _ip?: string
          _key_prefix: string
          _method?: string
          _status_code?: number
          _user_agent?: string
        }
        Returns: string
      }
      record_contract_pdf_export: {
        Args: {
          _contract_id: string
          _export_locale?: string
          _source?: string
        }
        Returns: {
          contract_number: string
          document_hash_prefix: string
          export_id: string
          exported_at: string
        }[]
      }
      record_email_click: { Args: { _message_id: string }; Returns: undefined }
      record_email_link_click: {
        Args: { _message_id: string; _target_url: string }
        Returns: undefined
      }
      record_email_open: { Args: { _message_id: string }; Returns: undefined }
      redeem_loyalty_reward: { Args: { _reward_id: string }; Returns: string }
      redeem_promo_code: {
        Args: { _business_id?: string; _code: string }
        Returns: {
          message: string
          subscription_id: string
          success: boolean
        }[]
      }
      reject_brand_addition_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: {
          admin_notes: string | null
          approved_brand_id: string | null
          brand_id: string | null
          business_id: string
          business_service_id: string | null
          created_at: string
          description: string | null
          documents: Json
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string | null
          notes: string | null
          proposed_country_of_origin_code: string | null
          proposed_manufacturing_countries: Json
          proposed_sector_ids: string[]
          proposed_service_ids: string[]
          ref_id: string | null
          reject_reason: string | null
          relationship_type: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sector_id: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "brand_addition_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_client_site_access: {
        Args: { _grant_id: string; _reason?: string }
        Returns: Json
      }
      reject_contract_amendment: {
        Args: { _amendment_id: string; _reason: string }
        Returns: {
          after_snapshot_id: string | null
          amendment_number: number | null
          amendment_type: string
          amount_delta: number | null
          applied_at: string | null
          applied_by: string | null
          before_snapshot_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_approved_at: string | null
          contract_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          internal_note: string | null
          new_amount: number | null
          new_end_date: string | null
          new_scope_summary: string | null
          old_end_date: string | null
          old_scope_summary: string | null
          old_total: number | null
          provider_approved_at: string | null
          public_reason: string | null
          reason: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          superseded_by: string | null
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contract_amendments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_quotation_by_token: {
        Args: { _reason: string; _ref_id: string; _token: string }
        Returns: Json
      }
      reject_service_addition_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: {
          approved_sub_service_id: string | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          name_ar: string
          name_en: string | null
          ref_id: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sector_id: string
          status: Database["public"]["Enums"]["service_request_status"]
          ticket_ref_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "service_addition_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_business_sub_service: {
        Args: { p_business_id: string; p_sub_service_id: string }
        Returns: undefined
      }
      request_client_site_access: {
        Args: {
          _provider_business_id: string
          _reason?: string
          _site_ref: string
        }
        Returns: Json
      }
      resend_client_invitation: { Args: { _id: string }; Returns: Json }
      resolve_barcode: { Args: { _code: string }; Returns: Json }
      resolve_site_section_visibility: {
        Args: {
          _approved_grant_level?: string
          _site_id: string
          _viewer_business_id?: string
        }
        Returns: Json
      }
      resume_subscription_renewal: {
        Args: { _subscription_id: string }
        Returns: undefined
      }
      review_private_sector: {
        Args: {
          _decision: Database["public"]["Enums"]["private_sector_status"]
          _id: string
          _reason?: string
        }
        Returns: {
          brand_type: Database["public"]["Enums"]["private_sector_brand_type"]
          business_id: string
          category_id: string | null
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          country_id: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          established_year: number | null
          id: string
          is_featured: boolean
          logo_url: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          parent_sector: string
          ref_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seo_description_ar: string | null
          seo_description_en: string | null
          seo_keywords: string[]
          seo_title_ar: string | null
          seo_title_en: string | null
          short_description_ar: string | null
          short_description_en: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["private_sector_status"]
          submitted_at: string | null
          updated_at: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "private_sectors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_private_sector_distributor: {
        Args: {
          _decision: Database["public"]["Enums"]["private_sector_link_status"]
          _id: string
        }
        Returns: {
          business_id: string
          created_at: string
          id: string
          notes: string | null
          ref_id: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["private_sector_distributor_role"]
          sector_id: string
          since_date: string | null
          status: Database["public"]["Enums"]["private_sector_link_status"]
          territory_ar: string | null
          territory_en: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "private_sector_distributors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_access_key: {
        Args: { _key_id: string; _reason?: string }
        Returns: boolean
      }
      revoke_client_site_access: {
        Args: { _grant_id: string; _reason?: string }
        Returns: Json
      }
      revoke_client_site_qr_token: { Args: { _site_id: string }; Returns: Json }
      revoke_customer_tracking_link: {
        Args: { _ref_id: string }
        Returns: boolean
      }
      revoke_invite_key: {
        Args: { _key_id: string; _reason?: string }
        Returns: boolean
      }
      rotate_client_site_qr_token: { Args: { _site_id: string }; Returns: Json }
      run_operations_observability_check: {
        Args: { _run_type?: string }
        Returns: Json
      }
      search_contract_clients: {
        Args: { _q: string }
        Returns: {
          account_type: string
          email_masked: string
          full_name: string
          phone_masked: string
          ref_id: string
          source: string
          user_id: string
        }[]
      }
      search_site_by_ref: { Args: { _site_ref: string }; Returns: Json }
      seed_client_site_default_visibility: {
        Args: { _site_id: string }
        Returns: undefined
      }
      send_contract_for_approval: {
        Args: { _contract_id: string }
        Returns: {
          business_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_accepted_at: string | null
          client_id: string | null
          completed_at: string | null
          contract_number: string
          contract_version: number
          country_id: string | null
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          document_hash: string | null
          end_date: string | null
          execution_address_snapshot: Json | null
          execution_site_id: string | null
          guest_client_email: string | null
          guest_client_name: string | null
          guest_client_phone: string | null
          id: string
          is_demo: boolean
          last_pdf_generated_at: string | null
          last_pdf_snapshot_id: string | null
          location_id: string | null
          locked_at: string | null
          official_version_number: number
          pricing_method: string | null
          provider_accepted_at: string | null
          provider_entity_id: string | null
          provider_id: string
          requester_entity_id: string | null
          service_category_id: string | null
          source_lead_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          supervisor_email: string | null
          supervisor_name: string | null
          supervisor_phone: string | null
          template_snapshot_id: string | null
          template_version_id: string | null
          terms_ar: string | null
          terms_en: string | null
          title_ar: string
          title_en: string | null
          total_amount: number
          updated_at: string
          vat_inclusive: boolean
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_client_site_visibility: {
        Args: { _site_id: string; _visibility: string }
        Returns: Json
      }
      set_contract_execution_site: {
        Args: { _contract_id: string; _site_id: string }
        Returns: Json
      }
      set_contract_template: {
        Args: {
          _contract_id: string
          _pricing_method?: string
          _template_version_id: string
        }
        Returns: string
      }
      set_my_inbox_notification_mute: {
        Args: { _muted: boolean }
        Returns: undefined
      }
      set_private_sector_reason: {
        Args: { _reason: string }
        Returns: undefined
      }
      split_phone: {
        Args: { _phone: string }
        Returns: {
          cc_out: string
          nat_out: string
        }[]
      }
      split_phone_cc: { Args: { _phone: string }; Returns: string }
      split_phone_nat: { Args: { _phone: string }; Returns: string }
      start_work_order_warranty: {
        Args: {
          _closure_id: string
          _months?: number
          _notes?: string
          _warranty_type?: string
        }
        Returns: Json
      }
      submit_business_for_review: {
        Args: { _business_id: string }
        Returns: Database["public"]["Enums"]["business_approval_status"]
      }
      submit_help_content_gap: {
        Args: {
          _audience?: Database["public"]["Enums"]["help_audience"]
          _page_key?: string
          _query: string
          _query_normalized: string
          _suggested_title_ar?: string
          _suggested_title_en?: string
        }
        Returns: string
      }
      submit_private_sector: {
        Args: { _id: string }
        Returns: {
          brand_type: Database["public"]["Enums"]["private_sector_brand_type"]
          business_id: string
          category_id: string | null
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          country_id: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          established_year: number | null
          id: string
          is_featured: boolean
          logo_url: string | null
          metadata: Json
          name_ar: string
          name_en: string | null
          parent_sector: string
          ref_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seo_description_ar: string | null
          seo_description_en: string | null
          seo_keywords: string[]
          seo_title_ar: string | null
          seo_title_en: string | null
          short_description_ar: string | null
          short_description_en: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["private_sector_status"]
          submitted_at: string | null
          updated_at: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "private_sectors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_site_interest: {
        Args: {
          _estimated_budget_max?: number
          _estimated_budget_min?: number
          _message: string
          _provider_business_id: string
          _service_category?: string
          _site_ref: string
        }
        Returns: Json
      }
      subscribe_to_plan: {
        Args: {
          _billing_cycle?: string
          _business_id?: string
          _plan_id: string
          _user_id: string
        }
        Returns: string
      }
      super_admin_set_business_module_override: {
        Args: {
          _business_id: string
          _enabled: boolean
          _module_key: string
          _reason: string
        }
        Returns: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          reason: string | null
          scope_type: string
          scope_value: string | null
          set_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "system_module_overrides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      super_admin_set_membership_plan_module: {
        Args: { _enabled: boolean; _module_key: string; _plan_id: string }
        Returns: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          plan_id: string
          set_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_plan_modules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      template_version_archive: {
        Args: { p_note?: string; p_version_id: string }
        Returns: undefined
      }
      template_version_legal_approve: {
        Args: {
          p_language_precedence: string
          p_note?: string
          p_risk_level: string
          p_version_id: string
        }
        Returns: undefined
      }
      template_version_publish: {
        Args: {
          p_effective_from?: string
          p_note?: string
          p_version_id: string
        }
        Returns: undefined
      }
      template_version_request_changes: {
        Args: { p_note?: string; p_version_id: string }
        Returns: undefined
      }
      template_version_revert_to_draft: {
        Args: { p_note?: string; p_version_id: string }
        Returns: undefined
      }
      template_version_submit_for_review: {
        Args: { p_note?: string; p_version_id: string }
        Returns: undefined
      }
      touch_business_last_active: { Args: never; Returns: undefined }
      track_content_interaction: {
        Args: {
          _content_id: string
          _content_type: string
          _event_type: string
          _metadata?: Json
          _session_id?: string
        }
        Returns: string
      }
      transfer_primary_manager: {
        Args: { _business_id: string; _reason?: string; _to_user_id: string }
        Returns: Json
      }
      transition_work_order_pipeline_stage: {
        Args: { _notes?: string; _to_stage: string; _work_order_id: string }
        Returns: Json
      }
      unsubscribe_newsletter: { Args: { p_email: string }; Returns: boolean }
      update_client_site: {
        Args: { _patch: Json; _site_id: string }
        Returns: Json
      }
      update_client_site_notification_preferences: {
        Args: { _patch: Json; _site_id: string }
        Returns: Json
      }
      update_contact_inbox_settings: {
        Args: { _patch: Json }
        Returns: {
          alert_on_max_retries: boolean
          alert_recipients: string[]
          id: number
          max_notification_attempts: number
          muted_user_ids: string[]
          notify_email_on_assign: boolean
          notify_email_on_priority_change: boolean
          notify_email_on_status_change: boolean
          notify_webhook_on_assign: boolean
          notify_webhook_on_priority_change: boolean
          notify_webhook_on_status_change: boolean
          retry_backoff_seconds: number
          role_subscriptions: Json
          stale_hours: number
          target_resolution_hours: number
          target_response_hours: number
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
          webhook_url: string | null
          weekly_report_recipients: string[]
        }
        SetofOptions: {
          from: "*"
          to: "contact_inbox_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_contract_draft_autosave: {
        Args: {
          _contract_id: string
          _expected_updated_at?: string
          _patch: Json
        }
        Returns: Json
      }
      update_installation_appointment: {
        Args: {
          _internal_note?: string
          _ref_id: string
          _scheduled_date?: string
          _time_window?: string
        }
        Returns: boolean
      }
      update_site_section_visibility: {
        Args: {
          _section_key: string
          _site_id: string
          _visibility_level: string
        }
        Returns: Json
      }
      user_can_manage_business: {
        Args: { _business_id: string }
        Returns: boolean
      }
      validate_brand_id_approved: {
        Args: { _brand_id: string }
        Returns: boolean
      }
      validate_contract_line_item_price: {
        Args: { _payload: Json }
        Returns: Json
      }
      verify_contract_public: {
        Args: {
          _barcode_code?: string
          _contract_number?: string
          _hash?: string
        }
        Returns: Json
      }
      verify_temporary_login_code: {
        Args: { _code: string; _identifier: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "individual" | "business" | "company" | "admin"
      app_role: "admin" | "moderator" | "user" | "super_admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      business_approval_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "needs_changes"
        | "published"
      business_module:
        | "business_profile"
        | "branches"
        | "staff"
        | "contracts"
        | "projects"
        | "services"
        | "offers"
        | "leads"
        | "messages"
        | "reviews"
        | "warranties"
        | "billing"
        | "analytics"
        | "settings"
      business_staff_role: "owner" | "manager" | "editor" | "viewer"
      client_invite_status:
        | "pending"
        | "accepted"
        | "expired"
        | "cancelled"
        | "revoked"
      contract_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "completed"
        | "cancelled"
        | "disputed"
      help_article_status: "draft" | "published"
      help_audience: "general" | "provider" | "customer" | "admin"
      help_content_gap_status:
        | "new"
        | "reviewing"
        | "article_planned"
        | "article_created"
        | "ignored"
      help_feature_status:
        | "new"
        | "reviewing"
        | "planned"
        | "in_progress"
        | "completed"
        | "rejected"
      help_issue_priority: "low" | "medium" | "high" | "critical"
      help_issue_status:
        | "open"
        | "reviewing"
        | "planned"
        | "resolved"
        | "closed"
      help_issue_type:
        | "bug"
        | "ui"
        | "performance"
        | "data"
        | "security"
        | "content"
        | "other"
      maintenance_priority: "low" | "medium" | "high" | "urgent"
      maintenance_status:
        | "submitted"
        | "under_review"
        | "in_progress"
        | "completed"
        | "rejected"
      membership_tier: "free" | "basic" | "premium" | "enterprise"
      milestone_status: "pending" | "active" | "completed" | "disputed"
      private_sector_brand_type:
        | "own_brand"
        | "exclusive_agency"
        | "authorized_dealer"
        | "distributor"
        | "manufacturer"
      private_sector_distributor_role:
        | "authorized_dealer"
        | "distributor"
        | "reseller"
        | "agent"
        | "showroom"
      private_sector_link_status:
        | "pending"
        | "approved"
        | "rejected"
        | "revoked"
      private_sector_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
      promotion_type: "ad" | "offer" | "video"
      service_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "in_review"
        | "needs_more_info"
      username_status: "pending" | "approved" | "rejected"
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
      account_type: ["individual", "business", "company", "admin"],
      app_role: ["admin", "moderator", "user", "super_admin"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      business_approval_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "needs_changes",
        "published",
      ],
      business_module: [
        "business_profile",
        "branches",
        "staff",
        "contracts",
        "projects",
        "services",
        "offers",
        "leads",
        "messages",
        "reviews",
        "warranties",
        "billing",
        "analytics",
        "settings",
      ],
      business_staff_role: ["owner", "manager", "editor", "viewer"],
      client_invite_status: [
        "pending",
        "accepted",
        "expired",
        "cancelled",
        "revoked",
      ],
      contract_status: [
        "draft",
        "pending_approval",
        "active",
        "completed",
        "cancelled",
        "disputed",
      ],
      help_article_status: ["draft", "published"],
      help_audience: ["general", "provider", "customer", "admin"],
      help_content_gap_status: [
        "new",
        "reviewing",
        "article_planned",
        "article_created",
        "ignored",
      ],
      help_feature_status: [
        "new",
        "reviewing",
        "planned",
        "in_progress",
        "completed",
        "rejected",
      ],
      help_issue_priority: ["low", "medium", "high", "critical"],
      help_issue_status: ["open", "reviewing", "planned", "resolved", "closed"],
      help_issue_type: [
        "bug",
        "ui",
        "performance",
        "data",
        "security",
        "content",
        "other",
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
      private_sector_brand_type: [
        "own_brand",
        "exclusive_agency",
        "authorized_dealer",
        "distributor",
        "manufacturer",
      ],
      private_sector_distributor_role: [
        "authorized_dealer",
        "distributor",
        "reseller",
        "agent",
        "showroom",
      ],
      private_sector_link_status: [
        "pending",
        "approved",
        "rejected",
        "revoked",
      ],
      private_sector_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "suspended",
      ],
      promotion_type: ["ad", "offer", "video"],
      service_request_status: [
        "pending",
        "approved",
        "rejected",
        "in_review",
        "needs_more_info",
      ],
      username_status: ["pending", "approved", "rejected"],
      warranty_status: ["active", "expired", "claimed", "void"],
      warranty_type: ["comprehensive", "limited", "extended"],
    },
  },
} as const
