import "server-only";

import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import type { OrderRow, ProviderProfileRow } from "@/lib/database.types";
import { isPayFastConfigured } from "@/lib/env";
import { buildPayFastCheckoutPayload } from "@/lib/payfast";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PayPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

/**
 * Server-rendered Pay-now bridge.
 *
 * The buyer's "Pay now" link on `/buyer/orders` navigates here. The
 * page:
 *   1. Verifies the buyer owns the order.
 *   2. Verifies the order is in `payment_status="awaiting_payment"`
 *      (idempotent — if already processing or confirmed, bounces back
 *      to `/buyer/orders`).
 *   3. Generates a `gateway_session_id` (UUID) and flips the order to
 *      `payment_status="payment_processing"`.
 *   4. Renders a tiny HTML page that auto-POSTs to PayFast's
 *      `/eng/process` endpoint. The buyer sees a brief
 *      "Redirecting…" while their browser submits.
 *
 * We render the form rather than redirect with a 302 because PayFast
 * needs a POST — Server Actions can return only one redirect target
 * and only via GET.
 */
export default async function BuyerPayPage({ params }: PayPageProps) {
  if (!isPayFastConfigured()) {
    // Fail loudly during dev when env vars are missing — avoids a
    // confusing "redirect to PayFast" with garbage credentials.
    throw new Error(
      "PayFast credentials are not configured. Set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY."
    );
  }

  const { orderId } = await params;
  const { profile } = await requireRole(["buyer"]);
  const supabase = await createSupabaseServerClient();

  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  const order = orderData as OrderRow | null;

  if (!order || order.buyer_id !== profile.id) {
    notFound();
  }

  // Idempotency: if we've already started a session or the order is
  // confirmed/refunded, just bounce back to the buyer-orders page.
  if (
    order.payment_status === "payment_processing" ||
    order.payment_status === "confirmed" ||
    order.payment_status === "refunded"
  ) {
    redirect(`/buyer/orders?pay=${order.id}`);
  }
  if (order.payment_status !== "awaiting_payment") {
    redirect(`/buyer/orders?pay=${order.id}`);
  }

  // Generate the session id PayFast will echo back via ITN. Persist it
  // before redirecting so a webhook landing first still matches up.
  const sessionId = randomUUID();

  // Look up the listing title for the PayFast checkout page label.
  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", order.listing_id)
    .maybeSingle();
  const itemName = (listing as { title?: string } | null)?.title ?? "Thumeka order";

  // Look up the provider's business name in case we want to surface it
  // (not used directly here but useful for the email surrounding this
  // flow). Kept inline to mirror the actions.ts patterns.
  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("business_name")
    .eq("id", order.provider_id)
    .maybeSingle();
  void (providerProfile as ProviderProfileRow | null);

  // Split the buyer name into first/last for PayFast (their form requires
  // both even though we only have one combined field).
  const [firstName, ...lastParts] = order.buyer_name.trim().split(/\s+/);
  const lastName = lastParts.join(" ") || firstName;

  const payload = buildPayFastCheckoutPayload({
    orderId: order.id,
    sessionId,
    amount: Number(order.buyer_total),
    itemName,
    buyerEmail: order.buyer_email,
    buyerFirstName: firstName,
    buyerLastName: lastName
  });

  // Atomic flip: only if still in awaiting_payment. Avoids a double
  // flip if the buyer opens this page in two tabs.
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      gateway_session_id: sessionId,
      payment_status: "payment_processing"
    })
    .eq("id", order.id)
    .eq("payment_status", "awaiting_payment");

  if (updateError) {
    // The next render will redirect via the idempotency check above.
    redirect(`/buyer/orders?pay=${order.id}`);
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Redirecting to PayFast…</title>
        <meta name="robots" content="noindex" />
      </head>
      <body
        style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          background: "#f7f7f7",
          color: "#1a1a2e",
          margin: 0,
          padding: "64px 24px",
          textAlign: "center"
        }}
      >
        <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>
          Redirecting to PayFast…
        </h1>
        <p style={{ color: "#6b7280", margin: "0 0 24px" }}>
          If your browser doesn&apos;t redirect within a couple of seconds,{" "}
          <noscript>enable JavaScript and refresh — </noscript>
          press the button below.
        </p>
        <form
          action={payload.actionUrl}
          id="payfast-form"
          method="POST"
          style={{ display: "inline-block" }}
        >
          {Object.entries(payload.fields).map(([key, value]) => (
            <input key={key} name={key} type="hidden" value={value} />
          ))}
          <button
            style={{
              background: "#e94560",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "12px 28px",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer"
            }}
            type="submit"
          >
            Continue to PayFast
          </button>
        </form>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.getElementById('payfast-form').submit();"
          }}
        />
      </body>
    </html>
  );
}
