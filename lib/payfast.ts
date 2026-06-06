import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { getAppUrl } from "@/lib/env";

/**
 * Minimal PayFast client.
 *
 * Three responsibilities:
 *   1. Build the signed redirect payload for "Pay now" (buyer → PayFast).
 *   2. Verify the ITN webhook signature (PayFast → us).
 *   3. Post the ITN params back to PayFast's validate endpoint as
 *      belt-and-braces per their security checklist.
 *
 * Why no SDK: the integration surface is tiny (two endpoints), the
 * signature algorithm is documented and stable, and avoiding an SDK
 * means one less dependency to keep current with security advisories.
 */

const PAYFAST_PROCESS_URLS = {
  sandbox: "https://sandbox.payfast.co.za/eng/process",
  production: "https://www.payfast.co.za/eng/process"
} as const;

const PAYFAST_VALIDATE_URLS = {
  sandbox: "https://sandbox.payfast.co.za/eng/query/validate",
  production: "https://www.payfast.co.za/eng/query/validate"
} as const;

/**
 * PayFast's published ITN-source IP ranges. From their docs at
 * developers.payfast.co.za — verify annually. Returning 200 + ignoring
 * an out-of-range source is the safe default; a wrong-IP submission
 * is almost certainly an attacker, not a legitimate retry.
 */
export const PAYFAST_ITN_IPS = [
  "197.97.145.144",
  "197.97.145.145",
  "197.97.145.146",
  "197.97.145.147",
  "197.97.145.148",
  "197.97.145.149",
  "197.97.145.150",
  "197.97.145.151",
  "41.74.179.194",
  "41.74.179.195",
  "41.74.179.196",
  "41.74.179.197",
  "41.74.179.200",
  "41.74.179.201",
  "41.74.179.203",
  "41.74.179.204",
  "41.74.179.210",
  "41.74.179.211",
  "41.74.179.212",
  "41.74.179.217",
  "41.74.179.218"
] as const;

type PayFastMode = "sandbox" | "production";

function getPayFastMode(): PayFastMode {
  const raw = process.env.PAYFAST_MODE?.toLowerCase();
  if (raw === "production") return "production";
  // Default to sandbox so a missing/typo'd env var fails closed against
  // real money rather than against a test account.
  return "sandbox";
}

/**
 * The order of keys when building the signature matters. PayFast hashes
 * the exact sequence the merchant POSTs to /eng/process — re-ordering
 * here breaks every signature. Mirror PayFast's documented sequence.
 */
const SIGNATURE_FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_str1"
] as const;

/**
 * URL-encode in the exact form PayFast's PHP reference implementation
 * uses: `encodeURIComponent` then swap %20 → +. Trailing whitespace is
 * stripped. Empty values are skipped by the caller, not here.
 */
function encodeForSignature(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, "+");
}

function buildSignature(
  fields: Record<string, string>,
  passphrase: string,
  fieldOrder: readonly string[] = SIGNATURE_FIELD_ORDER
): string {
  const parts: string[] = [];
  for (const key of fieldOrder) {
    const value = fields[key];
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${key}=${encodeForSignature(value)}`);
  }
  // Passphrase appended last when set on the merchant account — required
  // by PayFast since 2018.
  if (passphrase) {
    parts.push(`passphrase=${encodeForSignature(passphrase)}`);
  }
  return createHash("md5").update(parts.join("&")).digest("hex");
}

export type PayFastCheckoutInput = {
  /** Our order id, returned via ITN's `custom_str1` so we can audit. */
  orderId: string;
  /** Our own session id (UUID) — sent as `m_payment_id`. PayFast echoes
   *  it back via ITN so we match the confirmation to our order. */
  sessionId: string;
  /** Amount the buyer pays — already qty-multiplied. ZAR. */
  amount: number;
  /** Listing title — shows on the PayFast checkout screen. */
  itemName: string;
  buyerEmail: string;
  buyerFirstName: string;
  buyerLastName: string;
};

export type PayFastCheckoutPayload = {
  actionUrl: string;
  fields: Record<string, string>;
};

/**
 * Build the auto-submitting form payload for the buyer's Pay-now click.
 *
 * The caller renders an HTML `<form action={actionUrl} method="POST">`
 * with each field as a hidden input, then auto-submits on page load.
 * PayFast handles the rest of the checkout flow.
 */
export function buildPayFastCheckoutPayload(
  input: PayFastCheckoutInput
): PayFastCheckoutPayload {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";

  if (!merchantId || !merchantKey) {
    throw new Error(
      "PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY must be set to build a checkout payload"
    );
  }

  const mode = getPayFastMode();
  const appUrl = getAppUrl().replace(/\/$/, "");

  const fields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${appUrl}/buyer/orders?paid=${input.orderId}`,
    cancel_url: `${appUrl}/buyer/orders?cancelled=${input.orderId}`,
    notify_url: `${appUrl}/api/webhooks/payfast/itn`,
    name_first: input.buyerFirstName,
    name_last: input.buyerLastName,
    email_address: input.buyerEmail,
    m_payment_id: input.sessionId,
    amount: input.amount.toFixed(2),
    item_name: input.itemName.slice(0, 100),
    custom_str1: input.orderId
  };

  const signature = buildSignature(fields, passphrase);
  fields.signature = signature;

  return {
    actionUrl: PAYFAST_PROCESS_URLS[mode],
    fields
  };
}

/**
 * Recompute the signature over every received ITN field except
 * `signature` itself (PayFast strips it before hashing). Constant-time
 * comparison so a timing oracle can't be used to brute-force.
 */
export function verifyPayFastSignature(
  params: Record<string, string>
): boolean {
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  const received = params.signature ?? "";
  if (!received) return false;

  // ITN params are not in a fixed order in the spec — PayFast says
  // "use the order received". The Form-encoded body preserves insertion
  // order in modern runtimes, which is what we use here.
  const orderedKeys = Object.keys(params).filter((key) => key !== "signature");
  const computed = buildSignature(params, passphrase, orderedKeys);

  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Post the raw ITN params back to PayFast's validate endpoint. PayFast
 * responds with literal `VALID` (no body otherwise). Their security
 * checklist explicitly calls this out as required defence-in-depth in
 * addition to the signature check.
 *
 * Returns `false` on any network error — caller treats that as "not
 * valid" rather than crashing the webhook.
 */
export async function validatePayFastItn(
  params: Record<string, string>
): Promise<boolean> {
  const mode = getPayFastMode();
  const url = PAYFAST_VALIDATE_URLS[mode];

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.append(key, value);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!response.ok) return false;
    const text = (await response.text()).trim();
    return text === "VALID";
  } catch {
    return false;
  }
}

/**
 * Is the source IP one of PayFast's published ITN sources? Used in the
 * webhook handler — a non-match is a strong indicator of a forged
 * submission.
 */
export function isPayFastSourceIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  return PAYFAST_ITN_IPS.includes(trimmed as (typeof PAYFAST_ITN_IPS)[number]);
}

// Re-exported so tests can verify signatures deterministically without
// patching env vars repeatedly.
export const __test = {
  buildSignature,
  encodeForSignature,
  SIGNATURE_FIELD_ORDER
};
