/**
 * Shape of an item the buyer has put in their cart.
 *
 * The cart lives in the browser (localStorage), not Supabase — so each line
 * snapshots the fields the cart UI needs to render without re-querying the
 * listing. If the seller renames or re-prices the listing between Add and
 * Checkout, the cart shows the snapshot value; the canonical price is
 * still re-checked at Checkout time.
 *
 * Cart enforces a single-seller invariant — every item must share the same
 * `providerId`. The store's `addItem` handles that by prompting before
 * replacing.
 */
export type CartItem = {
  listingId: string;
  providerId: string;
  title: string;
  /** ZAR price as a number (not the string returned by Supabase). */
  price: number;
  imageUrl: string | null;
  businessName: string | null;
};
