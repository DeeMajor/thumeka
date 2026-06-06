import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildPayFastCheckoutPayload,
  verifyPayFastSignature
} from "@/lib/payfast";

// Use PayFast's published sandbox credentials throughout. Tests inject the
// passphrase via `process.env` and restore the previous value on teardown so
// individual cases can vary it.
const SANDBOX_MERCHANT_ID = "10000100";
const SANDBOX_MERCHANT_KEY = "46f0cd694581a";
const SANDBOX_PASSPHRASE = "jt7NOE43FZPn";

describe("PayFast checkout payload", () => {
  const originalEnv = {
    PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
    PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY,
    PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE,
    PAYFAST_MODE: process.env.PAYFAST_MODE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  };

  beforeEach(() => {
    process.env.PAYFAST_MERCHANT_ID = SANDBOX_MERCHANT_ID;
    process.env.PAYFAST_MERCHANT_KEY = SANDBOX_MERCHANT_KEY;
    process.env.PAYFAST_PASSPHRASE = SANDBOX_PASSPHRASE;
    process.env.PAYFAST_MODE = "sandbox";
    process.env.NEXT_PUBLIC_APP_URL = "https://thumeka.co.za";
  });

  afterEach(() => {
    process.env.PAYFAST_MERCHANT_ID = originalEnv.PAYFAST_MERCHANT_ID;
    process.env.PAYFAST_MERCHANT_KEY = originalEnv.PAYFAST_MERCHANT_KEY;
    process.env.PAYFAST_PASSPHRASE = originalEnv.PAYFAST_PASSPHRASE;
    process.env.PAYFAST_MODE = originalEnv.PAYFAST_MODE;
    process.env.NEXT_PUBLIC_APP_URL = originalEnv.NEXT_PUBLIC_APP_URL;
  });

  it("builds the sandbox action URL when PAYFAST_MODE=sandbox", () => {
    const payload = buildPayFastCheckoutPayload({
      orderId: "00000000-0000-4000-8000-000000000001",
      sessionId: "session-1",
      amount: 320,
      itemName: "Coffee × 1",
      buyerEmail: "buyer@example.com",
      buyerFirstName: "Andile",
      buyerLastName: "Test"
    });

    expect(payload.actionUrl).toBe(
      "https://sandbox.payfast.co.za/eng/process"
    );
  });

  it("targets production when PAYFAST_MODE=production", () => {
    process.env.PAYFAST_MODE = "production";
    const payload = buildPayFastCheckoutPayload({
      orderId: "00000000-0000-4000-8000-000000000001",
      sessionId: "session-1",
      amount: 320,
      itemName: "Coffee",
      buyerEmail: "buyer@example.com",
      buyerFirstName: "A",
      buyerLastName: "T"
    });

    expect(payload.actionUrl).toBe("https://www.payfast.co.za/eng/process");
  });

  it("populates the required PayFast fields with our values", () => {
    const payload = buildPayFastCheckoutPayload({
      orderId: "00000000-0000-4000-8000-0000000000ab",
      sessionId: "session-1",
      amount: 320,
      itemName: "Coffee",
      buyerEmail: "buyer@example.com",
      buyerFirstName: "Andile",
      buyerLastName: "Test"
    });

    expect(payload.fields.merchant_id).toBe(SANDBOX_MERCHANT_ID);
    expect(payload.fields.merchant_key).toBe(SANDBOX_MERCHANT_KEY);
    expect(payload.fields.m_payment_id).toBe("session-1");
    expect(payload.fields.amount).toBe("320.00");
    expect(payload.fields.item_name).toBe("Coffee");
    expect(payload.fields.email_address).toBe("buyer@example.com");
    expect(payload.fields.return_url).toBe(
      "https://thumeka.co.za/buyer/orders?paid=00000000-0000-4000-8000-0000000000ab"
    );
    expect(payload.fields.notify_url).toBe(
      "https://thumeka.co.za/api/webhooks/payfast/itn"
    );
    expect(payload.fields.signature).toMatch(/^[a-f0-9]{32}$/);
  });

  it("rounds the amount to two decimal places", () => {
    const payload = buildPayFastCheckoutPayload({
      orderId: "order-1",
      sessionId: "session-1",
      amount: 33.339999,
      itemName: "X",
      buyerEmail: "b@e.com",
      buyerFirstName: "A",
      buyerLastName: "B"
    });

    expect(payload.fields.amount).toBe("33.34");
  });

  it("throws when credentials are missing", () => {
    delete process.env.PAYFAST_MERCHANT_ID;

    expect(() =>
      buildPayFastCheckoutPayload({
        orderId: "order-1",
        sessionId: "session-1",
        amount: 100,
        itemName: "X",
        buyerEmail: "b@e.com",
        buyerFirstName: "A",
        buyerLastName: "B"
      })
    ).toThrow(/PAYFAST_MERCHANT_ID/);
  });
});

describe("PayFast ITN signature verification", () => {
  const originalEnv = process.env.PAYFAST_PASSPHRASE;

  beforeEach(() => {
    process.env.PAYFAST_PASSPHRASE = SANDBOX_PASSPHRASE;
  });

  afterEach(() => {
    process.env.PAYFAST_PASSPHRASE = originalEnv;
  });

  function signParams(params: Record<string, string>): string {
    // Mirror the production builder so test fixtures stay realistic.
    const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (key === "signature" || value === "") continue;
      parts.push(
        `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, "+")}`
      );
    }
    if (passphrase) {
      parts.push(
        `passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`
      );
    }
    return createHash("md5").update(parts.join("&")).digest("hex");
  }

  it("accepts a correctly signed ITN payload", () => {
    const params: Record<string, string> = {
      m_payment_id: "session-1",
      pf_payment_id: "PF-12345",
      payment_status: "COMPLETE",
      amount_gross: "320.00",
      item_name: "Coffee"
    };
    params.signature = signParams(params);

    expect(verifyPayFastSignature(params)).toBe(true);
  });

  it("rejects a tampered amount", () => {
    const params: Record<string, string> = {
      m_payment_id: "session-1",
      pf_payment_id: "PF-12345",
      payment_status: "COMPLETE",
      amount_gross: "320.00",
      item_name: "Coffee"
    };
    params.signature = signParams(params);

    // Attacker bumps the amount but keeps the original signature.
    params.amount_gross = "1.00";
    expect(verifyPayFastSignature(params)).toBe(false);
  });

  it("rejects an empty signature", () => {
    expect(
      verifyPayFastSignature({
        m_payment_id: "session-1",
        pf_payment_id: "PF-12345",
        payment_status: "COMPLETE",
        amount_gross: "320.00",
        item_name: "Coffee",
        signature: ""
      })
    ).toBe(false);
  });

  it("rejects a payload signed with a different passphrase", () => {
    const params: Record<string, string> = {
      m_payment_id: "session-1",
      pf_payment_id: "PF-12345",
      payment_status: "COMPLETE",
      amount_gross: "320.00",
      item_name: "Coffee"
    };
    params.signature = signParams(params);

    // Server's passphrase rotates — old signature should no longer verify.
    process.env.PAYFAST_PASSPHRASE = "rotated-secret";
    expect(verifyPayFastSignature(params)).toBe(false);
  });
});

