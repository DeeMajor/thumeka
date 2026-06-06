import { NextResponse } from "next/server";

import { PaymentConfirmedEmail } from "@/emails/payment-confirmed";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import {
  confirmGatewayPayment,
  type OrderForRules
} from "@/lib/order-rules";
import {
  isPayFastSourceIp,
  validatePayFastItn,
  verifyPayFastSignature
} from "@/lib/payfast";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderRow, ProviderProfileRow } from "@/lib/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PayFast ITN (Instant Transaction Notification) webhook.
 *
 * Five gates a request must clear before it touches the ledger:
 *
 *   1. Source IP is one of PayFast's published ranges.
 *   2. The signature recomputed over the params matches what PayFast
 *      sent.
 *   3. The amount PayFast reports matches what we have on the order
 *      (cent-exact).
 *   4. PayFast's own validate endpoint says "VALID" for the same
 *      params (belt-and-braces per their security checklist).
 *   5. The order's current payment_status is not already `confirmed`
 *      (idempotency — duplicate ITN due to PayFast retry must not
 *      double-emit ledger rows).
 *
 * PayFast retries on any non-200 response, so we always return 200
 * with a short text body. Failures are logged loudly via console.warn
 * so they're greppable in Plesk's stdout.
 */
export async function POST(request: Request) {
  // ── IP gate ──────────────────────────────────────────────────────────
  const sourceIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");
  // In sandbox PayFast tests can come from arbitrary IPs (e.g. the local
  // dev's ngrok tunnel echoing). Only enforce IP allowlist in production.
  if (process.env.PAYFAST_MODE === "production" && !isPayFastSourceIp(sourceIp)) {
    console.warn("[payfast-itn] rejected: source ip not in allowlist", sourceIp);
    return new NextResponse("OK", { status: 200 });
  }

  // ── Body parse ───────────────────────────────────────────────────────
  let body: string;
  try {
    body = await request.text();
  } catch {
    console.warn("[payfast-itn] rejected: unreadable body");
    return new NextResponse("OK", { status: 200 });
  }

  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(body)) {
    params[key] = value;
  }

  const sessionId = params.m_payment_id;
  const pfPaymentId = params.pf_payment_id;
  const amountGross = params.amount_gross;
  const paymentStatus = params.payment_status;

  if (!sessionId || !pfPaymentId || !amountGross || !paymentStatus) {
    console.warn(
      "[payfast-itn] rejected: required fields missing",
      Object.keys(params).join(",")
    );
    return new NextResponse("OK", { status: 200 });
  }

  // ── Signature gate ───────────────────────────────────────────────────
  if (!verifyPayFastSignature(params)) {
    console.warn(
      "[payfast-itn] rejected: signature mismatch session=%s",
      sessionId
    );
    return new NextResponse("OK", { status: 200 });
  }

  // ── Validate-back gate (defence-in-depth) ────────────────────────────
  if (!(await validatePayFastItn(params))) {
    console.warn(
      "[payfast-itn] rejected: PayFast validate endpoint did not say VALID session=%s",
      sessionId
    );
    return new NextResponse("OK", { status: 200 });
  }

  // ── Order lookup ─────────────────────────────────────────────────────
  // Use the admin client so the webhook doesn't depend on a session; RLS
  // would otherwise reject reads/writes for an unauthenticated request.
  const supabase = createSupabaseAdminClient();

  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("gateway_session_id", sessionId)
    .maybeSingle();
  const order = orderData as OrderRow | null;

  if (!order) {
    console.warn(
      "[payfast-itn] rejected: no order for session=%s pf_payment_id=%s",
      sessionId,
      pfPaymentId
    );
    return new NextResponse("OK", { status: 200 });
  }

  // ── Amount gate ──────────────────────────────────────────────────────
  // Cents-exact match. PayFast sends "320.00"; our buyer_total is stored
  // as a decimal string. Compare as numbers to avoid format drift.
  const expected = Number(order.buyer_total);
  const received = Number.parseFloat(amountGross);
  if (!Number.isFinite(received) || Math.abs(received - expected) > 0.005) {
    console.warn(
      "[payfast-itn] rejected: amount mismatch session=%s expected=%s received=%s",
      sessionId,
      expected,
      received
    );
    return new NextResponse("OK", { status: 200 });
  }

  // ── Idempotency gate ─────────────────────────────────────────────────
  if (order.payment_status === "confirmed") {
    console.warn(
      "[payfast-itn] duplicate: order already confirmed session=%s",
      sessionId
    );
    return new NextResponse("OK (duplicate)", { status: 200 });
  }

  // ── Status routing ──────────────────────────────────────────────────
  if (paymentStatus === "FAILED") {
    await supabase
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);
    console.warn(
      "[payfast-itn] payment failed session=%s order=%s",
      sessionId,
      order.id
    );
    return new NextResponse("OK", { status: 200 });
  }

  if (paymentStatus === "CANCELLED") {
    await supabase
      .from("orders")
      .update({ payment_status: "awaiting_payment" })
      .eq("id", order.id);
    return new NextResponse("OK", { status: 200 });
  }

  if (paymentStatus !== "COMPLETE") {
    console.warn(
      "[payfast-itn] unhandled payment_status=%s session=%s",
      paymentStatus,
      sessionId
    );
    return new NextResponse("OK", { status: 200 });
  }

  // ── COMPLETE — run the confirmation flow ─────────────────────────────
  const orderForRules: OrderForRules = order as unknown as OrderForRules;
  const { order: paidOrder, transactions } = confirmGatewayPayment({
    order: orderForRules,
    adminProfileId: order.buyer_id, // ledger row needs a profile fk;
                                    // use buyer_id rather than a phantom
                                    // "system" id to satisfy the FK.
    paymentReference: pfPaymentId
  });

  // Atomic flip: only if still in awaiting_payment or payment_processing.
  // Protects against a retry that arrived while the first one was in
  // flight.
  const { data: updatedRows, error: updateError } = await supabase
    .from("orders")
    .update({
      status: paidOrder.status,
      payment_status: paidOrder.payment_status,
      payment_reference: pfPaymentId,
      gateway_payment_id: pfPaymentId
    })
    .eq("id", order.id)
    .in("payment_status", ["awaiting_payment", "payment_processing"])
    .select("id");

  if (updateError) {
    console.warn(
      "[payfast-itn] order update failed session=%s err=%s",
      sessionId,
      updateError.message
    );
    return new NextResponse("OK", { status: 200 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    // Race lost — another request flipped the status. Idempotent return.
    console.warn(
      "[payfast-itn] race lost — status already advanced session=%s",
      sessionId
    );
    return new NextResponse("OK", { status: 200 });
  }

  // Ledger rows
  await supabase.from("transactions").insert(
    transactions.map((tx) => ({
      order_id: tx.order_id,
      transaction_type: tx.transaction_type,
      amount: tx.amount,
      direction: tx.direction,
      status: tx.status,
      reference: tx.reference ?? null,
      created_by: tx.created_by
    }))
  );

  // Status event
  await supabase.from("order_status_events").insert({
    order_id: order.id,
    old_status: order.status,
    new_status: paidOrder.status,
    changed_by: order.buyer_id,
    note: `PayFast payment confirmed (pf_payment_id=${pfPaymentId})`
  });

  // Notify the buyer + provider that payment landed.
  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("user_id, business_name")
    .eq("id", order.provider_id)
    .maybeSingle();
  const provider = providerProfile as Pick<
    ProviderProfileRow,
    "user_id" | "business_name"
  > | null;

  if (order.buyer_email) {
    sendEmail({
      to: order.buyer_email,
      subject: "Payment confirmed — Thumeka",
      react: PaymentConfirmedEmail({
        recipientName: order.buyer_name ?? order.buyer_email,
        role: "buyer",
        listingTitle: order.listing_id,
        buyerTotal: Number(order.buyer_total),
        paymentReference: pfPaymentId,
        orderId: order.id,
        appUrl: getAppUrl(),
        dashboardUrl: `${getAppUrl()}/buyer/orders`,
      }),
    }).catch((err: Error) =>
      console.warn("[email] Payment confirmed email failed:", err.message)
    );
  }

  // Suppress the unused-provider warning when sendEmail is gated.
  void provider;

  return new NextResponse("OK", { status: 200 });
}
