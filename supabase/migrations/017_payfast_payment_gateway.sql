-- Migration 017: Replace manual EFT with PayFast payment gateway
--
-- The original schema locked `payment_method` to the literal 'eft' and
-- gated `payment_status` on EFT-specific values like `awaiting_buyer_eft`.
-- We're swapping in PayFast (Pay-now flow + ITN webhook).
--
-- Strategy:
--   * `payment_method` expands to `('eft', 'payfast')`. New rows default
--     to 'payfast'; existing rows already hold 'eft' and keep it.
--   * `payment_status` enum check expands. Old values stay so historical
--     orders still parse; new values (`awaiting_payment`,
--     `payment_processing`, `refunded`) are what new flows use.
--   * Add `gateway_payment_id` (PayFast pf_payment_id) and
--     `gateway_session_id` (our m_payment_id) so we can reconcile and
--     refund.
--   * Index `(payment_method, created_at desc)` for the rare admin
--     "all PayFast orders this week" lookup.
--
-- The `transactions.transaction_type` enum already contains
-- 'refund_manual' from migration 001, so refund ledger rows use that
-- existing value — no enum change required here.

alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  alter column payment_method drop default;
alter table public.orders
  add constraint orders_payment_method_check
    check (payment_method in ('eft', 'payfast'));
alter table public.orders
  alter column payment_method set default 'payfast';

alter table public.orders
  drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
    check (
      payment_status in (
        'not_requested',
        'awaiting_payment',     -- new — was awaiting_buyer_eft
        'payment_processing',   -- new — PayFast checkout initiated, ITN pending
        'confirmed',
        'failed',
        'refunded',             -- new — was refunded_manual
        -- Legacy values, retained so historical rows still parse.
        'awaiting_buyer_eft',
        'eft_submitted',
        'refunded_manual'
      )
    );

alter table public.orders
  add column if not exists gateway_payment_id text,
  add column if not exists gateway_session_id text;

create index if not exists orders_payment_method_created_at_idx
  on public.orders (payment_method, created_at desc);

create index if not exists orders_gateway_session_id_idx
  on public.orders (gateway_session_id)
  where gateway_session_id is not null;

comment on column public.orders.payment_method is
  '"payfast" for all new orders. "eft" for historical rows from before migration 017 — kept so /buyer/orders renders them.';
comment on column public.orders.gateway_payment_id is
  'PayFast pf_payment_id. Written by the ITN webhook when a payment is confirmed; used for reconciliation and refund lookup.';
comment on column public.orders.gateway_session_id is
  'Our m_payment_id — a UUID we generate and pass to PayFast on redirect. The ITN echoes it back so we can match a confirmation to the originating order.';
