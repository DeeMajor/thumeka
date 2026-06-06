import * as React from "react";

import { APP_NAME } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { EmailBase, styles } from "@/emails/base";

export type OrderAcceptedPayEmailProps = {
  buyerName: string;
  listingTitle: string;
  buyerTotal: number;
  providerName: string;
  orderId: string;
  appUrl: string;
  /** URL that lands the buyer at the Pay-now button on their order. */
  payUrl: string;
};

export function OrderAcceptedPayEmail({
  buyerName,
  listingTitle,
  buyerTotal,
  providerName,
  orderId,
  appUrl,
  payUrl,
}: OrderAcceptedPayEmailProps) {
  const reference = `THMK-${orderId.slice(0, 8).toUpperCase()}`;

  return (
    <EmailBase
      preview={`Your order has been accepted — pay now — ${APP_NAME}`}
      appUrl={appUrl}
    >
      <h1 style={styles.heading}>Your order has been accepted! 🎉</h1>
      <p style={styles.paragraph}>Hi {buyerName},</p>
      <p style={styles.paragraph}>
        <strong>{providerName}</strong> has accepted your order for{" "}
        <strong>{listingTitle}</strong>. To confirm your order, pay securely
        using card, instant EFT, Zapper, or SnapScan — your choice.
      </p>

      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "20px 24px",
          margin: "20px 0",
        }}
      >
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Order</span>
          <span style={styles.infoValue}>{listingTitle}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Amount</span>
          <span
            style={{
              ...styles.infoValue,
              fontWeight: "700",
              fontSize: "16px",
            }}
          >
            {formatMoney(buyerTotal)}
          </span>
        </div>
        <div style={{ ...styles.infoRow, borderBottom: "none" }}>
          <span style={styles.infoLabel}>Order ref</span>
          <span style={{ ...styles.infoValue, fontWeight: "700", color: "#166534" }}>
            {reference}
          </span>
        </div>
      </div>

      <p style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <a href={payUrl} style={styles.button}>
          Pay {formatMoney(buyerTotal)} now
        </a>
      </p>

      <p style={styles.muted}>
        Payments are processed by PayFast, a South African payment provider.
        You can pay by card, instant EFT, Zapper, SnapScan, or Bitcoin.
        Your order will be confirmed automatically as soon as payment lands.
      </p>
    </EmailBase>
  );
}
