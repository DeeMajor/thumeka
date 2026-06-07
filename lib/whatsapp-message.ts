import { formatMoney } from "@/lib/format";

type OrderForWhatsApp = {
  id: string;
  buyer_name: string | null;
  buyer_total: string | number;
};

/**
 * Pre-filled message for the buyer's "Send POP via WhatsApp" deep-link.
 *
 * Shape: `Hi Thumeka, here is my proof of payment for order #ABC12345
 * (R 320.00). — Andile`. The order ref slice and money formatting let the
 * support team match the chat to the order immediately. Trailing
 * `— {buyer_name}` keeps the message friendly and gives support a sanity
 * check that the chat is coming from the right person.
 */
export function buildPaymentProofMessage(order: OrderForWhatsApp): string {
  const ref = order.id.slice(0, 8).toUpperCase();
  const total = formatMoney(order.buyer_total);
  const namePart = order.buyer_name?.trim()
    ? ` — ${order.buyer_name.trim()}`
    : "";
  return `Hi Thumeka, here is my proof of payment for order #${ref} (${total}).${namePart}`;
}
