import * as React from "react";

import { APP_NAME } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { EmailBase, styles } from "@/emails/base";

export type RefundProcessedEmailProps = {
  buyerName: string;
  listingTitle: string;
  refundAmount: number;
  orderId: string;
  /** Admin-entered note explaining the refund — surfaces to the buyer
   *  so they know which incident this email is about. */
  reason: string | null;
  /** PayFast refund reference the admin entered after processing the
   *  refund in the merchant dashboard. */
  paymentReference: string | null;
  appUrl: string;
  ordersUrl: string;
};

export function RefundProcessedEmail({
  buyerName,
  listingTitle,
  refundAmount,
  orderId,
  reason,
  paymentReference,
  appUrl,
  ordersUrl,
}: RefundProcessedEmailProps) {
  const reference = `THMK-${orderId.slice(0, 8).toUpperCase()}`;

  return (
    <EmailBase
      preview={`Refund processed — ${APP_NAME}`}
      appUrl={appUrl}
    >
      <h1 style={styles.heading}>Your refund has been processed</h1>
      <p style={styles.paragraph}>Hi {buyerName},</p>
      <p style={styles.paragraph}>
        We&apos;ve processed a refund for your order{" "}
        <strong>{listingTitle}</strong>. The money will land back in your
        account within 3–5 business days, depending on your bank.
      </p>

      <div
        style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          padding: "20px 24px",
          margin: "20px 0",
        }}
      >
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Refund amount</span>
          <span
            style={{
              ...styles.infoValue,
              fontWeight: "700",
              fontSize: "16px",
              color: "#991b1b",
            }}
          >
            {formatMoney(refundAmount)}
          </span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Order ref</span>
          <span style={styles.infoValue}>{reference}</span>
        </div>
        {paymentReference ? (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Refund ref</span>
            <span style={styles.infoValue}>{paymentReference}</span>
          </div>
        ) : null}
        {reason ? (
          <div style={{ ...styles.infoRow, borderBottom: "none" }}>
            <span style={styles.infoLabel}>Reason</span>
            <span style={styles.infoValue}>{reason}</span>
          </div>
        ) : null}
      </div>

      <p style={styles.muted}>
        If you don&apos;t see the refund within 5 business days, contact our
        support team and we&apos;ll chase it up with the bank.
      </p>

      <p style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <a href={ordersUrl} style={styles.button}>
          View my orders
        </a>
      </p>
    </EmailBase>
  );
}
