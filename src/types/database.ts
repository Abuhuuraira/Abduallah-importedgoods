/**
 * Database types for the Supabase schema in /supabase/migrations.
 *
 * This file follows the format produced by `supabase gen types typescript`.
 * If you change the schema you can regenerate it with:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProductStatus = "available" | "booked";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          product_code: string;
          name: string;
          slug: string;
          description: string;
          price: number | null;
          category_id: string | null;
          image_url: string;
          image_path: string;
          status: ProductStatus;
          is_published: boolean;
          is_new_arrival: boolean;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          /** Assigned by a database trigger — any value sent is ignored. */
          product_code?: string;
          name: string;
          slug: string;
          description?: string;
          price?: number | null;
          category_id?: string | null;
          image_url: string;
          image_path: string;
          status?: ProductStatus;
          is_published?: boolean;
          is_new_arrival?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_code?: string;
          name?: string;
          slug?: string;
          description?: string;
          price?: number | null;
          category_id?: string | null;
          image_url?: string;
          image_path?: string;
          status?: ProductStatus;
          is_published?: boolean;
          is_new_arrival?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_settings: {
        Row: {
          id: number;
          business_name: string;
          logo_url: string | null;
          logo_path: string | null;
          whatsapp_number: string;
          currency: string;
          welcome_text: string;
          contact_phone: string | null;
          contact_email: string | null;
          address: string | null;
          business_hours: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          business_name?: string;
          logo_url?: string | null;
          logo_path?: string | null;
          whatsapp_number?: string;
          currency?: string;
          welcome_text?: string;
          contact_phone?: string | null;
          contact_email?: string | null;
          address?: string | null;
          business_hours?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          business_name?: string;
          logo_url?: string | null;
          logo_path?: string | null;
          whatsapp_number?: string;
          currency?: string;
          welcome_text?: string;
          contact_phone?: string | null;
          contact_email?: string | null;
          address?: string | null;
          business_hours?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: never;
        Returns: boolean;
      };
      escape_like: {
        Args: { value: string };
        Returns: string;
      };
      search_products: {
        Args: {
          p_query?: string | null;
          p_category_slug?: string | null;
          p_available_only?: boolean;
          p_new_arrivals_only?: boolean;
          p_sort?: string;
          p_limit?: number;
          p_offset?: number;
          p_publication?: string;
          p_status?: string | null;
        };
        Returns: {
          id: string;
          product_code: string;
          name: string;
          slug: string;
          description: string;
          price: number | null;
          category_id: string | null;
          category_name: string | null;
          category_slug: string | null;
          image_url: string;
          image_path: string;
          status: ProductStatus;
          is_published: boolean;
          is_new_arrival: boolean;
          version: number;
          created_at: string;
          updated_at: string;
          total_count: number;
        }[];
      };
      get_categories_with_counts: {
        Args: never;
        Returns: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          product_count: number;
        }[];
      };
      delete_category: {
        Args: {
          p_category_id: string;
          p_move_products?: boolean;
          p_target_category_id?: string | null;
        };
        Returns: number;
      };
      get_dashboard_stats: {
        Args: never;
        Returns: Json;
      };
      track_page_view: {
        Args: {
          p_session_id: string;
          p_visitor_id: string;
          p_path: string;
          p_referrer?: string | null;
          p_device?: string | null;
          p_new_visitor?: boolean;
        };
        Returns: undefined;
      };
      track_heartbeat: {
        Args: { p_session_id: string; p_visitor_id: string };
        Returns: undefined;
      };
      get_visitor_live: {
        Args: never;
        Returns: Json;
      };
      get_visitor_stats: {
        Args: { p_days?: number };
        Returns: Json;
      };
      get_like_state: {
        Args: { p_product_id: string; p_visitor_id?: string | null };
        Returns: Json;
      };
      set_product_like: {
        Args: { p_product_id: string; p_visitor_id: string; p_liked?: boolean };
        Returns: Json;
      };
      place_order: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_customer_name: string;
          p_customer_whatsapp: string;
          p_customer_address: string;
          p_customer_note?: string;
        };
        Returns: Json;
      };
      admin_list_orders: {
        Args: { p_status?: string | null; p_query?: string | null; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          order_number: number;
          product_id: string | null;
          product_name: string;
          product_code: string;
          product_slug: string;
          product_image_url: string;
          unit_price: number | null;
          quantity: number;
          customer_name: string;
          customer_whatsapp: string;
          customer_address: string;
          customer_note: string;
          status: string;
          admin_note: string;
          created_at: string;
          updated_at: string;
          total_count: number;
        }[];
      };
      admin_order_counts: {
        Args: never;
        Returns: Json;
      };
      admin_get_order: {
        Args: { p_id: string };
        Returns: Json;
      };
      admin_set_order_status: {
        Args: { p_id: string; p_from: string; p_to: string };
        Returns: string;
      };
      admin_set_order_note: {
        Args: { p_id: string; p_note: string };
        Returns: undefined;
      };
      admin_delete_order: {
        Args: { p_id: string };
        Returns: undefined;
      };
      admin_like_stats: {
        Args: never;
        Returns: Json;
      };
      admin_product_like_counts: {
        Args: { p_product_ids: string[] };
        Returns: { product_id: string; likes: number }[];
      };
      admin_list_notifications: {
        Args: { p_limit?: number };
        Returns: Json;
      };
      admin_mark_notifications_read: {
        Args: { p_ids?: number[] | null };
        Returns: number;
      };
      admin_save_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_device_label: string; p_secret_hash: string };
        Returns: undefined;
      };
      admin_list_push_devices: {
        Args: never;
        Returns: { endpoint: string; device_label: string; notify_orders: boolean; notify_likes: boolean; created_at: string }[];
      };
      admin_update_push_device: {
        Args: { p_endpoint: string; p_notify_orders: boolean | null; p_notify_likes: boolean | null };
        Returns: undefined;
      };
      admin_delete_push_device: {
        Args: { p_endpoint: string };
        Returns: undefined;
      };
      get_push_targets: {
        Args: { p_secret: string; p_kind: string; p_endpoint?: string | null };
        Returns: { endpoint: string; p256dh: string; auth: string }[];
      };
      remove_push_target: {
        Args: { p_secret: string; p_endpoint: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
