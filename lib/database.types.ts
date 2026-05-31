import type { AppRole, ListingType } from "@/lib/constants";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Record<string, unknown>, Update = Record<string, unknown>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  auth_user_id: string;
  role: AppRole;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type ProviderProfileRow = {
  id: string;
  user_id: string;
  business_name: string | null;
  provider_type: "individual" | "business" | null;
  description: string | null;
  suburb: string | null;
  address: string | null;
  provider_lat: string | null;
  provider_lng: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverProfileRow = {
  id: string;
  user_id: string;
  vehicle_type: string | null;
  vehicle_licence_number: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  availability_status: "unavailable" | "available" | "busy" | "suspended";
  rejection_reason: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

export type ListingRow = {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  listing_type: ListingType;
  price: string;
  pricing_type: "fixed" | "from" | "quote_required" | "hourly" | "daily";
  suburb: string | null;
  location_notes: string | null;
  fulfillment_address: string | null;
  fulfillment_lat: string | null;
  fulfillment_lng: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  requires_datetime: boolean;
  requires_location: boolean;
  requires_instructions: boolean;
  requires_quote: boolean;
  availability_notes: string | null;
  is_active: boolean;
  admin_disabled: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  buyer_id: string;
  provider_id: string;
  listing_id: string;
  driver_id: string | null;
  order_type: ListingType;
  status: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  delivery_address: string | null;
  delivery_lat: string | null;
  delivery_lng: string | null;
  suburb: string | null;
  buyer_notes: string | null;
  requested_date: string | null;
  requested_time: string | null;
  listing_price: string;
  delivery_distance_km: string | null;
  delivery_base_fee: string | null;
  delivery_price_per_km: string | null;
  delivery_fee: string;
  buyer_total: string;
  commission_percentage: string;
  commission_amount: string;
  delivery_commission_amount: string;
  provider_earning: string;
  driver_earning: string;
  payment_method: "eft";
  payment_status: string;
  payment_reference: string | null;
  provider_location_checked: boolean;
  provider_accept_lat: string | null;
  provider_accept_lng: string | null;
  provider_location_distance_km: string | null;
  provider_location_warning: boolean;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminSettingsRow = {
  id: string;
  commission_percentage: string;
  delivery_commission_percentage: string;
  driver_payout_day: string;
  provider_payout_day: string;
  support_whatsapp_number: string | null;
  support_email: string | null;
  driver_base_rate: string;
  driver_per_km_rate: string | null;
  default_delivery_fee: string | null;
  eft_payment_instructions: string | null;
  payout_reference_prefix: string;
  provider_location_warning_threshold_km: string;
  provider_acceptance_window_minutes: number;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  order_id: string | null;
  transaction_type: string;
  amount: string;
  direction: "debit" | "credit";
  status: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type PayoutRow = {
  id: string;
  recipient_user_id: string;
  recipient_type: "provider" | "driver";
  period_start: string;
  period_end: string;
  gross_amount: string;
  commission_amount: string;
  net_amount: string;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  payment_reference: string | null;
  admin_notes: string | null;
  created_at: string;
};

export type PayoutItemRow = {
  id: string;
  payout_id: string;
  order_id: string;
  recipient_type: "provider" | "driver";
  amount: string;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Json | null;
  new_value: Json | null;
  note: string | null;
  created_at: string;
};

export type OrderStatusEventRow = {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  owner_user_id: string;
  owner_type: "provider" | "driver";
  document_type: string;
  file_url: string | null;
  submitted_via: "upload" | "email" | "admin_note";
  status: "submitted" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      provider_profiles: Table<ProviderProfileRow>;
      driver_profiles: Table<DriverProfileRow>;
      categories: Table<CategoryRow>;
      listings: Table<ListingRow>;
      orders: Table<OrderRow>;
      order_status_events: Table<OrderStatusEventRow>;
      admin_settings: Table<AdminSettingsRow>;
      transactions: Table<TransactionRow>;
      payouts: Table<PayoutRow>;
      payout_items: Table<PayoutItemRow>;
      audit_logs: Table<AuditLogRow>;
      documents: Table<DocumentRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
