import * as React from "react";

import { APP_NAME } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { EmailBase, styles } from "@/emails/base";

export type OrderRequestedEmailProps = {
  providerName: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  listingTitle: string;
  listingPrice: number;
  deliveryAddress: string | null;
  suburb: string | null;
  buyerNotes: string | null;
  requestedDate: string | null;
  requestedTime: string | null;
  orderId: string;
  appUrl: string;
  dashboardUrl: string;
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

export function OrderRequestedEmail({
  providerName,
  buyerName,
  buyerPhone,
  buyerEmail,
  listingTitle,
  listingPrice,
  deliveryAddress,
  suburb,
  buyerNotes,
  requestedDate,
  requestedTime,
  orderId,
  appUrl,
  dashboardUrl,
}: OrderRequestedEmailProps) {
  return (
    <EmailBase preview={`New order request — ${APP_NAME}`} appUrl={appUrl}>
      <h1 style={styles.heading}>New order request 📦</h1>
      <p style={styles.paragraph}>Hi {providerName},</p>
      <p style={styles.paragraph}>
        You have received a new order request on {APP_NAME}. Please review the
        details below and accept or decline from your dashboard.
      </p>

      <hr style={styles.divider} />
      <p style={{ ...styles.muted, fontWeight: "600", marginBottom: "8px" }}>Order details</p>
      <InfoRow label="Listing" value={listingTitle} />
      <InfoRow label="Price" value={formatMoney(listingPrice)} />
      <InfoRow label="Order ref" value={orderId.slice(0, 8).toUpperCase()} />

      <hr style={styles.divider} />
      <p style={{ ...styles.muted, fontWeight: "600", marginBottom: "8px" }}>Buyer details</p>
      <InfoRow label="Name" value={buyerName} />
      <InfoRow label="Phone" value={buyerPhone} />
      <InfoRow label="Email" value={buyerEmail} />
      <InfoRow label="Delivery address" value={deliveryAddress} />
      <InfoRow label="Suburb" value={suburb} />
      <InfoRow label="Requested date" value={requestedDate} />
      <InfoRow label="Requested time" value={requestedTime} />
      <InfoRow label="Notes" value={buyerNotes} />

      <p style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <a href={dashboardUrl} style={styles.button}>
          View order on dashboard
        </a>
      </p>
    </EmailBase>
  );
}
