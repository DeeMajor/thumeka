import { ArrowRight, CheckCircle2, Clock, CreditCard } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Segmented, type SegmentedTab } from "@/components/segmented";
import { StatusPill } from "@/components/status-pill";
import { requireRole } from "@/lib/auth";
import type { AdminSettingsRow, OrderRow } from "@/lib/database.types";
import { formatMoney, getGreeting } from "@/lib/format";
import {
  canBuyerSeeEftInstructions,
  type OrderRuleStatus,
  type PaymentStatus
} from "@/lib/order-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Filter = "all" | "active" | "closed";

const CLOSED_STATUSES = new Set<string>(["completed", "cancelled", "provider_rejected"]);

function resolveFilter(value: string | undefined): Filter {
  if (value === "active" || value === "closed") return value;
  return "all";
}

function bucketOf(status: string): Filter {
  return CLOSED_STATUSES.has(status) ? "closed" : "active";
}

type BuyerOrdersPageProps = {
  searchParams: Promise<{
    created?: string;
    status?: string;
    pay?: string;
    paid?: string;
    cancelled?: string;
  }>;
};

export default async function BuyerOrdersPage({ searchParams }: BuyerOrdersPageProps) {
  const params = await searchParams;
  const filter = resolveFilter(params.status);
  const { profile } = await requireRole(["buyer"]);
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("buyer_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_settings")
      .select("eft_payment_instructions")
      .limit(1)
      .maybeSingle()
  ]);
  const orders = (data ?? []) as OrderRow[];
  const eftPaymentInstructions = (settings as Pick<
    AdminSettingsRow,
    "eft_payment_instructions"
  > | null)?.eft_payment_instructions;

  const counts = orders.reduce(
    (acc, order) => {
      const bucket = bucketOf(order.status);
      acc[bucket] += 1;
      acc.all += 1;
      return acc;
    },
    { all: 0, active: 0, closed: 0 } as Record<Filter, number>
  );

  const visibleOrders = orders.filter((order) =>
    filter === "all" ? true : bucketOf(order.status) === filter
  );

  const displayName = profile.full_name?.split(" ")[0] ?? "there";
  const tabs: SegmentedTab[] = [
    { value: "all", label: "All", href: "/buyer/orders", count: counts.all },
    { value: "active", label: "Active", href: "/buyer/orders?status=active", count: counts.active },
    { value: "closed", label: "Closed", href: "/buyer/orders?status=closed", count: counts.closed }
  ];

  return (
    <div className="bg-mist" data-testid="page-buyer-orders">
      <section className="section-band">
        <div className="page-shell gap-4 py-6">
          <div className="border-l-4 border-sky pl-4">
            <p className="text-caption font-semibold uppercase tracking-widest text-black/40">
              {getGreeting()}, {displayName}
            </p>
            {counts.active === 0 ? (
              <h1 className="mt-1 text-display-md text-sky" data-testid="buyer-orders-greeting">
                No active orders right now
              </h1>
            ) : (
              <h1 className="mt-1 text-display-md" data-testid="buyer-orders-greeting">
                <Link
                  className="inline-flex items-center gap-2 text-sky underline decoration-sky/30 decoration-2 underline-offset-4 transition hover:decoration-sky focus:outline-none focus:ring-2 focus:ring-sky focus:ring-offset-2 rounded-sm"
                  data-testid="buyer-orders-greeting-link"
                  href="/buyer/orders?status=active"
                >
                  {counts.active} active {counts.active === 1 ? "order" : "orders"}
                  <ArrowRight className="h-6 w-6" aria-hidden="true" />
                </Link>
              </h1>
            )}
            <p className="mt-2 text-body-sm text-black/55">
              Track requests and complete payment once the seller accepts.
            </p>
          </div>
          {params.created ? (
            <div className="rounded-md border border-mint bg-mint p-3 text-sm text-leaf">
              Order request created. The provider must accept before you can pay.
            </div>
          ) : null}
          {params.paid ? (
            <div
              className="rounded-md border border-mint bg-mint p-3 text-sm text-leaf"
              data-testid="buyer-orders-paid-banner"
            >
              Payment received. Your order will appear here once confirmed —
              this normally happens within seconds.
            </div>
          ) : null}
          {params.cancelled ? (
            <div className="rounded-md border border-maize/60 bg-maize/15 p-3 text-sm text-ink">
              Payment cancelled. You can try again whenever you&apos;re ready.
            </div>
          ) : null}
        </div>
      </section>

      <section className="page-shell py-6">
        {/* Two round tile shortcuts to Active / Closed filters. Sit side-by-
            side on every viewport so mobile users get one-tap access. */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Link
            className="group flex items-center gap-3 rounded-2xl border border-sky/20 bg-white p-4 shadow-soft transition hover:border-sky hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky focus:ring-offset-2"
            data-testid="buyer-orders-active-tile"
            href="/buyer/orders?status=active"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky/10 text-sky transition group-hover:bg-sky group-hover:text-white">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-none">{counts.active}</p>
              <p className="mt-1 text-body-sm text-black/60">Active</p>
            </div>
          </Link>
          <Link
            className="group flex items-center gap-3 rounded-2xl border border-leaf/20 bg-white p-4 shadow-soft transition hover:border-leaf hover:shadow-md focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2"
            data-testid="buyer-orders-closed-tile"
            href="/buyer/orders?status=closed"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-leaf/10 text-leaf transition group-hover:bg-leaf group-hover:text-white">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-none">{counts.closed}</p>
              <p className="mt-1 text-body-sm text-black/60">Closed</p>
            </div>
          </Link>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            active={filter}
            ariaLabel="Filter orders"
            data-testid="buyer-orders-filter"
            tabs={tabs}
          />
          <Link
            className="btn-secondary py-1.5 text-xs sm:py-2"
            data-testid="buyer-orders-browse-link"
            href="/listings"
          >
            Browse listings
          </Link>
        </div>

        {visibleOrders.length ? (
          <div className="space-y-3">
            {visibleOrders.map((order) => (
              <div
                className="rounded-xl border border-black/8 bg-white p-4 shadow-soft"
                data-testid="buyer-order-card"
                key={order.id}
              >
                {/* Top row: status + date */}
                <div className="flex items-start justify-between gap-3">
                  <StatusPill status={order.status} />
                  <time className="mt-0.5 shrink-0 text-caption text-black/40">
                    {new Date(order.created_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </time>
                </div>

                {/* Amount */}
                <p className="mt-3 text-xl font-bold text-ink">
                  {formatMoney(order.buyer_total)}
                </p>

                {/* Details */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-black/55">
                  <span>{order.suburb ?? "—"}</span>
                  <span aria-hidden="true">·</span>
                  <span>Payment: {order.payment_status.replaceAll("_", " ")}</span>
                </div>

                {/* Reference */}
                <p className="mt-2 font-mono text-caption text-black/30">
                  #{order.id.slice(0, 8)}
                </p>

                {/* Pay now — PayFast (new flow) */}
                {order.payment_status === "awaiting_payment" ? (
                  <div
                    className="mt-4 rounded-lg border border-leaf/30 bg-mint p-3"
                    data-testid="buyer-order-pay-now-panel"
                  >
                    <p className="text-body-sm font-semibold text-leaf">
                      Ready to pay
                    </p>
                    <p className="mt-1 text-caption text-leaf/75">
                      Pay by card, instant EFT, Zapper or SnapScan. You&apos;ll
                      see the confirmation here within seconds.
                    </p>
                    <Link
                      className="btn-primary mt-3 inline-flex items-center gap-2"
                      data-testid="buyer-order-pay-now-link"
                      href={`/buyer/orders/pay/${order.id}`}
                    >
                      <CreditCard aria-hidden="true" className="h-4 w-4" />
                      Pay {formatMoney(order.buyer_total)} now
                    </Link>
                  </div>
                ) : null}

                {/* Payment processing — buyer redirected to PayFast, waiting
                    for ITN. */}
                {order.payment_status === "payment_processing" ? (
                  <div
                    className="mt-4 rounded-lg border border-sky/30 bg-sky/10 p-3"
                    data-testid="buyer-order-processing-panel"
                  >
                    <p className="text-body-sm font-semibold text-sky">
                      Payment processing…
                    </p>
                    <p className="mt-1 text-caption text-sky/80">
                      Your bank is talking to PayFast. This usually takes a few
                      seconds — refresh in a moment.
                    </p>
                  </div>
                ) : null}

                {/* Refunded — admin processed a refund. */}
                {order.payment_status === "refunded" ? (
                  <div
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3"
                    data-testid="buyer-order-refunded-panel"
                  >
                    <p className="text-body-sm font-semibold text-red-700">
                      Refunded
                    </p>
                    <p className="mt-1 text-caption text-red-700/80">
                      The funds are on their way back to you. Refunds take
                      3–5 business days to land, depending on your bank.
                    </p>
                  </div>
                ) : null}

                {/* Legacy EFT instructions — kept for orders from before
                    the PayFast cutover. New orders use the Pay-now panel
                    above. */}
                {canBuyerSeeEftInstructions(
                  {
                    status: order.status as OrderRuleStatus,
                    payment_status: order.payment_status as PaymentStatus
                  },
                  eftPaymentInstructions
                ) ? (
                  <div
                    className="mt-4 rounded-lg border border-leaf/20 bg-mint p-3 text-body-sm"
                    data-testid="buyer-order-eft-instructions"
                  >
                    <p className="font-semibold text-leaf">Payment instructions (EFT)</p>
                    <p className="mt-1 text-leaf/80">{eftPaymentInstructions}</p>
                    <p className="mt-2 font-mono text-caption font-medium text-leaf/60">
                      Reference: {order.id.slice(0, 8)}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            body={
              filter === "all"
                ? "Browse listings and submit your first order request. Payment stays locked until the provider accepts."
                : filter === "active"
                  ? "No active orders. Browse listings to start one."
                  : "Nothing here yet — completed and cancelled orders will land here."
            }
            title={filter === "all" ? "No orders yet" : `No ${filter} orders`}
          />
        )}
      </section>
    </div>
  );
}
