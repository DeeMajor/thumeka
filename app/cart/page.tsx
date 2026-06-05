"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart, Store, Trash2 } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/format";

export default function CartPage() {
  const { items, businessName, total, ready, removeItem, clear } = useCart();

  // While hydrating from localStorage, render a neutral placeholder so the
  // SSR / first-paint HTML matches without flashing an empty state.
  if (!ready) {
    return (
      <div className="bg-mist" data-testid="page-cart">
        <section className="section-band">
          <div className="page-shell gap-3 py-8">
            <h1 className="text-display-md text-ink">Cart</h1>
          </div>
        </section>
        <section className="page-shell py-8">
          <div className="rounded-lg border border-dashed border-black/15 bg-white p-8 text-center text-body-sm text-black/55">
            Loading your cart…
          </div>
        </section>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-mist" data-testid="page-cart">
        <section className="section-band">
          <div className="page-shell gap-3 py-8">
            <h1 className="text-display-md text-ink">Your cart</h1>
            <p className="text-body-sm text-black/55">Add items from the marketplace to see them here.</p>
          </div>
        </section>
        <section className="page-shell py-8">
          <div
            className="rounded-lg border border-dashed border-black/15 bg-white p-8 text-center"
            data-testid="cart-empty"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mint text-leaf">
              <ShoppingCart aria-hidden="true" className="h-5 w-5" />
            </div>
            <p className="text-body text-black/75">Your cart is empty.</p>
            <p className="mt-1 text-body-sm text-black/55">
              Browse the marketplace and tap the <strong>+</strong> on a product to add it.
            </p>
            <Link
              className="btn-primary mt-5 inline-flex items-center gap-2"
              data-testid="cart-browse-link"
              href="/"
            >
              Browse marketplace
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const singleItem = items.length === 1;
  const checkoutHref = singleItem ? `/checkout/${items[0].listingId}` : null;

  return (
    <div className="bg-mist" data-testid="page-cart">
      <section className="section-band">
        <div className="page-shell gap-3 py-8">
          <h1 className="text-display-md text-ink">Your cart</h1>
          {businessName ? (
            <p
              className="flex items-center gap-2 text-body-sm text-black/65"
              data-testid="cart-seller-line"
            >
              <Store aria-hidden="true" className="h-4 w-4 text-black/45" />
              All items from <span className="font-semibold text-ink">{businessName}</span>
            </p>
          ) : null}
          <p className="text-caption text-black/45">
            One seller per cart. Adding from another seller will replace what&apos;s here.
          </p>
        </div>
      </section>

      <section className="page-shell py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          {/* Items column */}
          <ul className="space-y-3" data-testid="cart-item-list">
            {items.map((item) => (
              <li
                className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-3 sm:p-4"
                data-testid="cart-item"
                data-listing-id={item.listingId}
                key={item.listingId}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={item.title}
                    className="h-16 w-16 shrink-0 rounded-md object-cover sm:h-20 sm:w-20"
                    src={item.imageUrl}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-16 w-16 shrink-0 rounded-md bg-mist sm:h-20 sm:w-20"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    className="line-clamp-2 text-sm font-semibold text-ink hover:text-leaf sm:text-base"
                    data-testid="cart-item-title-link"
                    href={`/listings/${item.listingId}`}
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm font-semibold text-leaf">
                    {formatMoney(item.price)}
                  </p>
                </div>
                <button
                  aria-label={`Remove ${item.title} from cart`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-black/45 transition hover:bg-mist hover:text-red-700"
                  data-testid="cart-item-remove-button"
                  onClick={() => removeItem(item.listingId)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          {/* Summary column */}
          <aside
            className="self-start rounded-lg border border-black/10 bg-white p-5"
            data-testid="cart-summary"
          >
            <h2 className="text-h3 text-ink">Summary</h2>
            <dl className="mt-4 space-y-2 text-body-sm">
              <div className="flex items-center justify-between">
                <dt className="text-black/60">Items</dt>
                <dd className="font-semibold text-ink">{items.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-black/60">Subtotal</dt>
                <dd className="font-semibold text-ink" data-testid="cart-subtotal">
                  {formatMoney(total)}
                </dd>
              </div>
              <p className="text-caption text-black/45">
                Delivery and platform fees are calculated at checkout.
              </p>
            </dl>

            {checkoutHref ? (
              <Link
                className="btn-primary mt-5 flex w-full items-center justify-center gap-2"
                data-testid="cart-checkout-link"
                href={checkoutHref}
              >
                Checkout
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <button
                  aria-disabled="true"
                  className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-black/10 bg-black/5 px-4 py-2 text-sm font-semibold text-black/40"
                  data-testid="cart-checkout-disabled"
                  type="button"
                >
                  Checkout
                </button>
                <p className="mt-2 text-caption text-black/55">
                  Multi-item checkout is coming soon. For now, please checkout
                  items one at a time from each product page.
                </p>
              </>
            )}

            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 text-caption font-semibold text-black/45 hover:text-red-700"
              data-testid="cart-clear-button"
              onClick={() => {
                if (window.confirm("Empty your cart?")) clear();
              }}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Empty cart
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}
